#!/usr/bin/env node

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
    console.log('\n🛑 Shutting down...');
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
