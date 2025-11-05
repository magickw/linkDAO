#!/usr/bin/env node

// Test a completely different endpoint to see if the issue is specific to posts
const { exec } = require('child_process');

console.log('🧪 Testing different endpoints to isolate the issue...\n');

const endpoints = [
  'http://localhost:10000/health',
  'http://localhost:10000/api/auth/health',
  'http://localhost:10000/api/profiles',
  'http://localhost:10000/api/posts/test',
  'http://localhost:10000/api/posts',
];

async function testEndpoint(url) {
  return new Promise((resolve) => {
    exec(`curl -s "${url}"`, (error, stdout, stderr) => {
      if (error) {
        resolve({ url, status: 'ERROR', response: error.message });
      } else {
        try {
          const parsed = JSON.parse(stdout);
          resolve({ url, status: 'SUCCESS', response: parsed });
        } catch (parseError) {
          resolve({ url, status: 'PARSE_ERROR', response: stdout });
        }
      }
    });
  });
}

async function testAllEndpoints() {
  console.log('Testing endpoints...\n');
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    console.log(`${result.status === 'SUCCESS' ? '✅' : '❌'} ${result.url}`);
    
    if (result.status === 'SUCCESS') {
      if (result.response.success !== undefined) {
        console.log(`   Success: ${result.response.success}`);
        if (result.response.data && Array.isArray(result.response.data)) {
          console.log(`   Data length: ${result.response.data.length}`);
        }
      }
    } else {
      console.log(`   Error: ${JSON.stringify(result.response).substring(0, 100)}...`);
    }
    console.log('');
  }
  
  console.log('🎯 Analysis:');
  console.log('- If /health and /api/auth/health work: Backend is running');
  console.log('- If /api/profiles works: Database connection is working');
  console.log('- If /api/posts/* fails: Issue is specific to post routes');
}

testAllEndpoints().catch(console.error);