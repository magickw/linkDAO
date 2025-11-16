// Test IPFS gateway connectivity
const https = require('https');
const http = require('http');
const { URL } = require('url');

// IPFS Configuration from environment variables
const gatewayUrl = process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/';
const projectId = process.env.IPFS_PROJECT_ID || '87bcc6b0da2adb56909c';
const projectSecret = process.env.IPFS_PROJECT_SECRET || 'yf205d2640950c77a1097ad0be488547eaf8325447b9167aa9d117e34623e299a';
const host = process.env.IPFS_HOST || 'api.pinata.cloud';
const port = process.env.IPFS_PORT || '443';
const protocol = process.env.IPFS_PROTOCOL || 'https';

// Test a known IPFS hash (IPFS logo)
const testHash = 'QmPChd2hVbrJ6bfo3WBcTW4iZnpHm8TEzWgaVa1ecN1BAD';

async function testGatewayConnection() {
  console.log('🔍 Testing IPFS gateway connection...');
  console.log('Using configuration:');
  console.log(`  - Gateway URL: ${gatewayUrl}`);
  console.log(`  - Host: ${host}`);
  console.log(`  - Port: ${port}`);
  console.log(`  - Protocol: ${protocol}`);
  console.log(`  - Project ID: ${projectId ? '***masked***' : 'not set'}`);
  console.log(`  - Project Secret: ${projectSecret ? '***masked***' : 'not set'}`);

  try {
    console.log('\n📡 Testing gateway connectivity...');
    
    // Test gateway with a known IPFS hash
    const testUrl = `${gatewayUrl}${testHash}`;
    console.log(`Testing URL: ${testUrl}`);
    
    return new Promise((resolve, reject) => {
      const url = new URL(testUrl);
      const lib = url.protocol === 'https:' ? https : http;
      
      const req = lib.get(testUrl, (res) => {
        console.log(`Gateway response status: ${res.statusCode}`);
        console.log(`Gateway response headers:`, res.headers);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Gateway connection successful!');
          resolve(true);
        } else {
          console.log(`❌ Gateway connection failed with status: ${res.statusCode}`);
          resolve(false);
        }
      });
      
      req.on('error', (error) => {
        console.log(`❌ Gateway connection failed with error: ${error.message}`);
        resolve(false);
      });
      
      req.setTimeout(10000, () => {
        console.log('❌ Gateway connection timed out');
        req.destroy();
        resolve(false);
      });
    });
  } catch (error) {
    console.error('❌ Gateway connection test failed:', error.message);
    return false;
  }
}

async function testAPIConnection() {
  console.log('\n📡 Testing IPFS API connection...');
  
  const apiEndpoint = `${protocol}://${host}:${port}`;
  console.log(`Testing API endpoint: ${apiEndpoint}`);
  
  return new Promise((resolve, reject) => {
    const url = new URL(apiEndpoint);
    const lib = url.protocol === 'https:' ? https : http;
    
    const req = lib.get(apiEndpoint, (res) => {
      console.log(`API response status: ${res.statusCode}`);
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('✅ API endpoint accessible!');
        resolve(true);
      } else {
        console.log(`❌ API endpoint failed with status: ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log(`❌ API connection failed with error: ${error.message}`);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ API connection timed out');
      req.destroy();
      resolve(false);
    });
  });
}

// Run the tests
async function runAllTests() {
  console.log('🔍 Running IPFS connectivity tests...\n');
  
  const gatewaySuccess = await testGatewayConnection();
  const apiSuccess = await testAPIConnection();
  
  console.log('\n📊 Test Results:');
  console.log(`  Gateway Connection: ${gatewaySuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`  API Connection: ${apiSuccess ? '✅ Success' : '❌ Failed'}`);
  
  const overallSuccess = gatewaySuccess && apiSuccess;
  console.log(`\n🏁 Overall: ${overallSuccess ? '✅ All tests passed' : '❌ Some tests failed'}`);
  
  process.exit(overallSuccess ? 0 : 1);
}

runAllTests();