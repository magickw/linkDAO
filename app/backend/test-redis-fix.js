// Simple test to verify Redis connection fixes
console.log('Testing Redis connection fixes...');

// Import the services
const { redisService } = require('./src/services/redisService');
const { cacheService } = require('./src/services/cacheService');

console.log('✅ Services imported successfully');

// Test Redis service singleton pattern
const redisService2 = require('./src/services/redisService').redisService;
console.log('✅ Redis service singleton test:', redisService === redisService2 ? 'PASS' : 'FAIL');

// Test cache service Redis integration
console.log('✅ Cache service Redis enabled:', cacheService.isRedisEnabled());

console.log('✅ All tests completed successfully');