#!/usr/bin/env node

/**
 * Test script to verify frontend-backend connection
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10000';

async function testConnection() {
  console.log('🔍 Testing Backend Connection');
  console.log('============================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  
  const tests = [
    {
      name: 'Health Check',
      url: `${BACKEND_URL}/health`,
      method: 'GET'
    },
    {
      name: 'API Root',
      url: `${BACKEND_URL}/`,
      method: 'GET'
    },
    {
      name: 'Post Test Endpoint',
      url: `${BACKEND_URL}/api/posts/test`,
      method: 'GET'
    },
    {
      name: 'CSRF Token',
      url: `${BACKEND_URL}/api/csrf-token`,
      method: 'GET'
    },
    {
      name: 'Auth Nonce',
      url: `${BACKEND_URL}/api/auth/nonce`,
      method: 'GET'
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`\n📡 Testing: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      const response = await fetch(test.url, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Status: ${response.status}`);
        console.log(`   📄 Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
        passedTests++;
      } else {
        console.log(`   ❌ Status: ${response.status}`);
        const text = await response.text();
        console.log(`   📄 Error: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        console.log(`   💡 Backend server may not be running on ${BACKEND_URL}`);
      }
    }
  }

  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`Passed: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Backend connection is working.');
  } else {
    console.log('⚠️  Some tests failed. Check the backend server.');
    
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Make sure backend server is running: npm run dev (in app/backend)');
    console.log('2. Check if port 10000 is available');
    console.log('3. Verify environment variables');
    console.log('4. Check firewall settings');
  }

  return passedTests === totalTests;
}

// Test post creation
async function testPostCreation() {
  console.log('\n📝 Testing Post Creation');
  console.log('========================');
  
  const testPost = {
    author: '0x1234567890123456789012345678901234567890',
    content: 'Test post from connection test',
    tags: ['test', 'connection']
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPost)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Post creation successful');
      console.log(`📄 Response: ${JSON.stringify(data, null, 2)}`);
      return true;
    } else {
      console.log(`❌ Post creation failed: ${response.status}`);
      const text = await response.text();
      console.log(`📄 Error: ${text}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Post creation error: ${error.message}`);
    return false;
  }
}

// Run tests
async function runAllTests() {
  const connectionOk = await testConnection();
  
  if (connectionOk) {
    await testPostCreation();
  }
  
  console.log('\n🏁 Test Complete');
}

// Check if running directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testConnection, testPostCreation };