#!/usr/bin/env ts-node

/**
 * Test cache warming with detailed error logging
 */

import { cacheWarmingService } from '../src/services/cacheWarmingService';

async function testCacheWarming() {
  console.log('Testing cache warming with detailed logging...\n');
  
  try {
    // Test warming popular seller profiles
    console.log('1. Testing popular seller profiles warming...');
    await cacheWarmingService.warmPopularSellerProfiles(3);
    
    // Test warming category data
    console.log('\n2. Testing category data warming...');
    await cacheWarmingService.warmCategoryData();
    
    // Execute the warmup
    console.log('\n3. Executing warmup...');
    const stats = await cacheWarmingService.executeWarmup();
    
    console.log('\n✅ Cache warming test completed!');
    console.log('Stats:', stats);
    
  } catch (error) {
    console.error('\n❌ Cache warming test failed:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testCacheWarming();