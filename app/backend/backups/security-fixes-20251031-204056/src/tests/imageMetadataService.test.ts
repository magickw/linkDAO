import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import imageMetadataService from '../services/imageMetadataService';
import { db } from '../db/index';
import { imageStorage } from '../db/schema';

// Mock database
jest.mock('../db/index');
jest.mock('../db/schema');

const mockDb = db as jest.Mocked<typeof db>;

describe('ImageMetadataService', () => {
  const mockImageId = 'image-123';
  const mockUserId = 'user-456';
  const mockIpfsHash = 'QmTest123456789';

  const mockImageRecord = {
    id: mockImageId,
    ipfsHash: mockIpfsHash,
    cdnUrl: 'https://cdn.example.com/image.jpg',
    originalFilename: 'test-image.jpg',
    contentType: 'image/jpeg',
    fileSize: 1024000,
    width: 1920,
    height: 1080,
    thumbnails: '{"thumb": "https://cdn.example.com/thumb.jpg"}',
    ownerId: mockUserId,
    usageType: 'profile',
    usageReferenceId: 'profile-123',
    backupUrls: '["https://backup1.com", "https://backup2.com"]',
    accessCount: 150,
    lastAccessed: new Date('2023-12-01'),
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2023-12-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('storeImageMetadata', () => {
    it('should store image metadata successfully', async () => {
      const metadata = {
        ipfsHash: mockIpfsHash,
        cdnUrl: 'https://cdn.example.com/image.jpg',
        originalFilename: 'test-image.jpg',
        contentType: 'image/jpeg',
        fileSize: 1024000,
        width: 1920,
        height: 1080,
        thumbnails: { thumb: 'https://cdn.example.com/thumb.jpg' },
        ownerId: mockUserId,
        usageType: 'profile',
        usageReferenceId: 'profile-123',
        backupUrls: ['https://backup1.com', 'https://backup2.com'],
        accessCount: 0
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: mockImageId }])
        })
      } as any);

      const result = await imageMetadataService.storeImageMetadata(metadata);

      expect(result).toBe(mockImageId);
      expect(mockDb.insert).toHaveBeenCalledWith(imageStorage);
    });

    it('should handle storage errors', async () => {
      const metadata = {
        ipfsHash: mockIpfsHash,
        cdnUrl: 'https://cdn.example.com/image.jpg',
        originalFilename: 'test-image.jpg',
        contentType: 'image/jpeg',
        fileSize: 1024000,
        width: 1920,
        height: 1080,
        thumbnails: {},
        ownerId: mockUserId,
        usageType: 'profile',
        backupUrls: [],
        accessCount: 0
      };

      mockDb.insert.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(imageMetadataService.storeImageMetadata(metadata))
        .rejects.toThrow('Failed to store image metadata');
    });
  });

  describe('getImageMetadata', () => {
    it('should retrieve image metadata successfully', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockImageRecord])
          })
        })
      } as any);

      const result = await imageMetadataService.getImageMetadata(mockImageId);

      expect(result).toEqual({
        id: mockImageId,
        ipfsHash: mockIpfsHash,
        cdnUrl: 'https://cdn.example.com/image.jpg',
        originalFilename: 'test-image.jpg',
        contentType: 'image/jpeg',
        fileSize: 1024000,
        width: 1920,
        height: 1080,
        aspectRatio: 1920 / 1080,
        thumbnails: { thumb: 'https://cdn.example.com/thumb.jpg' },
        ownerId: mockUserId,
        usageType: 'profile',
        usageReferenceId: 'profile-123',
        backupUrls: ['https://backup1.com', 'https://backup2.com'],
        accessCount: 150,
        lastAccessed: new Date('2023-12-01'),
        createdAt: new Date('2023-11-01'),
        updatedAt: new Date('2023-12-01')
      });
    });

    it('should return null for non-existent image', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any);

      const result = await imageMetadataService.getImageMetadata('non-existent');

      expect(result).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await imageMetadataService.getImageMetadata(mockImageId);

      expect(result).toBeNull();
    });
  });

  describe('updateImageMetadata', () => {
    it('should update image metadata successfully', async () => {
      const updates = {
        cdnUrl: 'https://new-cdn.example.com/image.jpg',
        accessCount: 200,
        lastAccessed: new Date()
      };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      } as any);

      const result = await imageMetadataService.updateImageMetadata(mockImageId, updates);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(imageStorage);
    });

    it('should handle update errors', async () => {
      mockDb.update.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const result = await imageMetadataService.updateImageMetadata(mockImageId, {
        accessCount: 200
      });

      expect(result).toBe(false);
    });
  });

  describe('trackImageAccess', () => {
    it('should track image access successfully', async () => {
      const accessInfo = {
        userId: mockUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        referer: 'https://example.com',
        accessType: 'view' as const,
        responseTime: 150,
        cacheHit: true
      };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      } as any);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      } as any);

      await expect(imageMetadataService.trackImageAccess(mockImageId, accessInfo))
        .resolves.not.toThrow();

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', async () => {
      const accessInfo = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        accessType: 'view' as const,
        responseTime: 150,
        cacheHit: true
      };

      mockDb.update.mockImplementation(() => {
        throw new Error('Tracking failed');
      });

      // Should not throw, just log error
      await expect(imageMetadataService.trackImageAccess(mockImageId, accessInfo))
        .resolves.not.toThrow();
    });
  });

  describe('getImageAnalytics', () => {
    it('should return analytics for existing image', async () => {
      // Mock getImageMetadata call
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockImageRecord])
          })
        })
      } as any);

      const result = await imageMetadataService.getImageAnalytics(mockImageId);

      expect(result).toEqual({
        totalViews: 150,
        uniqueViewers: expect.any(Number),
        downloadCount: expect.any(Number),
        averageResponseTime: 150,
        cacheHitRate: 0.85,
        topReferrers: expect.any(Array),
        viewsByDate: expect.any(Array),
        deviceTypes: expect.any(Object),
        geographicDistribution: expect.any(Object)
      });

      expect(result.topReferrers).toHaveLength(3);
      expect(result.viewsByDate.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent image', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any);

      await expect(imageMetadataService.getImageAnalytics('non-existent'))
        .rejects.toThrow('Image not found');
    });
  });

  describe('getImagesByUsageType', () => {
    it('should return images by usage type', async () => {
      const mockRecords = [mockImageRecord];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              offset: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue(mockRecords)
              })
            })
          })
        })
      } as any);

      const result = await imageMetadataService.getImagesByUsageType('profile', mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockImageId);
      expect(result[0].usageType).toBe('profile');
    });

    it('should handle query errors', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Query failed');
      });

      const result = await imageMetadataService.getImagesByUsageType('profile');

      expect(result).toEqual([]);
    });
  });

  describe('checkBackupStatus', () => {
    it('should return backup status for existing image', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockImageRecord])
          })
        })
      } as any);

      const result = await imageMetadataService.checkBackupStatus(mockImageId);

      expect(result).toEqual({
        imageId: mockImageId,
        ipfsHash: mockIpfsHash,
        primaryBackup: {
          url: 'https://backup1.com',
          status: 'active',
          lastChecked: expect.any(Date)
        },
        secondaryBackups: [{
          url: 'https://backup2.com',
          status: 'active',
          lastChecked: expect.any(Date)
        }],
        redundancyLevel: 2,
        lastBackupCheck: expect.any(Date)
      });
    });

    it('should return null for non-existent image', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any);

      const result = await imageMetadataService.checkBackupStatus('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getStorageUsageStats', () => {
    it('should return comprehensive storage statistics', async () => {
      const mockRecords = [
        mockImageRecord,
        {
          ...mockImageRecord,
          id: 'image-2',
          usageType: 'product',
          contentType: 'image/png',
          fileSize: 512000,
          accessCount: 75
        }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue(mockRecords)
      } as any);

      const result = await imageMetadataService.getStorageUsageStats(mockUserId);

      expect(result).toEqual({
        totalImages: 2,
        totalSize: 1536000, // 1024000 + 512000
        averageSize: 768000,
        byUsageType: {
          profile: { count: 1, size: 1024000 },
          product: { count: 1, size: 512000 }
        },
        byContentType: {
          'image/jpeg': { count: 1, size: 1024000 },
          'image/png': { count: 1, size: 512000 }
        },
        recentUploads: expect.any(Number),
        mostAccessedImages: expect.any(Array)
      });

      expect(result.mostAccessedImages).toHaveLength(2);
      expect(result.mostAccessedImages[0].accessCount).toBeGreaterThanOrEqual(
        result.mostAccessedImages[1].accessCount
      );
    });

    it('should handle empty results', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue([])
      } as any);

      const result = await imageMetadataService.getStorageUsageStats();

      expect(result).toEqual({
        totalImages: 0,
        totalSize: 0,
        averageSize: 0,
        byUsageType: {},
        byContentType: {},
        recentUploads: 0,
        mostAccessedImages: []
      });
    });
  });

  describe('findDuplicateImages', () => {
    it('should find potential duplicate images by file size', async () => {
      const mockRecords = [
        mockImageRecord,
        {
          ...mockImageRecord,
          id: 'image-2',
          originalFilename: 'duplicate-image.jpg'
        }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue(mockRecords)
      } as any);

      const result = await imageMetadataService.findDuplicateImages('content-hash', mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].fileSize).toBe(result[1].fileSize);
    });

    it('should return empty array when no duplicates found', async () => {
      const mockRecords = [
        mockImageRecord,
        {
          ...mockImageRecord,
          id: 'image-2',
          fileSize: 2048000 // Different size
        }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue(mockRecords)
      } as any);

      const result = await imageMetadataService.findDuplicateImages('content-hash');

      expect(result).toEqual([]);
    });
  });

  describe('cleanupOrphanedImages', () => {
    it('should identify orphaned images in dry run mode', async () => {
      const orphanedRecord = {
        ...mockImageRecord,
        usageReferenceId: null // No reference = orphaned
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue([orphanedRecord])
      } as any);

      const result = await imageMetadataService.cleanupOrphanedImages(true);

      expect(result).toEqual({
        orphanedCount: 1,
        orphanedImages: [{
          id: mockImageId,
          filename: 'test-image.jpg',
          size: 1024000
        }],
        deletedCount: 0,
        freedSpace: 0
      });
    });

    it('should delete orphaned images when not in dry run mode', async () => {
      const orphanedRecord = {
        ...mockImageRecord,
        usageReferenceId: ''
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockResolvedValue([orphanedRecord])
      } as any);

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined)
      } as any);

      const result = await imageMetadataService.cleanupOrphanedImages(false);

      expect(result.orphanedCount).toBe(1);
      expect(result.deletedCount).toBe(1);
      expect(result.freedSpace).toBe(1024000);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should generate consistent content hash', () => {
      const buffer1 = Buffer.from('test content');
      const buffer2 = Buffer.from('test content');
      const buffer3 = Buffer.from('different content');

      const hash1 = imageMetadataService.generateContentHash(buffer1);
      const hash2 = imageMetadataService.generateContentHash(buffer2);
      const hash3 = imageMetadataService.generateContentHash(buffer3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });

    it('should extract EXIF data placeholder', async () => {
      const buffer = Buffer.from('fake image data');

      const result = await imageMetadataService.extractExifData(buffer);

      expect(result).toEqual({
        camera: 'Unknown',
        lens: 'Unknown',
        iso: null,
        aperture: null,
        shutterSpeed: null,
        focalLength: null,
        dateTime: null,
        gps: null
      });
    });
  });
});