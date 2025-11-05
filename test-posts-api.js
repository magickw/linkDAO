#!/usr/bin/env node

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: `/api/posts${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testPostsAPI() {
  console.log('🧪 Testing Posts API...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const health = await makeRequest('GET', '/test');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${JSON.stringify(health.data, null, 2)}\n`);

    // Test 2: Create a post
    console.log('2. Creating a new post...');
    const newPost = await makeRequest('POST', '', {
      author: '0x1234567890123456789012345678901234567890',
      content: 'Hello from test script!',
      tags: ['test', 'api']
    });
    console.log(`   Status: ${newPost.status}`);
    console.log(`   Response: ${JSON.stringify(newPost.data, null, 2)}\n`);

    // Test 3: Get all posts
    console.log('3. Retrieving all posts...');
    const allPosts = await makeRequest('GET', '');
    console.log(`   Status: ${allPosts.status}`);
    console.log(`   Response: ${JSON.stringify(allPosts.data, null, 2)}\n`);

    // Test 4: Diagnostic endpoint
    console.log('4. Testing diagnostic endpoint...');
    const diagnostic = await makeRequest('GET', '/diagnostic');
    console.log(`   Status: ${diagnostic.status}`);
    console.log(`   Response: ${JSON.stringify(diagnostic.data, null, 2)}\n`);

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testPostsAPI();