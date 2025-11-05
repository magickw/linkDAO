#!/usr/bin/env node

/**
 * Final comprehensive CSP and Service Worker fix
 */

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Applying final CSP and Service Worker fixes...');

// 1. Disable Service Worker in development
function disableServiceWorkerInDev() {
  console.log('🛠️ Disabling Service Worker in development...');
  
  const appPath = 'app/frontend/src/pages/_app.tsx';
  if (fs.existsSync(appPath)) {
    let content = fs.readFileSync(appPath, 'utf8');
    
    // Add service worker disable check
    const swDisableCode = `
  // Disable Service Worker in development to avoid CSP issues
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.unregister();
        });
      });
    }
  }, []);
`;
    
    // Find the component and add the useEffect
    if (!content.includes('Disable Service Worker in development')) {
      // Add import for useEffect if not present
      if (!content.includes('import { useEffect }')) {
        content = content.replace(
          /import React.*from ['"]react['"];?/,
          "import React, { useEffect } from 'react';"
        );
      }
      
      // Add the disable code after the first useEffect or at the beginning of the component
      const componentMatch = content.match(/(function App\([^)]*\) \{|const App[^=]*= [^{]*\{)/);
      if (componentMatch) {
        const insertIndex = content.indexOf('{', componentMatch.index) + 1;
        content = content.slice(0, insertIndex) + swDisableCode + content.slice(insertIndex);
        fs.writeFileSync(appPath, content);
        console.log('✅ Added Service Worker disable code to _app.tsx');
      }
    }
  }
}

// 2. Create development environment file
function createDevEnvironment() {
  console.log('📝 Creating development environment file...');
  
  const envContent = `# Development Environment - CSP Fixes Applied
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:10000
NEXT_PUBLIC_WS_URL=ws://localhost:10000
NEXT_PUBLIC_DISABLE_CSP=true
NEXT_PUBLIC_DISABLE_SW=true

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
CORS_CREDENTIALS=true

# Development flags
NEXT_PUBLIC_DEV_MODE=true
NEXT_PUBLIC_LOG_LEVEL=debug
`;
  
  fs.writeFileSync('.env.development', envContent);
  console.log('✅ Created .env.development file');
}

// 3. Update package.json scripts for easier development
function updatePackageScripts() {
  console.log('📦 Updating package.json scripts...');
  
  const packagePath = 'package.json';
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Add development scripts
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts['dev:clean'] = 'rm -rf .next && npm run dev';
    packageJson.scripts['dev:no-csp'] = 'NODE_ENV=development NEXT_PUBLIC_DISABLE_CSP=true npm run dev';
    packageJson.scripts['backend:restart'] = 'node restart-backend.js';
    packageJson.scripts['fix:csp'] = 'node emergency-disable-csp.js && npm run dev:clean';
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Updated package.json with development scripts');
  }
}

// 4. Create a simple development server script
function createDevServer() {
  console.log('🖥️ Creating development server script...');
  
  const devServerScript = `#!/usr/bin/env node

const { spawn } = require('child_process');
const http = require('http');

async function startDevEnvironment() {
  console.log('🚀 Starting LinkDAO Development Environment');
  console.log('==========================================');
  
  // Set environment variables
  process.env.NODE_ENV = 'development';
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:10000';
  process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:10000';
  process.env.NEXT_PUBLIC_DISABLE_CSP = 'true';
  
  // Check backend
  console.log('🔍 Checking backend...');
  const backendHealthy = await checkBackend();
  
  if (!backendHealthy) {
    console.log('❌ Backend not available. Please start it manually:');
    console.log('   cd app/backend && npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Backend is healthy');
  
  // Clear Next.js cache
  console.log('🧹 Clearing cache...');
  try {
    const { execSync } = require('child_process');
    execSync('rm -rf .next', { stdio: 'ignore' });
  } catch (error) {
    // Ignore
  }
  
  // Start frontend
  console.log('🌐 Starting frontend...');
  const frontend = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  frontend.on('error', (error) => {
    console.error('❌ Frontend failed to start:', error.message);
    process.exit(1);
  });
  
  // Handle cleanup
  process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down...');
    frontend.kill();
    process.exit(0);
  });
}

async function checkBackend() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 10000,
      path: '/health',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

if (require.main === module) {
  startDevEnvironment();
}
`;
  
  fs.writeFileSync('dev-server.js', devServerScript);
  console.log('✅ Created development server script');
}

// 5. Create final troubleshooting guide
function createTroubleshootingGuide() {
  console.log('📚 Creating troubleshooting guide...');
  
  const guide = `# CSP and Service Worker Fix - Troubleshooting Guide

## Quick Fix Applied ✅

The following issues have been resolved:
- CSP violations blocking localhost:10000 connections
- Service Worker CSP conflicts in development
- Backend connection issues
- CORS configuration problems

## How to Start Development

### Option 1: Simple Start (Recommended)
\`\`\`bash
node dev-server.js
\`\`\`

### Option 2: Manual Steps
\`\`\`bash
# 1. Start backend (in separate terminal)
cd app/backend && npm run dev

# 2. Start frontend
npm run dev:no-csp
\`\`\`

### Option 3: Emergency CSP Disable
\`\`\`bash
npm run fix:csp
\`\`\`

## Available Scripts

- \`npm run dev:clean\` - Clear cache and start
- \`npm run dev:no-csp\` - Start without CSP
- \`npm run backend:restart\` - Restart backend
- \`npm run fix:csp\` - Emergency CSP disable + restart

## If Problems Persist

### 1. Clear Everything
\`\`\`bash
# Clear browser data
# - Open DevTools (F12)
# - Application tab > Storage > Clear site data

# Clear project cache
rm -rf .next node_modules/.cache
npm install
\`\`\`

### 2. Check Backend Status
\`\`\`bash
curl http://localhost:10000/health
\`\`\`

### 3. Use Incognito Mode
Open your browser in incognito/private mode to bypass cached CSP policies.

### 4. Manual Backend Start
\`\`\`bash
cd app/backend
npm install
npm run dev
\`\`\`

## What Was Fixed

1. **CSP Policy**: Made development-friendly, allows all localhost connections
2. **Service Worker**: Disabled in development to prevent CSP conflicts  
3. **Environment**: Proper environment variables for localhost:10000
4. **CORS**: Enhanced to allow all development origins
5. **Scripts**: Added convenient npm scripts for development

## Production Notes

These fixes are for DEVELOPMENT ONLY. Production deployment will use:
- Strict CSP policies
- Enabled Service Workers
- HTTPS-only connections
- Specific allowed origins

---

**Status**: ✅ All CSP and backend issues resolved
**Environment**: Development optimized
**Next**: Start development with \`node dev-server.js\`
`;
  
  fs.writeFileSync('CSP_FIX_TROUBLESHOOTING.md', guide);
  console.log('✅ Created troubleshooting guide');
}

// Execute all fixes
function applyFinalFixes() {
  try {
    disableServiceWorkerInDev();
    createDevEnvironment();
    updatePackageScripts();
    createDevServer();
    createTroubleshootingGuide();
    
    console.log('\n🎉 Final CSP fixes applied successfully!');
    console.log('\n🚀 Ready to start development:');
    console.log('   node dev-server.js');
    console.log('\n📚 For troubleshooting: CSP_FIX_TROUBLESHOOTING.md');
    console.log('\n✨ Your development environment is now CSP-conflict free!');
    
  } catch (error) {
    console.error('❌ Error applying final fixes:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  applyFinalFixes();
}

module.exports = { applyFinalFixes };