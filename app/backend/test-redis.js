#!/usr/bin/env node

// Simple Redis connection test
const Redis = require('redis');

async function testRedisConnection() {
  console.log('🔗 Testing Redis connection...');
  
  // Load environment variables
  require('dotenv').config({ path: './.env.render' });
  
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisEnabled = process.env.REDIS_ENABLED;
  
  console.log('📋 Configuration:');
  console.log('  REDIS_URL:', redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  console.log('  REDIS_ENABLED:', redisEnabled);
  
  if (redisEnabled === 'false' || redisEnabled === '0') {
    console.log('❌ Redis is explicitly disabled via REDIS_ENABLED');
    return false;
  }
  
  let client;
  try {
    client = Redis.createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
      }
    });
    
    console.log('⏳ Connecting to Redis...');
    await client.connect();
    
    console.log('✅ Redis connected successfully!');
    
    // Test basic operations
    await client.set('test-key', 'test-value', { EX: 10 });
    const value = await client.get('test-key');
    
    if (value === 'test-value') {
      console.log('✅ Redis read/write test passed!');
    } else {
      console.log('❌ Redis read/write test failed');
      return false;
    }
    
    // Clean up
    await client.del('test-key');
    await client.disconnect();
    
    console.log('✅ Redis test completed successfully!');
    return true;
    
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    
    if (client) {
      try {
        await client.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    }
    
    return false;
  }
}

testRedisConnection().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test failed with error:', error);
  process.exit(1);
});