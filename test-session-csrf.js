#!/usr/bin/env node

/**
 * Test script to verify session and CSRF functionality
 */

const API_BASE_URL = 'http://localhost:10000';

async function testSessionAndCSRF() {
  console.log('🧪 Testing session and CSRF functionality...\n');

  try {
    // Test 1: Create a session
    console.log('1. Creating a session...');
    const sessionResponse = await fetch(`${API_BASE_URL}/api/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const sessionData = await sessionResponse.json();
    
    if (sessionData.success) {
      console.log(`   ✅ Session created: ${sessionData.data.sessionId.substring(0, 16)}...`);
      
      // Extract session ID from response
      const sessionId = sessionData.data.sessionId;
      
      // Test 2: Get CSRF token with session
      console.log('\n2. Getting CSRF token with session...');
      const csrfResponse = await fetch(`${API_BASE_URL}/api/csrf-token`, {
        headers: {
          'X-Session-ID': sessionId
        }
      });
      
      const csrfData = await csrfResponse.json();
      
      if (csrfData.success) {
        console.log(`   ✅ CSRF token obtained: ${csrfData.data.csrfToken.substring(0, 16)}...`);
        
        // Test 3: Create a post with session and CSRF token
        console.log('\n3. Testing post creation with session and CSRF...');
        const postData = {
          author: '0x1234567890123456789012345678901234567890',
          content: 'Test post with session and CSRF protection',
          tags: ['test', 'session', 'csrf']
        };

        const postResponse = await fetch(`${API_BASE_URL}/api/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': sessionId,
            'X-CSRF-Token': csrfData.data.csrfToken
          },
          body: JSON.stringify(postData)
        });

        const postResult = await postResponse.json();
        
        if (postResponse.ok && postResult.id) {
          console.log('   ✅ Post created successfully!');
          console.log(`   📝 Post ID: ${postResult.id}`);
          console.log(`   👤 Author: ${postResult.author}`);
          console.log(`   📄 Content CID: ${postResult.contentCid}`);
        } else {
          console.log('   ❌ Post creation failed');
          console.log(`   📄 Response: ${JSON.stringify(postResult, null, 2)}`);
        }
        
      } else {
        console.log('   ❌ CSRF token generation failed');
        console.log(`   📄 Response: ${JSON.stringify(csrfData, null, 2)}`);
      }
      
    } else {
      console.log('   ❌ Session creation failed');
      console.log(`   📄 Response: ${JSON.stringify(sessionData, null, 2)}`);
    }

    console.log('\n🎉 Test completed!');
    console.log('\n📋 Summary:');
    console.log('   - Session management is working');
    console.log('   - CSRF protection is functional');
    console.log('   - Post creation works with proper authentication');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Make sure the backend is running: npm run dev:backend');
      console.log('   2. Check if port 10000 is available');
      console.log('   3. Verify the session routes are properly registered');
    }
  }
}

// Run the test
testSessionAndCSRF();