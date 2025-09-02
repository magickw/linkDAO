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

echo "✅ Environment preparation complete"
echo "📋 .npmrc contents:"
cat .npmrc