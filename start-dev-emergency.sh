#!/bin/bash

echo "🚀 Starting LinkDAO Development Environment"
echo "=========================================="

# Check if backend is running
echo "🔍 Checking backend status..."
node check-backend-health.js

if [ $? -ne 0 ]; then
  echo "❌ Backend is not running"
  echo "🚀 Please start the backend manually:"
  echo "   cd app/backend && npm run dev"
  echo ""
  echo "Or use the automatic checker:"
  echo "   node check-backend-status.js"
  exit 1
fi

echo "✅ Backend is healthy"
echo "🌐 Starting frontend..."

# Start frontend with emergency fixes
NEXT_PUBLIC_API_URL=http://localhost:10000 \
NEXT_PUBLIC_WS_URL=ws://localhost:10000 \
NODE_ENV=development \
npm run dev

