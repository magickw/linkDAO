#!/bin/bash

# Test Environment Setup Script
# Sets up test database and seeds it with fixture data

set -e

echo "🔧 Setting up test environment..."

# Check if required environment variables are set
if [ -z "$TEST_DATABASE_URL" ]; then
    echo "❌ TEST_DATABASE_URL environment variable is not set"
    echo "Please set TEST_DATABASE_URL to your test database connection string"
    exit 1
fi

# Build the project to ensure fixtures are compiled
echo "📦 Building project..."
npm run build

# Run database migrations for test environment
echo "🗄️ Running database migrations..."
npm run db:migrate

# Seed test data
SEED_TYPE=${1:-"default"}
echo "🌱 Seeding test data with type: $SEED_TYPE"
node scripts/seed-test-data.js $SEED_TYPE

echo "✅ Test environment setup completed!"
echo ""
echo "Available seed types:"
echo "  default      - Standard test dataset (50 users, 10 communities, etc.)"
echo "  minimal      - Small dataset for quick testing"
echo "  comprehensive - Large dataset for performance testing"
echo "  clean        - Clean all test data"
echo "  custom       - Custom dataset (usage: ./setup-test-environment.sh custom 100 20 500 1000 50 10)"