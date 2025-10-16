#!/bin/bash

# Web3 Native Community Enhancements Integration Test Runner
# Runs comprehensive integration and performance tests for Web3 features

set -e

echo "🚀 Starting Web3 Native Community Enhancements Integration Tests"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="src/__tests__/web3-integration"
REPORT_DIR="test-reports"
COVERAGE_DIR="coverage"
LOG_FILE="$REPORT_DIR/test-execution.log"

# Create directories if they don't exist
mkdir -p "$REPORT_DIR"
mkdir -p "$COVERAGE_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to cleanup on exit
cleanup() {
    log "🧹 Cleaning up test processes..."
    
    # Kill any remaining test processes
    pkill -f "jest.*web3-integration" || true
    
    # Kill local blockchain if running
    pkill -f "hardhat node" || true
    
    log "✅ Cleanup completed"
}

# Set up cleanup trap
trap cleanup EXIT

# Pre-flight checks
echo -e "${BLUE}🔍 Running pre-flight checks...${NC}"

# Check Node.js version
if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_NODE_VERSION="16.0.0"

if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_NODE_VERSION') ? 0 : 1)" 2>/dev/null; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is too old. Required: $REQUIRED_NODE_VERSION+${NC}"
    exit 1
fi

log "✅ Node.js version: $NODE_VERSION"

# Check if Jest is available
if ! command_exists jest && ! npx jest --version >/dev/null 2>&1; then
    echo -e "${RED}❌ Jest is not available${NC}"
    exit 1
fi

log "✅ Jest is available"

# Check if test files exist
if [ ! -d "$TEST_DIR" ]; then
    echo -e "${RED}❌ Test directory $TEST_DIR does not exist${NC}"
    exit 1
fi

log "✅ Test directory exists"

# Environment setup
echo -e "${BLUE}🔧 Setting up test environment...${NC}"

# Set test environment variables
export NODE_ENV=test
export CI=true
export FORCE_COLOR=1

# Set Web3 test configuration
export WEB3_TEST_NETWORK="hardhat"
export WEB3_TEST_TIMEOUT="120000"
export WEB3_TEST_RETRIES="3"

# Set performance test configuration
export PERFORMANCE_TEST_ENABLED="true"
export PERFORMANCE_THRESHOLD_MS="100"
export MEMORY_THRESHOLD_MB="512"

log "✅ Environment variables set"

# Start local blockchain for integration tests
echo -e "${BLUE}⛓️  Starting local blockchain...${NC}"

# Check if Hardhat is available
if command_exists npx && npx hardhat --version >/dev/null 2>&1; then
    log "Starting Hardhat local network..."
    
    # Start Hardhat node in background
    npx hardhat node --port 8545 --hostname 0.0.0.0 > "$REPORT_DIR/hardhat.log" 2>&1 &
    HARDHAT_PID=$!
    
    # Wait for Hardhat to start
    sleep 5
    
    # Check if Hardhat is running
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://localhost:8545 >/dev/null; then
        log "✅ Hardhat network started (PID: $HARDHAT_PID)"
    else
        log "❌ Failed to start Hardhat network"
        exit 1
    fi
else
    log "⚠️  Hardhat not available, using mock blockchain"
    export WEB3_TEST_MOCK_BLOCKCHAIN="true"
fi

# Install dependencies if needed
echo -e "${BLUE}📦 Checking dependencies...${NC}"

if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    log "Installing dependencies..."
    npm ci --silent
    log "✅ Dependencies installed"
else
    log "✅ Dependencies up to date"
fi

# Run test suites
echo -e "${BLUE}🧪 Running Web3 integration test suites...${NC}"

# Test suite configuration
declare -A TEST_SUITES=(
    ["Web3 Workflow E2E Tests"]="Web3WorkflowTests.e2e.test.tsx"
    ["Blockchain Integration Tests"]="BlockchainIntegrationTests.test.tsx"
    ["Performance Tests"]="PerformanceTests.test.tsx"
)

# Track test results
TOTAL_SUITES=${#TEST_SUITES[@]}
PASSED_SUITES=0
FAILED_SUITES=0
SUITE_RESULTS=()

# Function to run individual test suite
run_test_suite() {
    local suite_name="$1"
    local test_file="$2"
    local start_time=$(date +%s)
    
    echo -e "${YELLOW}🔄 Running: $suite_name${NC}"
    log "Starting test suite: $suite_name"
    
    # Create suite-specific report directory
    local suite_report_dir="$REPORT_DIR/$(echo "$suite_name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')"
    mkdir -p "$suite_report_dir"
    
    # Run Jest with coverage and detailed reporting
    local jest_config="--testPathPattern=$TEST_DIR/$test_file"
    jest_config="$jest_config --coverage"
    jest_config="$jest_config --coverageDirectory=$suite_report_dir/coverage"
    jest_config="$jest_config --coverageReporters=json,lcov,text"
    jest_config="$jest_config --json"
    jest_config="$jest_config --outputFile=$suite_report_dir/results.json"
    jest_config="$jest_config --verbose"
    jest_config="$jest_config --detectOpenHandles"
    jest_config="$jest_config --forceExit"
    
    if npx jest $jest_config > "$suite_report_dir/output.log" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${GREEN}✅ $suite_name passed (${duration}s)${NC}"
        log "✅ $suite_name completed successfully in ${duration}s"
        
        PASSED_SUITES=$((PASSED_SUITES + 1))
        SUITE_RESULTS+=("PASS:$suite_name:${duration}s")
        
        # Extract coverage information
        if [ -f "$suite_report_dir/coverage/coverage-summary.json" ]; then
            local coverage=$(node -e "
                const fs = require('fs');
                const coverage = JSON.parse(fs.readFileSync('$suite_report_dir/coverage/coverage-summary.json'));
                console.log(coverage.total.lines.pct + '%');
            " 2>/dev/null || echo "N/A")
            log "   Coverage: $coverage"
        fi
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${RED}❌ $suite_name failed (${duration}s)${NC}"
        log "❌ $suite_name failed after ${duration}s"
        
        FAILED_SUITES=$((FAILED_SUITES + 1))
        SUITE_RESULTS+=("FAIL:$suite_name:${duration}s")
        
        # Show error details
        echo -e "${RED}Error details:${NC}"
        tail -20 "$suite_report_dir/output.log" | sed 's/^/   /'
        
        return 1
    fi
}

# Run all test suites
for suite_name in "${!TEST_SUITES[@]}"; do
    test_file="${TEST_SUITES[$suite_name]}"
    run_test_suite "$suite_name" "$test_file"
    echo "" # Add spacing between suites
done

# Run TypeScript test runner for comprehensive reporting
echo -e "${BLUE}📊 Generating comprehensive test report...${NC}"

if [ -f "src/__tests__/web3-integration/TestRunner.ts" ]; then
    log "Running TypeScript test runner..."
    
    if npx ts-node src/__tests__/web3-integration/TestRunner.ts > "$REPORT_DIR/comprehensive-report.log" 2>&1; then
        log "✅ Comprehensive report generated"
    else
        log "⚠️  Comprehensive report generation failed, continuing with basic report"
    fi
fi

# Generate final report
echo -e "${BLUE}📋 Generating final test report...${NC}"

# Create summary report
cat > "$REPORT_DIR/summary.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": {
    "nodeVersion": "$NODE_VERSION",
    "testEnvironment": "$NODE_ENV",
    "web3Network": "${WEB3_TEST_NETWORK:-mock}",
    "performanceTestsEnabled": "${PERFORMANCE_TEST_ENABLED:-false}"
  },
  "results": {
    "totalSuites": $TOTAL_SUITES,
    "passedSuites": $PASSED_SUITES,
    "failedSuites": $FAILED_SUITES,
    "passRate": $(echo "scale=2; $PASSED_SUITES * 100 / $TOTAL_SUITES" | bc -l 2>/dev/null || echo "0")
  },
  "suiteResults": [
$(IFS=$'\n'; for result in "${SUITE_RESULTS[@]}"; do
    IFS=':' read -r status name duration <<< "$result"
    echo "    {\"name\": \"$name\", \"status\": \"$status\", \"duration\": \"$duration\"}"
done | paste -sd ',' -)
  ]
}
EOF

# Print final summary
echo ""
echo "================================================================"
echo -e "${BLUE}📊 WEB3 INTEGRATION TEST SUMMARY${NC}"
echo "================================================================"
echo -e "Total Suites: $TOTAL_SUITES"
echo -e "Passed: ${GREEN}$PASSED_SUITES${NC}"
echo -e "Failed: ${RED}$FAILED_SUITES${NC}"

if [ $TOTAL_SUITES -gt 0 ]; then
    PASS_RATE=$(echo "scale=1; $PASSED_SUITES * 100 / $TOTAL_SUITES" | bc -l 2>/dev/null || echo "0")
    echo -e "Pass Rate: $PASS_RATE%"
fi

echo ""
echo "Suite Results:"
for result in "${SUITE_RESULTS[@]}"; do
    IFS=':' read -r status name duration <<< "$result"
    if [ "$status" = "PASS" ]; then
        echo -e "  ${GREEN}✅${NC} $name ($duration)"
    else
        echo -e "  ${RED}❌${NC} $name ($duration)"
    fi
done

echo ""
echo -e "📄 Detailed reports available in: ${BLUE}$REPORT_DIR${NC}"
echo -e "📊 Test logs available in: ${BLUE}$LOG_FILE${NC}"

# Check if all tests passed
if [ $FAILED_SUITES -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All Web3 integration tests passed!${NC}"
    log "✅ All tests completed successfully"
    exit 0
else
    echo ""
    echo -e "${RED}💥 $FAILED_SUITES test suite(s) failed${NC}"
    log "❌ Test execution completed with failures"
    exit 1
fi