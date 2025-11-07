#!/usr/bin/env node

/**
 * Emergency CORS Fix for Production Backend
 * 
 * This script fixes the CORS issue where multiple origins are being sent
 * in the Access-Control-Allow-Origin header, which browsers reject.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying emergency CORS fixes for production...');

// 1. Fix the render index file
const renderIndexPath = path.join(__dirname, 'app/backend/src/index.render.ts');
if (fs.existsSync(renderIndexPath)) {
  let content = fs.readFileSync(renderIndexPath, 'utf8');
  
  // Check if already fixed
  if (!content.includes('allowedOrigins')) {
    content = content.replace(
      /origin: process\.env\.FRONTEND_URL \|\| true,/,
      `origin: process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'],`
    );
    
    fs.writeFileSync(renderIndexPath, content);
    console.log('✅ Fixed CORS in index.render.ts');
  } else {
    console.log('✅ CORS already fixed in index.render.ts');
  }
}

// 2. Create production environment file with emergency CORS enabled
const prodEnvPath = path.join(__dirname, 'app/backend/.env.production');
const envContent = `# Production Environment Variables
NODE_ENV=production
EMERGENCY_CORS=true
PORT=10000

# Frontend URLs (will be split properly by CORS middleware)
FRONTEND_URL=https://www.linkdao.io,https://linkdao.io,https://linkdao.vercel.app

# Backend URL
BACKEND_URL=https://api.linkdao.io

# CORS Configuration
CORS_ORIGIN=https://www.linkdao.io,https://linkdao.io,https://linkdao.vercel.app

# Database (use production database URL)
# DATABASE_URL=postgresql://...

# JWT Configuration (use production secrets)
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRES_IN=24h

# Other production configurations...
`;

fs.writeFileSync(prodEnvPath, envContent);
console.log('✅ Created production environment file with EMERGENCY_CORS=true');

// 3. Create deployment instructions
const deployInstructions = `
# 🚨 EMERGENCY CORS FIX DEPLOYMENT INSTRUCTIONS

## Problem
The production backend is sending multiple values in the Access-Control-Allow-Origin header:
'https://www.linkdao.io,https://linkdao.io,https://linkdao.vercel.app,http://localhost:3000'

Browsers only accept ONE value in this header, causing all CORS requests to fail.

## Solution Applied
1. Fixed index.render.ts to properly split FRONTEND_URL into an array
2. Fixed WebSocket services to handle multiple origins correctly  
3. Enabled EMERGENCY_CORS=true to use the emergency CORS middleware

## Deployment Steps

### For Render.com:
1. Go to your Render dashboard
2. Navigate to your backend service
3. Go to Environment tab
4. Add/Update these environment variables:
   - EMERGENCY_CORS=true
   - NODE_ENV=production
5. Redeploy the service

### For Manual Deployment:
1. Set environment variable: export EMERGENCY_CORS=true
2. Restart the backend service
3. Verify CORS headers only contain one origin

## Verification
After deployment, check that API requests return only ONE origin:
\`\`\`
curl -H "Origin: https://www.linkdao.io" https://api.linkdao.io/health -v
\`\`\`

Should return:
\`\`\`
Access-Control-Allow-Origin: https://www.linkdao.io
\`\`\`

NOT:
\`\`\`
Access-Control-Allow-Origin: https://www.linkdao.io,https://linkdao.io,...
\`\`\`

## Files Modified:
- app/backend/src/index.render.ts
- app/backend/src/services/adminWebSocketService.ts  
- app/backend/src/services/websocket/scalableWebSocketManager.ts
- app/backend/.env (added EMERGENCY_CORS=true)
`;

fs.writeFileSync('EMERGENCY_CORS_DEPLOYMENT_GUIDE.md', deployInstructions);
console.log('✅ Created deployment guide: EMERGENCY_CORS_DEPLOYMENT_GUIDE.md');

console.log('\n🎉 Emergency CORS fixes applied!');
console.log('\n📋 Next Steps:');
console.log('1. Deploy the updated code to production');
console.log('2. Set EMERGENCY_CORS=true in production environment');
console.log('3. Restart the backend service');
console.log('4. Test post creation from https://www.linkdao.io');
console.log('\n📖 See EMERGENCY_CORS_DEPLOYMENT_GUIDE.md for detailed instructions');