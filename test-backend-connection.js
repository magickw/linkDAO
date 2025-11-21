const axios = require('axios');

async function testBackendConnection() {
  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
  
  console.log(`Testing backend connection to: ${backendUrl}`);
  
  try {
    // Test the health endpoint
    const response = await axios.get(`${backendUrl}/health`, { timeout: 5000 });
    console.log('✅ Backend is reachable');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
  } catch (error) {
    console.log('❌ Backend connection failed');
    console.log('Error:', error.message);
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    }
  }
  
  // Test specific endpoints that were mentioned as problematic
  console.log('\nTesting specific endpoints:');
  
  try {
    const communityResponse = await axios.get(`${backendUrl}/api/communities/linkdao`, { timeout: 5000 });
    console.log('✅ Community endpoint working:', communityResponse.status);
  } catch (error) {
    console.log('❌ Community endpoint failed:', error.message);
  }
  
  try {
    const sellerResponse = await axios.get(`${backendUrl}/api/marketplace/seller`, { 
      timeout: 5000,
      headers: { 'X-Wallet-Address': '0x1234567890123456789012345678901234567890' } // dummy address
    });
    console.log('✅ Seller endpoint working:', sellerResponse.status);
  } catch (error) {
    console.log('❌ Seller endpoint failed:', error.message);
  }
}

testBackendConnection();