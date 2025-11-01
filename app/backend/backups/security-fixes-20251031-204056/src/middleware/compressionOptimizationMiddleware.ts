import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import compression from 'compression';
import { safeLogger } from '../utils/safeLogger';
import { constants } from 'zlib';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';

interface CompressionMetrics {
  totalRequests: number;
  compressedRequests: number;
  compressionRatio: number;
  totalBytesSaved: number;
  averageCompressionTime: number;
}

interface CompressionOptions {
  threshold?: number;
  level?: number;
  chunkSize?: number;
  windowBits?: number;
  memLevel?: number;
  strategy?: number;
  enableBrotli?: boolean;
  enableGzip?: boolean;
  enableDeflate?: boolean;
}

/**
 * Compression Optimization Middleware
 * Implements task 9.3: Implement compression middleware to reduce response payload sizes
 */
export class CompressionOptimizationMiddleware {
  private metrics: CompressionMetrics = {
    totalRequests: 0,
    compressedRequests: 0,
    compressionRatio: 0,
    totalBytesSaved: 0,
    averageCompressionTime: 0
  };

  private compressionTimes: number[] = [];
  private options: CompressionOptions;

  constructor(options: CompressionOptions = {}) {
    this.options = {
      threshold: options.threshold ?? 1024, // 1KB minimum
      level: options.level ?? 6, // Balanced compression
      chunkSize: options.chunkSize ?? 16384, // 16KB chunks
      windowBits: options.windowBits ?? 15,
      memLevel: options.memLevel ?? 8,
      strategy: options.strategy ?? constants.Z_DEFAULT_STRATEGY,
      enableBrotli: options.enableBrotli ?? true,
      enableGzip: options.enableGzip ?? true,
      enableDeflate: options.enableDeflate ?? true,
      ...options
    };
  }

  /**
   * Create adaptive compression middleware
   */
  adaptiveCompression() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      this.metrics.totalRequests++;

      // Determine best compression algorithm based on client support and content
      const compressionType = this.selectCompressionType(req);
      
      if (!compressionType) {
        return next();
      }

      // Create compression middleware with optimized settings
      const compressionMiddleware = this.createCompressionMiddleware(compressionType, req);
      
      // Track compression metrics
      const originalWrite = res.write;
      const originalEnd = res.end;
      let originalSize = 0;
      let compressedSize = 0;
      const self = this;

      res.write = function(chunk: any, encoding?: any) {
        if (chunk) {
          originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
        }
        return originalWrite.call(this, chunk, encoding);
      };

      res.end = function(chunk?: any, encoding?: any) {
        if (chunk) {
          originalSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk, encoding);
        }

        const endTime = performance.now();
        const compressionTime = endTime - startTime;

        // Update metrics
        const compressionRatio = originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0;
        
        if (compressionRatio > 0) {
          self.updateMetrics(
            compressionTime,
            originalSize,
            compressedSize,
            true
          );
        }

        return originalEnd.call(this, chunk, encoding);
      };

      // Apply compression middleware
      compressionMiddleware(req, res, next);
    };
  }

  /**
   * Content-aware compression
   */
  contentAwareCompression() {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      res.json = function(data: any) {
        // Optimize JSON before compression
        const optimizedData = CompressionOptimizationMiddleware.prototype.optimizeJsonForCompression(data);
        
        // Set appropriate compression headers
        res.set('Content-Type', 'application/json; charset=utf-8');
        
        return originalJson(optimizedData);
      };

      res.send = function(data: any) {
        // Optimize content based on type
        if (typeof data === 'string' && data.length > 1000) {
          // Minify HTML/CSS/JS content
          data = CompressionOptimizationMiddleware.prototype.minifyContent(data, res.get('Content-Type') || '');
        }

        return originalSend(data);
      };

      next();
    };
  }

  /**
   * Streaming compression for large responses
   */
  streamingCompression() {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(res.get('Content-Length') || '0');
      
      // Use streaming compression for large responses
      if (contentLength > 100000) { // 100KB
        res.set({
          'Transfer-Encoding': 'chunked',
          'X-Compression-Strategy': 'streaming'
        });
      }

      next();
    };
  }

  /**
   * Select optimal compression type based on client and content
   */
  private selectCompressionType(req: Request): string | null {
    const acceptEncoding = req.get('Accept-Encoding') || '';
    const userAgent = req.get('User-Agent') || '';

    // Check client support
    const supportsBrotli = this.options.enableBrotli && acceptEncoding.includes('br');
    const supportsGzip = this.options.enableGzip && acceptEncoding.includes('gzip');
    const supportsDeflate = this.options.enableDeflate && acceptEncoding.includes('deflate');

    // Brotli is generally better for text content
    if (supportsBrotli && this.isTextContent(req)) {
      return 'br';
    }

    // Gzip is widely supported and efficient
    if (supportsGzip) {
      return 'gzip';
    }

    // Deflate as fallback
    if (supportsDeflate) {
      return 'deflate';
    }

    return null;
  }

  /**
   * Create compression middleware with optimized settings
   */
  private createCompressionMiddleware(compressionType: string, req: Request) {
    const isTextContent = this.isTextContent(req);
    const isMobileClient = this.isMobileClient(req);

    // Adjust compression level based on content and client
    let level = this.options.level!;
    
    if (isMobileClient) {
      // Use faster compression for mobile clients
      level = Math.max(1, level - 2);
    }

    if (isTextContent) {
      // Use higher compression for text content
      level = Math.min(9, level + 1);
    }

    return compression({
      threshold: this.options.threshold,
      level,
      chunkSize: this.options.chunkSize,
      windowBits: this.options.windowBits,
      memLevel: this.options.memLevel,
      strategy: this.options.strategy,
      
      filter: (req: Request, res: Response) => {
        return this.shouldCompress(req, res);
      }
    });
  }

  /**
   * Determine if content should be compressed
   */
  private shouldCompress(req: Request, res: Response): boolean {
    // Don't compress if client doesn't support it
    const acceptEncoding = req.get('Accept-Encoding') || '';
    if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('br') && !acceptEncoding.includes('deflate')) {
      return false;
    }

    // Don't compress already compressed content
    const contentEncoding = res.get('Content-Encoding');
    if (contentEncoding && contentEncoding !== 'identity') {
      return false;
    }

    // Check content type
    const contentType = res.get('Content-Type') || '';
    if (!this.isCompressibleContentType(contentType)) {
      return false;
    }

    // Check content length
    const contentLength = res.get('Content-Length');
    if (contentLength && parseInt(contentLength) < this.options.threshold!) {
      return false;
    }

    // Don't compress if explicitly disabled
    const cacheControl = res.get('Cache-Control');
    if (cacheControl?.includes('no-transform')) {
      return false;
    }

    return true;
  }

  /**
   * Check if content type is compressible
   */
  private isCompressibleContentType(contentType: string): boolean {
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'application/x-javascript',
      'application/x-font-ttf',
      'application/vnd.ms-fontobject',
      'font/opentype',
      'image/svg+xml',
      'image/x-icon',
      'application/vnd.api+json'
    ];

    return compressibleTypes.some(type => 
      contentType.toLowerCase().includes(type)
    );
  }

  /**
   * Check if request is for text content
   */
  private isTextContent(req: Request): boolean {
    const path = req.path.toLowerCase();
    const textExtensions = ['.html', '.css', '.js', '.json', '.xml', '.txt', '.svg'];
    
    return textExtensions.some(ext => path.endsWith(ext)) ||
           req.get('Accept')?.includes('text/') ||
           req.get('Accept')?.includes('application/json');
  }

  /**
   * Check if client is mobile
   */
  private isMobileClient(req: Request): boolean {
    const userAgent = req.get('User-Agent') || '';
    const mobilePatterns = [
      /Mobile/i,
      /Android/i,
      /iPhone/i,
      /iPad/i,
      /Windows Phone/i,
      /BlackBerry/i
    ];

    return mobilePatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Optimize JSON for better compression
   */
  private optimizeJsonForCompression(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    try {
      // Remove null values and empty objects/arrays if configured
      if (process.env.OPTIMIZE_JSON_FOR_COMPRESSION === 'true') {
        return this.removeEmptyValues(data);
      }

      // Sort object keys for better compression
      if (process.env.SORT_JSON_KEYS === 'true') {
        return this.sortObjectKeys(data);
      }

      return data;
    } catch (error) {
      safeLogger.error('Error optimizing JSON for compression:', error);
      return data;
    }
  }

  /**
   * Remove empty values from object
   */
  private removeEmptyValues(obj: any): any {
    if (Array.isArray(obj)) {
      return obj
        .map(item => this.removeEmptyValues(item))
        .filter(item => item !== null && item !== undefined && item !== '');
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.removeEmptyValues(value);
        
        if (cleanedValue !== null && cleanedValue !== undefined && cleanedValue !== '') {
          if (typeof cleanedValue === 'object') {
            if (Array.isArray(cleanedValue) && cleanedValue.length > 0) {
              cleaned[key] = cleanedValue;
            } else if (!Array.isArray(cleanedValue) && Object.keys(cleanedValue).length > 0) {
              cleaned[key] = cleanedValue;
            }
          } else {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Sort object keys for better compression
   */
  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    if (obj && typeof obj === 'object') {
      const sorted: any = {};
      const keys = Object.keys(obj).sort();
      
      for (const key of keys) {
        sorted[key] = this.sortObjectKeys(obj[key]);
      }
      
      return sorted;
    }

    return obj;
  }

  /**
   * Minify content based on type
   */
  private minifyContent(content: string, contentType: string): string {
    try {
      if (contentType.includes('text/html')) {
        // Basic HTML minification
        return content
          .replace(/>\s+</g, '><')
          .replace(/\s+/g, ' ')
          .trim();
      }

      if (contentType.includes('text/css')) {
        // Basic CSS minification
        return content
          .replace(/\s*{\s*/g, '{')
          .replace(/;\s*/g, ';')
          .replace(/\s*}\s*/g, '}')
          .replace(/\s+/g, ' ')
          .trim();
      }

      if (contentType.includes('application/javascript')) {
        // Basic JS minification (very simple)
        return content
          .replace(/\s*;\s*/g, ';')
          .replace(/\s*{\s*/g, '{')
          .replace(/\s*}\s*/g, '}')
          .replace(/\s+/g, ' ')
          .trim();
      }

      return content;
    } catch (error) {
      safeLogger.error('Error minifying content:', error);
      return content;
    }
  }

  /**
   * Update compression metrics
   */
  private updateMetrics(
    compressionTime: number,
    originalSize: number,
    compressedSize: number,
    wasCompressed: boolean
  ): void {
    // Ensure compressionTimes array exists (defensive programming)
    if (!this.compressionTimes) {
      this.compressionTimes = [];
    }

    this.compressionTimes.push(compressionTime);

    // Keep only recent compression times
    if (this.compressionTimes.length > 1000) {
      this.compressionTimes = this.compressionTimes.slice(-1000);
    }

    if (wasCompressed) {
      this.metrics.compressedRequests++;
      this.metrics.totalBytesSaved += (originalSize - compressedSize);
    }

    // Calculate average compression time
    if (this.compressionTimes.length > 0) {
      const sum = this.compressionTimes.reduce((a, b) => a + b, 0);
      this.metrics.averageCompressionTime = sum / this.compressionTimes.length;
    }

    // Calculate compression ratio
    if (this.metrics.compressedRequests > 0) {
      this.metrics.compressionRatio = this.metrics.totalBytesSaved / 
        (this.metrics.totalBytesSaved + compressedSize * this.metrics.compressedRequests);
    }
  }

  /**
   * Get compression metrics
   */
  getMetrics(): CompressionMetrics & {
    compressionRate: number;
    averageBytesPerRequest: number;
  } {
    const compressionRate = this.metrics.totalRequests > 0 
      ? this.metrics.compressedRequests / this.metrics.totalRequests 
      : 0;

    const averageBytesPerRequest = this.metrics.compressedRequests > 0
      ? this.metrics.totalBytesSaved / this.metrics.compressedRequests
      : 0;

    return {
      ...this.metrics,
      compressionRate,
      averageBytesPerRequest
    };
  }

  /**
   * Get compression report
   */
  getCompressionReport(): {
    efficiency: 'excellent' | 'good' | 'fair' | 'poor';
    recommendations: string[];
    stats: CompressionMetrics;
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];
    let efficiency: 'excellent' | 'good' | 'fair' | 'poor' = 'good';

    // Analyze compression efficiency
    if (metrics.compressionRatio > 0.7) {
      efficiency = 'excellent';
    } else if (metrics.compressionRatio > 0.5) {
      efficiency = 'good';
    } else if (metrics.compressionRatio > 0.3) {
      efficiency = 'fair';
    } else {
      efficiency = 'poor';
      recommendations.push('Low compression ratio - review content types and compression settings');
    }

    // Check compression rate
    if (metrics.compressionRate < 0.5) {
      recommendations.push('Low compression rate - many responses are not being compressed');
    }

    // Check compression time
    if (metrics.averageCompressionTime > 50) {
      recommendations.push('High compression time - consider reducing compression level for better performance');
    }

    // Check bytes saved
    if (metrics.totalBytesSaved < 1000000) { // Less than 1MB saved
      recommendations.push('Low bandwidth savings - review compression thresholds and content optimization');
    }

    return {
      efficiency,
      recommendations,
      stats: metrics
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      compressedRequests: 0,
      compressionRatio: 0,
      totalBytesSaved: 0,
      averageCompressionTime: 0
    };
    this.compressionTimes = [];
  }
}

export default CompressionOptimizationMiddleware;