const https = require('https');

// IPFS Configuration from environment variables
const projectId = process.env.IPFS_PROJECT_ID || '87bcc6b0da2adb56909c';
const projectSecret = process.env.IPFS_PROJECT_SECRET || 'yf205d2640950c77a1097ad0be488547eaf8325447b9167aa9d117e34623e299a';
const host = process.env.IPFS_HOST || 'api.pinata.cloud';
const port = process.env.IPFS_PORT || '443';
const protocol = process.env.IPFS_PROTOCOL || 'https';

function testBasicConnectivity() {
  console.log('🔍 Testing basic IPFS connectivity...');
  console.log('Using configuration:');
  console.log(`  - Host: ${host}`);
  console.log(`  - Port: ${port}`);
  console.log(`  - Protocol: ${protocol}`);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: port,
      path: '/',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString('base64')}`
      },
      timeout: 10000
    };
    
    console.log(`Testing URL: ${protocol}://${host}:${port}/`);
    
    const req = https.request(options, (res) => {
      console.log(`Response status: ${res.statusCode}`);
      console.log(`Response headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response body:', data.substring(0, 200) + (data.length > 200 ? '...' : ''));
        resolve(res.statusCode >= 200 && res.statusCode < 300);
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Connection failed:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('❌ Connection timed out');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Run the test
testBasicConnectivity().then(success => {
  console.log('\n🏁 Basic connectivity test finished', success ? 'successfully' : 'with errors');
  process.exit(success ? 0 : 1);
});