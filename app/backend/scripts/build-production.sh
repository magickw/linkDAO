#!/bin/bash

# Production build script for Render Standard (2GB RAM)
# Minimal build to avoid memory issues

echo "🚀 Preparing LinkDAO Backend for Production"
echo "Environment: ${NODE_ENV:-production}"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Compile TypeScript to JavaScript
echo "🔨 Compiling TypeScript to JavaScript..."
npm run build:tsc
if [ $? -ne 0 ]; then
    echo "❌ TypeScript compilation failed"
    exit 1
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
