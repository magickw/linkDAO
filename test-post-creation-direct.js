#!/usr/bin/env node

/**
 * Direct Post Creation Test
 * Tests the post creation endpoint directly to identify issues
 */

const https = require('https');

const BACKEND_URL = 'https://api.linkdao.io';
const FRONTEND_ORIGIN = 'https://www.linkdao.io';

console.log('🧪 Testing Post Creation Endpoint...');

async function testPostCreation() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      content: 'Test post from diagnostic script',
      type: 'text',
      visibility: 'public'
    });

    const options = {
      hostname: 'api.linkdao.io',
      port: 443,
      path: '/api/posts',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Origin': FRONTEND_ORIGIN,
        'User-Agent': 'Post-Creation-Test/1.0'
      }
    };

    console.log(`📡 Testing POST ${BACKEND_URL}/api/posts`);
    console.log(`📝 Payload: ${postData}`);

    const req = https.request(options, (res) => {
      console.log(`📊 Response Status: ${res.statusCode}`);
      console.log(`📋 Response Headers:`, res.headers);

      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        console.log(`📄 Response Body: ${responseData}`);
        
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: responseData,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('❌ Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

async function testHealthEndpoint() {
  return new Promise((resolve) => {
    const req = https.request(`${BACKEND_URL}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data,
          healthy: res.statusCode === 200
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        healthy: false
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Timeout',
        healthy: false
      });
    });

    req.end();
  });
}

async function runTests() {
  try {
    console.log('\n1️⃣ Testing health endpoint...');
    const health = await testHealthEndpoint();
    console.log(`   Health Status: ${health.status} ${health.healthy ? '✅' : '❌'}`);
    if (health.error) console.log(`   Error: ${health.error}`);

    console.log('\n2️⃣ Testing post creation...');
    const postResult = await testPostCreation();
    
    console.log('\n📋 TEST SUMMARY:');
    console.log(`Backend Health: ${health.healthy ? '✅' : '❌'}`);
    console.log(`Post Creation: ${postResult.success ? '✅' : '❌'}`);
    
    if (!postResult.success) {
      console.log('\n🔍 DIAGNOSIS:');
      if (postResult.status === 503) {
        console.log('   - Service Unavailable (503) - Backend overloaded or down');
      } else if (postResult.status === 404) {
        console.log('   - Not Found (404) - Post endpoint not configured');
      } else if (postResult.status === 500) {
        console.log('   - Internal Server Error (500) - Backend crash or database issue');
      } else if (postResult.status === 0) {
        console.log('   - Connection Failed - Network or DNS issue');
      }
      
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('   1. Check Render backend logs for errors');
      console.log('   2. Verify database connection is working');
      console.log('   3. Ensure post routes are properly configured');
      console.log('   4. Check if backend is running out of memory');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

runTests();