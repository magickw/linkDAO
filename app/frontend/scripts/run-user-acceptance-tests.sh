#!/bin/bash

# User Acceptance Test Execution Script for Web3 Native Community Enhancements
# This script runs comprehensive user acceptance tests including Web3 workflows,
# mobile compatibility, cross-browser testing, and performance validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TIMEOUT=300000  # 5 minutes
COVERAGE_THRESHOLD=80
PERFORMANCE_THRESHOLD=100  # ms

echo -e "${BLUE}🧪 Web3 Native Community Enhancements - User Acceptance Testing${NC}"
echo "=================================================================="

# Check prerequisites
echo -e "\n${YELLOW}📋 Checking prerequisites...${NC}"

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

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Create test reports directory
mkdir -p test-reports/user-acceptance

echo -e "${GREEN}✅ Prerequisites check completed${NC}"

# Function to run individual test suite
run_test_suite() {
    local test_name=$1
    local test_file=$2
    local description=$3
    
    echo -e "\n${BLUE}🧪 Running ${test_name}...${NC}"
    echo -e "${YELLOW}📝 ${description}${NC}"
    
    local start_time=$(date +%s)
    
    if npm run test -- --testPathPattern="${test_file}" --coverage --coverageDirectory="test-reports/user-acceptance/coverage-${test_name,,}" --testTimeout=${TEST_TIMEOUT} --verbose; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${GREEN}✅ ${test_name} completed successfully in ${duration}s${NC}"
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        echo -e "${RED}❌ ${test_name} failed after ${duration}s${NC}"
        return 1
    fi
}

# Function to check Web3 test environment
setup_web3_test_environment() {
    echo -e "\n${YELLOW}🔧 Setting up Web3 test environment...${NC}"
    
    # Check if test wallet is configured
    if [ -z "$TEST_WALLET_PRIVATE_KEY" ]; then
        echo -e "${YELLOW}⚠️  TEST_WALLET_PRIVATE_KEY not set, using default test wallet${NC}"
        export TEST_WALLET_PRIVATE_KEY="0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    fi
    
    # Check if test RPC URL is configured
    if [ -z "$TEST_RPC_URL" ]; then
        echo -e "${YELLOW}⚠️  TEST_RPC_URL not set, using local hardhat network${NC}"
        export TEST_RPC_URL="http://localhost:8545"
    fi
    
    # Set test network configuration
    export TEST_NETWORK_ID="31337"
    export TEST_CHAIN_ID="0x7a69"
    
    echo -e "${GREEN}✅ Web3 test environment configured${NC}"
}

# Function to setup mobile testing environment
setup_mobile_test_environment() {
    echo -e "\n${YELLOW}📱 Setting up mobile test environment...${NC}"
    
    # Configure mobile viewports for testing
    export MOBILE_VIEWPORTS="iphone12,iphone12Mini,iphone12Pro,iphone12ProMax,galaxyS21,galaxyS21Ultra,pixel5,ipadMini,ipadAir,ipadPro"
    
    # Enable touch event simulation
    export ENABLE_TOUCH_EVENTS="true"
    
    # Configure mobile-specific test settings
    export MOBILE_TEST_TIMEOUT="60000"
    export MOBILE_PERFORMANCE_THRESHOLD="200"
    
    echo -e "${GREEN}✅ Mobile test environment configured${NC}"
}

# Function to setup cross-browser testing
setup_browser_test_environment() {
    echo -e "\n${YELLOW}🌐 Setting up cross-browser test environment...${NC}"
    
    # Configure browser list for testing
    export BROWSER_LIST="chrome,firefox,safari,edge,mobileSafari,mobileChrome"
    
    # Configure Web3 provider list
    export WEB3_PROVIDER_LIST="metamask,walletConnect,coinbaseWallet,brave"
    
    # Set browser-specific timeouts
    export BROWSER_TEST_TIMEOUT="120000"
    
    echo -e "${GREEN}✅ Cross-browser test environment configured${NC}"
}

# Function to setup performance testing
setup_performance_test_environment() {
    echo -e "\n${YELLOW}⚡ Setting up performance test environment...${NC}"
    
    # Configure performance thresholds
    export RENDER_TIME_THRESHOLD="100"
    export WEB3_LOAD_TIME_THRESHOLD="200"
    export MEMORY_USAGE_THRESHOLD="50000000"  # 50MB
    export FPS_THRESHOLD="55"  # Minimum 55 FPS
    
    # Enable performance monitoring
    export ENABLE_PERFORMANCE_MONITORING="true"
    
    # Configure test data sizes
    export LARGE_DATASET_SIZE="1000"
    export MEDIUM_DATASET_SIZE="100"
    export SMALL_DATASET_SIZE="10"
    
    echo -e "${GREEN}✅ Performance test environment configured${NC}"
}

# Main test execution
main() {
    local failed_tests=0
    local total_tests=0
    
    # Setup test environments
    setup_web3_test_environment
    setup_mobile_test_environment
    setup_browser_test_environment
    setup_performance_test_environment
    
    echo -e "\n${BLUE}🚀 Starting User Acceptance Test Execution${NC}"
    echo "=================================================="
    
    # Test Suite 1: Web3 User Journey Tests
    echo -e "\n${BLUE}📋 Test Suite 1: Web3 User Journey Tests${NC}"
    if run_test_suite "Web3UserJourneyTests" "Web3UserJourneyTests.test.tsx" "Testing complete Web3 user workflows with real wallets and test tokens"; then
        ((total_tests++))
    else
        ((total_tests++))
        ((failed_tests++))
    fi
    
    # Test Suite 2: Mobile Compatibility Tests
    echo -e "\n${BLUE}📋 Test Suite 2: Mobile Compatibility Tests${NC}"
    if run_test_suite "MobileCompatibilityTests" "MobileCompatibilityTests.test.tsx" "Testing mobile device compatibility across different screen sizes"; then
        ((total_tests++))
    else
        ((total_tests++))
        ((failed_tests++))
    fi
    
    # Test Suite 3: Cross-Browser Compatibility Tests
    echo -e "\n${BLUE}📋 Test Suite 3: Cross-Browser Compatibility Tests${NC}"
    if run_test_suite "CrossBrowserCompatibilityTests" "CrossBrowserCompatibilityTests.test.tsx" "Testing compatibility across different browsers and Web3 providers"; then
        ((total_tests++))
    else
        ((total_tests++))
        ((failed_tests++))
    fi
    
    # Test Suite 4: Performance Optimization Tests
    echo -e "\n${BLUE}📋 Test Suite 4: Performance Optimization Tests${NC}"
    if run_test_suite "PerformanceOptimizationTests" "PerformanceOptimizationTests.test.tsx" "Testing performance metrics and optimization strategies"; then
        ((total_tests++))
    else
        ((total_tests++))
        ((failed_tests++))
    fi
    
    # Generate comprehensive report
    echo -e "\n${YELLOW}📊 Generating comprehensive test report...${NC}"
    
    # Run the test runner to generate final report
    if command -v ts-node &> /dev/null; then
        ts-node src/__tests__/user-acceptance/UserAcceptanceTestRunner.ts
    else
        npx ts-node src/__tests__/user-acceptance/UserAcceptanceTestRunner.ts
    fi
    
    # Display final results
    echo -e "\n${'='*80}"
    echo -e "${BLUE}🎯 USER ACCEPTANCE TEST SUMMARY${NC}"
    echo -e "${'='*80}"
    
    echo -e "\n📊 Overall Results:"
    echo -e "   Total Test Suites: ${total_tests}"
    echo -e "   ✅ Passed: $((total_tests - failed_tests))"
    echo -e "   ❌ Failed: ${failed_tests}"
    
    if [ ${failed_tests} -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All user acceptance tests passed!${NC}"
        echo -e "${GREEN}✅ Web3 Native Community Enhancements are ready for production deployment.${NC}"
        
        # Generate deployment readiness report
        echo -e "\n${YELLOW}📋 Generating deployment readiness report...${NC}"
        cat > test-reports/user-acceptance/deployment-readiness.md << EOF
# Deployment Readiness Report

## Web3 Native Community Enhancements - User Acceptance Testing

**Date:** $(date)
**Status:** ✅ READY FOR DEPLOYMENT

### Test Results Summary

- **Total Test Suites:** ${total_tests}
- **Passed:** $((total_tests - failed_tests))
- **Failed:** ${failed_tests}
- **Success Rate:** $(( (total_tests - failed_tests) * 100 / total_tests ))%

### Test Coverage

1. ✅ **Web3 User Journey Tests** - Complete user workflows tested with real wallets
2. ✅ **Mobile Compatibility Tests** - All target devices and screen sizes validated
3. ✅ **Cross-Browser Compatibility Tests** - All major browsers and Web3 providers tested
4. ✅ **Performance Optimization Tests** - Performance metrics meet all thresholds

### Deployment Recommendations

- All user acceptance criteria have been met
- Web3 functionality is fully tested and validated
- Mobile experience is optimized for all target devices
- Cross-browser compatibility is confirmed
- Performance benchmarks are exceeded

### Next Steps

1. Deploy to staging environment
2. Conduct final smoke tests
3. Deploy to production
4. Monitor performance metrics post-deployment

---
*Generated by User Acceptance Test Suite*
EOF
        
        echo -e "${GREEN}📄 Deployment readiness report saved to test-reports/user-acceptance/deployment-readiness.md${NC}"
        
    else
        echo -e "\n${RED}⚠️  ${failed_tests} test suite(s) failed.${NC}"
        echo -e "${RED}❌ Please review the errors and fix before deployment.${NC}"
        
        # Generate failure report
        cat > test-reports/user-acceptance/failure-report.md << EOF
# Test Failure Report

## Web3 Native Community Enhancements - User Acceptance Testing

**Date:** $(date)
**Status:** ❌ NOT READY FOR DEPLOYMENT

### Failed Test Suites: ${failed_tests}

Please review the detailed test logs and fix the failing tests before proceeding with deployment.

### Required Actions

1. Review test failure logs in test-reports/user-acceptance/
2. Fix failing tests
3. Re-run user acceptance test suite
4. Ensure all tests pass before deployment

---
*Generated by User Acceptance Test Suite*
EOF
    fi
    
    echo -e "\n${YELLOW}📊 Test reports available in: test-reports/user-acceptance/${NC}"
    echo -e "${YELLOW}📄 HTML report: test-reports/user-acceptance/user-acceptance-report.html${NC}"
    
    # Cleanup
    echo -e "\n${YELLOW}🧹 Cleaning up test environment...${NC}"
    
    # Archive old reports (keep last 5)
    if [ -d "test-reports/user-acceptance/archive" ]; then
        find test-reports/user-acceptance/archive -name "*.json" -type f | sort -r | tail -n +6 | xargs rm -f
    else
        mkdir -p test-reports/user-acceptance/archive
    fi
    
    # Move current report to archive
    if [ -f "test-reports/user-acceptance/latest-user-acceptance-report.json" ]; then
        cp test-reports/user-acceptance/latest-user-acceptance-report.json test-reports/user-acceptance/archive/report-$(date +%Y%m%d-%H%M%S).json
    fi
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
    
    # Exit with appropriate code
    if [ ${failed_tests} -eq 0 ]; then
        echo -e "\n${GREEN}🎉 User Acceptance Testing completed successfully!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ User Acceptance Testing failed. Please fix the issues and re-run.${NC}"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    "web3")
        setup_web3_test_environment
        run_test_suite "Web3UserJourneyTests" "Web3UserJourneyTests.test.tsx" "Testing Web3 user workflows"
        ;;
    "mobile")
        setup_mobile_test_environment
        run_test_suite "MobileCompatibilityTests" "MobileCompatibilityTests.test.tsx" "Testing mobile compatibility"
        ;;
    "browser")
        setup_browser_test_environment
        run_test_suite "CrossBrowserCompatibilityTests" "CrossBrowserCompatibilityTests.test.tsx" "Testing cross-browser compatibility"
        ;;
    "performance")
        setup_performance_test_environment
        run_test_suite "PerformanceOptimizationTests" "PerformanceOptimizationTests.test.tsx" "Testing performance optimization"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [test-suite]"
        echo ""
        echo "Test Suites:"
        echo "  web3        Run Web3 user journey tests only"
        echo "  mobile      Run mobile compatibility tests only"
        echo "  browser     Run cross-browser compatibility tests only"
        echo "  performance Run performance optimization tests only"
        echo "  help        Show this help message"
        echo ""
        echo "Run without arguments to execute all test suites."
        ;;
    *)
        main
        ;;
esac