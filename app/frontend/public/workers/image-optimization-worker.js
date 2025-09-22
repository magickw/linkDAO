/**
 * Image Optimization Worker
 * Handles image processing in background thread
 */

// Import required libraries (if available)
// Note: In a real implementation, you might want to use libraries like:
// - Sharp (for Node.js environments)
// - ImageMagick WASM
// - Squoosh libraries

// Cache for processed images
const processedImages = new Map();

// Configuration
const DEFAULT_QUALITY = 0.8;
const MAX_DIMENSION = 2048;
const SUPPORTED_FORMATS = ['jpeg', 'png', 'webp', 'avif'];

// Message handler
self.onmessage = function(event) {
  const { type, data, id } = event.data;
  
  switch (type) {
    case 'optimize_image':
      handleImageOptimization(data, id);
      break;
    case 'generate_placeholder':
      handlePlaceholderGeneration(data, id);
      break;
    case 'batch_optimize':
      handleBatchOptimization(data, id);
      break;
    case 'clear_cache':
      clearProcessedImages();
      break;
    default:
      sendError('Unknown message type', id);
  }
};

/**
 * Handle image optimization request
 */
async function handleImageOptimization(data, id) {
  const { url, options = {} } = data;
  
  try {
    // Check cache first
    const cacheKey = generateCacheKey(url, options);
    if (processedImages.has(cacheKey)) {
      const cached = processedImages.get(cacheKey);
      sendSuccess('optimization_complete', cached, id);
      return;
    }
    
    // Load image
    const imageData = await loadImage(url);
    
    // Process image
    const result = await processImage(imageData, options);
    
    // Cache result
    processedImages.set(cacheKey, result);
    
    // Send result
    sendSuccess('optimization_complete', result, id);
    
  } catch (error) {
    sendError(error.message, id);
  }
}

/**
 * Handle placeholder generation
 */
async function handlePlaceholderGeneration(data, id) {
  const { url, type = 'blur', size = 20 } = data;
  
  try {
    const imageData = await loadImage(url);
    const placeholder = await generatePlaceholder(imageData, type, size);
    
    sendSuccess('placeholder_generated', { url, placeholder }, id);
    
  } catch (error) {
    sendError(error.message, id);
  }
}

/**
 * Handle batch optimization
 */
async function handleBatchOptimization(data, id) {
  const { images, options = {} } = data;
  const results = [];
  
  for (const imageUrl of images) {
    try {
      const imageData = await loadImage(imageUrl);
      const result = await processImage(imageData, options);
      results.push({ url: imageUrl, success: true, result });
    } catch (error) {
      results.push({ url: imageUrl, success: false, error: error.message });
    }
  }
  
  sendSuccess('batch_complete', results, id);
}

/**
 * Load image from URL
 */
async function loadImage(url) {
  return new Promise((resolve, reject) => {
    // Create image element
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas to get image data
        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Canvas context not available');
        }
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = {
          data: ctx.getImageData(0, 0, img.width, img.height),
          width: img.width,
          height: img.height,
          canvas: canvas,
          context: ctx
        };
        
        resolve(imageData);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    // Handle data URLs and regular URLs
    if (url.startsWith('data:')) {
      img.src = url;
    } else {
      // For cross-origin images, we might need to fetch first
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob);
          img.src = objectUrl;
        })
        .catch(() => {
          // Fallback to direct assignment
          img.src = url;
        });
    }
  });
}

/**
 * Process image with optimization
 */
async function processImage(imageData, options) {
  const {
    width: targetWidth,
    height: targetHeight,
    quality = DEFAULT_QUALITY,
    format = 'auto',
    enableWebP = true,
    enableAVIF = true
  } = options;
  
  const { width: originalWidth, height: originalHeight, canvas, context } = imageData;
  
  // Calculate dimensions
  const dimensions = calculateDimensions(
    originalWidth, 
    originalHeight, 
    targetWidth, 
    targetHeight
  );
  
  // Resize if needed
  let processedCanvas = canvas;
  let processedContext = context;
  
  if (dimensions.width !== originalWidth || dimensions.height !== originalHeight) {
    processedCanvas = new OffscreenCanvas(dimensions.width, dimensions.height);
    processedContext = processedCanvas.getContext('2d');
    
    if (!processedContext) {
      throw new Error('Failed to create processing context');
    }
    
    // Use high-quality scaling
    processedContext.imageSmoothingEnabled = true;
    processedContext.imageSmoothingQuality = 'high';
    
    // Draw resized image
    processedContext.drawImage(
      canvas, 
      0, 0, originalWidth, originalHeight,
      0, 0, dimensions.width, dimensions.height
    );
  }
  
  const result = {
    dimensions,
    size: 0,
    originalUrl: null,
    optimizedUrl: null,
    webpUrl: null,
    avifUrl: null
  };
  
  // Generate optimized version
  const optimizedBlob = await processedCanvas.convertToBlob({
    type: getOptimalFormat(format),
    quality: quality
  });
  
  result.optimizedUrl = await blobToDataURL(optimizedBlob);
  result.size = optimizedBlob.size;
  
  // Generate WebP version if supported and requested
  if (enableWebP && supportsFormat('webp')) {
    try {
      const webpBlob = await processedCanvas.convertToBlob({
        type: 'image/webp',
        quality: quality
      });
      result.webpUrl = await blobToDataURL(webpBlob);
    } catch (error) {
      console.warn('WebP generation failed:', error);
    }
  }
  
  // Generate AVIF version if supported and requested
  if (enableAVIF && supportsFormat('avif')) {
    try {
      const avifBlob = await processedCanvas.convertToBlob({
        type: 'image/avif',
        quality: quality
      });
      result.avifUrl = await blobToDataURL(avifBlob);
    } catch (error) {
      console.warn('AVIF generation failed:', error);
    }
  }
  
  return result;
}

/**
 * Generate placeholder image
 */
async function generatePlaceholder(imageData, type, size) {
  const { canvas, context } = imageData;
  
  switch (type) {
    case 'blur':
      return generateBlurPlaceholder(canvas, context, size);
    case 'color':
      return generateColorPlaceholder(canvas, context, size);
    case 'skeleton':
      return generateSkeletonPlaceholder(size);
    default:
      return generateBlurPlaceholder(canvas, context, size);
  }
}

/**
 * Generate blur placeholder
 */
async function generateBlurPlaceholder(canvas, context, size) {
  const placeholderCanvas = new OffscreenCanvas(size, size);
  const placeholderContext = placeholderCanvas.getContext('2d');
  
  if (!placeholderContext) {
    throw new Error('Failed to create placeholder context');
  }
  
  // Apply blur filter
  placeholderContext.filter = 'blur(2px)';
  placeholderContext.imageSmoothingEnabled = true;
  
  // Draw scaled down image
  placeholderContext.drawImage(canvas, 0, 0, size, size);
  
  const blob = await placeholderCanvas.convertToBlob({
    type: 'image/jpeg',
    quality: 0.1
  });
  
  return await blobToDataURL(blob);
}

/**
 * Generate color placeholder
 */
async function generateColorPlaceholder(canvas, context, size) {
  // Sample colors from the image
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const colors = sampleColors(imageData.data, 5);
  const dominantColor = getDominantColor(colors);
  
  const placeholderCanvas = new OffscreenCanvas(size, size);
  const placeholderContext = placeholderCanvas.getContext('2d');
  
  if (!placeholderContext) {
    throw new Error('Failed to create placeholder context');
  }
  
  // Create gradient with dominant colors
  const gradient = placeholderContext.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`);
  gradient.addColorStop(1, `rgb(${dominantColor.r * 0.8}, ${dominantColor.g * 0.8}, ${dominantColor.b * 0.8})`);
  
  placeholderContext.fillStyle = gradient;
  placeholderContext.fillRect(0, 0, size, size);
  
  const blob = await placeholderCanvas.convertToBlob({
    type: 'image/png'
  });
  
  return await blobToDataURL(blob);
}

/**
 * Generate skeleton placeholder
 */
async function generateSkeletonPlaceholder(size) {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Failed to create skeleton context');
  }
  
  // Create animated gradient effect
  const gradient = context.createLinearGradient(0, 0, size, 0);
  gradient.addColorStop(0, '#f0f0f0');
  gradient.addColorStop(0.5, '#e0e0e0');
  gradient.addColorStop(1, '#f0f0f0');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  
  const blob = await canvas.convertToBlob({
    type: 'image/png'
  });
  
  return await blobToDataURL(blob);
}

/**
 * Calculate optimal dimensions
 */
function calculateDimensions(originalWidth, originalHeight, targetWidth, targetHeight) {
  // Limit maximum dimensions
  let width = originalWidth;
  let height = originalHeight;
  
  // Apply max dimension limit
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  
  // Apply target dimensions if specified
  if (targetWidth || targetHeight) {
    const aspectRatio = originalWidth / originalHeight;
    
    if (targetWidth && targetHeight) {
      width = targetWidth;
      height = targetHeight;
    } else if (targetWidth) {
      width = targetWidth;
      height = Math.round(targetWidth / aspectRatio);
    } else if (targetHeight) {
      height = targetHeight;
      width = Math.round(targetHeight * aspectRatio);
    }
  }
  
  return { width, height };
}

/**
 * Get optimal format based on input
 */
function getOptimalFormat(format) {
  if (format === 'auto') {
    // Choose best format based on support
    if (supportsFormat('avif')) return 'image/avif';
    if (supportsFormat('webp')) return 'image/webp';
    return 'image/jpeg';
  }
  
  return `image/${format}`;
}

/**
 * Check format support
 */
function supportsFormat(format) {
  // In a worker, we can't easily test canvas.toDataURL
  // So we'll assume modern format support based on format
  const supportMap = {
    'webp': true,  // Widely supported now
    'avif': false, // Still limited support
    'jpeg': true,
    'png': true
  };
  
  return supportMap[format] || false;
}

/**
 * Sample colors from image data
 */
function sampleColors(imageData, sampleCount) {
  const colors = [];
  const step = Math.floor(imageData.length / (sampleCount * 4));
  
  for (let i = 0; i < imageData.length; i += step * 4) {
    colors.push({
      r: imageData[i],
      g: imageData[i + 1],
      b: imageData[i + 2],
      a: imageData[i + 3]
    });
  }
  
  return colors;
}

/**
 * Get dominant color from color array
 */
function getDominantColor(colors) {
  if (colors.length === 0) {
    return { r: 128, g: 128, b: 128 };
  }
  
  // Simple average for now - could use more sophisticated clustering
  const total = colors.reduce(
    (acc, color) => ({
      r: acc.r + color.r,
      g: acc.g + color.g,
      b: acc.b + color.b
    }),
    { r: 0, g: 0, b: 0 }
  );
  
  return {
    r: Math.round(total.r / colors.length),
    g: Math.round(total.g / colors.length),
    b: Math.round(total.b / colors.length)
  };
}

/**
 * Convert blob to data URL
 */
async function blobToDataURL(blob) {
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
 * Clear processed images cache
 */
function clearProcessedImages() {
  processedImages.clear();
  sendSuccess('cache_cleared', { success: true });
}

/**
 * Send success message
 */
function sendSuccess(type, data, id) {
  self.postMessage({
    type,
    data,
    id,
    success: true
  });
}

/**
 * Send error message
 */
function sendError(error, id) {
  self.postMessage({
    type: 'optimization_error',
    data: { error },
    id,
    success: false
  });
}

// Cleanup old cache entries periodically
setInterval(() => {
  if (processedImages.size > 100) {
    // Keep only the 50 most recent entries
    const entries = Array.from(processedImages.entries());
    const toKeep = entries.slice(-50);
    processedImages.clear();
    toKeep.forEach(([key, value]) => processedImages.set(key, value));
  }
}, 5 * 60 * 1000); // Every 5 minutes

console.log('Image optimization worker initialized');