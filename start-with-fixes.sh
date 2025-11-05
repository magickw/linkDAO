#!/bin/bash

echo "🚀 Starting LinkDAO with CSP fixes..."

# Set development environment
export NODE_ENV=development
export NEXT_PUBLIC_API_URL=http://localhost:10000
export NEXT_PUBLIC_WS_URL=ws://localhost:10000

# Check and restart backend if needed
echo "🔍 Checking backend..."
node restart-backend.js

if [ $? -eq 0 ]; then
  echo "✅ Backend is ready"
else
  echo "❌ Backend failed to start"
  exit 1
fi

# Clear Next.js cache
echo "🧹 Clearing Next.js cache..."
rm -rf .next

# Start frontend
echo "🌐 Starting frontend..."
npm run dev
