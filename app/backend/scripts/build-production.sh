#!/bin/bash

# Memory-optimized production build script for Render
# This script MUST create dist/index.js or the deployment will fail

echo "🚀 Building LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Set memory limits for TypeScript compilation
# With 2GB RAM on Render Standard, we can use more memory
export NODE_OPTIONS="--max-old-space-size=1800"

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
    # Check if this is the real TypeScript build, not a fallback
    if grep -q "Starting LinkDAO Backend (Standalone Mode)" dist/index.js 2>/dev/null; then
        echo "❌ ERROR: dist/index.js contains standalone fallback code!"
        echo "❌ TypeScript compilation must have failed"
        echo "❌ Standalone mode is disabled for production"
        rm -f dist/index.js
        exit 1
    fi

    echo "✅ Build successful!"
    echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
    echo "📊 Total .js files: $(find dist -name '*.js' 2>/dev/null | wc -l)"
    exit 0
else
    echo "❌ TypeScript compilation failed!"
    echo "❌ Standalone fallback mode is DISABLED"
    echo "❌ Build must succeed with proper TypeScript compilation"
    echo "📂 Listing dist directory:"
    ls -la dist/ 2>&1 || echo "dist/ does not exist"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   - Check if tsconfig.production.json exists"
    echo "   - Verify memory settings (NODE_OPTIONS)"
    echo "   - Review TypeScript compilation errors above"
    exit 1
fi
