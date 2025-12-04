# Memory Box 🧠📦

A personal knowledge base for commands and workflows, designed for people with ADHD or anyone who wants to remember useful commands across projects.

Memory Box is a Model Context Protocol (MCP) server that stores your frequently-used commands in a Neo4j graph database, making them accessible from any AI assistant (Claude Desktop, Cline, etc.) or directly via CLI.

## Features

- 🔍 **Context-Aware Search**: Automatically detects your OS and project type to suggest relevant commands
- 🏷️ **Smart Organization**: Tag, categorize, and filter commands by OS, project type, and categories
- 🤖 **MCP Integration**: Use with Claude Desktop or any MCP-compatible AI assistant
- 💻 **Powerful CLI**: Full command-line interface for quick access
- 📊 **Graph Database**: Neo4j stores relationships between commands, contexts, and tags
- 📈 **Usage Tracking**: See which commands you use most frequently

## Quick Start

### 1. Install Neo4j

You need a Neo4j database running. The easiest way is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/jade-codes/memory-box.git
cd memory-box

# Start Neo4j with Docker Compose
docker-compose -f .devcontainer/docker-compose.yml up -d neo4j

# Or use standalone Docker
docker run \
    --name neo4j \
    -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/devpassword \
    -d neo4j:5-community
```

The Neo4j browser will be available at http://localhost:7474

Or download from [neo4j.com/download](https://neo4j.com/download/)

### 2. Install Memory Box

```bash
pip install -e .
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Neo4j credentials (default: neo4j/devpassword)
```

### 4. Start Using!

**Via CLI:**
```bash
# Add a command
memory-box add "git log --oneline --graph --all" --desc "Visual git history" --tag git --tag log

# Search commands
memory-box search git

# Get context-aware suggestions
memory-box suggest

# Search in current project context
memory-box search --current
```

**Via MCP (with Claude Desktop):**

See [MCP Setup](#mcp-setup) below.

## MCP Setup

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, or `%APPDATA%/Claude/claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "memory-box": {
      "command": "python",
      "args": [
        "-m",
        "memory_box.server"
      ],
      "env": {
        "NEO4J_URI": "bolt://localhost:7687",
        "NEO4J_USER": "neo4j",
        "NEO4J_PASSWORD": "devpassword",
        "NEO4J_DATABASE": "neo4j"
      }
    }
  }
}
```

On Linux, the config is typically at: `~/.config/Claude/claude_desktop_config.json`

After adding this, restart Claude Desktop. You'll see Memory Box tools available in your conversations!

## CLI Commands

### Add Commands
```bash
# Basic add
memory-box add "docker ps -a" -d "List all containers"

# With context
memory-box add "pytest -v" -d "Run tests verbosely" \
  --tag python --tag testing \
  --category testing \
  --project python

# Without auto-context detection
memory-box add "ls -la" -d "List all files" --no-auto-context
```

### Search Commands
```bash
# Text search
memory-box search docker

# Filter by OS
memory-box search --os linux

# Filter by project type
memory-box search --project python

# Filter by category
memory-box search --category git

# Filter by tags (all must match)
memory-box search --tag git --tag branch

# Use current context
memory-box search --current

# Limit results
memory-box search docker --limit 5
```

### Other Commands
```bash
# Get specific command
memory-box get <command-id>

# Delete command
memory-box delete <command-id>

# List all tags
memory-box tags

# List all categories
memory-box categories

# Show current context
memory-box context

# Get suggestions for current context
memory-box suggest
```

## MCP Tools

When using Memory Box via MCP, you have access to these tools:

- **add_command**: Add a new command to your memory box
- **search_commands**: Search for commands with various filters
- **get_command_by_id**: Retrieve a specific command (increments use count)
- **delete_command**: Remove a command
- **list_tags**: See all available tags
- **list_categories**: See all categories
- **get_context_suggestions**: Get commands for your current OS/project

## Example Workflow

```bash
# You're working on a Python project and forgot the uvicorn command
memory-box search uvicorn --current

# Add a new command you just learned
memory-box add "ruff check --fix ." \
  -d "Auto-fix linting issues with Ruff" \
  --tag python --tag linting \
  --category python

# Later, in a different project
memory-box suggest  # Shows relevant commands for current context
```

## Project Structure

```
memory-box/
├── memory_box/
│   ├── __init__.py
│   ├── cli.py           # Typer-based CLI
│   ├── config.py        # Configuration management
│   ├── context.py       # OS/project detection
│   ├── database.py      # Neo4j client
│   ├── models.py        # Pydantic models
│   └── server.py        # FastMCP server
├── pyproject.toml
├── .env.example
└── README.md
```

## Development

### Setup

```bash
# Clone and enter the repository
git clone https://github.com/jade-codes/memory-box.git
cd memory-box

# Start Neo4j database
docker-compose -f .devcontainer/docker-compose.yml up -d neo4j

# Install in development mode with dev dependencies
pip install -e ".[dev]"

# Copy environment configuration
cp .env.example .env
```

### Testing

```bash
# Run all tests (unit + integration)
pytest

# Run only unit tests
pytest tests/unit

# Run only integration tests (requires Neo4j running)
pytest tests/integration

# Run with coverage
pytest --cov=memory_box --cov-report=html
```

### Code Quality

```bash
# Format code
ruff format memory_box/

# Lint
ruff check memory_box/

# Type check
mypy memory_box/
```

### Docker Compose

The project includes a `docker-compose.yml` for development:

```yaml
services:
  neo4j:
    image: neo4j:5-community
    ports:
      - "7474:7474"  # Browser UI
      - "7687:7687"  # Bolt protocol
    environment:
      - NEO4J_AUTH=neo4j/devpassword
    volumes:
      - neo4j-data:/data
```

Access Neo4j Browser at http://localhost:7474 (user: neo4j, password: devpassword)

## Why Memory Box?

If you have ADHD or just work with lots of different tools, you know the struggle:
- "What was that docker command again?"
- "How do I create a git branch?"
- "What's the syntax for pytest fixtures?"

Instead of:
- Searching Stack Overflow for the 100th time
- Digging through old Slack messages
- Looking at random notepad files

Now you can:
- Save commands once with context
- Search them instantly from anywhere
- Let AI assistants access your personal command library
- Get smart suggestions based on what you're working on

## License

MIT

## Contributing

Issues and pull requests welcome!
