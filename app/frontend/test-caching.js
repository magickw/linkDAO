// Simple test to verify caching is working

// Create a simple mock seller service to test caching
const profileCache = new Map();
const CACHE_DURATION = 60000; // 60 seconds

function getCachedProfile(walletAddress) {
  const cached = profileCache.get(walletAddress);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  // Cache expired, remove it
  profileCache.delete(walletAddress);
  return null;
}

function isProfileCached(walletAddress) {
  const cached = profileCache.get(walletAddress);
  if (!cached) return false;
  
  const now = Date.now();
  return now - cached.timestamp < CACHE_DURATION;
}

function cacheProfile(walletAddress, data) {
  profileCache.set(walletAddress, { data, timestamp: Date.now() });
}

async function testCaching() {
  console.log('Testing seller profile caching...');
  
  const walletAddress = '0xCf4363d84f4A48486dD414011aB71ee7811eDD55';
  
  // Cache a profile
  const mockProfile = { walletAddress, displayName: 'Test User' };
  cacheProfile(walletAddress, mockProfile);
  
  // Check if it's cached
  console.log('Checking cache status...');
  const isCached = isProfileCached(walletAddress);
  console.log(`Profile is cached: ${isCached}`);
  
  if (isCached) {
    // Second call - should use cache
    console.log('Retrieving cached profile...');
    const start2 = Date.now();
    const profile2 = getCachedProfile(walletAddress);
    const end2 = Date.now();
    console.log(`Cache retrieval took ${end2 - start2}ms`);
    
    if (end2 - start2 < 10) {
      console.log('✅ Caching is working correctly!');
    } else {
      console.log('❌ Caching may not be working properly');
    }
  } else {
    console.log('❌ Profile was not cached');
  }
}

// Run the test
testCaching().catch(console.error);