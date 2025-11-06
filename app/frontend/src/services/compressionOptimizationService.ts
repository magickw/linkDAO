/**
 * Compression Optimization Service
 * Handles request/response compression and optimization
 */

interface CompressionConfig {
  enableRequestCompression: boolean;
  enableResponseCompression: boolean;
  compressionThreshold: number; // Minimum size in bytes to compress
  compressionLevel: number; // 1-9, higher = better compression but slower
}

interface CompressionMetrics {
  totalRequests: number;
  compressedRequests: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  compressionRatio: number;
  averageCompressionTime: number;
}

class CompressionOptimizationService {
  private config: CompressionConfig = {
    enableRequestCompression: true,
    enableResponseCompression: true,
    compressionThreshold: 1024, // 1KB
    compressionLevel: 6
  };

  private metrics: CompressionMetrics = {
    totalRequests: 0,
    compressedRequests: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    compressionRatio: 0,
    averageCompressionTime: 0
  };

  private compressionWorker?: Worker;
  private compressionTimes: number[] = [];

  constructor() {
    this.initializeCompressionWorker();
  }

  /**
   * Initialize compression web worker
   */
  private initializeCompressionWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.compressionWorker = new Worker('/workers/compression-worker.js');
        this.compressionWorker.onerror = (error) => {
          console.warn('Compression worker error:', error);
          this.compressionWorker = undefined;
        };
      } catch (error) {
        console.warn('Failed to initialize compression worker:', error);
      }
    }
  }

  /**
   * Optimize request with compression
   */
  async optimizeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<RequestInit> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    const optimizedOptions = { ...options };
    
    // Add compression headers
    optimizedOptions.headers = {
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Encoding': 'gzip',
      ...optimizedOptions.headers
    };

    // Compress request body if applicable
    if (this.config.enableRequestCompression && optimizedOptions.body) {
      const originalSize = this.getDataSize(optimizedOptions.body);
      
      if (originalSize >= this.config.compressionThreshold) {
        try {
          const compressedBody = await this.compressData(optimizedOptions.body);
          if (compressedBody && compressedBody.byteLength < originalSize) {
            optimizedOptions.body = compressedBody;
            optimizedOptions.headers = {
              ...optimizedOptions.headers,
              'Content-Encoding': 'gzip',
              'Content-Length': compressedBody.byteLength.toString()
            };
            
            this.updateCompressionMetrics(originalSize, compressedBody.byteLength, startTime);
          }
        } catch (error) {
          console.warn('Request compression failed:', error);
        }
      }
    }

    return optimizedOptions;
  }

  /**
   * Process compressed response
   */
  async processResponse<T>(response: Response): Promise<T> {
    const contentEncoding = response.headers.get('content-encoding');
    const isCompressed = contentEncoding && ['gzip', 'deflate', 'br'].includes(contentEncoding);
    
    if (isCompressed) {
      this.metrics.compressedRequests++;
    }

    // Handle different content types
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      return await response.json();
    } else if (contentType?.includes('text/')) {
      return await response.text() as unknown as T;
    } else {
      return response as unknown as T;
    }
  }

  /**
   * Compress data using web worker or fallback
   */
  async compressData(data: any): Promise<ArrayBuffer | null> {
    const startTime = performance.now();
    
    try {
      // Convert data to string if needed
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      
      if (this.compressionWorker) {
        return await this.compressWithWorker(dataString);
      } else {
        return await this.compressWithCompressionStreams(dataString);
      }
    } catch (error) {
      console.warn('Data compression failed:', error);
      return null;
    } finally {
      const compressionTime = performance.now() - startTime;
      this.compressionTimes.push(compressionTime);
      
      // Keep only last 100 measurements
      if (this.compressionTimes.length > 100) {
        this.compressionTimes = this.compressionTimes.slice(-100);
      }
    }
  }

  /**
   * Compress using web worker
   */
  private async compressWithWorker(data: string): Promise<ArrayBuffer | null> {
    if (!this.compressionWorker) return null;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000);
      
      this.compressionWorker!.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data);
      };
      
      this.compressionWorker!.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
      
      this.compressionWorker!.postMessage({
        action: 'compress',
        data,
        level: this.config.compressionLevel
      });
    });
  }

  /**
   * Compress using Compression Streams API (fallback)
   */
  private async compressWithCompressionStreams(data: string): Promise<ArrayBuffer | null> {
    if (!('CompressionStream' in window)) {
      return null;
    }

    try {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      // Write data
      await writer.write(new TextEncoder().encode(data));
      await writer.close();
      
      // Read compressed result
      const chunks: Uint8Array[] = [];
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
    } catch (error) {
      console.warn('Compression Streams API failed:', error);
      return null;
    }
  }

  /**
   * Decompress data
   */
  async decompressData(compressedData: ArrayBuffer): Promise<string | null> {
    if (!('DecompressionStream' in window)) {
      return null;
    }

    try {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      // Write compressed data
      await writer.write(new Uint8Array(compressedData));
      await writer.close();
      
      // Read decompressed result
      const chunks: Uint8Array[] = [];
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
    } catch (error) {
      console.warn('Decompression failed:', error);
      return null;
    }
  }

  /**
   * Get data size in bytes
   */
  private getDataSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (data instanceof Uint8Array) {
      return data.byteLength;
    } else if (typeof data === 'string') {
      return new TextEncoder().encode(data).length;
    } else {
      return new TextEncoder().encode(JSON.stringify(data)).length;
    }
  }

  /**
   * Update compression metrics
   */
  private updateCompressionMetrics(
    originalSize: number,
    compressedSize: number,
    startTime: number
  ): void {
    this.metrics.totalOriginalSize += originalSize;
    this.metrics.totalCompressedSize += compressedSize;
    
    // Recalculate compression ratio
    this.metrics.compressionRatio = this.metrics.totalOriginalSize > 0
      ? ((this.metrics.totalOriginalSize - this.metrics.totalCompressedSize) / this.metrics.totalOriginalSize) * 100
      : 0;
    
    // Update average compression time
    const compressionTime = performance.now() - startTime;
    this.metrics.averageCompressionTime = this.compressionTimes.length > 0
      ? this.compressionTimes.reduce((sum, time) => sum + time, 0) / this.compressionTimes.length
      : compressionTime;
  }

  /**
   * Get compression metrics
   */
  getCompressionMetrics(): CompressionMetrics {
    return { ...this.metrics };
  }

  /**
   * Update compression configuration
   */
  updateConfig(newConfig: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): CompressionConfig {
    return { ...this.config };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      compressedRequests: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      compressionRatio: 0,
      averageCompressionTime: 0
    };
    this.compressionTimes = [];
  }

  /**
   * Check compression support
   */
  getCompressionSupport(): {
    webWorker: boolean;
    compressionStreams: boolean;
    decompressionStreams: boolean;
  } {
    return {
      webWorker: !!this.compressionWorker,
      compressionStreams: 'CompressionStream' in window,
      decompressionStreams: 'DecompressionStream' in window
    };
  }

  /**
   * Optimize headers for compression
   */
  optimizeHeaders(headers: HeadersInit = {}): HeadersInit {
    const optimizedHeaders = { ...headers };
    
    // Ensure compression headers are set
    if (!optimizedHeaders['Accept-Encoding']) {
      optimizedHeaders['Accept-Encoding'] = 'gzip, deflate, br';
    }
    
    // Add quality values for better negotiation
    if (optimizedHeaders['Accept-Encoding'] === 'gzip, deflate, br') {
      optimizedHeaders['Accept-Encoding'] = 'br;q=1.0, gzip;q=0.8, deflate;q=0.6';
    }
    
    return optimizedHeaders;
  }
}

// Export singleton instance
export const compressionOptimizationService = new CompressionOptimizationService();

// Convenience function for compressed requests
export const compressedRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const optimizedOptions = await compressionOptimizationService.optimizeRequest(url, options);
  const response = await fetch(url, optimizedOptions);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return compressionOptimizationService.processResponse<T>(response);
};

export default compressionOptimizationService;