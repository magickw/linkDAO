#!/bin/bash

# Backend API Integration Test Runner
# 
# Comprehensive script to run all integration tests with proper setup,
# execution, and reporting for the backend API integration.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
TEST_REPORTS_DIR="$BACKEND_DIR/test-reports/integration"
COVERAGE_DIR="$BACKEND_DIR/coverage/integration"

# Default options
VERBOSE=false
COVERAGE=false
PARALLEL=false
BAIL=false
SUITE=""
WATCH=false
CLEAN=false

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

# Function to show help
show_help() {
    cat << EOF
🧪 Backend API Integration Test Runner

Usage: $0 [OPTIONS]

Options:
    -v, --verbose       Show detailed test output
    -c, --coverage      Generate coverage reports
    -p, --parallel      Run tests in parallel (faster but less isolated)
    -b, --bail          Stop execution on first critical test failure
    -s, --suite SUITE   Run only tests matching the suite name
    -w, --watch         Run tests in watch mode
    --clean             Clean test artifacts before running
    -h, --help          Show this help message

Examples:
    $0                          # Run all integration tests
    $0 --verbose --coverage     # Run with detailed output and coverage
    $0 --suite auth             # Run only authentication tests
    $0 --parallel --bail        # Run in parallel, stop on critical failure
    $0 --clean --coverage       # Clean artifacts and run with coverage

Test Suites:
    - Backend API Integration: Comprehensive API endpoint tests
    - Authentication Flows: Authentication and authorization tests
    - Marketplace API Endpoints: Marketplace-specific endpoint tests
    - Real Data Operations: Tests with real database operations
    - WebSocket Real-time Updates: Real-time communication tests

EOF
}

# Function to parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -c|--coverage)
                COVERAGE=true
                shift
                ;;
            -p|--parallel)
                PARALLEL=true
                shift
                ;;
            -b|--bail)
                BAIL=true
                shift
                ;;
            -s|--suite)
                SUITE="$2"
                shift 2
                ;;
            -w|--watch)
                WATCH=true
                shift
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if we're in the backend directory
    if [[ ! -f "$BACKEND_DIR/package.json" ]]; then
        print_error "Not in backend directory. Please run from app/backend/"
        exit 1
    fi
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 16 ]]; then
        print_error "Node.js version 16 or higher is required"
        exit 1
    fi
    
    # Check if npm dependencies are installed
    if [[ ! -d "$BACKEND_DIR/node_modules" ]]; then
        print_warning "Node modules not found. Installing dependencies..."
        cd "$BACKEND_DIR"
        npm install
    fi
    
    print_success "Prerequisites check passed"
}

# Function to clean test artifacts
clean_artifacts() {
    if [[ "$CLEAN" == true ]]; then
        print_status "Cleaning test artifacts..."
        
        # Remove test reports
        if [[ -d "$TEST_REPORTS_DIR" ]]; then
            rm -rf "$TEST_REPORTS_DIR"
        fi
        
        # Remove coverage reports
        if [[ -d "$COVERAGE_DIR" ]]; then
            rm -rf "$COVERAGE_DIR"
        fi
        
        # Remove Jest cache
        if [[ -d "$BACKEND_DIR/.jest-cache" ]]; then
            rm -rf "$BACKEND_DIR/.jest-cache"
        fi
        
        # Remove test database files
        find "$BACKEND_DIR" -name "test-database.db*" -delete 2>/dev/null || true
        
        print_success "Test artifacts cleaned"
    fi
}

# Function to setup test environment
setup_environment() {
    print_status "Setting up test environment..."
    
    # Create necessary directories
    mkdir -p "$TEST_REPORTS_DIR"
    mkdir -p "$COVERAGE_DIR"
    mkdir -p "$BACKEND_DIR/logs/test"
    
    # Set environment variables
    export NODE_ENV=test
    export JWT_SECRET=test-secret-key-for-integration-tests
    export LOG_LEVEL=error
    export TEST_TIMEOUT=60000
    
    # Set test-specific database URL
    export DATABASE_URL=sqlite::memory:
    
    # Set cache configuration
    export CACHE_TYPE=memory
    export CACHE_TTL=60
    
    print_success "Test environment ready"
}

# Function to build Jest command
build_jest_command() {
    local cmd="npx jest --config jest.integration.config.js"
    
    if [[ "$VERBOSE" == true ]]; then
        cmd="$cmd --verbose"
        export TEST_VERBOSE=true
    else
        cmd="$cmd --silent"
    fi
    
    if [[ "$COVERAGE" == true ]]; then
        cmd="$cmd --coverage"
    fi
    
    if [[ "$PARALLEL" == true ]]; then
        cmd="$cmd --maxWorkers=50%"
    else
        cmd="$cmd --maxWorkers=1"
    fi
    
    if [[ "$BAIL" == true ]]; then
        cmd="$cmd --bail"
    fi
    
    if [[ "$WATCH" == true ]]; then
        cmd="$cmd --watch"
    fi
    
    if [[ -n "$SUITE" ]]; then
        cmd="$cmd --testNamePattern=\"$SUITE\""
    fi
    
    # Add additional Jest options
    cmd="$cmd --detectOpenHandles --forceExit --testTimeout=60000"
    
    echo "$cmd"
}

# Function to run tests
run_tests() {
    print_status "Running integration tests..."
    
    cd "$BACKEND_DIR"
    
    local jest_cmd=$(build_jest_command)
    local start_time=$(date +%s)
    
    print_status "Executing: $jest_cmd"
    
    # Run the tests
    if eval "$jest_cmd"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "Integration tests completed successfully in ${duration}s"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_error "Integration tests failed after ${duration}s"
        return 1
    fi
}

# Function to generate reports
generate_reports() {
    print_status "Generating test reports..."
    
    # Check if HTML report was generated
    if [[ -f "$TEST_REPORTS_DIR/integration-test-report.html" ]]; then
        print_success "HTML test report: $TEST_REPORTS_DIR/integration-test-report.html"
    fi
    
    # Check if JUnit report was generated
    if [[ -f "$TEST_REPORTS_DIR/junit.xml" ]]; then
        print_success "JUnit test report: $TEST_REPORTS_DIR/junit.xml"
    fi
    
    # Check if coverage report was generated
    if [[ "$COVERAGE" == true && -f "$COVERAGE_DIR/index.html" ]]; then
        print_success "Coverage report: $COVERAGE_DIR/index.html"
    fi
    
    # Generate summary
    if [[ -f "$TEST_REPORTS_DIR/junit.xml" ]]; then
        local total_tests=$(grep -o 'tests="[0-9]*"' "$TEST_REPORTS_DIR/junit.xml" | grep -o '[0-9]*' | head -1)
        local failed_tests=$(grep -o 'failures="[0-9]*"' "$TEST_REPORTS_DIR/junit.xml" | grep -o '[0-9]*' | head -1)
        local error_tests=$(grep -o 'errors="[0-9]*"' "$TEST_REPORTS_DIR/junit.xml" | grep -o '[0-9]*' | head -1)
        
        if [[ -n "$total_tests" ]]; then
            local passed_tests=$((total_tests - failed_tests - error_tests))
            print_status "Test Summary: $passed_tests/$total_tests passed, $failed_tests failed, $error_tests errors"
        fi
    fi
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Kill any remaining processes
    pkill -f "jest.*integration" 2>/dev/null || true
    
    # Remove temporary files
    rm -f "$BACKEND_DIR/test-database.db"* 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    # Set up trap for cleanup on exit
    trap cleanup EXIT
    
    # Parse command line arguments
    parse_args "$@"
    
    # Show banner
    echo "🧪 Backend API Integration Test Runner"
    echo "═══════════════════════════════════════"
    
    # Check prerequisites
    check_prerequisites
    
    # Clean artifacts if requested
    clean_artifacts
    
    # Setup test environment
    setup_environment
    
    # Run tests
    if run_tests; then
        # Generate reports
        generate_reports
        
        print_success "🎉 All integration tests completed successfully!"
        exit 0
    else
        print_error "💥 Integration tests failed!"
        
        # Still generate reports for failed tests
        generate_reports
        
        exit 1
    fi
}

# Run main function with all arguments
main "$@"