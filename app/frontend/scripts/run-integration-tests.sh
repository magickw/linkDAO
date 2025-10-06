#!/bin/bash

# Integration Test Runner Script for Interconnected Social Platform
# This script runs comprehensive integration tests for cross-feature workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TIMEOUT=60000
MAX_WORKERS=4
COVERAGE_THRESHOLD=70

echo -e "${BLUE}🚀 Starting Integration Tests for Interconnected Social Platform${NC}"
echo "=================================================================="

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Create coverage directory
mkdir -p coverage/integration

# Function to run specific test suite
run_test_suite() {
    local suite_name=$1
    local test_file=$2
    
    echo -e "\n${BLUE}📋 Running ${suite_name}...${NC}"
    
    if npx jest "src/__tests__/integration/${test_file}" \
        --config=jest.integration.config.js \
        --testTimeout=${TEST_TIMEOUT} \
        --maxWorkers=${MAX_WORKERS} \
        --coverage \
        --verbose; then
        echo -e "${GREEN}✅ ${suite_name} completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ ${suite_name} failed${NC}"
        return 1
    fi
}

# Function to run all integration tests
run_all_tests() {
    local failed_suites=()
    local total_suites=0
    local passed_suites=0
    
    # Test suites to run
    declare -A test_suites=(
        ["Cross-Feature Workflows"]="CrossFeatureWorkflows.integration.test.tsx"
        ["Notification Delivery"]="NotificationDelivery.integration.test.tsx"
        ["Real-Time Updates"]="RealTimeUpdates.integration.test.tsx"
        ["Search Functionality"]="SearchFunctionality.integration.test.tsx"
    )
    
    echo -e "\n${BLUE}🧪 Running all integration test suites...${NC}"
    
    for suite_name in "${!test_suites[@]}"; do
        total_suites=$((total_suites + 1))
        
        if run_test_suite "$suite_name" "${test_suites[$suite_name]}"; then
            passed_suites=$((passed_suites + 1))
        else
            failed_suites+=("$suite_name")
        fi
    done
    
    # Generate summary report
    echo -e "\n${BLUE}📊 Integration Test Summary${NC}"
    echo "=================================="
    echo -e "Total Suites: ${total_suites}"
    echo -e "${GREEN}Passed: ${passed_suites}${NC}"
    echo -e "${RED}Failed: ${#failed_suites[@]}${NC}"
    
    if [ ${#failed_suites[@]} -gt 0 ]; then
        echo -e "\n${RED}❌ Failed Suites:${NC}"
        for suite in "${failed_suites[@]}"; do
            echo -e "  - ${suite}"
        done
    fi
    
    # Calculate success rate
    local success_rate=$((passed_suites * 100 / total_suites))
    echo -e "\n🎯 Success Rate: ${success_rate}%"
    
    if [ $success_rate -ge 90 ]; then
        echo -e "${GREEN}🎉 Excellent! Integration tests are passing with high success rate.${NC}"
    elif [ $success_rate -ge 75 ]; then
        echo -e "${YELLOW}👍 Good! Most integration tests are passing.${NC}"
    else
        echo -e "${RED}⚠️  Warning! Integration test success rate is below 75%.${NC}"
    fi
    
    return ${#failed_suites[@]}
}

# Function to generate coverage report
generate_coverage_report() {
    echo -e "\n${BLUE}📊 Generating coverage report...${NC}"
    
    if npx jest src/__tests__/integration \
        --config=jest.integration.config.js \
        --coverage \
        --coverageReporters=html \
        --coverageReporters=lcov \
        --coverageReporters=text-summary \
        --collectCoverageFrom="src/components/**/*.{ts,tsx}" \
        --collectCoverageFrom="src/services/**/*.{ts,tsx}" \
        --collectCoverageFrom="src/hooks/**/*.{ts,tsx}" \
        --passWithNoTests; then
        
        echo -e "${GREEN}✅ Coverage report generated${NC}"
        echo -e "📄 HTML report: coverage/integration/lcov-report/index.html"
        
        # Check coverage threshold
        if [ -f "coverage/integration/coverage-summary.json" ]; then
            local coverage=$(node -e "
                const fs = require('fs');
                const summary = JSON.parse(fs.readFileSync('coverage/integration/coverage-summary.json'));
                console.log(Math.round(summary.total.lines.pct));
            ")
            
            echo -e "📈 Overall Coverage: ${coverage}%"
            
            if [ "$coverage" -ge "$COVERAGE_THRESHOLD" ]; then
                echo -e "${GREEN}✅ Coverage threshold met (${COVERAGE_THRESHOLD}%)${NC}"
            else
                echo -e "${YELLOW}⚠️  Coverage below threshold (${COVERAGE_THRESHOLD}%)${NC}"
            fi
        fi
    else
        echo -e "${RED}❌ Failed to generate coverage report${NC}"
        return 1
    fi
}

# Function to run performance benchmarks
run_performance_benchmarks() {
    echo -e "\n${BLUE}⚡ Running performance benchmarks...${NC}"
    
    # Run performance-focused tests
    if npx jest src/__tests__/integration \
        --config=jest.integration.config.js \
        --testNamePattern="performance|benchmark|load" \
        --verbose; then
        echo -e "${GREEN}✅ Performance benchmarks completed${NC}"
    else
        echo -e "${YELLOW}⚠️  Some performance benchmarks failed${NC}"
    fi
}

# Function to validate test environment
validate_environment() {
    echo -e "\n${BLUE}🔍 Validating test environment...${NC}"
    
    # Check required files exist
    local required_files=(
        "jest.integration.config.js"
        "src/__tests__/setup/integrationSetup.ts"
        "src/__tests__/integration/CrossFeatureWorkflows.integration.test.tsx"
        "src/__tests__/integration/NotificationDelivery.integration.test.tsx"
        "src/__tests__/integration/RealTimeUpdates.integration.test.tsx"
        "src/__tests__/integration/SearchFunctionality.integration.test.tsx"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ Missing required file: $file${NC}"
            return 1
        fi
    done
    
    echo -e "${GREEN}✅ Test environment validated${NC}"
    return 0
}

# Function to clean up test artifacts
cleanup() {
    echo -e "\n${BLUE}🧹 Cleaning up test artifacts...${NC}"
    
    # Remove temporary test files
    find . -name "*.test.js.map" -delete 2>/dev/null || true
    find . -name "*.integration.js.map" -delete 2>/dev/null || true
    
    # Clean up any test databases or cache files
    rm -rf .test-cache 2>/dev/null || true
    rm -rf test-results 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to show help
show_help() {
    echo "Integration Test Runner for Interconnected Social Platform"
    echo ""
    echo "Usage: $0 [OPTIONS] [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  all                    Run all integration test suites (default)"
    echo "  cross-feature         Run cross-feature workflow tests"
    echo "  notifications         Run notification delivery tests"
    echo "  realtime              Run real-time update tests"
    echo "  search                Run search functionality tests"
    echo "  coverage              Generate coverage report only"
    echo "  performance           Run performance benchmarks"
    echo "  validate              Validate test environment"
    echo "  clean                 Clean up test artifacts"
    echo ""
    echo "Options:"
    echo "  --timeout SECONDS     Set test timeout (default: 60)"
    echo "  --workers NUMBER      Set max workers (default: 4)"
    echo "  --coverage-threshold  Set coverage threshold (default: 70)"
    echo "  --verbose             Enable verbose output"
    echo "  --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run all tests"
    echo "  $0 cross-feature            # Run only cross-feature tests"
    echo "  $0 --timeout 120 all        # Run all tests with 2-minute timeout"
    echo "  $0 coverage                 # Generate coverage report only"
}

# Parse command line arguments
COMMAND="all"
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --timeout)
            TEST_TIMEOUT=$(($2 * 1000))
            shift 2
            ;;
        --workers)
            MAX_WORKERS=$2
            shift 2
            ;;
        --coverage-threshold)
            COVERAGE_THRESHOLD=$2
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        all|cross-feature|notifications|realtime|search|coverage|performance|validate|clean)
            COMMAND=$1
            shift
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Set verbose flag for Jest if requested
if [ "$VERBOSE" = true ]; then
    export JEST_VERBOSE=true
fi

# Main execution
case $COMMAND in
    all)
        validate_environment && run_all_tests
        exit_code=$?
        generate_coverage_report
        cleanup
        exit $exit_code
        ;;
    cross-feature)
        validate_environment && run_test_suite "Cross-Feature Workflows" "CrossFeatureWorkflows.integration.test.tsx"
        ;;
    notifications)
        validate_environment && run_test_suite "Notification Delivery" "NotificationDelivery.integration.test.tsx"
        ;;
    realtime)
        validate_environment && run_test_suite "Real-Time Updates" "RealTimeUpdates.integration.test.tsx"
        ;;
    search)
        validate_environment && run_test_suite "Search Functionality" "SearchFunctionality.integration.test.tsx"
        ;;
    coverage)
        generate_coverage_report
        ;;
    performance)
        validate_environment && run_performance_benchmarks
        ;;
    validate)
        validate_environment
        ;;
    clean)
        cleanup
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac