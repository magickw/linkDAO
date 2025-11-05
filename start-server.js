
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
  console.log(`🔄 Server exited with code ${code}`);
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
