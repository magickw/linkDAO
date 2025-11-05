#!/usr/bin/env node

// Simple test to create a post using curl
const { exec } = require('child_process');

console.log('🧪 Testing simple post creation...\n');

// Test 1: Create a post with minimal data
const testPost = {
  author: '0x1234567890123456789012345678901234567890',
  content: 'Simple test post'
};

const curlCommand = `curl -X POST http://localhost:10000/api/posts \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testPost)}'`;

console.log('Executing:', curlCommand);
console.log('');

exec(curlCommand, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (stderr) {
    console.error('❌ Stderr:', stderr);
    return;
  }
  
  console.log('📝 Response:', stdout);
  
  try {
    const response = JSON.parse(stdout);
    if (response.success) {
      console.log('✅ Post created successfully!');
      console.log('Post ID:', response.data.id);
    } else {
      console.log('❌ Post creation failed:', response.error);
      
      // Let's test if it's a database issue by checking the fallback service
      console.log('\n🔄 Testing fallback service...');
      
      // The PostController should fall back to in-memory service if database fails
      console.log('The error suggests the main PostService is failing.');
      console.log('This could be due to:');
      console.log('1. IPFS upload failure (IPFS_Gateway is degraded)');
      console.log('2. User profile creation failure');
      console.log('3. AI moderation service failure');
      console.log('4. Database transaction failure');
    }
  } catch (parseError) {
    console.error('❌ Failed to parse response:', parseError);
    console.log('Raw response:', stdout);
  }
});