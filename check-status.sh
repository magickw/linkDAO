#!/bin/bash

echo "🔍 LinkDAO Platform Status Check"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local port=$1
    local name=$2
    local url=$3
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✅ $name is running on port $port${NC}"
        
        # Test HTTP response if URL provided
        if [ ! -z "$url" ]; then
            if curl -s "$url" > /dev/null; then
                echo -e "${GREEN}   └─ HTTP response: OK${NC}"
            else
                echo -e "${RED}   └─ HTTP response: FAILED${NC}"
            fi
        fi
        return 0
    else
        echo -e "${RED}❌ $name is NOT running on port $port${NC}"
        return 1
    fi
}

# Function to test API endpoint
test_api() {
    local endpoint=$1
    local description=$2
    
    echo -n "Testing $description... "
    if response=$(curl -s "$endpoint" 2>/dev/null); then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        return 1
    fi
}

echo ""
echo "📊 Service Status:"
echo "─────────────────"

# Check backend
backend_running=false
if check_service 10000 "Backend" "http://localhost:10000/health"; then
    backend_running=true
fi

# Check frontend
frontend_running=false
if check_service 3000 "Frontend" "http://localhost:3000"; then
    frontend_running=true
fi

echo ""
echo "🧪 API Tests:"
echo "─────────────"

if [ "$backend_running" = true ]; then
    test_api "http://localhost:10000/health" "Health endpoint"
    test_api "http://localhost:10000/api/posts" "Posts API"
    
    # Test creating a post
    echo -n "Testing post creation... "
    if curl -s -X POST http://localhost:10000/api/posts \
        -H "Content-Type: application/json" \
        -d '{"author":"0x1234567890123456789012345678901234567890","content":"Status check test post","tags":["test"]}' \
        > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Backend not running - skipping API tests${NC}"
fi

echo ""
echo "📁 Environment Check:"
echo "────────────────────"

# Check environment files
if [ -f "app/frontend/.env.local" ]; then
    echo -e "${GREEN}✅ Frontend .env.local exists${NC}"
    
    # Check if it's configured for local development
    if grep -q "localhost:10000" app/frontend/.env.local; then
        echo -e "${GREEN}   └─ Configured for local development${NC}"
    else
        echo -e "${YELLOW}   └─ May be configured for production${NC}"
    fi
else
    echo -e "${RED}❌ Frontend .env.local missing${NC}"
fi

if [ -f "app/backend/.env" ]; then
    echo -e "${GREEN}✅ Backend .env exists${NC}"
else
    echo -e "${RED}❌ Backend .env missing${NC}"
fi

echo ""
echo "🎯 Quick Actions:"
echo "────────────────"

if [ "$backend_running" = false ]; then
    echo "To start backend: cd app/backend && npm run dev"
fi

if [ "$frontend_running" = false ]; then
    echo "To start frontend: cd app/frontend && npm run dev"
fi

if [ "$backend_running" = true ] && [ "$frontend_running" = true ]; then
    echo -e "${GREEN}🎉 All services are running!${NC}"
    echo ""
    echo "📱 Access your app:"
    echo "   Frontend: http://localhost:3000"
    echo "   Test Page: http://localhost:3000/test-posting"
    echo "   Backend API: http://localhost:10000"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Connect your wallet (MetaMask, etc.)"
    echo "   2. Try the test page: http://localhost:3000/test-posting"
    echo "   3. Check browser console for errors"
fi

echo ""