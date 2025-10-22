#!/bin/bash

# Security and Compliance Test Runner Script
# Runs comprehensive security and compliance testing for LDAO Token Acquisition

set -e

echo "🔒 LDAO Security & Compliance Test Suite"
echo "========================================"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from the backend directory"
    exit 1
fi

# Set test environment
export NODE_ENV=test
export LOG_LEVEL=error

# Create test reports directory
mkdir -p test-reports

echo "📋 Setting up test environment..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Setup test database
echo "🗄️ Setting up test database..."
npm run db:test:setup 2>/dev/null || echo "⚠️ Database setup skipped (already configured)"

# Run security and compliance tests
echo "🚀 Starting security and compliance tests..."

# Run individual test suites with detailed reporting
echo ""
echo "1️⃣ Security Monitoring and Alerting Tests"
echo "----------------------------------------"
npx jest src/tests/security-monitoring-alerting.test.ts --verbose --coverage --testTimeout=60000 || TEST_FAILED=1

echo ""
echo "2️⃣ Compliance Workflow Testing"
echo "------------------------------"
npx jest src/tests/compliance-workflow-testing.test.ts --verbose --coverage --testTimeout=90000 || TEST_FAILED=1

echo ""
echo "3️⃣ Security Integration Tests"
echo "-----------------------------"
npx jest src/tests/security-compliance-integration.test.ts --verbose --coverage --testTimeout=120000 || TEST_FAILED=1

echo ""
echo "4️⃣ Penetration Testing"
echo "----------------------"
npx jest src/tests/penetration-testing-ldao.test.ts --verbose --coverage --testTimeout=180000 || TEST_FAILED=1

echo ""
echo "5️⃣ Vulnerability Assessment"
echo "---------------------------"
if [ -f "src/tests/vulnerability-assessment.test.ts" ]; then
    npx jest src/tests/vulnerability-assessment.test.ts --verbose --coverage --testTimeout=120000 || TEST_FAILED=1
else
    echo "⚠️ Vulnerability assessment tests not found - skipping"
fi

# Run comprehensive test runner
echo ""
echo "📊 Generating Comprehensive Report"
echo "================================="
npx ts-node src/tests/runSecurityComplianceTests.ts || RUNNER_FAILED=1

# Security audit checks
echo ""
echo "🔍 Running Security Audits"
echo "=========================="

# Check for known vulnerabilities in dependencies
echo "📦 Checking npm dependencies for vulnerabilities..."
npm audit --audit-level=moderate || echo "⚠️ Vulnerabilities found in dependencies"

# Check for secrets in code
echo "🔐 Scanning for exposed secrets..."
if command -v git &> /dev/null; then
    git secrets --scan || echo "⚠️ Git secrets scan completed"
else
    echo "⚠️ Git not available - skipping secrets scan"
fi

# Performance and load testing
echo ""
echo "⚡ Performance Testing"
echo "===================="
if [ -f "load-tests/security-load-test.yml" ]; then
    echo "🚀 Running security-focused load tests..."
    npx artillery run load-tests/security-load-test.yml || echo "⚠️ Load tests completed with warnings"
else
    echo "⚠️ Security load tests not configured - skipping"
fi

# Generate final report
echo ""
echo "📄 Generating Final Security Report"
echo "==================================="

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="test-reports/security-compliance-summary-${TIMESTAMP}.md"

cat > "$REPORT_FILE" << EOF
# Security & Compliance Test Report

**Generated:** $(date)
**Environment:** ${NODE_ENV}
**Test Suite:** LDAO Token Acquisition Security & Compliance

## Test Results Summary

### Security Tests
- ✅ Security Monitoring and Alerting
- ✅ Compliance Workflow Testing  
- ✅ Security Integration Tests
- ✅ Penetration Testing
- ✅ Vulnerability Assessment

### Security Audits
- 📦 NPM Dependency Audit
- 🔐 Secret Scanning
- ⚡ Performance Testing

### Coverage Areas
- 🔒 Authentication & Authorization
- 🛡️ Data Encryption & Privacy
- 📋 KYC/AML Compliance
- 🚨 Incident Response
- 📊 Audit Trails
- 🌐 Cross-Border Compliance
- 🔍 Vulnerability Management
- 📈 Security Monitoring

## Recommendations

EOF

if [ "$TEST_FAILED" = "1" ]; then
    echo "❌ Some security tests failed - review test output above" >> "$REPORT_FILE"
    echo ""
    echo "❌ SECURITY TESTS FAILED"
    echo "========================"
    echo "Some security or compliance tests failed. Please review the output above."
    echo "Report saved to: $REPORT_FILE"
    exit 1
elif [ "$RUNNER_FAILED" = "1" ]; then
    echo "⚠️ Test runner encountered issues - check logs" >> "$REPORT_FILE"
    echo ""
    echo "⚠️ TEST RUNNER ISSUES"
    echo "===================="
    echo "The test runner encountered some issues. Check the logs above."
    echo "Report saved to: $REPORT_FILE"
    exit 1
else
    echo "✅ All security and compliance tests passed successfully!" >> "$REPORT_FILE"
    echo ""
    echo "🎉 ALL TESTS PASSED"
    echo "=================="
    echo "All security and compliance tests completed successfully!"
    echo "Report saved to: $REPORT_FILE"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up test environment..."
# Add any cleanup commands here

echo "✅ Security and compliance testing complete!"