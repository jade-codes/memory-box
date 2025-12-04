"""Neo4j database client for Memory Box."""

import contextlib
import re
import uuid
from datetime import datetime

from neo4j import Driver, GraphDatabase
from neo4j.time import DateTime as Neo4jDateTime
from rapidfuzz import fuzz

from memory_box.config import Settings
from memory_box.models import Command, CommandWithMetadata


def _convert_neo4j_datetime(value: datetime | Neo4jDateTime | None) -> datetime | None:
    """Convert Neo4j DateTime to Python datetime."""
    if isinstance(value, Neo4jDateTime):
        return value.to_native()
    return value


def _obfuscate_secrets(command: str) -> str:
    """Obfuscate passwords and secrets in commands."""
    # Pattern for common password/token flags and parameters
    # Supports quoted values (single or double quotes) and unquoted values
    patterns = [
        # Flags like -p, --password followed by quoted values (with any content inside)
        (r'''(-p|--password|--pass|--pwd)\s+"[^"]*"''', r"\1 ****"),
        (r"""(-p|--password|--pass|--pwd)\s+'[^']*'""", r"\1 ****"),
        # Flags followed by unquoted values
        (r"(-p|--password|--pass|--pwd)\s+\S+", r"\1 ****"),
        # Key=value with double quotes
        (r'''(password=|pwd=|pass=)"[^"]*"''', r'\1****'),
        (r'''(token=|api_key=|apikey=|secret=)"[^"]*"''', r'\1****'),
        (r'''(NEO4J_PASSWORD=|DB_PASSWORD=|POSTGRES_PASSWORD=)"[^"]*"''', r'\1****'),
        # Key=value with single quotes
        (r"""(password=|pwd=|pass=)'[^']*'""", r'\1****'),
        (r"""(token=|api_key=|apikey=|secret=)'[^']*'""", r'\1****'),
        (r"""(NEO4J_PASSWORD=|DB_PASSWORD=|POSTGRES_PASSWORD=)'[^']*'""", r'\1****'),
        # Key=value without quotes
        (r"(password=|pwd=|pass=)\S+", r"\1****"),
        (r"(token=|api_key=|apikey=|secret=)\S+", r"\1****"),
        (r"(NEO4J_PASSWORD=|DB_PASSWORD=|POSTGRES_PASSWORD=)\S+", r"\1****"),
        # Match passwords in URLs
        (r"(://[^:]+:)([^@]+)(@)", r"\1****\3"),
    ]

    obfuscated = command
    for pattern, replacement in patterns:
        obfuscated = re.sub(pattern, replacement,
                            obfuscated, flags=re.IGNORECASE)

    return obfuscated.rstrip()


class Neo4jClient:
    """Client for interacting with Neo4j database."""

    def __init__(self, settings: Settings) -> None:
        """Initialize the Neo4j client."""
        self.driver: Driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        self.database = settings.neo4j_database
        self._initialize_constraints()

    def close(self) -> None:
        """Close the database connection."""
        self.driver.close()

    def _initialize_constraints(self) -> None:
        """Create necessary constraints and indexes."""
        with self.driver.session(database=self.database) as session:
            # Ensure unique IDs for commands
            session.run(
                "CREATE CONSTRAINT command_id_unique IF NOT EXISTS "
                "FOR (c:Command) REQUIRE c.id IS UNIQUE"
            )
            # Index for faster text search
            session.run(
                "CREATE INDEX command_text_index IF NOT EXISTS "
                "FOR (c:Command) ON (c.command, c.description)"
            )
            # Full-text index for fuzzy search
            with contextlib.suppress(Exception):
                # Index might already exist or Neo4j version doesn't support it
                session.run(
                    "CREATE FULLTEXT INDEX command_fulltext IF NOT EXISTS "
                    "FOR (c:Command) ON EACH [c.command, c.description, c.context]"
                )

    def add_command(self, command: Command) -> str:
        """Add a new command to the database."""
        command_id = str(uuid.uuid4())

        # Always strip secrets from command before storing
        command_text = _obfuscate_secrets(command.command)

        with self.driver.session(database=self.database) as session:
            session.run(
                """
                CREATE (c:Command {
                    id: $id,
                    command: $command,
                    description: $description,
                    os: $os,
                    project_type: $project_type,
                    context: $context,
                    category: $category,
                    created_at: datetime($created_at),
                    last_used: NULL,
                    use_count: 0
                })
                WITH c
                UNWIND $tags AS tag
                MERGE (t:Tag {name: tag})
                MERGE (c)-[:TAGGED_WITH]->(t)
                """,
                id=command_id,
                command=command_text,
                description=command.description,
                os=command.os,
                project_type=command.project_type,
                context=command.context,
                category=command.category,
                tags=command.tags,
                created_at=datetime.now().astimezone().isoformat()
            )

        return command_id

    def search_commands(
        self,
        query: str | None = None,
        os: str | None = None,
        project_type: str | None = None,
        category: str | None = None,
        tags: list[str] | None = None,
        limit: int = 10,
        fuzzy: bool = False,
        fuzzy_threshold: int = 60
    ) -> list[CommandWithMetadata]:
        """Search for commands matching the criteria.

        Args:
            query: Text to search for
            os: Filter by operating system
            project_type: Filter by project type
            category: Filter by category
            tags: Filter by tags (all must match)
            limit: Maximum number of results
            fuzzy: Enable fuzzy matching for query
            fuzzy_threshold: Minimum similarity score (0-100) for fuzzy matches
        """

        # Build the Cypher query dynamically
        where_clauses = []
        params = {"limit": limit}

        if query:
            where_clauses.append(
                "(c.command CONTAINS $query OR c.description CONTAINS $query OR "
                "c.context CONTAINS $query)"
            )
            params["query"] = query

        if os:
            where_clauses.append("c.os = $os")
            params["os"] = os

        if project_type:
            where_clauses.append("c.project_type = $project_type")
            params["project_type"] = project_type

        if category:
            where_clauses.append("c.category = $category")
            params["category"] = category

        tag_match = ""
        if tags:
            tag_match = """
            MATCH (c)-[:TAGGED_WITH]->(t:Tag)
            WHERE t.name IN $tags
            WITH c, count(t) as tag_count
            WHERE tag_count = size($tags)
            """
            params["tags"] = tags

        where_clause = ""
        if where_clauses:
            # If we have tag_match, we need WITH instead of WHERE
            if tag_match:
                where_clause = "WITH c\nWHERE " + " AND ".join(where_clauses)
            else:
                where_clause = "WHERE " + " AND ".join(where_clauses)

        cypher_query = f"""
        MATCH (c:Command)
        {tag_match}
        {where_clause}
        OPTIONAL MATCH (c)-[:TAGGED_WITH]->(t:Tag)
        WITH c, collect(t.name) as tags
        ORDER BY c.use_count DESC, c.created_at DESC
        LIMIT $limit
        RETURN c, tags
        """

        with self.driver.session(database=self.database) as session:
            result = session.run(cypher_query, params)
            commands = []

            for record in result:
                node = record["c"]
                tags = record["tags"]

                # Command is already obfuscated in DB, just return it
                commands.append(CommandWithMetadata(
                    id=node["id"],
                    command=node["command"],
                    description=node["description"],
                    tags=tags,
                    os=node.get("os"),
                    project_type=node.get("project_type"),
                    context=node.get("context"),
                    category=node.get("category"),
                    created_at=_convert_neo4j_datetime(node["created_at"]),
                    last_used=_convert_neo4j_datetime(node.get("last_used")),
                    use_count=node.get("use_count", 0)
                ))

            # Apply fuzzy matching if enabled and query provided
            if fuzzy and query and commands:
                scored_commands = []
                for cmd in commands:
                    # Calculate fuzzy score against command and description
                    cmd_score = fuzz.partial_ratio(
                        query.lower(), cmd.command.lower())
                    desc_score = fuzz.partial_ratio(
                        query.lower(), cmd.description.lower())
                    max_score = max(cmd_score, desc_score)

                    if max_score >= fuzzy_threshold:
                        scored_commands.append((max_score, cmd))

                # Sort by score (highest first), then by use count
                scored_commands.sort(key=lambda x: (
                    x[0], x[1].use_count), reverse=True)
                commands = [cmd for _, cmd in scored_commands[:limit]]

            return commands

    def get_command(self, command_id: str) -> CommandWithMetadata | None:
        """Get a specific command by ID and increment its use count."""

        with self.driver.session(database=self.database) as session:
            result = session.run(
                """
                MATCH (c:Command {id: $id})
                SET c.use_count = c.use_count + 1,
                    c.last_used = datetime($now)
                WITH c
                OPTIONAL MATCH (c)-[:TAGGED_WITH]->(t:Tag)
                WITH c, collect(t.name) as tags
                RETURN c, tags
                """,
                id=command_id,
                now=datetime.now().astimezone().isoformat()
            )

            record = result.single()
            if not record:
                return None

            node = record["c"]
            tags = record["tags"]

            # Command is already obfuscated in DB, just return it
            return CommandWithMetadata(
                id=node["id"],
                command=node["command"],
                description=node["description"],
                tags=tags,
                os=node.get("os"),
                project_type=node.get("project_type"),
                context=node.get("context"),
                category=node.get("category"),
                created_at=_convert_neo4j_datetime(node["created_at"]),
                last_used=_convert_neo4j_datetime(node.get("last_used")),
                use_count=node.get("use_count", 0)
            )

    def delete_command(self, command_id: str) -> bool:
        """Delete a command from the database."""

        with self.driver.session(database=self.database) as session:
            result = session.run(
                """
                MATCH (c:Command {id: $id})
                DETACH DELETE c
                RETURN count(c) as deleted
                """,
                id=command_id
            )

            record = result.single()
            return record["deleted"] > 0 if record else False

    def get_all_tags(self) -> list[str]:
        """Get all unique tags in the database."""

        with self.driver.session(database=self.database) as session:
            result = session.run(
                """
                MATCH (t:Tag)
                RETURN t.name as tag
                ORDER BY tag
                """
            )

            return [record["tag"] for record in result]

    def get_all_categories(self) -> list[str]:
        """Get all unique categories in the database."""

        with self.driver.session(database=self.database) as session:
            result = session.run(
                """
                MATCH (c:Command)
                WHERE c.category IS NOT NULL
                RETURN DISTINCT c.category as category
                ORDER BY category
                """
            )

            return [record["category"] for record in result]
