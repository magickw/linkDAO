#!/usr/bin/env node

/**
 * CORS Configuration Test Script
 * 
 * This script tests the CORS configuration by making a preflight request
 * to the backend and verifying the response headers.
 */

const https = require('https');

// Test configuration
const TEST_ORIGIN = 'https://www.linkdao.io';
const BACKEND_URL = 'https://linkdao-backend.onrender.com';
const TEST_ENDPOINT = '/api/auth/nonce/0x1234567890123456789012345678901234567890';

console.log('🧪 Testing CORS Configuration');
console.log('============================');
console.log(`Origin: ${TEST_ORIGIN}`);
console.log(`Backend: ${BACKEND_URL}`);
console.log(`Endpoint: ${TEST_ENDPOINT}`);
console.log('');

// Make a preflight OPTIONS request
const options = {
  hostname: new URL(BACKEND_URL).hostname,
  port: 443,
  path: TEST_ENDPOINT,
  method: 'OPTIONS',
  headers: {
    'Origin': TEST_ORIGIN,
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'X-Requested-With, Content-Type, Authorization',
    'User-Agent': 'CORS-Test-Script/1.0'
  }
};

const req = https.request(options, (res) => {
  console.log('✅ Preflight Request Response');
  console.log('Status Code:', res.statusCode);
  console.log('Headers:');
  
  // Check for required CORS headers
  const corsHeaders = [
    'access-control-allow-origin',
    'access-control-allow-methods',
    'access-control-allow-headers',
    'access-control-allow-credentials'
  ];
  
  let hasCorsHeaders = true;
  
  corsHeaders.forEach(header => {
    const value = res.headers[header];
    if (value) {
      console.log(`  ${header}: ${value}`);
    } else {
      console.log(`  ❌ ${header}: MISSING`);
      hasCorsHeaders = false;
    }
  });
  
  console.log('');
  
  if (hasCorsHeaders) {
    console.log('🎉 CORS Configuration: PASS');
    console.log('The backend is properly configured to accept requests from the frontend.');
  } else {
    console.log('❌ CORS Configuration: FAIL');
    console.log('The backend is not properly configured for CORS.');
  }
});

req.on('error', (error) => {
  console.log('❌ Request Error:', error.message);
  console.log('This might indicate network issues or that the backend is not running.');
});

req.end();

// Also test a simple GET request
setTimeout(() => {
  console.log('\n🧪 Testing Actual Request');
  console.log('======================');
  
  const getOptions = {
    hostname: new URL(BACKEND_URL).hostname,
    port: 443,
    path: TEST_ENDPOINT,
    method: 'GET',
    headers: {
      'Origin': TEST_ORIGIN,
      'User-Agent': 'CORS-Test-Script/1.0'
    }
  };
  
  const getReq = https.request(getOptions, (res) => {
    console.log('✅ Actual Request Response');
    console.log('Status Code:', res.statusCode);
    
    const corsOrigin = res.headers['access-control-allow-origin'];
    if (corsOrigin) {
      console.log(`Access-Control-Allow-Origin: ${corsOrigin}`);
      if (corsOrigin === TEST_ORIGIN || corsOrigin === '*') {
        console.log('🎉 CORS Headers: PASS');
      } else {
        console.log('❌ CORS Headers: FAIL - Origin mismatch');
      }
    } else {
      console.log('❌ CORS Headers: FAIL - Missing Access-Control-Allow-Origin');
    }
  });
  
  getReq.on('error', (error) => {
    console.log('❌ GET Request Error:', error.message);
  });
  
  getReq.end();
}, 2000);