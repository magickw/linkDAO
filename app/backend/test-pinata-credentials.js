const https = require('https');

// Current credentials from .env
const projectId = '87bcc6b0da2adb56909c';
const projectSecret = 'yf205d2640950c77a1097ad0be488547eaf8325447b9167aa9d117e34623e299a';

function testPinataCredentials() {
  console.log('🔍 Testing Pinata credentials...');
  
  const auth = `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString('base64')}`;
  console.log('Auth header created');
  
  const options = {
    hostname: 'api.pinata.cloud',
    port: 443,
    path: '/data/test',
    method: 'GET',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  };
  
  console.log('Testing endpoint: /data/test');
  
  const req = https.request(options, (res) => {
    console.log(`Response status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response body: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
      
      if (res.statusCode === 200) {
        console.log('✅ Credentials are valid!');
      } else if (res.statusCode === 401) {
        console.log('❌ Authentication failed - invalid credentials');
      } else if (res.statusCode === 403) {
        console.log('❌ Forbidden - credentials valid but insufficient permissions');
      } else {
        console.log(`❌ Unexpected response: ${res.statusCode}`);
      }
      
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
  });
  
  req.on('error', (error) => {
    console.error(`❌ Request failed: ${error.message}`);
    process.exit(1);
  });
  
  req.on('timeout', () => {
    console.error('❌ Request timed out');
    req.destroy();
    process.exit(1);
  });
  
  req.end();
}

testPinataCredentials();