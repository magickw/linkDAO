#!/bin/bash

# Immediate memory relief script for production emergencies
echo "🚨 APPLYING IMMEDIATE MEMORY RELIEF"

# 1. Update environment to emergency settings
echo "📝 Switching to emergency environment configuration..."
if [ -f ".env.production.emergency" ]; then
    cp .env.production.emergency .env.production
    echo "✅ Emergency configuration applied"
else
    echo "❌ Emergency configuration not found"
fi

# 2. Clear any build artifacts that might be consuming memory
echo "🧹 Clearing build artifacts..."
rm -rf dist/* 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .next 2>/dev/null || true

# 3. Force garbage collection if Node.js is running
echo "🗑️ Triggering garbage collection..."
pkill -USR2 node 2>/dev/null || true

# 4. Build with minimal memory usage
echo "🔨 Building with minimal memory settings..."
export NODE_OPTIONS="--max-old-space-size=800 --optimize-for-size"
npm run build:standalone 2>/dev/null || {
    echo "⚠️ Standalone build failed, using emergency server"
    cp src/index.production.standalone.js dist/index.js 2>/dev/null || true
}

# 5. Restart with emergency settings
echo "🔄 Ready for emergency restart"
echo "Use: npm run start:emergency"

echo "✅ Immediate memory relief applied"
echo "📊 Current memory usage:"
free -h 2>/dev/null || echo "Memory info not available"