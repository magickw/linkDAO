import fetch from 'node-fetch';

const API_BASE = 'https://api.linkdao.io';

async function testFeedEndpoint() {
  try {
    console.log('Testing feed endpoint without authentication...');
    
    // Test 1: Public feed (no auth)
    const publicResponse = await fetch(`${API_BASE}/api/feed?page=1&limit=10&sort=new&feedSource=all`);
    console.log('Public feed status:', publicResponse.status);
    const publicData = await publicResponse.json();
    console.log('Public feed response:', JSON.stringify(publicData, null, 2));
    
    console.log('\n\n---\n\n');
    
    // Test 2: Feed with user address but no auth token
    const userAddressResponse = await fetch(`${API_BASE}/api/feed?page=1&limit=10&sort=new&feedSource=all&userAddress=0xEe034b53D4cCb101b2a4faec27708be507197350`);
    console.log('User address feed status:', userAddressResponse.status);
    const userAddressData = await userAddressResponse.json();
    console.log('User address feed response:', JSON.stringify(userAddressData, null, 2));
    
    console.log('\n\n---\n\n');
    
    // Test 3: Filter by community
    const communityResponse = await fetch(`${API_BASE}/api/feed?page=1&limit=10&sort=new&feedSource=all&communities=1174a923-f8a9-4898-9e66-375056794a0b`);
    console.log('Community feed status:', communityResponse.status);
    const communityData = await communityResponse.json();
    console.log('Community feed response:', JSON.stringify(communityData, null, 2));
    
    console.log('\n\n---\n\n');
    
    // Test 4: With postTypeFilter set to 'posts' to only get community posts
    const postsOnlyResponse = await fetch(`${API_BASE}/api/feed?page=1&limit=10&sort=new&feedSource=all&postTypeFilter=posts`);
    console.log('Posts only feed status:', postsOnlyResponse.status);
    const postsOnlyData = await postsOnlyResponse.json();
    console.log('Posts only feed response:', JSON.stringify(postsOnlyData, null, 2));
    
  } catch (error) {
    console.error('Error testing feed endpoint:', error);
  }
}

testFeedEndpoint();