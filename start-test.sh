#!/bin/bash

# LinkDAO - Quick Start Script for Testing
# This script starts both backend and frontend servers

echo "🚀 Starting LinkDAO Testing Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "app" ]; then
    echo -e "${RED}❌ Error: Please run this script from the LinkDAO root directory${NC}"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Check if ports are already in use
echo "🔍 Checking ports..."
if check_port 10000; then
    echo -e "${RED}⚠️  Port 10000 is already in use (Backend)${NC}"
    echo "   Kill the process? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        lsof -ti:10000 | xargs kill -9
        echo -e "${GREEN}✓ Port 10000 freed${NC}"
    fi
fi

if check_port 3000; then
    echo -e "${RED}⚠️  Port 3000 is already in use (Frontend)${NC}"
    echo "   Kill the process? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        lsof -ti:3000 | xargs kill -9
        echo -e "${GREEN}✓ Port 3000 freed${NC}"
    fi
fi

echo ""
echo -e "${BLUE}📦 Installing dependencies (if needed)...${NC}"

# Check if backend dependencies are installed
if [ ! -d "app/backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd app/backend
    npm install
    cd ../..
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Check if frontend dependencies are installed
if [ ! -d "app/frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd app/frontend
    npm install
    cd ../..
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

echo ""
echo -e "${GREEN}🎯 Starting servers...${NC}"
echo ""

# Create log directory
mkdir -p logs

# Start backend in background
echo -e "${BLUE}🔧 Starting Backend (Port 10000)...${NC}"
cd app/backend
npm run dev > ../../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ../..

# Wait for backend to start
echo -n "   Waiting for backend to start"
for i in {1..10}; do
    if check_port 10000; then
        echo ""
        echo -e "${GREEN}   ✓ Backend started successfully (PID: $BACKEND_PID)${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

if ! check_port 10000; then
    echo ""
    echo -e "${RED}   ❌ Backend failed to start. Check logs/backend.log${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Start frontend in background
echo -e "${BLUE}🎨 Starting Frontend (Port 3000)...${NC}"
cd app/frontend
npm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for frontend to start
echo -n "   Waiting for frontend to start"
for i in {1..15}; do
    if check_port 3000; then
        echo ""
        echo -e "${GREEN}   ✓ Frontend started successfully (PID: $FRONTEND_PID)${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

if ! check_port 3000; then
    echo ""
    echo -e "${RED}   ❌ Frontend failed to start. Check logs/frontend.log${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo -e "${GREEN}✅ All servers are running!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🌐 Frontend:${NC}  http://localhost:3000"
echo -e "${BLUE}🔧 Backend:${NC}   http://localhost:10000"
echo -e "${BLUE}📡 WebSocket:${NC} ws://localhost:10000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}📋 Next Steps:${NC}"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Connect your MetaMask wallet"
echo "3. Follow the testing guide in TESTING_GUIDE.md"
echo ""
echo -e "${BLUE}📊 View Logs:${NC}"
echo "   Backend:  tail -f logs/backend.log"
echo "   Frontend: tail -f logs/frontend.log"
echo ""
echo -e "${RED}🛑 Stop Servers:${NC}"
echo "   Press Ctrl+C or run: ./stop.sh"
echo ""

# Save PIDs to file for stop script
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

# Keep script running and show logs
echo -e "${BLUE}📝 Live Backend Logs:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -f logs/backend.log &
TAIL_PID=$!

# Trap Ctrl+C to cleanup
trap cleanup INT

cleanup() {
    echo ""
    echo -e "${RED}🛑 Stopping servers...${NC}"
    kill $BACKEND_PID $FRONTEND_PID $TAIL_PID 2>/dev/null
    rm -f .backend.pid .frontend.pid
    echo -e "${GREEN}✓ All servers stopped${NC}"
    exit 0
}

# Wait indefinitely
wait
