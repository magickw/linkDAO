import { DatabaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import path from 'path';

export interface MediaUploadResult {
  success: boolean;
  ipfsHash?: string;
  cdnUrl?: string;
  error?: string;
  metadata?: MediaMetadata;
}

export interface MediaMetadata {
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  uploadedAt: Date;
  userId: string;
}

export interface AvatarOptions {
  maxSize: number; // in bytes
  allowedTypes: string[];
  dimensions: {
    width: number;
    height: number;
  };
  quality: number; // 0-100 for JPEG compression
}

export interface CDNConfig {
  baseUrl: string;
  apiKey?: string;
  bucketName?: string;
  region?: string;
}

export class AvatarMediaService {
  private databaseService: DatabaseService;
  private defaultAvatarOptions: AvatarOptions;
  private cdnConfig: CDNConfig;

  constructor() {
    this.databaseService = new DatabaseService();
    this.defaultAvatarOptions = {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      dimensions: { width: 400, height: 400 },
      quality: 85,
    };
    this.cdnConfig = {
      baseUrl: process.env.CDN_BASE_URL || 'https://cdn.linkdao.io',
      apiKey: process.env.CDN_API_KEY,
      bucketName: process.env.CDN_BUCKET_NAME || 'linkdao-avatars',
      region: process.env.CDN_REGION || 'us-east-1',
    };
  }

  /**
   * Upload and process user avatar
   */
  async uploadAvatar(
    userId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<MediaUploadResult> {
    try {
      // Validate file
      const validation = this.validateAvatarFile(fileBuffer, mimeType);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Process image (resize, optimize)
      const processedBuffer = await this.processAvatarImage(fileBuffer, mimeType);
      
      // Generate unique filename
      const uniqueFilename = this.generateUniqueFilename(filename, userId);
      
      // Upload to IPFS
      const ipfsResult = await this.uploadToIPFS(processedBuffer, uniqueFilename);
      if (!ipfsResult.success) {
        return { success: false, error: 'Failed to upload to IPFS' };
      }

      // Upload to CDN for faster access
      const cdnResult = await this.uploadToCDN(processedBuffer, uniqueFilename, mimeType);
      
      // Create metadata
      const metadata: MediaMetadata = {
        filename: uniqueFilename,
        size: processedBuffer.length,
        mimeType,
        width: this.defaultAvatarOptions.dimensions.width,
        height: this.defaultAvatarOptions.dimensions.height,
        uploadedAt: new Date(),
        userId,
      };

      // Update user profile with new avatar
      await this.updateUserAvatar(userId, ipfsResult.hash!, cdnResult.url);

      return {
        success: true,
        ipfsHash: ipfsResult.hash,
        cdnUrl: cdnResult.url,
        metadata,
      };
    } catch (error) {
      safeLogger.error('Error uploading avatar:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Get user avatar URL with fallback options
   */
  async getUserAvatarUrl(userId: string, preferCDN = true): Promise<string> {
    try {
      const db = this.databaseService.getDatabase();
      const [user] = await db
        .select({
          avatarCid: users.profileCid, // Assuming avatar is stored in profileCid
          handle: users.handle,
          walletAddress: users.walletAddress,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return this.generateDefaultAvatar(userId);
      }

      // Try CDN first if preferred and available
      if (preferCDN && user.avatarCid) {
        const cdnUrl = this.getCDNUrl(user.avatarCid);
        if (await this.isUrlAccessible(cdnUrl)) {
          return cdnUrl;
        }
      }

      // Fall back to IPFS
      if (user.avatarCid) {
        return this.getIPFSUrl(user.avatarCid);
      }

      // Generate default avatar based on user data
      return this.generateDefaultAvatar(user.handle || user.walletAddress || userId);
    } catch (error) {
      safeLogger.error('Error getting user avatar URL:', error);
      return this.generateDefaultAvatar(userId);
    }
  }

  /**
   * Generate multiple avatar sizes for responsive design
   */
  async generateAvatarSizes(
    originalBuffer: Buffer,
    mimeType: string,
    sizes: number[] = [40, 80, 160, 320]
  ): Promise<{ [size: number]: MediaUploadResult }> {
    const results: { [size: number]: MediaUploadResult } = {};

    for (const size of sizes) {
      try {
        const resizedBuffer = await this.resizeImage(originalBuffer, size, size, mimeType);
        const filename = `avatar_${size}x${size}`;
        
        const ipfsResult = await this.uploadToIPFS(resizedBuffer, filename);
        const cdnResult = await this.uploadToCDN(resizedBuffer, filename, mimeType);

        results[size] = {
          success: true,
          ipfsHash: ipfsResult.hash,
          cdnUrl: cdnResult.url,
          metadata: {
            filename,
            size: resizedBuffer.length,
            mimeType,
            width: size,
            height: size,
            uploadedAt: new Date(),
            userId: '',
          },
        };
      } catch (error) {
        safeLogger.error(`Error generating ${size}x${size} avatar:`, error);
        results[size] = { success: false, error: 'Failed to generate size' };
      }
    }

    return results;
  }

  /**
   * Delete user avatar
   */
  async deleteAvatar(userId: string): Promise<boolean> {
    try {
      const db = this.databaseService.getDatabase();
      
      // Get current avatar hash
      const [user] = await db
        .select({ avatarCid: users.profileCid })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (user?.avatarCid) {
        // Delete from IPFS (if supported by provider)
        await this.deleteFromIPFS(user.avatarCid);
        
        // Delete from CDN
        await this.deleteFromCDN(user.avatarCid);
      }

      // Clear avatar from user profile
      await db
        .update(users)
        .set({ profileCid: null })
        .where(eq(users.id, userId));

      return true;
    } catch (error) {
      safeLogger.error('Error deleting avatar:', error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private validateAvatarFile(buffer: Buffer, mimeType: string): { valid: boolean; error?: string } {
    // Check file size
    if (buffer.length > this.defaultAvatarOptions.maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${this.defaultAvatarOptions.maxSize / (1024 * 1024)}MB`,
      };
    }

    // Check MIME type
    if (!this.defaultAvatarOptions.allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: `File type ${mimeType} is not allowed. Allowed types: ${this.defaultAvatarOptions.allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }

  private async processAvatarImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
    // This would use a library like Sharp for image processing
    // For now, return the original buffer
    // In a real implementation, you would:
    // 1. Resize to standard dimensions
    // 2. Optimize quality
    // 3. Convert to optimal format if needed
    return buffer;
  }

  private async resizeImage(buffer: Buffer, width: number, height: number, mimeType: string): Promise<Buffer> {
    // This would use Sharp or similar library for resizing
    // For now, return the original buffer
    return buffer;
  }

  private generateUniqueFilename(originalFilename: string, userId: string): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(`${userId}-${timestamp}`).digest('hex').substring(0, 8);
    const extension = path.extname(originalFilename);
    return `avatar_${userId}_${hash}${extension}`;
  }

  private async uploadToIPFS(buffer: Buffer, filename: string): Promise<{ success: boolean; hash?: string }> {
    try {
      // This would integrate with IPFS client
      // For now, simulate IPFS upload
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      
      // In real implementation:
      // const ipfs = create({ url: process.env.IPFS_NODE_URL });
      // const result = await ipfs.add({ content: buffer, path: filename });
      // return { success: true, hash: result.cid.toString() };
      
      return { success: true, hash: `Qm${hash.substring(0, 44)}` };
    } catch (error) {
      safeLogger.error('Error uploading to IPFS:', error);
      return { success: false };
    }
  }

  private async uploadToCDN(buffer: Buffer, filename: string, mimeType: string): Promise<{ success: boolean; url?: string }> {
    try {
      // This would integrate with CDN provider (AWS S3, Cloudflare, etc.)
      // For now, simulate CDN upload
      const url = `${this.cdnConfig.baseUrl}/avatars/${filename}`;
      
      // In real implementation:
      // const s3 = new AWS.S3({ region: this.cdnConfig.region });
      // await s3.upload({
      //   Bucket: this.cdnConfig.bucketName!,
      //   Key: `avatars/${filename}`,
      //   Body: buffer,
      //   ContentType: mimeType,
      //   ACL: 'public-read'
      // }).promise();
      
      return { success: true, url };
    } catch (error) {
      safeLogger.error('Error uploading to CDN:', error);
      return { success: false };
    }
  }

  private async deleteFromIPFS(hash: string): Promise<boolean> {
    try {
      // IPFS doesn't typically support deletion, but you might unpin
      // const ipfs = create({ url: process.env.IPFS_NODE_URL });
      // await ipfs.pin.rm(hash);
      return true;
    } catch (error) {
      safeLogger.error('Error deleting from IPFS:', error);
      return false;
    }
  }

  private async deleteFromCDN(filename: string): Promise<boolean> {
    try {
      // Delete from CDN
      // const s3 = new AWS.S3({ region: this.cdnConfig.region });
      // await s3.deleteObject({
      //   Bucket: this.cdnConfig.bucketName!,
      //   Key: `avatars/${filename}`
      // }).promise();
      return true;
    } catch (error) {
      safeLogger.error('Error deleting from CDN:', error);
      return false;
    }
  }

  private async updateUserAvatar(userId: string, ipfsHash: string, cdnUrl?: string): Promise<void> {
    const db = this.databaseService.getDatabase();
    
    // Store IPFS hash in profileCid field
    // In a more complete implementation, you might have separate avatar fields
    await db
      .update(users)
      .set({ 
        profileCid: ipfsHash,
        // If you had separate avatar fields:
        // avatarIpfsHash: ipfsHash,
        // avatarCdnUrl: cdnUrl,
      })
      .where(eq(users.id, userId));
  }

  private getCDNUrl(hash: string): string {
    return `${this.cdnConfig.baseUrl}/avatars/${hash}`;
  }

  private getIPFSUrl(hash: string): string {
    return `https://ipfs.io/ipfs/${hash}`;
  }

  private async isUrlAccessible(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private generateDefaultAvatar(identifier: string): string {
    // Generate deterministic avatar based on identifier
    const avatarServices = [
      'https://api.dicebear.com/7.x/identicon/svg',
      'https://api.dicebear.com/7.x/bottts/svg',
      'https://api.dicebear.com/7.x/avataaars/svg',
    ];
    
    // Use a hash to consistently select the same avatar service for the same user
    const hash = crypto.createHash('md5').update(identifier).digest('hex');
    const serviceIndex = parseInt(hash.substring(0, 2), 16) % avatarServices.length;
    const service = avatarServices[serviceIndex];
    
    return `${service}?seed=${encodeURIComponent(identifier)}&size=400`;
  }

  /**
   * Batch process avatars for multiple users
   */
  async batchProcessAvatars(userAvatars: Array<{ userId: string; buffer: Buffer; filename: string; mimeType: string }>): Promise<MediaUploadResult[]> {
    const results: MediaUploadResult[] = [];
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < userAvatars.length; i += batchSize) {
      const batch = userAvatars.slice(i, i + batchSize);
      const batchPromises = batch.map(({ userId, buffer, filename, mimeType }) =>
        this.uploadAvatar(userId, buffer, filename, mimeType)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < userAvatars.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Get avatar analytics
   */
  async getAvatarAnalytics(userId: string): Promise<{
    totalUploads: number;
    totalSize: number;
    lastUpload?: Date;
    cdnHits?: number;
    ipfsHits?: number;
  }> {
    // This would track avatar usage analytics
    // For now, return mock data
    return {
      totalUploads: 1,
      totalSize: 0,
      lastUpload: new Date(),
      cdnHits: 0,
      ipfsHits: 0,
    };
  }
}
