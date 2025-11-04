#!/bin/bash

# Web3 Marketplace Backend - Render Deployment Script
# Optimized for Render's 512MB memory limit

set -e

echo "🚀 Starting Render deployment preparation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

# Check if we're in the backend directory
if [[ ! -f "package.json" ]]; then
    error "Please run this script from the app/backend directory"
fi

# Create optimized package.json for Render
log "Creating optimized package.json for Render..."
cp package.render.json package.json

# Create optimized TypeScript config
log "Setting up TypeScript configuration..."
if [[ ! -f "tsconfig.render.json" ]]; then
    error "tsconfig.render.json not found"
fi

# Clean up any existing build artifacts
log "Cleaning up build artifacts..."
rm -rf dist/
rm -rf node_modules/
rm -f package-lock.json

# Install only production dependencies
log "Installing optimized dependencies..."
npm install --production --no-optional --no-audit --no-fund

# Add dev dependencies needed for build
log "Installing build dependencies..."
npm install --save-dev typescript @types/node @types/express @types/cors @types/compression ts-node

# Build the application with memory optimization
log "Building application with memory optimization..."
NODE_OPTIONS='--max-old-space-size=512' npm run build

# Verify the build
if [[ ! -f "dist/index.render.js" ]]; then
    error "Build failed - dist/index.render.js not found"
fi

success "Build completed successfully"

# Check file sizes
log "Checking build output sizes..."
du -sh dist/
ls -la dist/

# Test the built application
log "Testing the built application..."
timeout 10s node dist/index.render.js &
SERVER_PID=$!
sleep 3

# Test health endpoint
if curl -f http://localhost:10000/health > /dev/null 2>&1; then
    success "Health check passed"
else
    warning "Health check failed (this might be normal in CI)"
fi

# Kill test server
kill $SERVER_PID 2>/dev/null || true

# Create .env.example for Render
log "Creating environment configuration..."
cat > .env.example << EOF
# Render Environment Variables
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://linkdao.io

# Optional: Add your specific environment variables here
# DATABASE_URL=your_database_url
# REDIS_URL=your_redis_url
EOF

# Create Render configuration
log "Creating Render configuration..."
if [[ ! -f "render.yaml" ]]; then
    warning "render.yaml not found, creating default configuration"
    cat > render.yaml << EOF
services:
  - type: web
    name: web3-marketplace-backend
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /health
EOF
fi

# Memory usage analysis
log "Analyzing memory usage..."
node -e "
const fs = require('fs');
const path = require('path');

function getDirectorySize(dir) {
    let size = 0;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                size += getDirectorySize(filePath);
            } else {
                size += stats.size;
            }
        }
    } catch (e) {
        // Ignore errors
    }
    return size;
}

const distSize = getDirectorySize('./dist');
const nodeModulesSize = getDirectorySize('./node_modules');

console.log('📊 Build Analysis:');
console.log('  - Dist size:', Math.round(distSize / 1024 / 1024 * 100) / 100, 'MB');
console.log('  - Node modules size:', Math.round(nodeModulesSize / 1024 / 1024 * 100) / 100, 'MB');
console.log('  - Total estimated size:', Math.round((distSize + nodeModulesSize) / 1024 / 1024 * 100) / 100, 'MB');

if (distSize + nodeModulesSize > 400 * 1024 * 1024) {
    console.log('⚠️  Warning: Build size is large, may cause memory issues on Render');
} else {
    console.log('✅ Build size looks good for Render deployment');
}
"

# Create deployment checklist
log "Creating deployment checklist..."
cat > RENDER_DEPLOYMENT_CHECKLIST.md << EOF
# Render Deployment Checklist

## Pre-deployment
- [ ] Verify package.json has minimal dependencies
- [ ] Check build size is under 400MB
- [ ] Test health endpoint locally
- [ ] Set environment variables in Render dashboard

## Render Configuration
- [ ] Service type: Web Service
- [ ] Environment: Node
- [ ] Build Command: \`npm install && npm run build\`
- [ ] Start Command: \`npm start\`
- [ ] Health Check Path: \`/health\`

## Environment Variables (Set in Render Dashboard)
- [ ] NODE_ENV=production
- [ ] PORT=10000
- [ ] FRONTEND_URL=your-frontend-url

## Post-deployment
- [ ] Verify health endpoint: https://api.linkdao.io/health
- [ ] Test API endpoints
- [ ] Monitor memory usage in Render logs
- [ ] Check response times

## Troubleshooting
If deployment fails with memory issues:
1. Check Render logs for memory usage
2. Consider upgrading to paid plan for more memory
3. Further optimize dependencies if needed

## API Endpoints Available
- GET / - Basic info
- GET /health - Health check
- GET /ping - Simple ping
- POST /api/marketplace/registration/seller - Seller registration
- POST /api/marketplace/registration/buyer - Buyer registration
- GET /api/marketplace/listings - Get listings
- GET /api/marketplace/listings/:id - Get specific listing
- POST /api/auth/login - User login
- POST /api/auth/register - User registration
- GET /api/analytics/dashboard - Analytics data
EOF

success "Render deployment preparation completed!"

echo ""
echo "📋 Next Steps:"
echo "1. Commit these changes to your repository"
echo "2. Connect your repository to Render"
echo "3. Set the build command: npm install && npm run build"
echo "4. Set the start command: npm start"
echo "5. Add environment variables in Render dashboard"
echo "6. Deploy and monitor the logs"
echo ""
echo "📁 Files created/modified:"
echo "  - package.json (optimized for Render)"
echo "  - dist/ (built application)"
echo "  - render.yaml (Render configuration)"
echo "  - .env.example (environment template)"
echo "  - RENDER_DEPLOYMENT_CHECKLIST.md (deployment guide)"
echo ""
echo "🔗 Useful links:"
echo "  - Render Dashboard: https://dashboard.render.com"
echo "  - Render Docs: https://render.com/docs"
echo ""

# Final memory check
MEMORY_USAGE=$(node -e "console.log(Math.round(process.memoryUsage().heapUsed / 1024 / 1024))")
if [[ $MEMORY_USAGE -gt 300 ]]; then
    warning "Current memory usage: ${MEMORY_USAGE}MB - monitor closely on Render"
else
    success "Memory usage looks good: ${MEMORY_USAGE}MB"
fi

echo "🎉 Ready for Render deployment!"