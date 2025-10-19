#!/bin/bash

# LinkDAO - Stop Testing Servers Script

echo "🛑 Stopping LinkDAO servers..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Kill processes from PID files
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        echo -e "${GREEN}✓ Backend stopped (PID: $BACKEND_PID)${NC}"
    fi
    rm -f .backend.pid
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        echo -e "${GREEN}✓ Frontend stopped (PID: $FRONTEND_PID)${NC}"
    fi
    rm -f .frontend.pid
fi

# Force kill anything on the ports
if lsof -Pi :10000 -sTCP:LISTEN -t >/dev/null ; then
    lsof -ti:10000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Killed process on port 10000${NC}"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✓ Killed process on port 3000${NC}"
fi

echo -e "${GREEN}✅ All servers stopped${NC}"
