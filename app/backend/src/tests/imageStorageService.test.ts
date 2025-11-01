import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import sharp from 'sharp';
import imageStorageService from '../services/imageStorageService';
import ipfsService from '../services/ipfsService';
import { db } from '../db/index';
import { imageStorage } from '../db/schema';

// Mock dependencies
jest.mock('../services/ipfsService');
jest.mock('../db/index');
jest.mock('sharp');

const mockIpfsService = ipfsService as jest.Mocked<typeof ipfsService>;
const mockDb = db as jest.Mocked<typeof db>;
const mockSharp = sharp as jest.MockedFunction<typeof sharp>;

describe('ImageStorageService', () => {
  const mockUserId = 'user-123';
  const mockImageId = 'image-456';
  const mockFilename = 'test-image.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateImage', () => {
    it('should validate a valid JPEG image', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockMetadata = {
        format: 'jpeg',
        width: 800,
        height: 600,
        hasAlpha: false
      };

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('compressed'))
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await imageStorageService.validateImage(mockBuffer, mockFilename);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).toEqual({
        width: 800,
        height: 600,
        format: 'jpeg',
        size: mockBuffer.length,
        hasAlpha: false
      });
    });

    it('should reject oversized images', async () => {
      const mockBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      const mockMetadata = {
        format: 'jpeg',
        width: 800,
        height: 600,
        hasAlpha: false
      };

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('compressed'))
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await imageStorageService.validateImage(mockBuffer, mockFilename);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size exceeds maximum limit of 10MB');
    });

    it('should reject unsupported file formats', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockMetadata = {
        format: 'bmp',
        width: 800,
        height: 600,
        hasAlpha: false
      };

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('compressed'))
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await imageStorageService.validateImage(mockBuffer, mockFilename);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported file type: bmp. Allowed types: image/jpeg, image/jpg, image/png, image/webp, image/gif, image/svg+xml');
    });

    it('should reject images with invalid dimensions', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      const mockMetadata = {
        format: 'jpeg',
        width: 30,
        height: 20,
        hasAlpha: false
      };

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('compressed'))
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await imageStorageService.validateImage(mockBuffer, mockFilename);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Image dimensions too small (minimum 50x50 pixels)');
    });
  });

  describe('optimizeImage', () => {
    it('should optimize JPEG image with default settings', async () => {
      const mockBuffer = Buffer.from('original-image');
      const optimizedBuffer = Buffer.from('optimized-image');

      const mockSharpInstance = {
        withMetadata: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(optimizedBuffer)
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await imageStorageService.optimizeImage(mockBuffer);

      expect(result).toBe(optimizedBuffer);
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 85,
        progressive: true,
        mozjpeg: true
      });
    });

    it('should optimize PNG image', async () => {
      const mockBuffer = Buffer.from('original-image');
      const optimizedBuffer = Buffer.from('optimized-image');

      const mockSharpInstance = {
        withMetadata: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(optimizedBuffer)
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await imageStorageService.optimizeImage(mockBuffer, {
        format: 'png',
        quality: 90
      });

      expect(result).toBe(optimizedBuffer);
      expect(mockSharpInstance.png).toHaveBeenCalledWith({
        quality: 90,
        progressive: true,
        compressionLevel: 9,
        adaptiveFiltering: true
      });
    });

    it('should handle optimization errors', async () => {
      const mockBuffer = Buffer.from('invalid-image');

      mockSharp.mockImplementation(() => {
        throw new Error('Invalid image format');
      });

      await expect(imageStorageService.optimizeImage(mockBuffer))
        .rejects.toThrow('Failed to optimize image');
    });
  });

  describe('generateThumbnails', () => {
    it('should generate thumbnails in multiple sizes', async () => {
      const mockBuffer = Buffer.from('original-image');
      const thumbnailBuffer = Buffer.from('thumbnail');

      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(thumbnailBuffer)
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const result = await imageStorageService.generateThumbnails(mockBuffer);

      expect(result).toHaveLength(4); // thumb, small, medium, large
      expect(result[0]).toEqual({
        name: 'thumb',
        buffer: thumbnailBuffer,
        width: 150,
        height: 150,
        size: thumbnailBuffer.length
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(150, 150, {
        fit: 'cover',
        position: 'center'
      });
    });

    it('should handle thumbnail generation errors', async () => {
      const mockBuffer = Buffer.from('invalid-image');

      mockSharp.mockImplementation(() => {
        throw new Error('Invalid image');
      });

      await expect(imageStorageService.generateThumbnails(mockBuffer))
        .rejects.toThrow('Failed to generate thumbnails');
    });
  });

  describe('uploadImage', () => {
    it('should upload image with full processing pipeline', async () => {
      const mockBuffer = Buffer.from('image-data');
      const optimizedBuffer = Buffer.from('optimized-image');
      const thumbnailBuffer = Buffer.from('thumbnail');

      // Mock validation
      const mockMetadata = {
        format: 'jpeg',
        width: 800,
        height: 600,
        hasAlpha: false
      };

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(optimizedBuffer),
        withMetadata: jest.fn().mockReturnThis(),
        resize: jest.fn().mockReturnThis()
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      // Mock IPFS upload
      mockIpfsService.uploadFile.mockResolvedValue({
        hash: 'QmTest123',
        url: 'https://ipfs.io/ipfs/QmTest123',
        size: optimizedBuffer.length
      });

      mockIpfsService.pinContent.mockResolvedValue(undefined);

      // Mock database insert
      const mockDbRecord = {
        id: mockImageId,
        ipfsHash: 'QmTest123',
        cdnUrl: 'https://ipfs.io/ipfs/QmTest123',
        originalFilename: mockFilename,
        contentType: 'image/jpeg',
        fileSize: optimizedBuffer.length,
        width: 800,
        height: 600,
        thumbnails: '{}',
        ownerId: mockUserId,
        usageType: 'profile',
        usageReferenceId: null,
        backupUrls: '[]',
        accessCount: 0,
        lastAccessed: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockDbRecord])
        })
      } as any);

      const options = {
        userId: mockUserId,
        usageType: 'profile' as const,
        generateThumbnails: true,
        optimizeForWeb: true
      };

      const result = await imageStorageService.uploadImage(mockBuffer, mockFilename, options);

      expect(result.id).toBe(mockImageId);
      expect(result.ipfsHash).toBe('QmTest123');
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(mockIpfsService.uploadFile).toHaveBeenCalled();
      expect(mockIpfsService.pinContent).toHaveBeenCalledWith('QmTest123');
    });

    it('should handle validation failures', async () => {
      const mockBuffer = Buffer.alloc(15 * 1024 * 1024); // Oversized

      const mockSharpInstance = {
        metadata: jest.fn().mockResolvedValue({
          format: 'jpeg',
          width: 800,
          height: 600,
          hasAlpha: false
        }),
        jpeg: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('compressed'))
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      const options = {
        userId: mockUserId,
        usageType: 'profile' as const
      };

      await expect(imageStorageService.uploadImage(mockBuffer, mockFilename, options))
        .rejects.toThrow('Image validation failed');
    });
  });

  describe('getImage', () => {
    it('should retrieve image and update access tracking', async () => {
      const mockRecord = {
        id: mockImageId,
        ipfsHash: 'QmTest123',
        cdnUrl: 'https://cdn.example.com/image.jpg',
        originalFilename: mockFilename,
        contentType: 'image/jpeg',
        fileSize: 1024,
        width: 800,
        height: 600,
        thumbnails: '{"thumb": "https://ipfs.io/ipfs/QmThumb"}',
        backupUrls: '["https://ipfs.io/ipfs/QmTest123"]',
        accessCount: 5,
        ownerId: mockUserId,
        usageType: 'profile',
        usageReferenceId: null,
        lastAccessed: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockRecord])
          })
        })
      } as any);

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined)
        })
      } as any);

      const result = await imageStorageService.getImage(mockImageId);

      expect(result).toEqual({
        id: mockImageId,
        ipfsHash: 'QmTest123',
        cdnUrl: 'https://cdn.example.com/image.jpg',
        originalFilename: mockFilename,
        contentType: 'image/jpeg',
        fileSize: 1024,
        width: 800,
        height: 600,
        thumbnails: { thumb: 'https://ipfs.io/ipfs/QmThumb' },
        backupUrls: ['https://ipfs.io/ipfs/QmTest123']
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should return null for non-existent image', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any);

      const result = await imageStorageService.getImage('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('deleteImage', () => {
    it('should delete image and cleanup resources', async () => {
      const mockRecord = {
        id: mockImageId,
        ipfsHash: 'QmTest123',
        cdnUrl: 'https://cdn.example.com/image.jpg',
        originalFilename: mockFilename,
        ownerId: mockUserId,
        usageType: 'profile',
        usageReferenceId: null,
        contentType: 'image/jpeg',
        fileSize: 1024,
        width: 800,
        height: 600,
        thumbnails: '{}',
        backupUrls: '[]',
        accessCount: 0,
        lastAccessed: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockRecord])
          })
        })
      } as any);

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined)
      } as any);

      mockIpfsService.unpinContent.mockResolvedValue(undefined);

      const result = await imageStorageService.deleteImage(mockImageId, mockUserId);

      expect(result).toBe(true);
      expect(mockIpfsService.unpinContent).toHaveBeenCalledWith('QmTest123');
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('should return false for non-existent or unauthorized image', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      } as any);

      const result = await imageStorageService.deleteImage(mockImageId, mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getImagesByUsage', () => {
    it('should retrieve images by usage type and reference', async () => {
      const mockRecords = [
        {
          id: 'image-1',
          ipfsHash: 'QmTest1',
          cdnUrl: 'https://cdn.example.com/image1.jpg',
          originalFilename: 'image1.jpg',
          contentType: 'image/jpeg',
          fileSize: 1024,
          width: 800,
          height: 600,
          thumbnails: '{}',
          backupUrls: '[]',
          ownerId: mockUserId,
          usageType: 'product',
          usageReferenceId: 'product-123',
          accessCount: 0,
          lastAccessed: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockRecords)
        })
      } as any);

      const result = await imageStorageService.getImagesByUsage('product', 'product-123', mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('image-1');
      expect(result[0].ipfsHash).toBe('QmTest1');
    });
  });

  describe('generateContentHash', () => {
    it('should generate consistent hash for same content', () => {
      const buffer1 = Buffer.from('test content');
      const buffer2 = Buffer.from('test content');
      const buffer3 = Buffer.from('different content');

      const hash1 = imageStorageService.generateContentHash(buffer1);
      const hash2 = imageStorageService.generateContentHash(buffer2);
      const hash3 = imageStorageService.generateContentHash(buffer3);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const mockRecords = [
        {
          id: 'image-1',
          fileSize: 1024,
          usageType: 'profile',
          ownerId: mockUserId,
          ipfsHash: 'QmTest1',
          cdnUrl: null,
          originalFilename: 'image1.jpg',
          contentType: 'image/jpeg',
          width: 800,
          height: 600,
          thumbnails: null,
          backupUrls: null,
          usageReferenceId: null,
          accessCount: 0,
          lastAccessed: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'image-2',
          fileSize: 2048,
          usageType: 'product',
          ownerId: mockUserId,
          ipfsHash: 'QmTest2',
          cdnUrl: null,
          originalFilename: 'image2.jpg',
          contentType: 'image/jpeg',
          width: 800,
          height: 600,
          thumbnails: null,
          backupUrls: null,
          usageReferenceId: null,
          accessCount: 0,
          lastAccessed: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockRecords)
        })
      } as any);

      const result = await imageStorageService.getStorageStats(mockUserId);

      expect(result).toEqual({
        totalImages: 2,
        totalSize: 3072,
        averageSize: 1536,
        byUsageType: {
          profile: 1,
          product: 1
        }
      });
    });

    it('should handle empty results', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      } as any);

      const result = await imageStorageService.getStorageStats(mockUserId);

      expect(result).toEqual({
        totalImages: 0,
        totalSize: 0,
        averageSize: 0,
        byUsageType: {}
      });
    });
  });
});
