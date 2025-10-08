#!/bin/bash

# Integration Tests Runner
# Runs integration tests for real data operations

set -e

echo "🧪 Running Integration Tests for Real Data Operations..."

# Check if test database is configured
if [ -z "$TEST_DATABASE_URL" ]; then
    echo "❌ TEST_DATABASE_URL environment variable is not set"
    echo "Please set TEST_DATABASE_URL to your test database connection string"
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build

# Set up test environment
echo "🔧 Setting up test environment..."
./scripts/setup-test-environment.sh minimal

# Run integration tests
echo "🧪 Running integration tests..."
npm test -- --testPathPattern="integration" --verbose

echo "✅ Integration tests completed!"

# Optional: Clean up test data after tests
if [ "$CLEANUP_AFTER_TESTS" = "true" ]; then
    echo "🧹 Cleaning up test data..."
    node scripts/seed-test-data.js clean
fi