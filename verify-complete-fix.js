#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

/**
 * Complete verification of CORS and CSP fixes
 */
async function verifyCompleteFix() {
  console.log('🔍 Complete Fix Verification');
  console.log('============================');
  
  const checks = [
    { name: 'Backend Health', test: checkBackendHealth },
    { name: 'CORS Configuration', test: checkCORSConfig },
    { name: 'Environment Variables', test: checkEnvironmentVars },
    { name: 'CSP Configuration', test: checkCSPConfig },
    { name: 'API Endpoints', test: checkAPIEndpoints }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    console.log(`\n🧪 ${check.name}:`);
    
    try {
      const result = await check.test();
      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.log(`❌ ${result.message}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All checks passed! Your setup is ready.');
    console.log('\n📋 Next Steps:');
    console.log('1. Restart your frontend development server');
    console.log('2. Clear browser cache and cookies');
    console.log('3. Test the application in your browser');
    console.log('\n🚀 Start commands:');
    console.log('   Frontend: npm run dev');
    console.log('   Backend: cd app/backend && npm run dev');
  } else {
    console.log('❌ Some checks failed. Please review the errors above.');
    console.log('\n📚 Troubleshooting:');
    console.log('1. Check EMERGENCY_FIX_GUIDE.md for detailed instructions');
    console.log('2. Ensure backend is running on port 10000');
    console.log('3. Verify environment variables are set correctly');
  }
  
  return allPassed;
}

async function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 10000,
      path: '/health',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      if (res.statusCode === 200) {
        resolve({ success: true, message: 'Backend is healthy and responding' });
      } else {
        resolve({ success: false, message: `Backend returned status ${res.statusCode}` });
      }
    });
    
    req.on('error', () => {
      resolve({ success: false, message: 'Backend is not running or not accessible' });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, message: 'Backend connection timeout' });
    });
    
    req.end();
  });
}

async function checkCORSConfig() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 10000,
      path: '/health',
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000'
      },
      timeout: 3000
    }, (res) => {
      const corsOrigin = res.headers['access-control-allow-origin'];
      const corsCredentials = res.headers['access-control-allow-credentials'];
      
      if (corsOrigin && (corsOrigin === '*' || corsOrigin === 'http://localhost:3000')) {
        resolve({ 
          success: true, 
          message: `CORS properly configured (Origin: ${corsOrigin}, Credentials: ${corsCredentials})` 
        });
      } else {
        resolve({ 
          success: false, 
          message: `CORS not properly configured (Origin: ${corsOrigin})` 
        });
      }
    });
    
    req.on('error', () => {
      resolve({ success: false, message: 'Could not test CORS configuration' });
    });
    
    req.end();
  });
}

async function checkEnvironmentVars() {
  const requiredVars = [
    { name: 'NEXT_PUBLIC_API_URL', expected: 'http://localhost:10000' },
    { name: 'NEXT_PUBLIC_WS_URL', expected: 'ws://localhost:10000' }
  ];
  
  const envFiles = ['.env.local', 'app/frontend/.env.local'];
  let foundVars = {};
  
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      const content = fs.readFileSync(envFile, 'utf8');
      
      for (const varDef of requiredVars) {
        const regex = new RegExp(`^${varDef.name}=(.*)$`, 'm');
        const match = content.match(regex);
        if (match) {
          foundVars[varDef.name] = match[1];
        }
      }
    }
  }
  
  const missingVars = requiredVars.filter(v => !foundVars[v.name]);
  const incorrectVars = requiredVars.filter(v => 
    foundVars[v.name] && foundVars[v.name] !== v.expected
  );
  
  if (missingVars.length === 0 && incorrectVars.length === 0) {
    return { success: true, message: 'Environment variables are correctly configured' };
  } else {
    const issues = [];
    if (missingVars.length > 0) {
      issues.push(`Missing: ${missingVars.map(v => v.name).join(', ')}`);
    }
    if (incorrectVars.length > 0) {
      issues.push(`Incorrect: ${incorrectVars.map(v => `${v.name}=${foundVars[v.name]}`).join(', ')}`);
    }
    return { success: false, message: `Environment issues: ${issues.join('; ')}` };
  }
}

async function checkCSPConfig() {
  try {
    const deployConfigPath = 'app/frontend/deploy.config.js';
    
    if (!fs.existsSync(deployConfigPath)) {
      return { success: false, message: 'Deploy config file not found' };
    }
    
    const content = fs.readFileSync(deployConfigPath, 'utf8');
    
    // Check if localhost:10000 is in connect-src
    const hasLocalhost10000 = content.includes('http://localhost:10000') || 
                              content.includes('http://localhost:*');
    
    if (hasLocalhost10000) {
      return { success: true, message: 'CSP allows connections to localhost:10000' };
    } else {
      return { success: false, message: 'CSP does not allow connections to localhost:10000' };
    }
  } catch (error) {
    return { success: false, message: `Could not check CSP config: ${error.message}` };
  }
}

async function checkAPIEndpoints() {
  const endpoints = [
    '/health',
    '/api/auth/kyc/status',
    '/api/profiles/address/0x0000000000000000000000000000000000000000'
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const result = await makeRequest(endpoint);
      if (result.statusCode < 500) { // Accept 4xx errors as "working"
        successCount++;
      }
    } catch (error) {
      // Endpoint not accessible
    }
  }
  
  if (successCount === endpoints.length) {
    return { success: true, message: `All ${endpoints.length} API endpoints are accessible` };
  } else {
    return { 
      success: false, 
      message: `Only ${successCount}/${endpoints.length} API endpoints are accessible` 
    };
  }
}

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 10000,
      path: path,
      method: 'GET',
      timeout: 3000
    }, (res) => {
      resolve({ statusCode: res.statusCode });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

if (require.main === module) {
  verifyCompleteFix().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyCompleteFix };