#!/bin/bash

# API Test Runner for Follow System and Feed Integration
# This script runs all API tests for the backend

set -e

echo "🧪 LinkDAO Backend API Tests"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backend is running
echo "📡 Checking backend server..."
if curl -s http://localhost:10000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend server is running on port 10000${NC}"
else
    echo -e "${RED}✗ Backend server is not running!${NC}"
    echo "Please start the backend server first:"
    echo "  cd app/backend && npm run dev"
    exit 1
fi

echo ""

# Set test environment variables
export TEST_API_URL="http://localhost:10000"
export NODE_ENV="test"

# Check if specific test suite is requested
TEST_SUITE=${1:-"all"}

echo "🚀 Running API Tests..."
echo ""

case "$TEST_SUITE" in
    "follow")
        echo "Running Follow System Tests..."
        npm test -- src/tests/api/followSystem.test.ts
        ;;

    "feed")
        echo "Running Feed System Tests..."
        npm test -- src/tests/api/feedSystem.test.ts
        ;;

    "integration")
        echo "Running Follow + Feed Integration Tests..."
        npm test -- src/tests/api/followFeedIntegration.test.ts
        ;;

    "all")
        echo "Running All API Tests..."
        npm test -- src/tests/api/followSystem.test.ts
        echo ""
        npm test -- src/tests/api/feedSystem.test.ts
        echo ""
        npm test -- src/tests/api/followFeedIntegration.test.ts
        ;;

    *)
        echo -e "${RED}Unknown test suite: $TEST_SUITE${NC}"
        echo "Usage: $0 [follow|feed|integration|all]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓ API Tests Complete!${NC}"
