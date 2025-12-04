#!/bin/bash
# Automated check for development guidelines compliance

set -e

echo "🔍 Checking Development Guidelines Compliance..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Linter
echo "1️⃣  Running linter..."
if make lint-fix > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Linter passed${NC}"
else
    echo -e "${RED}❌ Linter failed - fix warnings before proceeding${NC}"
    make lint
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: Format check
echo "2️⃣  Checking code formatting..."
if make format-check > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Code formatting correct${NC}"
else
    echo -e "${YELLOW}⚠️  Code needs formatting - run 'make format'${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 3: Type checking
echo "3️⃣  Running type checker..."
if make typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Type checking passed${NC}"
else
    echo -e "${YELLOW}⚠️  Type checking has issues${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 4: Tests
echo "4️⃣  Running tests..."
if make test > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    make test
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 5: Coverage
echo "5️⃣  Checking test coverage..."
if make test-cov > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Coverage meets 80% threshold${NC}"
else
    echo -e "${RED}❌ Coverage below 80%${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Summary
echo "═══════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - Guidelines followed!${NC}"
    echo ""
    echo "Run 'make check' anytime to verify compliance"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  WARNINGS: $WARNINGS (fix recommended)${NC}"
    echo ""
    echo "Run 'make format' to fix formatting"
    exit 0
else
    echo -e "${RED}❌ ERRORS: $ERRORS, WARNINGS: $WARNINGS${NC}"
    echo ""
    echo "Fix errors before proceeding. Review CONTRIBUTING.md"
    echo "Available commands:"
    echo "  make lint-fix  - Fix linting issues"
    echo "  make format    - Format code"
    echo "  make test      - Run tests"
    exit 1
fi
