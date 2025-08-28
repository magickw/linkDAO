#!/bin/bash

# Test script for LinkDAO backend

echo "Running LinkDAO Backend Tests"
echo "============================="

case "$1" in
  "all")
    echo "Running all tests..."
    npm test
    ;;
  "coverage")
    echo "Running tests with coverage..."
    npm test -- --coverage
    ;;
  "services")
    echo "Running service tests..."
    npm test -- tests/userProfileService.test.ts tests/followService.test.ts tests/postService.test.ts
    ;;
  "ai")
    echo "Running AI service tests..."
    npm test -- src/tests/aiService.test.ts
    ;;
  "watch")
    echo "Running tests in watch mode..."
    npm test -- --watch
    ;;
  *)
    echo "Usage: ./test.sh [all|coverage|services|ai|watch]"
    echo "  all       - Run all tests"
    echo "  coverage  - Run tests with coverage report"
    echo "  services  - Run only service tests"
    echo "  ai        - Run only AI service tests"
    echo "  watch     - Run tests in watch mode"
    ;;
esac