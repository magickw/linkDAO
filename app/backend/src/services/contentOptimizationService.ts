import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

interface OptimizationConfig {
  images: {
    formats: string[];
    qualities: { [key: string]: number };
    sizes: string[];
    compression: {
      enabled: boolean;
      algorithm: string;
      progressive: boolean;
    };
  };
  videos: {
    formats: string[];
    qualities: string[];
    compression: {
      enabled: boolean;
      codec: string;
      bitrate: string;
    };
  };
  text: {
    compression: {
      enabled: boolean;
      algorithm: string;
      level: number;
    };
    minification: {
      enabled: boolean;
      removeComments: boolean;
      removeWhitespace: boolean;
    };
  };
  caching: {
    ttl: { [key: string]: number };
    strategy: string;
  };
  cdn: {
    enabled: boolean;
    provider: string;
    zones: string[];
  };
}

interface OptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  format: string;
  url: string;
  cacheKey: string;
  processingTime: number;
}

@Injectable()
export class ContentOptimizationService {
  private readonly logger = new Logger(ContentOptimizationService.name);
  private readonly redis: Redis;
  private readonly s3Client: S3Client;
  private readonly cloudFrontClient: CloudFrontClient;
  private config: OptimizationConfig; // Removed readonly to allow assignment

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.cloudFrontClient = new CloudFrontClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    this.loadConfig();
  }

  private loadConfig(): void {
    // Load configuration from environment or config file
    this.config = {
      images: {
        formats: ['webp', 'avif', 'jpeg'],
        qualities: { high: 90, medium: 75, low: 60 },
        sizes: ['320w', '640w', '1024w', '1920w'],
        compression: {
          enabled: true,
          algorithm: 'mozjpeg',
          progressive: true,
        },
      },
      videos: {
        formats: ['mp4', 'webm'],
        qualities: ['1080p', '720p', '480p'],
        compression: {
          enabled: true,
          codec: 'h264',
          bitrate: 'adaptive',
        },
      },
      text: {
        compression: {
          enabled: true,
          algorithm: 'gzip',
          level: 6,
        },
        minification: {
          enabled: true,
          removeComments: true,
          removeWhitespace: true,
        },
      },
      caching: {
        ttl: {
          images: 2592000, // 30 days
          videos: 604800,  // 7 days
          text: 86400,     // 1 day
        },
        strategy: 'adaptive',
      },
      cdn: {
        enabled: true,
        provider: 'cloudflare',
        zones: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      },
    };
  }

  async optimizeImage(
    buffer: Buffer,
    contentType: string,
    options: {
      quality?: string;
      format?: string;
      width?: number;
      height?: number;
    } = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalSize = buffer.length;
    
    try {
      // Generate cache key
      const hash = createHash('sha256').update(buffer).digest('hex');
      const cacheKey = `image:${hash}:${JSON.stringify(options)}`;
      
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for image optimization: ${cacheKey}`);
        return JSON.parse(cached);
      }

      // Determine optimal format and quality
      const targetFormat = options.format || this.selectOptimalImageFormat(contentType);
      const targetQuality = this.config.images.qualities[options.quality || 'medium'];

      // Optimize image
      let sharpInstance = sharp(buffer);

      // Resize if dimensions specified
      if (options.width || options.height) {
        sharpInstance = sharpInstance.resize(options.width, options.height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Apply format-specific optimizations
      let optimizedBuffer: Buffer;
      switch (targetFormat) {
        case 'webp':
          optimizedBuffer = await sharpInstance
            .webp({ quality: targetQuality, effort: 6 })
            .toBuffer();
          break;
        case 'avif':
          optimizedBuffer = await sharpInstance
            .avif({ quality: targetQuality, effort: 9 })
            .toBuffer();
          break;
        case 'jpeg':
          optimizedBuffer = await sharpInstance
            .jpeg({ 
              quality: targetQuality, 
              progressive: this.config.images.compression.progressive,
              mozjpeg: this.config.images.compression.algorithm === 'mozjpeg'
            })
            .toBuffer();
          break;
        default:
          optimizedBuffer = await sharpInstance.toBuffer();
      }

      const optimizedSize = optimizedBuffer.length;
      const compressionRatio = (originalSize - optimizedSize) / originalSize;

      // Upload to S3
      const s3Key = `optimized/${hash}.${targetFormat}`;
      await this.uploadToS3(optimizedBuffer, s3Key, `image/${targetFormat}`);

      // Generate CDN URL
      const url = this.generateCDNUrl(s3Key);

      const result: OptimizationResult = {
        originalSize,
        optimizedSize,
        compressionRatio,
        format: targetFormat,
        url,
        cacheKey,
        processingTime: Date.now() - startTime,
      };

      // Cache result
      await this.redis.setex(
        cacheKey,
        this.config.caching.ttl.images,
        JSON.stringify(result)
      );

      this.logger.log(`Image optimized: ${originalSize} -> ${optimizedSize} bytes (${(compressionRatio * 100).toFixed(2)}% reduction)`);
      
      return result;
    } catch (error) {
      this.logger.error(`Image optimization failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async optimizeVideo(
    inputPath: string,
    options: {
      quality?: string;
      format?: string;
      resolution?: string;
    } = {}
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const targetFormat = options.format || 'mp4';
      const targetQuality = options.quality || '720p';
      const outputPath = `/tmp/optimized_${Date.now()}.${targetFormat}`;

      let command = ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac');

      // Apply quality settings
      switch (targetQuality) {
        case '1080p':
          command = command.size('1920x1080').videoBitrate('5000k');
          break;
        case '720p':
          command = command.size('1280x720').videoBitrate('2500k');
          break;
        case '480p':
          command = command.size('854x480').videoBitrate('1000k');
          break;
      }

      // Apply compression settings
      if (this.config.videos.compression.enabled) {
        command = command
          .addOption('-preset', 'medium')
          .addOption('-crf', '23')
          .addOption('-movflags', '+faststart');
      }

      command
        .on('end', async () => {
          try {
            const fs = require('fs');
            const originalSize = fs.statSync(inputPath).size;
            const optimizedBuffer = fs.readFileSync(outputPath);
            const optimizedSize = optimizedBuffer.length;
            const compressionRatio = (originalSize - optimizedSize) / originalSize;

            // Upload to S3
            const hash = createHash('sha256').update(optimizedBuffer).digest('hex');
            const s3Key = `optimized/${hash}.${targetFormat}`;
            await this.uploadToS3(optimizedBuffer, s3Key, `video/${targetFormat}`);

            // Generate CDN URL
            const url = this.generateCDNUrl(s3Key);

            const result: OptimizationResult = {
              originalSize,
              optimizedSize,
              compressionRatio,
              format: targetFormat,
              url,
              cacheKey: `video:${hash}`,
              processingTime: Date.now() - startTime,
            };

            // Clean up temporary files
            fs.unlinkSync(outputPath);

            this.logger.log(`Video optimized: ${originalSize} -> ${optimizedSize} bytes (${(compressionRatio * 100).toFixed(2)}% reduction)`);
            
            resolve(result);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          this.logger.error(`Video optimization failed: ${error.message}`, error.stack);
          reject(error);
        })
        .run();
    });
  }

  async optimizeText(
    content: string,
    contentType: string
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    const originalSize = Buffer.byteLength(content, 'utf8');
    
    try {
      let optimizedContent = content;

      // Apply minification
      if (this.config.text.minification.enabled) {
        if (contentType === 'application/json') {
          optimizedContent = JSON.stringify(JSON.parse(content));
        } else if (contentType === 'text/html') {
          optimizedContent = this.minifyHTML(content);
        } else if (contentType === 'text/css') {
          optimizedContent = this.minifyCSS(content);
        } else if (contentType === 'application/javascript') {
          optimizedContent = this.minifyJS(content);
        }
      }

      // Apply compression
      let finalContent = optimizedContent;
      if (this.config.text.compression.enabled) {
        const zlib = require('zlib');
        const compressed = zlib.gzipSync(optimizedContent, {
          level: this.config.text.compression.level,
        });
        finalContent = compressed.toString('base64');
      }

      const optimizedSize = Buffer.byteLength(finalContent, 'utf8');
      const compressionRatio = (originalSize - optimizedSize) / originalSize;

      // Generate cache key and store
      const hash = createHash('sha256').update(content).digest('hex');
      const cacheKey = `text:${hash}`;
      
      await this.redis.setex(
        cacheKey,
        this.config.caching.ttl.text,
        finalContent
      );

      const result: OptimizationResult = {
        originalSize,
        optimizedSize,
        compressionRatio,
        format: 'compressed',
        url: '', // Text content is served from cache
        cacheKey,
        processingTime: Date.now() - startTime,
      };

      this.logger.log(`Text optimized: ${originalSize} -> ${optimizedSize} bytes (${(compressionRatio * 100).toFixed(2)}% reduction)`);
      
      return result;
    } catch (error) {
      this.logger.error(`Text optimization failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private selectOptimalImageFormat(contentType: string): string {
    // Select format based on browser support and content type
    if (contentType.includes('png') && this.config.images.formats.includes('avif')) {
      return 'avif'; // Best compression for PNG-like content
    }
    if (this.config.images.formats.includes('webp')) {
      return 'webp'; // Good balance of compression and support
    }
    return 'jpeg'; // Fallback
  }

  private async uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: `max-age=${this.config.caching.ttl.images}`,
    });

    await this.s3Client.send(command);
  }

  private generateCDNUrl(s3Key: string): string {
    if (this.config.cdn.enabled) {
      return `https://${process.env.CDN_DOMAIN}/${s3Key}`;
    }
    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${s3Key}`;
  }

  private minifyHTML(html: string): string {
    return html
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }

  private minifyCSS(css: string): string {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove unnecessary semicolons
      .trim();
  }

  private minifyJS(js: string): string {
    // Basic minification - in production, use a proper minifier like Terser
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();
  }

  async invalidateCDNCache(paths: string[]): Promise<void> {
    if (!this.config.cdn.enabled) return;

    try {
      const command = new CreateInvalidationCommand({
        DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch: {
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
          CallerReference: `invalidation-${Date.now()}`,
        },
      });

      await this.cloudFrontClient.send(command);
      this.logger.log(`CDN cache invalidated for ${paths.length} paths`);
    } catch (error) {
      this.logger.error(`CDN cache invalidation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getOptimizationMetrics(): Promise<{
    totalOptimizations: number;
    averageCompressionRatio: number;
    bandwidthSaved: number;
    cacheHitRate: number;
  }> {
    try {
      const metrics = await this.redis.hgetall('optimization:metrics');
      
      return {
        totalOptimizations: parseInt(metrics.totalOptimizations || '0'),
        averageCompressionRatio: parseFloat(metrics.averageCompressionRatio || '0'),
        bandwidthSaved: parseInt(metrics.bandwidthSaved || '0'),
        cacheHitRate: parseFloat(metrics.cacheHitRate || '0'),
      };
    } catch (error) {
      this.logger.error(`Failed to get optimization metrics: ${error.message}`, error.stack);
      return {
        totalOptimizations: 0,
        averageCompressionRatio: 0,
        bandwidthSaved: 0,
        cacheHitRate: 0,
      };
    }
  }
}
