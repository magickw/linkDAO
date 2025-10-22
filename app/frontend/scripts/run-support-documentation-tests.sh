#!/bin/bash

# Support Documentation Testing Suite Runner
# This script runs comprehensive tests for the user support documentation system

set -e

echo "🧪 Starting Support Documentation Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_CONFIG="jest.support-documentation.config.js"
COVERAGE_DIR="coverage/support-documentation"
RESULTS_DIR="test-results/support-documentation"

# Create directories
mkdir -p "$COVERAGE_DIR"
mkdir -p "$RESULTS_DIR"

# Function to run test category
run_test_category() {
    local category=$1
    local pattern=$2
    local description=$3
    
    echo -e "\n${BLUE}📋 Running $description...${NC}"
    
    if npm test -- --config="$TEST_CONFIG" --testPathPattern="$pattern" --verbose; then
        echo -e "${GREEN}✅ $description passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        return 1
    fi
}

# Function to run performance tests
run_performance_tests() {
    echo -e "\n${BLUE}⚡ Running Performance Tests...${NC}"
    
    # Set performance test environment
    export NODE_ENV=test
    export PERFORMANCE_TESTING=true
    
    if npm test -- --config="$TEST_CONFIG" --testPathPattern="performance.test" --verbose --detectOpenHandles; then
        echo -e "${GREEN}✅ Performance tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Performance tests failed${NC}"
        return 1
    fi
}

# Function to run accessibility tests
run_accessibility_tests() {
    echo -e "\n${BLUE}♿ Running Accessibility Tests...${NC}"
    
    # Set accessibility test environment
    export ACCESSIBILITY_TESTING=true
    
    if npm test -- --config="$TEST_CONFIG" --testPathPattern="accessibility.test" --verbose; then
        echo -e "${GREEN}✅ Accessibility tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Accessibility tests failed${NC}"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    echo -e "\n${BLUE}🔗 Running Integration Tests...${NC}"
    
    # Set integration test environment
    export INTEGRATION_TESTING=true
    
    if npm test -- --config="$TEST_CONFIG" --testPathPattern="integration.test" --verbose --runInBand; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        return 1
    fi
}

# Function to generate coverage report
generate_coverage_report() {
    echo -e "\n${BLUE}📊 Generating Coverage Report...${NC}"
    
    npm test -- --config="$TEST_CONFIG" --coverage --coverageDirectory="$COVERAGE_DIR" --watchAll=false
    
    if [ -f "$COVERAGE_DIR/lcov-report/index.html" ]; then
        echo -e "${GREEN}✅ Coverage report generated at $COVERAGE_DIR/lcov-report/index.html${NC}"
    else
        echo -e "${YELLOW}⚠️  Coverage report not found${NC}"
    fi
}

# Function to run visual regression tests
run_visual_regression_tests() {
    echo -e "\n${BLUE}👁️  Running Visual Regression Tests...${NC}"
    
    if command -v chromatic &> /dev/null; then
        if npx chromatic --project-token="$CHROMATIC_PROJECT_TOKEN" --build-script-name="build-storybook"; then
            echo -e "${GREEN}✅ Visual regression tests passed${NC}"
            return 0
        else
            echo -e "${RED}❌ Visual regression tests failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Chromatic not available, skipping visual regression tests${NC}"
        return 0
    fi
}

# Function to run cross-browser tests
run_cross_browser_tests() {
    echo -e "\n${BLUE}🌐 Running Cross-Browser Tests...${NC}"
    
    if command -v playwright &> /dev/null; then
        if npx playwright test --config=playwright.support-documentation.config.ts; then
            echo -e "${GREEN}✅ Cross-browser tests passed${NC}"
            return 0
        else
            echo -e "${RED}❌ Cross-browser tests failed${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Playwright not available, skipping cross-browser tests${NC}"
        return 0
    fi
}

# Function to validate test results
validate_test_results() {
    echo -e "\n${BLUE}🔍 Validating Test Results...${NC}"
    
    local failed_tests=0
    
    # Check for test failures in results
    if [ -f "$RESULTS_DIR/junit.xml" ]; then
        local failures=$(grep -o 'failures="[0-9]*"' "$RESULTS_DIR/junit.xml" | grep -o '[0-9]*' || echo "0")
        local errors=$(grep -o 'errors="[0-9]*"' "$RESULTS_DIR/junit.xml" | grep -o '[0-9]*' || echo "0")
        
        if [ "$failures" -gt 0 ] || [ "$errors" -gt 0 ]; then
            echo -e "${RED}❌ Found $failures failures and $errors errors${NC}"
            failed_tests=1
        fi
    fi
    
    # Check coverage thresholds
    if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
        local coverage=$(node -e "
            const summary = require('./$COVERAGE_DIR/coverage-summary.json');
            const total = summary.total;
            console.log(Math.min(total.lines.pct, total.functions.pct, total.branches.pct, total.statements.pct));
        ")
        
        if (( $(echo "$coverage < 80" | bc -l) )); then
            echo -e "${RED}❌ Coverage below threshold: $coverage%${NC}"
            failed_tests=1
        else
            echo -e "${GREEN}✅ Coverage meets threshold: $coverage%${NC}"
        fi
    fi
    
    return $failed_tests
}

# Main test execution
main() {
    local exit_code=0
    
    echo -e "${BLUE}🚀 Support Documentation Test Suite${NC}"
    echo -e "${BLUE}====================================${NC}"
    
    # Pre-test setup
    echo -e "\n${BLUE}🔧 Setting up test environment...${NC}"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Clean previous results
    rm -rf "$RESULTS_DIR"
    rm -rf "$COVERAGE_DIR"
    mkdir -p "$RESULTS_DIR"
    mkdir -p "$COVERAGE_DIR"
    
    # Run test categories
    echo -e "\n${BLUE}📝 Running Core Functionality Tests...${NC}"
    
    # Unit tests
    if ! run_test_category "unit" "SupportDocuments.test|DocumentNavigation.test|documentService.test|useDocumentNavigation.test" "Unit Tests"; then
        exit_code=1
    fi
    
    # Performance tests
    if ! run_performance_tests; then
        exit_code=1
    fi
    
    # Accessibility tests
    if ! run_accessibility_tests; then
        exit_code=1
    fi
    
    # Integration tests
    if ! run_integration_tests; then
        exit_code=1
    fi
    
    # Visual regression tests (optional)
    if [ "$RUN_VISUAL_TESTS" = "true" ]; then
        if ! run_visual_regression_tests; then
            exit_code=1
        fi
    fi
    
    # Cross-browser tests (optional)
    if [ "$RUN_BROWSER_TESTS" = "true" ]; then
        if ! run_cross_browser_tests; then
            exit_code=1
        fi
    fi
    
    # Generate reports
    echo -e "\n${BLUE}📊 Generating Test Reports...${NC}"
    
    generate_coverage_report
    
    # Validate results
    if ! validate_test_results; then
        exit_code=1
    fi
    
    # Summary
    echo -e "\n${BLUE}📋 Test Summary${NC}"
    echo -e "${BLUE}===============${NC}"
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ All tests passed successfully!${NC}"
        echo -e "${GREEN}📊 Coverage report: $COVERAGE_DIR/lcov-report/index.html${NC}"
        echo -e "${GREEN}📋 Test results: $RESULTS_DIR/report.html${NC}"
    else
        echo -e "${RED}❌ Some tests failed. Check the reports for details.${NC}"
        echo -e "${RED}📊 Coverage report: $COVERAGE_DIR/lcov-report/index.html${NC}"
        echo -e "${RED}📋 Test results: $RESULTS_DIR/report.html${NC}"
    fi
    
    # CI/CD integration
    if [ "$CI" = "true" ]; then
        echo -e "\n${BLUE}🔄 CI/CD Integration${NC}"
        
        # Upload coverage to Codecov
        if command -v codecov &> /dev/null && [ -f "$COVERAGE_DIR/lcov.info" ]; then
            codecov -f "$COVERAGE_DIR/lcov.info" -F support-documentation
        fi
        
        # Archive test results
        if command -v tar &> /dev/null; then
            tar -czf "support-documentation-test-results.tar.gz" "$RESULTS_DIR" "$COVERAGE_DIR"
            echo -e "${GREEN}✅ Test results archived${NC}"
        fi
    fi
    
    exit $exit_code
}

# Handle script arguments
case "${1:-}" in
    --unit)
        run_test_category "unit" "SupportDocuments.test|DocumentNavigation.test|documentService.test|useDocumentNavigation.test" "Unit Tests"
        ;;
    --performance)
        run_performance_tests
        ;;
    --accessibility)
        run_accessibility_tests
        ;;
    --integration)
        run_integration_tests
        ;;
    --coverage)
        generate_coverage_report
        ;;
    --visual)
        export RUN_VISUAL_TESTS=true
        run_visual_regression_tests
        ;;
    --browser)
        export RUN_BROWSER_TESTS=true
        run_cross_browser_tests
        ;;
    --help)
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  --unit          Run unit tests only"
        echo "  --performance   Run performance tests only"
        echo "  --accessibility Run accessibility tests only"
        echo "  --integration   Run integration tests only"
        echo "  --coverage      Generate coverage report only"
        echo "  --visual        Run visual regression tests only"
        echo "  --browser       Run cross-browser tests only"
        echo "  --help          Show this help message"
        echo ""
        echo "Environment variables:"
        echo "  RUN_VISUAL_TESTS=true   Include visual regression tests"
        echo "  RUN_BROWSER_TESTS=true  Include cross-browser tests"
        echo "  CI=true                 Enable CI/CD integration"
        ;;
    *)
        main
        ;;
esac