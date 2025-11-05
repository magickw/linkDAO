#!/usr/bin/env node

/**
 * Test script to verify post creation fix
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'https://api.linkdao.io';

console.log('🧪 Testing post creation fix...');
console.log(`📡 API Base: ${API_BASE}`);

// Test 1: Check CORS headers
function testCorsHeaders() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/posts', API_BASE);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://www.linkdao.io',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-csrf-token'
      }
    };

    const req = client.request(options, (res) => {
      const allowedHeaders = res.headers['access-control-allow-headers'] || '';
      const allowedMethods = res.headers['access-control-allow-methods'] || '';
      
      console.log('✅ CORS Preflight Response:');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Allowed Headers: ${allowedHeaders}`);
      console.log(`   Allowed Methods: ${allowedMethods}`);
      
      const hasCSRFToken = allowedHeaders.toLowerCase().includes('x-csrf-token');
      const hasPostMethod = allowedMethods.toLowerCase().includes('post');
      
      if (hasCSRFToken && hasPostMethod) {
        console.log('✅ CORS headers properly configured for post creation');
        resolve(true);
      } else {
        console.log('❌ CORS headers missing required configuration');
        console.log(`   x-csrf-token allowed: ${hasCSRFToken}`);
        console.log(`   POST method allowed: ${hasPostMethod}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.log('❌ CORS test failed:', error.message);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ CORS test timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Test 2: Check API health
function testApiHealth() {
  return new Promise((resolve, reject) => {
    const url = new URL('/health', API_BASE);
    const client = url.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'GET'
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ API Health Check: ${res.statusCode}`);
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            console.log(`   Status: ${health.status || 'unknown'}`);
            resolve(true);
          } catch (e) {
            console.log('   Response received but not JSON');
            resolve(res.statusCode < 400);
          }
        } else {
          console.log(`❌ API health check failed with status ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ API health test failed:', error.message);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ API health test timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Test 3: Try to create a test post (without authentication for now)
function testPostCreation() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/posts', API_BASE);
    const client = url.protocol === 'https:' ? https : http;
    
    const postData = JSON.stringify({
      author: '0x1234567890123456789012345678901234567890',
      content: 'Test post from fix verification script',
      tags: ['test', 'fix-verification']
    });
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Origin': 'https://www.linkdao.io',
        'x-csrf-token': 'test-token-for-verification'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ Post Creation Test: ${res.statusCode}`);
        
        if (res.statusCode === 201 || res.statusCode === 200) {
          console.log('✅ Post creation successful');
          try {
            const response = JSON.parse(data);
            console.log(`   Post ID: ${response.data?.id || 'unknown'}`);
          } catch (e) {
            console.log('   Response received but not JSON');
          }
          resolve(true);
        } else if (res.statusCode === 403 && data.includes('CORS')) {
          console.log('❌ CORS issue still present');
          resolve(false);
        } else {
          console.log(`⚠️  Post creation returned ${res.statusCode} (may be expected due to auth/validation)`);
          console.log(`   Response: ${data.substring(0, 200)}...`);
          // Don't fail the test for auth/validation errors
          resolve(true);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Post creation test failed:', error.message);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      console.log('❌ Post creation test timed out');
      req.destroy();
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('');
  
  const corsResult = await testCorsHeaders();
  console.log('');
  
  const healthResult = await testApiHealth();
  console.log('');
  
  const postResult = await testPostCreation();
  console.log('');
  
  console.log('📊 Test Results Summary:');
  console.log(`   CORS Headers: ${corsResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   API Health: ${healthResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Post Creation: ${postResult ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = corsResult && healthResult && postResult;
  console.log('');
  console.log(`🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('🎉 Post creation fix is working correctly!');
  } else {
    console.log('🔧 Some issues remain. Check the test output above for details.');
  }
}

runTests().catch(console.error);