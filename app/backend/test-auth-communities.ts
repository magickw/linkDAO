import fetch from 'node-fetch';

const API_BASE = 'https://api.linkdao.io';

// Test with a sample JWT token (this would normally come from the auth service)
// For testing purposes, we'll need to get a valid token first
async function getAuthToken() {
  try {
    // Try to login to get a token
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // This might need adjustment based on the auth implementation
        address: '0xee034b53d4ccb101b2a4faec27708be507197350',
        signature: '0x' // Would need a real signature
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      return loginData.data?.token;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return null;
}

async function testMyCommunitiesWithAuth() {
  try {
    // First let's check what the frontend is actually sending
    console.log('Testing with browser token from session...');
    
    // The browser logs show a token is being used
    // Let's try with a sample token structure
    const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHhlZTAzNGI1M2Q0Y2NiMTAxYjJhNGZhZWMyNzcwOGJlNTAxOTczNTAiLCJpYXQiOjE3MzQ5MTg2MzcsImV4cCI6MTczNzUxMDYzN30.invalid';
    
    const response = await fetch(`${API_BASE}/api/communities/my-communities`, {
      headers: {
        'Authorization': `Bearer ${sampleToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMyCommunitiesWithAuth();