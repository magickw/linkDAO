#!/usr/bin/env node

/**
 * Comprehensive diagnostic script for frontend-backend connection issues
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:10000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function checkBackendHealth() {
  console.log('🏥 Backend Health Check');
  console.log('======================');
  
  const endpoints = [
    '/health',
    '/ping',
    '/status',
    '/',
    '/api/posts/test',
    '/api/auth/nonce',
    '/api/csrf-token'
  ];

  let healthyEndpoints = 0;
  
  for (const endpoint of endpoints) {
    try {
      const url = `${BACKEND_URL}${endpoint}`;
      console.log(`\n📡 Testing: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log(`   ✅ Status: ${response.status}`);
        healthyEndpoints++;
        
        try {
          const data = await response.json();
          console.log(`   📄 Response: ${JSON.stringify(data).substring(0, 100)}...`);
        } catch (e) {
          console.log(`   📄 Response: Non-JSON response`);
        }
      } else {
        console.log(`   ❌ Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Health Score: ${healthyEndpoints}/${endpoints.length}`);
  return healthyEndpoints > 0;
}

async function testCORS() {
  console.log('\n🌐 CORS Configuration Test');
  console.log('==========================');
  
  try {
    // Test preflight request
    console.log('📡 Testing preflight request...');
    const preflightResponse = await fetch(`${BACKEND_URL}/api/posts`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`   Status: ${preflightResponse.status}`);
    console.log(`   CORS Headers:`);
    console.log(`     Access-Control-Allow-Origin: ${preflightResponse.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`     Access-Control-Allow-Methods: ${preflightResponse.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`     Access-Control-Allow-Headers: ${preflightResponse.headers.get('Access-Control-Allow-Headers')}`);
    
    if (preflightResponse.status === 200) {
      console.log('   ✅ CORS preflight successful');
      return true;
    } else {
      console.log('   ❌ CORS preflight failed');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ CORS test error: ${error.message}`);
    return false;
  }
}

async function testAuthentication() {
  console.log('\n🔐 Authentication Flow Test');
  console.log('===========================');
  
  try {
    // Step 1: Get nonce
    console.log('📡 Step 1: Getting nonce...');
    const nonceResponse = await fetch(`${BACKEND_URL}/api/auth/nonce`);
    
    if (!nonceResponse.ok) {
      console.log(`   ❌ Nonce request failed: ${nonceResponse.status}`);
      return false;
    }
    
    const nonceData = await nonceResponse.json();
    console.log(`   ✅ Nonce received: ${nonceData.data?.nonce?.substring(0, 10)}...`);
    
    // Step 2: Test simple wallet auth (development mode)
    console.log('📡 Step 2: Testing wallet authentication...');
    const authResponse = await fetch(`${BACKEND_URL}/api/auth/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({
        walletAddress: '0x1234567890123456789012345678901234567890',
        signature: 'mock_signature',
        nonce: nonceData.data?.nonce
      })
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log(`   ✅ Authentication successful`);
      console.log(`   📄 Token: ${authData.sessionToken?.substring(0, 20)}...`);
      return authData.sessionToken;
    } else {
      console.log(`   ❌ Authentication failed: ${authResponse.status}`);
      const errorText = await authResponse.text();
      console.log(`   📄 Error: ${errorText.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Authentication test error: ${error.message}`);
    return false;
  }
}

async function testPostCreation(authToken) {
  console.log('\n📝 Post Creation Test');
  console.log('=====================');
  
  const testPost = {
    author: '0x1234567890123456789012345678901234567890',
    content: 'Test post from diagnostic script',
    tags: ['test', 'diagnostic']
  };
  
  try {
    console.log('📡 Creating test post...');
    const headers = {
      'Content-Type': 'application/json',
      'Origin': FRONTEND_URL
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${BACKEND_URL}/api/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPost)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Post creation successful');
      console.log(`   📄 Post ID: ${data.data?.id}`);
      return true;
    } else {
      console.log(`   ❌ Post creation failed: ${response.status}`);
      const errorText = await response.text();
      console.log(`   📄 Error: ${errorText.substring(0, 200)}...`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Post creation error: ${error.message}`);
    return false;
  }
}

async function checkEnvironmentConfig() {
  console.log('\n⚙️  Environment Configuration');
  console.log('============================');
  
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
  
  // Check if ports are accessible
  try {
    const backendPort = new URL(BACKEND_URL).port || '10000';
    console.log(`Backend Port: ${backendPort}`);
    
    const frontendPort = new URL(FRONTEND_URL).port || '3000';
    console.log(`Frontend Port: ${frontendPort}`);
  } catch (error) {
    console.log(`URL parsing error: ${error.message}`);
  }
}

async function provideTroubleshootingSteps(results) {
  console.log('\n🔧 Troubleshooting Recommendations');
  console.log('==================================');
  
  if (!results.backendHealth) {
    console.log('❌ Backend Health Issues:');
    console.log('   1. Start the backend server: cd app/backend && npm run dev');
    console.log('   2. Check if port 10000 is available');
    console.log('   3. Verify database connection');
    console.log('   4. Check backend logs for errors');
  }
  
  if (!results.cors) {
    console.log('❌ CORS Issues:');
    console.log('   1. Check CORS middleware configuration');
    console.log('   2. Verify allowed origins include frontend URL');
    console.log('   3. Ensure preflight requests are handled');
    console.log('   4. Check for conflicting CORS middleware');
  }
  
  if (!results.auth) {
    console.log('❌ Authentication Issues:');
    console.log('   1. Check JWT_SECRET environment variable');
    console.log('   2. Verify wallet authentication flow');
    console.log('   3. Check signature verification logic');
    console.log('   4. Ensure auth middleware is properly configured');
  }
  
  if (!results.postCreation) {
    console.log('❌ Post Creation Issues:');
    console.log('   1. Check post routes and controller');
    console.log('   2. Verify database schema and connections');
    console.log('   3. Check CSRF protection settings');
    console.log('   4. Ensure proper authentication for post creation');
  }
  
  console.log('\n💡 General Tips:');
  console.log('   • Clear browser cache and localStorage');
  console.log('   • Check browser developer tools for errors');
  console.log('   • Verify network connectivity');
  console.log('   • Check firewall and proxy settings');
}

async function runDiagnostics() {
  console.log('🔍 Frontend-Backend Connection Diagnostics');
  console.log('==========================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  
  const results = {
    backendHealth: false,
    cors: false,
    auth: false,
    postCreation: false
  };
  
  // Check environment configuration
  await checkEnvironmentConfig();
  
  // Test backend health
  results.backendHealth = await checkBackendHealth();
  
  if (results.backendHealth) {
    // Test CORS
    results.cors = await testCORS();
    
    // Test authentication
    const authToken = await testAuthentication();
    results.auth = !!authToken;
    
    // Test post creation
    results.postCreation = await testPostCreation(authToken);
  }
  
  // Provide troubleshooting steps
  await provideTroubleshootingSteps(results);
  
  // Summary
  console.log('\n📊 Diagnostic Summary');
  console.log('====================');
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Backend Health: ${results.backendHealth ? '✅' : '❌'}`);
  console.log(`CORS: ${results.cors ? '✅' : '❌'}`);
  console.log(`Authentication: ${results.auth ? '✅' : '❌'}`);
  console.log(`Post Creation: ${results.postCreation ? '✅' : '❌'}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All systems operational! Frontend-backend connection is working.');
  } else {
    console.log('\n⚠️  Issues detected. Follow the troubleshooting steps above.');
  }
  
  return results;
}

// Run diagnostics if called directly
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = { runDiagnostics };