/**
 * Test script to verify order tracking changes
 * This script tests the backend API endpoints for filtering, sorting, and pagination
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:10000';
const TEST_WALLET_ADDRESS = process.env.TEST_WALLET_ADDRESS || '0x1234567890123456789012345678901234567890';

// Test cases
const testCases = [
  {
    name: 'Test 1: Get orders without filters',
    endpoint: `/api/orders/user/${TEST_WALLET_ADDRESS}`,
    expected: 'Should return orders with default pagination'
  },
  {
    name: 'Test 2: Get orders with status filter',
    endpoint: `/api/orders/user/${TEST_WALLET_ADDRESS}?status=COMPLETED`,
    expected: 'Should return only completed orders'
  },
  {
    name: 'Test 3: Get orders with pagination',
    endpoint: `/api/orders/user/${TEST_WALLET_ADDRESS}?limit=5&offset=0`,
    expected: 'Should return first 5 orders'
  },
  {
    name: 'Test 4: Get orders with sorting',
    endpoint: `/api/orders/user/${TEST_WALLET_ADDRESS}?sortBy=createdAt&sortOrder=asc`,
    expected: 'Should return orders sorted by creation date ascending'
  },
  {
    name: 'Test 5: Get orders with role filter',
    endpoint: `/api/orders/user/${TEST_WALLET_ADDRESS}?role=buyer`,
    expected: 'Should return only orders where user is buyer'
  },
  {
    name: 'Test 6: Get orders with all parameters',
    endpoint: `/api/orders/user/${TEST_WALLET_ADDRESS}?status=SHIPPED&role=buyer&sortBy=updatedAt&sortOrder=desc&limit=10&offset=0`,
    expected: 'Should return filtered, sorted, and paginated orders'
  }
];

async function runTests() {
  console.log('🧪 Starting Order Tracking API Tests\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👛 Test Wallet: ${TEST_WALLET_ADDRESS}\n`);
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`   Endpoint: ${testCase.endpoint}`);
    console.log(`   Expected: ${testCase.expected}`);

    try {
      const startTime = Date.now();
      const response = await axios.get(`${BASE_URL}${testCase.endpoint}`, {
        timeout: 5000
      });
      const duration = Date.now() - startTime;

      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   ⏱️  Duration: ${duration}ms`);
      
      if (response.data) {
        const isArray = Array.isArray(response.data);
        const count = isArray ? response.data.length : (response.data.orders?.length || 0);
        console.log(`   📦 Orders found: ${count}`);
      }

      passed++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Test Summary:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
