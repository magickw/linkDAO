#!/bin/bash

# Production deployment script for Render
# This script handles the build process with memory optimization

set -e

echo "🚀 Starting LinkDAO backend deployment..."

# Set memory limits for Node.js
export NODE_OPTIONS="--max-old-space-size=3072"

# Clean any previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -f tsconfig.tsbuildinfo

# Ensure TypeScript is available
echo "📦 Checking TypeScript installation..."
if ! command -v tsc &> /dev/null; then
    echo "Installing TypeScript globally..."
    npm install -g typescript@latest
fi

# Install dependencies with production optimizations
echo "📥 Installing dependencies..."
npm ci --only=production=false --ignore-scripts

# Build with memory optimization and progress tracking
echo "🔨 Building TypeScript project..."
echo "Memory limit: $NODE_OPTIONS"
echo "TypeScript version: $(tsc --version)"

# Use the production config with incremental compilation
tsc --project tsconfig.prod.json

# Verify build output
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed: dist/index.js not found"
    exit 1
fi

echo "✅ Build completed successfully!"
echo "📋 Build output:"
ls -la dist/

# Clean up build artifacts to save space
rm -f dist/.tsbuildinfo

echo "🎉 Deployment preparation complete!"