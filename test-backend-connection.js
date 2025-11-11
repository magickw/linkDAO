const http = require('http');

// Test the backend API connection
const options = {
  hostname: 'localhost',
  port: 10000,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

console.log('Testing backend connection on port 10000...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (chunk) => {
    console.log(`Body: ${chunk}`);
  });
  
  res.on('end', () => {
    console.log('Request completed');
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.on('timeout', () => {
  console.error('Request timeout');
  req.destroy();
});

req.end();