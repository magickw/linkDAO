#!/bin/bash
echo "🚨 EMERGENCY RESTART SEQUENCE"

# Kill existing processes
pkill -f "node.*index"
sleep 2

# Clear system cache if possible
sync
echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || echo "Cannot clear system cache (requires root)"

# Start with memory optimizations
export NODE_OPTIONS="--max-old-space-size=512 --gc-interval=100"
export NODE_ENV=production

# Use emergency configuration
if [ -f ".env.emergency" ]; then
  export $(cat .env.emergency | xargs)
fi

# Start emergency server
echo "Starting emergency server..."
node src/index.emergency.js &

echo "Emergency restart complete"
