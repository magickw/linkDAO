
const http = require('http');

console.log('🔍 Verifying deployment...');

// Test health endpoint
const testEndpoint = (path, expectedStatus = 200) => {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 10000,
      path: path,
      method: 'GET',
      timeout: 5000
    }, (res) => {
      console.log(`✅ ${path}: ${res.statusCode}`);
      resolve(res.statusCode === expectedStatus);
    });
    
    req.on('error', (error) => {
      console.log(`❌ ${path}: ${error.message}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log(`⏰ ${path}: Timeout`);
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
};

// Wait for server to start
setTimeout(async () => {
  console.log('\n🧪 Testing endpoints...');
  
  const tests = [
    testEndpoint('/health'),
    testEndpoint('/ping'),
    testEndpoint('/api/health'),
    testEndpoint('/status')
  ];
  
  const results = await Promise.all(tests);
  const passedTests = results.filter(Boolean).length;
  
  console.log(`\n📊 Test Results: ${passedTests}/${tests.length} passed`);
  
  if (passedTests >= tests.length * 0.75) {
    console.log('🎉 Deployment verification PASSED!');
    console.log('✅ Backend is ready for production use');
  } else {
    console.log('⚠️  Deployment verification FAILED!');
    console.log('❌ Some endpoints are not responding correctly');
  }
}, 10000); // Wait 10 seconds for server to start
