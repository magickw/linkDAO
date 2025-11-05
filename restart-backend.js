#!/usr/bin/env node

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
