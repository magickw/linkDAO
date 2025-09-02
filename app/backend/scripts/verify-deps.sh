#!/bin/bash

# Dependency verification script for Render deployment
# Checks for all required dependencies mentioned in memory

echo "🔍 Verifying backend dependencies..."

# Required dependencies from memory
REQUIRED_DEPS=(
    "postgres"
    "ethers" 
    "express-validator"
    "axios"
    "express"
    "cors"
    "helmet"
)

REQUIRED_TYPE_DEPS=(
    "@types/cors"
    "@types/express"
    "@types/node"
)

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi

echo "📋 Checking required runtime dependencies..."
for dep in "${REQUIRED_DEPS[@]}"; do
    if npm list "$dep" >/dev/null 2>&1; then
        echo "✅ $dep - installed"
    else
        echo "⚠️  $dep - missing or not properly installed"
    fi
done

echo "📋 Checking required type dependencies..."
for dep in "${REQUIRED_TYPE_DEPS[@]}"; do
    if npm list "$dep" >/dev/null 2>&1; then
        echo "✅ $dep - installed"
    else
        echo "⚠️  $dep - missing or not properly installed"
    fi
done

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_NODE="18.0.0"

echo "📋 Checking Node.js version..."
echo "Current: $NODE_VERSION"
echo "Required: >=$REQUIRED_NODE"

# Basic syntax check for TypeScript
echo "📋 Checking TypeScript availability..."
if npx tsc --version >/dev/null 2>&1; then
    echo "✅ TypeScript available: $(npx tsc --version)"
else
    echo "⚠️  TypeScript not available"
fi

# Check for critical source files
echo "📋 Checking source files..."
if [ -f "src/index.ts" ]; then
    echo "✅ src/index.ts exists"
else
    echo "⚠️  src/index.ts missing"
fi

if [ -f "tsconfig.json" ]; then
    echo "✅ tsconfig.json exists"
else
    echo "⚠️  tsconfig.json missing"
fi

if [ -f "tsconfig.prod.json" ]; then
    echo "✅ tsconfig.prod.json exists"
else
    echo "⚠️  tsconfig.prod.json missing"
fi

echo "🔍 Dependency verification completed"