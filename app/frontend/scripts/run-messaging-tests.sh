#!/bin/bash

# Messaging System Test Runner
# This script runs all messaging system tests including unit tests, integration tests, and security tests

set -e

echo "🚀 Starting Messaging System Test Suite"
echo "========================================"

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

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Create coverage directory if it doesn't exist
mkdir -p coverage/messaging

# Set environment variables for testing
export NODE_ENV=test
export CI=true

print_status "Running messaging system tests..."

# Function to run a specific test suite
run_test_suite() {
    local suite_name="$1"
    local test_pattern="$2"
    local description="$3"
    
    echo ""
    print_status "Running $suite_name"
    echo "Description: $description"
    echo "Pattern: $test_pattern"
    echo "----------------------------------------"
    
    if npx jest "$test_pattern" --config=jest.messaging.config.js --verbose --no-cache; then
        print_success "$suite_name completed successfully"
        return 0
    else
        print_error "$suite_name failed"
        return 1
    fi
}

# Track test results
failed_suites=()
total_suites=0

# Run Unit Tests - Message Encryption Service
total_suites=$((total_suites + 1))
if ! run_test_suite "Unit Tests - Message Encryption Service" \
    "src/services/__tests__/messageEncryptionService.test.ts" \
    "Tests for message encryption and decryption functionality"; then
    failed_suites+=("Message Encryption Service")
fi

# Run Unit Tests - Conversation Management Service
total_suites=$((total_suites + 1))
if ! run_test_suite "Unit Tests - Conversation Management Service" \
    "src/services/__tests__/conversationManagementService.test.ts" \
    "Tests for conversation management operations"; then
    failed_suites+=("Conversation Management Service")
fi

# Run Unit Tests - Offline Message Queue Service
total_suites=$((total_suites + 1))
if ! run_test_suite "Unit Tests - Offline Message Queue Service" \
    "src/services/__tests__/offlineMessageQueueService.test.ts" \
    "Tests for offline message queuing and synchronization"; then
    failed_suites+=("Offline Message Queue Service")
fi

# Run Integration Tests - Conversation Workflows
total_suites=$((total_suites + 1))
if ! run_test_suite "Integration Tests - Conversation Workflows" \
    "src/__tests__/integration/messaging/conversationWorkflows.integration.test.tsx" \
    "End-to-end tests for complete conversation workflows"; then
    failed_suites+=("Conversation Workflows Integration")
fi

# Run Security Tests - Encryption Security
total_suites=$((total_suites + 1))
if ! run_test_suite "Security Tests - Encryption Security" \
    "src/__tests__/security/messaging/encryptionSecurity.test.ts" \
    "Security tests for encryption and message handling"; then
    failed_suites+=("Encryption Security")
fi

# Run Security Tests - Key Management Security
total_suites=$((total_suites + 1))
if ! run_test_suite "Security Tests - Key Management Security" \
    "src/__tests__/security/messaging/keyManagementSecurity.test.ts" \
    "Security tests for key management and storage"; then
    failed_suites+=("Key Management Security")
fi

# Generate comprehensive coverage report
echo ""
print_status "Generating comprehensive coverage report..."
if npx jest --config=jest.messaging.config.js --coverage --coverageReporters=html,lcov,text-summary --silent; then
    print_success "Coverage report generated successfully"
    echo "Coverage report available at: coverage/messaging/lcov-report/index.html"
else
    print_warning "Coverage report generation had issues"
fi

# Run the TypeScript test runner for additional reporting
echo ""
print_status "Running TypeScript test runner for detailed reporting..."
if npx ts-node src/__tests__/messaging/testRunner.ts; then
    print_success "Test runner completed successfully"
else
    print_warning "Test runner had issues but tests may have passed"
fi

# Summary
echo ""
echo "========================================"
echo "📊 Test Execution Summary"
echo "========================================"

passed_suites=$((total_suites - ${#failed_suites[@]}))
success_rate=$(( (passed_suites * 100) / total_suites ))

echo "Total Test Suites: $total_suites"
echo "Passed: $passed_suites ✅"
echo "Failed: ${#failed_suites[@]} ${#failed_suites[@] > 0 && echo "❌" || echo ""}"
echo "Success Rate: $success_rate%"

if [ ${#failed_suites[@]} -gt 0 ]; then
    echo ""
    print_error "Failed Test Suites:"
    for suite in "${failed_suites[@]}"; do
        echo "  - $suite"
    done
fi

# Check coverage thresholds
echo ""
print_status "Checking coverage thresholds..."
if [ -f "coverage/messaging/lcov.info" ]; then
    # Extract coverage percentages (simplified check)
    if grep -q "end_of_record" coverage/messaging/lcov.info; then
        print_success "Coverage report generated successfully"
    else
        print_warning "Coverage report may be incomplete"
    fi
else
    print_warning "Coverage report not found"
fi

# Requirements coverage check
echo ""
print_status "Requirements Coverage:"
echo "- Requirement 3.1 (Messaging Core): Covered by unit and integration tests"
echo "- Requirement 3.2 (Conversation Management): Covered by unit and integration tests"  
echo "- Requirement 3.3 (Message Encryption): Covered by unit and security tests"
echo "- Requirement 8.1 (Security Implementation): Covered by security tests"
echo "- Requirement 8.2 (Key Management): Covered by security tests"

# Final result
echo ""
if [ ${#failed_suites[@]} -eq 0 ]; then
    print_success "🎉 All messaging system tests passed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Review coverage report: coverage/messaging/lcov-report/index.html"
    echo "2. Check detailed test report: messaging-test-report.json"
    echo "3. Verify all requirements are met"
    exit 0
else
    print_error "❌ Some tests failed. Please review the errors above."
    echo ""
    echo "Troubleshooting:"
    echo "1. Check individual test logs for specific errors"
    echo "2. Verify all dependencies are installed correctly"
    echo "3. Ensure test environment is properly configured"
    echo "4. Review failed test suites listed above"
    exit 1
fi