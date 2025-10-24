#!/bin/bash

echo "🚀 Starting LinkDAO Services..."

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "✅ Port $1 is in use"
        return 0
    else
        echo "❌ Port $1 is not in use"
        return 1
    fi
}

# Check if backend is running
echo "Checking backend (port 10000)..."
if ! check_port 10000; then
    echo "Starting backend..."
    cd app/backend
    nohup npm run dev > backend.log 2>&1 &
    echo "Backend started in background"
    cd ../..
    sleep 3
fi

# Check if frontend is running
echo "Checking frontend (port 3000)..."
if ! check_port 3000; then
    echo "Starting frontend..."
    cd app/frontend
    nohup npm run dev > frontend.log 2>&1 &
    echo "Frontend started in background"
    cd ../..
    sleep 3
fi

# Verify services are running
echo ""
echo "🔍 Service Status:"
check_port 10000 && echo "Backend: http://localhost:10000"
check_port 3000 && echo "Frontend: http://localhost:3000"

# Test backend API
echo ""
echo "🧪 Testing Backend API..."
if curl -s http://localhost:10000/health > /dev/null; then
    echo "✅ Backend API is responding"
else
    echo "❌ Backend API is not responding"
fi

echo ""
echo "🎉 Services are ready!"
echo "📱 Open http://localhost:3000 in your browser"
echo "🔧 Backend API: http://localhost:10000"