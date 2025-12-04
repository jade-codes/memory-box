# Development Guidelines for Memory Box

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

3. **Implement minimal code**
   - Make the test pass
   - Don't over-engineer
   - Keep it simple

4. **Refactor if needed**
   - Improve design while tests pass
   - Remove duplication
   - Enhance readability

5. **Repeat**
   - Next test case
   - Build incrementally

## When Making Changes

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

## Code Review Checklist

Before considering work "done":
- [ ] Tests written and passing
- [ ] Only requested changes made
- [ ] No scope creep
- [ ] User validated the approach
- [ ] Changes are minimal and focused
- [ ] Documentation updated (if applicable)

## Example Good Workflow

User: "I need to add a search feature"

Bad Response:
- Immediately implements search with 5 different filters
- Adds pagination, sorting, caching
- Refactors database layer
- Updates UI

Good Response:
- "What kind of search? Text-based, filters, or both?"
- "Should I add tests for edge cases like empty results?"
- Write test for basic text search
- Implement minimal search
- Confirm it works
- Ask: "Should we add filters next?"

## Remember

**The user knows what they want better than you do.**
**Ask questions. Make small changes. Write tests first.**
