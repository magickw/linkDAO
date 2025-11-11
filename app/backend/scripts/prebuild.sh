#!/bin/bash

# Pre-build script for Render deployment
# Handles npm configuration issues and prepares environment

echo "🔧 Preparing deployment environment..."

# Clear any problematic npm cache
npm cache clean --force 2>/dev/null || true

# Set npm configuration directly
echo "legacy-peer-deps=true" > .npmrc
echo "fund=false" >> .npmrc
echo "audit=false" >> .npmrc

# Add platform-specific configuration for sharp
echo "sharp_binary_host=https://npmmirror.com/mirrors/sharp-libvips" >> .npmrc
echo "sharp_install_force=true" >> .npmrc

echo "✅ Environment preparation complete"
echo "📋 .npmrc contents:"
cat .npmrc

# Platform-specific sharp installation for Linux
echo "🔧 Ensuring sharp is properly installed for Linux environment..."
if [ "$NODE_ENV" = "production" ]; then
    echo "🔧 Installing sharp with platform-specific binaries..."
    npm install sharp --include=optional
    echo "🔧 Testing sharp module loading..."
    node scripts/test-sharp-loading.js
fi