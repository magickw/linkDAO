#!/bin/bash

# Start LinkDAO Backend Server
echo "🚀 Starting LinkDAO Backend Server..."

# Check if we're in the correct directory
if [ ! -f "app/backend/src/index.fixed.js" ]; then
    echo "❌ Error: Please run this script from the LinkDAO root directory"
    exit 1
fi

# Navigate to backend directory
cd app/backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Set environment variables
export NODE_ENV=development
export PORT=10000

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL not set. Using default PostgreSQL connection."
    echo "   Make sure PostgreSQL is running and accessible."
    export DATABASE_URL="postgresql://localhost:5432/linkdao"
fi

echo "🔧 Configuration:"
echo "   - Port: $PORT"
echo "   - Environment: $NODE_ENV"
echo "   - Database: ${DATABASE_URL}"

# Start the server
echo "🌟 Starting server on port $PORT..."
node src/index.fixed.js