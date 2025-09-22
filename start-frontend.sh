#!/bin/bash

# Start LinkDAO Frontend
echo "🚀 Starting LinkDAO Frontend..."

# Check if we're in the correct directory
if [ ! -f "app/frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the LinkDAO root directory"
    exit 1
fi

# Navigate to frontend directory
cd app/frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Set environment variables for development
export NODE_ENV=development
export NEXT_PUBLIC_BACKEND_URL=http://localhost:10000
export NEXT_PUBLIC_API_URL=http://localhost:10000

echo "🔧 Configuration:"
echo "   - Backend URL: $NEXT_PUBLIC_BACKEND_URL"
echo "   - API URL: $NEXT_PUBLIC_API_URL"
echo "   - Environment: $NODE_ENV"

# Start the development server
echo "🌟 Starting Next.js development server..."
npm run dev