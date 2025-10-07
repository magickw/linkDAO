#!/bin/bash

# Community System Test Runner Script
# Runs comprehensive tests for the community system components
# Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="src/__tests__"
REPORT_DIR="test-reports/community"
COVERAGE_DIR="coverage/community"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create directories
mkdir -p "$REPORT_DIR"
mkdir -p "$COVERAGE_DIR"

echo -e "${BLUE}🚀 Community System Test Suite${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' $(seq 1 ${#1}))${NC}"
}

# Function to run tests with error handling
run_test_suite() {
    local test_type=$1
    local test_pattern=$2
    local description=$3
    
    print_section "$description"
    
    echo -e "${YELLOW}Running $test_type tests...${NC}"
    
    if npm run test:community -- --testPathPattern="$test_pattern" --coverage=false --silent; then
        echo -e "${GREEN}✅ $test_type tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_type tests failed${NC}"
        return 1
    fi
}

# Function to run tests with coverage
run_with_coverage() {
    local test_pattern=$1
    local description=$2
    
    print_section "$description"
    
    echo -e "${YELLOW}Running tests with coverage analysis...${NC}"
    
    if npm run test:community -- \
        --testPathPattern="$test_pattern" \
        --coverage \
        --coverageDirectory="$COVERAGE_DIR" \
        --coverageReporters=text,lcov,html,json \
        --collectCoverageFrom="src/components/Community/**/*.{ts,tsx}" \
        --collectCoverageFrom="src/services/community*.{ts,tsx}" \
        --collectCoverageFrom="src/hooks/useCommunity*.{ts,tsx}" \
        --silent; then
        echo -e "${GREEN}✅ Coverage analysis completed${NC}"
        return 0
    else
        echo -e "${RED}❌ Coverage analysis failed${NC}"
        return 1
    fi
}

# Function to generate test report
generate_report() {
    print_section "Generating Test Report"
    
    echo -e "${YELLOW}Generating comprehensive test report...${NC}"
    
    if node "$TEST_DIR/community/CommunityTestRunner.ts"; then
        echo -e "${GREEN}✅ Test report generated${NC}"
        echo -e "${BLUE}📄 Report location: $REPORT_DIR/latest-community-report.json${NC}"
    else
        echo -e "${RED}❌ Failed to generate test report${NC}"
    fi
}

# Function to run performance benchmarks
run_performance_benchmark() {
    print_section "Performance Benchmark"
    
    echo -e "${YELLOW}Running performance benchmarks...${NC}"
    
    if node "$TEST_DIR/community/CommunityTestRunner.ts" benchmark; then
        echo -e "${GREEN}✅ Performance benchmark completed${NC}"
        echo -e "${BLUE}📊 Benchmark location: $REPORT_DIR/performance-benchmark.json${NC}"
    else
        echo -e "${RED}❌ Performance benchmark failed${NC}"
    fi
}

# Function to run accessibility audit
run_accessibility_audit() {
    print_section "Accessibility Audit"
    
    echo -e "${YELLOW}Running accessibility audit...${NC}"
    
    if node "$TEST_DIR/community/CommunityTestRunner.ts" accessibility; then
        echo -e "${GREEN}✅ Accessibility audit completed${NC}"
        echo -e "${BLUE}♿ Audit location: $REPORT_DIR/accessibility-audit.json${NC}"
    else
        echo -e "${RED}❌ Accessibility audit failed${NC}"
    fi
}

# Function to check test environment
check_environment() {
    print_section "Environment Check"
    
    echo -e "${YELLOW}Checking test environment...${NC}"
    
    # Check Node.js version
    NODE_VERSION=$(node --version)
    echo -e "Node.js version: ${GREEN}$NODE_VERSION${NC}"
    
    # Check npm version
    NPM_VERSION=$(npm --version)
    echo -e "npm version: ${GREEN}$NPM_VERSION${NC}"
    
    # Check Jest installation
    if npm list jest > /dev/null 2>&1; then
        JEST_VERSION=$(npm list jest --depth=0 | grep jest | cut -d'@' -f2)
        echo -e "Jest version: ${GREEN}$JEST_VERSION${NC}"
    else
        echo -e "${RED}❌ Jest not found${NC}"
        exit 1
    fi
    
    # Check TypeScript installation
    if npm list typescript > /dev/null 2>&1; then
        TS_VERSION=$(npm list typescript --depth=0 | grep typescript | cut -d'@' -f2)
        echo -e "TypeScript version: ${GREEN}$TS_VERSION${NC}"
    else
        echo -e "${RED}❌ TypeScript not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment check passed${NC}"
}

# Function to clean up previous test artifacts
cleanup() {
    print_section "Cleanup"
    
    echo -e "${YELLOW}Cleaning up previous test artifacts...${NC}"
    
    # Remove old coverage reports
    if [ -d "$COVERAGE_DIR" ]; then
        rm -rf "$COVERAGE_DIR"
        echo -e "Removed old coverage reports"
    fi
    
    # Remove old test reports (keep last 5)
    if [ -d "$REPORT_DIR" ]; then
        find "$REPORT_DIR" -name "community-test-report-*.json" -type f | sort -r | tail -n +6 | xargs rm -f
        echo -e "Cleaned up old test reports"
    fi
    
    # Clear Jest cache
    if npm run test:community -- --clearCache > /dev/null 2>&1; then
        echo -e "Cleared Jest cache"
    fi
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --unit              Run unit tests only"
    echo "  --integration       Run integration tests only"
    echo "  --performance       Run performance tests only"
    echo "  --coverage          Run all tests with coverage"
    echo "  --benchmark         Run performance benchmark"
    echo "  --accessibility     Run accessibility audit"
    echo "  --watch             Run tests in watch mode"
    echo "  --clean             Clean up test artifacts"
    echo "  --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Run all community tests"
    echo "  $0 --unit          # Run only unit tests"
    echo "  $0 --coverage      # Run all tests with coverage"
    echo "  $0 --benchmark     # Run performance benchmark"
}

# Main execution logic
main() {
    local exit_code=0
    
    case "${1:-all}" in
        --unit)
            check_environment
            run_test_suite "Unit" "unit/Community" "Unit Tests" || exit_code=1
            ;;
        --integration)
            check_environment
            run_test_suite "Integration" "integration/Community" "Integration Tests" || exit_code=1
            ;;
        --performance)
            check_environment
            run_test_suite "Performance" "performance/Community" "Performance Tests" || exit_code=1
            ;;
        --coverage)
            check_environment
            cleanup
            run_with_coverage "Community" "Coverage Analysis" || exit_code=1
            ;;
        --benchmark)
            check_environment
            run_performance_benchmark || exit_code=1
            ;;
        --accessibility)
            check_environment
            run_accessibility_audit || exit_code=1
            ;;
        --watch)
            check_environment
            echo -e "${YELLOW}Starting tests in watch mode...${NC}"
            npm run test:community -- --watch --testPathPattern="Community"
            ;;
        --clean)
            cleanup
            ;;
        --help)
            usage
            exit 0
            ;;
        all|"")
            check_environment
            cleanup
            
            # Run all test suites
            run_test_suite "Unit" "unit/Community" "Unit Tests" || exit_code=1
            run_test_suite "Integration" "integration/Community" "Integration Tests" || exit_code=1
            run_test_suite "Performance" "performance/Community" "Performance Tests" || exit_code=1
            
            # Run with coverage
            run_with_coverage "Community" "Coverage Analysis" || exit_code=1
            
            # Generate reports
            generate_report || exit_code=1
            run_performance_benchmark || exit_code=1
            run_accessibility_audit || exit_code=1
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
    
    # Final summary
    print_section "Test Summary"
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}🎉 All community tests completed successfully!${NC}"
        echo -e "${BLUE}📊 Reports available in: $REPORT_DIR${NC}"
        echo -e "${BLUE}📈 Coverage reports in: $COVERAGE_DIR${NC}"
    else
        echo -e "${RED}❌ Some tests failed. Check the output above for details.${NC}"
    fi
    
    exit $exit_code
}

# Trap to ensure cleanup on script exit
trap 'echo -e "\n${YELLOW}Script interrupted. Cleaning up...${NC}"; exit 130' INT TERM

# Run main function with all arguments
main "$@"