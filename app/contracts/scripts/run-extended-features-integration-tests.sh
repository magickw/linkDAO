#!/bin/bash

# Extended Features Integration Test Runner
# This script runs comprehensive tests to validate the complete platform functionality

echo "🚀 Starting Extended Features Integration Tests..."
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

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Clean previous artifacts
print_status "Cleaning previous build artifacts..."
npx hardhat clean

# Compile contracts
print_status "Compiling contracts..."
if npx hardhat compile; then
    print_success "Contracts compiled successfully"
else
    print_error "Contract compilation failed"
    exit 1
fi

# Run extended features integration tests
print_status "Running Extended Features Integration Tests..."
echo ""

# Test 1: Core Integration Tests
print_status "1. Running Core Integration Tests..."
if npx hardhat test test/comprehensive/ExtendedFeaturesIntegration.test.ts --grep "Core Platform Integration"; then
    print_success "Core integration tests passed"
else
    print_error "Core integration tests failed"
    exit 1
fi

# Test 2: Cross-Contract Communication Tests
print_status "2. Running Cross-Contract Communication Tests..."
if npx hardhat test test/comprehensive/ExtendedFeaturesIntegration.test.ts --grep "Cross-Contract Communication"; then
    print_success "Cross-contract communication tests passed"
else
    print_error "Cross-contract communication tests failed"
    exit 1
fi

# Test 3: Reward Mechanisms Tests
print_status "3. Running Reward Mechanisms Tests..."
if npx hardhat test test/comprehensive/ExtendedFeaturesIntegration.test.ts --grep "Reward Mechanisms Integration"; then
    print_success "Reward mechanisms tests passed"
else
    print_error "Reward mechanisms tests failed"
    exit 1
fi

# Test 4: Social Features Tests
print_status "4. Running Social Features Integration Tests..."
if npx hardhat test test/comprehensive/ExtendedFeaturesIntegration.test.ts --grep "Social Features Integration"; then
    print_success "Social features integration tests passed"
else
    print_error "Social features integration tests failed"
    exit 1
fi

# Test 5: NFT Marketplace Tests
print_status "5. Running NFT Marketplace Integration Tests..."
if npx hardhat test test/comprehensive/ExtendedFeaturesIntegration.test.ts --grep "NFT Marketplace Integration"; then
    print_success "NFT marketplace integration tests passed"
else
    print_error "NFT marketplace integration tests failed"
    exit 1
fi

# Test 6: End-to-End Platform Tests
print_status "6. Running End-to-End Platform Functionality Tests..."
if npx hardhat test test/comprehensive/ExtendedFeaturesIntegration.test.ts --grep "End-to-End Platform Functionality"; then
    print_success "End-to-end platform tests passed"
else
    print_error "End-to-end platform tests failed"
    exit 1
fi

# Test 7: Performance and Gas Optimization Tests
print_status "7. Running Performance and Gas Optimization Tests..."
if npx hardhat test test/comprehensive/ExtendedFeaturesIntegration.test.ts --grep "Performance and Gas Optimization"; then
    print_success "Performance and gas optimization tests passed"
else
    print_error "Performance and gas optimization tests failed"
    exit 1
fi

# Run complete test suite
print_status "8. Running Complete Extended Features Integration Test Suite..."
if npx hardhat test test/comprehensive/ExtendedFeaturesIntegration.test.ts; then
    print_success "Complete integration test suite passed"
else
    print_error "Complete integration test suite failed"
    exit 1
fi

# Generate test coverage report
print_status "Generating test coverage report..."
if command -v npx hardhat coverage &> /dev/null; then
    npx hardhat coverage --testfiles "test/comprehensive/ExtendedFeaturesIntegration.test.ts" || print_warning "Coverage report generation failed"
else
    print_warning "Coverage tool not available, skipping coverage report"
fi

# Run gas usage analysis
print_status "Analyzing gas usage..."
if npx hardhat test test/comprehensive/ExtendedFeaturesIntegration.test.ts --reporter gas; then
    print_success "Gas usage analysis completed"
else
    print_warning "Gas usage analysis failed"
fi

# Summary
echo ""
echo "=================================================="
print_success "🎉 Extended Features Integration Tests Completed Successfully!"
echo ""
print_status "Test Summary:"
echo "  ✅ Core Platform Integration"
echo "  ✅ Cross-Contract Communication"
echo "  ✅ Reward Mechanisms Integration"
echo "  ✅ Social Features Integration"
echo "  ✅ NFT Marketplace Integration"
echo "  ✅ End-to-End Platform Functionality"
echo "  ✅ Performance and Gas Optimization"
echo ""
print_status "Next Steps:"
echo "  1. Review test results and gas usage"
echo "  2. Run integration configuration script"
echo "  3. Deploy to testnet for final validation"
echo "  4. Prepare for mainnet deployment"
echo ""
print_success "All extended features are properly integrated and tested!"
echo "=================================================="