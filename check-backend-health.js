
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
