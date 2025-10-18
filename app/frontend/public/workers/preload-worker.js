/**
 * Preload Worker
 * Handles background preloading of resources for intelligent caching
 */

// Cache for tracking preloaded resources
const preloadCache = new Map();
const preloadQueue = new Set();

// Configuration
const config = {
  maxConcurrentRequests: 3,
  requestTimeout: 10000,
  retryAttempts: 2,
  retryDelay: 1000
};

let activeRequests = 0;

/**
 * Handle messages from main thread
 */
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'preload_resources':
        await handlePreloadResources(data, id);
        break;
      case 'get_cache_status':
        handleGetCacheStatus(id);
        break;
      case 'clear_cache':
        handleClearCache(id);
        break;
      case 'configure':
        handleConfigure(data, id);
        break;
      default:
        postMessage({
          type: 'error',
          id,
          data: { error: `Unknown message type: ${type}` }
        });
    }
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      data: { error: error.message }
    });
  }
});

/**
 * Handle preload resources request
 */
async function handlePreloadResources(data, id) {
  const { resources, priority, networkCondition } = data;
  
  if (!Array.isArray(resources)) {
    throw new Error('Resources must be an array');
  }

  // Filter out already preloaded or queued resources
  const newResources = resources.filter(url => 
    !preloadCache.has(url) && !preloadQueue.has(url)
  );

  if (newResources.length === 0) {
    postMessage({
      type: 'preload_complete',
      id,
      data: { 
        message: 'All resources already cached or queued',
        cached: resources.length,
        new: 0
      }
    });
    return;
  }

  // Add to queue
  newResources.forEach(url => preloadQueue.add(url));

  // Adjust concurrency based on network condition
  const maxConcurrent = getMaxConcurrentRequests(networkCondition);
  
  // Process resources with controlled concurrency
  const results = await processResourcesWithConcurrency(
    newResources, 
    maxConcurrent, 
    priority
  );

  // Remove from queue
  newResources.forEach(url => preloadQueue.delete(url));

  postMessage({
    type: 'preload_complete',
    id,
    data: {
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total: results.length
    }
  });
}

/**
 * Process resources with controlled concurrency
 */
async function processResourcesWithConcurrency(resources, maxConcurrent, priority) {
  const results = [];
  const executing = [];

  for (const resource of resources) {
    const promise = preloadResource(resource, priority).then(result => {
      results.push(result);
      // Remove from executing array
      const index = executing.indexOf(promise);
      if (index > -1) {
        executing.splice(index, 1);
      }
      return result;
    });

    executing.push(promise);

    // Wait if we've reached max concurrency
    if (executing.length >= maxConcurrent) {
      await Promise.race(executing);
    }
  }

  // Wait for all remaining requests
  await Promise.all(executing);
  
  return results;
}

/**
 * Preload a single resource
 */
async function preloadResource(url, priority = 'medium') {
  const startTime = Date.now();
  
  try {
    activeRequests++;
    
    // Check if already cached
    if (preloadCache.has(url)) {
      return {
        url,
        success: true,
        cached: true,
        responseTime: 0,
        size: preloadCache.get(url).size
      };
    }

    const result = await fetchWithRetry(url, priority);
    
    // Cache successful result
    if (result.success) {
      preloadCache.set(url, {
        timestamp: Date.now(),
        size: result.size,
        priority,
        accessCount: 1
      });
    }

    return {
      ...result,
      responseTime: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      url,
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  } finally {
    activeRequests--;
  }
}

/**
 * Fetch with retry logic
 */
async function fetchWithRetry(url, priority, attempt = 1) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.requestTimeout);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Preload': 'true',
        'X-Priority': priority
      },
      signal: controller.signal,
      cache: 'default'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get response size
    const contentLength = response.headers.get('content-length');
    const size = contentLength ? parseInt(contentLength, 10) : 0;

    // Clone response for caching
    const responseClone = response.clone();
    
    // Store in cache if supported
    if ('caches' in self) {
      try {
        const cache = await caches.open('preload-cache-v1');
        await cache.put(url, responseClone);
      } catch (cacheError) {
        console.warn('Failed to cache response:', cacheError);
      }
    }

    return {
      url,
      success: true,
      size,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries())
    };

  } catch (error) {
    // Retry logic
    if (attempt < config.retryAttempts && !error.name === 'AbortError') {
      await new Promise(resolve => setTimeout(resolve, config.retryDelay * attempt));
      return fetchWithRetry(url, priority, attempt + 1);
    }

    throw error;
  }
}

/**
 * Get max concurrent requests based on network condition
 */
function getMaxConcurrentRequests(networkCondition) {
  switch (networkCondition) {
    case 'fast':
      return 6;
    case 'slow':
      return 2;
    case 'offline':
      return 0;
    default:
      return config.maxConcurrentRequests;
  }
}

/**
 * Handle get cache status request
 */
function handleGetCacheStatus(id) {
  const cacheEntries = Array.from(preloadCache.entries()).map(([url, data]) => ({
    url,
    ...data
  }));

  postMessage({
    type: 'cache_status',
    id,
    data: {
      cacheSize: preloadCache.size,
      queueSize: preloadQueue.size,
      activeRequests,
      entries: cacheEntries,
      totalSize: cacheEntries.reduce((sum, entry) => sum + (entry.size || 0), 0)
    }
  });
}

/**
 * Handle clear cache request
 */
function handleClearCache(id) {
  const clearedEntries = preloadCache.size;
  preloadCache.clear();
  preloadQueue.clear();

  postMessage({
    type: 'cache_cleared',
    id,
    data: {
      clearedEntries,
      message: `Cleared ${clearedEntries} cache entries`
    }
  });
}

/**
 * Handle configuration update
 */
function handleConfigure(data, id) {
  Object.assign(config, data);
  
  postMessage({
    type: 'configured',
    id,
    data: {
      config,
      message: 'Configuration updated'
    }
  });
}

/**
 * Periodic cache cleanup
 */
function cleanupCache() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  const maxEntries = 1000;

  // Remove expired entries
  for (const [url, data] of preloadCache.entries()) {
    if (now - data.timestamp > maxAge) {
      preloadCache.delete(url);
    }
  }

  // Remove oldest entries if over limit
  if (preloadCache.size > maxEntries) {
    const entries = Array.from(preloadCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = entries.slice(0, preloadCache.size - maxEntries);
    toRemove.forEach(([url]) => preloadCache.delete(url));
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

// Send ready message
postMessage({
  type: 'worker_ready',
  data: {
    message: 'Preload worker initialized',
    config
  }
});