import AWS from 'aws-sdk';
import { safeLogger } from '../utils/safeLogger';
import { createHash } from 'crypto';
import { safeLogger } from '../utils/safeLogger';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';

interface CDNConfig {
  distributionId: string;
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  cloudFrontDomain: string;
}

interface CachePolicy {
  ttl: number;
  headers: string[];
  queryStrings: string[];
}

interface AssetMetadata {
  key: string;
  contentType: string;
  size: number;
  etag: string;
  lastModified: Date;
  cacheControl: string;
}

export class CDNIntegrationService {
  private s3: AWS.S3;
  private cloudFront: AWS.CloudFront;
  private redis: Redis;
  private config: CDNConfig;

  constructor(config: CDNConfig, redisUrl: string) {
    this.config = config;
    
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
    });

    this.s3 = new AWS.S3();
    this.cloudFront = new AWS.CloudFront();
    this.redis = new Redis(redisUrl);
  }

  // Upload assets to S3 with optimized settings
  async uploadAsset(
    key: string,
    buffer: Buffer,
    contentType: string,
    cachePolicy?: CachePolicy
  ): Promise<AssetMetadata> {
    const etag = createHash('md5').update(buffer).digest('hex');
    
    // Check if asset already exists with same content
    const existingAsset = await this.getAssetMetadata(key);
    if (existingAsset && existingAsset.etag === etag) {
      return existingAsset;
    }

    const cacheControl = this.getCacheControlHeader(contentType, cachePolicy);
    
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: this.config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: cacheControl,
      Metadata: {
        uploadedAt: new Date().toISOString(),
        originalSize: buffer.length.toString(),
      },
    };

    // Add compression for text-based files
    if (this.shouldCompress(contentType)) {
      uploadParams.ContentEncoding = 'gzip';
    }

    try {
      const result = await this.s3.upload(uploadParams).promise();
      
      const metadata: AssetMetadata = {
        key,
        contentType,
        size: buffer.length,
        etag,
        lastModified: new Date(),
        cacheControl,
      };

      // Cache metadata
      await this.cacheAssetMetadata(key, metadata);
      
      return metadata;
    } catch (error) {
      safeLogger.error('Error uploading to S3:', error);
      throw new Error(`Failed to upload asset: ${error.message}`);
    }
  }

  // Generate optimized CDN URLs
  generateCDNUrl(key: string, transformations?: ImageTransformations): string {
    let url = `https://${this.config.cloudFrontDomain}/${key}`;
    
    if (transformations) {
      const params = new URLSearchParams();
      
      if (transformations.width) params.append('w', transformations.width.toString());
      if (transformations.height) params.append('h', transformations.height.toString());
      if (transformations.quality) params.append('q', transformations.quality.toString());
      if (transformations.format) params.append('f', transformations.format);
      if (transformations.fit) params.append('fit', transformations.fit);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    return url;
  }

  // Batch upload for multiple assets
  async uploadAssetsBatch(assets: Array<{
    key: string;
    buffer: Buffer;
    contentType: string;
    cachePolicy?: CachePolicy;
  }>): Promise<AssetMetadata[]> {
    const uploadPromises = assets.map(asset => 
      this.uploadAsset(asset.key, asset.buffer, asset.contentType, asset.cachePolicy)
    );

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      safeLogger.error('Batch upload error:', error);
      throw error;
    }
  }

  // Invalidate CDN cache
  async invalidateCache(paths: string[]): Promise<string> {
    const invalidationParams: AWS.CloudFront.CreateInvalidationRequest = {
      DistributionId: this.config.distributionId,
      InvalidationBatch: {
        Paths: {
          Quantity: paths.length,
          Items: paths.map(path => path.startsWith('/') ? path : `/${path}`),
        },
        CallerReference: `invalidation-${Date.now()}`,
      },
    };

    try {
      const result = await this.cloudFront.createInvalidation(invalidationParams).promise();
      return result.Invalidation?.Id || '';
    } catch (error) {
      safeLogger.error('Error creating invalidation:', error);
      throw new Error(`Failed to invalidate cache: ${error.message}`);
    }
  }

  // Get asset metadata from cache or S3
  async getAssetMetadata(key: string): Promise<AssetMetadata | null> {
    // Try cache first
    const cached = await this.redis.get(`asset:${key}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fallback to S3
    try {
      const result = await this.s3.headObject({
        Bucket: this.config.bucketName,
        Key: key,
      }).promise();

      const metadata: AssetMetadata = {
        key,
        contentType: result.ContentType || 'application/octet-stream',
        size: result.ContentLength || 0,
        etag: result.ETag?.replace(/"/g, '') || '',
        lastModified: result.LastModified || new Date(),
        cacheControl: result.CacheControl || '',
      };

      // Cache for future requests
      await this.cacheAssetMetadata(key, metadata);
      
      return metadata;
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  // Delete asset from S3 and invalidate cache
  async deleteAsset(key: string): Promise<void> {
    try {
      await this.s3.deleteObject({
        Bucket: this.config.bucketName,
        Key: key,
      }).promise();

      // Remove from cache
      await this.redis.del(`asset:${key}`);
      
      // Invalidate CDN
      await this.invalidateCache([key]);
    } catch (error) {
      safeLogger.error('Error deleting asset:', error);
      throw error;
    }
  }

  // Optimize images for web delivery
  async optimizeImage(
    buffer: Buffer,
    options: ImageOptimizationOptions = {}
  ): Promise<Buffer> {
    // This would integrate with image processing service like Sharp
    // For now, return original buffer
    // In production, implement image optimization logic
    return buffer;
  }

  // Generate responsive image variants
  async generateResponsiveVariants(
    originalKey: string,
    buffer: Buffer,
    contentType: string
  ): Promise<AssetMetadata[]> {
    const variants = [
      { suffix: '_thumb', width: 150, height: 150, quality: 80 },
      { suffix: '_small', width: 300, height: 300, quality: 85 },
      { suffix: '_medium', width: 600, height: 600, quality: 90 },
      { suffix: '_large', width: 1200, height: 1200, quality: 95 },
    ];

    const uploadPromises = variants.map(async (variant) => {
      const optimizedBuffer = await this.optimizeImage(buffer, {
        width: variant.width,
        height: variant.height,
        quality: variant.quality,
      });

      const variantKey = originalKey.replace(/(\.[^.]+)$/, `${variant.suffix}$1`);
      
      return this.uploadAsset(variantKey, optimizedBuffer, contentType, {
        ttl: 31536000, // 1 year
        headers: ['Accept-Encoding'],
        queryStrings: [],
      });
    });

    return Promise.all(uploadPromises);
  }

  // Private helper methods
  private getCacheControlHeader(contentType: string, policy?: CachePolicy): string {
    if (policy) {
      return `public, max-age=${policy.ttl}`;
    }

    // Default cache policies based on content type
    if (contentType.startsWith('image/')) {
      return 'public, max-age=31536000, immutable'; // 1 year for images
    }
    
    if (contentType.includes('javascript') || contentType.includes('css')) {
      return 'public, max-age=31536000, immutable'; // 1 year for static assets
    }
    
    if (contentType.includes('html')) {
      return 'public, max-age=300'; // 5 minutes for HTML
    }
    
    return 'public, max-age=3600'; // 1 hour default
  }

  private shouldCompress(contentType: string): boolean {
    const compressibleTypes = [
      'text/',
      'application/javascript',
      'application/json',
      'application/xml',
      'image/svg+xml',
    ];
    
    return compressibleTypes.some(type => contentType.includes(type));
  }

  private async cacheAssetMetadata(key: string, metadata: AssetMetadata): Promise<void> {
    try {
      await this.redis.setex(
        `asset:${key}`,
        3600, // 1 hour cache
        JSON.stringify(metadata)
      );
    } catch (error) {
      safeLogger.error('Error caching asset metadata:', error);
    }
  }

  // Analytics and monitoring
  async getCDNAnalytics(startDate: Date, endDate: Date): Promise<CDNAnalytics> {
    // This would integrate with CloudWatch or CloudFront analytics
    // Return mock data for now
    return {
      requests: 0,
      bandwidth: 0,
      cacheHitRate: 0,
      topAssets: [],
      errorRate: 0,
    };
  }

  async getAssetUsageStats(): Promise<AssetUsageStats> {
    try {
      const listResult = await this.s3.listObjectsV2({
        Bucket: this.config.bucketName,
      }).promise();

      const totalSize = listResult.Contents?.reduce((sum, obj) => sum + (obj.Size || 0), 0) || 0;
      const totalCount = listResult.Contents?.length || 0;

      return {
        totalAssets: totalCount,
        totalSize,
        averageSize: totalCount > 0 ? totalSize / totalCount : 0,
      };
    } catch (error) {
      safeLogger.error('Error getting usage stats:', error);
      throw error;
    }
  }
}

// Types and interfaces
interface ImageTransformations {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill';
}

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
}

interface CDNAnalytics {
  requests: number;
  bandwidth: number;
  cacheHitRate: number;
  topAssets: Array<{ key: string; requests: number }>;
  errorRate: number;
}

interface AssetUsageStats {
  totalAssets: number;
  totalSize: number;
  averageSize: number;
}

// CDN Edge Functions (for CloudFront Lambda@Edge)
export const edgeFunctions = {
  // Origin request handler for image transformations
  originRequest: `
    exports.handler = (event, context, callback) => {
      const request = event.Records[0].cf.request;
      const uri = request.uri;
      
      // Parse query parameters for image transformations
      const params = new URLSearchParams(request.querystring);
      
      if (params.has('w') || params.has('h') || params.has('q')) {
        // Modify request to include transformation parameters in path
        const transformations = [];
        if (params.has('w')) transformations.push('w_' + params.get('w'));
        if (params.has('h')) transformations.push('h_' + params.get('h'));
        if (params.has('q')) transformations.push('q_' + params.get('q'));
        
        const transformPath = '/transforms/' + transformations.join(',');
        request.uri = transformPath + uri;
      }
      
      callback(null, request);
    };
  `,

  // Viewer response handler for security headers
  viewerResponse: `
    exports.handler = (event, context, callback) => {
      const response = event.Records[0].cf.response;
      const headers = response.headers;
      
      // Add security headers
      headers['strict-transport-security'] = [{
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains'
      }];
      
      headers['x-content-type-options'] = [{
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      }];
      
      headers['x-frame-options'] = [{
        key: 'X-Frame-Options',
        value: 'DENY'
      }];
      
      callback(null, response);
    };
  `,
};