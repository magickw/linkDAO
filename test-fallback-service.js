#!/usr/bin/env node

// Test to force the fallback service by temporarily breaking the main service
const { exec } = require('child_process');

console.log('🧪 Testing fallback service by simulating database failure...\n');

// First, let's check if we can get posts (should work with fallback)
console.log('1. Testing GET /api/posts (should use fallback if main service fails)...');

exec('curl -s http://localhost:10000/api/posts', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📝 GET Response:', stdout);
  
  try {
    const response = JSON.parse(stdout);
    if (response.success) {
      console.log('✅ GET posts works! Found', response.data.length, 'posts');
      
      // Now test POST
      console.log('\n2. Testing POST /api/posts...');
      
      const testPost = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'Test post for fallback service'
      };
      
      const postCommand = `curl -s -X POST http://localhost:10000/api/posts -H "Content-Type: application/json" -d '${JSON.stringify(testPost)}'`;
      
      exec(postCommand, (postError, postStdout, postStderr) => {
        if (postError) {
          console.error('❌ POST Error:', postError);
          return;
        }
        
        console.log('📝 POST Response:', postStdout);
        
        try {
          const postResponse = JSON.parse(postStdout);
          if (postResponse.success) {
            console.log('✅ POST works! Created post with ID:', postResponse.data.id);
            
            // Test GET again to see if the post was added
            console.log('\n3. Testing GET again to verify post was added...');
            exec('curl -s http://localhost:10000/api/posts', (getError, getStdout) => {
              if (!getError) {
                const getResponse = JSON.parse(getStdout);
                console.log('📝 Updated posts count:', getResponse.data.length);
              }
            });
          } else {
            console.log('❌ POST failed:', postResponse.error);
            
            console.log('\n🔍 Diagnosis:');
            console.log('- The main PostService is failing before fallback is used');
            console.log('- Likely causes:');
            console.log('  1. IPFS upload failure (Pinata gateway timeout)');
            console.log('  2. User profile creation failure');
            console.log('  3. AI moderation service failure');
            console.log('  4. Database transaction failure');
            console.log('\n💡 Solution: Check backend logs for specific error details');
          }
        } catch (parseError) {
          console.error('❌ Failed to parse POST response');
        }
      });
      
    } else {
      console.log('❌ GET failed:', response.error);
    }
  } catch (parseError) {
    console.error('❌ Failed to parse GET response');
  }
});