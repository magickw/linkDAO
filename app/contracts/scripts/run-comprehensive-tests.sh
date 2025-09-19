#!/bin/bash

# Comprehensive Test Suite Runner for Smart Contracts
# This script runs all tests and generates comprehensive reports

set -e

echo "🚀 Starting Comprehensive Smart Contract Test Suite"
echo "=================================================="

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

# Clean previous artifacts
print_status "Cleaning previous artifacts..."
rm -rf artifacts cache coverage test-report.json gas-report.txt slither-report.json
npx hardhat clean

# Compile contracts
print_status "Compiling contracts..."
if npx hardhat compile; then
    print_success "Contracts compiled successfully"
else
    print_error "Contract compilation failed"
    exit 1
fi

# Check contract sizes
print_status "Checking contract sizes..."
npx hardhat size-contracts

# Run linting
print_status "Running Solidity linting..."
if npx solhint 'contracts/**/*.sol'; then
    print_success "Linting passed"
else
    print_warning "Linting found issues (non-blocking)"
fi

# Run static analysis with Slither (if available)
print_status "Running static analysis..."
if command -v slither &> /dev/null; then
    if slither . --json slither-report.json; then
        print_success "Slither analysis completed"
    else
        print_warning "Slither analysis found issues"
    fi
else
    print_warning "Slither not installed, skipping static analysis"
fi

# Run unit tests
print_status "Running unit tests..."
if npx hardhat test test/comprehensive/UnitTests.test.ts; then
    print_success "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

# Run integration tests
print_status "Running integration tests..."
if npx hardhat test test/comprehensive/IntegrationTests.test.ts; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# Run security tests
print_status "Running security tests..."
if npx hardhat test test/comprehensive/SecurityTests.test.ts; then
    print_success "Security tests passed"
else
    print_error "Security tests failed"
    exit 1
fi

# Run gas optimization tests
print_status "Running gas optimization tests..."
if REPORT_GAS=true npx hardhat test test/comprehensive/GasOptimizationTests.test.ts; then
    print_success "Gas optimization tests passed"
else
    print_error "Gas optimization tests failed"
    exit 1
fi

# Generate coverage report
print_status "Generating coverage report..."
if npx hardhat coverage; then
    print_success "Coverage report generated"
    
    # Check coverage threshold
    if [ -f "coverage/coverage-summary.json" ]; then
        COVERAGE=$(node -e "
            const fs = require('fs');
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            console.log(coverage.total.lines.pct);
        ")
        
        if (( $(echo "$COVERAGE >= 90" | bc -l) )); then
            print_success "Coverage $COVERAGE% meets 90% threshold"
        else
            print_warning "Coverage $COVERAGE% is below 90% threshold"
        fi
    fi
else
    print_warning "Coverage report generation failed"
fi

# Run all existing individual tests to ensure compatibility
print_status "Running existing test suite for compatibility..."
if npx hardhat test; then
    print_success "All existing tests passed"
else
    print_warning "Some existing tests failed"
fi

# Generate gas report
print_status "Generating detailed gas report..."
REPORT_GAS=true npx hardhat test --grep "gas" > gas-report.txt 2>&1 || true

# Run the comprehensive test runner
print_status "Running comprehensive test analysis..."
if npx ts-node test/comprehensive/TestRunner.ts; then
    print_success "Comprehensive test analysis completed"
else
    print_warning "Test analysis completed with warnings"
fi

# Final summary
echo ""
echo "=================================================="
echo "🎉 Comprehensive Test Suite Completed"
echo "=================================================="

print_status "Generated Reports:"
echo "  📊 Coverage Report: coverage/lcov-report/index.html"
echo "  ⛽ Gas Report: gas-report.txt"
echo "  📄 Test Report: test-report.json"

if [ -f "slither-report.json" ]; then
    echo "  🔍 Security Analysis: slither-report.json"
fi

echo ""
print_status "Next Steps:"
echo "  1. Review coverage report and aim for >90% coverage"
echo "  2. Check gas report for optimization opportunities"
echo "  3. Address any security findings"
echo "  4. Run tests on testnet before mainnet deployment"

echo ""
print_success "Test suite execution completed successfully!"