# GitHub Copilot Instructions for Memory Box

## ⚠️ CRITICAL: Read CONTRIBUTING.md Before ANY Code Changes

**MANDATORY FIRST STEP:** Before making any code changes, you MUST read and follow `/workspace/CONTRIBUTING.md`.

## Non-Negotiable Requirements

### 1. Read the Guidelines
The file `CONTRIBUTING.md` in the repository root contains ALL development guidelines. These are **MANDATORY**, not optional.

### 2. Follow TDD Workflow
- Write tests FIRST (before implementation)
- Red → Green → Refactor
- Never skip the refactoring step

### 3. Separation of Concerns
- Database operations in separate methods from business logic
- Never mix I/O with transformations in the same function

### 4. Run Quality Checks
After every code change:
```bash
make check-guidelines
```
Fix ALL issues before considering work complete.

### 5. Provide Compliance Checklist
Use the checklist from CONTRIBUTING.md section "For AI Assistants"

## Quick Reference
- `make check-guidelines` - Full compliance check
- `make test` - Run tests
- `make lint-fix` - Fix linting
- `make format` - Format code

## Rejection Criteria
Code that violates CONTRIBUTING.md will be rejected. Common violations:
- ❌ Didn't ask before implementing
- ❌ No tests written first
- ❌ Mixed database/business logic
- ❌ Skipped refactoring
- ❌ Didn't run quality checks

---

**ACTION REQUIRED: Open and read `/workspace/CONTRIBUTING.md` now.**
