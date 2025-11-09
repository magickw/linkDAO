#!/usr/bin/env node

// Test script to verify post creation and author ID association
const { databaseService } = require('./dist/services/databaseService.js');

async function testPostCreation() {
  try {
    // Test wallet address from the logs
    const testAddress = '0xEe034b53D4cCb101b2a4faec27708be507197350';
    
    console.log('Testing post creation for address:', testAddress);
    
    // Try to get user by address
    const user = await databaseService.getUserByAddress(testAddress);
    
    if (user) {
      console.log('✅ User found:');
      console.log('  ID:', user.id);
      console.log('  Wallet Address:', user.walletAddress);
      
      // Try to get posts by this user
      const posts = await databaseService.getPostsByAuthor(user.id);
      console.log(`Found ${posts.length} posts by this user`);
      
      if (posts.length > 0) {
        console.log('Sample post:');
        console.log('  ID:', posts[0].id);
        console.log('  Author ID:', posts[0].authorId);
        console.log('  Content CID:', posts[0].contentCid);
        console.log('  Created At:', posts[0].createdAt);
      }
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testPostCreation();