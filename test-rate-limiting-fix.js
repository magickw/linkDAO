#!/usr/bin/env node

/**
 * Test script to verify rate limiting and request optimization fixes
 */

const https = require('https');
const http = require('http');

const BACKEND_URL = 'https://linkdao-backend.onrender.com';
const TEST_ENDPOINTS = [
  '/health',
  '/api/communities',
  '/api/feed?page=1&limit=20&sort=hot&timeRange=day',
  '/api/governance/proposals/active'
];

let requestCount = 0;
let successCount = 0;
let errorCount = 0;
let rateLimitCount = 0;
let serviceUnavailableCount = 0;

function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const url = `${BACKEND_URL}${endpoint}`;
    const startTime = Date.now();
    
    const request = https.get(url, (res) => {
      const responseTime = Date.now() - startTime;
      requestCount++;
      
      if (res.statusCode === 200) {
        successCount++;
        console.log(`✅ ${endpoint} - ${res.statusCode} (${responseTime}ms)`);
      } else if (res.statusCode === 429) {
        rateLimitCount++;
        console.log(`⚠️  ${endpoint} - Rate Limited (${responseTime}ms)`);
      } else if (res.statusCode === 503) {
        serviceUnavailableCount++;
        console.log(`🚫 ${endpoint} - Service Unavailable (${responseTime}ms)`);
      } else {
        errorCount++;
        console.log(`❌ ${endpoint} - ${res.statusCode} (${responseTime}ms)`);
      }
      
      resolve({
        endpoint,
        statusCode: res.statusCode,
        responseTime,
        headers: res.headers
      });
    });
    
    request.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      requestCount++;
      errorCount++;
      console.log(`💥 ${endpoint} - Error: ${error.message} (${responseTime}ms)`);
      resolve({
        endpoint,
        error: error.message,
        responseTime
      });
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      const responseTime = Date.now() - startTime;
      requestCount++;
      errorCount++;
      console.log(`⏰ ${endpoint} - Timeout (${responseTime}ms)`);
      resolve({
        endpoint,
        error: 'Timeout',
        responseTime
      });
    });
  });
}

async function runTest() {
  console.log('🧪 Testing Rate Limiting and Request Optimization Fixes\n');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Test Endpoints: ${TEST_ENDPOINTS.length}`);
  console.log('─'.repeat(60));
  
  // Test 1: Sequential requests (should work fine)
  console.log('\n📋 Test 1: Sequential Requests');
  for (const endpoint of TEST_ENDPOINTS) {
    await makeRequest(endpoint);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }
  
  // Test 2: Rapid requests (should trigger rate limiting)
  console.log('\n📋 Test 2: Rapid Requests (testing rate limiting)');
  const rapidPromises = [];
  for (let i = 0; i < 15; i++) {
    rapidPromises.push(makeRequest('/api/communities'));
  }
  await Promise.all(rapidPromises);
  
  // Test 3: Health check
  console.log('\n📋 Test 3: Health Check');
  await makeRequest('/health');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`Total Requests: ${requestCount}`);
  console.log(`✅ Successful: ${successCount} (${Math.round(successCount/requestCount*100)}%)`);
  console.log(`⚠️  Rate Limited: ${rateLimitCount} (${Math.round(rateLimitCount/requestCount*100)}%)`);
  console.log(`🚫 Service Unavailable: ${serviceUnavailableCount} (${Math.round(serviceUnavailableCount/requestCount*100)}%)`);
  console.log(`❌ Other Errors: ${errorCount} (${Math.round(errorCount/requestCount*100)}%)`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  if (rateLimitCount > 5) {
    console.log('- Consider implementing request batching');
    console.log('- Add longer delays between requests');
    console.log('- Implement exponential backoff');
  }
  if (serviceUnavailableCount > 2) {
    console.log('- Backend may be overloaded');
    console.log('- Consider implementing circuit breaker pattern');
    console.log('- Add fallback data for critical endpoints');
  }
  if (successCount / requestCount > 0.8) {
    console.log('- ✅ Good success rate! Rate limiting fixes appear to be working');
  }
  
  console.log('\n🏁 Test completed');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:', error.message);
  process.exit(1);
});

// Run the test
runTest().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});