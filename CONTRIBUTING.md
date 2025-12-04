# Development Guidelines for Memory Box

> **FOR AI ASSISTANTS:** These guidelines are MANDATORY. You MUST follow them for every code change. Before making ANY code change, re-read the relevant sections. These are not suggestions - they are requirements. If you violate these principles, the code will be rejected.

## Quick Reference Commands

```bash
make check-guidelines  # Full compliance check
make check             # Run all quality checks (lint, format, typecheck, test)
make lint-fix          # Fix linting issues
make format            # Format code
make test              # Run tests
make test-cov          # Run tests with coverage
```

## Core Principles

### 1. **ASK FIRST, CODE SECOND**
- Always validate requirements before implementing
- Confirm technical approach with the user
- Don't assume preferences (tools, libraries, patterns)
- Present options when multiple valid approaches exist

### 2. **Test-Driven Development (TDD)**
- Write tests BEFORE implementation
- Red → Green → Refactor cycle
- No production code without tests
- Tests should guide design

### 3. **Incremental Changes**
- One feature at a time
- Small, focused commits
- Each change should be reviewable
- Don't bundle unrelated changes

### 4. **Stay in Your Lane**
- Stick to the requested scope
- Don't add "nice to have" features without asking
- Don't refactor unrelated code
- Don't change tools/dependencies without discussion

## TDD Workflow

1. **Understand the requirement**
   - Ask clarifying questions
   - Confirm acceptance criteria
   - Identify edge cases

2. **Write the test first**
   - Start with the simplest case
   - Make it fail for the right reason
   - Keep tests focused and readable
   - Test behavior, not implementation

3. **Implement minimal code**
   - Make the test pass
   - Don't over-engineer
   - Keep it simple

4. **Refactor (CRITICAL STEP - DON'T SKIP)**
   - **What can be REMOVED?** Delete dead code, unused variables, unnecessary complexity
   - **What can be SIMPLIFIED?** Reduce nesting, extract functions, clarify names
   - **What can be GENERALIZED?** Remove duplication, extract common patterns
   - Improve design while tests pass
   - Enhance readability
   - This is when you make the code clean!

5. **Repeat**
   - Next test case
   - Build incrementally

**Remember: Red → Green → REFACTOR. The refactor step is not optional!**

## Enforcement & Accountability

### For AI Assistants
These guidelines are BINDING. To ensure compliance:

1. **Before any code change:**
   - Quote the relevant guideline section you're following
   - Explain how your approach aligns with it
   - Get user confirmation if unclear

2. **After implementation:**
   - Run `make check-guidelines` and fix ALL issues
   - Explicitly state which refactoring steps you took (remove/simplify/generalize)

3. **Mandatory checklist response:**
   When code is complete, provide this checklist:
   ```
   ✅ Asked before coding (or confirmed approach)
   ✅ Tests written FIRST
   ✅ All tests pass (make test)
   ✅ Linter passes (make lint)
   ✅ Refactored: Removed [list what was removed]
   ✅ Refactored: Simplified [list what was simplified]
   ✅ Separated database/business logic (if applicable)
   ✅ Tests focus on BEHAVIOR not implementation
   ✅ Only requested changes made (no scope creep)
   ✅ Ran: make check-guidelines
   ```

### For Humans Reviewing AI Code
If AI violates these guidelines, reject the code and point to the specific violated section. Common violations to watch for:

- ❌ Didn't ask before making assumptions
- ❌ Implemented without tests first
- ❌ Mixed database and business logic
- ❌ Skipped refactoring step
- ❌ Added features not requested
- ❌ Tests check implementation instead of behavior
- ❌ Didn't run `make check-guidelines`

**Quick verification:** Run `make check-guidelines` to validate compliance.

### Automation
The following are automatically enforced by tooling:
- Line length (100 chars)
- Function complexity (max 10)
- Function arguments (max 5)
- No debug prints (T20)
- No commented-out code (ERA)
- Test coverage (80% minimum)

But these require human/AI discipline:
- Asking before coding
- TDD workflow
- Separation of concerns
- Testing behavior not implementation
- Refactoring after green

**Use this document as your contract. Follow it or code will be rejected.**

## Clean Code Principles

### Single Responsibility Principle (SRP)
- One function/class/method = one clear purpose
- If you can't explain what it does in one sentence, it's doing too much
- Break complex functions/classes into smaller, focused ones
- Name them by what they DO, not how they do it

### Separation of Concerns
**NEVER mix database operations with business logic in the same method.**

**Database Methods (_fetch_*, _load_*)**
- ONLY interact with database
- NO business logic or transformations
- Return raw data
- Pure I/O operations

**Business Logic Methods (_apply_*, _calculate_*, _process_*)**
- ONLY process data
- NO database calls
- Pure functions when possible
- Clear input/output contracts

**Orchestration Methods (public API)**
- Coordinate between layers
- Handle control flow
- Minimal logic
- Delegate to specialized methods

Example:
```python
# Bad: Mixed concerns
def search_commands(self, query: str, fuzzy: bool):
    results = session.run("MATCH (c:Command) RETURN c")  # DB
    if fuzzy:
        scored = [calculate_score(cmd) for cmd in results]  # Logic
        return scored
    return results

# Good: Separated concerns
def search_commands(self, query: str, fuzzy: bool):
    """Orchestrate the search."""
    candidates = self._fetch_candidates(query if not fuzzy else None)
    if fuzzy and query:
        return self._apply_fuzzy_matching(candidates, query)
    return candidates

def _fetch_candidates(self, query: str | None):
    """Pure database operation."""
    # Only DB logic here

def _apply_fuzzy_matching(self, candidates, query):
    """Pure business logic."""
    # Only scoring/filtering here
```

### Don't Repeat Yourself (DRY)
- Extract duplicated code into functions/classes
- Use helper methods for common operations
- Don't copy-paste - refactor instead
- But don't over-abstract - prefer clarity over extreme DRY

### Keep It Simple, Stupid (KISS)
- Simple solutions > clever solutions
- If it's hard to understand, it's hard to maintain
- Avoid premature optimization
- Write code that others can read easily

### You Aren't Gonna Need It (YAGNI)
- Only build what's requested NOW
- Don't add features "just in case"
- Don't over-engineer for future scenarios
- Extend when needed, not before

## Code Quality Guidelines

### Meaningful Names
- **Variables**: `user_count` not `uc` or `x`
- **Functions/Methods**: `calculate_total_price` not `calc` or `do_stuff`
- **Classes**: `OrderProcessor` not `Manager` or `Helper`
- Be specific: `fetch_active_users` not `get_users`
- Avoid abbreviations unless universally known (HTTP, URL, API)
- Classes are nouns: `User`, `OrderProcessor`, `DatabaseClient`
- Functions are verbs: `calculate()`, `fetch()`, `process()`

### Function/Method Guidelines
- **Small**: 10-20 lines ideal, rarely over 50
- **One level of abstraction**: Don't mix high-level and low-level code
- **Few parameters**: Aim for 0-3, max 5. More = use an object
- **No side effects**: Functions should do what their name says, nothing else
- **Return early**: Reduce nesting with guard clauses

Example:
```python
# Bad: deeply nested
def process_user(user):
    if user:
        if user.is_active:
            if user.has_permission:
                # do work
                return True
    return False

# Good: early returns
def process_user(user):
    if not user:
        return False
    if not user.is_active:
        return False
    if not user.has_permission:
        return False
    
    # do work
    return True
```

### Error Handling
- Be explicit about what can fail
- Use specific exceptions, not generic `Exception`
- Document exceptions in docstrings
- Fail fast - validate inputs early
- Don't silently swallow errors

### Comments & Documentation
- Code should be self-explanatory (good names > comments)
- Comment WHY, not WHAT (code shows what it does)
- Use docstrings for public APIs
- Update comments when code changes
- Remove commented-out code (git history exists for a reason)

Good comment:
```python
# Use binary search because the list is sorted and contains millions of items
def find_user(user_id, sorted_users):
```

Bad comment:
```python
# Loop through users
for user in users:
```

### File Organization
- Related code together
- Public methods at top, private at bottom
- Constants at module level
- Imports organized: stdlib, third-party, local
- Maximum file length: ~500 lines (split if larger)

### Code Formatting
- Consistent style (use linters: ruff, black)
- Max line length: 100 characters
- Meaningful whitespace - group related lines
- One statement per line
- Follow language conventions (PEP 8 for Python)

## Testing Strategy

### Test Types
- **Unit tests**: Test business logic WITHOUT database
- **Integration tests**: Test database operations WITH real DB
- **Edge cases**: Test ALL the weird scenarios, not just happy path

### Testing Principles

**Focus on BEHAVIOR, not IMPLEMENTATION:**
- Test WHAT the code does, not HOW it does it
- Test public APIs, not internal methods
- Don't test implementation details (private methods, internal state)
- Tests should survive refactoring - if you change HOW without changing WHAT, tests should still pass

Example:
```python
# Bad: Testing implementation details
def test_search_uses_fuzzy_matching_method():
    assert db._apply_fuzzy_matching.called  # Testing HOW

# Good: Testing behavior
def test_search_finds_commands_with_typos():
    db.add_command(Command(command="docker ps"))
    results = db.search_commands(query="doker", fuzzy=True)
    assert len(results) >= 1  # Testing WHAT
    assert results[0].command == "docker ps"
```

**Other principles:**
- One assertion concept per test (can have multiple asserts for same concept)
- Tests should be fast and independent
- Use descriptive test names: `test_fuzzy_search_with_typo` not `test1`
- Tests are documentation - they show how to use the code

### Comprehensive Edge Cases
When testing search/matching/text processing:
- Test typos (doker → docker)
- Test misspellings (kuberntes → kubernetes)
- Test transpositions (gerp → grep)
- Test missing characters (teraform → terraform)
- Test extra characters (currrl → curl)
- Test case variations (DOCKER, docker, Docker)
- Test partial words
- Test abbreviations
- Test with numbers
- Test special characters
- Test word order variations
- Test combined with other filters
- Test threshold boundaries
- Test empty inputs
- Test unicode
- Test very long inputs
- Test whitespace variations
- Test unrelated queries that should NOT match

**Don't just test the happy path. Real users make mistakes.**

## Refactoring Red Flags

If you see these, refactor:
- ❌ Functions/methods over 50 lines
- ❌ Nested if statements 3+ levels deep
- ❌ Duplicated code blocks
- ❌ Magic numbers (use named constants)
- ❌ Long parameter lists (5+)
- ❌ Complex boolean conditions
- ❌ God classes (classes that do everything)
- ❌ Functions/methods with multiple return types
- ❌ Classes with too many responsibilities
- ❌ Tight coupling between unrelated classes
- ❌ Mixing database and business logic

Ask yourself:
- "Am I mixing concerns in this function/class?"
- "Can I test this logic without a database?"
- "Is this doing more than one thing?"
- "Would I need a magic number (limit * 10) to make this work?"

If YES to any, refactor into separate components.

## Other Best Practices

### Performance
- Measure before optimizing
- Readability first, optimize if needed
- Don't fetch data you don't need
- Use appropriate data structures
- Cache expensive operations (when it makes sense)

### Security
- Never commit secrets or credentials
- Sanitize user inputs
- Use parameterized queries (prevent SQL injection)
- Validate data at boundaries
- Log security-relevant events
- Keep dependencies updated

### Git Commit Messages
Good format:
```
Short summary (50 chars or less)

Longer explanation if needed. Explain WHAT and WHY,
not HOW (code shows how).

- Bullet points are fine
- Reference issues: Fixes #123
```

Examples:
- ✅ `Add fuzzy search with typo tolerance`
- ✅ `Fix: Prevent duplicate commands in search results`
- ✅ `Refactor: Extract database queries into separate methods`
- ❌ `Update code`
- ❌ `Fix bug`
- ❌ `WIP`

## Workflow Guidelines

### DO:
- ✅ Confirm approach before starting
- ✅ Write tests first
- ✅ Make small, atomic commits
- ✅ Focus on the requested feature
- ✅ Ask about tooling preferences
- ✅ Validate assumptions

### DON'T:
- ❌ Build entire features without checkpoints
- ❌ Change configuration without asking
- ❌ Add dependencies without discussion
- ❌ Create documentation the user didn't request
- ❌ Assume you know what the user wants
- ❌ Make sweeping changes all at once

### Example Good Workflow

User: "I need to add a search feature"

**Bad Response:**
- Immediately implements search with 5 different filters
- Adds pagination, sorting, caching
- Refactors database layer
- Updates UI

**Good Response:**
- "What kind of search? Text-based, filters, or both?"
- "Should I add tests for edge cases like empty results?"
- Write test for basic text search
- Implement minimal search
- Confirm it works
- Ask: "Should we add filters next?"

## Code Review Self-Checklist

Before submitting code:

**Refactoring - What can be removed/improved?**
- [ ] Did I remove all dead code and unused variables?
- [ ] Did I remove all commented-out code?
- [ ] Did I remove debug prints/logs?
- [ ] Is there duplicated code I should extract?
- [ ] Can any complex logic be simplified?
- [ ] Are there unnecessary abstractions I added?

**Code Quality:**
- [ ] Does this solve the problem simply?
- [ ] Can someone else understand this in 6 months?
- [ ] Are all functions/classes/variables well-named?
- [ ] Do classes have single, clear responsibilities?
- [ ] Are functions/methods small and focused (ideally < 50 lines)?
- [ ] Did I separate database and business logic?
- [ ] Linter passes with no warnings?

**Testing:**
- [ ] Are there tests for all scenarios?
- [ ] Do tests focus on BEHAVIOR not implementation?
- [ ] Did I test edge cases (typos, empty inputs, errors)?
- [ ] Do all tests pass?
- [ ] Tests written BEFORE implementation?

**Process:**
- [ ] Only requested changes made?
- [ ] No scope creep?
- [ ] User validated the approach?
- [ ] Did I update documentation (if applicable)?
- [ ] Small, atomic commits with clear messages?

## When in Doubt

- **Ask** don't assume
- **Simple** over clever
- **Clear** over concise
- **Test** before you commit
- **Refactor** when you see code smells

**The user knows what they want better than you do.**
**Ask questions. Make small changes. Write tests first.**
