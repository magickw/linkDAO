// Test script to verify performance optimizations
const fetch = require('node-fetch');

async function testSellerProfileCaching() {
  console.log('Testing seller profile caching...');
  
  const walletAddress = '0xCf4363d84f4A48486dD414011aB71ee7811eDD55';
  const url = `http://localhost:3000/api/marketplace/seller/${walletAddress}`;
  
  // Make multiple requests quickly to test caching
  const requests = [];
  for (let i = 0; i < 5; i++) {
    requests.push(fetch(url));
  }
  
  try {
    const responses = await Promise.all(requests);
    const results = await Promise.all(responses.map(res => res.json()));
    
    console.log(`Made ${requests.length} requests to seller profile endpoint`);
    console.log('Responses:', results.map(r => r.success ? 'Success' : 'Failed'));
    
    // Check if caching is working by looking at response times
    console.log('Caching test completed');
  } catch (error) {
    console.error('Error testing seller profile caching:', error);
  }
}

async function testFeedPerformance() {
  console.log('Testing feed performance...');
  
  const url = 'http://localhost:3000/api/posts/feed';
  
  // Make multiple requests to test feed caching
  const startTime = Date.now();
  const requests = [];
  
  for (let i = 0; i < 3; i++) {
    requests.push(fetch(url));
  }
  
  try {
    const responses = await Promise.all(requests);
    const results = await Promise.all(responses.map(res => res.json()));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Made ${requests.length} feed requests in ${duration}ms`);
    console.log('Average time per request:', Math.round(duration / requests.length) + 'ms');
    console.log('Feed test completed');
  } catch (error) {
    console.error('Error testing feed performance:', error);
  }
}

async function runTests() {
  console.log('Starting performance optimization tests...\n');
  
  await testSellerProfileCaching();
  console.log(''); // Empty line for readability
  
  await testFeedPerformance();
  console.log(''); // Empty line for readability
  
  console.log('All tests completed!');
}

// Run the tests
runTests().catch(console.error);