#!/bin/bash

echo "🚀 Starting LinkDAO Backend with Memory Optimizations"

# Check if emergency config exists
if [ -f ".env.emergency" ]; then
    echo "📋 Loading emergency configuration..."
    export $(cat .env.emergency | grep -v '^#' | xargs)
fi

# Set memory optimizations for 2GB RAM
export NODE_OPTIONS="--max-old-space-size=1536 --expose-gc"
export NODE_ENV=production

# Database optimizations (more generous with 2GB)
export DB_POOL_MAX=20
export DB_POOL_MIN=5
export DB_IDLE_TIMEOUT=30000

# Redis optimizations (increased for 2GB)
export REDIS_MAX_MEMORY=256mb
export REDIS_MAX_MEMORY_POLICY=allkeys-lru

# Re-enable features with more memory
export DISABLE_ANALYTICS=false
export DISABLE_BACKGROUND_JOBS=false
export DISABLE_REAL_TIME_UPDATES=false

# Enable compression
export ENABLE_COMPRESSION=true
export COMPRESSION_LEVEL=6

echo "🔧 Memory optimizations applied for 2GB RAM:"
echo "   - Max heap size: 1536MB (1.5GB)"
echo "   - DB pool max: 20"
echo "   - Redis max memory: 256MB"
echo "   - Analytics: enabled"
echo "   - Background jobs: enabled"
echo "   - Real-time updates: enabled"

# Check current memory usage
echo ""
echo "📊 Current system memory:"
free -h 2>/dev/null || vm_stat | head -4

# Kill any existing processes
echo ""
echo "🔄 Stopping existing processes..."
pkill -f "node.*index" 2>/dev/null || echo "No existing processes found"
sleep 2

# Start the application
echo ""
echo "🚀 Starting optimized backend..."

# Use emergency index if it exists, otherwise use regular index
if [ -f "src/index.emergency.js" ]; then
    echo "Using emergency index..."
    node src/index.emergency.js
elif [ -f "dist/index.js" ]; then
    echo "Using built index..."
    node dist/index.js
else
    echo "Using source index..."
    node src/index.ts
fi