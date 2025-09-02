#!/bin/bash

# Comprehensive Test Suite Runner
# Executes the complete test suite with coverage reporting and quality metrics

set -e

echo "🚀 Starting Web3 Marketplace Comprehensive Test Suite"
echo "=================================================="

# Check if required environment variables are set
if [ -z "$NODE_ENV" ]; then
    export NODE_ENV=test
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local host=${3:-localhost}
    
    if nc -z $host $port 2>/dev/null; then
        print_success "$service_name is running on $host:$port"
        return 0
    else
        print_error "$service_name is not running on $host:$port"
        return 1
    fi
}

# Function to start required services
start_services() {
    print_status "Checking required services..."
    
    # Check PostgreSQL
    if ! check_service "PostgreSQL" 5432; then
        print_warning "Starting PostgreSQL..."
        # Add PostgreSQL start command based on your setup
        # brew services start postgresql || systemctl start postgresql
    fi
    
    # Check Redis
    if ! check_service "Redis" 6379; then
        print_warning "Starting Redis..."
        # Add Redis start command based on your setup
        # brew services start redis || systemctl start redis
    fi
    
    # Check if Hardhat node is running for blockchain tests
    if ! check_service "Hardhat Node" 8545; then
        print_warning "Starting Hardhat node..."
        cd ../contracts
        npx hardhat node --port 8545 &
        HARDHAT_PID=$!
        sleep 5
        cd ../backend
    fi
    
    print_success "All required services are running"
}

# Function to setup test database
setup_test_database() {
    print_status "Setting up test database..."
    
    # Create test database if it doesn't exist
    createdb marketplace_test 2>/dev/null || true
    
    # Run migrations
    npm run db:migrate:test
    
    print_success "Test database setup complete"
}

# Function to run smart contract tests
run_contract_tests() {
    print_status "Running smart contract tests..."
    
    cd ../contracts
    
    # Compile contracts
    npx hardhat compile
    
    # Run contract tests with coverage
    npx hardhat coverage --testfiles "test/**/*.test.ts"
    
    # Move coverage report
    mv coverage ../backend/coverage/contracts
    
    cd ../backend
    
    print_success "Smart contract tests completed"
}

# Function to run backend tests
run_backend_tests() {
    print_status "Running backend tests..."
    
    # Run comprehensive test suite
    npm run test:comprehensive
    
    print_success "Backend tests completed"
}

# Function to run frontend tests
run_frontend_tests() {
    print_status "Running frontend tests..."
    
    cd ../frontend
    
    # Run frontend tests with coverage
    npm run test:coverage
    
    # Move coverage report
    mv coverage ../backend/coverage/frontend
    
    cd ../backend
    
    print_success "Frontend tests completed"
}

# Function to run performance tests
run_performance_tests() {
    print_status "Running performance tests..."
    
    # Run load tests with Artillery
    npm run test:performance
    
    print_success "Performance tests completed"
}

# Function to run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    # Run security audit
    npm audit --audit-level moderate
    
    # Run custom security tests
    npm run test:security
    
    print_success "Security tests completed"
}

# Function to generate comprehensive report
generate_report() {
    print_status "Generating comprehensive test report..."
    
    # Run the comprehensive test runner
    node src/tests/comprehensive/testRunner.ts
    
    print_success "Comprehensive test report generated"
}

# Function to cleanup
cleanup() {
    print_status "Cleaning up..."
    
    # Kill Hardhat node if we started it
    if [ ! -z "$HARDHAT_PID" ]; then
        kill $HARDHAT_PID 2>/dev/null || true
    fi
    
    # Clean up test database
    dropdb marketplace_test 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Function to display results summary
display_summary() {
    print_status "Test Execution Summary"
    echo "======================"
    
    if [ -f "test-reports/execution-report-*.json" ]; then
        # Parse and display key metrics from the latest report
        local latest_report=$(ls -t test-reports/execution-report-*.json | head -n1)
        
        echo "📊 Coverage:"
        echo "  - Overall: $(jq -r '.coverage.overall' $latest_report)%"
        echo "  - Smart Contracts: $(jq -r '.coverage.smartContracts' $latest_report)%"
        echo "  - Backend: $(jq -r '.coverage.backend' $latest_report)%"
        echo "  - Frontend: $(jq -r '.coverage.frontend' $latest_report)%"
        
        echo ""
        echo "✅ Quality Metrics:"
        echo "  - Tests Passed: $(jq -r '.qualityMetrics.testsPassed' $latest_report)"
        echo "  - Total Tests: $(jq -r '.qualityMetrics.testsTotal' $latest_report)"
        echo "  - Pass Rate: $(jq -r '.qualityMetrics.passRate' $latest_report)%"
        echo "  - Security Score: $(jq -r '.qualityMetrics.securityScore' $latest_report)"
        echo "  - Critical Issues: $(jq -r '.qualityMetrics.criticalIssues' $latest_report)"
        
        echo ""
        echo "⏱️  Duration: $(jq -r '.duration' $latest_report)ms"
        
        # Display recommendations if any
        local rec_count=$(jq -r '.recommendations | length' $latest_report)
        if [ "$rec_count" -gt 0 ]; then
            echo ""
            echo "💡 Recommendations:"
            jq -r '.recommendations[]' $latest_report | sed 's/^/  - /'
        fi
        
        echo ""
        echo "📁 Artifacts:"
        echo "  - Coverage Report: $(jq -r '.artifacts.coverageReport' $latest_report)"
        echo "  - Performance Report: $(jq -r '.artifacts.performanceReport' $latest_report)"
        echo "  - Security Report: $(jq -r '.artifacts.securityReport' $latest_report)"
        echo "  - Test Results: $(jq -r '.artifacts.testResults' $latest_report)"
    else
        print_warning "No test report found"
    fi
}

# Main execution flow
main() {
    local start_time=$(date +%s)
    
    # Parse command line arguments
    SKIP_SERVICES=false
    SKIP_CONTRACTS=false
    SKIP_FRONTEND=false
    SKIP_PERFORMANCE=false
    SKIP_SECURITY=false
    VERBOSE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-services)
                SKIP_SERVICES=true
                shift
                ;;
            --skip-contracts)
                SKIP_CONTRACTS=true
                shift
                ;;
            --skip-frontend)
                SKIP_FRONTEND=true
                shift
                ;;
            --skip-performance)
                SKIP_PERFORMANCE=true
                shift
                ;;
            --skip-security)
                SKIP_SECURITY=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-services     Skip service startup checks"
                echo "  --skip-contracts    Skip smart contract tests"
                echo "  --skip-frontend     Skip frontend tests"
                echo "  --skip-performance  Skip performance tests"
                echo "  --skip-security     Skip security tests"
                echo "  --verbose           Enable verbose output"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Set verbose mode
    if [ "$VERBOSE" = true ]; then
        set -x
    fi
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Create necessary directories
    mkdir -p coverage/{contracts,backend,frontend}
    mkdir -p test-reports
    mkdir -p test-artifacts
    
    # Start services if not skipped
    if [ "$SKIP_SERVICES" = false ]; then
        start_services
        setup_test_database
    fi
    
    # Run test suites
    if [ "$SKIP_CONTRACTS" = false ]; then
        run_contract_tests
    fi
    
    run_backend_tests
    
    if [ "$SKIP_FRONTEND" = false ]; then
        run_frontend_tests
    fi
    
    if [ "$SKIP_PERFORMANCE" = false ]; then
        run_performance_tests
    fi
    
    if [ "$SKIP_SECURITY" = false ]; then
        run_security_tests
    fi
    
    # Generate comprehensive report
    generate_report
    
    # Calculate total execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    print_success "Comprehensive test suite completed in ${duration}s"
    
    # Display summary
    display_summary
    
    echo ""
    print_success "All tests completed successfully! 🎉"
}

# Run main function with all arguments
main "$@"