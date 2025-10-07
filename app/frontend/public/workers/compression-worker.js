/**
 * Compression Web Worker
 * Handles background compression of cache content
 */

// Import compression libraries if available
let compressionSupported = false;

// Check for compression support
if (typeof CompressionStream !== 'undefined') {
  compressionSupported = true;
}

/**
 * Compress data using specified algorithm
 */
async function compressData(data, algorithm, level) {
  try {
    if (!compressionSupported) {
      throw new Error('Compression not supported in this environment');
    }

    // Convert ArrayBuffer to Uint8Array if needed
    const uint8Array = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    
    // Create compression stream
    let compressionStream;
    
    switch (algorithm) {
      case 'gzip':
        compressionStream = new CompressionStream('gzip');
        break;
      case 'deflate':
        compressionStream = new CompressionStream('deflate');
        break;
      default:
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
    }

    // Create readable stream from data
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(uint8Array);
        controller.close();
      }
    });

    // Compress the data
    const compressedStream = readable.pipeThrough(compressionStream);
    const reader = compressedStream.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks into single array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const compressedData = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      compressedData.set(chunk, offset);
      offset += chunk.length;
    }

    return compressedData;
  } catch (error) {
    throw new Error(`Compression failed: ${error.message}`);
  }
}

/**
 * Decompress data using specified algorithm
 */
async function decompressData(data, algorithm) {
  try {
    if (!compressionSupported) {
      throw new Error('Decompression not supported in this environment');
    }

    // Convert ArrayBuffer to Uint8Array if needed
    const uint8Array = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    
    // Create decompression stream
    let decompressionStream;
    
    switch (algorithm) {
      case 'gzip':
        decompressionStream = new DecompressionStream('gzip');
        break;
      case 'deflate':
        decompressionStream = new DecompressionStream('deflate');
        break;
      default:
        throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
    }

    // Create readable stream from data
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(uint8Array);
        controller.close();
      }
    });

    // Decompress the data
    const decompressedStream = readable.pipeThrough(decompressionStream);
    const reader = decompressedStream.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks into single array
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const decompressedData = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      decompressedData.set(chunk, offset);
      offset += chunk.length;
    }

    return decompressedData;
  } catch (error) {
    throw new Error(`Decompression failed: ${error.message}`);
  }
}

/**
 * Calculate compression ratio
 */
function calculateCompressionRatio(originalSize, compressedSize) {
  if (originalSize === 0) return 0;
  return (originalSize - compressedSize) / originalSize;
}

/**
 * Estimate compression benefit
 */
function estimateCompressionBenefit(data, algorithm) {
  // Simple heuristic based on data characteristics
  const uint8Array = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  
  // Calculate entropy (simplified)
  const frequency = new Map();
  for (const byte of uint8Array) {
    frequency.set(byte, (frequency.get(byte) || 0) + 1);
  }
  
  let entropy = 0;
  const length = uint8Array.length;
  
  for (const count of frequency.values()) {
    const probability = count / length;
    entropy -= probability * Math.log2(probability);
  }
  
  // Estimate compression ratio based on entropy
  const maxEntropy = 8; // 8 bits per byte
  const compressionPotential = (maxEntropy - entropy) / maxEntropy;
  
  // Algorithm-specific adjustments
  let algorithmFactor = 1;
  switch (algorithm) {
    case 'gzip':
      algorithmFactor = 0.8;
      break;
    case 'deflate':
      algorithmFactor = 0.75;
      break;
    case 'brotli':
      algorithmFactor = 0.85;
      break;
  }
  
  return compressionPotential * algorithmFactor;
}

/**
 * Handle messages from main thread
 */
self.onmessage = async function(event) {
  const { id, type, data, algorithm, level } = event.data;
  
  try {
    switch (type) {
      case 'compress':
        const compressedData = await compressData(data, algorithm, level);
        const originalSize = data.byteLength || data.length;
        const compressedSize = compressedData.byteLength;
        const ratio = calculateCompressionRatio(originalSize, compressedSize);
        
        self.postMessage({
          id,
          success: true,
          data: compressedData,
          originalSize,
          compressedSize,
          compressionRatio: ratio
        });
        break;
        
      case 'decompress':
        const decompressedData = await decompressData(data, algorithm);
        
        self.postMessage({
          id,
          success: true,
          data: decompressedData
        });
        break;
        
      case 'estimate_benefit':
        const benefit = estimateCompressionBenefit(data, algorithm);
        
        self.postMessage({
          id,
          success: true,
          estimatedBenefit: benefit,
          recommendation: benefit > 0.3 ? 'compress' : 'skip'
        });
        break;
        
      case 'batch_compress':
        const batchResults = [];
        
        for (const item of data) {
          try {
            const compressed = await compressData(item.data, algorithm, level);
            const originalSize = item.data.byteLength || item.data.length;
            const compressedSize = compressed.byteLength;
            
            batchResults.push({
              id: item.id,
              success: true,
              data: compressed,
              originalSize,
              compressedSize,
              compressionRatio: calculateCompressionRatio(originalSize, compressedSize)
            });
          } catch (error) {
            batchResults.push({
              id: item.id,
              success: false,
              error: error.message
            });
          }
        }
        
        self.postMessage({
          id,
          success: true,
          results: batchResults
        });
        break;
        
      default:
        throw new Error(`Unknown compression operation: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message
    });
  }
};

// Handle worker errors
self.onerror = function(error) {
  console.error('Compression worker error:', error);
  self.postMessage({
    success: false,
    error: error.message || 'Unknown worker error'
  });
};

// Send ready signal
self.postMessage({
  type: 'ready',
  compressionSupported,
  supportedAlgorithms: compressionSupported ? ['gzip', 'deflate'] : []
});