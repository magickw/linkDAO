import fetch from 'node-fetch';

const API_BASE = 'https://api.linkdao.io';

async function testMyCommunitiesEndpoint() {
  try {
    console.log('Testing /api/communities/my-communities endpoint without auth...');
    
    // Test without auth token
    const response = await fetch(`${API_BASE}/api/communities/my-communities`);
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testMyCommunitiesEndpoint();