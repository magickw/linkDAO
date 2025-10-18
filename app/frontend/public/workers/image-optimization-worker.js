/**
 * Image Optimization Worker
 * Handles image optimization, format conversion, and placeholder generation in background
 */

// Import required libraries for image processing
// Note: In a real implementation, you might use libraries like Sharp.js or similar

const imageCache = new Map();
const processingQueue = new Set();

// Configuration
const config = {
  maxCacheSize: 100,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  supportedFormats: ['jpeg', 'png', 'webp', 'avif'],
  qualitySettings: {
    high: 0.9,
    medium: 0.8,
    low: 0.6
  },
  maxDimensions: {
    width: 2048,
    height: 2048
  }
};

/**
 * Handle messages from main thread
 */
self.addEventListener('message', async (event) => {
  const { type, data, id } = event.data;
  
  try {
    switch (type) {
      case 'optimize_image':
        await handleOptimizeImage(data, id);
        break;
      case 'generate_placeholder':
        await handleGeneratePlaceholder(data, id);
        break;
      case 'batch_optimize':
        await handleBatchOptimize(data, id);
        break;
      case 'get_cache_info':
        handleGetCacheInfo(id);
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
      type: 'optimization_error',
      id,
      data: { error: error.message }
    });
  }
});

/**
 * Handle image optimization request
 */
async function handleOptimizeImage(data, id) {
  const { url, options = {} } = data;
  
  if (!url) {
    throw new Error('URL is required for image optimization');
  }

  // Check cache first
  const cacheKey = generateCacheKey(url, options);
  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey);
    postMessage({
      type: 'optimization_complete',
      id,
      data: {
        url,
        cached: true,
        result: cached
      }
    });
    return;
  }

  // Add to processing queue
  if (processingQueue.has(url)) {
    postMessage({
      type: 'optimization_error',
      id,
      data: { error: 'Image already being processed' }
    });
    return;
  }

  processingQueue.add(url);

  try {
    const result = await optimizeImage(url, options);
    
    // Cache result
    imageCache.set(cacheKey, result);
    
    postMessage({
      type: 'optimization_complete',
      id,
      data: {
        url,
        result
      }
    });
    
  } catch (error) {
    postMessage({
      type: 'optimization_error',
      id,
      data: { 
        url,
        error: error.message 
      }
    });
  } finally {
    processingQueue.delete(url);
  }
}

/**
 * Handle placeholder generation request
 */
async function handleGeneratePlaceholder(data, id) {
  const { url, type = 'blur', options = {} } = data;
  
  try {
    const placeholder = await generatePlaceholder(url, type, options);
    
    postMessage({
      type: 'placeholder_generated',
      id,
      data: {
        url,
        placeholder,
        type
      }
    });
    
  } catch (error) {
    postMessage({
      type: 'optimization_error',
      id,
      data: { 
        url,
        error: `Placeholder generation failed: ${error.message}` 
      }
    });
  }
}

/**
 * Handle batch optimization request
 */
async function handleBatchOptimize(data, id) {
  const { images, options = {} } = data;
  
  if (!Array.isArray(images)) {
    throw new Error('Images must be an array');
  }

  const results = [];
  const batchSize = 3; // Process 3 images at a time
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (imageData) => {
      try {
        const result = await optimizeImage(imageData.url, { ...options, ...imageData.options });
        return {
          url: imageData.url,
          success: true,
          result
        };
      } catch (error) {
        return {
          url: imageData.url,
          success: false,
          error: error.message
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          url: 'unknown',
          success: false,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    // Send progress update
    postMessage({
      type: 'batch_progress',
      id,
      data: {
        completed: results.length,
        total: images.length,
        progress: (results.length / images.length) * 100
      }
    });
  }

  postMessage({
    type: 'batch_complete',
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
 * Optimize image
 */
async function optimizeImage(url, options = {}) {
  // Fetch the image
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer]);
  
  // Check file size
  if (blob.size > config.maxImageSize) {
    throw new Error(`Image too large: ${blob.size} bytes (max: ${config.maxImageSize})`);
  }

  // Create image bitmap for processing
  const imageBitmap = await createImageBitmap(blob);
  
  // Calculate target dimensions
  const { width, height } = calculateOptimalDimensions(
    imageBitmap.width,
    imageBitmap.height,
    options.width,
    options.height,
    options.maxWidth || config.maxDimensions.width,
    options.maxHeight || config.maxDimensions.height
  );

  // Create canvas for processing
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image to canvas
  ctx.drawImage(imageBitmap, 0, 0, width, height);

  // Generate optimized versions
  const results = {
    originalUrl: url,
    dimensions: { width, height },
    originalSize: blob.size
  };

  // Generate different formats
  const formats = options.formats || ['jpeg', 'webp'];
  const quality = getQualityForOptions(options);

  for (const format of formats) {
    try {
      const optimizedBlob = await canvas.convertToBlob({
        type: `image/${format}`,
        quality: quality
      });

      const optimizedUrl = await blobToDataUrl(optimizedBlob);
      
      results[`${format}Url`] = optimizedUrl;
      results[`${format}Size`] = optimizedBlob.size;
      
      // Set the main optimized URL to the first format
      if (!results.optimizedUrl) {
        results.optimizedUrl = optimizedUrl;
        results.optimizedSize = optimizedBlob.size;
      }
      
    } catch (error) {
      console.warn(`Failed to generate ${format} format:`, error);
    }
  }

  // Generate placeholder if requested
  if (options.generatePlaceholder) {
    try {
      results.placeholder = await generatePlaceholderFromCanvas(canvas, options.placeholderType);
    } catch (error) {
      console.warn('Failed to generate placeholder:', error);
    }
  }

  // Calculate compression ratio
  if (results.optimizedSize) {
    results.compressionRatio = results.originalSize / results.optimizedSize;
    results.sizeSavings = results.originalSize - results.optimizedSize;
  }

  // Clean up
  imageBitmap.close();

  return results;
}

/**
 * Generate placeholder
 */
async function generatePlaceholder(url, type = 'blur', options = {}) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const blob = new Blob([arrayBuffer]);
  const imageBitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(
    options.width || 20,
    options.height || 20
  );
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  switch (type) {
    case 'blur':
      return generateBlurPlaceholder(imageBitmap, canvas, ctx, options);
    case 'color':
      return generateColorPlaceholder(imageBitmap, canvas, ctx, options);
    case 'skeleton':
      return generateSkeletonPlaceholder(canvas, ctx, options);
    default:
      return generateBlurPlaceholder(imageBitmap, canvas, ctx, options);
  }
}

/**
 * Generate blur placeholder
 */
async function generateBlurPlaceholder(imageBitmap, canvas, ctx, options) {
  // Draw small blurred version
  ctx.filter = `blur(${options.blurAmount || 2}px)`;
  ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
  
  const blob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: 0.1
  });
  
  imageBitmap.close();
  return blobToDataUrl(blob);
}

/**
 * Generate color placeholder
 */
async function generateColorPlaceholder(imageBitmap, canvas, ctx, options) {
  // Sample colors from the image
  const sampleCanvas = new OffscreenCanvas(1, 1);
  const sampleCtx = sampleCanvas.getContext('2d');
  
  if (!sampleCtx) {
    throw new Error('Failed to get sample canvas context');
  }
  
  sampleCtx.drawImage(imageBitmap, 0, 0, 1, 1);
  const imageData = sampleCtx.getImageData(0, 0, 1, 1);
  const [r, g, b] = imageData.data;
  
  // Fill canvas with dominant color
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const blob = await canvas.convertToBlob({
    type: 'image/png'
  });
  
  imageBitmap.close();
  return blobToDataUrl(blob);
}

/**
 * Generate skeleton placeholder
 */
async function generateSkeletonPlaceholder(canvas, ctx, options) {
  // Create gradient for skeleton effect
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, options.skeletonColor1 || '#f0f0f0');
  gradient.addColorStop(0.5, options.skeletonColor2 || '#e0e0e0');
  gradient.addColorStop(1, options.skeletonColor1 || '#f0f0f0');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const blob = await canvas.convertToBlob({
    type: 'image/png'
  });
  
  return blobToDataUrl(blob);
}

/**
 * Generate placeholder from existing canvas
 */
async function generatePlaceholderFromCanvas(canvas, type = 'blur') {
  const smallCanvas = new OffscreenCanvas(20, 20);
  const ctx = smallCanvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get placeholder canvas context');
  }

  if (type === 'blur') {
    ctx.filter = 'blur(2px)';
  }
  
  ctx.drawImage(canvas, 0, 0, 20, 20);
  
  const blob = await smallCanvas.convertToBlob({
    type: 'image/jpeg',
    quality: 0.1
  });
  
  return blobToDataUrl(blob);
}

/**
 * Calculate optimal dimensions
 */
function calculateOptimalDimensions(originalWidth, originalHeight, targetWidth, targetHeight, maxWidth, maxHeight) {
  let width = originalWidth;
  let height = originalHeight;

  // Apply target dimensions if specified
  if (targetWidth && targetHeight) {
    width = targetWidth;
    height = targetHeight;
  } else if (targetWidth) {
    const aspectRatio = originalHeight / originalWidth;
    width = targetWidth;
    height = Math.round(targetWidth * aspectRatio);
  } else if (targetHeight) {
    const aspectRatio = originalWidth / originalHeight;
    height = targetHeight;
    width = Math.round(targetHeight * aspectRatio);
  }

  // Apply max dimensions
  if (width > maxWidth) {
    const aspectRatio = height / width;
    width = maxWidth;
    height = Math.round(maxWidth * aspectRatio);
  }

  if (height > maxHeight) {
    const aspectRatio = width / height;
    height = maxHeight;
    width = Math.round(maxHeight * aspectRatio);
  }

  return { width, height };
}

/**
 * Get quality setting based on options
 */
function getQualityForOptions(options) {
  if (options.quality !== undefined) {
    return Math.max(0.1, Math.min(1.0, options.quality));
  }

  const qualityLevel = options.qualityLevel || 'medium';
  return config.qualitySettings[qualityLevel] || config.qualitySettings.medium;
}

/**
 * Convert blob to data URL
 */
async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate cache key
 */
function generateCacheKey(url, options) {
  const optionsStr = JSON.stringify(options);
  return `${url}:${hashString(optionsStr)}`;
}

/**
 * Hash string for cache keys
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Handle get cache info request
 */
function handleGetCacheInfo(id) {
  const cacheEntries = Array.from(imageCache.entries()).map(([key, data]) => ({
    key,
    ...data
  }));

  postMessage({
    type: 'cache_info',
    id,
    data: {
      cacheSize: imageCache.size,
      processingQueueSize: processingQueue.size,
      entries: cacheEntries,
      config
    }
  });
}

/**
 * Handle clear cache request
 */
function handleClearCache(id) {
  const clearedEntries = imageCache.size;
  imageCache.clear();
  processingQueue.clear();

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
  if (imageCache.size > config.maxCacheSize) {
    // Remove oldest entries
    const entries = Array.from(imageCache.entries());
    const toRemove = entries.slice(0, imageCache.size - config.maxCacheSize);
    toRemove.forEach(([key]) => imageCache.delete(key));
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

// Send ready message
postMessage({
  type: 'worker_ready',
  data: {
    message: 'Image optimization worker initialized',
    config
  }
});