#!/bin/bash

# Automated Dependency Security Scanner
# Runs security audits and generates reports

set -e

echo "🔍 Starting Automated Dependency Security Scan..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="security-reports"
mkdir -p "$REPORT_DIR"

# Report files
AUDIT_REPORT="$REPORT_DIR/npm-audit-$TIMESTAMP.json"
SUMMARY_REPORT="$REPORT_DIR/summary-$TIMESTAMP.txt"
VULNERABILITY_REPORT="$REPORT_DIR/vulnerabilities-$TIMESTAMP.json"

echo ""
echo "📊 Running npm audit..."
echo "----------------------------------------------"

# Run npm audit and save output
if npm audit --json > "$AUDIT_REPORT" 2>&1; then
    echo -e "${GREEN}✓ No vulnerabilities found${NC}"
else
    echo -e "${YELLOW}⚠ Vulnerabilities detected${NC}"
fi

# Parse audit report and generate summary
echo ""
echo "📋 Generating Summary Report..."
echo "----------------------------------------------"

# Count vulnerabilities by severity
HIGH=$(jq '.vulnerabilities | map(select(.severity == "high")) | length' "$AUDIT_REPORT" 2>/dev/null || echo "0")
MODERATE=$(jq '.vulnerabilities | map(select(.severity == "moderate")) | length' "$AUDIT_REPORT" 2>/dev/null || echo "0")
LOW=$(jq '.vulnerabilities | map(select(.severity == "low")) | length' "$AUDIT_REPORT" 2>/dev/null || echo "0")
CRITICAL=$(jq '.vulnerabilities | map(select(.severity == "critical")) | length' "$AUDIT_REPORT" 2>/dev/null || echo "0")

# Generate summary
cat > "$SUMMARY_REPORT" << EOF
========================================
Dependency Security Scan Summary
========================================
Date: $(date)
Scan ID: $TIMESTAMP

Vulnerability Summary:
----------------------
Critical: $CRITICAL
High: $HIGH
Moderate: $MODERATE
Low: $LOW

Total: $((CRITICAL + HIGH + MODERATE + LOW))

EOF

# Check if there are vulnerabilities
if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
    echo -e "${RED}🚨 CRITICAL/HIGH vulnerabilities found!${NC}"
    echo "Critical: $CRITICAL, High: $HIGH" >> "$SUMMARY_REPORT"
    echo "" >> "$SUMMARY_REPORT"
    echo "ACTION REQUIRED: Review and fix critical/high vulnerabilities immediately" >> "$SUMMARY_REPORT"
elif [ "$MODERATE" -gt 0 ]; then
    echo -e "${YELLOW}⚠ Moderate vulnerabilities found${NC}"
    echo "Moderate: $MODERATE" >> "$SUMMARY_REPORT"
    echo "" >> "$SUMMARY_REPORT"
    echo "RECOMMENDED: Review and fix moderate vulnerabilities" >> "$SUMMARY_REPORT"
else
    echo -e "${GREEN}✓ All dependencies are secure${NC}"
    echo "No vulnerabilities found" >> "$SUMMARY_REPORT"
fi

echo "" >> "$SUMMARY_REPORT"
echo "Full report: $AUDIT_REPORT" >> "$SUMMARY_REPORT"

# Display summary
cat "$SUMMARY_REPORT"

# Generate detailed vulnerability report
echo ""
echo "📄 Generating Detailed Vulnerability Report..."
echo "----------------------------------------------"

jq '.vulnerabilities | to_entries | map({
    name: .key,
    severity: .value.severity,
    title: .value.title,
    url: .value.url,
    fixAvailable: .value.fixAvailable
})' "$AUDIT_REPORT" > "$VULNERABILITY_REPORT" 2>/dev/null || echo "{}" > "$VULNERABILITY_REPORT"

VULN_COUNT=$(jq 'length' "$VULNERABILITY_REPORT" 2>/dev/null || echo "0")

if [ "$VULN_COUNT" -gt 0 ]; then
    echo ""
    echo "Vulnerable Packages:"
    echo "--------------------"
    jq -r '.[] | "- \(.name) [\(.severity)]: \(.title)"' "$VULNERABILITY_REPORT" 2>/dev/null || true
fi

# Check for outdated packages
echo ""
echo "📦 Checking for outdated packages..."
echo "----------------------------------------------"

OUTDATED_REPORT="$REPORT_DIR/outdated-$TIMESTAMP.json"
npm outdated --json > "$OUTDATED_REPORT" 2>&1 || true

OUTDATED_COUNT=$(jq 'length' "$OUTDATED_REPORT" 2>/dev/null || echo "0")

if [ "$OUTDATED_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ $OUTDATED_COUNT outdated packages found${NC}"
    echo "" >> "$SUMMARY_REPORT"
    echo "Outdated Packages:" >> "$SUMMARY_REPORT"
    echo "--------------------" >> "$SUMMARY_REPORT"
    jq -r 'to_entries[] | "- \(.key): current \(.value.current, latest \(.value.latest)"' "$OUTDATED_REPORT" 2>/dev/null >> "$SUMMARY_REPORT" || true
else
    echo -e "${GREEN}✓ All packages are up to date${NC}"
    echo "" >> "$SUMMARY_REPORT"
    echo "All packages are up to date" >> "$SUMMARY_REPORT"
fi

# Run license check
echo ""
echo "📜 Checking package licenses..."
echo "----------------------------------------------"

LICENSE_REPORT="$REPORT_DIR/licenses-$TIMESTAMP.txt"
npm list --json | jq -r '.dependencies | to_entries[] | "\(.key): \(.value.license // "Unknown")"' > "$LICENSE_REPORT" 2>/dev/null || true

# Check for problematic licenses
PROBLEMATIC_LICENSES=$(grep -i -E "(GPL|AGPL|LGPL)" "$LICENSE_REPORT" 2>/dev/null || echo "")

if [ -n "$PROBLEMATIC_LICENSES" ]; then
    echo -e "${YELLOW}⚠ Packages with potentially restrictive licenses found${NC}"
    echo "" >> "$SUMMARY_REPORT"
    echo "Potentially Restrictive Licenses:" >> "$SUMMARY_REPORT"
    echo "--------------------------------" >> "$SUMMARY_REPORT"
    echo "$PROBLEMATIC_LICENSES" >> "$SUMMARY_REPORT"
else
    echo -e "${GREEN}✓ All licenses are permissive${NC}"
fi

# Check for security best practices
echo ""
echo "🔒 Checking security best practices..."
echo "----------------------------------------------"

BEST_PRACTICES_REPORT="$REPORT_DIR/best-practices-$TIMESTAMP.txt"

# Check for secrets in package.json
if grep -q -i "password\|secret\|api_key\|private_key" package.json 2>/dev/null; then
    echo -e "${RED}🚨 Potential secrets found in package.json${NC}"
    echo "WARNING: Potential secrets found in package.json" >> "$SUMMARY_REPORT"
else
    echo -e "${GREEN}✓ No secrets found in package.json${NC}"
fi

# Check for scripts
if jq -e '.scripts | length > 0' package.json > /dev/null 2>&1; then
    SCRIPT_COUNT=$(jq '.scripts | length' package.json)
    echo "Found $SCRIPT_COUNT npm scripts"
    echo "Scripts: $SCRIPT_COUNT" >> "$SUMMARY_REPORT"
fi

# Check for dependencies with known security issues
echo ""
echo "🎯 Checking for known security issues..."
echo "----------------------------------------------"

# Check for deprecated packages
DEPRECATED=$(npm ls --json 2>/dev/null | jq -r '.dependencies | to_entries[] | select(.value.deprecated) | "\(.key): \(.value.deprecated)"' || echo "")

if [ -n "$DEPRECATED" ]; then
    echo -e "${YELLOW}⚠ Deprecated packages found${NC}"
    echo "" >> "$SUMMARY_REPORT"
    echo "Deprecated Packages:" >> "$SUMMARY_REPORT"
    echo "--------------------" >> "$SUMMARY_REPORT"
    echo "$DEPRECATED" >> "$SUMMARY_REPORT"
else
    echo -e "${GREEN}✓ No deprecated packages found${NC}"
fi

# Generate final report
echo ""
echo "=============================================="
echo "📊 Scan Complete"
echo "=============================================="
echo ""
echo "Reports generated:"
echo "  - Summary: $SUMMARY_REPORT"
echo "  - Audit: $AUDIT_REPORT"
echo "  - Vulnerabilities: $VULNERABILITY_REPORT"
echo "  - Outdated: $OUTDATED_REPORT"
echo "  - Licenses: $LICENSE_REPORT"
echo ""

# Exit with appropriate code
if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
    echo -e "${RED}🚨 ACTION REQUIRED: Critical/High vulnerabilities found${NC}"
    exit 1
elif [ "$MODERATE" -gt 0 ]; then
    echo -e "${YELLOW}⚠ WARNING: Moderate vulnerabilities found${NC}"
    exit 0
else
    echo -e "${GREEN}✓ All checks passed${NC}"
    exit 0
fi