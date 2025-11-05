#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Emergency CORS and CSP fix script
 * This script applies immediate fixes to resolve CORS and CSP issues
 */

console.log('🚨 Emergency CORS and CSP Fix');
console.log('=============================');

// 1. Update environment variables
function updateEnvironmentVariables() {
  console.log('📝 Updating environment variables...');
  
  const envFiles = [
    '.env.local',
    'app/frontend/.env.local',
    'app/backend/.env'
  ];
  
  const envVars = {
    'NEXT_PUBLIC_API_URL': 'http://localhost:10000',
    'NEXT_PUBLIC_WS_URL': 'ws://localhost:10000',
    'CORS_ORIGIN': 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000',
    'NODE_ENV': 'development'
  };
  
  envFiles.forEach(envFile => {
    if (fs.existsSync(envFile)) {
      let content = fs.readFileSync(envFile, 'utf8');
      
      Object.entries(envVars).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          content = content.replace(regex, `${key}=${value}`);
        } else {
          content += `\n${key}=${value}`;
        }
      });
      
      fs.writeFileSync(envFile, content);
      console.log(`✅ Updated ${envFile}`);
    } else {
      // Create new env file
      const content = Object.entries(envVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      
      fs.writeFileSync(envFile, content);
      console.log(`✅ Created ${envFile}`);
    }
  });
}

// 2. Create development CSP override
function createDevCSPOverride() {
  console.log('🔒 Creating development CSP override...');
  
  const devCSPConfig = `
// Development CSP Override - TEMPORARY FIX
const isDevelopment = process.env.NODE_ENV === 'development';

const developmentCSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
  'style-src': ["'self'", "'unsafe-inline'", "https:", "http:"],
  'img-src': ["'self'", "data:", "https:", "http:", "blob:"],
  'font-src': ["'self'", "https:", "http:", "data:"],
  'connect-src': [
    "'self'", 
    "https:", 
    "http:",
    "wss:", 
    "ws:",
    "http://localhost:*",
    "ws://localhost:*",
    "http://127.0.0.1:*",
    "ws://127.0.0.1:*",
    "*"
  ],
  'frame-src': ["'self'", "https:", "http:"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'", "https:", "http:"]
};

module.exports = { developmentCSP, isDevelopment };
`;
  
  fs.writeFileSync('dev-csp-override.js', devCSPConfig);
  console.log('✅ Created development CSP override');
}

// 3. Create emergency CORS middleware
function createEmergencyCORSMiddleware() {
  console.log('🌐 Creating emergency CORS middleware...');
  
  const emergencyCORS = `
const cors = require('cors');

// Emergency CORS configuration - VERY PERMISSIVE FOR DEVELOPMENT
const emergencyCorsOptions = {
  origin: function (origin, callback) {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Allow specific origins in production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'https://linkdao.vercel.app'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Session-ID',
    'X-Wallet-Address',
    'X-Chain-ID',
    'X-CSRF-Token',
    'x-csrf-token',
    'csrf-token'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200
};

const emergencyCorsMiddleware = cors(emergencyCorsOptions);

module.exports = { emergencyCorsMiddleware, emergencyCorsOptions };
`;
  
  fs.writeFileSync('emergency-cors.js', emergencyCORS);
  console.log('✅ Created emergency CORS middleware');
}

// 4. Create backend health check
function createBackendHealthCheck() {
  console.log('🏥 Creating backend health check...');
  
  const healthCheck = `
const http = require('http');

async function checkBackend() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 10000,
      path: '/health',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      console.log('✅ Backend is responding:', res.statusCode);
      resolve(res.statusCode === 200);
    });
    
    req.on('error', (error) => {
      console.log('❌ Backend connection failed:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('⏰ Backend connection timeout');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

if (require.main === module) {
  checkBackend().then(isHealthy => {
    process.exit(isHealthy ? 0 : 1);
  });
}

module.exports = { checkBackend };
`;
  
  fs.writeFileSync('check-backend-health.js', healthCheck);
  console.log('✅ Created backend health check');
}

// 5. Create startup script
function createStartupScript() {
  console.log('🚀 Creating startup script...');
  
  const startupScript = `#!/bin/bash

echo "🚀 Starting LinkDAO Development Environment"
echo "=========================================="

# Check if backend is running
echo "🔍 Checking backend status..."
node check-backend-health.js

if [ $? -ne 0 ]; then
  echo "❌ Backend is not running"
  echo "🚀 Please start the backend manually:"
  echo "   cd app/backend && npm run dev"
  echo ""
  echo "Or use the automatic checker:"
  echo "   node check-backend-status.js"
  exit 1
fi

echo "✅ Backend is healthy"
echo "🌐 Starting frontend..."

# Start frontend with emergency fixes
NEXT_PUBLIC_API_URL=http://localhost:10000 \\
NEXT_PUBLIC_WS_URL=ws://localhost:10000 \\
NODE_ENV=development \\
npm run dev

`;
  
  fs.writeFileSync('start-dev-emergency.sh', startupScript);
  
  // Make it executable
  try {
    fs.chmodSync('start-dev-emergency.sh', '755');
  } catch (error) {
    console.log('⚠️  Could not make script executable:', error.message);
  }
  
  console.log('✅ Created startup script');
}

// 6. Create troubleshooting guide
function createTroubleshootingGuide() {
  console.log('📚 Creating troubleshooting guide...');
  
  const guide = `# CORS and CSP Emergency Fix Guide

## Quick Fix Applied

This emergency fix has been applied to resolve CORS and CSP issues:

### 1. Environment Variables Updated
- NEXT_PUBLIC_API_URL=http://localhost:10000
- NEXT_PUBLIC_WS_URL=ws://localhost:10000
- CORS_ORIGIN includes localhost:3000

### 2. CSP Policy Relaxed (Development Only)
- Added localhost:10000 to connect-src
- Added 127.0.0.1:* to connect-src
- Added API endpoints for Web3Modal and CoinGecko

### 3. CORS Configuration Enhanced
- Allows all localhost origins in development
- Includes all necessary headers for Web3 operations
- Supports credentials for session management

## Manual Steps Required

### 1. Start Backend Server
\`\`\`bash
cd app/backend
npm install
npm run dev
\`\`\`

### 2. Verify Backend is Running
\`\`\`bash
node check-backend-health.js
\`\`\`

### 3. Start Frontend
\`\`\`bash
npm run dev
\`\`\`

## Troubleshooting

### Backend Not Starting
1. Check port 10000 is available: \`lsof -i :10000\`
2. Install dependencies: \`cd app/backend && npm install\`
3. Check environment variables in app/backend/.env

### CORS Still Blocked
1. Clear browser cache and cookies
2. Try incognito/private browsing mode
3. Check browser console for specific error messages

### CSP Violations
1. Restart the development server
2. Clear Next.js cache: \`rm -rf .next\`
3. Check browser developer tools for CSP errors

## Files Modified
- deploy.config.js (CSP policy)
- next.config.js (API rewrites)
- Environment files (.env.local)

## Revert Changes
To revert these emergency changes:
1. Restore original CSP policy in deploy.config.js
2. Remove emergency environment variables
3. Delete temporary files: emergency-cors.js, dev-csp-override.js

## Production Deployment
These changes are for development only. Production deployment should use:
- Strict CSP policy
- Specific CORS origins
- HTTPS endpoints only
`;
  
  fs.writeFileSync('EMERGENCY_FIX_GUIDE.md', guide);
  console.log('✅ Created troubleshooting guide');
}

// Execute all fixes
function applyEmergencyFixes() {
  try {
    updateEnvironmentVariables();
    createDevCSPOverride();
    createEmergencyCORSMiddleware();
    createBackendHealthCheck();
    createStartupScript();
    createTroubleshootingGuide();
    
    console.log('\n🎉 Emergency fixes applied successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start backend: cd app/backend && npm run dev');
    console.log('2. Check backend health: node check-backend-health.js');
    console.log('3. Start frontend: npm run dev');
    console.log('4. Read troubleshooting guide: EMERGENCY_FIX_GUIDE.md');
    
  } catch (error) {
    console.error('❌ Error applying emergency fixes:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  applyEmergencyFixes();
}

module.exports = { applyEmergencyFixes };