#!/bin/bash

# Run Connectivity Tests Script
# Executes comprehensive connectivity tests for CORS fixes

set -e

echo "🔧 Running Connectivity Tests for CORS Fixes..."
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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the frontend directory."
    exit 1
fi

# Check if Jest is available
if ! command -v npx &> /dev/null; then
    print_error "npx not found. Please install Node.js and npm."
    exit 1
fi

print_status "Checking test dependencies..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Create coverage directory
mkdir -p coverage/connectivity

print_status "Running connectivity integration tests..."

# Run the connectivity tests with coverage
npx jest --config=jest.connectivity.config.js --coverage --verbose --detectOpenHandles

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    print_success "All connectivity tests passed!"
    
    # Display coverage summary
    if [ -f "coverage/connectivity/lcov-report/index.html" ]; then
        print_status "Coverage report generated at: coverage/connectivity/lcov-report/index.html"
    fi
    
    echo ""
    echo "📊 Test Summary:"
    echo "================"
    echo "✅ Request Manager Rate Limiting Tests"
    echo "✅ Circuit Breaker Functionality Tests"
    echo "✅ Offline Support and Action Queue Tests"
    echo "✅ End-to-End Connectivity Tests"
    echo ""
    
    print_success "Connectivity tests completed successfully!"
    
else
    print_error "Some connectivity tests failed!"
    echo ""
    echo "❌ Test failures detected. Please check the output above for details."
    echo ""
    echo "Common issues to check:"
    echo "- Mock implementations are correct"
    echo "- Async operations are properly awaited"
    echo "- Circuit breaker states are reset between tests"
    echo "- Action queue is cleared between tests"
    echo ""
    exit $TEST_EXIT_CODE
fi

# Optional: Run specific test categories
if [ "$1" = "--category" ] && [ -n "$2" ]; then
    case $2 in
        "circuit-breaker")
            print_status "Running only circuit breaker tests..."
            npx jest --config=jest.connectivity.config.js --testNamePattern="Circuit Breaker" --verbose
            ;;
        "action-queue")
            print_status "Running only action queue tests..."
            npx jest --config=jest.connectivity.config.js --testNamePattern="Action Queue|Offline Support" --verbose
            ;;
        "request-manager")
            print_status "Running only request manager tests..."
            npx jest --config=jest.connectivity.config.js --testNamePattern="Request Manager|Rate Limiting" --verbose
            ;;
        "e2e")
            print_status "Running only end-to-end tests..."
            npx jest --config=jest.connectivity.config.js --testNamePattern="End-to-End" --verbose
            ;;
        *)
            print_warning "Unknown category: $2"
            print_status "Available categories: circuit-breaker, action-queue, request-manager, e2e"
            ;;
    esac
fi

echo ""
print_success "Connectivity test execution completed!"