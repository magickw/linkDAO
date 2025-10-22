#!/bin/bash

# LDAO Token Acquisition System - Comprehensive Test Runner
# This script runs all integration tests for the LDAO acquisition system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-test}
PARALLEL_TESTS=${PARALLEL_TESTS:-false}
GENERATE_REPORTS=${GENERATE_REPORTS:-true}
CLEANUP_AFTER=${CLEANUP_AFTER:-true}

echo -e "${BLUE}🚀 Starting LDAO Token Acquisition System Comprehensive Tests${NC}"
echo "=================================================="
echo "Environment: $TEST_ENV"
echo "Parallel execution: $PARALLEL_TESTS"
echo "Generate reports: $GENERATE_REPORTS"
echo "=================================================="

# Create test artifacts directory
mkdir -p test-artifacts/ldao-acquisition
mkdir -p test-reports/ldao-acquisition
mkdir -p coverage/ldao-acquisition

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local test_file=$2
    local timeout=${3:-600} # Default 10 minutes
    
    echo -e "${YELLOW}📋 Running $suite_name...${NC}"
    
    start_time=$(date +%s)
    
    if timeout ${timeout}s npm test -- --testPathPattern="$test_file" \
        --testTimeout=300000 \
        --maxWorkers=4 \
        --coverage \
        --coverageDirectory="coverage/ldao-acquisition/$suite_name" \
        --json \
        --outputFile="test-reports/ldao-acquisition/${suite_name}-results.json"; then
        
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        echo -e "${GREEN}✅ $suite_name completed successfully in ${duration}s${NC}"
        return 0
    else
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        echo -e "${RED}❌ $suite_name failed after ${duration}s${NC}"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if required services are running
    if ! docker ps | grep -q postgres; then
        echo -e "${RED}❌ PostgreSQL is not running${NC}"
        exit 1
    fi
    
    if ! docker ps | grep -q redis; then
        echo -e "${RED}❌ Redis is not running${NC}"
        exit 1
    fi
    
    # Check if Hardhat network is available
    if ! curl -s http://localhost:8545 > /dev/null; then
        echo -e "${YELLOW}⚠️  Starting Hardhat network...${NC}"
        npx hardhat node --port 8545 &
        HARDHAT_PID=$!
        sleep 10
    fi
    
    # Check environment variables
    if [[ -z "$TEST_DB_URL" ]]; then
        echo -e "${RED}❌ TEST_DB_URL environment variable not set${NC}"
        exit 1
    fi
    
    if [[ -z "$TEST_REDIS_URL" ]]; then
        echo -e "${RED}❌ TEST_REDIS_URL environment variable not set${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to setup test environment
setup_test_environment() {
    echo -e "${BLUE}🛠️  Setting up test environment...${NC}"
    
    # Reset test database
    npm run db:reset:test
    
    # Deploy test contracts
    cd ../contracts
    npx hardhat compile
    npx hardhat run scripts/deploy-ldao-treasury.ts --network localhost
    cd ../backend
    
    # Seed test data
    npm run seed:test
    
    echo -e "${GREEN}✅ Test environment setup completed${NC}"
}

# Function to generate comprehensive report
generate_comprehensive_report() {
    echo -e "${BLUE}📊 Generating comprehensive test report...${NC}"
    
    # Merge coverage reports
    npx nyc merge coverage/ldao-acquisition coverage/ldao-acquisition/merged-coverage.json
    npx nyc report --reporter=html --reporter=json --reporter=text \
        --temp-dir=coverage/ldao-acquisition \
        --report-dir=test-reports/ldao-acquisition/coverage
    
    # Generate test summary
    node scripts/generate-test-summary.js \
        --input="test-reports/ldao-acquisition" \
        --output="test-reports/ldao-acquisition/summary.html"
    
    # Generate requirements coverage report
    node scripts/validate-requirements-coverage.js \
        --requirements="../.kiro/specs/ldao-token-acquisition/requirements.md" \
        --tests="test-reports/ldao-acquisition" \
        --output="test-reports/ldao-acquisition/requirements-coverage.html"
    
    echo -e "${GREEN}✅ Comprehensive report generated${NC}"
}

# Function to cleanup
cleanup() {
    if [[ "$CLEANUP_AFTER" == "true" ]]; then
        echo -e "${BLUE}🧹 Cleaning up...${NC}"
        
        # Stop Hardhat network if we started it
        if [[ -n "$HARDHAT_PID" ]]; then
            kill $HARDHAT_PID 2>/dev/null || true
        fi
        
        # Clean up test data
        npm run db:reset:test
        
        # Clean up temporary files
        rm -rf temp-test-*
        
        echo -e "${GREEN}✅ Cleanup completed${NC}"
    fi
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    local exit_code=0
    local failed_suites=()
    
    # Check prerequisites
    check_prerequisites
    
    # Setup test environment
    setup_test_environment
    
    echo -e "${BLUE}🧪 Starting test execution...${NC}"
    
    # Define test suites
    declare -A test_suites=(
        ["Integration Tests"]="ldaoAcquisitionIntegrationTests.test.ts"
        ["Performance Tests"]="ldaoAcquisitionPerformance.test.ts"
        ["Disaster Recovery Tests"]="ldaoAcquisitionDisasterRecovery.test.ts"
    )
    
    if [[ "$PARALLEL_TESTS" == "true" ]]; then
        echo -e "${YELLOW}🔄 Running tests in parallel...${NC}"
        
        # Run tests in parallel
        pids=()
        for suite_name in "${!test_suites[@]}"; do
            test_file="${test_suites[$suite_name]}"
            run_test_suite "$suite_name" "$test_file" 900 &
            pids+=($!)
        done
        
        # Wait for all tests to complete
        for pid in "${pids[@]}"; do
            if ! wait $pid; then
                exit_code=1
            fi
        done
        
    else
        echo -e "${YELLOW}🔄 Running tests sequentially...${NC}"
        
        # Run tests sequentially
        for suite_name in "${!test_suites[@]}"; do
            test_file="${test_suites[$suite_name]}"
            if ! run_test_suite "$suite_name" "$test_file" 900; then
                failed_suites+=("$suite_name")
                exit_code=1
            fi
        done
    fi
    
    # Generate reports
    if [[ "$GENERATE_REPORTS" == "true" ]]; then
        generate_comprehensive_report
    fi
    
    # Print summary
    echo ""
    echo "=================================================="
    echo -e "${BLUE}📋 Test Execution Summary${NC}"
    echo "=================================================="
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}✅ All test suites passed successfully!${NC}"
    else
        echo -e "${RED}❌ Some test suites failed:${NC}"
        for suite in "${failed_suites[@]}"; do
            echo -e "${RED}  - $suite${NC}"
        done
    fi
    
    echo ""
    echo "Test reports available at: test-reports/ldao-acquisition/"
    echo "Coverage reports available at: test-reports/ldao-acquisition/coverage/"
    
    if [[ "$GENERATE_REPORTS" == "true" ]]; then
        echo "Comprehensive summary: test-reports/ldao-acquisition/summary.html"
        echo "Requirements coverage: test-reports/ldao-acquisition/requirements-coverage.html"
    fi
    
    echo "=================================================="
    
    return $exit_code
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --parallel)
            PARALLEL_TESTS=true
            shift
            ;;
        --no-reports)
            GENERATE_REPORTS=false
            shift
            ;;
        --no-cleanup)
            CLEANUP_AFTER=false
            shift
            ;;
        --env)
            TEST_ENV="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --parallel      Run tests in parallel"
            echo "  --no-reports    Skip report generation"
            echo "  --no-cleanup    Skip cleanup after tests"
            echo "  --env ENV       Set test environment (default: test)"
            echo "  --help          Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  TEST_DB_URL     Test database connection URL"
            echo "  TEST_REDIS_URL  Test Redis connection URL"
            echo "  PARALLEL_TESTS  Run tests in parallel (true/false)"
            echo "  GENERATE_REPORTS Generate test reports (true/false)"
            echo "  CLEANUP_AFTER   Cleanup after tests (true/false)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Run main function
main
exit $?