#!/bin/bash

echo "🚨 DEPLOYING EMERGENCY PRODUCTION FIXES"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "app/backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Navigate to backend
cd app/backend

print_status "1. Installing dependencies..."
npm install --production

print_status "2. Building TypeScript..."
npm run build:tsc

print_status "3. Applying emergency fixes..."
npm run emergency-fixes

if [ $? -eq 0 ]; then
    print_status "Emergency fixes applied successfully!"
else
    print_error "Emergency fixes failed!"
    exit 1
fi

print_status "4. Starting production monitoring..."
echo "Starting monitor in background..."
nohup npm run monitor > monitor.log 2>&1 &
MONITOR_PID=$!
echo "Monitor PID: $MONITOR_PID"

print_status "5. Checking system health..."
sleep 5  # Wait for services to stabilize
npm run health

print_status "6. Emergency fixes deployment complete!"
echo ""
echo "📊 NEXT STEPS:"
echo "1. Monitor the system: tail -f monitor.log"
echo "2. Check health: npm run health"
echo "3. View logs: tail -f /var/log/linkdao/app.log"
echo ""
echo "🔍 MONITORING:"
echo "- Monitor PID: $MONITOR_PID"
echo "- Monitor log: monitor.log"
echo "- Health endpoint: http://localhost:10000/emergency-health"
echo ""
echo "⚠️  If issues persist, consider service restart:"
echo "   pkill -f 'node.*src/index' && npm run start:optimized"

# Save monitor PID for later cleanup
echo $MONITOR_PID > monitor.pid

print_status "Emergency deployment completed successfully!"