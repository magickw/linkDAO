#!/bin/bash

# Seller End-to-End Integration Test Runner
# This script runs comprehensive integration tests for the seller system

set -e

echo "🚀 Starting Seller End-to-End Integration Tests"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TIMEOUT=1800 # 30 minutes
PARALLEL_WORKERS=4
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
    
    # Check if backend is running
    if ! curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
        print_warning "Backend service not running, starting..."
        npm run dev:backend &
        BACKEND_PID=$!
        
        # Wait for backend to start
        for i in {1..30}; do
            if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
                print_success "Backend service started"
                break
            fi
            sleep 2
        done
        
        if [ $i -eq 30 ]; then
            print_error "Backend service failed to start"
            exit 1
        fi
    else
        print_success "Backend service is running"
    fi
    
    # Check if database is accessible
    if ! npm run test:db:ping >/dev/null 2>&1; then
        print_warning "Database not accessible, setting up test database..."
        npm run test:db:setup
        print_success "Test database ready"
    else
        print_success "Database is accessible"
    fi
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Create test reports directory
    mkdir -p test-reports
    
    # Set test environment variables
    export NODE_ENV=test
    export TEST_TIMEOUT=$TEST_TIMEOUT
    export JEST_WORKERS=$PARALLEL_WORKERS
    
    # Clear any existing test data
    npm run test:db:reset
    
    # Seed test data
    npm run test:db:seed
    
    print_success "Test environment ready"
}

# Function to run specific test suite
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    local timeout=${3:-300000}
    
    print_status "Running $suite_name tests..."
    
    local start_time=$(date +%s)
    
    if npm run test:seller-integration -- \
        --testNamePattern="$test_pattern" \
        --timeout=$timeout \
        --maxWorkers=$PARALLEL_WORKERS \
        --coverage \
        --coverageReporters=json,lcov,text \
        --coverageDirectory="coverage/seller-e2e/$suite_name" \
        --testResultsProcessor="./src/__tests__/integration/seller/setup/testResultsProcessor.js"; then
        
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

# Function to run backend integration tests
run_backend_tests() {
    print_status "Running backend integration tests..."
    
    cd ../backend
    
    if npm run test:integration -- \
        --testPathPattern="sellerProductionIntegrationTests" \
        --timeout=900000 \
        --maxWorkers=2 \
        --coverage \
        --coverageDirectory="../frontend/coverage/seller-e2e/backend"; then
        
        print_success "Backend integration tests completed"
        cd ../frontend
        return 0
    else
        print_error "Backend integration tests failed"
        cd ../frontend
        return 1
    fi
}

# Function to generate comprehensive report
generate_report() {
    print_status "Generating comprehensive test report..."
    
    # Run the test runner to generate report
    if node -r ts-node/register src/__tests__/integration/seller/SellerEndToEndTestRunner.ts; then
        print_success "Test report generated"
        
        # Open report in browser if available
        if command -v open >/dev/null 2>&1; then
            open test-reports/seller-e2e-report-*.html
        elif command -v xdg-open >/dev/null 2>&1; then
            xdg-open test-reports/seller-e2e-report-*.html
        fi
    else
        print_error "Failed to generate test report"
        return 1
    fi
}

# Function to validate test results
validate_results() {
    print_status "Validating test results..."
    
    local failed_suites=0
    local total_coverage=0
    local coverage_files=0
    
    # Check coverage from all test suites
    for coverage_file in coverage/seller-e2e/*/coverage-summary.json; do
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
    
    # Check for failed tests
    if [ -f "test-reports/seller-e2e-report-*.json" ]; then
        local latest_report=$(ls -t test-reports/seller-e2e-report-*.json | head -n1)
        local total_failed=$(jq -r '.totalFailed' "$latest_report")
        
        if [ "$total_failed" -gt 0 ]; then
            print_error "$total_failed tests failed"
            return 1
        else
            print_success "All tests passed"
            return 0
        fi
    else
        print_error "No test report found"
        return 1
    fi
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Stop background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    # Clean up test data
    npm run test:db:cleanup || true
    
    print_success "Cleanup completed"
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    local exit_code=0
    
    # Check prerequisites
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js is required but not installed"
        exit 1
    fi
    
    if ! command -v npm >/dev/null 2>&1; then
        print_error "npm is required but not installed"
        exit 1
    fi
    
    # Setup
    check_services
    setup_test_environment
    
    # Run test suites
    print_status "Running frontend integration test suites..."
    
    # API Endpoint Consistency Tests
    run_test_suite "API Endpoint Consistency" "API Endpoint Consistency" 300000 || exit_code=1
    
    # Data Synchronization Tests
    run_test_suite "Data Synchronization" "Data Synchronization" 300000 || exit_code=1
    
    # Cache Invalidation Tests
    run_test_suite "Cache Invalidation" "Cache Invalidation" 180000 || exit_code=1
    
    # Error Handling Tests
    run_test_suite "Error Handling" "Error Handling" 240000 || exit_code=1
    
    # Mobile Optimization Tests
    run_test_suite "Mobile Optimization" "Mobile Optimization" 300000 || exit_code=1
    
    # Performance Benchmarking Tests
    run_test_suite "Performance Benchmarking" "Performance Benchmarking" 600000 || exit_code=1
    
    # Complete Workflow Tests
    run_test_suite "Complete Workflows" "Complete Seller Workflow" 900000 || exit_code=1
    
    # Real-time Features Tests
    run_test_suite "Real-time Features" "Real-time Features Under Load" 600000 || exit_code=1
    
    # Cross-Device Compatibility Tests
    run_test_suite "Cross-Device Compatibility" "Cross-Device Compatibility" 300000 || exit_code=1
    
    # Run backend tests
    run_backend_tests || exit_code=1
    
    # Generate comprehensive report
    generate_report || exit_code=1
    
    # Validate results
    validate_results || exit_code=1
    
    if [ $exit_code -eq 0 ]; then
        print_success "🎉 All seller end-to-end integration tests passed!"
        echo ""
        echo "📊 Test reports available in: test-reports/"
        echo "📈 Coverage reports available in: coverage/seller-e2e/"
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
            echo "  --workers NUMBER           Set parallel workers (default: 4)"
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