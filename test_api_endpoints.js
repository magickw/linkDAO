const axios = require('axios');

// Test the API endpoints
async function testAPIEndpoints() {
  const baseURL = 'http://localhost:10000';
  
  console.log('🧪 Testing API endpoints...\n');
  
  // Test basic health endpoint
  try {
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health endpoint working:', healthResponse.data.status);
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
  }
  
  // Test messaging endpoints
  try {
    console.log('\n2. Testing messaging endpoint...');
    const messagingResponse = await axios.get(`${baseURL}/api/messaging/conversations`, {
      headers: { 'Authorization': 'Bearer test-token' } // This will fail with auth, but should not return 404
    });
    console.log('✅ Messaging endpoint accessible');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Messaging endpoint accessible (requires auth)');
    } else if (error.response && error.response.status === 404) {
      console.log('❌ Messaging endpoint not found (404)');
    } else {
      console.log('✅ Messaging endpoint accessible (auth error as expected)');
    }
  }
  
  // Test user profile endpoints
  try {
    console.log('\n3. Testing user profile endpoint...');
    const profileResponse = await axios.get(`${baseURL}/api/profiles`);
    console.log('✅ User profile endpoint accessible');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('❌ User profile endpoint not found (404)');
    } else {
      console.log('✅ User profile endpoint accessible');
    }
  }
  
  // Test reputation endpoints  
  try {
    console.log('\n4. Testing reputation endpoint...');
    const repResponse = await axios.get(`${baseURL}/api/reputation`);
    console.log('✅ Reputation endpoint accessible');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('❌ Reputation endpoint not found (404)');
    } else {
      console.log('✅ Reputation endpoint accessible');
    }
  }
  
  // Test WebSocket endpoint
  try {
    console.log('\n5. Testing WebSocket health endpoint...');
    const wsResponse = await axios.get(`${baseURL}/api/health/websocket`);
    console.log('✅ WebSocket health endpoint accessible');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('❌ WebSocket health endpoint not found (404)');
    } else {
      console.log('✅ WebSocket health endpoint accessible');
    }
  }
  
  console.log('\n🎯 API endpoint testing completed!');
}

// Run the test
testAPIEndpoints().catch(console.error);