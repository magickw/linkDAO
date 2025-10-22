#!/bin/bash

# Bridge Testing Suite Runner
# This script runs all bridge-related tests including unit, integration, and e2e tests

set -e

echo "🌉 Starting LDAO Bridge Testing Suite..."
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

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Set test environment variables
export NODE_ENV=test
export DATABASE_URL="postgresql://test:test@localhost:5432/bridge_test"
export ETHEREUM_RPC_URL="http://localhost:8545"
export POLYGON_RPC_URL="http://localhost:8546"
export ARBITRUM_RPC_URL="http://localhost:8547"

# Create test database if it doesn't exist
print_status "Setting up test database..."
if command -v createdb &> /dev/null; then
    createdb bridge_test 2>/dev/null || true
else
    print_warning "createdb not found. Make sure PostgreSQL is installed and test database exists."
fi

# Run database migrations for tests
print_status "Running database migrations..."
npm run db:migrate:test 2>/dev/null || print_warning "Database migration failed or not configured"

# Test categories
UNIT_TESTS=(
    "src/tests/bridgeMonitoringService.test.ts"
    "src/tests/bridgeNotificationService.test.ts"
)

INTEGRATION_TESTS=(
    "src/tests/bridgeMonitoringController.integration.test.ts"
)

E2E_TESTS=(
    "src/tests/bridgeWorkflow.e2e.test.ts"
)

# Function to run tests with proper error handling
run_test_suite() {
    local test_type=$1
    local test_files=("${@:2}")
    
    print_status "Running $test_type tests..."
    
    for test_file in "${test_files[@]}"; do
        if [ -f "$test_file" ]; then
            print_status "Running: $test_file"
            if npx jest "$test_file" --verbose --detectOpenHandles --forceExit; then
                print_success "✓ $test_file passed"
            else
                print_error "✗ $test_file failed"
                return 1
            fi
        else
            print_warning "Test file not found: $test_file"
        fi
    done
    
    return 0
}

# Function to run contract tests
run_contract_tests() {
    print_status "Running smart contract tests..."
    
    # Check if we're in a hardhat project
    if [ -f "../contracts/hardhat.config.ts" ]; then
        cd ../contracts
        
        print_status "Compiling contracts..."
        if npx hardhat compile; then
            print_success "✓ Contracts compiled successfully"
        else
            print_error "✗ Contract compilation failed"
            cd ../backend
            return 1
        fi
        
        print_status "Running contract tests..."
        if npx hardhat test test/LDAOBridge.test.ts; then
            print_success "✓ Contract tests passed"
        else
            print_error "✗ Contract tests failed"
            cd ../backend
            return 1
        fi
        
        cd ../backend
    else
        print_warning "Contract tests skipped - hardhat project not found"
    fi
    
    return 0
}

# Function to generate test coverage report
generate_coverage() {
    print_status "Generating test coverage report..."
    
    if npx jest --coverage --coverageDirectory=coverage/bridge \
        --collectCoverageFrom="src/services/bridge*.ts" \
        --collectCoverageFrom="src/controllers/bridge*.ts" \
        --collectCoverageFrom="src/routes/bridge*.ts" \
        "${UNIT_TESTS[@]}" "${INTEGRATION_TESTS[@]}"; then
        print_success "✓ Coverage report generated in coverage/bridge/"
    else
        print_warning "Coverage report generation failed"
    fi
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Set performance test environment
    export JEST_TIMEOUT=30000
    
    if npx jest src/tests/bridgeWorkflow.e2e.test.ts --testNamePattern="Performance and Scalability" --verbose; then
        print_success "✓ Performance tests passed"
    else
        print_warning "Performance tests failed or skipped"
    fi
}

# Function to validate test environment
validate_environment() {
    print_status "Validating test environment..."
    
    # Check required tools
    local required_tools=("node" "npm" "npx")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            print_error "$tool is required but not installed"
            return 1
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js 18 or higher is required (current: $(node --version))"
        return 1
    fi
    
    print_success "✓ Environment validation passed"
    return 0
}

# Function to cleanup test artifacts
cleanup() {
    print_status "Cleaning up test artifacts..."
    
    # Remove test database
    dropdb bridge_test 2>/dev/null || true
    
    # Clean up any test files
    rm -rf coverage/bridge 2>/dev/null || true
    rm -rf test-results 2>/dev/null || true
    
    print_success "✓ Cleanup completed"
}

# Main execution
main() {
    local exit_code=0
    local start_time=$(date +%s)
    
    # Parse command line arguments
    local run_coverage=false
    local run_performance=false
    local run_contracts=false
    local cleanup_after=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --coverage)
                run_coverage=true
                shift
                ;;
            --performance)
                run_performance=true
                shift
                ;;
            --contracts)
                run_contracts=true
                shift
                ;;
            --cleanup)
                cleanup_after=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --coverage     Generate test coverage report"
                echo "  --performance  Run performance tests"
                echo "  --contracts    Run smart contract tests"
                echo "  --cleanup      Clean up test artifacts after completion"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Validate environment
    if ! validate_environment; then
        exit 1
    fi
    
    # Run test suites
    print_status "Starting bridge test execution..."
    
    # Unit tests
    if ! run_test_suite "Unit" "${UNIT_TESTS[@]}"; then
        print_error "Unit tests failed"
        exit_code=1
    fi
    
    # Integration tests
    if ! run_test_suite "Integration" "${INTEGRATION_TESTS[@]}"; then
        print_error "Integration tests failed"
        exit_code=1
    fi
    
    # E2E tests
    if ! run_test_suite "End-to-End" "${E2E_TESTS[@]}"; then
        print_error "E2E tests failed"
        exit_code=1
    fi
    
    # Contract tests (if requested)
    if [ "$run_contracts" = true ]; then
        if ! run_contract_tests; then
            print_error "Contract tests failed"
            exit_code=1
        fi
    fi
    
    # Performance tests (if requested)
    if [ "$run_performance" = true ]; then
        run_performance_tests
    fi
    
    # Coverage report (if requested)
    if [ "$run_coverage" = true ]; then
        generate_coverage
    fi
    
    # Calculate execution time
    local end_time=$(date +%s)
    local execution_time=$((end_time - start_time))
    
    # Print summary
    echo ""
    echo "========================================"
    if [ $exit_code -eq 0 ]; then
        print_success "🎉 All bridge tests completed successfully!"
        print_success "Execution time: ${execution_time}s"
    else
        print_error "❌ Some tests failed"
        print_error "Execution time: ${execution_time}s"
    fi
    echo "========================================"
    
    # Cleanup if requested
    if [ "$cleanup_after" = true ]; then
        cleanup
    fi
    
    exit $exit_code
}

# Handle script interruption
trap 'print_error "Test execution interrupted"; cleanup; exit 1' INT TERM

# Run main function with all arguments
main "$@"