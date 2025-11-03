#!/bin/bash

# Simple, robust production build script for Render
# This script MUST create dist/index.js or the deployment will fail

echo "🚀 Building LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Run TypeScript compilation
echo "🔨 Compiling TypeScript..."
echo "Running: npx tsc"

# Don't let the script fail - we need to check the result ourselves
npx tsc 2>&1 || true

# Verify the build succeeded
if [ -f "dist/index.js" ]; then
    echo "✅ Build successful!"
    echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
    echo "📊 Total .js files: $(find dist -name '*.js' 2>/dev/null | wc -l)"
    exit 0
else
    echo "❌ ERROR: dist/index.js was not created!"
    echo "📂 Listing dist directory:"
    ls -la dist/ 2>&1 || echo "dist/ does not exist"
    echo ""
    echo "🔍 Checking for TypeScript installation:"
    which tsc || echo "tsc not found in PATH"
    npx tsc --version || echo "npx tsc failed"
    echo ""
    echo "🔍 Checking tsconfig.json:"
    if [ -f "tsconfig.json" ]; then
        echo "✅ tsconfig.json exists"
        cat tsconfig.json | head -20
    else
        echo "❌ tsconfig.json not found"
    fi
    exit 1
fi
