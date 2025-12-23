import AWS from 'aws-sdk';
import { safeLogger } from '../utils/safeLogger';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';
let sharp;
let sharpAvailable = false;

// Dynamically import sharp with error handling
try {
  sharp = require('sharp');
  sharpAvailable = true;
  console.log('✅ Sharp module loaded successfully in enhancedCdnOptimizationService');
} catch (error) {
  console.warn('⚠️ Sharp module not available in enhancedCdnOptimizationService:', error.message);
  sharp = {
    resize: () => ({ 
      jpeg: () => ({ toBuffer: () => Promise.reject(new Error('Sharp not available')) }),
      png: () => ({ toBuffer: () => Promise.reject(new Error('Sharp not available')) }),
      webp: () => ({ toBuffer: () => Promise.reject(new Error('Sharp not available')) })
    }),
    metadata: () => Promise.reject(new Error('Sharp not available'))
  };
}

interface CDNConfig {
  distributionId: string;
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  cloudFrontDomain: string;
}

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
}

interface CachePolicy {
  ttl: number;
  headers: string[];
  queryStrings: string[];
  behaviors: {
    compress: boolean;
    viewerProtocolPolicy: 'allow-all' | 'redirect-to-https' | 'https-only';
    cachePolicyId?: string;
  };
}

interface AssetMetadata {
  key: string;
  contentType: string;
  size: number;
  etag: string;
  lastModified: Date;
  cacheControl: string;
  transformations?: ImageTransformOptions;
  variants?: string[];
}

interface CDNPerformanceMetrics {
  uploadTime: number;
  transformTime: number;
  distributionTime: number;
  totalTime: number;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

export class EnhancedCDNOptimizationService {
  private s3: AWS.S3;
  private cloudFront: AWS.CloudFront;
  private redis: Redis;
  private config: CDNConfig;
  private performanceMetrics: CDNPerformanceMetrics[] = [];

  constructor(config: CDNConfig, redisUrl: string) {
    this.config = config;
    
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
    });

    this.s3 = new AWS.S3({
      // Performance optimizations
      maxRetries: 3,
      retryDelayOptions: {
        customBackoff: (retryCount) => Math.pow(2, retryCount) * 100
      },
      httpOptions: {
        timeout: 30000,
        agent: new (require('https').Agent)({
          keepAlive: true,
          maxSockets: 50
        })
      }
    });

    this.cloudFront = new AWS.CloudFront();
    
    this.redis = new Redis(redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    });
  }

  // Enhanced image upload with automatic optimization
  async uploadOptimizedAsset(
    key: string,
    buffer: Buffer,
    contentType: string,
    options: {
      transforms?: ImageTransformOptions;
      generateVariants?: boolean;
      cachePolicy?: CachePolicy;
      enableWebP?: boolean;
      enableAVIF?: boolean;
    } = {}
  ): Promise<AssetMetadata> {
    const startTime = performance.now();
    const originalSize = buffer.length;
    
    try {
      const {
        transforms,
        generateVariants = true,
        cachePolicy,
        enableWebP = true,
        enableAVIF = false
      } = options;

      // Check if asset already exists
      const existingAsset = await this.getAssetMetadata(key);
      const etag = createHash('md5').update(buffer).digest('hex');
      
      if (existingAsset && existingAsset.etag === etag) {
        return existingAsset;
      }

      let optimizedBuffer = buffer;
      let transformTime = 0;

      // Apply image optimizations if it's an image
      if (contentType.startsWith('image/')) {
        const transformStart = performance.now();
        optimizedBuffer = await this.optimizeImage(buffer, transforms);
        transformTime = performance.now() - transformStart;
      }

      // Upload main asset
      const uploadStart = performance.now();
      const mainAsset = await this.uploadToS3(key, optimizedBuffer, contentType, cachePolicy);
      const uploadTime = performance.now() - uploadStart;

      // Generate responsive variants if enabled
      const variants: string[] = [];
      if (generateVariants && contentType.startsWith('image/')) {
        const variantKeys = await this.generateResponsiveVariants(
          key, 
          optimizedBuffer, 
          contentType,
          { enableWebP, enableAVIF }
        );
        variants.push(...variantKeys);
      }

      // Distribute to CDN
      const distributionStart = performance.now();
      await this.distributeToCDN([key, ...variants]);
      const distributionTime = performance.now() - distributionStart;

      const totalTime = performance.now() - startTime;

      // Record performance metrics
      this.recordPerformanceMetrics({
        uploadTime,
        transformTime,
        distributionTime,
        totalTime,
        originalSize,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: originalSize / optimizedBuffer.length
      });

      const metadata: AssetMetadata = {
        key,
        contentType,
        size: optimizedBuffer.length,
        etag,
        lastModified: new Date(),
        cacheControl: this.getCacheControlHeader(contentType, cachePolicy),
        transformations: transforms,
        variants
      };

      // Cache metadata
      await this.cacheAssetMetadata(key, metadata);
      
      return metadata;

    } catch (error) {
      safeLogger.error('Enhanced CDN upload error:', error);
      throw new Error(`Failed to upload optimized asset: ${error.message}`);
    }
  }

  // Advanced image optimization with multiple formats
  private async optimizeImage(
    buffer: Buffer, 
    transforms?: ImageTransformOptions
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(buffer, {
        sequentialRead: true,
        limitInputPixels: 268402689
      });

      // Apply transformations
      if (transforms) {
        // Resize if specified
        if (transforms.width || transforms.height) {
          pipeline = pipeline.resize(transforms.width, transforms.height, {
            fit: transforms.fit || 'cover',
            position: transforms.position || 'center',
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3
          });
        }

        // Apply filters
        if (transforms.blur) {
          pipeline = pipeline.blur(transforms.blur);
        }

        if (transforms.sharpen) {
          pipeline = pipeline.sharpen();
        }

        if (transforms.grayscale) {
          pipeline = pipeline.grayscale();
        }
      }

      // Optimize based on format
      const metadata = await sharp(buffer).metadata();
      const format = transforms?.format || this.getOptimalFormat(metadata);

      switch (format) {
        case 'webp':
          pipeline = pipeline.webp({
            quality: transforms?.quality || 85,
            effort: 6,
            smartSubsample: true,
            nearLossless: (transforms?.quality || 85) > 90
          });
          break;
        
        case 'avif':
          pipeline = pipeline.avif({
            quality: transforms?.quality || 80,
            effort: 9,
            chromaSubsampling: '4:2:0'
          });
          break;
        
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: transforms?.quality || 85,
            progressive: true,
            mozjpeg: true,
            trellisQuantisation: true,
            overshootDeringing: true,
            optimizeScans: true
          });
          break;
        
        case 'png':
          pipeline = pipeline.png({
            quality: transforms?.quality || 90,
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: true
          });
          break;
      }

      return await pipeline.toBuffer();
    } catch (error) {
      safeLogger.error('Image optimization error:', error);
      return buffer; // Return original if optimization fails
    }
  }

  // Generate responsive image variants
  private async generateResponsiveVariants(
    originalKey: string,
    buffer: Buffer,
    contentType: string,
    options: { enableWebP: boolean; enableAVIF: boolean }
  ): Promise<string[]> {
    const variants: string[] = [];
    
    const sizes = [
      { suffix: '_thumb', width: 150, height: 150, quality: 80 },
      { suffix: '_small', width: 400, height: 400, quality: 85 },
      { suffix: '_medium', width: 800, height: 800, quality: 90 },
      { suffix: '_large', width: 1200, height: 1200, quality: 95 }
    ];

    const formats: Array<{ suffix: string; format: 'webp' | 'avif' | 'jpeg' }> = [
      { suffix: '', format: 'jpeg' }
    ];

    if (options.enableWebP) {
      formats.push({ suffix: '_webp', format: 'webp' });
    }

    if (options.enableAVIF) {
      formats.push({ suffix: '_avif', format: 'avif' });
    }

    // Generate all combinations in parallel
    const variantPromises: Promise<string>[] = [];

    for (const size of sizes) {
      for (const format of formats) {
        const variantKey = this.generateVariantKey(originalKey, size.suffix + format.suffix);
        
        variantPromises.push(
          this.createVariant(buffer, variantKey, {
            width: size.width,
            height: size.height,
            quality: size.quality,
            format: format.format
          }, contentType)
        );
      }
    }

    const results = await Promise.allSettled(variantPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        variants.push(result.value);
      } else {
        safeLogger.warn(`Failed to create variant ${index}:`, result.reason);
      }
    });

    return variants;
  }

  private async createVariant(
    buffer: Buffer,
    variantKey: string,
    transforms: ImageTransformOptions,
    originalContentType: string
  ): Promise<string> {
    const optimizedBuffer = await this.optimizeImage(buffer, transforms);
    const contentType = this.getContentTypeForFormat(transforms.format || 'jpeg');
    
    await this.uploadToS3(variantKey, optimizedBuffer, contentType);
    return variantKey;
  }

  // Enhanced S3 upload with multipart for large files
  private async uploadToS3(
    key: string,
    buffer: Buffer,
    contentType: string,
    cachePolicy?: CachePolicy
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: this.config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: this.getCacheControlHeader(contentType, cachePolicy),
      Metadata: {
        uploadedAt: new Date().toISOString(),
        originalSize: buffer.length.toString(),
        optimized: 'true'
      }
    };

    // Add compression for compressible content
    if (this.shouldCompress(contentType)) {
      uploadParams.ContentEncoding = 'gzip';
    }

    // Use multipart upload for large files (>100MB)
    if (buffer.length > 100 * 1024 * 1024) {
      return this.s3.upload(uploadParams, {
        partSize: 10 * 1024 * 1024, // 10MB parts
        queueSize: 4 // Upload 4 parts in parallel
      }).promise();
    }

    return this.s3.upload(uploadParams).promise();
  }

  // Intelligent CDN distribution with edge optimization
  private async distributeToCDN(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      // Warm up edge locations by making requests to popular regions
      const edgeWarmupPromises = keys.map(key => 
        this.warmupEdgeLocations(key)
      );

      await Promise.allSettled(edgeWarmupPromises);
    } catch (error) {
      safeLogger.warn('Edge warmup failed:', error);
    }
  }

  private async warmupEdgeLocations(key: string): Promise<void> {
    const url = this.generateCDNUrl(key);
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1']; // Popular regions
    
    const warmupPromises = regions.map(async (region) => {
      try {
        // Make a HEAD request to warm up the edge cache
        const response = await fetch(url, { 
          method: 'HEAD',
          headers: {
            'CloudFront-Viewer-Country': region.split('-')[0].toUpperCase()
          }
        });
        return response.ok;
      } catch (error) {
        safeLogger.warn(`Edge warmup failed for ${region}:`, error);
        return false;
      }
    });

    await Promise.allSettled(warmupPromises);
  }

  // Generate optimized CDN URLs with smart defaults
  generateCDNUrl(
    key: string, 
    transforms?: ImageTransformOptions,
    options: {
      preferWebP?: boolean;
      preferAVIF?: boolean;
      devicePixelRatio?: number;
    } = {}
  ): string {
    let finalKey = key;
    
    // Select best variant based on client capabilities
    if (transforms || options.preferWebP || options.preferAVIF) {
      finalKey = this.selectOptimalVariant(key, transforms, options);
    }
    
    let url = `https://${this.config.cloudFrontDomain}/${finalKey}`;
    
    // Add query parameters for real-time transformations if needed
    if (transforms && !this.hasPreGeneratedVariant(finalKey, transforms)) {
      const params = new URLSearchParams();
      
      if (transforms.width) params.append('w', transforms.width.toString());
      if (transforms.height) params.append('h', transforms.height.toString());
      if (transforms.quality) params.append('q', transforms.quality.toString());
      if (transforms.format) params.append('f', transforms.format);
      if (transforms.fit) params.append('fit', transforms.fit);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    return url;
  }

  private selectOptimalVariant(
    key: string,
    transforms?: ImageTransformOptions,
    options: {
      preferWebP?: boolean;
      preferAVIF?: boolean;
      devicePixelRatio?: number;
    } = {}
  ): string {
    // Logic to select the best variant based on:
    // - Client capabilities (WebP/AVIF support)
    // - Device pixel ratio
    // - Requested transformations
    
    let variantSuffix = '';
    
    // Select size variant
    if (transforms?.width) {
      if (transforms.width <= 150) variantSuffix += '_thumb';
      else if (transforms.width <= 400) variantSuffix += '_small';
      else if (transforms.width <= 800) variantSuffix += '_medium';
      else variantSuffix += '_large';
    }
    
    // Select format variant
    if (options.preferAVIF) {
      variantSuffix += '_avif';
    } else if (options.preferWebP) {
      variantSuffix += '_webp';
    }
    
    return variantSuffix ? this.generateVariantKey(key, variantSuffix) : key;
  }

  private hasPreGeneratedVariant(key: string, transforms: ImageTransformOptions): boolean {
    // Check if we have a pre-generated variant that matches the requested transforms
    // This would typically check against a database or cache of available variants
    return false; // Simplified for now
  }

  // Batch invalidation with intelligent grouping
  async invalidateCache(paths: string[], options: {
    priority?: 'high' | 'normal' | 'low';
    waitForCompletion?: boolean;
  } = {}): Promise<string> {
    const { priority = 'normal', waitForCompletion = false } = options;
    
    // Group paths to optimize invalidation requests
    const groupedPaths = this.groupPathsForInvalidation(paths);
    const invalidationIds: string[] = [];
    
    for (const pathGroup of groupedPaths) {
      const invalidationParams: AWS.CloudFront.CreateInvalidationRequest = {
        DistributionId: this.config.distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: pathGroup.length,
            Items: pathGroup.map(path => path.startsWith('/') ? path : `/${path}`),
          },
          CallerReference: `invalidation-${priority}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      };

      try {
        const result = await this.cloudFront.createInvalidation(invalidationParams).promise();
        const invalidationId = result.Invalidation?.Id;
        
        if (invalidationId) {
          invalidationIds.push(invalidationId);
          
          if (waitForCompletion) {
            await this.waitForInvalidationCompletion(invalidationId);
          }
        }
      } catch (error) {
        safeLogger.error('Invalidation error:', error);
        throw new Error(`Failed to invalidate cache: ${error.message}`);
      }
    }
    
    return invalidationIds.join(',');
  }

  private groupPathsForInvalidation(paths: string[]): string[][] {
    // CloudFront has a limit of 3000 paths per invalidation
    const maxPathsPerRequest = 3000;
    const groups: string[][] = [];
    
    for (let i = 0; i < paths.length; i += maxPathsPerRequest) {
      groups.push(paths.slice(i, i + maxPathsPerRequest));
    }
    
    return groups;
  }

  private async waitForInvalidationCompletion(invalidationId: string): Promise<void> {
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 10000; // 10 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const result = await this.cloudFront.getInvalidation({
          DistributionId: this.config.distributionId,
          Id: invalidationId
        }).promise();
        
        if (result.Invalidation?.Status === 'Completed') {
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        safeLogger.error('Error checking invalidation status:', error);
        break;
      }
    }
  }

  // Enhanced asset metadata management
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

  // Performance monitoring and analytics
  private recordPerformanceMetrics(metrics: CDNPerformanceMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
    
    // Log performance insights
    if (metrics.totalTime > 10000) { // > 10 seconds
      safeLogger.warn('Slow CDN operation detected:', {
        totalTime: `${metrics.totalTime.toFixed(2)}ms`,
        compressionRatio: metrics.compressionRatio.toFixed(2),
        originalSize: `${(metrics.originalSize / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }

  getPerformanceMetrics(): CDNPerformanceMetrics[] {
    return this.performanceMetrics.slice();
  }

  getAveragePerformanceMetrics(): {
    avgUploadTime: number;
    avgTransformTime: number;
    avgCompressionRatio: number;
    avgTotalTime: number;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        avgUploadTime: 0,
        avgTransformTime: 0,
        avgCompressionRatio: 0,
        avgTotalTime: 0
      };
    }

    const totals = this.performanceMetrics.reduce((acc, metric) => ({
      uploadTime: acc.uploadTime + metric.uploadTime,
      transformTime: acc.transformTime + metric.transformTime,
      compressionRatio: acc.compressionRatio + metric.compressionRatio,
      totalTime: acc.totalTime + metric.totalTime
    }), { uploadTime: 0, transformTime: 0, compressionRatio: 0, totalTime: 0 });

    const count = this.performanceMetrics.length;

    return {
      avgUploadTime: totals.uploadTime / count,
      avgTransformTime: totals.transformTime / count,
      avgCompressionRatio: totals.compressionRatio / count,
      avgTotalTime: totals.totalTime / count
    };
  }

  // Utility methods
  private getOptimalFormat(metadata: any): 'webp' | 'jpeg' | 'png' | 'avif' {
    // Logic to determine optimal format based on image characteristics
    if (metadata.hasAlpha) {
      return 'webp'; // WebP handles transparency well
    }
    
    if (metadata.channels && metadata.channels <= 3) {
      return 'webp'; // WebP is generally better for photos
    }
    
    return 'jpeg'; // Default fallback
  }

  private getContentTypeForFormat(format: string): string {
    const contentTypes: Record<string, string> = {
      'webp': 'image/webp',
      'avif': 'image/avif',
      'jpeg': 'image/jpeg',
      'png': 'image/png'
    };
    
    return contentTypes[format] || 'image/jpeg';
  }

  private generateVariantKey(originalKey: string, suffix: string): string {
    const parts = originalKey.split('.');
    const extension = parts.pop();
    const baseName = parts.join('.');
    
    return `${baseName}${suffix}.${extension}`;
  }

  private getCacheControlHeader(contentType: string, policy?: CachePolicy): string {
    if (policy) {
      return `public, max-age=${policy.ttl}`;
    }

    // Enhanced cache policies
    if (contentType.startsWith('image/')) {
      return 'public, max-age=31536000, immutable, stale-while-revalidate=86400';
    }
    
    // JavaScript and CSS files with shorter cache times to allow updates
    if (contentType.includes('javascript')) {
      // For JS files, use shorter cache time to allow updates while still caching
      return 'public, max-age=43200, stale-while-revalidate=3600'; // 12 hours for JS files
    }
    
    if (contentType.includes('css')) {
      // For CSS files, use shorter cache time to allow updates
      return 'public, max-age=86400, stale-while-revalidate=3600'; // 24 hours for CSS files
    }
    
    if (contentType.includes('html')) {
      return 'public, max-age=300, stale-while-revalidate=60';
    }
    
    return 'public, max-age=3600, stale-while-revalidate=300';
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

  // Cleanup
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
