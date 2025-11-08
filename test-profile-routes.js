#!/usr/bin/env node

/**
 * Test script to verify profile routes are working correctly
 * Run with: node test-profile-routes.js
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10000';
const TEST_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

async function testProfileRoutes() {
  console.log('🧪 Testing Profile Routes\n');
  console.log(`Backend URL: ${BACKEND_URL}\n`);

  // Test 1: Get profile by address (should return null if doesn't exist)
  console.log('Test 1: GET /api/profiles/address/:address');
  try {
    const response = await fetch(`${BACKEND_URL}/api/profiles/address/${TEST_ADDRESS}`);
    console.log(`  Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  Response:`, JSON.stringify(data, null, 2));
      
      if (data.data === null) {
        console.log('  ✅ Correctly returns null for non-existent profile\n');
      } else {
        console.log('  ✅ Profile found\n');
      }
    } else {
      console.log(`  ❌ Failed with status ${response.status}\n`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  // Test 2: Verify route doesn't match /:id incorrectly
  console.log('Test 2: Verify /address/:address is not matched as /:id');
  try {
    const response = await fetch(`${BACKEND_URL}/api/profiles/address/${TEST_ADDRESS}`);
    const data = await response.json();
    
    // If the route was incorrectly matched as /:id, we'd get an error about invalid UUID
    if (response.status === 400 && data.error && data.error.includes('UUID')) {
      console.log('  ❌ Route is being matched as /:id (INCORRECT)\n');
    } else {
      console.log('  ✅ Route is correctly matched as /address/:address\n');
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  // Test 3: Test creating a profile (will fail without auth, but should reach the endpoint)
  console.log('Test 3: POST /api/profiles (without auth - should fail with 401/403)');
  try {
    const response = await fetch(`${BACKEND_URL}/api/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: TEST_ADDRESS,
        handle: 'testuser',
        bioCid: 'Test bio',
      }),
    });
    
    console.log(`  Status: ${response.status}`);
    
    if (response.status === 401 || response.status === 403) {
      console.log('  ✅ Correctly requires authentication\n');
    } else if (response.status === 201) {
      console.log('  ⚠️  Profile created (unexpected - should require auth)\n');
    } else {
      const data = await response.json();
      console.log(`  Response:`, JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}\n`);
  }

  console.log('✅ Profile route tests complete!');
}

// Run tests
testProfileRoutes().catch(console.error);
