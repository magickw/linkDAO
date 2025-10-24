const fetch = require('node-fetch');

async function testConnection() {
  try {
    // Test the backend health endpoint
    const response = await fetch('http://localhost:10000/health');
    const data = await response.json();
    console.log('Backend health check:', data);
    
    // Test the feed endpoint (should return 401 since it requires auth)
    const feedResponse = await fetch('http://localhost:10000/api/feed/enhanced');
    console.log('Feed endpoint status:', feedResponse.status);
    
    // Test the frontend environment variable
    console.log('Frontend NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL || 'Not set');
  } catch (error) {
    console.error('Connection test failed:', error.message);
  }
}

testConnection();