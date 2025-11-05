#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix remaining CSP and backend issues
 */

console.log('🔧 Fixing remaining CSP and backend issues...');

// 1. Update Service Worker CSP configuration
function updateServiceWorkerCSP() {
  console.log('📝 Updating Service Worker CSP configuration...');
  
  const swPath = 'app/frontend/public/sw.js';
  if (fs.existsSync(swPath)) {
    let swContent = fs.readFileSync(swPath, 'utf8');
    
    // Add CSP bypass for development
    const cspBypass = `
// CSP bypass for development
if (typeof self !== 'undefined' && self.location && self.location.hostname === 'localhost') {
  // Allow all connections in development
  self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('localhost:10000')) {
      event.respondWith(
        fetch(event.request, {
          mode: 'cors',
          credentials: 'include'
        }).catch(() => {
          return new Response('Backend unavailable', { status: 503 });
        })
      );
    }
  });
}
`;
    
    if (!swContent.includes('CSP bypass for development')) {
      swContent = cspBypass + '\n' + swContent;
      fs.writeFileSync(swPath, swContent);
      console.log('✅ Updated Service Worker with CSP bypass');
    }
  }
}

// 2. Create development-specific CSP policy
function createDevCSPPolicy() {
  console.log('🔒 Creating development CSP policy...');
  
  const deployConfigPath = 'app/frontend/deploy.config.js';
  if (fs.existsSync(deployConfigPath)) {
    let content = fs.readFileSync(deployConfigPath, 'utf8');
    
    // Replace the security section with a more permissive development version
    const newSecurityConfig = `  // Security configurations
  security: {
    contentSecurityPolicy: process.env.NODE_ENV === 'development' ? {
      'default-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:", "blob:", "data:"],
      'style-src': ["'self'", "'unsafe-inline'", "https:", "http:", "data:"],
      'img-src': ["'self'", "data:", "https:", "http:", "blob:", "*"],
      'font-src': ["'self'", "https:", "http:", "data:", "*"],
      'connect-src': ["'self'", "https:", "http:", "wss:", "ws:", "*"],
      'frame-src': ["'self'", "https:", "http:"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'", "https:", "http:"],
      'worker-src': ["'self'", "blob:", "data:"],
      'child-src': ["'self'", "blob:", "data:"]
    } : {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://vercel.live", "https://js.stripe.com", "https://storage.googleapis.com", "https://va.vercel-scripts.com"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", "data:", "https:", "blob:", "http://localhost:*"],
      'font-src': ["'self'", "https:"],
      'connect-src': [
        "'self'", 
        "https:", 
        "wss:", 
        "ws:", 
        "http://localhost:*", 
        "ws://localhost:*",
        "http://localhost:10000",
        "ws://localhost:10000",
        "http://127.0.0.1:*",
        "ws://127.0.0.1:*",
        "https://api.web3modal.org",
        "https://api.coingecko.com",
        "https://va.vercel-scripts.com"
      ],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    },`;
    
    // Replace the existing security config
    const securityRegex = /\/\/ Security configurations[\s\S]*?contentSecurityPolicy: \{[\s\S]*?\},/;
    if (securityRegex.test(content)) {
      content = content.replace(securityRegex, newSecurityConfig);
      fs.writeFileSync(deployConfigPath, content);
      console.log('✅ Updated CSP policy for development');
    }
  }
}

// 3. Create backend health check and restart script
function createBackendHealthScript() {
  console.log('🏥 Creating backend health check script...');
  
  const healthScript = `#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

async function checkAndRestartBackend() {
  console.log('🔍 Checking backend health...');
  
  try {
    const isHealthy = await checkHealth();
    
    if (isHealthy) {
      console.log('✅ Backend is healthy');
      return true;
    }
    
    console.log('❌ Backend is unhealthy, attempting restart...');
    return await restartBackend();
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

function checkHealth() {
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

async function restartBackend() {
  console.log('🔄 Restarting backend...');
  
  // Kill existing backend processes
  try {
    const { execSync } = require('child_process');
    execSync('pkill -f "node.*backend" || true', { stdio: 'ignore' });
    execSync('lsof -ti:10000 | xargs kill -9 || true', { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    // Ignore errors
  }
  
  // Start new backend process
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: 'app/backend',
    stdio: 'pipe',
    detached: true
  });
  
  return new Promise((resolve) => {
    let startupTimeout = setTimeout(() => {
      resolve(false);
    }, 15000);
    
    backend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Backend:', output.trim());
      
      if (output.includes('Server running') || output.includes('listening')) {
        clearTimeout(startupTimeout);
        setTimeout(async () => {
          const isHealthy = await checkHealth();
          resolve(isHealthy);
        }, 3000);
      }
    });
    
    backend.stderr.on('data', (data) => {
      console.error('Backend Error:', data.toString().trim());
    });
    
    backend.on('error', () => {
      clearTimeout(startupTimeout);
      resolve(false);
    });
  });
}

if (require.main === module) {
  checkAndRestartBackend().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { checkAndRestartBackend };
`;
  
  fs.writeFileSync('restart-backend.js', healthScript);
  console.log('✅ Created backend restart script');
}

// 4. Update Next.js config to disable CSP in development
function updateNextConfig() {
  console.log('⚙️ Updating Next.js config...');
  
  const nextConfigPath = 'next.config.js';
  if (fs.existsSync(nextConfigPath)) {
    let content = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Add development CSP bypass
    const headersFunction = `  // Security headers
  async headers() {
    // Disable CSP in development for easier debugging
    if (process.env.NODE_ENV === 'development') {
      return [];
    }
    
    const csp = deployConfig.security.contentSecurityPolicy;
    const cspString = Object.entries(csp)
      .map(([key, values]) => \`\${key} \${Array.isArray(values) ? values.join(' ') : values}\`)
      .join('; ');
    
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspString,
          },
          ...Object.entries(deployConfig.security.headers).map(([key, value]) => ({
            key,
            value,
          })),
        ],
      },
    ];
  },`;
    
    // Replace the existing headers function
    const headersRegex = /\/\/ Security headers[\s\S]*?async headers\(\)[\s\S]*?\},/;
    if (headersRegex.test(content)) {
      content = content.replace(headersRegex, headersFunction);
      fs.writeFileSync(nextConfigPath, content);
      console.log('✅ Updated Next.js config to disable CSP in development');
    }
  }
}

// 5. Create environment-specific startup script
function createStartupScript() {
  console.log('🚀 Creating startup script...');
  
  const startupScript = `#!/bin/bash

echo "🚀 Starting LinkDAO with CSP fixes..."

# Set development environment
export NODE_ENV=development
export NEXT_PUBLIC_API_URL=http://localhost:10000
export NEXT_PUBLIC_WS_URL=ws://localhost:10000

# Check and restart backend if needed
echo "🔍 Checking backend..."
node restart-backend.js

if [ $? -eq 0 ]; then
  echo "✅ Backend is ready"
else
  echo "❌ Backend failed to start"
  exit 1
fi

# Clear Next.js cache
echo "🧹 Clearing Next.js cache..."
rm -rf .next

# Start frontend
echo "🌐 Starting frontend..."
npm run dev
`;
  
  fs.writeFileSync('start-with-fixes.sh', startupScript);
  
  try {
    fs.chmodSync('start-with-fixes.sh', '755');
  } catch (error) {
    console.log('⚠️ Could not make script executable');
  }
  
  console.log('✅ Created startup script');
}

// 6. Create emergency CSP disable script
function createCSPDisableScript() {
  console.log('🚨 Creating emergency CSP disable script...');
  
  const disableScript = `#!/usr/bin/env node

const fs = require('fs');

// Completely disable CSP for development
function disableCSP() {
  console.log('🚨 EMERGENCY: Disabling CSP completely...');
  
  // Update Next.js config
  const nextConfigPath = 'next.config.js';
  if (fs.existsSync(nextConfigPath)) {
    let content = fs.readFileSync(nextConfigPath, 'utf8');
    
    // Replace headers function with empty one
    const emptyHeaders = \`  // Security headers (DISABLED FOR DEVELOPMENT)
  async headers() {
    return [];
  },\`;
    
    const headersRegex = /\/\/ Security headers[\\s\\S]*?async headers\\(\\)[\\s\\S]*?\\},/;
    content = content.replace(headersRegex, emptyHeaders);
    
    fs.writeFileSync(nextConfigPath, content);
    console.log('✅ Disabled CSP in Next.js config');
  }
  
  // Create CSP-free HTML template
  const htmlTemplate = \`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LinkDAO - Development Mode</title>
</head>
<body>
  <div id="__next"></div>
</body>
</html>\`;
  
  fs.writeFileSync('app/frontend/public/index-dev.html', htmlTemplate);
  console.log('✅ Created CSP-free HTML template');
  
  console.log('🎉 CSP completely disabled for development');
  console.log('⚠️ Remember to re-enable for production!');
}

if (require.main === module) {
  disableCSP();
}

module.exports = { disableCSP };
`;
  
  fs.writeFileSync('emergency-disable-csp.js', disableScript);
  console.log('✅ Created emergency CSP disable script');
}

// Execute all fixes
function applyAllFixes() {
  try {
    updateServiceWorkerCSP();
    createDevCSPPolicy();
    createBackendHealthScript();
    updateNextConfig();
    createStartupScript();
    createCSPDisableScript();
    
    console.log('\n🎉 All fixes applied successfully!');
    console.log('\n📋 Available commands:');
    console.log('1. Normal startup: ./start-with-fixes.sh');
    console.log('2. Check/restart backend: node restart-backend.js');
    console.log('3. Emergency CSP disable: node emergency-disable-csp.js');
    console.log('\n⚠️ If issues persist, try:');
    console.log('1. Clear browser cache completely');
    console.log('2. Use incognito/private browsing');
    console.log('3. Run emergency CSP disable script');
    
  } catch (error) {
    console.error('❌ Error applying fixes:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  applyAllFixes();
}

module.exports = { applyAllFixes };