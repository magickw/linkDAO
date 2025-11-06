#!/bin/bash

# Memory-optimized production build script for Render
# This script MUST create dist/index.js or the deployment will fail

echo "🚀 Building LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Set memory limits for TypeScript compilation
export NODE_OPTIONS="--max-old-space-size=1400 --optimize-for-size --gc-interval=100"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Clean any previous build artifacts to free memory
echo "🧹 Cleaning previous build artifacts..."
rm -rf dist/* 2>/dev/null || true
rm -f dist/.tsbuildinfo 2>/dev/null || true

# Run TypeScript compilation with memory optimization
echo "🔨 Compiling TypeScript with memory optimization..."
echo "Memory settings: $NODE_OPTIONS"

# Use production TypeScript config with memory optimizations
npx tsc --project tsconfig.production.json 2>&1 || true

# Verify the build succeeded
if [ -f "dist/index.js" ]; then
    echo "✅ Build successful!"
    echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
    echo "📊 Total .js files: $(find dist -name '*.js' 2>/dev/null | wc -l)"
    exit 0
else
    echo "❌ TypeScript compilation failed - trying chunked compilation..."
    
    # Try chunked compilation
    if command -v jq >/dev/null 2>&1; then
        echo "🔄 Attempting chunked compilation..."
        bash scripts/build-production-chunked.sh
        if [ -f "dist/index.js" ]; then
            echo "✅ Chunked compilation successful!"
            exit 0
        fi
    else
        echo "⚠️  jq not available, skipping chunked compilation"
    fi
    
    echo "🔄 Attempting fallback compilation..."
    bash scripts/build-production-fallback.sh
    
    if [ -f "dist/index.js" ]; then
        echo "✅ Fallback build successful!"
        exit 0
    else
        echo "❌ All build methods failed!"
        echo "📂 Listing dist directory:"
        ls -la dist/ 2>&1 || echo "dist/ does not exist"
        exit 1
    fi
fi
