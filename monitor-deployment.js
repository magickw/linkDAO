
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
      console.log(`✅ Health check ${healthCheckCount}: OK`);
      failureCount = 0; // Reset failure count on success
    } else {
      failureCount++;
      console.log(`⚠️  Health check ${healthCheckCount}: Status ${res.statusCode}`);
    }
  });
  
  req.on('error', (error) => {
    failureCount++;
    console.log(`❌ Health check ${healthCheckCount}: ${error.message}`);
    
    if (failureCount >= 3) {
      console.log('🚨 Multiple health check failures detected!');
      console.log('🔄 Consider restarting the server');
    }
  });
  
  req.on('timeout', () => {
    failureCount++;
    console.log(`⏰ Health check ${healthCheckCount}: Timeout`);
    req.destroy();
  });
  
  req.end();
};

// Perform health checks every 30 seconds
setInterval(performHealthCheck, 30000);

// Initial health check
setTimeout(performHealthCheck, 5000);

console.log('📊 Monitoring started - health checks every 30 seconds');
