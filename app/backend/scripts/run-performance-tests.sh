#!/bin/bash

# Performance Tests Runner
# Runs comprehensive performance tests for real data operations

set -e

echo "🚀 Running Performance Tests for Real Data Operations..."

# Check if test database is configured
if [ -z "$TEST_DATABASE_URL" ]; then
    echo "❌ TEST_DATABASE_URL environment variable is not set"
    echo "Please set TEST_DATABASE_URL to your test database connection string"
    exit 1
fi

# Check if we should expose garbage collection
if [ "$ENABLE_GC" = "true" ]; then
    echo "🗑️ Enabling garbage collection for memory tests..."
    export NODE_OPTIONS="--expose-gc"
fi

# Build the project
echo "📦 Building project..."
npm run build

# Set up comprehensive test environment for performance testing
echo "🔧 Setting up comprehensive test environment..."
./scripts/setup-test-environment.sh comprehensive

# Run performance tests with increased timeout
echo "🧪 Running performance tests..."
npm test -- --testPathPattern="performance" --verbose --testTimeout=60000

# Generate performance report
echo "📊 Generating performance report..."
node scripts/generate-performance-report.js

echo "✅ Performance tests completed!"

# Optional: Clean up test data after tests
if [ "$CLEANUP_AFTER_TESTS" = "true" ]; then
    echo "🧹 Cleaning up test data..."
    node scripts/seed-test-data.js clean
fi