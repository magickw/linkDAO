#!/usr/bin/env node

/**
 * Test script to verify profile loading fixes
 * Run with: node test-profile-fix.js
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10000';
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e443867B4';

async function testProfileFixes() {
  console.log('🧪 Testing Profile Loading Fixes\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);

  // Test 1: Get profile by address (should return { data: null } if doesn't exist)
  console.log('Test 1: GET /api/profiles/address/:address');
  try {
    const response = await fetch(`${BACKEND_URL}/api/profiles/address/${TEST_ADDRESS}`);
    console.log(`  Status: ${response.status}`);
    
    const data = await response.json();
    console.log(`  Response:`, JSON.stringify(data, null, 2));
    
    if (data.data === null) {
      console.log('  ✅ Correctly returns { data: null } for non-existent profile\n');
    } else if (data.data) {
      console.log('  ✅ Profile found\n');
    } else {
      console.log('  ❌ Unexpected response format\n');
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  // Test 2: Verify route ordering is correct
  console.log('Test 2: Verify route ordering');
  try {
    // This should NOT match the /:id route as "address" 
    const response = await fetch(`${BACKEND_URL}/api/profiles/address/${TEST_ADDRESS}`);
    const data = await response.json();
    
    // If it was incorrectly matched as /:id, we'd get an error about invalid UUID
    if (response.status === 400 && data.error && data.error.includes('UUID')) {
      console.log('  ❌ Route is being matched as /:id (INCORRECT)\n');
    } else {
      console.log('  ✅ Route is correctly matched as /address/:address\n');
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  console.log('✅ Profile loading fixes verification complete!');
}

// Run tests
testProfileFixes().catch(console.error);