#!/usr/bin/env node

// Test script to verify user lookup by wallet address
const { databaseService } = require('./dist/services/databaseService.js');

async function testUserLookup() {
  try {
    // Test wallet address from the logs
    const testAddress = '0xEe034b53D4cCb101b2a4faec27708be507197350';
    
    console.log('Testing user lookup for address:', testAddress);
    
    // Try to get user by address
    const user = await databaseService.getUserByAddress(testAddress);
    
    if (user) {
      console.log('✅ User found:');
      console.log('  ID:', user.id);
      console.log('  Wallet Address:', user.walletAddress);
      console.log('  Handle:', user.handle);
    } else {
      console.log('❌ User not found');
      
      // Try lowercase version
      const lowerAddress = testAddress.toLowerCase();
      console.log('Testing lowercase address:', lowerAddress);
      const userLower = await databaseService.getUserByAddress(lowerAddress);
      
      if (userLower) {
        console.log('✅ User found with lowercase address:');
        console.log('  ID:', userLower.id);
        console.log('  Wallet Address:', userLower.walletAddress);
        console.log('  Handle:', userLower.handle);
      } else {
        console.log('❌ User not found with lowercase address either');
      }
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testUserLookup();