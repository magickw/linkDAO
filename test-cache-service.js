const { cacheService } = require('./app/backend/src/services/cacheService');

async function testCacheService() {
  console.log('Testing Cache Service...');
  
  try {
    // Test if cache service is enabled
    const isRedisEnabled = cacheService.isRedisEnabled();
    console.log('Redis enabled:', isRedisEnabled);
    
    if (isRedisEnabled) {
      // Test basic cache operations
      const testKey = 'cache-test-key';
      const testValue = { message: 'Hello from cache!', timestamp: Date.now() };
      
      // Set value in cache
      const setSuccess = await cacheService.set(testKey, testValue, 60);
      console.log('Set operation success:', setSuccess);
      
      // Get value from cache
      const cachedValue = await cacheService.get(testKey);
      console.log('Cached value:', cachedValue);
      
      // Check if key exists
      const exists = await cacheService.exists(testKey);
      console.log('Key exists:', exists);
      
      // Get TTL
      const ttl = await cacheService.ttl(testKey);
      console.log('TTL:', ttl);
      
      // Delete key
      const deleted = await cacheService.invalidate(testKey);
      console.log('Delete operation success:', deleted);
      
      console.log('✅ Cache service operations completed successfully');
    } else {
      console.log('⚠️ Cache service Redis functionality is disabled');
    }
    
    // Get cache stats
    const stats = await cacheService.getStats();
    console.log('Cache stats:', stats);
    
  } catch (error) {
    console.error('Cache service test failed:', error);
  }
}

testCacheService().catch(console.error);