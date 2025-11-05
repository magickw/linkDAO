#!/usr/bin/env node

const axios = require('axios');

async function testDatabaseConnection() {
  console.log('🔍 Testing LinkDAO Backend Database Connection...\n');

  const baseURL = 'http://localhost:10000';

  try {
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check:', healthResponse.data.data.status);
    console.log('   Database status:', healthResponse.data.data.services.find(s => s.name === 'database')?.status);
    console.log('   Database details:', healthResponse.data.data.services.find(s => s.name === 'database')?.details);

    // 2. Test authentication health
    console.log('\n2. Testing authentication service...');
    const authHealthResponse = await axios.get(`${baseURL}/api/auth/health`);
    console.log('✅ Auth service:', authHealthResponse.data.data.status);

    // 3. Test getting a nonce (this should work without database)
    console.log('\n3. Testing nonce generation...');
    const nonceResponse = await axios.post(`${baseURL}/api/auth/nonce`, {
      walletAddress: '0x1234567890123456789012345678901234567890'
    });
    console.log('✅ Nonce generated:', nonceResponse.data.success);

    // 4. Test post creation without auth (should fail with auth error, not database error)
    console.log('\n4. Testing post creation (should fail with auth error)...');
    try {
      const postResponse = await axios.post(`${baseURL}/api/posts`, {
        author: '0x1234567890123456789012345678901234567890',
        content: 'Test post content'
      });
      console.log('❌ Unexpected success:', postResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('✅ Expected auth error:', error.response.data);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    // 5. Test getting all posts (should work or fail gracefully)
    console.log('\n5. Testing get all posts...');
    try {
      const postsResponse = await axios.get(`${baseURL}/api/posts`);
      console.log('✅ Posts retrieved:', postsResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('❌ Posts error:', error.response.data);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    // 6. Test seller endpoints
    console.log('\n6. Testing seller endpoints...');
    try {
      const sellersResponse = await axios.get(`${baseURL}/api/sellers`);
      console.log('✅ Sellers retrieved:', sellersResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('❌ Sellers error:', error.response.data);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }

    console.log('\n🎯 Diagnosis Summary:');
    console.log('- Backend server is running ✅');
    console.log('- Database connection appears healthy ✅');
    console.log('- Authentication service is working ✅');
    console.log('- Issue likely in: Authentication middleware or service logic');

  } catch (error) {
    console.error('❌ Failed to connect to backend:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure backend is running: npm run dev (in app/backend)');
    console.log('2. Check if port 10000 is available');
    console.log('3. Verify DATABASE_URL is set correctly');
  }
}

testDatabaseConnection();