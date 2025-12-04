# Development Guidelines for Memory Box

> **FOR AI ASSISTANTS:** These guidelines are MANDATORY. You MUST follow them for every code change. Violations = Rejection.

## Quick Reference

```bash
make check-guidelines  # Full compliance check
make test              # Run tests
make lint-fix          # Fix linting
make format            # Format code
```

## Core Principles

1. **ASK FIRST** - Validate requirements before coding
2. **TDD** - Write tests BEFORE implementation (Red → Green → Refactor)
3. **SEPARATION OF CONCERNS** - Never mix database and business logic
4. **STAY IN SCOPE** - Only requested changes, no extras

## TDD Workflow: Red → Green → Refactor

1. **Write test first** - Make it fail for the right reason
2. **Implement minimal code** - Make the test pass
3. **Refactor (MANDATORY):**
   - Remove: Dead code, unused variables, unnecessary complexity
   - Simplify: Reduce nesting, clarify names, extract functions
   - Generalize: Remove duplication, extract patterns
4. **Repeat** - Next test case

**The refactor step is NOT optional!**

## AI Assistant Checklist

After implementation, provide:
```
✅ Asked before coding
✅ Tests written FIRST
✅ All tests pass
✅ Refactored: Removed [list]
✅ Refactored: Simplified [list]
✅ Separated database/business logic
✅ Tests focus on BEHAVIOR not implementation
✅ Only requested changes made
✅ Ran: make check-guidelines
```

## Separation of Concerns

**NEVER mix database and business logic.**

- **Database methods** (`_fetch_*`, `_load_*`): Only I/O, return raw data
- **Business logic** (`_apply_*`, `_calculate_*`): Only processing, pure functions
- **Orchestration** (public API): Coordinate layers, minimal logic

```python
# Bad: Mixed concerns
def search(query, fuzzy):
    results = db.query("MATCH...")  # DB + Logic mixed
    return [score(r) for r in results if fuzzy]

# Good: Separated
def search(query, fuzzy):
    candidates = self._fetch_candidates(query if not fuzzy else None)
    return self._apply_fuzzy(candidates, query) if fuzzy else candidates

def _fetch_candidates(query): # Pure DB
    return db.query(...)

def _apply_fuzzy(candidates, query): # Pure logic
    return [score(c) for c in candidates]
```

## Clean Code Rules

- **One Responsibility**: Function does ONE thing, name says what it does
- **DRY**: Extract duplicates, but prefer clarity over extreme abstraction
- **KISS**: Simple > clever, readable > concise
- **YAGNI**: Build what's requested NOW, not "just in case"
- **Small Functions**: 10-20 lines ideal, max 50, max 5 parameters
- **Meaningful Names**: `calculate_total_price` not `calc` or `do_stuff`
- **Early Returns**: Reduce nesting with guard clauses
- **No Side Effects**: Function does what name says, nothing hidden

## Testing Strategy

**Test BEHAVIOR, not IMPLEMENTATION:**
- Test WHAT code does, not HOW it does it
- Test public APIs, not private methods
- Tests should survive refactoring

```python
# Bad: Testing implementation
assert db._apply_fuzzy_matching.called

# Good: Testing behavior
results = db.search_commands(query="doker", fuzzy=True)
assert results[0].command == "docker ps"
```

**Comprehensive Edge Cases:**
Test typos, misspellings, transpositions, missing/extra chars, case variations, partial words, unicode, empty inputs, special characters, very long inputs, whitespace, **AND non-matching queries**.

## Refactoring Red Flags

Refactor when you see:
- Functions > 50 lines or 3+ nested levels
- Duplicated code blocks
- Magic numbers (use constants)
- 5+ parameters
- Mixing database and business logic
- Complex boolean conditions
- God classes doing everything

**Ask: "Is this doing more than one thing?" If yes, split it.**

## Best Practices

- **Security**: Never commit secrets, sanitize inputs, use parameterized queries
- **Performance**: Measure before optimizing, readability first
- **Comments**: Explain WHY not WHAT, update when code changes, delete commented code
- **Git commits**: Clear messages explaining what and why
- **Error handling**: Fail fast, use specific exceptions, don't silently swallow errors

## Workflow DO's and DON'Ts

**DO:**
- ✅ Ask before implementing
- ✅ Write tests first
- ✅ Make small commits
- ✅ Stay in scope

**DON'T:**
- ❌ Assume what user wants
- ❌ Add features not requested
- ❌ Change config/dependencies without asking
- ❌ Make sweeping changes at once

## Pre-Submit Checklist

**Refactoring:**
- [ ] Removed dead code, unused variables, debug prints, commented code
- [ ] Simplified complex logic, reduced nesting
- [ ] Extracted duplicated code

**Quality:**
- [ ] Separated database/business logic
- [ ] Functions small and focused (< 50 lines)
- [ ] Well-named functions/variables
- [ ] Linter passes

**Testing:**
- [ ] Tests written FIRST
- [ ] Tests focus on BEHAVIOR
- [ ] Edge cases covered
- [ ] All tests pass

**Process:**
- [ ] Only requested changes
- [ ] User validated approach
- [ ] Ran `make check-guidelines`

## When in Doubt

**Ask, don't assume. Simple over clever. Test before commit.**
