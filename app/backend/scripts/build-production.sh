#!/bin/bash

# Production build script for environment with 4GB RAM
# Use available memory for efficient compilation

echo "🚀 Preparing LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Clean up old build artifacts to prevent cache issues
echo "🧹 Cleaning old build artifacts..."
rm -rf dist

# Create fresh dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

echo "🔨 Compiling TypeScript to JavaScript with SWC..."
# Use SWC for fast compilation (10-30x faster than TSC)
npx swc src -d dist --copy-files --strip-leading-paths
swc_result=$?

if [ $swc_result -eq 0 ]; then
    echo "✅ SWC compilation completed!"
else
    echo "⚠️  SWC compilation failed, falling back to TypeScript compiler..."
    # Fallback to TSC if SWC fails
    NODE_OPTIONS="--max-old-space-size=3500" npx tsc --project tsconfig.production.json --noEmitOnError false
    tsc_result=$?
    
    if [ $tsc_result -ne 0 ]; then
        echo "⚠️  TypeScript compilation had errors but continuing..."
    else
        echo "✅ TypeScript compilation completed!"
    fi
fi

# The compilation should have created dist/index.js from src/index.ts
# Make sure it's executable
if [ -f "dist/index.js" ]; then
    chmod +x dist/index.js
    echo "✅ Production build completed!"
    echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
    echo "🎯 Ready to run with: node dist/index.js"
else
    echo "❌ Compilation did not produce dist/index.js"
    exit 1
fi

exit 0
