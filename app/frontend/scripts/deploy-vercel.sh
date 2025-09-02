#!/bin/bash

# Vercel deployment script for frontend
# This script handles npm configuration issues

set -e

echo "🚀 Starting LinkDAO frontend deployment..."

# Clear any npm cache that might be causing issues
npm cache clean --force 2>/dev/null || true

# Remove potentially problematic .npmrc files temporarily
if [ -f ".npmrc" ]; then
    mv .npmrc .npmrc.backup
fi

# Try to install dependencies with multiple fallback strategies
echo "📥 Installing dependencies..."

# Strategy 1: Try npm install with legacy peer deps
if npm install --legacy-peer-deps --no-fund --no-audit --prefer-offline; then
    echo "✅ Dependencies installed successfully"
elif npm install --legacy-peer-deps --no-fund --no-audit; then
    echo "✅ Dependencies installed successfully (online)"
elif npm install --force --no-fund --no-audit; then
    echo "⚠️  Dependencies installed with --force"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Restore .npmrc if it existed
if [ -f ".npmrc.backup" ]; then
    mv .npmrc.backup .npmrc
fi

# Build the application
echo "🔨 Building frontend..."
npm run build

echo "✅ Frontend deployment preparation complete!"