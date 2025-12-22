import fetch from 'node-fetch';

const API_BASE = 'https://api.linkdao.io';

async function testWithDevToken() {
  try {
    // Create a development token for testing
    const walletAddress = '0xee034b53d4ccb101b2a4faec27708be507197350';
    const devToken = `dev_session_${walletAddress}_${Date.now()}`;
    
    console.log('Testing with dev token for:', walletAddress);
    
    const response = await fetch(`${API_BASE}/api/communities/my-communities`, {
      headers: {
        'Authorization': `Bearer ${devToken}`,
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

testWithDevToken();