#!/bin/bash

# Performance Testing Script
# Runs comprehensive performance tests for the interconnected social platform

set -e

echo "🚀 Starting Performance Test Suite"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-test}
PERFORMANCE_BUDGET=${PERFORMANCE_BUDGET:-strict}
GENERATE_REPORT=${GENERATE_REPORT:-true}
PARALLEL_TESTS=${PARALLEL_TESTS:-false}

echo -e "${BLUE}Configuration:${NC}"
echo "  Environment: $TEST_ENV"
echo "  Performance Budget: $PERFORMANCE_BUDGET"
echo "  Generate Report: $GENERATE_REPORT"
echo "  Parallel Tests: $PARALLEL_TESTS"
echo ""

# Set environment variables
export NODE_ENV=$TEST_ENV
export LOG_LEVEL=error
export PERFORMANCE_TESTING=true

# Performance budgets
if [ "$PERFORMANCE_BUDGET" = "strict" ]; then
    export MAX_RESPONSE_TIME=100
    export MAX_CACHE_TIME=5
    export MAX_MEMORY_GROWTH=50
    export MAX_ERROR_RATE=0.01
elif [ "$PERFORMANCE_BUDGET" = "moderate" ]; then
    export MAX_RESPONSE_TIME=200
    export MAX_CACHE_TIME=10
    export MAX_MEMORY_GROWTH=100
    export MAX_ERROR_RATE=0.05
else
    export MAX_RESPONSE_TIME=500
    export MAX_CACHE_TIME=20
    export MAX_MEMORY_GROWTH=200
    export MAX_ERROR_RATE=0.1
fi

# Create results directory
RESULTS_DIR="./performance-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo -e "${YELLOW}Performance Budgets:${NC}"
echo "  Max Response Time: ${MAX_RESPONSE_TIME}ms"
echo "  Max Cache Time: ${MAX_CACHE_TIME}ms"
echo "  Max Memory Growth: ${MAX_MEMORY_GROWTH}MB"
echo "  Max Error Rate: ${MAX_ERROR_RATE}"
echo ""

# Function to run test suite with timing
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    local config_file=$3
    
    echo -e "${BLUE}Running $suite_name...${NC}"
    
    local start_time=$(date +%s)
    local exit_code=0
    
    if [ "$PARALLEL_TESTS" = "true" ]; then
        npm test -- --testPathPattern="$test_pattern" --config="$config_file" --maxWorkers=4 --verbose --json --outputFile="$RESULTS_DIR/${suite_name,,}.json" || exit_code=$?
    else
        npm test -- --testPathPattern="$test_pattern" --config="$config_file" --runInBand --verbose --json --outputFile="$RESULTS_DIR/${suite_name,,}.json" || exit_code=$?
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ $suite_name completed successfully in ${duration}s${NC}"
    else
        echo -e "${RED}✗ $suite_name failed after ${duration}s${NC}"
    fi
    
    return $exit_code
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check if Redis is running
    if ! redis-cli ping > /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Redis not running. Starting Redis...${NC}"
        redis-server --daemonize yes --port 6379 || {
            echo -e "${RED}Failed to start Redis${NC}"
            exit 1
        }
    fi
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo -e "${YELLOW}Warning: PostgreSQL not running${NC}"
        echo "Please start PostgreSQL before running performance tests"
        exit 1
    fi
    
    # Check available memory
    local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$available_memory" -lt 2048 ]; then
        echo -e "${YELLOW}Warning: Low available memory (${available_memory}MB). Performance tests may be affected.${NC}"
    fi
    
    echo -e "${GREEN}✓ Prerequisites check completed${NC}"
    echo ""
}

# Function to setup test environment
setup_test_environment() {
    echo -e "${BLUE}Setting up test environment...${NC}"
    
    # Create test database if it doesn't exist
    createdb test_marketplace 2>/dev/null || true
    
    # Run database migrations for test environment
    npm run db:migrate:test || {
        echo -e "${RED}Failed to run database migrations${NC}"
        exit 1
    }
    
    # Clear Redis test databases
    redis-cli -n 15 FLUSHDB > /dev/null 2>&1 || true
    redis-cli -n 14 FLUSHDB > /dev/null 2>&1 || true
    redis-cli -n 13 FLUSHDB > /dev/null 2>&1 || true
    
    echo -e "${GREEN}✓ Test environment setup completed${NC}"
    echo ""
}

# Function to generate performance report
generate_performance_report() {
    if [ "$GENERATE_REPORT" != "true" ]; then
        return 0
    fi
    
    echo -e "${BLUE}Generating performance report...${NC}"
    
    local report_file="$RESULTS_DIR/performance-report.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { border-left: 5px solid #4CAF50; }
        .failed { border-left: 5px solid #f44336; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0; }
        .metric { background: #f9f9f9; padding: 10px; border-radius: 3px; }
        .metric-value { font-size: 1.2em; font-weight: bold; color: #333; }
        .budget-pass { color: #4CAF50; }
        .budget-fail { color: #f44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Environment: $TEST_ENV</p>
        <p>Performance Budget: $PERFORMANCE_BUDGET</p>
    </div>
EOF

    # Process each test suite result
    for result_file in "$RESULTS_DIR"/*.json; do
        if [ -f "$result_file" ]; then
            local suite_name=$(basename "$result_file" .json)
            echo "    <div class=\"suite\">" >> "$report_file"
            echo "        <h2>$suite_name</h2>" >> "$report_file"
            
            # Extract test results (simplified - would need proper JSON parsing in real implementation)
            local num_tests=$(grep -o '"numTotalTests":[0-9]*' "$result_file" | cut -d: -f2 || echo "0")
            local num_passed=$(grep -o '"numPassedTests":[0-9]*' "$result_file" | cut -d: -f2 || echo "0")
            local num_failed=$(grep -o '"numFailedTests":[0-9]*' "$result_file" | cut -d: -f2 || echo "0")
            
            if [ "$num_failed" -eq 0 ]; then
                echo "        <div class=\"passed\">" >> "$report_file"
            else
                echo "        <div class=\"failed\">" >> "$report_file"
            fi
            
            echo "            <div class=\"metrics\">" >> "$report_file"
            echo "                <div class=\"metric\">" >> "$report_file"
            echo "                    <div>Total Tests</div>" >> "$report_file"
            echo "                    <div class=\"metric-value\">$num_tests</div>" >> "$report_file"
            echo "                </div>" >> "$report_file"
            echo "                <div class=\"metric\">" >> "$report_file"
            echo "                    <div>Passed</div>" >> "$report_file"
            echo "                    <div class=\"metric-value budget-pass\">$num_passed</div>" >> "$report_file"
            echo "                </div>" >> "$report_file"
            echo "                <div class=\"metric\">" >> "$report_file"
            echo "                    <div>Failed</div>" >> "$report_file"
            echo "                    <div class=\"metric-value budget-fail\">$num_failed</div>" >> "$report_file"
            echo "                </div>" >> "$report_file"
            echo "            </div>" >> "$report_file"
            echo "        </div>" >> "$report_file"
            echo "    </div>" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF
</body>
</html>
EOF

    echo -e "${GREEN}✓ Performance report generated: $report_file${NC}"
}

# Function to cleanup
cleanup() {
    echo -e "${BLUE}Cleaning up...${NC}"
    
    # Stop any background processes
    pkill -f "redis-server" 2>/dev/null || true
    
    # Clear test data
    redis-cli -n 15 FLUSHDB > /dev/null 2>&1 || true
    
    echo -e "${GREEN}✓ Cleanup completed${NC}"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    local overall_exit_code=0
    
    check_prerequisites
    setup_test_environment
    
    echo -e "${YELLOW}Starting Performance Test Execution${NC}"
    echo "====================================="
    
    # Backend Performance Tests
    echo -e "\n${BLUE}Backend Performance Tests${NC}"
    echo "------------------------"
    
    run_test_suite "Caching Strategies" "cachingStrategiesPerformance" "jest.config.js" || overall_exit_code=1
    run_test_suite "Response Time" "responseTimePerformance" "jest.config.js" || overall_exit_code=1
    run_test_suite "Load Testing" "loadTestingPerformance" "jest.config.js" || overall_exit_code=1
    run_test_suite "Memory & Resources" "memoryResourcePerformance" "jest.config.js" || overall_exit_code=1
    
    # Frontend Performance Tests
    echo -e "\n${BLUE}Frontend Performance Tests${NC}"
    echo "-------------------------"
    
    cd ../frontend
    
    run_test_suite "Frontend Caching" "cachingPerformance" "jest.config.js" || overall_exit_code=1
    run_test_suite "Component Performance" "componentPerformance" "jest.config.js" || overall_exit_code=1
    run_test_suite "Feed Performance" "Feed/FeedPerformance" "jest.feed.config.js" || overall_exit_code=1
    
    cd ../backend
    
    # Generate report
    generate_performance_report
    
    # Summary
    echo ""
    echo "====================================="
    if [ $overall_exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All performance tests passed!${NC}"
        echo -e "${GREEN}Performance budgets met for $PERFORMANCE_BUDGET configuration${NC}"
    else
        echo -e "${RED}❌ Some performance tests failed${NC}"
        echo -e "${RED}Check individual test results for details${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Results saved to: $RESULTS_DIR${NC}"
    
    if [ "$GENERATE_REPORT" = "true" ]; then
        echo -e "${BLUE}HTML Report: $RESULTS_DIR/performance-report.html${NC}"
    fi
    
    return $overall_exit_code
}

# Run main function
main "$@"