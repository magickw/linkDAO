import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { logger } from '../utils/logger';

interface CompressionConfig {
  threshold: number; // Minimum response size to compress (bytes)
  level: number; // Compression level (1-9)
  chunkSize: number; // Chunk size for streaming compression
  windowBits: number; // Window size for compression
  memLevel: number; // Memory level for compression
}

/**
 * Enhanced compression middleware with optimization features
 */
export class CompressionService {
  private static instance: CompressionService;
  private config: CompressionConfig;

  public static getInstance(): CompressionService {
    if (!CompressionService.instance) {
      CompressionService.instance = new CompressionService();
    }
    return CompressionService.instance;
  }

  constructor() {
    this.config = {
      threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024'), // 1KB
      level: parseInt(process.env.COMPRESSION_LEVEL || '6'), // Balanced compression
      chunkSize: parseInt(process.env.COMPRESSION_CHUNK_SIZE || '16384'), // 16KB
      windowBits: parseInt(process.env.COMPRESSION_WINDOW_BITS || '15'),
      memLevel: parseInt(process.env.COMPRESSION_MEM_LEVEL || '8')
    };
  }

  /**
   * Create compression middleware with custom configuration
   */
  public createCompressionMiddleware(customConfig?: Partial<CompressionConfig>) {
    const config = { ...this.config, ...customConfig };

    return compression({
      threshold: config.threshold,
      level: config.level,
      chunkSize: config.chunkSize,
      windowBits: config.windowBits,
      memLevel: config.memLevel,
      
      // Custom filter function to determine what to compress
      filter: (req: Request, res: Response) => {
        return this.shouldCompress(req, res);
      },

      // Custom compression strategy
      strategy: compression.constants.Z_DEFAULT_STRATEGY
    });
  }

  /**
   * Determine if response should be compressed
   */
  private shouldCompress(req: Request, res: Response): boolean {
    // Don't compress if client doesn't support it
    if (!req.get('Accept-Encoding')?.includes('gzip')) {
      return false;
    }

    // Don't compress already compressed content
    const contentEncoding = res.get('Content-Encoding');
    if (contentEncoding && contentEncoding !== 'identity') {
      return false;
    }

    // Get content type
    const contentType = res.get('Content-Type') || '';

    // Compress text-based content types
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/rss+xml',
      'application/atom+xml',
      'image/svg+xml'
    ];

    const isCompressible = compressibleTypes.some(type => 
      contentType.toLowerCase().includes(type)
    );

    if (!isCompressible) {
      return false;
    }

    // Don't compress small responses
    const contentLength = res.get('Content-Length');
    if (contentLength && parseInt(contentLength) < this.config.threshold) {
      return false;
    }

    // Don't compress responses that are already cached
    const cacheControl = res.get('Cache-Control');
    if (cacheControl?.includes('no-transform')) {
      return false;
    }

    return true;
  }

  /**
   * Middleware for response optimization
   */
  public responseOptimizationMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add optimization headers
      this.addOptimizationHeaders(req, res);

      // Override json method to add optimization
      const originalJson = res.json;
      res.json = function(body: any) {
        // Optimize JSON response
        const optimizedBody = CompressionService.getInstance().optimizeJsonResponse(body);
        return originalJson.call(this, optimizedBody);
      };

      next();
    };
  }

  /**
   * Add optimization headers to response
   */
  private addOptimizationHeaders(req: Request, res: Response): void {
    // Add cache headers for static content
    if (this.isStaticContent(req)) {
      res.set({
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        'Expires': new Date(Date.now() + 31536000000).toUTCString()
      });
    }

    // Add compression hint headers
    res.set({
      'Vary': 'Accept-Encoding',
      'X-Content-Type-Options': 'nosniff'
    });

    // Add performance headers
    res.set({
      'X-Response-Time': Date.now().toString(),
      'X-Powered-By': 'Marketplace-API'
    });
  }

  /**
   * Check if request is for static content
   */
  private isStaticContent(req: Request): boolean {
    const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
    return staticExtensions.some(ext => req.path.endsWith(ext));
  }

  /**
   * Optimize JSON response by removing unnecessary data
   */
  private optimizeJsonResponse(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    try {
      // Remove null values and empty objects/arrays if configured
      if (process.env.REMOVE_NULL_VALUES === 'true') {
        return this.removeNullValues(body);
      }

      // Minify response by removing extra whitespace
      if (process.env.MINIFY_JSON === 'true') {
        return JSON.parse(JSON.stringify(body));
      }

      return body;
    } catch (error) {
      logger.error('Error optimizing JSON response:', error);
      return body;
    }
  }

  /**
   * Remove null and undefined values from object
   */
  private removeNullValues(obj: any): any {
    if (Array.isArray(obj)) {
      return obj
        .map(item => this.removeNullValues(item))
        .filter(item => item !== null && item !== undefined);
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined) {
          const cleanedValue = this.removeNullValues(value);
          if (cleanedValue !== null && cleanedValue !== undefined) {
            // Don't include empty objects or arrays
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
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Middleware for large payload optimization
   */
  public largePayloadOptimization() {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalJson = res.json;
      
      res.json = function(body: any) {
        try {
          const bodySize = JSON.stringify(body).length;
          
          // If response is large, apply additional optimizations
          if (bodySize > 100000) { // 100KB
            logger.info('Large response detected, applying optimizations', {
              size: bodySize,
              endpoint: `${req.method} ${req.path}`
            });

            // Add streaming headers for large responses
            res.set({
              'Transfer-Encoding': 'chunked',
              'X-Large-Response': 'true'
            });

            // Paginate large arrays if possible
            if (Array.isArray(body) && body.length > 100) {
              const page = parseInt(req.query.page as string) || 1;
              const limit = parseInt(req.query.limit as string) || 50;
              const startIndex = (page - 1) * limit;
              const endIndex = startIndex + limit;
              
              const paginatedBody = {
                data: body.slice(startIndex, endIndex),
                pagination: {
                  page,
                  limit,
                  total: body.length,
                  totalPages: Math.ceil(body.length / limit),
                  hasNext: endIndex < body.length,
                  hasPrev: page > 1
                }
              };

              return originalJson.call(this, paginatedBody);
            }
          }

          return originalJson.call(this, body);
        } catch (error) {
          logger.error('Error in large payload optimization:', error);
          return originalJson.call(this, body);
        }
      };

      next();
    };
  }

  /**
   * Get compression statistics
   */
  public getCompressionStats(): {
    config: CompressionConfig;
    compressedRequests: number;
    totalSavings: number;
    averageCompressionRatio: number;
  } {
    // This would need to be implemented with actual tracking
    return {
      config: this.config,
      compressedRequests: 0,
      totalSavings: 0,
      averageCompressionRatio: 0
    };
  }

  /**
   * Update compression configuration
   */
  public updateConfig(newConfig: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Compression configuration updated', this.config);
  }
}

export const compressionService = CompressionService.getInstance();

// Export pre-configured middleware
export const standardCompression = compressionService.createCompressionMiddleware();
export const highCompression = compressionService.createCompressionMiddleware({
  level: 9,
  threshold: 512
});
export const fastCompression = compressionService.createCompressionMiddleware({
  level: 1,
  threshold: 2048
});

export const responseOptimization = compressionService.responseOptimizationMiddleware();
export const largePayloadOptimization = compressionService.largePayloadOptimization();
