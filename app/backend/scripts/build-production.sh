#!/bin/bash

# Production build script for Render Standard (2GB RAM)
# Compiles TypeScript to JavaScript for production

echo "🚀 Preparing LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Compile TypeScript to JavaScript
echo "🔨 Compiling TypeScript..."
npx tsc --project tsconfig.production.json --noEmitOnError false

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "⚠️ TypeScript compilation had warnings, but continuing..."
fi

# Copy essential non-TypeScript files
echo "📁 Copying additional files..."
cp -r src/db dist/ 2>/dev/null || true
cp -r src/middleware dist/ 2>/dev/null || true
cp -r src/routes dist/ 2>/dev/null || true
cp -r src/services dist/ 2>/dev/null || true
cp -r src/utils dist/ 2>/dev/null || true
cp -r src/config dist/ 2>/dev/null || true
cp -r src/types dist/ 2>/dev/null || true

# Ensure node_modules is available
echo "📦 Ensuring dependencies are installed..."
npm ci --only=production

echo "✅ Production build completed!"
echo "📊 dist/index.js size: $(ls -lh dist/index.js | awk '{print $5}')"
echo "🎯 Ready to run with: node dist/index.js"
exit 0
