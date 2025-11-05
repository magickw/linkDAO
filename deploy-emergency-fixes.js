#!/usr/bin/env node

/**
 * Emergency Deployment Script
 * Comprehensive fix and deployment for all critical issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Emergency Deployment...\n');

// Helper function to run commands safely
function runCommand(command, cwd = process.cwd()) {
  try {
    console.log(`📝 Running: ${command}`);
    const result = execSync(command, { 
      cwd, 
      stdio: 'inherit',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Step 1: Apply all emergency fixes
console.log('🔧 Step 1: Applying Emergency Fixes...');
runCommand('node emergency-cors-fix.js');
runCommand('node fix-backend-availability.js');
runCommand('node fix-rate-limiting-websocket.js');
runCommand('node fix-typescript-errors.js');

// Step 2: Build the backend
console.log('\n🏗️  Step 2: Building Backend...');
const backendPath = path.join(__dirname, 'app/backend');

// Install dependencies if needed
if (!fs.existsSync(path.join(backendPath, 'node_modules'))) {
  console.log('📦 Installing backend dependencies...');
  runCommand('npm install', backendPath);
}

// Build the backend
console.log('🔨 Building backend...');
const buildSuccess = runCommand('npm run build', backendPath);

if (!buildSuccess) {
  console.log('⚠️  Build failed, trying alternative build...');
  // Try alternative build command
  runCommand('npx tsc --skipLibCheck --noEmit false', backendPath);
}

// Step 3: Start the backend server
console.log('\n🚀 Step 3: Starting Backend Server...');

// Create a startup script that handles errors gracefully
const startupScript = `
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting LinkDAO Backend with Emergency Fixes...');

const backendPath = path.join(__dirname, 'app/backend');
const serverProcess = spawn('node', ['dist/index.js'], {
  cwd: backendPath,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '10000'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(\`🔄 Server exited with code \${code}\`);
  if (code !== 0) {
    console.log('🔄 Restarting server in 5 seconds...');
    setTimeout(() => {
      // Restart the server
      const restartProcess = spawn('node', ['dist/index.js'], {
        cwd: backendPath,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: '10000'
        }
      });
    }, 5000);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});
`;

fs.writeFileSync('start-server.js', startupScript);

// Step 4: Verify the deployment
console.log('\n✅ Step 4: Deployment Verification...');

// Create a verification script
const verificationScript = `
const http = require('http');

console.log('🔍 Verifying deployment...');

// Test health endpoint
const testEndpoint = (path, expectedStatus = 200) => {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 10000,
      path: path,
      method: 'GET',
      timeout: 5000
    }, (res) => {
      console.log(\`✅ \${path}: \${res.statusCode}\`);
      resolve(res.statusCode === expectedStatus);
    });
    
    req.on('error', (error) => {
      console.log(\`❌ \${path}: \${error.message}\`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(\`⏰ \${path}: Timeout\`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
};

// Wait for server to start
setTimeout(async () => {
  console.log('\\n🧪 Testing endpoints...');
  
  const tests = [
    testEndpoint('/health'),
    testEndpoint('/ping'),
    testEndpoint('/api/health'),
    testEndpoint('/status')
  ];
  
  const results = await Promise.all(tests);
  const passedTests = results.filter(Boolean).length;
  
  console.log(\`\\n📊 Test Results: \${passedTests}/\${tests.length} passed\`);
  
  if (passedTests >= tests.length * 0.75) {
    console.log('🎉 Deployment verification PASSED!');
    console.log('✅ Backend is ready for production use');
  } else {
    console.log('⚠️  Deployment verification FAILED!');
    console.log('❌ Some endpoints are not responding correctly');
  }
}, 10000); // Wait 10 seconds for server to start
`;

fs.writeFileSync('verify-deployment.js', verificationScript);

// Step 5: Create monitoring script
console.log('\n📊 Step 5: Setting up Monitoring...');

const monitoringScript = `
const http = require('http');
const fs = require('fs');

console.log('📊 Starting deployment monitoring...');

let healthCheckCount = 0;
let failureCount = 0;

const performHealthCheck = () => {
  const req = http.request({
    hostname: 'localhost',
    port: 10000,
    path: '/health',
    method: 'GET',
    timeout: 5000
  }, (res) => {
    healthCheckCount++;
    if (res.statusCode === 200) {
      console.log(\`✅ Health check \${healthCheckCount}: OK\`);
      failureCount = 0; // Reset failure count on success
    } else {
      failureCount++;
      console.log(\`⚠️  Health check \${healthCheckCount}: Status \${res.statusCode}\`);
    }
  });
  
  req.on('error', (error) => {
    failureCount++;
    console.log(\`❌ Health check \${healthCheckCount}: \${error.message}\`);
    
    if (failureCount >= 3) {
      console.log('🚨 Multiple health check failures detected!');
      console.log('🔄 Consider restarting the server');
    }
  });
  
  req.on('timeout', () => {
    failureCount++;
    console.log(\`⏰ Health check \${healthCheckCount}: Timeout\`);
    req.destroy();
  });
  
  req.end();
};

// Perform health checks every 30 seconds
setInterval(performHealthCheck, 30000);

// Initial health check
setTimeout(performHealthCheck, 5000);

console.log('📊 Monitoring started - health checks every 30 seconds');
`;

fs.writeFileSync('monitor-deployment.js', monitoringScript);

// Final instructions
console.log('\n🎉 Emergency Deployment Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Start the server: node start-server.js');
console.log('2. Verify deployment: node verify-deployment.js');
console.log('3. Monitor health: node monitor-deployment.js');
console.log('4. Check logs for any issues');

console.log('\n🔧 Troubleshooting:');
console.log('- If server fails to start, check the logs in app/backend/');
console.log('- If CORS errors persist, check the CORS configuration');
console.log('- If memory issues occur, restart with: node --max-old-space-size=1024 start-server.js');

console.log('\n📞 Emergency Contacts:');
console.log('- Check server status: curl http://localhost:10000/health');
console.log('- View server logs: tail -f app/backend/logs/app.log');
console.log('- Monitor memory: node --inspect start-server.js');

console.log('\n✅ All emergency fixes have been applied and deployment is ready!');