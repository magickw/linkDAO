const http = require('http');

// Simple test script to verify API integration
async function testApiIntegration() {
  console.log('🧪 Testing Backend API Integration...\n');

  const baseUrl = 'http://localhost:10000';
  const testEndpoints = [
    '/',
    '/health',
    '/api/marketplace/health',
    '/api/marketplace/listings',
    '/api/v1/marketplace/listings',
    '/api/auth/profile', // Should return 401
    '/api/cart', // Should return 401
    '/api/sellers/dashboard' // Should return 401
  ];

  for (const endpoint of testEndpoints) {
    try {
      const response = await makeRequest(baseUrl + endpoint);
      console.log(`✅ ${endpoint}: ${response.status} - ${response.success ? 'Success' : 'Expected error'}`);
      
      if (endpoint === '/api/marketplace/health') {
        console.log(`   Service: ${response.data?.service}`);
        console.log(`   Status: ${response.data?.status}`);
      }
      
      if (endpoint === '/api/marketplace/listings' || endpoint === '/api/v1/marketplace/listings') {
        console.log(`   Data type: ${Array.isArray(response.data?.listings) ? 'Array' : typeof response.data}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }

  console.log('\n🎉 API Integration test completed!');
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: parsed.success,
            data: parsed.data,
            error: parsed.error
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            success: false,
            data: data,
            error: 'Parse error'
          });
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Check if server is running
makeRequest('http://localhost:10000/health')
  .then(() => {
    console.log('🚀 Server is running, starting tests...\n');
    testApiIntegration();
  })
  .catch(() => {
    console.log('❌ Server is not running on port 10000');
    console.log('Please start the server first with: npm start');
    process.exit(1);
  });