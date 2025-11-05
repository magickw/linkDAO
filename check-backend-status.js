#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

/**
 * Check if backend is running and start it if needed
 */
async function checkBackendStatus() {
  console.log('🔍 Checking backend status...');
  
  try {
    // Check if backend is responding
    const isRunning = await checkBackendHealth();
    
    if (isRunning) {
      console.log('✅ Backend is running and healthy');
      return true;
    } else {
      console.log('❌ Backend is not responding');
      console.log('🚀 Starting backend...');
      return await startBackend();
    }
  } catch (error) {
    console.error('❌ Error checking backend status:', error.message);
    return false;
  }
}

/**
 * Check if backend is healthy
 */
function checkBackendHealth() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 10000,
      path: '/health',
      method: 'GET',
      timeout: 5000
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

/**
 * Start the backend server
 */
function startBackend() {
  return new Promise((resolve) => {
    const backendPath = path.join(__dirname, 'app', 'backend');
    
    console.log(`📁 Backend path: ${backendPath}`);
    
    // Check if we have a start script
    const startScript = path.join(backendPath, 'start-server.js');
    const packageJson = path.join(backendPath, 'package.json');
    
    let command, args;
    
    // Try different ways to start the backend
    if (require('fs').existsSync(startScript)) {
      command = 'node';
      args = [startScript];
    } else if (require('fs').existsSync(packageJson)) {
      command = 'npm';
      args = ['run', 'dev'];
    } else {
      console.log('❌ Could not find backend start script');
      resolve(false);
      return;
    }
    
    console.log(`🚀 Running: ${command} ${args.join(' ')}`);
    
    const backend = spawn(command, args, {
      cwd: backendPath,
      stdio: 'pipe',
      detached: false
    });
    
    let startupOutput = '';
    
    backend.stdout.on('data', (data) => {
      const output = data.toString();
      startupOutput += output;
      console.log('📤 Backend:', output.trim());
      
      // Check if server started successfully
      if (output.includes('Server running') || output.includes('listening') || output.includes('started')) {
        setTimeout(async () => {
          const isHealthy = await checkBackendHealth();
          resolve(isHealthy);
        }, 2000);
      }
    });
    
    backend.stderr.on('data', (data) => {
      const output = data.toString();
      console.error('📤 Backend Error:', output.trim());
      
      // Don't fail on warnings
      if (!output.toLowerCase().includes('warning')) {
        startupOutput += output;
      }
    });
    
    backend.on('error', (error) => {
      console.error('❌ Failed to start backend:', error.message);
      resolve(false);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!backend.killed) {
        console.log('⏰ Backend startup timeout');
        resolve(false);
      }
    }, 30000);
  });
}

/**
 * Main execution
 */
if (require.main === module) {
  checkBackendStatus().then((success) => {
    if (success) {
      console.log('✅ Backend is ready!');
      process.exit(0);
    } else {
      console.log('❌ Backend failed to start');
      console.log('\n📋 Troubleshooting steps:');
      console.log('1. Check if port 10000 is available');
      console.log('2. Ensure backend dependencies are installed: cd app/backend && npm install');
      console.log('3. Check backend environment variables');
      console.log('4. Try starting manually: cd app/backend && npm run dev');
      process.exit(1);
    }
  });
}

module.exports = { checkBackendStatus, checkBackendHealth };