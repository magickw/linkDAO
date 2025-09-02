#!/bin/bash

# CI/CD Setup Script
# Prepares the environment for continuous integration testing

set -e

echo "🔧 Setting up CI/CD environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[CI-SETUP]${NC} $1"
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

# Function to check if running in CI environment
is_ci() {
    [ "$CI" = "true" ] || [ "$GITHUB_ACTIONS" = "true" ] || [ "$JENKINS_URL" != "" ]
}

# Function to setup environment variables
setup_env_vars() {
    print_status "Setting up environment variables..."
    
    # Set default values for CI
    export NODE_ENV=${NODE_ENV:-test}
    export LOG_LEVEL=${LOG_LEVEL:-error}
    export TEST_MODE=${TEST_MODE:-ci}
    
    # Database configuration
    export TEST_DB_HOST=${TEST_DB_HOST:-localhost}
    export TEST_DB_PORT=${TEST_DB_PORT:-5432}
    export TEST_DB_NAME=${TEST_DB_NAME:-marketplace_test}
    export TEST_DB_USER=${TEST_DB_USER:-test}
    export TEST_DB_PASSWORD=${TEST_DB_PASSWORD:-test}
    
    # Redis configuration
    export TEST_REDIS_HOST=${TEST_REDIS_HOST:-localhost}
    export TEST_REDIS_PORT=${TEST_REDIS_PORT:-6379}
    
    # Blockchain configuration
    export TEST_BLOCKCHAIN_URL=${TEST_BLOCKCHAIN_URL:-http://localhost:8545}
    export TEST_CHAIN_ID=${TEST_CHAIN_ID:-31337}
    
    # Performance test configuration
    export PERF_TEST_DURATION=${PERF_TEST_DURATION:-60000}
    export MAX_CONCURRENT_USERS=${MAX_CONCURRENT_USERS:-50}
    
    # E2E test configuration
    export E2E_BASE_URL=${E2E_BASE_URL:-http://localhost:3000}
    export E2E_HEADLESS=${E2E_HEADLESS:-true}
    
    print_success "Environment variables configured"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install Node.js dependencies
    if [ -f "package.json" ]; then
        if is_ci; then
            npm ci --silent
        else
            npm install --silent
        fi
        print_success "Node.js dependencies installed"
    fi
    
    # Install additional CI tools
    if is_ci; then
        # Install global tools needed for CI
        npm install -g @playwright/test artillery jest-junit
        print_success "CI tools installed"
    fi
}

# Function to setup test databases
setup_test_database() {
    print_status "Setting up test database..."
    
    # Wait for PostgreSQL to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" >/dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi
        
        print_status "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "PostgreSQL is not ready after $max_attempts attempts"
        return 1
    fi
    
    # Create test database if it doesn't exist
    createdb -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" "$TEST_DB_NAME" 2>/dev/null || true
    
    # Run database migrations
    npm run db:migrate:test
    
    print_success "Test database setup complete"
}

# Function to setup Redis
setup_redis() {
    print_status "Setting up Redis..."
    
    # Wait for Redis to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if redis-cli -h "$TEST_REDIS_HOST" -p "$TEST_REDIS_PORT" ping >/dev/null 2>&1; then
            print_success "Redis is ready"
            break
        fi
        
        print_status "Waiting for Redis... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        print_error "Redis is not ready after $max_attempts attempts"
        return 1
    fi
    
    # Clear Redis cache
    redis-cli -h "$TEST_REDIS_HOST" -p "$TEST_REDIS_PORT" FLUSHALL >/dev/null
    
    print_success "Redis setup complete"
}

# Function to setup blockchain environment
setup_blockchain() {
    print_status "Setting up blockchain environment..."
    
    # Check if Hardhat node is running
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$TEST_BLOCKCHAIN_URL" >/dev/null 2>&1; then
        print_success "Blockchain node is ready"
    else
        print_warning "Blockchain node is not running, tests may fail"
    fi
}

# Function to create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p coverage/{contracts,backend,frontend}
    mkdir -p test-reports
    mkdir -p test-artifacts
    mkdir -p logs
    
    print_success "Directories created"
}

# Function to setup test data
setup_test_data() {
    print_status "Setting up test data..."
    
    # Generate test accounts if not provided
    if [ -z "$TEST_ACCOUNTS" ]; then
        export TEST_ACCOUNTS="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80,0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    fi
    
    # Seed test data if needed
    if [ -f "scripts/seed-test-data.js" ]; then
        node scripts/seed-test-data.js
        print_success "Test data seeded"
    fi
}

# Function to validate setup
validate_setup() {
    print_status "Validating setup..."
    
    local errors=0
    
    # Check Node.js version
    if ! node --version | grep -q "v18\|v20"; then
        print_error "Node.js version 18+ required"
        errors=$((errors + 1))
    fi
    
    # Check npm dependencies
    if ! npm list --depth=0 >/dev/null 2>&1; then
        print_error "npm dependencies not properly installed"
        errors=$((errors + 1))
    fi
    
    # Check database connection
    if ! pg_isready -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -U "$TEST_DB_USER" >/dev/null 2>&1; then
        print_error "Cannot connect to test database"
        errors=$((errors + 1))
    fi
    
    # Check Redis connection
    if ! redis-cli -h "$TEST_REDIS_HOST" -p "$TEST_REDIS_PORT" ping >/dev/null 2>&1; then
        print_error "Cannot connect to Redis"
        errors=$((errors + 1))
    fi
    
    # Check required directories
    for dir in coverage test-reports test-artifacts; do
        if [ ! -d "$dir" ]; then
            print_error "Directory $dir does not exist"
            errors=$((errors + 1))
        fi
    done
    
    if [ $errors -eq 0 ]; then
        print_success "Setup validation passed"
        return 0
    else
        print_error "Setup validation failed with $errors errors"
        return 1
    fi
}

# Function to cleanup previous test runs
cleanup_previous_runs() {
    print_status "Cleaning up previous test runs..."
    
    # Remove old coverage reports
    rm -rf coverage/*
    
    # Remove old test reports
    rm -rf test-reports/*
    
    # Remove old test artifacts
    rm -rf test-artifacts/*
    
    # Clear logs
    rm -rf logs/*
    
    print_success "Cleanup complete"
}

# Function to setup code coverage
setup_coverage() {
    print_status "Setting up code coverage..."
    
    # Install coverage tools if not already installed
    if ! npm list nyc >/dev/null 2>&1; then
        npm install --save-dev nyc
    fi
    
    if ! npm list @istanbuljs/nyc-config-typescript >/dev/null 2>&1; then
        npm install --save-dev @istanbuljs/nyc-config-typescript
    fi
    
    print_success "Code coverage setup complete"
}

# Function to setup security scanning
setup_security_scanning() {
    print_status "Setting up security scanning..."
    
    # Install security audit tools
    if ! command -v audit-ci >/dev/null 2>&1; then
        npm install -g audit-ci
    fi
    
    # Setup Snyk if token is available
    if [ -n "$SNYK_TOKEN" ]; then
        if ! command -v snyk >/dev/null 2>&1; then
            npm install -g snyk
        fi
        snyk auth "$SNYK_TOKEN"
        print_success "Snyk authentication configured"
    fi
    
    print_success "Security scanning setup complete"
}

# Function to display setup summary
display_summary() {
    print_status "Setup Summary"
    echo "=============="
    echo "Environment: $NODE_ENV"
    echo "Test Mode: $TEST_MODE"
    echo "Database: $TEST_DB_HOST:$TEST_DB_PORT/$TEST_DB_NAME"
    echo "Redis: $TEST_REDIS_HOST:$TEST_REDIS_PORT"
    echo "Blockchain: $TEST_BLOCKCHAIN_URL"
    echo "E2E URL: $E2E_BASE_URL"
    echo "Max Users: $MAX_CONCURRENT_USERS"
    echo "Test Duration: $PERF_TEST_DURATION ms"
    echo ""
    
    if is_ci; then
        echo "Running in CI environment"
    else
        echo "Running in local environment"
    fi
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    print_status "Starting CI/CD setup..."
    
    # Parse command line arguments
    SKIP_DB=false
    SKIP_REDIS=false
    SKIP_BLOCKCHAIN=false
    VERBOSE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --skip-redis)
                SKIP_REDIS=true
                shift
                ;;
            --skip-blockchain)
                SKIP_BLOCKCHAIN=true
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
                echo "  --skip-db         Skip database setup"
                echo "  --skip-redis      Skip Redis setup"
                echo "  --skip-blockchain Skip blockchain setup"
                echo "  --verbose         Enable verbose output"
                echo "  --help            Show this help message"
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
    
    # Execute setup steps
    setup_env_vars
    create_directories
    cleanup_previous_runs
    install_dependencies
    setup_coverage
    setup_security_scanning
    
    if [ "$SKIP_DB" = false ]; then
        setup_test_database
    fi
    
    if [ "$SKIP_REDIS" = false ]; then
        setup_redis
    fi
    
    if [ "$SKIP_BLOCKCHAIN" = false ]; then
        setup_blockchain
    fi
    
    setup_test_data
    
    # Validate setup
    if validate_setup; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        display_summary
        print_success "CI/CD setup completed successfully in ${duration}s"
        exit 0
    else
        print_error "CI/CD setup failed"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"