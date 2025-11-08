#!/usr/bin/env node

/**
 * Test WebSocket Connection
 * This script tests the WebSocket connection to verify the fixes are working
 */

const WebSocket = require('ws');

console.log('🧪 Testing WebSocket Connection');
console.log('==============================\n');

// Test WebSocket connection
async function testWebSocketConnection() {
  const wsUrl = 'wss://api.linkdao.io/socket.io/';
  console.log(`🔌 Testing connection to: ${wsUrl}`);
  
  try {
    // Test basic WebSocket connection
    const ws = new WebSocket(wsUrl);
    
    ws.on('open', function open() {
      console.log('✅ WebSocket connection established');
      ws.close();
    });
    
    ws.on('error', function error(err) {
      console.log('❌ WebSocket connection failed:', err.message);
      
      // Test alternative WebSocket URLs
      testAlternativeUrls();
    });
    
    ws.on('close', function close() {
      console.log('🔒 WebSocket connection closed');
    });
    
  } catch (error) {
    console.log('❌ WebSocket test failed:', error.message);
    testAlternativeUrls();
  }
}

// Test alternative WebSocket URLs
async function testAlternativeUrls() {
  const alternativeUrls = [
    'wss://ws.linkdao.io/socket.io/',
    'wss://realtime.linkdao.io/socket.io/'
  ];
  
  for (const url of alternativeUrls) {
    console.log(`\n🔄 Testing alternative URL: ${url}`);
    
    try {
      const ws = new WebSocket(url);
      
      ws.on('open', function open() {
        console.log(`✅ Alternative connection established: ${url}`);
        ws.close();
      });
      
      ws.on('error', function error(err) {
        console.log(`❌ Alternative connection failed: ${url} - ${err.message}`);
      });
      
      // Wait a bit for connection attempt
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.log(`❌ Alternative test failed: ${url} - ${error.message}`);
    }
  }
}

// Test HTTP endpoint as fallback
async function testHttpFallback() {
  console.log('\n🌐 Testing HTTP fallback endpoint...');
  
  try {
    const http = require('http');
    const https = require('https');
    const url = require('url');
    
    const parsedUrl = url.parse('https://api.linkdao.io/socket.io/?EIO=4&transport=polling');
    
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.get(parsedUrl, (res) => {
      console.log(`✅ HTTP fallback test response: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('✅ HTTP polling endpoint is accessible');
      } else {
        console.log(`⚠️  HTTP polling endpoint returned status: ${res.statusCode}`);
      }
    });
    
    req.on('error', (err) => {
      console.log('❌ HTTP fallback test failed:', err.message);
    });
    
    req.setTimeout(5000, () => {
      console.log('⏰ HTTP fallback test timed out');
      req.destroy();
    });
    
  } catch (error) {
    console.log('❌ HTTP fallback test error:', error.message);
  }
}

// Test geolocation services
async function testGeolocationServices() {
  console.log('\n🌍 Testing Geolocation Services...');
  
  const services = [
    { name: 'ip-api.com', url: 'http://ip-api.com/json/' },
    { name: 'ipify.org', url: 'https://api.ipify.org/?format=json' },
    { name: 'ipinfo.io', url: 'https://ipinfo.io/json' }
  ];
  
  for (const service of services) {
    console.log(`\n📍 Testing ${service.name}: ${service.url}`);
    
    try {
      const https = require('https');
      const url = require('url');
      
      const parsedUrl = url.parse(service.url);
      
      const req = https.get(parsedUrl, (res) => {
        console.log(`✅ ${service.name} response: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log(`✅ ${service.name} is accessible`);
        } else {
          console.log(`⚠️  ${service.name} returned status: ${res.statusCode}`);
        }
      });
      
      req.on('error', (err) => {
        console.log(`❌ ${service.name} test failed: ${err.message}`);
      });
      
      req.setTimeout(5000, () => {
        console.log(`⏰ ${service.name} test timed out`);
        req.destroy();
      });
      
      // Wait a bit for each request
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`❌ ${service.name} test error: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting WebSocket and Service Connection Tests\n');
  
  try {
    // Test WebSocket connection
    await testWebSocketConnection();
    
    // Wait a bit for WebSocket tests to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test HTTP fallback
    await testHttpFallback();
    
    // Wait a bit for HTTP test to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test geolocation services
    await testGeolocationServices();
    
    console.log('\n🏁 Connection Tests Completed');
    console.log('============================');
    console.log('Check the results above to verify if connections are working properly.');
    console.log('If WebSocket connections are still failing, the system will fall back to polling.');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  testWebSocketConnection,
  testHttpFallback,
  testGeolocationServices
};