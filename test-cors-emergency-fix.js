#!/usr/bin/env node

/**
 * Test CORS Emergency Fix
 * Verifies that the backend is responding with proper CORS headers
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://api.linkdao.io';
const FRONTEND_ORIGIN = 'https://www.linkdao.io';

console.log('🧪 Testing CORS Emergency Fix...');
console.log(`📡 Backend URL: ${BACKEND_URL}`);
console.log(`🌐 Frontend Origin: ${FRONTEND_ORIGIN}`);

// Test function
async function testCorsHeaders() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.linkdao.io',
      port: 443,
      path: '/health',
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'User-Agent': 'CORS-Test-Script/1.0'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`📊 Response Status: ${res.statusCode}`);
      
      const corsHeaders = {
        'access-control-allow-origin': res.headers['access-control-allow-origin'],
        'access-control-allow-methods': res.headers['access-control-allow-methods'],
        'access-control-allow-headers': res.headers['access-control-allow-headers'],
        'access-control-allow-credentials': res.headers['access-control-allow-credentials']
      };
      
      console.log('🔍 CORS Headers:');
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value) {
          console.log(`  ${key}: ${value}`);
        }
      });
      
      // Check for the multiple origins issue
      const allowOrigin = corsHeaders['access-control-allow-origin'];
      if (allowOrigin && allowOrigin.includes(',')) {
        console.log('❌ ISSUE DETECTED: Multiple origins in Access-Control-Allow-Origin header');
        console.log(`   Value: ${allowOrigin}`);
        resolve({ success: false, issue: 'multiple_origins', headers: corsHeaders });
      } else if (allowOrigin === FRONTEND_ORIGIN || allowOrigin === '*') {
        console.log('✅ CORS headers look correct');
        resolve({ success: true, headers: corsHeaders });
      } else {
        console.log(`⚠️ Unexpected origin: ${allowOrigin}`);
        resolve({ success: false, issue: 'unexpected_origin', headers: corsHeaders });
      }
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

    req.end();
  });
}

// Test preflight request
async function testPreflightRequest() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.linkdao.io',
      port: 443,
      path: '/api/posts',
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
        'User-Agent': 'CORS-Preflight-Test/1.0'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`📊 Preflight Status: ${res.statusCode}`);
      
      const corsHeaders = {
        'access-control-allow-origin': res.headers['access-control-allow-origin'],
        'access-control-allow-methods': res.headers['access-control-allow-methods'],
        'access-control-allow-headers': res.headers['access-control-allow-headers'],
        'access-control-max-age': res.headers['access-control-max-age']
      };
      
      console.log('🔍 Preflight CORS Headers:');
      Object.entries(corsHeaders).forEach(([key, value]) => {
        if (value) {
          console.log(`  ${key}: ${value}`);
        }
      });
      
      resolve({ success: res.statusCode === 200, headers: corsHeaders });
    });

    req.on('error', (error) => {
      console.error('❌ Preflight request failed:', error.message);
      reject(error);
    });

    req.setTimeout(10000, () => {
      console.error('❌ Preflight request timeout');
      req.destroy();
      reject(new Error('Preflight timeout'));
    });

    req.end();
  });
}

// Run tests
async function runTests() {
  try {
    console.log('\n1️⃣ Testing basic CORS headers...');
    const basicTest = await testCorsHeaders();
    
    console.log('\n2️⃣ Testing preflight request...');
    const preflightTest = await testPreflightRequest();
    
    console.log('\n📋 TEST SUMMARY:');
    console.log(`Basic CORS: ${basicTest.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Preflight: ${preflightTest.success ? '✅ PASS' : '❌ FAIL'}`);
    
    if (basicTest.success && preflightTest.success) {
      console.log('\n🎉 ALL TESTS PASSED - CORS fix is working!');
    } else {
      console.log('\n⚠️ Some tests failed - may need additional fixes');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 This might indicate the backend is still starting up or has other issues');
    console.log('💡 Try running this test again in a few minutes');
  }
}

runTests();