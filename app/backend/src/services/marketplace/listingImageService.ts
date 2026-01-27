import { ProductListingService } from './listingService';
import ImageStorageService from './imageStorageService';
import { DatabaseService } from './databaseService';
import { RedisService } from './redisService';
import { ValidationError } from '../../models/validation';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';

export interface ListingImageUpload {
  file: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface ListingImageResult {
  success: boolean;
  imageId?: string;
  ipfsHash?: string;
  cdnUrl?: string;
  thumbnails?: {
    small: string;
    medium: string;
    large: string;
  };
  error?: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export interface ListingImageGallery {
  listingId: string;
  images: ListingImageInfo[];
  primaryImageIndex: number;
  totalImages: number;
}

export interface ListingImageInfo {
  id: string;
  ipfsHash: string;
  cdnUrl: string;
  thumbnails: {
    small: string;
    medium: string;
    large: string;
  };
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
  isPrimary: boolean;
  order: number;
  uploadedAt: Date;
}

export interface ImageOrderUpdate {
  imageId: string;
  newOrder: number;
}

export class ListingImageService {
  private listingService: ProductListingService;
  private imageStorageService: typeof ImageStorageService;
  private databaseService: DatabaseService;
  private redisService: RedisService;

  constructor() {
    this.listingService = new ProductListingService();
    this.imageStorageService = ImageStorageService;
    this.databaseService = new DatabaseService();
    this.redisService = RedisService.getInstance();
  }

  /**
   * Upload multiple images for a listing
   * Requirements: 2.1, 3.1, 3.4
   */
  async uploadListingImages(
    listingId: string,
    images: ListingImageUpload[]
  ): Promise<ListingImageResult[]> {
    // Validate listing exists
    const listing = await this.listingService.getListingById(listingId);
    if (!listing) {
      throw new ValidationError('Listing not found', 'listingId');
    }

    // Validate image count (max 10 images per listing)
    const currentImages = await this.getListingImages(listingId);
    const totalImages = currentImages.images.length + images.length;
    if (totalImages > 10) {
      throw new ValidationError(
        `Maximum 10 images allowed per listing. Current: ${currentImages.images.length}, Uploading: ${images.length}`,
        'images'
      );
    }

    const results: ListingImageResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        // Validate individual image
        this.validateImageUpload(image);

        // Upload to image storage service
        const uploadResult = await this.imageStorageService.uploadImage(
          image.file,
          image.originalName,
          {
            userId: listing.sellerId,
            usageType: 'listing',
            usageReferenceId: listingId
          }
        );

        // Check if upload was successful by checking for id
        if (uploadResult.id) {
          // Store image metadata in database
          const imageRecord = await this.storeImageMetadata(
            listingId,
            uploadResult,
            currentImages.images.length + i
          );

          results.push({
            success: true,
            imageId: imageRecord.id,
            ipfsHash: uploadResult.ipfsHash,
            cdnUrl: uploadResult.cdnUrl,
            thumbnails: {
              small: uploadResult.thumbnails?.small || uploadResult.cdnUrl || '',
              medium: uploadResult.thumbnails?.medium || uploadResult.cdnUrl || '',
              large: uploadResult.thumbnails?.large || uploadResult.cdnUrl || ''
            },
            metadata: {
              width: uploadResult.width || 0,
              height: uploadResult.height || 0,
              format: uploadResult.contentType || '',
              size: uploadResult.fileSize || 0
            }
          });
        } else {
          results.push({
            success: false,
            error: 'Upload failed'
          });
        }
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update listing with new image hashes
    await this.updateListingImages(listingId);

    // Invalidate cache
    await this.invalidateListingImageCache(listingId);

    return results;
  }

  /**
   * Get all images for a listing with gallery display
   * Requirements: 2.1, 3.1, 3.4
   */
  async getListingImages(listingId: string): Promise<ListingImageGallery> {
    // Try cache first
    const cacheKey = `listing_images:${listingId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get from database
    const db = this.databaseService.getDatabase();
    const imageRecords = await db.select()
      .from(schema.imageStorage)
      .where(eq(schema.imageStorage.usageType, 'listing'))
      .orderBy(schema.imageStorage.createdAt);

    // Filter for this listing (assuming we have a way to link images to listings)
    // In a real implementation, we'd have a proper foreign key relationship
    const listingImages = imageRecords.filter(record => 
      record.metadata && JSON.parse(record.metadata).listingId === listingId
    );

    // Get listing to determine primary image
    const listing = await this.listingService.getListingById(listingId);
    const primaryImageIndex = listing?.metadata?.imageIpfsHashes?.length ? 0 : 0;

    const images: ListingImageInfo[] = listingImages.map((record, index) => ({
      id: record.id,
      ipfsHash: record.ipfsHash || '',
      cdnUrl: record.cdnUrl || '',
      thumbnails: record.thumbnails ? JSON.parse(record.thumbnails) : {
        small: record.cdnUrl || '',
        medium: record.cdnUrl || '',
        large: record.cdnUrl || ''
      },
      metadata: {
        width: record.width || 0,
        height: record.height || 0,
        format: record.contentType || '',
        size: record.fileSize || 0
      },
      isPrimary: index === primaryImageIndex,
      order: index,
      uploadedAt: record.createdAt || new Date()
    }));

    const gallery: ListingImageGallery = {
      listingId,
      images,
      primaryImageIndex,
      totalImages: images.length
    };

    // Cache the result
    await this.redisService.set(cacheKey, gallery, 3600); // 1 hour

    return gallery;
  }

  /**
   * Set primary image for listing
   * Requirements: 2.1, 3.1, 3.4
   */
  async setPrimaryImage(listingId: string, imageIndex: number): Promise<void> {
    // Validate listing exists
    const listing = await this.listingService.getListingById(listingId);
    if (!listing) {
      throw new ValidationError('Listing not found', 'listingId');
    }

    // Get listing images to validate index
    const gallery = await this.getListingImages(listingId);
    if (imageIndex < 0 || imageIndex >= gallery.totalImages) {
      throw new ValidationError(
        `Invalid image index. Must be between 0 and ${gallery.totalImages - 1}`,
        'imageIndex'
      );
    }

    // Update listing with new primary image index
    await this.listingService.updateListing(listingId, {
      primaryImageIndex: imageIndex
    });

    // Invalidate cache
    await this.invalidateListingImageCache(listingId);
  }

  /**
   * Reorder images in listing gallery
   * Requirements: 2.1, 3.1, 3.4
   */
  async reorderImages(listingId: string, imageOrders: ImageOrderUpdate[]): Promise<void> {
    // Validate listing exists
    const listing = await this.listingService.getListingById(listingId);
    if (!listing) {
      throw new ValidationError('Listing not found', 'listingId');
    }

    // Get current images
    const gallery = await this.getListingImages(listingId);
    
    // Validate all image IDs exist
    const imageIds = gallery.images.map(img => img.id);
    for (const update of imageOrders) {
      if (!imageIds.includes(update.imageId)) {
        throw new ValidationError(`Image not found: ${update.imageId}`, 'imageId');
      }
      if (update.newOrder < 0 || update.newOrder >= gallery.totalImages) {
        throw new ValidationError(
          `Invalid order position: ${update.newOrder}`,
          'newOrder'
        );
      }
    }

    // Update image orders in database
    const db = this.databaseService.getDatabase();
    for (const update of imageOrders) {
      await db.update(schema.imageStorage)
        .set({ 
          metadata: JSON.stringify({
            ...JSON.parse(gallery.images.find(img => img.id === update.imageId)?.metadata as any || '{}'),
            order: update.newOrder
          })
        })
        .where(eq(schema.imageStorage.id, update.imageId));
    }

    // Update listing images array
    await this.updateListingImages(listingId);

    // Invalidate cache
    await this.invalidateListingImageCache(listingId);
  }

  /**
   * Delete image from listing
   * Requirements: 2.1, 3.1, 3.4
   */
  async deleteListingImage(listingId: string, imageId: string): Promise<void> {
    // Validate listing exists
    const listing = await this.listingService.getListingById(listingId);
    if (!listing) {
      throw new ValidationError('Listing not found', 'listingId');
    }

    // Get image record
    const db = this.databaseService.getDatabase();
    const imageRecord = await db.select()
      .from(schema.imageStorage)
      .where(eq(schema.imageStorage.id, imageId));

    if (!imageRecord[0]) {
      throw new ValidationError('Image not found', 'imageId');
    }

    // Delete from storage service
    if (imageRecord[0].ipfsHash) {
      await this.imageStorageService.deleteImage(imageRecord[0].ipfsHash, listing.sellerId);
    }

    // Delete from database
    await db.delete(schema.imageStorage)
      .where(eq(schema.imageStorage.id, imageId));

    // Update listing images array
    await this.updateListingImages(listingId);

    // Adjust primary image index if necessary
    const gallery = await this.getListingImages(listingId);
    if (listing.metadata?.imageIpfsHashes && listing.metadata.imageIpfsHashes.length > 0 && 
        listing.metadata.imageIpfsHashes.length >= gallery.totalImages) {
      await this.listingService.updateListing(listingId, {
        primaryImageIndex: Math.max(0, gallery.totalImages - 1)
      });
    }

    // Invalidate cache
    await this.invalidateListingImageCache(listingId);
  }

  /**
   * Get image display URLs for different sizes
   * Requirements: 2.1, 3.4
   */
  async getImageDisplayUrls(imageId: string): Promise<{
    original: string;
    large: string;
    medium: string;
    small: string;
    thumbnail: string;
  }> {
    const db = this.databaseService.getDatabase();
    const imageRecord = await db.select()
      .from(schema.imageStorage)
      .where(eq(schema.imageStorage.id, imageId));

    if (!imageRecord[0]) {
      throw new ValidationError('Image not found', 'imageId');
    }

    const record = imageRecord[0];
    const thumbnails = record.thumbnails ? JSON.parse(record.thumbnails) : {};

    return {
      original: record.cdnUrl || '',
      large: thumbnails.large || record.cdnUrl || '',
      medium: thumbnails.medium || record.cdnUrl || '',
      small: thumbnails.small || record.cdnUrl || '',
      thumbnail: thumbnails.small || record.cdnUrl || ''
    };
  }

  /**
   * Validate image upload
   */
  private validateImageUpload(image: ListingImageUpload): void {
    // Check file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      throw new ValidationError('Image file too large (max 10MB)', 'fileSize');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(image.mimeType)) {
      throw new ValidationError(
        `Invalid image type. Allowed: ${allowedTypes.join(', ')}`,
        'mimeType'
      );
    }

    // Check minimum size (1KB)
    if (image.size < 1024) {
      throw new ValidationError('Image file too small (min 1KB)', 'fileSize');
    }
  }

  /**
   * Store image metadata in database
   */
  private async storeImageMetadata(
    listingId: string,
    uploadResult: any,
    order: number
  ): Promise<any> {
    const db = this.databaseService.getDatabase();
    
    const imageRecord = await db.insert(schema.imageStorage).values({
      ipfsHash: uploadResult.ipfsHash,
      cdnUrl: uploadResult.cdnUrl,
      originalFilename: uploadResult.originalName,
      contentType: uploadResult.mimeType,
      fileSize: uploadResult.size,
      width: uploadResult.metadata?.width,
      height: uploadResult.metadata?.height,
      thumbnails: JSON.stringify(uploadResult.thumbnails),
      ownerId: uploadResult.ownerId,
      usageType: 'listing',
      metadata: JSON.stringify({
        listingId,
        order,
        uploadedAt: new Date().toISOString()
      })
    }).returning();

    return imageRecord[0];
  }

  /**
   * Update listing with current image hashes
   */
  private async updateListingImages(listingId: string): Promise<void> {
    const gallery = await this.getListingImages(listingId);
    const imageHashes = gallery.images
      .sort((a, b) => a.order - b.order)
      .map(img => img.ipfsHash);

    const cdnUrls = gallery.images
      .sort((a, b) => a.order - b.order)
      .reduce((acc, img, index) => {
        acc[`image_${index}`] = img.cdnUrl;
        return acc;
      }, {} as Record<string, string>);

    await this.listingService.updateListing(listingId, {
      images: imageHashes,
      metadata: {
        imageIpfsHashes: imageHashes,
        imageCdnUrls: cdnUrls
      }
    });
  }

  /**
   * Invalidate listing image cache
   */
  private async invalidateListingImageCache(listingId: string): Promise<void> {
    const cacheKeys = [
      `listing_images:${listingId}`,
      `listing:${listingId}`,
      'marketplace:active_listings',
      'marketplace:featured_listings'
    ];

    await Promise.all(cacheKeys.map(key => this.redisService.del(key)));
  }

  /**
   * Generate image gallery HTML for display
   * Requirements: 3.1, 3.4
   */
  async generateImageGalleryData(listingId: string): Promise<{
    primaryImage: ListingImageInfo | null;
    galleryImages: ListingImageInfo[];
    totalImages: number;
    hasMultipleImages: boolean;
  }> {
    const gallery = await this.getListingImages(listingId);

    return {
      primaryImage: gallery.images.find(img => img.isPrimary) || gallery.images[0] || null,
      galleryImages: gallery.images,
      totalImages: gallery.totalImages,
      hasMultipleImages: gallery.totalImages > 1
    };
  }

  /**
   * Optimize images for different display contexts
   * Requirements: 2.1, 3.4
   */
  async getOptimizedImageUrls(
    listingId: string,
    context: 'thumbnail' | 'card' | 'detail' | 'gallery'
  ): Promise<string[]> {
    const gallery = await this.getListingImages(listingId);

    const sizeMap = {
      thumbnail: 'small',
      card: 'medium',
      detail: 'large',
      gallery: 'large'
    };

    const size = sizeMap[context];

    return gallery.images.map(img => {
      if (size === 'small') return img.thumbnails.small;
      if (size === 'medium') return img.thumbnails.medium;
      if (size === 'large') return img.thumbnails.large;
      return img.cdnUrl;
    });
  }

  /**
   * Batch process images for multiple listings
   * Requirements: 2.1, 3.1
   */
  async batchProcessListingImages(
    operations: Array<{
      listingId: string;
      action: 'upload' | 'delete' | 'reorder' | 'setPrimary';
      data: any;
    }>
  ): Promise<Array<{ success: boolean; listingId: string; error?: string }>> {
    const results = [];

    for (const operation of operations) {
      try {
        switch (operation.action) {
          case 'upload':
            await this.uploadListingImages(operation.listingId, operation.data);
            break;
          case 'delete':
            await this.deleteListingImage(operation.listingId, operation.data.imageId);
            break;
          case 'reorder':
            await this.reorderImages(operation.listingId, operation.data);
            break;
          case 'setPrimary':
            await this.setPrimaryImage(operation.listingId, operation.data.imageIndex);
            break;
        }

        results.push({ success: true, listingId: operation.listingId });
      } catch (error) {
        results.push({
          success: false,
          listingId: operation.listingId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}
