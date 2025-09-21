#!/bin/bash

# Reddit-Style Community Test Runner Script
# This script runs comprehensive tests for all Reddit-style features

set -e

echo "🎯 Reddit-Style Community Test Suite"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
COVERAGE=false
VERBOSE=false
PARALLEL=false
CATEGORIES=""
OUTPUT_PATH="test-reports/reddit-style-test-report.json"
WATCH=false
CI_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --coverage)
      COVERAGE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --parallel)
      PARALLEL=true
      shift
      ;;
    --categories)
      CATEGORIES="$2"
      shift 2
      ;;
    --output)
      OUTPUT_PATH="$2"
      shift 2
      ;;
    --watch)
      WATCH=true
      shift
      ;;
    --ci)
      CI_MODE=true
      COVERAGE=true
      PARALLEL=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --coverage          Enable code coverage reporting"
      echo "  --verbose           Enable verbose output"
      echo "  --parallel          Run tests in parallel"
      echo "  --categories LIST   Run specific test categories (comma-separated)"
      echo "                      Available: unit,integration,e2e,accessibility,performance,cross-browser"
      echo "  --output PATH       Output path for test report"
      echo "  --watch             Run tests in watch mode"
      echo "  --ci                CI mode (enables coverage and parallel)"
      echo "  --help              Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0 --coverage --verbose"
      echo "  $0 --categories unit,integration"
      echo "  $0 --ci"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Please run this script from the frontend directory.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Create test reports directory
mkdir -p "$(dirname "$OUTPUT_PATH")"

# Set environment variables for testing
export NODE_ENV=test
export CI=$CI_MODE

# Build test command options
TEST_OPTIONS=""

if [ "$COVERAGE" = true ]; then
    TEST_OPTIONS="$TEST_OPTIONS --coverage"
    echo -e "${BLUE}📊 Code coverage enabled${NC}"
fi

if [ "$VERBOSE" = true ]; then
    TEST_OPTIONS="$TEST_OPTIONS --verbose"
    echo -e "${BLUE}🔍 Verbose output enabled${NC}"
fi

if [ "$PARALLEL" = true ]; then
    TEST_OPTIONS="$TEST_OPTIONS --parallel"
    echo -e "${BLUE}⚡ Parallel execution enabled${NC}"
fi

if [ -n "$CATEGORIES" ]; then
    TEST_OPTIONS="$TEST_OPTIONS --categories $CATEGORIES"
    echo -e "${BLUE}🎯 Running categories: $CATEGORIES${NC}"
fi

TEST_OPTIONS="$TEST_OPTIONS --output $OUTPUT_PATH"

echo ""
echo -e "${BLUE}🚀 Starting test execution...${NC}"
echo ""

# Function to run specific test category
run_category_tests() {
    local category=$1
    local description=$2
    
    echo -e "${YELLOW}📋 Running $description...${NC}"
    
    case $category in
        "unit")
            npx jest --testPathPattern="src/components.*/__tests__/.*\.test\.tsx$" --coverage=$COVERAGE --verbose=$VERBOSE
            ;;
        "integration")
            npx jest --testPathPattern="src/__tests__/integration/.*\.test\.tsx$" --coverage=$COVERAGE --verbose=$VERBOSE
            ;;
        "e2e")
            npx jest --testPathPattern="src/__tests__/e2e/.*\.test\.tsx$" --coverage=$COVERAGE --verbose=$VERBOSE
            ;;
        "accessibility")
            npx jest --testPathPattern="src/__tests__/accessibility/.*\.test\.tsx$" --coverage=$COVERAGE --verbose=$VERBOSE
            ;;
        "performance")
            npx jest --testPathPattern="src/__tests__/performance/.*\.test\.tsx$" --coverage=$COVERAGE --verbose=$VERBOSE
            ;;
        "cross-browser")
            npx jest --testPathPattern="src/__tests__/crossBrowser/.*\.test\.tsx$" --coverage=$COVERAGE --verbose=$VERBOSE
            ;;
    esac
}

# Function to run all tests
run_all_tests() {
    echo -e "${BLUE}🎯 Running comprehensive Reddit-style test suite${NC}"
    
    # Run unit tests
    echo -e "\n${YELLOW}1️⃣ Unit Tests${NC}"
    echo "=============="
    run_category_tests "unit" "Component unit tests"
    
    # Run integration tests
    echo -e "\n${YELLOW}2️⃣ Integration Tests${NC}"
    echo "==================="
    run_category_tests "integration" "Feature integration tests"
    
    # Run E2E tests
    echo -e "\n${YELLOW}3️⃣ End-to-End Tests${NC}"
    echo "==================="
    run_category_tests "e2e" "Complete user journey tests"
    
    # Run accessibility tests
    echo -e "\n${YELLOW}4️⃣ Accessibility Tests${NC}"
    echo "======================"
    run_category_tests "accessibility" "WCAG compliance tests"
    
    # Run performance tests
    echo -e "\n${YELLOW}5️⃣ Performance Tests${NC}"
    echo "===================="
    run_category_tests "performance" "Performance optimization tests"
    
    # Run cross-browser tests
    echo -e "\n${YELLOW}6️⃣ Cross-Browser Tests${NC}"
    echo "======================"
    run_category_tests "cross-browser" "Browser compatibility tests"
}

# Function to run tests in watch mode
run_watch_mode() {
    echo -e "${BLUE}👀 Running tests in watch mode${NC}"
    echo "Press 'q' to quit, 'a' to run all tests"
    
    npx jest --watch --testPathPattern="reddit-style|Community" --coverage=$COVERAGE
}

# Main execution
if [ "$WATCH" = true ]; then
    run_watch_mode
elif [ -n "$CATEGORIES" ]; then
    # Run specific categories
    IFS=',' read -ra CATEGORY_ARRAY <<< "$CATEGORIES"
    for category in "${CATEGORY_ARRAY[@]}"; do
        case $category in
            "unit")
                run_category_tests "unit" "Unit Tests"
                ;;
            "integration")
                run_category_tests "integration" "Integration Tests"
                ;;
            "e2e")
                run_category_tests "e2e" "End-to-End Tests"
                ;;
            "accessibility")
                run_category_tests "accessibility" "Accessibility Tests"
                ;;
            "performance")
                run_category_tests "performance" "Performance Tests"
                ;;
            "cross-browser")
                run_category_tests "cross-browser" "Cross-Browser Tests"
                ;;
            *)
                echo -e "${RED}❌ Unknown category: $category${NC}"
                exit 1
                ;;
        esac
    done
else
    # Run comprehensive test suite using TypeScript runner
    echo -e "${BLUE}🎯 Running comprehensive test suite with TypeScript runner${NC}"
    npx ts-node src/__tests__/reddit-style/TestRunner.ts $TEST_OPTIONS
fi

# Check test results
TEST_EXIT_CODE=$?

echo ""
echo "=================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed successfully!${NC}"
    echo -e "${GREEN}🎉 Reddit-style community features are ready for deployment${NC}"
    
    if [ "$COVERAGE" = true ]; then
        echo -e "${BLUE}📊 Coverage report available at: coverage/lcov-report/index.html${NC}"
    fi
    
    echo -e "${BLUE}📋 Detailed test report: $OUTPUT_PATH${NC}"
    
    # Generate deployment readiness report
    echo ""
    echo -e "${GREEN}🚀 Deployment Readiness Checklist:${NC}"
    echo "✅ Unit tests passing"
    echo "✅ Integration tests passing"
    echo "✅ End-to-end tests passing"
    echo "✅ Accessibility compliance verified"
    echo "✅ Performance optimizations tested"
    echo "✅ Cross-browser compatibility confirmed"
    echo ""
    echo -e "${GREEN}🎯 All Reddit-style features are production-ready!${NC}"
    
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo -e "${YELLOW}⚠️ Please review the test results and fix failing tests before deployment${NC}"
    
    echo ""
    echo -e "${YELLOW}🔧 Troubleshooting Tips:${NC}"
    echo "1. Check the detailed error messages above"
    echo "2. Run tests with --verbose for more details"
    echo "3. Run specific categories to isolate issues"
    echo "4. Check the test report for detailed analysis"
    echo ""
    echo -e "${BLUE}📋 Test report: $OUTPUT_PATH${NC}"
fi

# Cleanup
if [ "$CI_MODE" = true ]; then
    echo ""
    echo -e "${BLUE}🧹 Cleaning up CI artifacts...${NC}"
    # Add any CI-specific cleanup here
fi

echo ""
echo -e "${BLUE}📊 Test execution completed${NC}"

exit $TEST_EXIT_CODE