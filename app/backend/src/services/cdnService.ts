import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { safeLogger } from '../utils/safeLogger';
import { selfHostedStorageService } from '../services/selfHostedStorageService';
import { storageAuthMiddleware, fileAccessMiddleware } from '../middleware/storageAuthMiddleware';

// Configuration
const CDN_BASE_PATH = process.env.CDN_BASE_PATH || '/cdn';
const CDN_PORT = parseInt(process.env.CDN_PORT || '8080');
const CDN_HOST = process.env.CDN_HOST || 'localhost';
const CDN_CACHE_MAX_AGE = parseInt(process.env.CDN_CACHE_MAX_AGE || '3600'); // 1 hour

export interface CDNConfig {
  port: number;
  host: string;
  basePath: string;
  cacheMaxAge: number;
  enableCompression: boolean;
  allowedOrigins: string[];
}

export class CDNService {
  private app: express.Application;
  private server: any;
  private config: CDNConfig;
  private isRunning: boolean = false;

  constructor(config?: Partial<CDNConfig>) {
    this.app = express();
    this.config = {
      port: config?.port || CDN_PORT,
      host: config?.host || CDN_HOST,
      basePath: config?.basePath || CDN_BASE_PATH,
      cacheMaxAge: config?.cacheMaxAge || CDN_CACHE_MAX_AGE,
      enableCompression: config?.enableCompression !== undefined ? config.enableCompression : true,
      allowedOrigins: config?.allowedOrigins || ['*']
    };
    
    this.setupRoutes();
  }

  /**
   * Setup CDN routes
   */
  private setupRoutes(): void {
    // Add security headers middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      // CORS
      const origin = req.get('Origin');
      if (origin && this.config.allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      } else if (this.config.allowedOrigins.includes('*')) {
        res.header('Access-Control-Allow-Origin', '*');
      }
      
      res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Security headers
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      
      next();
    });

    // Handle preflight requests
    this.app.options('*', (req, res) => {
      res.sendStatus(200);
    });

    // File serving route with authentication and access control
    this.app.get(`${this.config.basePath}/:fileId`, storageAuthMiddleware, fileAccessMiddleware('read'), async (req: Request, res: Response) => {
      try {
        const fileId = req.params.fileId;
        const userId = (req as any).storageUser?.id || 'anonymous';
        
        // Serve file from storage
        const { buffer, metadata } = await selfHostedStorageService.downloadFile(fileId, userId);
        
        // Set response headers
        res.set({
          'Content-Type': metadata.mimeType,
          'Content-Length': metadata.size,
          'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
          'ETag': `"${metadata.checksum}"`,
          'Last-Modified': metadata.updatedAt.toUTCString(),
          'X-Content-Type-Options': 'nosniff'
        });
        
        // Add security headers
        res.set('X-Frame-Options', 'DENY');
        res.set('X-Content-Type-Options', 'nosniff');
        
        // Send file
        res.send(buffer);
        
        safeLogger.info('File served via CDN', {
          fileId,
          userId,
          size: metadata.size,
          mimeType: metadata.mimeType
        });
      } catch (error) {
        safeLogger.error('CDN file serving failed:', error);
        
        if ((error as any).message.includes('Access denied')) {
          res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        } else if ((error as any).code === 'ENOENT') {
          res.status(404).json({
            success: false,
            error: 'File not found'
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    });

    // Thumbnail generation route
    this.app.get(`${this.config.basePath}/:fileId/thumb/:size`, storageAuthMiddleware, fileAccessMiddleware('read'), async (req: Request, res: Response) => {
      try {
        const fileId = req.params.fileId;
        const size = req.params.size;
        const userId = (req as any).storageUser?.id || 'anonymous';
        
        // Validate size parameter
        const validSizes = ['small', 'medium', 'large', 'xsmall', 'xlarge'];
        if (!validSizes.includes(size)) {
          res.status(400).json({
            success: false,
            error: `Invalid size. Valid sizes: ${validSizes.join(', ')}`
          });
          return;
        }
        
        // Get original file
        const { buffer, metadata } = await selfHostedStorageService.downloadFile(fileId, userId);
        
        // In a real implementation, you would generate thumbnails using a library like Sharp
        // For now, we'll just return the original file with a warning
        safeLogger.warn('Thumbnail generation not implemented, returning original file', {
          fileId,
          requestedSize: size
        });
        
        res.set({
          'Content-Type': metadata.mimeType,
          'Content-Length': metadata.size,
          'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
          'ETag': `"${metadata.checksum}"`,
          'Last-Modified': metadata.updatedAt.toUTCString()
        });
        
        res.send(buffer);
      } catch (error) {
        safeLogger.error('CDN thumbnail serving failed:', error);
        
        if ((error as any).message.includes('Access denied')) {
          res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        } else if ((error as any).code === 'ENOENT') {
          res.status(404).json({
            success: false,
            error: 'File not found'
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    });

    // Asset optimization route
    this.app.get(`${this.config.basePath}/:fileId/optimize`, storageAuthMiddleware, fileAccessMiddleware('read'), async (req: Request, res: Response) => {
      try {
        const fileId = req.params.fileId;
        const userId = (req as any).storageUser?.id || 'anonymous';
        
        // Get optimization parameters
        const width = parseInt(req.query.width as string) || null;
        const height = parseInt(req.query.height as string) || null;
        const quality = parseInt(req.query.quality as string) || 85;
        const format = req.query.format as string || null;
        
        // Validate parameters
        if (width && (width < 10 || width > 4000)) {
          res.status(400).json({
            success: false,
            error: 'Width must be between 10 and 4000 pixels'
          });
          return;
        }
        
        if (height && (height < 10 || height > 4000)) {
          res.status(400).json({
            success: false,
            error: 'Height must be between 10 and 4000 pixels'
          });
          return;
        }
        
        if (quality && (quality < 1 || quality > 100)) {
          res.status(400).json({
            success: false,
            error: 'Quality must be between 1 and 100'
          });
          return;
        }
        
        // Get original file
        const { buffer, metadata } = await selfHostedStorageService.downloadFile(fileId, userId);
        
        // In a real implementation, you would optimize the file using a library like Sharp
        // For now, we'll just return the original file with a warning
        safeLogger.warn('Asset optimization not implemented, returning original file', {
          fileId,
          width,
          height,
          quality,
          format
        });
        
        res.set({
          'Content-Type': metadata.mimeType,
          'Content-Length': metadata.size,
          'Cache-Control': `public, max-age=${this.config.cacheMaxAge}`,
          'ETag': `"${metadata.checksum}"`,
          'Last-Modified': metadata.updatedAt.toUTCString()
        });
        
        res.send(buffer);
      } catch (error) {
        safeLogger.error('CDN asset optimization failed:', error);
        
        if ((error as any).message.includes('Access denied')) {
          res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        } else if ((error as any).code === 'ENOENT') {
          res.status(404).json({
            success: false,
            error: 'File not found'
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    });

    // Health check route
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'CDN'
      });
    });

    // Metrics route
    this.app.get('/metrics', async (req, res) => {
      try {
        // In a real implementation, you would return actual metrics
        // For now, we'll return mock metrics
        const metrics = {
          requests: Math.floor(Math.random() * 1000),
          errors: Math.floor(Math.random() * 10),
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        };
        
        res.status(200).json(metrics);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to get metrics'
        });
      }
    });
  }

  /**
   * Start the CDN server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('CDN server is already running');
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen({ port: this.config.port, host: this.config.host }, () => {
        this.isRunning = true;
        safeLogger.info(`CDN server started on ${this.config.host}:${this.config.port}${this.config.basePath}`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          safeLogger.error(`Port ${this.config.port} is already in use`);
        }
        this.isRunning = false;
        reject(error);
      });
    });
  }

  /**
   * Stop the CDN server
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      return;
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        safeLogger.info('CDN server stopped');
        resolve();
      });
    });
  }

  /**
   * Get CDN server status
   */
  getStatus(): {
    isRunning: boolean;
    config: CDNConfig;
    address: string;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      address: this.isRunning ? `http://${this.config.host}:${this.config.port}${this.config.basePath}` : 'Not running'
    };
  }

  /**
   * Get URL for a file
   */
  getFileUrl(fileId: string): string {
    return `${this.config.basePath}/${fileId}`;
  }

  /**
   * Get URL for a thumbnail
   */
  getThumbnailUrl(fileId: string, size: 'small' | 'medium' | 'large' | 'xsmall' | 'xlarge'): string {
    return `${this.config.basePath}/${fileId}/thumb/${size}`;
  }

  /**
   * Get URL for optimized asset
   */
  getOptimizedUrl(fileId: string, params?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: string;
  }): string {
    let url = `${this.config.basePath}/${fileId}/optimize?`;
    const queryParams = [];
    
    if (params?.width) queryParams.push(`width=${params.width}`);
    if (params?.height) queryParams.push(`height=${params.height}`);
    if (params?.quality) queryParams.push(`quality=${params.quality}`);
    if (params?.format) queryParams.push(`format=${params.format}`);
    
    return url + queryParams.join('&');
  }
}

// Export singleton instance (with default configuration)
export const cdnService = new CDNService();
export default CDNService;