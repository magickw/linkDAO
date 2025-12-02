const { redisService } = require('./app/backend/src/services/redisService');

async function testRedisConnection() {
  console.log('Testing Redis connection...');
  
  try {
    await redisService.connect();
    const status = redisService.getRedisStatus();
    console.log('Redis status:', status);
    
    if (status.connected) {
      console.log('✅ Redis connection successful');
      
      // Test basic operations
      await redisService.set('test-key', 'test-value', 60);
      const value = await redisService.get('test-key');
      console.log('Test get/set result:', value);
      
      await redisService.del('test-key');
      console.log('✅ Redis basic operations working');
    } else {
      console.log('❌ Redis not connected');
    }
  } catch (error) {
    console.error('Redis connection test failed:', error);
  }
}

testRedisConnection().catch(console.error);