#!/bin/bash

# Test Runner Script for LinkDAO Frontend
# This script runs various test suites for the frontend

echo "Running LinkDAO Frontend Tests"
echo "=============================="

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "npm could not be found. Please install Node.js and npm."
    exit 1
fi

# Navigate to frontend directory
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Parse command line arguments
case "$1" in
  "unit")
    echo "Running unit tests..."
    npm test -- --testPathPattern="src/.*\.test\.(ts|tsx)$" --verbose
    ;;
  "integration")
    echo "Running integration tests..."
    npm test -- --testPathPattern="src/integration/.*\.test\.(ts|tsx)$" --verbose
    ;;
  "e2e")
    echo "Running end-to-end tests..."
    npm test -- --testPathPattern="src/e2e/.*\.test\.(ts|tsx)$" --verbose
    ;;
  "coverage")
    echo "Running tests with coverage..."
    npm test -- --coverage --verbose
    ;;
  "watch")
    echo "Running tests in watch mode..."
    npm test -- --watch
    ;;
  "all" | "")
    echo "Running all tests..."
    npm test -- --verbose
    ;;
  *)
    echo "Usage: ./run-tests.sh [unit|integration|e2e|coverage|watch|all]"
    echo "  unit       - Run unit tests only"
    echo "  integration - Run integration tests only"
    echo "  e2e        - Run end-to-end tests only"
    echo "  coverage   - Run tests with coverage report"
    echo "  watch      - Run tests in watch mode"
    echo "  all        - Run all tests (default)"
    ;;
esac

echo ""
echo "Test execution completed."