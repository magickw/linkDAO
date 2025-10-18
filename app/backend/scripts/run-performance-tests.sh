#!/bin/bash

# Admin Functionality Enhancements - Performance Test Runner
# This script runs comprehensive performance and load tests for the admin system

set -e

echo "🚀 Starting Admin Dashboard Performance Tests"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-"test"}
BACKEND_PORT=${BACKEND_PORT:-3000}
FRONTEND_PORT=${FRONTEND_PORT:-3001}
DB_NAME=${DB_NAME:-"linkdao_test"}

# Test results directory
RESULTS_DIR="./test-results/performance"
mkdir -p "$RESULTS_DIR"

# Timestamp for this test run
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$RESULTS_DIR/performance_report_$TIMESTAMP.json"

echo -e "${BLUE}Test Configuration:${NC}"
echo "- Environment: $TEST_ENV"
echo "- Backend Port: $BACKEND_PORT"
echo "- Frontend Port: $FRONTEND_PORT"
echo "- Database: $DB_NAME"
echo "- Results Directory: $RESULTS_DIR"
echo ""

# Function to check if service is running
check_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Checking $service_name on port $port...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is running${NC}"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}✗ $service_name failed to start${NC}"
    return 1
}

# Function to run backend unit performance tests
run_backend_performance_tests() {
    echo -e "\n${BLUE}Running Backend Performance Tests...${NC}"
    
    cd "$(dirname "$0")/.."
    
    # Run Jest performance tests
    npm test -- --testPathPattern="performance" --verbose --detectOpenHandles --forceExit \
        --testTimeout=60000 --maxWorkers=1 \
        --outputFile="$RESULTS_DIR/backend_performance_$TIMESTAMP.json" \
        --json > "$RESULTS_DIR/backend_performance_raw_$TIMESTAMP.json" 2>&1
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Backend performance tests passed${NC}"
    else
        echo -e "${RED}✗ Backend performance tests failed${NC}"
        return $exit_code
    fi
}

# Function to run frontend performance tests
run_frontend_performance_tests() {
    echo -e "\n${BLUE}Running Frontend Performance Tests...${NC}"
    
    cd "$(dirname "$0")/../../frontend"
    
    # Run Jest performance tests
    npm test -- --testPathPattern="performance" --verbose --detectOpenHandles --forceExit \
        --testTimeout=60000 --maxWorkers=1 \
        --outputFile="$RESULTS_DIR/frontend_performance_$TIMESTAMP.json" \
        --json > "$RESULTS_DIR/frontend_performance_raw_$TIMESTAMP.json" 2>&1
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend performance tests passed${NC}"
    else
        echo -e "${RED}✗ Frontend performance tests failed${NC}"
        return $exit_code
    fi
}

# Function to run Artillery load tests
run_load_tests() {
    echo -e "\n${BLUE}Running Artillery Load Tests...${NC}"
    
    cd "$(dirname "$0")/../load-tests"
    
    # Check if Artillery is installed
    if ! command -v artillery &> /dev/null; then
        echo -e "${YELLOW}Installing Artillery...${NC}"
        npm install -g artillery
    fi
    
    # Prepare test data
    echo "email,password,token" > test-data/admin-credentials.csv
    echo "admin1@test.com,password123,test-token-1" >> test-data/admin-credentials.csv
    echo "admin2@test.com,password123,test-token-2" >> test-data/admin-credentials.csv
    echo "admin3@test.com,password123,test-token-3" >> test-data/admin-credentials.csv
    
    # Run load test
    echo -e "${YELLOW}Starting load test (this may take 15-20 minutes)...${NC}"
    
    artillery run admin-dashboard-load-test.yml \
        --output "$RESULTS_DIR/load_test_raw_$TIMESTAMP.json" \
        --config '{"target": "http://localhost:'$BACKEND_PORT'"}' \
        > "$RESULTS_DIR/load_test_$TIMESTAMP.log" 2>&1
    
    local exit_code=$?
    
    # Generate HTML report
    if [ -f "$RESULTS_DIR/load_test_raw_$TIMESTAMP.json" ]; then
        artillery report "$RESULTS_DIR/load_test_raw_$TIMESTAMP.json" \
            --output "$RESULTS_DIR/load_test_report_$TIMESTAMP.html"
        echo -e "${GREEN}✓ Load test report generated: $RESULTS_DIR/load_test_report_$TIMESTAMP.html${NC}"
    fi
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Load tests completed successfully${NC}"
    else
        echo -e "${RED}✗ Load tests failed${NC}"
        return $exit_code
    fi
}

# Function to run database performance tests
run_database_performance_tests() {
    echo -e "\n${BLUE}Running Database Performance Tests...${NC}"
    
    cd "$(dirname "$0")/.."
    
    # Run database-specific performance tests
    npm run test:db-performance -- \
        --outputFile="$RESULTS_DIR/db_performance_$TIMESTAMP.json" \
        --json > "$RESULTS_DIR/db_performance_raw_$TIMESTAMP.json" 2>&1
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Database performance tests passed${NC}"
    else
        echo -e "${RED}✗ Database performance tests failed${NC}"
        return $exit_code
    fi
}

# Function to run WebSocket performance tests
run_websocket_performance_tests() {
    echo -e "\n${BLUE}Running WebSocket Performance Tests...${NC}"
    
    cd "$(dirname "$0")/.."
    
    # Run WebSocket load test
    node ./scripts/websocket-load-test.js \
        --port=$BACKEND_PORT \
        --connections=100 \
        --duration=60 \
        --output="$RESULTS_DIR/websocket_performance_$TIMESTAMP.json"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ WebSocket performance tests passed${NC}"
    else
        echo -e "${RED}✗ WebSocket performance tests failed${NC}"
        return $exit_code
    fi
}

# Function to monitor system resources during tests
monitor_system_resources() {
    echo -e "\n${BLUE}Starting System Resource Monitoring...${NC}"
    
    local monitor_file="$RESULTS_DIR/system_resources_$TIMESTAMP.log"
    
    # Start resource monitoring in background
    (
        echo "timestamp,cpu_percent,memory_percent,disk_io,network_io" > "$monitor_file"
        
        while true; do
            local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
            local cpu=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' || echo "0")
            local memory=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//' || echo "0")
            local disk_io=$(iostat -d 1 1 | tail -1 | awk '{print $3}' || echo "0")
            local network_io=$(netstat -ib | awk 'NR>1 {sum+=$7} END {print sum}' || echo "0")
            
            echo "$timestamp,$cpu,$memory,$disk_io,$network_io" >> "$monitor_file"
            sleep 5
        done
    ) &
    
    local monitor_pid=$!
    echo "Resource monitoring started (PID: $monitor_pid)"
    echo $monitor_pid > "$RESULTS_DIR/monitor.pid"
}

# Function to stop resource monitoring
stop_system_monitoring() {
    if [ -f "$RESULTS_DIR/monitor.pid" ]; then
        local monitor_pid=$(cat "$RESULTS_DIR/monitor.pid")
        kill $monitor_pid 2>/dev/null || true
        rm -f "$RESULTS_DIR/monitor.pid"
        echo -e "${GREEN}✓ System monitoring stopped${NC}"
    fi
}

# Function to generate comprehensive performance report
generate_performance_report() {
    echo -e "\n${BLUE}Generating Comprehensive Performance Report...${NC}"
    
    local report_file="$RESULTS_DIR/comprehensive_report_$TIMESTAMP.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Admin Dashboard Performance Test Report - $TIMESTAMP</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Admin Dashboard Performance Test Report</h1>
        <p><strong>Test Run:</strong> $TIMESTAMP</p>
        <p><strong>Environment:</strong> $TEST_ENV</p>
        <p><strong>Generated:</strong> $(date)</p>
    </div>

    <div class="section">
        <h2>Test Summary</h2>
        <div class="metric">
            <strong>Backend Tests:</strong> <span id="backend-status">Completed</span>
        </div>
        <div class="metric">
            <strong>Frontend Tests:</strong> <span id="frontend-status">Completed</span>
        </div>
        <div class="metric">
            <strong>Load Tests:</strong> <span id="load-status">Completed</span>
        </div>
        <div class="metric">
            <strong>Database Tests:</strong> <span id="db-status">Completed</span>
        </div>
    </div>

    <div class="section">
        <h2>Performance Metrics</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Threshold</th>
                <th>Status</th>
            </tr>
            <tr>
                <td>Dashboard Load Time</td>
                <td id="dashboard-load">-</td>
                <td>&lt; 2000ms</td>
                <td id="dashboard-status">-</td>
            </tr>
            <tr>
                <td>Analytics Generation</td>
                <td id="analytics-time">-</td>
                <td>&lt; 5000ms</td>
                <td id="analytics-status">-</td>
            </tr>
            <tr>
                <td>Concurrent Users</td>
                <td id="concurrent-users">-</td>
                <td>&gt; 50</td>
                <td id="concurrent-status">-</td>
            </tr>
            <tr>
                <td>WebSocket Connections</td>
                <td id="websocket-connections">-</td>
                <td>&gt; 100</td>
                <td id="websocket-status">-</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Test Files</h2>
        <ul>
            <li><a href="backend_performance_$TIMESTAMP.json">Backend Performance Results</a></li>
            <li><a href="frontend_performance_$TIMESTAMP.json">Frontend Performance Results</a></li>
            <li><a href="load_test_report_$TIMESTAMP.html">Load Test Report</a></li>
            <li><a href="system_resources_$TIMESTAMP.log">System Resource Log</a></li>
        </ul>
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        <div id="recommendations">
            <p>Performance analysis and recommendations will be populated based on test results.</p>
        </div>
    </div>
</body>
</html>
EOF

    echo -e "${GREEN}✓ Performance report generated: $report_file${NC}"
}

# Function to cleanup test environment
cleanup_test_environment() {
    echo -e "\n${BLUE}Cleaning up test environment...${NC}"
    
    # Stop resource monitoring
    stop_system_monitoring
    
    # Clean up test data
    rm -f ./load-tests/test-data/admin-credentials.csv
    
    # Clean up temporary files
    find "$RESULTS_DIR" -name "*.tmp" -delete 2>/dev/null || true
    
    echo -e "${GREEN}✓ Cleanup completed${NC}"
}

# Main execution flow
main() {
    echo -e "${BLUE}Starting comprehensive performance test suite...${NC}"
    
    # Trap to ensure cleanup on exit
    trap cleanup_test_environment EXIT
    
    # Start system monitoring
    monitor_system_resources
    
    # Check if services are running
    if ! check_service "Backend" "$BACKEND_PORT"; then
        echo -e "${RED}Backend service is not running. Please start it first.${NC}"
        exit 1
    fi
    
    # Initialize test results
    local overall_success=true
    
    # Run performance tests
    echo -e "\n${YELLOW}=== Running Performance Test Suite ===${NC}"
    
    # Backend performance tests
    if ! run_backend_performance_tests; then
        overall_success=false
    fi
    
    # Frontend performance tests
    if ! run_frontend_performance_tests; then
        overall_success=false
    fi
    
    # Database performance tests
    if ! run_database_performance_tests; then
        overall_success=false
    fi
    
    # WebSocket performance tests
    if ! run_websocket_performance_tests; then
        overall_success=false
    fi
    
    # Load tests (run last as they take the longest)
    if ! run_load_tests; then
        overall_success=false
    fi
    
    # Generate comprehensive report
    generate_performance_report
    
    # Final results
    echo -e "\n${YELLOW}=== Performance Test Results ===${NC}"
    
    if [ "$overall_success" = true ]; then
        echo -e "${GREEN}✓ All performance tests completed successfully!${NC}"
        echo -e "${GREEN}✓ Results saved to: $RESULTS_DIR${NC}"
        exit 0
    else
        echo -e "${RED}✗ Some performance tests failed${NC}"
        echo -e "${YELLOW}Check individual test results in: $RESULTS_DIR${NC}"
        exit 1
    fi
}

# Script options
case "${1:-}" in
    --help|-h)
        echo "Admin Dashboard Performance Test Runner"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --backend-only      Run only backend performance tests"
        echo "  --frontend-only     Run only frontend performance tests"
        echo "  --load-only         Run only load tests"
        echo "  --db-only           Run only database performance tests"
        echo "  --websocket-only    Run only WebSocket performance tests"
        echo ""
        echo "Environment Variables:"
        echo "  TEST_ENV            Test environment (default: test)"
        echo "  BACKEND_PORT        Backend service port (default: 3000)"
        echo "  FRONTEND_PORT       Frontend service port (default: 3001)"
        echo "  DB_NAME             Database name (default: linkdao_test)"
        exit 0
        ;;
    --backend-only)
        run_backend_performance_tests
        exit $?
        ;;
    --frontend-only)
        run_frontend_performance_tests
        exit $?
        ;;
    --load-only)
        check_service "Backend" "$BACKEND_PORT" && run_load_tests
        exit $?
        ;;
    --db-only)
        run_database_performance_tests
        exit $?
        ;;
    --websocket-only)
        check_service "Backend" "$BACKEND_PORT" && run_websocket_performance_tests
        exit $?
        ;;
    *)
        main
        ;;
esac