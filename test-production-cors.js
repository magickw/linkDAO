#!/usr/bin/env node

/**
 * Test Production CORS Fix
 * 
 * This script tests if the CORS issue has been resolved in production
 */

const https = require('https');
const http = require('http');

async function testCORS(url, origin) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    };

    const req = client.request(options, (res) => {
      const corsOrigin = res.headers['access-control-allow-origin'];
      resolve({
        status: res.statusCode,
        corsOrigin: corsOrigin,
        headers: res.headers
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function testPostCreation(url, origin) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const postData = JSON.stringify({
      content: "Test post from CORS fix verification",
      type: "text",
      visibility: "public"
    });

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          corsOrigin: res.headers['access-control-allow-origin'],
          body: data,
          headers: res.headers
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Production CORS Fix...\n');

  const testOrigins = [
    'https://www.linkdao.io',
    'https://linkdao.io',
    'https://linkdao.vercel.app'
  ];

  const apiUrl = 'https://api.linkdao.io';

  // Test 1: Health endpoint CORS
  console.log('1️⃣ Testing Health Endpoint CORS...');
  for (const origin of testOrigins) {
    try {
      const result = await testCORS(`${apiUrl}/health`, origin);
      console.log(`   Origin: ${origin}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   CORS Origin: ${result.corsOrigin}`);
      
      if (result.corsOrigin && result.corsOrigin.includes(',')) {
        console.log('   ❌ MULTIPLE ORIGINS DETECTED - CORS NOT FIXED');
      } else if (result.corsOrigin === origin) {
        console.log('   ✅ CORS WORKING CORRECTLY');
      } else {
        console.log(`   ⚠️  Unexpected CORS origin: ${result.corsOrigin}`);
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error testing ${origin}: ${error.message}\n`);
    }
  }

  // Test 2: Post creation endpoint
  console.log('2️⃣ Testing Post Creation CORS...');
  const testOrigin = 'https://www.linkdao.io';
  
  try {
    const result = await testPostCreation(`${apiUrl}/api/posts`, testOrigin);
    console.log(`   Origin: ${testOrigin}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   CORS Origin: ${result.corsOrigin}`);
    
    if (result.corsOrigin && result.corsOrigin.includes(',')) {
      console.log('   ❌ MULTIPLE ORIGINS DETECTED - CORS NOT FIXED');
    } else if (result.status === 200 || result.status === 201) {
      console.log('   ✅ POST CREATION WORKING');
      try {
        const responseData = JSON.parse(result.body);
        if (responseData.success) {
          console.log(`   ✅ Post created successfully: ${responseData.data?.id || 'unknown ID'}`);
        }
      } catch (e) {
        console.log('   ⚠️  Response not JSON, but request succeeded');
      }
    } else if (result.status === 503) {
      console.log('   ⚠️  Service unavailable (503) - backend may be down');
    } else {
      console.log(`   ⚠️  Unexpected status: ${result.status}`);
    }
    
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error testing post creation: ${error.message}\n`);
  }

  console.log('📋 Test Summary:');
  console.log('If you see "MULTIPLE ORIGINS DETECTED", the CORS fix needs to be deployed.');
  console.log('If you see "CORS WORKING CORRECTLY", the fix is working!');
  console.log('If you see 503 errors, the backend may need to be restarted.');
}

runTests().catch(console.error);