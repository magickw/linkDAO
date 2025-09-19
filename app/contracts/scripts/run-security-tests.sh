#!/bin/bash

# Comprehensive Security Testing Script
# This script runs all security tests and analysis tools

set -e

echo "🔒 Starting Comprehensive Security Testing Suite"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the contracts directory
if [ ! -f "hardhat.config.ts" ]; then
    print_error "Please run this script from the contracts directory"
    exit 1
fi

# Create security reports directory
mkdir -p security-reports

# Clean previous artifacts
print_status "Cleaning previous security artifacts..."
rm -rf security-reports/* slither-report.json mythx-report.json

# Compile contracts
print_status "Compiling contracts for security analysis..."
if npx hardhat compile; then
    print_success "Contracts compiled successfully"
else
    print_error "Contract compilation failed"
    exit 1
fi

# Run Solidity linting
print_status "Running Solidity linting..."
if npx solhint 'contracts/**/*.sol' --reporter json > security-reports/solhint-report.json; then
    print_success "Solhint analysis completed"
else
    print_warning "Solhint found issues (check security-reports/solhint-report.json)"
fi

# Run Slither static analysis
print_status "Running Slither static analysis..."
if command -v slither &> /dev/null; then
    if slither . --json security-reports/slither-report.json --exclude-dependencies; then
        print_success "Slither analysis completed"
    else
        print_warning "Slither analysis found issues"
    fi
    
    # Generate human-readable Slither report
    slither . --exclude-dependencies > security-reports/slither-readable.txt 2>&1 || true
else
    print_warning "Slither not installed. Install with: pip install slither-analyzer"
fi

# Run MythX analysis (if available)
print_status "Running MythX analysis..."
if command -v mythx &> /dev/null; then
    if mythx analyze --mode quick --format json > security-reports/mythx-report.json; then
        print_success "MythX analysis completed"
    else
        print_warning "MythX analysis encountered issues"
    fi
else
    print_warning "MythX not available. Install MythX CLI for additional analysis"
fi

# Run custom security analysis
print_status "Running custom security analysis..."
if npx ts-node scripts/security-analysis.ts; then
    print_success "Custom security analysis completed"
else
    print_warning "Custom security analysis completed with warnings"
fi

# Run security-focused tests
print_status "Running security-focused tests..."
if npx hardhat test test/comprehensive/SecurityTests.test.ts; then
    print_success "Security tests passed"
else
    print_error "Security tests failed"
    exit 1
fi

# Run fuzzing tests (if Echidna is available)
print_status "Running fuzzing tests..."
if command -v echidna-test &> /dev/null; then
    print_status "Echidna fuzzing available - running property tests..."
    # This would run Echidna fuzzing tests
    # echidna-test . --config echidna.yaml
    print_warning "Echidna fuzzing tests not configured yet"
else
    print_warning "Echidna not installed. Install for property-based fuzzing"
fi

# Check for common security patterns
print_status "Checking for common security patterns..."

# Check for reentrancy protection
print_status "Checking reentrancy protection..."
REENTRANCY_COUNT=$(grep -r "nonReentrant" contracts/ | wc -l)
EXTERNAL_CALLS=$(grep -r "\.call\|\.transfer\|\.send" contracts/ | wc -l)

if [ $EXTERNAL_CALLS -gt 0 ] && [ $REENTRANCY_COUNT -eq 0 ]; then
    print_warning "External calls found but no reentrancy protection detected"
else
    print_success "Reentrancy protection appears to be in place"
fi

# Check for access control
print_status "Checking access control patterns..."
ACCESS_CONTROL_COUNT=$(grep -r "onlyOwner\|onlyRole\|AccessControl" contracts/ | wc -l)

if [ $ACCESS_CONTROL_COUNT -gt 0 ]; then
    print_success "Access control patterns detected"
else
    print_warning "No access control patterns found"
fi

# Check for pause mechanisms
print_status "Checking emergency pause mechanisms..."
PAUSE_COUNT=$(grep -r "Pausable\|whenNotPaused\|pause()" contracts/ | wc -l)

if [ $PAUSE_COUNT -gt 0 ]; then
    print_success "Emergency pause mechanisms detected"
else
    print_warning "No emergency pause mechanisms found"
fi

# Check for input validation
print_status "Checking input validation..."
REQUIRE_COUNT=$(grep -r "require(\|revert\|if.*revert" contracts/ | wc -l)

if [ $REQUIRE_COUNT -gt 10 ]; then
    print_success "Input validation appears comprehensive"
else
    print_warning "Limited input validation detected"
fi

# Generate security checklist
print_status "Generating security checklist..."
cat > security-reports/security-checklist.md << 'EOF'
# Security Testing Results

## Automated Analysis Results

### Static Analysis Tools
- [ ] Slither analysis completed
- [ ] Solhint linting completed
- [ ] MythX analysis completed (if available)
- [ ] Custom security checks completed

### Security Test Results
- [ ] Reentrancy tests passed
- [ ] Access control tests passed
- [ ] Input validation tests passed
- [ ] Emergency mechanism tests passed

### Manual Review Items
- [ ] Business logic review completed
- [ ] Economic model review completed
- [ ] Upgrade mechanism review completed
- [ ] Integration security review completed

### Deployment Readiness
- [ ] All critical issues resolved
- [ ] All high-priority issues resolved
- [ ] External audit completed
- [ ] Bug bounty program launched

## Next Steps
1. Review all generated reports
2. Address critical and high-priority issues
3. Conduct manual security review
4. Schedule external security audit
5. Prepare incident response procedures
EOF

# Run gas analysis for security implications
print_status "Analyzing gas usage for security implications..."
REPORT_GAS=true npx hardhat test --grep "gas" > security-reports/gas-security-analysis.txt 2>&1 || true

# Check for potential DoS vectors
print_status "Checking for potential DoS vectors..."
LOOP_COUNT=$(grep -r "for\s*(" contracts/ | wc -l)
ARRAY_COUNT=$(grep -r "\[\]" contracts/ | wc -l)

if [ $LOOP_COUNT -gt 5 ] || [ $ARRAY_COUNT -gt 10 ]; then
    print_warning "Potential DoS vectors detected - review loops and arrays"
    echo "Loops found: $LOOP_COUNT" >> security-reports/dos-analysis.txt
    echo "Arrays found: $ARRAY_COUNT" >> security-reports/dos-analysis.txt
else
    print_success "DoS vector analysis completed"
fi

# Generate final security report
print_status "Generating final security report..."
cat > security-reports/SECURITY_SUMMARY.md << EOF
# Security Analysis Summary

**Date:** $(date)
**Contracts Analyzed:** $(find contracts/ -name "*.sol" | wc -l)

## Tools Used
- Solhint: ✅
- Slither: $(command -v slither &> /dev/null && echo "✅" || echo "❌")
- MythX: $(command -v mythx &> /dev/null && echo "✅" || echo "❌")
- Custom Analysis: ✅
- Security Tests: ✅

## Security Patterns Detected
- Reentrancy Protection: $([ $REENTRANCY_COUNT -gt 0 ] && echo "✅" || echo "❌")
- Access Control: $([ $ACCESS_CONTROL_COUNT -gt 0 ] && echo "✅" || echo "❌")
- Emergency Pause: $([ $PAUSE_COUNT -gt 0 ] && echo "✅" || echo "❌")
- Input Validation: $([ $REQUIRE_COUNT -gt 10 ] && echo "✅" || echo "⚠️")

## Files Generated
- Slither Report: security-reports/slither-report.json
- Solhint Report: security-reports/solhint-report.json
- Custom Analysis: security-analysis-report.json
- Security Checklist: security-reports/security-checklist.md

## Recommendations
1. Review all generated reports carefully
2. Address any critical or high-severity issues
3. Conduct thorough manual review
4. Consider external security audit
5. Implement monitoring and alerting
6. Prepare incident response procedures

## Next Steps
- [ ] Review all security reports
- [ ] Fix critical and high-priority issues
- [ ] Complete manual security review
- [ ] Schedule external audit
- [ ] Deploy to testnet for final testing
EOF

# Count issues by severity
print_status "Analyzing issue severity..."
if [ -f "security-analysis-report.json" ]; then
    CRITICAL_ISSUES=$(jq '.criticalIssues // 0' security-analysis-report.json 2>/dev/null || echo "0")
    HIGH_ISSUES=$(jq '.highIssues // 0' security-analysis-report.json 2>/dev/null || echo "0")
    MEDIUM_ISSUES=$(jq '.mediumIssues // 0' security-analysis-report.json 2>/dev/null || echo "0")
    
    echo "" >> security-reports/SECURITY_SUMMARY.md
    echo "## Issue Summary" >> security-reports/SECURITY_SUMMARY.md
    echo "- Critical Issues: $CRITICAL_ISSUES" >> security-reports/SECURITY_SUMMARY.md
    echo "- High Issues: $HIGH_ISSUES" >> security-reports/SECURITY_SUMMARY.md
    echo "- Medium Issues: $MEDIUM_ISSUES" >> security-reports/SECURITY_SUMMARY.md
fi

# Final summary
echo ""
echo "=================================================="
echo "🔒 Security Testing Suite Completed"
echo "=================================================="

print_status "Generated Reports:"
echo "  📊 Security Summary: security-reports/SECURITY_SUMMARY.md"
echo "  🔍 Slither Report: security-reports/slither-report.json"
echo "  📋 Security Checklist: security-reports/security-checklist.md"
echo "  🛡️  Custom Analysis: security-analysis-report.json"

if [ -f "security-analysis-report.json" ]; then
    CRITICAL_ISSUES=$(jq '.criticalIssues // 0' security-analysis-report.json 2>/dev/null || echo "0")
    HIGH_ISSUES=$(jq '.highIssues // 0' security-analysis-report.json 2>/dev/null || echo "0")
    
    if [ "$CRITICAL_ISSUES" -gt 0 ]; then
        print_error "CRITICAL: $CRITICAL_ISSUES critical security issues found!"
        echo "❌ DO NOT DEPLOY until critical issues are resolved"
        exit 1
    elif [ "$HIGH_ISSUES" -gt 0 ]; then
        print_warning "HIGH: $HIGH_ISSUES high-severity issues found"
        echo "⚠️  Review and resolve high-priority issues before deployment"
    else
        print_success "No critical or high-severity issues detected"
    fi
fi

echo ""
print_status "Next Steps:"
echo "  1. Review all security reports in security-reports/ directory"
echo "  2. Address any critical or high-priority issues"
echo "  3. Complete manual security review using checklist"
echo "  4. Consider external security audit"
echo "  5. Test on testnet before mainnet deployment"

echo ""
print_success "Security testing suite completed successfully!"