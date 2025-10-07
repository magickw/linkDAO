#!/bin/bash

# Infrastructure Tests Runner Script
# Runs comprehensive tests for caching strategies, API endpoints, WebSocket, and database operations

set -e

echo "🚀 Starting Infrastructure Tests Suite"
echo "======================================"

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

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the backend directory"
    exit 1
fi

# Check if Node.js and npm are available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

# Install dependencies if needed
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Create test environment file if it doesn't exist
if [ ! -f ".env.test" ]; then
    print_status "Creating test environment file..."
    cat > .env.test << EOF
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test_db
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret
FRONTEND_URL=http://localhost:3000
VERBOSE_TESTS=false
EOF
    print_success "Created .env.test file"
fi

# Function to run specific test category
run_test_category() {
    local category=$1
    local description=$2
    
    print_status "Running $description..."
    
    if npm run test:infrastructure:$category; then
        print_success "$description completed successfully"
        return 0
    else
        print_error "$description failed"
        return 1
    fi
}

# Parse command line arguments
CATEGORY=${1:-"all"}
VERBOSE=${2:-"false"}

if [ "$VERBOSE" = "true" ] || [ "$VERBOSE" = "--verbose" ]; then
    export VERBOSE_TESTS=true
fi

case $CATEGORY in
    "cache")
        print_status "Running Cache Tests Only"
        run_test_category "cache" "Service Worker Cache Tests"
        ;;
    "api")
        print_status "Running API Tests Only"
        run_test_category "api" "API Endpoints Integration Tests"
        ;;
    "websocket")
        print_status "Running WebSocket Tests Only"
        run_test_category "websocket" "WebSocket Service Tests"
        ;;
    "database")
        print_status "Running Database Tests Only"
        run_test_category "database" "Database Operations Tests"
        ;;
    "all"|*)
        print_status "Running All Infrastructure Tests"
        
        # Track test results
        FAILED_TESTS=()
        
        # Run cache tests
        if ! run_test_category "cache" "Service Worker Cache Tests"; then
            FAILED_TESTS+=("cache")
        fi
        
        # Run API tests
        if ! run_test_category "api" "API Endpoints Integration Tests"; then
            FAILED_TESTS+=("api")
        fi
        
        # Run WebSocket tests
        if ! run_test_category "websocket" "WebSocket Service Tests"; then
            FAILED_TESTS+=("websocket")
        fi
        
        # Run database tests
        if ! run_test_category "database" "Database Operations Tests"; then
            FAILED_TESTS+=("database")
        fi
        
        # Print final summary
        echo ""
        echo "📊 Infrastructure Tests Summary"
        echo "==============================="
        
        if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
            print_success "All infrastructure tests passed! 🎉"
            print_success "Infrastructure is ready for production use."
            exit 0
        else
            print_error "Some infrastructure tests failed:"
            for test in "${FAILED_TESTS[@]}"; do
                echo "  - $test"
            done
            print_error "Please review and fix the failing tests before proceeding."
            exit 1
        fi
        ;;
esac

echo ""
print_success "Infrastructure tests completed!"