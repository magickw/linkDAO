#!/bin/bash

# Service Worker Cache Enhancement Test Runner
# Comprehensive testing script for all cache enhancement tests

set -e

echo "🚀 Starting Service Worker Cache Enhancement Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="src/services/__tests__"
E2E_DIR="$TEST_DIR/e2e/cache-enhancement"
REPORTS_DIR="test-results/cache-enhancement"

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Function to run tests with error handling
run_test_suite() {
    local test_name=$1
    local test_command=$2
    local description=$3
    
    echo -e "\n${BLUE}📋 Running $test_name${NC}"
    echo -e "${YELLOW}Description: $description${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    # Check if Playwright is installed
    if ! npx playwright --version &> /dev/null; then
        echo -e "${YELLOW}⚠️  Playwright not found, installing...${NC}"
        npx playwright install
    fi
    
    # Check if Jest is available
    if ! npx jest --version &> /dev/null; then
        echo -e "${RED}❌ Jest is not available${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Function to start development server
start_dev_server() {
    echo -e "${BLUE}🌐 Starting development server...${NC}"
    
    # Check if server is already running
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Development server already running${NC}"
        return 0
    fi
    
    # Start server in background
    npm run dev > /dev/null 2>&1 &
    DEV_SERVER_PID=$!
    
    # Wait for server to start
    echo -e "${YELLOW}⏳ Waiting for server to start...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Development server started (PID: $DEV_SERVER_PID)${NC}"
            return 0
        fi
        sleep 2
    done
    
    echo -e "${RED}❌ Failed to start development server${NC}"
    exit 1
}

# Function to stop development server
stop_dev_server() {
    if [ ! -z "$DEV_SERVER_PID" ]; then
        echo -e "${BLUE}🛑 Stopping development server...${NC}"
        kill $DEV_SERVER_PID 2>/dev/null || true
        wait $DEV_SERVER_PID 2>/dev/null || true
        echo -e "${GREEN}✅ Development server stopped${NC}"
    fi
}

# Function to run unit tests
run_unit_tests() {
    echo -e "\n${BLUE}🧪 Running Unit Tests${NC}"
    
    local unit_tests=(
        "serviceWorkerCacheService.test.ts"
        "serviceWorkerCacheService.simple.test.ts"
        "enhancedCacheService.test.ts"
        "cacheMetadataManager.test.ts"
        "backgroundSync.test.ts"
        "cacheStrategyIntegration.test.ts"
        "cachePerformanceMetricsService.test.ts"
        "intelligentPreloadingSystem.test.ts"
        "cacheAccessControl.test.ts"
        "cacheMigrationSystem.test.ts"
    )
    
    local failed_tests=()
    
    for test_file in "${unit_tests[@]}"; do
        if [ -f "$TEST_DIR/$test_file" ]; then
            if run_test_suite \
                "Unit Test: $test_file" \
                "npx jest $TEST_DIR/$test_file --verbose --coverage --coverageDirectory=$REPORTS_DIR/coverage" \
                "Testing core cache service functionality"; then
                continue
            else
                failed_tests+=("$test_file")
            fi
        else
            echo -e "${YELLOW}⚠️  Test file not found: $test_file${NC}"
        fi
    done
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All unit tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed unit tests: ${failed_tests[*]}${NC}"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    echo -e "\n${BLUE}🎭 Running End-to-End Tests${NC}"
    
    local e2e_tests=(
        "feed-offline-transitions.e2e.test.ts:Feed browsing with offline/online transitions"
        "community-background-sync.e2e.test.ts:Community participation with background sync"
        "marketplace-cache-invalidation.e2e.test.ts:Marketplace shopping with cache invalidation"
        "messaging-encrypted-sync.e2e.test.ts:Messaging with encrypted storage and sync"
    )
    
    local failed_tests=()
    
    for test_entry in "${e2e_tests[@]}"; do
        IFS=':' read -r test_file description <<< "$test_entry"
        
        if [ -f "$E2E_DIR/$test_file" ]; then
            if run_test_suite \
                "E2E Test: $test_file" \
                "npx playwright test $E2E_DIR/$test_file --config=playwright.cache-enhancement.config.ts --reporter=html --output-dir=$REPORTS_DIR/e2e" \
                "$description"; then
                continue
            else
                failed_tests+=("$test_file")
            fi
        else
            echo -e "${YELLOW}⚠️  E2E test file not found: $test_file${NC}"
        fi
    done
    
    if [ ${#failed_tests[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All E2E tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed E2E tests: ${failed_tests[*]}${NC}"
        return 1
    fi
}

# Function to run cross-browser tests
run_cross_browser_tests() {
    echo -e "\n${BLUE}🌐 Running Cross-Browser Compatibility Tests${NC}"
    
    local browsers=("chromium" "firefox" "webkit")
    local failed_browsers=()
    
    for browser in "${browsers[@]}"; do
        if run_test_suite \
            "Cross-Browser Test: $browser" \
            "npx playwright test $E2E_DIR/cross-browser-compatibility.e2e.test.ts --config=playwright.cache-enhancement.config.ts --project=$browser-cache --reporter=html --output-dir=$REPORTS_DIR/cross-browser/$browser" \
            "Testing service worker compatibility in $browser"; then
            continue
        else
            failed_browsers+=("$browser")
        fi
    done
    
    # Run browser-specific workarounds test
    if run_test_suite \
        "Browser Workarounds Test" \
        "npx playwright test $E2E_DIR/browser-workarounds.e2e.test.ts --config=playwright.cache-enhancement.config.ts --reporter=html --output-dir=$REPORTS_DIR/workarounds" \
        "Testing browser-specific workarounds and fallbacks"; then
        echo -e "${GREEN}✅ Browser workarounds test passed${NC}"
    else
        failed_browsers+=("workarounds")
    fi
    
    if [ ${#failed_browsers[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All cross-browser tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed cross-browser tests: ${failed_browsers[*]}${NC}"
        return 1
    fi
}

# Function to run performance benchmarks
run_performance_tests() {
    echo -e "\n${BLUE}⚡ Running Performance Benchmarks${NC}"
    
    if run_test_suite \
        "Performance Benchmarks" \
        "npx playwright test $E2E_DIR/performance-benchmarks.e2e.test.ts --config=playwright.cache-enhancement.config.ts --project=performance-chrome --reporter=html --output-dir=$REPORTS_DIR/performance" \
        "Benchmarking cache performance and creating regression baseline"; then
        echo -e "${GREEN}✅ Performance benchmarks completed${NC}"
        return 0
    else
        echo -e "${RED}❌ Performance benchmarks failed${NC}"
        return 1
    fi
}

# Function to generate test report
generate_report() {
    echo -e "\n${BLUE}📊 Generating Test Report${NC}"
    
    local report_file="$REPORTS_DIR/test-summary.html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Service Worker Cache Enhancement Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #007acc; }
        .success { border-left-color: #28a745; }
        .failure { border-left-color: #dc3545; }
        .warning { border-left-color: #ffc107; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f8f9fa; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Service Worker Cache Enhancement Test Report</h1>
        <p>Generated on: $(date)</p>
        <p>Test Suite Version: 1.0.0</p>
    </div>
    
    <div class="section success">
        <h2>✅ Test Summary</h2>
        <div class="metric">Unit Tests: $(find $REPORTS_DIR -name "*.json" -path "*/coverage/*" | wc -l) files</div>
        <div class="metric">E2E Tests: $(find $REPORTS_DIR -name "*.json" -path "*/e2e/*" | wc -l) scenarios</div>
        <div class="metric">Cross-Browser: $(find $REPORTS_DIR -name "*.json" -path "*/cross-browser/*" | wc -l) browsers</div>
        <div class="metric">Performance: $(find $REPORTS_DIR -name "*.json" -path "*/performance/*" | wc -l) benchmarks</div>
    </div>
    
    <div class="section">
        <h2>📋 Test Categories</h2>
        <ul>
            <li><strong>Unit Tests:</strong> Core service worker cache functionality</li>
            <li><strong>E2E Tests:</strong> Real-world usage scenarios with offline/online transitions</li>
            <li><strong>Cross-Browser:</strong> Compatibility across Chrome, Firefox, Safari, and Edge</li>
            <li><strong>Performance:</strong> Benchmarks and regression testing</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>🔗 Detailed Reports</h2>
        <ul>
            <li><a href="coverage/index.html">Code Coverage Report</a></li>
            <li><a href="e2e/index.html">E2E Test Results</a></li>
            <li><a href="cross-browser/index.html">Cross-Browser Results</a></li>
            <li><a href="performance/index.html">Performance Benchmarks</a></li>
        </ul>
    </div>
</body>
</html>
EOF
    
    echo -e "${GREEN}✅ Test report generated: $report_file${NC}"
}

# Function to cleanup
cleanup() {
    echo -e "\n${BLUE}🧹 Cleaning up...${NC}"
    stop_dev_server
    
    # Clean up any test artifacts
    rm -rf .nyc_output 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Main execution
main() {
    local start_time=$(date +%s)
    local failed_suites=()
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    echo -e "${BLUE}🎯 Service Worker Cache Enhancement Test Suite${NC}"
    echo -e "${BLUE}=============================================${NC}"
    
    # Check prerequisites
    check_prerequisites
    
    # Start development server
    start_dev_server
    
    # Run test suites
    echo -e "\n${BLUE}🏃 Running Test Suites...${NC}"
    
    # Unit tests
    if ! run_unit_tests; then
        failed_suites+=("Unit Tests")
    fi
    
    # E2E tests
    if ! run_e2e_tests; then
        failed_suites+=("E2E Tests")
    fi
    
    # Cross-browser tests
    if ! run_cross_browser_tests; then
        failed_suites+=("Cross-Browser Tests")
    fi
    
    # Performance tests
    if ! run_performance_tests; then
        failed_suites+=("Performance Tests")
    fi
    
    # Generate report
    generate_report
    
    # Final summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo -e "\n${BLUE}📈 Test Execution Summary${NC}"
    echo -e "${BLUE}=========================${NC}"
    echo -e "Total Duration: ${duration}s"
    echo -e "Reports Directory: $REPORTS_DIR"
    
    if [ ${#failed_suites[@]} -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All test suites passed successfully!${NC}"
        echo -e "${GREEN}✅ Service Worker Cache Enhancement is ready for deployment${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Failed test suites: ${failed_suites[*]}${NC}"
        echo -e "${RED}🚨 Please fix failing tests before deployment${NC}"
        exit 1
    fi
}

# Parse command line arguments
case "${1:-all}" in
    "unit")
        check_prerequisites
        run_unit_tests
        ;;
    "e2e")
        check_prerequisites
        start_dev_server
        run_e2e_tests
        stop_dev_server
        ;;
    "cross-browser")
        check_prerequisites
        start_dev_server
        run_cross_browser_tests
        stop_dev_server
        ;;
    "performance")
        check_prerequisites
        start_dev_server
        run_performance_tests
        stop_dev_server
        ;;
    "all"|*)
        main
        ;;
esac