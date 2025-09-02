#!/bin/bash

# Vercel deployment script for frontend
# This script handles npm configuration issues

set -e

echo "🚀 Starting LinkDAO frontend deployment..."

# Function to safely remove npm config files
safe_remove_npmrc() {
    if [ -f ".npmrc" ]; then
        mv .npmrc .npmrc.backup
        echo "📦 Backed up .npmrc file"
    fi
}

# Function to restore npm config files
restore_npmrc() {
    if [ -f ".npmrc.backup" ]; then
        mv .npmrc.backup .npmrc
        echo "📦 Restored .npmrc file"
    fi
}

# Clear any npm cache that might be causing issues
echo "🧹 Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

# Remove potentially problematic .npmrc files temporarily
echo "📦 Managing .npmrc files..."
safe_remove_npmrc

# Set npm config directly via command line to avoid conflicts
echo "🔧 Setting npm configuration..."
npm config set legacy-peer-deps true 2>/dev/null || true
npm config set fund false 2>/dev/null || true
npm config set audit false 2>/dev/null || true

# Try to install dependencies with multiple fallback strategies
echo "📥 Installing dependencies..."

# Strategy 1: Try npm install with legacy peer deps
if npm install --legacy-peer-deps --no-fund --no-audit --prefer-offline --no-package-lock; then
    echo "✅ Dependencies installed successfully (prefer-offline, no-package-lock)"
elif npm install --legacy-peer-deps --no-fund --no-audit --prefer-offline; then
    echo "✅ Dependencies installed successfully (prefer-offline)"
elif npm install --legacy-peer-deps --no-fund --no-audit; then
    echo "✅ Dependencies installed successfully (online)"
elif npm install --force --no-fund --no-audit; then
    echo "⚠️  Dependencies installed with --force"
else
    echo "❌ Failed to install dependencies"
    # Restore .npmrc if it existed
    restore_npmrc
    exit 1
fi

# Restore .npmrc if it existed
restore_npmrc

# Build the application
echo "🔨 Building frontend..."
if npm run build; then
    echo "✅ Frontend built successfully"
else
    echo "❌ Failed to build frontend"
    exit 1
fi

echo "✅ Frontend deployment preparation complete!"