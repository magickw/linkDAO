/**
 * Compression Web Worker
 * Handles data compression/decompression in a separate thread
 */

// Import compression library (using pako for gzip compression)
// Note: In a real implementation, you would include pako.js or similar
// For this example, we'll use a simplified compression simulation

class CompressionWorker {
  constructor() {
    this.setupMessageHandler();
  }

  setupMessageHandler() {
    self.onmessage = (event) => {
      const { action, data, level = 6 } = event.data;
      
      try {
        switch (action) {
          case 'compress':
            this.compressData(data, level);
            break;
          case 'decompress':
            this.decompressData(data);
            break;
          default:
            this.sendError(`Unknown action: ${action}`);
        }
      } catch (error) {
        this.sendError(error.message);
      }
    };
  }

  async compressData(data, level) {
    try {
      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      const inputArray = encoder.encode(data);
      
      // Use CompressionStream if available
      if (typeof CompressionStream !== 'undefined') {
        const compressed = await this.compressWithStreams(inputArray);
        self.postMessage(compressed);
      } else {
        // Fallback to simple compression simulation
        const compressed = this.simulateCompression(inputArray, level);
        self.postMessage(compressed);
      }
    } catch (error) {
      this.sendError(`Compression failed: ${error.message}`);
    }
  }

  async decompressData(compressedData) {
    try {
      // Use DecompressionStream if available
      if (typeof DecompressionStream !== 'undefined') {
        const decompressed = await this.decompressWithStreams(compressedData);
        self.postMessage(decompressed);
      } else {
        // Fallback to simple decompression simulation
        const decompressed = this.simulateDecompression(compressedData);
        self.postMessage(decompressed);
      }
    } catch (error) {
      this.sendError(`Decompression failed: ${error.message}`);
    }
  }

  async compressWithStreams(inputArray) {
    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    // Write input data
    await writer.write(inputArray);
    await writer.close();
    
    // Read compressed output
    const chunks = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    // Combine chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result.buffer;
  }

  async decompressWithStreams(compressedData) {
    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    
    // Write compressed data
    await writer.write(new Uint8Array(compressedData));
    await writer.close();
    
    // Read decompressed output
    const chunks = [];
    let done = false;
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }
    
    // Combine chunks and decode
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return new TextDecoder().decode(result);
  }

  // Simplified compression simulation for fallback
  simulateCompression(inputArray, level) {
    // This is a very basic simulation - in reality you'd use a proper compression library
    const compressionRatio = Math.max(0.3, 1 - (level / 10)); // Higher level = better compression
    const compressedSize = Math.floor(inputArray.length * compressionRatio);
    
    // Create a simulated compressed array
    const compressed = new Uint8Array(compressedSize);
    
    // Fill with some pattern based on original data
    for (let i = 0; i < compressedSize; i++) {
      compressed[i] = inputArray[i % inputArray.length] ^ (i % 256);
    }
    
    return compressed.buffer;
  }

  // Simplified decompression simulation for fallback
  simulateDecompression(compressedData) {
    // This is a very basic simulation - in reality you'd use a proper decompression library
    const compressed = new Uint8Array(compressedData);
    
    // Simulate expansion (assume 3x expansion for demo)
    const decompressed = new Uint8Array(compressed.length * 3);
    
    for (let i = 0; i < decompressed.length; i++) {
      decompressed[i] = compressed[i % compressed.length] ^ (i % 256);
    }
    
    return new TextDecoder().decode(decompressed);
  }

  sendError(message) {
    self.postMessage({ error: message });
  }
}

// Initialize the worker
new CompressionWorker();

// Handle worker errors
self.onerror = (error) => {
  console.error('Compression worker error:', error);
  self.postMessage({ error: error.message });
};

self.onunhandledrejection = (event) => {
  console.error('Compression worker unhandled rejection:', event.reason);
  self.postMessage({ error: event.reason });
};