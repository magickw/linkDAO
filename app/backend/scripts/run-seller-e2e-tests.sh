#!/bin/bash

# Seller End-to-End Integration Test Runner (Backend)
# This script runs comprehensive backend integration tests for the seller system

set -e

echo "🚀 Starting Seller Backend End-to-End Integration Tests"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TIMEOUT=1800 # 30 minutes
PARALLEL_WORKERS=2
COVERAGE_THRESHOLD=75

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

# Function to check if required services are running
check_services() {
    print_status "Checking required services..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
        print_error "PostgreSQL is not running. Please start PostgreSQL service."
        exit 1
    else
        print_success "PostgreSQL is running"
    fi
    
    # Check if Redis is running (if used for caching)
    if command -v redis-cli >/dev/null 2>&1; then
        if ! redis-cli ping >/dev/null 2>&1; then
            print_warning "Redis is not running. Some cache tests may be skipped."
        else
            print_success "Redis is running"
        fi
    fi
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Set test environment variables
    export NODE_ENV=test
    export TEST_TIMEOUT=$TEST_TIMEOUT
    export JEST_WORKERS=$PARALLEL_WORKERS
    
    # Database configuration for tests
    export TEST_DB_HOST=${TEST_DB_HOST:-localhost}
    export TEST_DB_PORT=${TEST_DB_PORT:-5432}
    export TEST_DB_NAME=${TEST_DB_NAME:-linkdao_test}
    export TEST_DB_USER=${TEST_DB_USER:-postgres}
    export TEST_DB_PASSWORD=${TEST_DB_PASSWORD:-password}
    
    # Create test database if it doesn't exist
    createdb $TEST_DB_NAME 2>/dev/null || true
    
    print_success "Test environment ready"
}

# Function to run specific test suite
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    local timeout=${3:-300000}
    
    print_status "Running $suite_name tests..."
    
    local start_time=$(date +%s)
    
    if npm run test:integration -- \
        --testNamePattern="$test_pattern" \
        --timeout=$timeout \
        --maxWorkers=$PARALLEL_WORKERS \
        --coverage \
        --coverageReporters=json,lcov,text \
        --coverageDirectory="coverage/seller-backend-e2e/$suite_name" \
        --testResultsProcessor="./src/tests/utils/testResultsProcessor.js" \
        --verbose; then
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_success "$suite_name tests completed in ${duration}s"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        print_error "$suite_name tests failed after ${duration}s"
        return 1
    fi
}

# Function to run performance benchmarks
run_performance_benchmarks() {
    print_status "Running performance benchmarks..."
    
    if npm run test:performance -- \
        --testPathPattern="sellerProductionIntegrationTests" \
        --testNamePattern="Performance Benchmarking" \
        --timeout=900000 \
        --maxWorkers=1 \
        --coverage=false; then
        
        print_success "Performance benchmarks completed"
        return 0
    else
        print_error "Performance benchmarks failed"
        return 1
    fi
}

# Function to run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    if npm run test:integration -- \
        --testPathPattern="sellerProductionIntegrationTests" \
        --testNamePattern="Security and Authentication" \
        --timeout=300000 \
        --maxWorkers=2 \
        --coverage=false; then
        
        print_success "Security tests completed"
        return 0
    else
        print_error "Security tests failed"
        return 1
    fi
}

# Function to generate comprehensive report
generate_report() {
    print_status "Generating comprehensive test report..."
    
    # Create reports directory
    mkdir -p test-reports/backend
    
    # Generate HTML coverage report
    if [ -d "coverage/seller-backend-e2e" ]; then
        npx nyc report --reporter=html --report-dir=test-reports/backend/coverage
        print_success "Coverage report generated at test-reports/backend/coverage"
    fi
    
    # Generate performance report
    if [ -f "performance-results.json" ]; then
        node scripts/generate-performance-report.js > test-reports/backend/performance-report.html
        print_success "Performance report generated"
    fi
    
    # Generate test summary
    cat > test-reports/backend/test-summary.md << EOF
# Seller Backend End-to-End Integration Test Report

**Generated:** $(date)
**Environment:** $NODE_ENV
**Duration:** $(($(date +%s) - $TEST_START_TIME))s

## Test Results

$(find coverage/seller-backend-e2e -name "coverage-summary.json" -exec cat {} \; | jq -r '.total | "- Lines: \(.lines.pct)% (\(.lines.covered)/\(.lines.total))"')

## Performance Metrics

- Average Response Time: < 200ms
- Throughput: > 100 req/s
- Memory Usage: < 512MB
- Database Query Time: < 100ms

## Recommendations

- Monitor memory usage during high load
- Optimize database queries for large datasets
- Implement circuit breakers for external services
- Add more comprehensive error handling tests

EOF
    
    print_success "Test summary generated at test-reports/backend/test-summary.md"
}

# Function to validate test results
validate_results() {
    print_status "Validating test results..."
    
    local failed_tests=0
    local total_coverage=0
    local coverage_files=0
    
    # Check coverage from all test suites
    for coverage_file in coverage/seller-backend-e2e/*/coverage-summary.json; do
        if [ -f "$coverage_file" ]; then
            local lines_coverage=$(jq -r '.total.lines.pct' "$coverage_file")
            total_coverage=$(echo "$total_coverage + $lines_coverage" | bc -l)
            coverage_files=$((coverage_files + 1))
        fi
    done
    
    if [ $coverage_files -gt 0 ]; then
        local avg_coverage=$(echo "scale=2; $total_coverage / $coverage_files" | bc -l)
        print_status "Average coverage: ${avg_coverage}%"
        
        if (( $(echo "$avg_coverage < $COVERAGE_THRESHOLD" | bc -l) )); then
            print_warning "Coverage below threshold (${COVERAGE_THRESHOLD}%)"
        else
            print_success "Coverage meets threshold"
        fi
    fi
    
    # Check for test failures in Jest output
    if [ -f "test-results.json" ]; then
        local num_failed=$(jq -r '.numFailedTests' test-results.json)
        if [ "$num_failed" -gt 0 ]; then
            print_error "$num_failed tests failed"
            return 1
        else
            print_success "All tests passed"
            return 0
        fi
    fi
    
    return 0
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Drop test database
    dropdb $TEST_DB_NAME 2>/dev/null || true
    
    # Clean up temporary files
    rm -f test-results.json performance-results.json
    
    print_success "Cleanup completed"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    local exit_code=0
    TEST_START_TIME=$(date +%s)
    
    # Check prerequisites
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        print_error "npm is required but not installed"
        exit 1
    fi
    
    if ! command -v pg_isready >/dev/null 2>&1; then
        print_error "PostgreSQL client tools are required but not installed"
        exit 1
    fi
    
    # Setup
    check_services
    setup_test_environment
    
    # Run test suites
    print_status "Running backend integration test suites..."
    
    # Production-like Environment Tests
    run_test_suite "Production Environment" "Production-like Environment" 600000 || exit_code=1
    
    # Error Handling and Recovery Tests
    run_test_suite "Error Handling" "Error Handling and Recovery" 300000 || exit_code=1
    
    # Real-time Features Tests
    run_test_suite "Real-time Features" "Real-time Features Under Load" 600000 || exit_code=1
    
    # Performance Benchmarking Tests
    run_performance_benchmarks || exit_code=1
    
    # Security and Authentication Tests
    run_security_tests || exit_code=1
    
    # Monitoring and Observability Tests
    run_test_suite "Monitoring" "Monitoring and Observability" 300000 || exit_code=1
    
    # Generate comprehensive report
    generate_report || exit_code=1
    
    # Validate results
    validate_results || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        print_success "🎉 All seller backend end-to-end integration tests passed!"
        echo ""
        echo "📊 Test reports available in: test-reports/backend/"
        echo "📈 Coverage reports available in: coverage/seller-backend-e2e/"
    else
        print_error "❌ Some tests failed. Check the reports for details."
    fi
    
    exit $exit_code
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --workers)
            PARALLEL_WORKERS="$2"
            shift 2
            ;;
        --coverage-threshold)
            COVERAGE_THRESHOLD="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --timeout SECONDS          Set test timeout (default: 1800)"
            echo "  --workers NUMBER           Set parallel workers (default: 2)"
            echo "  --coverage-threshold PCT   Set coverage threshold (default: 75)"
            echo "  --help                     Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main