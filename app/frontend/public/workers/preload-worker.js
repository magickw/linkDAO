/**
 * Preload Worker
 * Handles background preloading of resources to avoid blocking main thread
 */

// Cache for preloaded resources
const preloadCache = new Map();
const pendingRequests = new Map();

// Configuration
const BATCH_SIZE = 5; // Process 5 resources at a time
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// Network condition tracking
let networkCondition = 'fast';
let isOnline = true;

// Message handler
self.onmessage = function(event) {
  const { type, data } = event.data;
  
  switch (type) {
    case 'preload_resources':
      handlePreloadResources(data);
      break;
    case 'update_network_condition':
      networkCondition = data.condition;
      isOnline = data.isOnline;
      break;
    case 'clear_cache':
      clearPreloadCache();
      break;
    case 'get_cache_stats':
      sendCacheStats();
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};

/**
 * Handle preload resources request
 */
async function handlePreloadResources(data) {
  const { resources, priority, networkCondition: reqNetworkCondition } = data;
  
  // Update network condition
  if (reqNetworkCondition) {
    networkCondition = reqNetworkCondition;
  }
  
  // Don't preload if offline
  if (!isOnline || networkCondition === 'offline') {
    return;
  }
  
  // Adjust batch size based on network condition and priority
  const batchSize = getBatchSize(priority, networkCondition);
  
  // Process resources in batches
  for (let i = 0; i < resources.length; i += batchSize) {
    const batch = resources.slice(i, i + batchSize);
    await processBatch(batch, priority);
    
    // Add delay between batches on slow networks
    if (networkCondition === 'slow' && i + batchSize < resources.length) {
      await delay(500);
    }
  }
}

/**
 * Process a batch of resources
 */
async function processBatch(resources, priority) {
  const promises = resources.map(resource => preloadResource(resource, priority));
  await Promise.allSettled(promises);
}

/**
 * Preload a single resource
 */
async function preloadResource(resource, priority, attempt = 1) {
  // Check if already cached or in progress
  if (preloadCache.has(resource) || pendingRequests.has(resource)) {
    return;
  }
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeout(priority));
  
  try {
    // Mark as in progress
    pendingRequests.set(resource, true);
    
    const response = await fetch(resource, {
      method: 'GET',
      headers: {
        'X-Preload': 'true',
        'X-Priority': priority
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      // Clone response for caching
      const responseClone = response.clone();
      const data = await response.arrayBuffer();
      
      // Store in cache
      preloadCache.set(resource, {
        data: data,
        headers: Object.fromEntries(response.headers.entries()),
        status: response.status,
        timestamp: Date.now(),
        size: data.byteLength
      });
      
      // Notify main thread of success
      self.postMessage({
        type: 'preload_complete',
        data: {
          resource,
          success: true,
          size: data.byteLength
        }
      });
      
      // Update cache in service worker if available
      if ('caches' in self) {
        try {
          const cache = await caches.open('preload-cache');
          await cache.put(resource, responseClone);
        } catch (cacheError) {
          console.warn('Failed to update service worker cache:', cacheError);
        }
      }
      
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Retry on failure (except for abort)
    if (attempt < RETRY_ATTEMPTS && error.name !== 'AbortError') {
      await delay(RETRY_DELAY * attempt);
      return preloadResource(resource, priority, attempt + 1);
    }
    
    // Notify main thread of error
    self.postMessage({
      type: 'preload_error',
      data: {
        resource,
        error: error.message,
        attempt
      }
    });
    
  } finally {
    pendingRequests.delete(resource);
  }
}

/**
 * Get appropriate batch size based on conditions
 */
function getBatchSize(priority, networkCondition) {
  const baseSizes = {
    'high': 8,
    'medium': 5,
    'low': 3
  };
  
  const networkMultipliers = {
    'fast': 1,
    'slow': 0.5,
    'offline': 0
  };
  
  const baseSize = baseSizes[priority] || 5;
  const multiplier = networkMultipliers[networkCondition] || 1;
  
  return Math.max(1, Math.floor(baseSize * multiplier));
}

/**
 * Get timeout based on priority
 */
function getTimeout(priority) {
  const timeouts = {
    'high': 5000,   // 5 seconds
    'medium': 8000, // 8 seconds
    'low': 12000    // 12 seconds
  };
  
  return timeouts[priority] || 8000;
}

/**
 * Clear preload cache
 */
function clearPreloadCache() {
  preloadCache.clear();
  pendingRequests.clear();
  
  self.postMessage({
    type: 'cache_cleared',
    data: { success: true }
  });
}

/**
 * Send cache statistics
 */
function sendCacheStats() {
  let totalSize = 0;
  let oldestTimestamp = Date.now();
  let newestTimestamp = 0;
  
  for (const [resource, cached] of preloadCache.entries()) {
    totalSize += cached.size;
    oldestTimestamp = Math.min(oldestTimestamp, cached.timestamp);
    newestTimestamp = Math.max(newestTimestamp, cached.timestamp);
  }
  
  self.postMessage({
    type: 'cache_stats',
    data: {
      totalItems: preloadCache.size,
      totalSize,
      pendingRequests: pendingRequests.size,
      oldestItem: oldestTimestamp,
      newestItem: newestTimestamp,
      memoryUsage: estimateMemoryUsage()
    }
  });
}

/**
 * Estimate memory usage
 */
function estimateMemoryUsage() {
  let totalSize = 0;
  
  for (const cached of preloadCache.values()) {
    totalSize += cached.size;
    totalSize += JSON.stringify(cached.headers).length * 2; // Rough estimate for headers
  }
  
  return totalSize;
}

/**
 * Utility delay function
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cleanup old cache entries periodically
 */
function cleanupCache() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  const maxItems = 1000;
  
  // Remove expired items
  for (const [resource, cached] of preloadCache.entries()) {
    if (now - cached.timestamp > maxAge) {
      preloadCache.delete(resource);
    }
  }
  
  // Remove oldest items if over limit
  if (preloadCache.size > maxItems) {
    const entries = Array.from(preloadCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = entries.slice(0, preloadCache.size - maxItems);
    toRemove.forEach(([resource]) => preloadCache.delete(resource));
  }
}

// Cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

// Handle network status changes
self.addEventListener('online', () => {
  isOnline = true;
  self.postMessage({
    type: 'network_status',
    data: { isOnline: true }
  });
});

self.addEventListener('offline', () => {
  isOnline = false;
  networkCondition = 'offline';
  self.postMessage({
    type: 'network_status',
    data: { isOnline: false }
  });
});

console.log('Preload worker initialized');