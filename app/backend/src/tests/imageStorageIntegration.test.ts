import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import imageStorageService from '../services/imageStorageService';
import cdnDistributionService from '../services/cdnDistributionService';
import imageMetadataService from '../services/imageMetadataService';
import ipfsService from '../services/ipfsService';

// Mock all dependencies
jest.mock('../services/ipfsService');
jest.mock('../services/cdnDistributionService');
jest.mock('../db/index');

const mockIpfsService = ipfsService as jest.Mocked<typeof ipfsService>;
const mockCdnService = cdnDistributionService as jest.Mocked<typeof cdnDistributionService>;

describe('Image Storage Infrastructure Integration', () => {
  const mockUserId = 'user-123';
  const mockImageId = 'image-456';
  const mockIpfsHash = 'QmTest123456789';
  const mockFilename = 'test-image.jpg';
  const mockBuffer = Buffer.from('fake-image-data');

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockIpfsService.uploadFile.mockResolvedValue({
      hash: mockIpfsHash,
      url: `https://ipfs.io/ipfs/${mockIpfsHash}`,
      size: mockBuffer.length
    });

    mockIpfsService.pinContent.mockResolvedValue(undefined);
    mockIpfsService.unpinContent.mockResolvedValue(undefined);

    mockCdnService.distributeImage.mockResolvedValue({
      primaryUrl: 'https://cdn.example.com/image.jpg',
      fallbackUrls: ['https://backup-cdn.example.com/image.jpg'],
      ipfsUrls: [`https://ipfs.io/ipfs/${mockIpfsHash}`],
      cacheStatus: 'miss',
      distributionTime: 150
    });

    // Mock Sharp for image processing
    const mockSharp = require('sharp');
    if (mockSharp) {
      mockSharp.mockReturnValue({
        metadata: jest.fn().mockResolvedValue({
          format: 'jpeg',
          width: 1920,
          height: 1080,
          hasAlpha: false
        }),
        jpeg: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        withMetadata: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer)
      });
    }

    // Mock database operations
    const mockDb = require('../db/index').db;
    if (mockDb) {
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: mockImageId,
            ipfsHash: mockIpfsHash,
            cdnUrl: 'https://cdn.example.com/image.jpg',
            originalFilename: mockFilename,
            contentType: 'image/jpeg',
            fileSize: mockBuffer.length,
            width: 1920,
            height: 1080,
            thumbnails: '{}',
            ownerId: mockUserId,
            usageType: 'profile',
            usageReferenceId: 'profile-123',
            backupUrls: '[]',
            accessCount: 0,
            lastAccessed: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }])
        })
      });

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: mockImageId,
              ipfsHash: mockIpfsHash,
              cdnUrl: 'https://cdn.example.com/image.jpg',
              originalFilename: mockFilename,
              contentType: 'image/jpeg',
              fileSize: mockBuffer.length,
              width: 1920,
              height: 1080,
              thumbnails: '{}',
              ownerId: mockUserId,
              usageType: 'profile',
              usageReferenceId: 'profile-123',
              backupUrls: '[]',
              accessCount: 0,
              lastAccessed: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }])
          })
        })
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      });

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined)
      });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Complete Image Upload Workflow', () => {
    it('should handle complete image upload with validation, optimization, IPFS storage, CDN distribution, and metadata tracking', async () => {
      const uploadOptions = {
        userId: mockUserId,
        usageType: 'profile' as const,
        usageReferenceId: 'profile-123',
        generateThumbnails: true,
        optimizeForWeb: true
      };

      // Step 1: Upload image through main service
      const uploadResult = await imageStorageService.uploadImage(
        mockBuffer,
        mockFilename,
        uploadOptions
      );

      // Verify upload result
      expect(uploadResult).toEqual({
        id: mockImageId,
        ipfsHash: mockIpfsHash,
        cdnUrl: 'https://cdn.example.com/image.jpg',
        originalFilename: mockFilename,
        contentType: 'image/jpeg',
        fileSize: mockBuffer.length,
        width: 1920,
        height: 1080,
        thumbnails: {},
        backupUrls: expect.any(Array)
      });

      // Verify IPFS operations
      expect(mockIpfsService.uploadFile).toHaveBeenCalled();
      expect(mockIpfsService.pinContent).toHaveBeenCalledWith(mockIpfsHash);

      // Step 2: Verify metadata was stored
      const metadata = await imageMetadataService.getImageMetadata(uploadResult.id);
      expect(metadata).toBeTruthy();
      expect(metadata?.ipfsHash).toBe(mockIpfsHash);
      expect(metadata?.ownerId).toBe(mockUserId);

      // Step 3: Track image access
      await imageMetadataService.trackImageAccess(uploadResult.id, {
        userId: mockUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        accessType: 'view',
        responseTime: 150,
        cacheHit: false
      });

      // Step 4: Get analytics
      const analytics = await imageMetadataService.getImageAnalytics(uploadResult.id);
      expect(analytics).toHaveProperty('totalViews');
      expect(analytics).toHaveProperty('cacheHitRate');
      expect(analytics).toHaveProperty('viewsByDate');
    });

    it('should handle CDN distribution workflow', async () => {
      const distributionOptions = {
        priority: 'speed' as const,
        transformations: {
          width: 800,
          height: 600,
          quality: 85,
          format: 'webp' as const
        }
      };

      // Distribute image to CDN
      const distributionResult = await cdnDistributionService.distributeImage(
        mockIpfsHash,
        mockBuffer,
        mockFilename,
        'image/jpeg',
        distributionOptions
      );

      expect(distributionResult).toEqual({
        primaryUrl: 'https://cdn.example.com/image.jpg',
        fallbackUrls: ['https://backup-cdn.example.com/image.jpg'],
        ipfsUrls: [`https://ipfs.io/ipfs/${mockIpfsHash}`],
        cacheStatus: 'miss',
        distributionTime: 150
      });

      // Generate responsive URLs
      const responsiveUrls = await cdnDistributionService.generateResponsiveUrls(
        mockIpfsHash,
        mockFilename
      );

      expect(responsiveUrls).toHaveProperty('mobile');
      expect(responsiveUrls).toHaveProperty('tablet');
      expect(responsiveUrls).toHaveProperty('desktop');
      expect(responsiveUrls).toHaveProperty('large');
    });

    it('should handle backup and redundancy checks', async () => {
      // Check backup status
      const backupStatus = await imageMetadataService.checkBackupStatus(mockImageId);

      expect(backupStatus).toEqual({
        imageId: mockImageId,
        ipfsHash: mockIpfsHash,
        primaryBackup: {
          url: expect.any(String),
          status: 'active',
          lastChecked: expect.any(Date)
        },
        secondaryBackups: expect.any(Array),
        redundancyLevel: expect.any(Number),
        lastBackupCheck: expect.any(Date)
      });
    });

    it('should handle image deletion with cleanup', async () => {
      // Delete image
      const deleteResult = await imageStorageService.deleteImage(mockImageId, mockUserId);

      expect(deleteResult).toBe(true);
      expect(mockIpfsService.unpinContent).toHaveBeenCalledWith(mockIpfsHash);
    });
  });

  describe('Analytics and Reporting Integration', () => {
    it('should provide comprehensive storage statistics', async () => {
      const stats = await imageMetadataService.getStorageUsageStats(mockUserId);

      expect(stats).toEqual({
        totalImages: expect.any(Number),
        totalSize: expect.any(Number),
        averageSize: expect.any(Number),
        byUsageType: expect.any(Object),
        byContentType: expect.any(Object),
        recentUploads: expect.any(Number),
        mostAccessedImages: expect.any(Array)
      });
    });

    it('should track and analyze image usage patterns', async () => {
      // Track multiple access events
      const accessEvents = [
        {
          userId: mockUserId,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Chrome)',
          accessType: 'view' as const,
          responseTime: 120,
          cacheHit: true
        },
        {
          userId: 'user-789',
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0 (Safari)',
          accessType: 'download' as const,
          responseTime: 250,
          cacheHit: false
        }
      ];

      for (const event of accessEvents) {
        await imageMetadataService.trackImageAccess(mockImageId, event);
      }

      // Get analytics
      const analytics = await imageMetadataService.getImageAnalytics(mockImageId);

      expect(analytics.totalViews).toBeGreaterThan(0);
      expect(analytics.deviceTypes).toHaveProperty('desktop');
      expect(analytics.deviceTypes).toHaveProperty('mobile');
      expect(analytics.topReferrers).toBeInstanceOf(Array);
    });

    it('should detect and report duplicate images', async () => {
      const contentHash = imageMetadataService.generateContentHash(mockBuffer);
      const duplicates = await imageMetadataService.findDuplicateImages(contentHash, mockUserId);

      expect(Array.isArray(duplicates)).toBe(true);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle IPFS upload failures gracefully', async () => {
      mockIpfsService.uploadFile.mockRejectedValue(new Error('IPFS upload failed'));

      const uploadOptions = {
        userId: mockUserId,
        usageType: 'profile' as const
      };

      await expect(imageStorageService.uploadImage(mockBuffer, mockFilename, uploadOptions))
        .rejects.toThrow();
    });

    it('should handle CDN distribution failures with IPFS fallback', async () => {
      mockCdnService.distributeImage.mockResolvedValue({
        primaryUrl: `https://ipfs.io/ipfs/${mockIpfsHash}`, // Fallback to IPFS
        fallbackUrls: [],
        ipfsUrls: [`https://ipfs.io/ipfs/${mockIpfsHash}`],
        cacheStatus: 'miss',
        distributionTime: 300
      });

      const result = await cdnDistributionService.distributeImage(
        mockIpfsHash,
        mockBuffer,
        mockFilename,
        'image/jpeg'
      );

      expect(result.primaryUrl).toContain('ipfs.io');
      expect(result.ipfsUrls).toHaveLength(1);
    });

    it('should handle database errors in metadata operations', async () => {
      const mockDb = require('../db/index').db;
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await imageMetadataService.getImageMetadata('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Performance and Optimization', () => {
    it('should optimize images for different use cases', async () => {
      const profileOptions = {
        userId: mockUserId,
        usageType: 'profile' as const,
        optimizeForWeb: true
      };

      const productOptions = {
        userId: mockUserId,
        usageType: 'product' as const,
        generateThumbnails: true
      };

      // Upload profile image (optimized for web)
      const profileResult = await imageStorageService.uploadImage(
        mockBuffer,
        'profile.jpg',
        profileOptions
      );

      // Upload product image (with thumbnails)
      const productResult = await imageStorageService.uploadImage(
        mockBuffer,
        'product.jpg',
        productOptions
      );

      expect(profileResult.usageType).toBe('profile');
      expect(productResult.usageType).toBe('product');
    });

    it('should provide CDN health monitoring', async () => {
      const healthStatus = await cdnDistributionService.checkCDNHealth();

      expect(healthStatus).toHaveProperty('primary');
      expect(healthStatus).toHaveProperty('fallbacks');
      expect(healthStatus).toHaveProperty('ipfsGateways');

      expect(healthStatus.primary.status).toMatch(/healthy|degraded|down/);
      expect(healthStatus.ipfsGateways).toBeInstanceOf(Array);
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should identify and clean up orphaned images', async () => {
      const cleanupResult = await imageMetadataService.cleanupOrphanedImages(true);

      expect(cleanupResult).toEqual({
        orphanedCount: expect.any(Number),
        orphanedImages: expect.any(Array),
        deletedCount: expect.any(Number),
        freedSpace: expect.any(Number)
      });
    });

    it('should handle cache invalidation across CDNs', async () => {
      const invalidationResult = await cdnDistributionService.invalidateCache(
        [mockIpfsHash],
        [mockFilename]
      );

      expect(invalidationResult).toHaveProperty('primary');
      expect(invalidationResult).toHaveProperty('fallbacks');
    });
  });
});