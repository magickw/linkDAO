#!/usr/bin/env node

/**
 * Direct test of post creation without CSRF
 */

const API_BASE_URL = 'http://localhost:10000';

async function testDirectPost() {
  console.log('🧪 Testing direct post creation...\n');

  try {
    // Test post creation without CSRF token
    console.log('1. Testing post creation without CSRF...');
    const postData = {
      author: '0x1234567890123456789012345678901234567890',
      content: 'Test post without CSRF protection',
      tags: ['test', 'direct']
    };

    const postResponse = await fetch(`${API_BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    const postResult = await postResponse.json();
    
    console.log(`   Status: ${postResponse.status}`);
    console.log(`   Response: ${JSON.stringify(postResult, null, 2)}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDirectPost();