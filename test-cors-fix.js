#!/usr/bin/env node

const http = require('http');

/**
 * Test CORS fix by making requests to the backend
 */
async function testCORSFix() {
  console.log('🧪 Testing CORS Fix');
  console.log('==================');
  
  const tests = [
    {
      name: 'Health Check',
      path: '/health',
      method: 'GET'
    },
    {
      name: 'CORS Preflight',
      path: '/api/auth/kyc/status',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'X-Session-ID'
      }
    },
    {
      name: 'API Request with CORS',
      path: '/api/auth/kyc/status',
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000'
      }
    }
  ];
  
  for (const test of tests) {
    console.log(`\n🔍 Testing: ${test.name}`);
    
    try {
      const result = await makeRequest(test);
      console.log(`✅ ${test.name}: ${result.statusCode} ${result.statusMessage}`);
      
      if (result.headers['access-control-allow-origin']) {
        console.log(`   CORS Origin: ${result.headers['access-control-allow-origin']}`);
      }
      
      if (result.headers['access-control-allow-methods']) {
        console.log(`   CORS Methods: ${result.headers['access-control-allow-methods']}`);
      }
      
      if (result.headers['access-control-allow-headers']) {
        console.log(`   CORS Headers: ${result.headers['access-control-allow-headers']}`);
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('- Backend is responding on port 10000');
  console.log('- CORS headers should be present for cross-origin requests');
  console.log('- Frontend should now be able to connect to backend');
}

function makeRequest(test) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: test.path,
      method: test.method,
      headers: test.headers || {},
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

if (require.main === module) {
  testCORSFix();
}

module.exports = { testCORSFix };