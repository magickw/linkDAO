#!/bin/bash

echo "🚀 Starting LinkDAO Backend - Production (4GB RAM Optimized)"

# Load production environment if it exists
if [ -f ".env.production" ]; then
    echo "📋 Loading production configuration..."
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Explicitly set Render environment variables for Standard tier
# This ensures the index.ts code detects the correct tier
export RENDER_SERVICE_TYPE=standard
export RENDER_SERVICE_PLAN=standard
export RENDER_PRO=true
export MEMORY_LIMIT=4096

# Set optimized Node.js options for 4GB RAM (only if not already set by Render)
# Render.yaml sets --max-old-space-size=3072 for Pro plan
if [ -z "$NODE_OPTIONS" ]; then
  export NODE_OPTIONS="--max-old-space-size=3072 --expose-gc"
  echo "   - Using default heap size: 3GB"
else
  echo "   - Using Render-configured heap size from NODE_OPTIONS: $NODE_OPTIONS"
fi
export NODE_ENV=production

# Database configuration
export DB_POOL_MAX=20
export DB_POOL_MIN=5
export DB_IDLE_TIMEOUT=30000

# Redis configuration
export REDIS_MAX_MEMORY=256mb
export REDIS_MAX_MEMORY_POLICY=allkeys-lru

# Enable all features with sufficient memory
export DISABLE_ANALYTICS=false
export DISABLE_BACKGROUND_JOBS=false
export DISABLE_REAL_TIME_UPDATES=false
export FORCE_ENABLE_WEBSOCKETS=true

# Performance optimizations
export ENABLE_COMPRESSION=true
export COMPRESSION_LEVEL=6
export ENABLE_RESPONSE_CACHE=true

echo "🔧 Production optimizations applied:"
echo "   - DB pool: 5-20 connections"
echo "   - Redis memory: 256MB"
echo "   - All features: enabled"
echo "   - Compression: enabled"
echo "   - Response cache: enabled"

# Check current memory usage
echo ""
echo "📊 System memory status:"
free -h 2>/dev/null || vm_stat | head -4

# Kill any existing processes
echo ""
echo "🔄 Stopping existing processes..."
pkill -f "node.*index" 2>/dev/null || echo "No existing processes found"
sleep 2

# Debug Render configuration
if [ "$DEBUG_RENDER_CONFIG" = "true" ]; then
    echo ""
    echo "🔍 Debugging Render configuration..."
    node scripts/debug-render-env.js
fi

# Start the application
echo ""
echo "🚀 Starting production backend..."

# Use built version if available, otherwise source
if [ -f "dist/index.js" ]; then
    echo "Using built production version..."
    node dist/index.js
elif [ -f "src/index.ts" ]; then
    echo "Using TypeScript source..."
    npx ts-node src/index.ts
else
    echo "❌ No entry point found!"
    exit 1
fi