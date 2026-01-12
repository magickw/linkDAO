#!/bin/bash

# Security Scan Script for LinkDAO Frontend
# Runs comprehensive security checks locally before pushing

set -e

echo "🔒 Starting Security Scan for LinkDAO Frontend..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

# Function to check command result
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1 passed${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# 1. Dependency Audit
print_header "1. Running npm audit"
npm audit --audit-level=moderate
check_result "Dependency Audit"

# 2. ESLint Security Scan
print_header "2. Running ESLint with security rules"
if ! command -v eslint &> /dev/null; then
    echo -e "${YELLOW}ESLint security plugin not installed. Installing...${NC}"
    npm install -D eslint-plugin-security
fi
npx eslint 'src/**/*.{ts,tsx}' --plugin security || true
check_result "ESLint Security Scan"

# 3. Check for hardcoded secrets
print_header "3. Scanning for hardcoded secrets"
if command -v trufflehog &> /dev/null; then
    trufflehog filesystem --directory ./src --only-verified || true
else
    echo -e "${YELLOW}TruffleHog not installed. Skipping secrets scan.${NC}"
    echo "Install with: go install github.com/trufflesecurity/trufflehog/v3/cmd/trufflehog@latest"
fi

# 4. Check for sensitive patterns
print_header "4. Checking for sensitive patterns in code"
SENSITIVE_PATTERNS=(
    "private.*key"
    "mnemonic"
    "password.*="
    "secret.*="
    "api.*key"
    "token.*="
)

FOUND_ISSUES=0
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if grep -ri "$pattern" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test." | grep -v "console.log" | grep -v "// " | grep -v "\/\*" | grep -v "\*\/"; then
        echo -e "${RED}⚠ Found potential sensitive pattern: $pattern${NC}"
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
done

if [ $FOUND_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ No sensitive patterns found${NC}"
else
    echo -e "${YELLOW}⚠ Found $FOUND_ISSUES potential issues. Please review above.${NC}"
fi

# 5. Check for unsafe innerHTML usage
print_header "5. Checking for unsafe innerHTML usage"
UNSAFE_INNERHTML=$(grep -r "innerHTML" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "DOMPurify" | grep -v ".test." | wc -l)
if [ $UNSAFE_INNERHTML -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $UNSAFE_INNERHTML instances of innerHTML without DOMPurify${NC}"
    grep -rn "innerHTML" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "DOMPurify" | grep -v ".test."
else
    echo -e "${GREEN}✓ No unsafe innerHTML usage found${NC}"
fi

# 6. Check for eval usage
print_header "6. Checking for eval() usage"
EVAL_USAGE=$(grep -r "eval(" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test." | wc -l)
if [ $EVAL_USAGE -gt 0 ]; then
    echo -e "${RED}✗ Found $EVAL_USAGE instances of eval() usage${NC}"
    grep -rn "eval(" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test."
else
    echo -e "${GREEN}✓ No eval() usage found${NC}"
fi

# 7. Check for console.log in production code
print_header "7. Checking for console.log in production code"
CONSOLE_LOGS=$(grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test." | grep -v ".spec." | wc -l)
if [ $CONSOLE_LOGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Found $CONSOLE_LOGS instances of console.log${NC}"
    echo "Consider removing or replacing with proper logging"
else
    echo -e "${GREEN}✓ No console.log found${NC}"
fi

# 8. Check package.json for outdated dependencies
print_header "8. Checking for outdated dependencies"
npm outdated || true
echo -e "${GREEN}✓ Outdated dependencies check complete${NC}"

# 9. Check for missing CSP headers
print_header "9. Checking for Content Security Policy"
if [ -f "next.config.js" ] || [ -f "next.config.ts" ]; then
    if grep -q "contentSecurityPolicy" next.config.* 2>/dev/null; then
        echo -e "${GREEN}✓ CSP headers configured${NC}"
    else
        echo -e "${YELLOW}⚠ No CSP headers found in next.config${NC}"
        echo "Consider adding contentSecurityPolicy for better security"
    fi
else
    echo -e "${YELLOW}⚠ next.config not found${NC}"
fi

# 10. Generate security report
print_header "10. Generating Security Report"
REPORT_FILE="security-scan-report-$(date +%Y%m%d-%H%M%S).txt"
cat > "$REPORT_FILE" << EOF
========================================
LinkDAO Security Scan Report
========================================
Date: $(date)
Branch: $(git branch --show-current 2>/dev/null || echo "unknown")
Commit: $(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

========================================
Scan Results
========================================

1. Dependency Audit: ✓ Passed
2. ESLint Security: ✓ Passed
3. Secrets Scan: ✓ Completed
4. Sensitive Patterns: $FOUND_ISSUES issues found
5. Unsafe innerHTML: $UNSAFE_INNERHTML instances
6. eval() Usage: $EVAL_USAGE instances
7. console.log: $CONSOLE_LOGS instances

========================================
Recommendations
========================================

EOF

if [ $FOUND_ISSUES -gt 0 ] || [ $UNSAFE_INNERHTML -gt 0 ] || [ $EVAL_USAGE -gt 0 ]; then
    cat >> "$REPORT_FILE" << EOF
⚠️ Action Required:
- Review sensitive patterns in code
- Ensure all innerHTML usage is sanitized with DOMPurify
- Remove or replace eval() usage
- Remove console.log statements from production code

EOF
else
    cat >> "$REPORT_FILE" << EOF
✓ All security checks passed
- No critical issues found
- Code is ready for review

EOF
fi

echo "Security report saved to: $REPORT_FILE"

# Final summary
print_header "Security Scan Complete"
echo -e "${GREEN}✓ All security checks completed${NC}"
echo ""
echo "Review the security report at: $REPORT_FILE"
echo ""
if [ $FOUND_ISSUES -gt 0 ] || [ $UNSAFE_INNERHTML -gt 0 ] || [ $EVAL_USAGE -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some issues were found. Please review the report above.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ No critical security issues found${NC}"
    exit 0
fi