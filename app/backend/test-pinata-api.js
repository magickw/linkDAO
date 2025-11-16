const https = require('https');

// IPFS Configuration from environment variables
const projectId = process.env.IPFS_PROJECT_ID || '87bcc6b0da2adb56909c';
const projectSecret = process.env.IPFS_PROJECT_SECRET || 'yf205d2640950c77a1097ad0be488547eaf8325447b9167aa9d117e34623e299a';
const host = process.env.IPFS_HOST || 'api.pinata.cloud';
const port = process.env.IPFS_PORT || '443';
const protocol = process.env.IPFS_PROTOCOL || 'https';

function testPinataAPI() {
  console.log('🔍 Testing Pinata API directly...');
  console.log('Using configuration:');
  console.log(`  - Host: ${host}`);
  console.log(`  - Port: ${port}`);
  console.log(`  - Protocol: ${protocol}`);
  
  const auth = `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString('base64')}`;
  console.log('  - Auth header created');
  
  // Test different endpoints that might be available
  const endpoints = [
    '/', // Root endpoint
    '/api/v0/id', // Standard IPFS API endpoint for node info
    '/data/test', // Test endpoint
  ];
  
  const testEndpoint = (path) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: host,
        port: port,
        path: path,
        method: 'GET',
        headers: {
          'Authorization': auth
        },
        timeout: 10000
      };
      
      console.log(`\nTesting endpoint: ${path}`);
      
      const req = https.request(options, (res) => {
        console.log(`Response status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`Response body: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
          resolve({ path, status: res.statusCode, body: data });
        });
      });
      
      req.on('error', (error) => {
        console.error(`❌ Request failed: ${error.message}`);
        resolve({ path, error: error.message });
      });
      
      req.on('timeout', () => {
        console.error('❌ Request timed out');
        req.destroy();
        resolve({ path, error: 'timeout' });
      });
      
      req.end();
    });
  };
  
  // Test all endpoints
  return Promise.all(endpoints.map(testEndpoint));
}

// Run the tests
testPinataAPI().then(results => {
  console.log('\n📊 Test Results:');
  results.forEach(result => {
    if (result.error) {
      console.log(`  ${result.path}: ❌ ${result.error}`);
    } else {
      console.log(`  ${result.path}: ${result.status >= 200 && result.status < 300 ? '✅' : '❌'} ${result.status}`);
    }
  });
  
  const success = results.some(r => r.status && r.status >= 200 && r.status < 300);
  console.log(`\n🏁 Overall: ${success ? '✅ Some tests passed' : '❌ All tests failed'}`);
  process.exit(success ? 0 : 1);
});