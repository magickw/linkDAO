import { ListingImageService, ListingImageUpload } from '../services/listingImageService';
import { ProductListingService } from '../services/listingService';
import ImageStorageService from '../services/imageStorageService';
import { DatabaseService } from '../services/databaseService';
import { RedisService } from '../services/redisService';
import { ValidationError } from '../models/validation';

// Mock dependencies
jest.mock('../services/listingService');
jest.mock('../services/imageStorageService');
jest.mock('../services/databaseService');
jest.mock('../services/redisService');

describe('ListingImageService', () => {
  let listingImageService: ListingImageService;
  let mockListingService: jest.Mocked<ListingService>;
  let mockImageStorageService: jest.Mocked<typeof ImageStorageService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance
    listingImageService = new ListingImageService();

    // Get mocked instances
    mockListingService = ListingService.prototype as jest.Mocked<ListingService>;
    mockImageStorageService = ImageStorageService as jest.Mocked<typeof ImageStorageService>;
    mockDatabaseService = DatabaseService.prototype as jest.Mocked<DatabaseService>;
    mockRedisService = RedisService.prototype as jest.Mocked<RedisService>;

    // Setup default mocks
    mockDatabaseService.getDatabase = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'image-123' }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis()
    });

    mockRedisService.get = jest.fn().mockResolvedValue(null);
    mockRedisService.set = jest.fn().mockResolvedValue(undefined);
    mockRedisService.del = jest.fn().mockResolvedValue(undefined);
  });

  describe('uploadListingImages', () => {
    const mockListing = {
      id: 'listing-123',
      sellerId: 'seller-123',
      title: 'Test Product',
      metadata: {}
    };

    const validImageUpload: ListingImageUpload = {
      file: Buffer.from('fake image data'),
      originalName: 'test-image.jpg',
      mimeType: 'image/jpeg',
      size: 1024 * 100 // 100KB
    };

    it('should upload images successfully', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      
      // Mock empty current images
      const mockEmptyGallery = {
        listingId: 'listing-123',
        images: [],
        primaryImageIndex: 0,
        totalImages: 0
      };
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockEmptyGallery);

      // Mock successful image upload
      mockImageStorageService.uploadImage = jest.fn().mockResolvedValue({
        success: true,
        ipfsHash: 'ipfs-hash-123',
        cdnUrl: 'https://cdn.example.com/image.jpg',
        thumbnails: {
          small: 'https://cdn.example.com/image-small.jpg',
          medium: 'https://cdn.example.com/image-medium.jpg',
          large: 'https://cdn.example.com/image-large.jpg'
        },
        metadata: {
          width: 800,
          height: 600,
          format: 'jpeg',
          size: 102400
        }
      });

      const results = await listingImageService.uploadListingImages('listing-123', [validImageUpload]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].ipfsHash).toBe('ipfs-hash-123');
      expect(results[0].cdnUrl).toBe('https://cdn.example.com/image.jpg');
      expect(mockImageStorageService.uploadImage).toHaveBeenCalledWith(
        validImageUpload.file,
        validImageUpload.originalName,
        validImageUpload.mimeType,
        'seller-123',
        'listing'
      );
    });

    it('should reject listing not found', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(null);

      await expect(
        listingImageService.uploadListingImages('non-existent', [validImageUpload])
      ).rejects.toThrow(ValidationError);
    });

    it('should reject too many images', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      
      // Mock gallery with 8 existing images
      const mockFullGallery = {
        listingId: 'listing-123',
        images: new Array(8).fill({}),
        primaryImageIndex: 0,
        totalImages: 8
      };
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockFullGallery);

      // Try to upload 3 more images (would exceed limit of 10)
      const images = [validImageUpload, validImageUpload, validImageUpload];

      await expect(
        listingImageService.uploadListingImages('listing-123', images)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate image file size', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      
      const mockEmptyGallery = {
        listingId: 'listing-123',
        images: [],
        primaryImageIndex: 0,
        totalImages: 0
      };
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockEmptyGallery);

      const oversizedImage: ListingImageUpload = {
        ...validImageUpload,
        size: 11 * 1024 * 1024 // 11MB - exceeds 10MB limit
      };

      const results = await listingImageService.uploadListingImages('listing-123', [oversizedImage]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Image file too large');
    });

    it('should validate image file type', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      
      const mockEmptyGallery = {
        listingId: 'listing-123',
        images: [],
        primaryImageIndex: 0,
        totalImages: 0
      };
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockEmptyGallery);

      const invalidTypeImage: ListingImageUpload = {
        ...validImageUpload,
        mimeType: 'application/pdf'
      };

      const results = await listingImageService.uploadListingImages('listing-123', [invalidTypeImage]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Invalid image type');
    });

    it('should handle mixed success and failure', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      
      const mockEmptyGallery = {
        listingId: 'listing-123',
        images: [],
        primaryImageIndex: 0,
        totalImages: 0
      };
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockEmptyGallery);

      // Mock first upload success, second failure
      mockImageStorageService.uploadImage = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          ipfsHash: 'ipfs-hash-123',
          cdnUrl: 'https://cdn.example.com/image.jpg'
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Upload failed'
        });

      const images = [validImageUpload, validImageUpload];
      const results = await listingImageService.uploadListingImages('listing-123', images);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Upload failed');
    });
  });

  describe('getListingImages', () => {
    it('should return cached gallery if available', async () => {
      const mockGallery = {
        listingId: 'listing-123',
        images: [],
        primaryImageIndex: 0,
        totalImages: 0
      };

      mockRedisService.get = jest.fn().mockResolvedValue(mockGallery);

      const result = await listingImageService.getListingImages('listing-123');

      expect(result).toEqual(mockGallery);
      expect(mockRedisService.get).toHaveBeenCalledWith('listing_images:listing-123');
      expect(mockDatabaseService.getDatabase).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not cached', async () => {
      mockRedisService.get = jest.fn().mockResolvedValue(null);
      mockListingService.getListingById = jest.fn().mockResolvedValue({
        id: 'listing-123',
        metadata: { primaryImageIndex: 0 }
      });

      // Mock database query
      const mockDb = mockDatabaseService.getDatabase();
      mockDb.where = jest.fn().mockResolvedValue([]);

      const result = await listingImageService.getListingImages('listing-123');

      expect(result.listingId).toBe('listing-123');
      expect(result.images).toEqual([]);
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'listing_images:listing-123',
        expect.any(Object),
        3600
      );
    });
  });

  describe('setPrimaryImage', () => {
    it('should set primary image successfully', async () => {
      const mockListing = { id: 'listing-123', metadata: {} };
      const mockGallery = {
        listingId: 'listing-123',
        images: [{ id: 'img1' }, { id: 'img2' }],
        primaryImageIndex: 0,
        totalImages: 2
      };

      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      await listingImageService.setPrimaryImage('listing-123', 1);

      expect(mockListingService.updateListing).toHaveBeenCalledWith('listing-123', {
        primaryImageIndex: 1
      });
    });

    it('should reject invalid image index', async () => {
      const mockListing = { id: 'listing-123', metadata: {} };
      const mockGallery = {
        listingId: 'listing-123',
        images: [{ id: 'img1' }],
        primaryImageIndex: 0,
        totalImages: 1
      };

      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      await expect(
        listingImageService.setPrimaryImage('listing-123', 5)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('reorderImages', () => {
    it('should reorder images successfully', async () => {
      const mockListing = { id: 'listing-123', metadata: {} };
      const mockGallery = {
        listingId: 'listing-123',
        images: [
          { id: 'img1', metadata: {} },
          { id: 'img2', metadata: {} }
        ],
        primaryImageIndex: 0,
        totalImages: 2
      };

      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      const imageOrders = [
        { imageId: 'img1', newOrder: 1 },
        { imageId: 'img2', newOrder: 0 }
      ];

      await listingImageService.reorderImages('listing-123', imageOrders);

      // Verify database updates were called
      const mockDb = mockDatabaseService.getDatabase();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should reject invalid image ID', async () => {
      const mockListing = { id: 'listing-123', metadata: {} };
      const mockGallery = {
        listingId: 'listing-123',
        images: [{ id: 'img1', metadata: {} }],
        primaryImageIndex: 0,
        totalImages: 1
      };

      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      const imageOrders = [{ imageId: 'non-existent', newOrder: 0 }];

      await expect(
        listingImageService.reorderImages('listing-123', imageOrders)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteListingImage', () => {
    it('should delete image successfully', async () => {
      const mockListing = { id: 'listing-123', metadata: { primaryImageIndex: 0 } };
      
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);

      // Mock database query for image record
      const mockDb = mockDatabaseService.getDatabase();
      mockDb.where = jest.fn().mockResolvedValue([{
        id: 'image-123',
        ipfsHash: 'ipfs-hash-123'
      }]);

      // Mock gallery after deletion
      const mockGallery = {
        listingId: 'listing-123',
        images: [],
        primaryImageIndex: 0,
        totalImages: 0
      };
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      mockImageStorageService.deleteImage = jest.fn().mockResolvedValue(undefined);

      await listingImageService.deleteListingImage('listing-123', 'image-123');

      expect(mockImageStorageService.deleteImage).toHaveBeenCalledWith('ipfs-hash-123');
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should reject non-existent image', async () => {
      const mockListing = { id: 'listing-123', metadata: {} };
      
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      // Mock database query returning no results
      const mockDb = mockDatabaseService.getDatabase();
      mockDb.where = jest.fn().mockResolvedValue([]);

      await expect(
        listingImageService.deleteListingImage('listing-123', 'non-existent')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('getImageDisplayUrls', () => {
    it('should return image URLs for all sizes', async () => {
      const mockImageRecord = {
        id: 'image-123',
        cdnUrl: 'https://cdn.example.com/image.jpg',
        thumbnails: JSON.stringify({
          small: 'https://cdn.example.com/image-small.jpg',
          medium: 'https://cdn.example.com/image-medium.jpg',
          large: 'https://cdn.example.com/image-large.jpg'
        })
      };

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.where = jest.fn().mockResolvedValue([mockImageRecord]);

      const result = await listingImageService.getImageDisplayUrls('image-123');

      expect(result).toEqual({
        original: 'https://cdn.example.com/image.jpg',
        large: 'https://cdn.example.com/image-large.jpg',
        medium: 'https://cdn.example.com/image-medium.jpg',
        small: 'https://cdn.example.com/image-small.jpg',
        thumbnail: 'https://cdn.example.com/image-small.jpg'
      });
    });

    it('should handle missing thumbnails', async () => {
      const mockImageRecord = {
        id: 'image-123',
        cdnUrl: 'https://cdn.example.com/image.jpg',
        thumbnails: null
      };

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.where = jest.fn().mockResolvedValue([mockImageRecord]);

      const result = await listingImageService.getImageDisplayUrls('image-123');

      expect(result.original).toBe('https://cdn.example.com/image.jpg');
      expect(result.large).toBe('https://cdn.example.com/image.jpg');
      expect(result.medium).toBe('https://cdn.example.com/image.jpg');
      expect(result.small).toBe('https://cdn.example.com/image.jpg');
    });
  });

  describe('generateImageGalleryData', () => {
    it('should generate gallery data with primary image', async () => {
      const mockGallery = {
        listingId: 'listing-123',
        images: [
          { id: 'img1', isPrimary: true },
          { id: 'img2', isPrimary: false }
        ],
        primaryImageIndex: 0,
        totalImages: 2
      };

      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      const result = await listingImageService.generateImageGalleryData('listing-123');

      expect(result.primaryImage).toEqual({ id: 'img1', isPrimary: true });
      expect(result.galleryImages).toHaveLength(2);
      expect(result.totalImages).toBe(2);
      expect(result.hasMultipleImages).toBe(true);
    });

    it('should handle empty gallery', async () => {
      const mockGallery = {
        listingId: 'listing-123',
        images: [],
        primaryImageIndex: 0,
        totalImages: 0
      };

      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      const result = await listingImageService.generateImageGalleryData('listing-123');

      expect(result.primaryImage).toBeNull();
      expect(result.galleryImages).toEqual([]);
      expect(result.totalImages).toBe(0);
      expect(result.hasMultipleImages).toBe(false);
    });
  });

  describe('getOptimizedImageUrls', () => {
    it('should return optimized URLs for different contexts', async () => {
      const mockGallery = {
        listingId: 'listing-123',
        images: [
          {
            id: 'img1',
            cdnUrl: 'https://cdn.example.com/image.jpg',
            thumbnails: {
              small: 'https://cdn.example.com/image-small.jpg',
              medium: 'https://cdn.example.com/image-medium.jpg',
              large: 'https://cdn.example.com/image-large.jpg'
            }
          }
        ],
        primaryImageIndex: 0,
        totalImages: 1
      };

      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      const thumbnailUrls = await listingImageService.getOptimizedImageUrls('listing-123', 'thumbnail');
      const cardUrls = await listingImageService.getOptimizedImageUrls('listing-123', 'card');
      const detailUrls = await listingImageService.getOptimizedImageUrls('listing-123', 'detail');

      expect(thumbnailUrls).toEqual(['https://cdn.example.com/image-small.jpg']);
      expect(cardUrls).toEqual(['https://cdn.example.com/image-medium.jpg']);
      expect(detailUrls).toEqual(['https://cdn.example.com/image-large.jpg']);
    });
  });

  describe('batchProcessListingImages', () => {
    it('should process multiple operations successfully', async () => {
      const mockListing = { id: 'listing-123', metadata: {} };
      const mockGallery = {
        listingId: 'listing-123',
        images: [{ id: 'img1', metadata: {} }],
        primaryImageIndex: 0,
        totalImages: 1
      };

      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      const operations = [
        {
          listingId: 'listing-123',
          action: 'setPrimary' as const,
          data: { imageIndex: 0 }
        }
      ];

      const results = await listingImageService.batchProcessListingImages(operations);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].listingId).toBe('listing-123');
    });

    it('should handle mixed success and failure in batch', async () => {
      const operations = [
        {
          listingId: 'listing-123',
          action: 'setPrimary' as const,
          data: { imageIndex: 0 }
        },
        {
          listingId: 'non-existent',
          action: 'setPrimary' as const,
          data: { imageIndex: 0 }
        }
      ];

      // Mock first operation success
      mockListingService.getListingById = jest.fn()
        .mockResolvedValueOnce({ id: 'listing-123', metadata: {} })
        .mockResolvedValueOnce(null); // Second listing not found

      const mockGallery = {
        listingId: 'listing-123',
        images: [{ id: 'img1' }],
        primaryImageIndex: 0,
        totalImages: 1
      };
      jest.spyOn(listingImageService, 'getListingImages').mockResolvedValue(mockGallery);

      const results = await listingImageService.batchProcessListingImages(operations);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Listing not found');
    });
  });
});
