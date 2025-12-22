const http = require('http');

console.log('Testing share route connectivity...');

// Test the /p/:shareId route directly
const options = {
  hostname: 'localhost',
  port: 10000,
  path: '/p/test123',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`BODY: ${data}`);
    
    // Check if response is JSON
    try {
      const jsonData = JSON.parse(data);
      console.log('Response is valid JSON:', jsonData);
    } catch (e) {
      console.log('Response is NOT valid JSON');
      console.log('First 100 characters:', data.substring(0, 100));
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();