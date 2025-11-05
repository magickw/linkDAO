#!/usr/bin/env node

const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 10000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testMarketplaceAPI() {
  console.log('🛒 Testing Marketplace API...\n');

  const tests = [
    {
      name: 'Marketplace Health Check',
      method: 'GET',
      path: '/api/marketplace/health'
    },
    {
      name: 'Marketplace Test Endpoint',
      method: 'GET',
      path: '/api/marketplace/test'
    },
    {
      name: 'Database Test Endpoint',
      method: 'GET',
      path: '/api/marketplace/test/db'
    },
    {
      name: 'Get All Listings',
      method: 'GET',
      path: '/api/marketplace/listings'
    },
    {
      name: 'Get Listings with Filters',
      method: 'GET',
      path: '/api/marketplace/listings?page=1&limit=5&category=electronics'
    },
    {
      name: 'Get Specific Listing',
      method: 'GET',
      path: '/api/marketplace/listings/test-product-123'
    },
    {
      name: 'Get Seller Profile',
      method: 'GET',
      path: '/api/marketplace/sellers/0x1234567890123456789012345678901234567890'
    },
    {
      name: 'Get Seller Listings',
      method: 'GET',
      path: '/api/marketplace/sellers/0x1234567890123456789012345678901234567890/listings'
    },
    {
      name: 'Search Products',
      method: 'GET',
      path: '/api/marketplace/search?q=electronics&type=products'
    },
    {
      name: 'Search All',
      method: 'GET',
      path: '/api/marketplace/search?q=test&type=all'
    },
    {
      name: 'Cart Endpoint (Should Require Auth)',
      method: 'GET',
      path: '/api/cart'
    },
    {
      name: 'Seller Dashboard (Should Require Auth)',
      method: 'GET',
      path: '/api/sellers/dashboard'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      const result = await makeRequest(test.method, test.path, test.data);
      
      if (result.status >= 200 && result.status < 500) {
        console.log(`   ✅ Status: ${result.status}`);
        if (result.data && typeof result.data === 'object') {
          console.log(`   📄 Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
        }
        passed++;
      } else {
        console.log(`   ❌ Status: ${result.status}`);
        console.log(`   📄 Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All marketplace API tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

testMarketplaceAPI().catch(console.error);