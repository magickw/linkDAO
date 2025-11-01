import { ImageStorageService } from '../../services/imageStorageService';
import { jest } from '@jest/globals';
import { Buffer } from 'buffer';

// Mock dependencies
jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn(),
    metadata: jest.fn(),
  })),
}));

jest.mock('ipfs-http-client', () => ({
  create: jest.fn().mockReturnValue({
    add: jest.fn(),
    pin: {
      add: jest.fn(),
    },
  }),
}));

jest.mock('aws-sdk', () => ({
  S3: jest.fn().mockImplementation(() => ({
    upload: jest.fn().mockReturnValue({
      promise: jest.fn(),
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: jest.fn(),
    }),
  })),
}));

describe('Image Processing Unit Tests', () => {
  let imageStorageService: ImageStorageService;
  let mockSharp: any;
  let mockIPFS: any;
  let mockS3: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    const sharp = require('sharp');
    mockSharp = {
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      toBuffer: jest.fn(),
      metadata: jest.fn(),
    };
    sharp.default.mockReturnValue(mockSharp);

    const ipfsClient = require('ipfs-http-client');
    mockIPFS = {
      add: jest.fn(),
      pin: { add: jest.fn() },
    };
    ipfsClient.create.mockReturnValue(mockIPFS);

    const AWS = require('aws-sdk');
    mockS3 = {
      upload: jest.fn().mockReturnValue({
        promise: jest.fn(),
      }),
      deleteObject: jest.fn().mockReturnValue({
        promise: jest.fn(),
      }),
    };
    AWS.S3.mockImplementation(() => mockS3);

    imageStorageService = new ImageStorageService();
  });

  describe('uploadImage', () => {
    const mockFile = {
      buffer: Buffer.from('test image data'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
    } as Express.Multer.File;

    it('should successfully upload and process image', async () => {
      // Mock successful processing
      mockSharp.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'jpeg',
      });
      mockSharp.toBuffer.mockResolvedValue(Buffer.from('optimized image'));
      
      mockIPFS.add.mockResolvedValue([{
        path: 'QmTestHash123',
        hash: 'QmTestHash123',
      }]);
      
      mockS3.upload().promise.mockResolvedValue({
        Location: 'https://cdn.example.com/QmTestHash123',
      });

      const result = await imageStorageService.uploadImage(mockFile, 'listing');

      expect(result).toEqual({
        ipfsHash: 'QmTestHash123',
        cdnUrl: 'https://cdn.example.com/QmTestHash123',
        thumbnails: expect.objectContaining({
          small: expect.any(String),
          medium: expect.any(String),
          large: expect.any(String),
        }),
        metadata: {
          width: 800,
          height: 600,
          format: 'jpeg',
          size: expect.any(Number),
        },
      });
    });

    it('should reject files that are too large', async () => {
      const largeFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // 10MB
      } as Express.Multer.File;

      await expect(imageStorageService.uploadImage(largeFile, 'listing'))
        .rejects.toThrow('File size exceeds maximum limit');
    });

    it('should reject invalid file types', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'text/plain',
      } as Express.Multer.File;

      await expect(imageStorageService.uploadImage(invalidFile, 'listing'))
        .rejects.toThrow('Invalid file type');
    });

    it('should handle image optimization errors', async () => {
      mockSharp.metadata.mockRejectedValue(new Error('Invalid image'));

      await expect(imageStorageService.uploadImage(mockFile, 'listing'))
        .rejects.toThrow('Image processing failed');
    });

    it('should handle IPFS upload failures', async () => {
      mockSharp.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'jpeg',
      });
      mockSharp.toBuffer.mockResolvedValue(Buffer.from('optimized image'));
      mockIPFS.add.mockRejectedValue(new Error('IPFS upload failed'));

      await expect(imageStorageService.uploadImage(mockFile, 'listing'))
        .rejects.toThrow('IPFS upload failed');
    });

    it('should handle CDN distribution failures', async () => {
      mockSharp.metadata.mockResolvedValue({
        width: 800,
        height: 600,
        format: 'jpeg',
      });
      mockSharp.toBuffer.mockResolvedValue(Buffer.from('optimized image'));
      mockIPFS.add.mockResolvedValue([{
        path: 'QmTestHash123',
        hash: 'QmTestHash123',
      }]);
      mockS3.upload().promise.mockRejectedValue(new Error('CDN upload failed'));

      await expect(imageStorageService.uploadImage(mockFile, 'listing'))
        .rejects.toThrow('CDN distribution failed');
    });
  });

  describe('optimizeImage', () => {
    const testBuffer = Buffer.from('test image data');

    it('should optimize JPEG images', async () => {
      const optimizedBuffer = Buffer.from('optimized jpeg');
      mockSharp.toBuffer.mockResolvedValue(optimizedBuffer);

      const result = await imageStorageService.optimizeImage(testBuffer, {
        format: 'jpeg',
        quality: 80,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      expect(result).toBe(optimizedBuffer);
      expect(mockSharp.resize).toHaveBeenCalledWith(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      });
      expect(mockSharp.jpeg).toHaveBeenCalledWith({ quality: 80 });
    });

    it('should optimize PNG images', async () => {
      const optimizedBuffer = Buffer.from('optimized png');
      mockSharp.toBuffer.mockResolvedValue(optimizedBuffer);

      const result = await imageStorageService.optimizeImage(testBuffer, {
        format: 'png',
        quality: 90,
        maxWidth: 800,
        maxHeight: 600,
      });

      expect(result).toBe(optimizedBuffer);
      expect(mockSharp.png).toHaveBeenCalledWith({ quality: 90 });
    });

    it('should convert to WebP format', async () => {
      const optimizedBuffer = Buffer.from('optimized webp');
      mockSharp.toBuffer.mockResolvedValue(optimizedBuffer);

      const result = await imageStorageService.optimizeImage(testBuffer, {
        format: 'webp',
        quality: 85,
        maxWidth: 1000,
        maxHeight: 1000,
      });

      expect(result).toBe(optimizedBuffer);
      expect(mockSharp.webp).toHaveBeenCalledWith({ quality: 85 });
    });

    it('should handle optimization errors', async () => {
      mockSharp.toBuffer.mockRejectedValue(new Error('Optimization failed'));

      await expect(imageStorageService.optimizeImage(testBuffer, {
        format: 'jpeg',
        quality: 80,
      })).rejects.toThrow('Image optimization failed');
    });
  });

  describe('generateThumbnails', () => {
    const testBuffer = Buffer.from('test image data');

    it('should generate multiple thumbnail sizes', async () => {
      const smallThumb = Buffer.from('small thumbnail');
      const mediumThumb = Buffer.from('medium thumbnail');
      const largeThumb = Buffer.from('large thumbnail');

      mockSharp.toBuffer
        .mockResolvedValueOnce(smallThumb)
        .mockResolvedValueOnce(mediumThumb)
        .mockResolvedValueOnce(largeThumb);

      mockIPFS.add
        .mockResolvedValueOnce([{ hash: 'QmSmallHash' }])
        .mockResolvedValueOnce([{ hash: 'QmMediumHash' }])
        .mockResolvedValueOnce([{ hash: 'QmLargeHash' }]);

      mockS3.upload().promise
        .mockResolvedValueOnce({ Location: 'https://cdn.example.com/small' })
        .mockResolvedValueOnce({ Location: 'https://cdn.example.com/medium' })
        .mockResolvedValueOnce({ Location: 'https://cdn.example.com/large' });

      const result = await imageStorageService.generateThumbnails(testBuffer);

      expect(result).toEqual({
        small: 'https://cdn.example.com/small',
        medium: 'https://cdn.example.com/medium',
        large: 'https://cdn.example.com/large',
      });

      expect(mockSharp.resize).toHaveBeenCalledWith(150, 150, expect.any(Object));
      expect(mockSharp.resize).toHaveBeenCalledWith(300, 300, expect.any(Object));
      expect(mockSharp.resize).toHaveBeenCalledWith(600, 600, expect.any(Object));
    });

    it('should handle thumbnail generation errors', async () => {
      mockSharp.toBuffer.mockRejectedValue(new Error('Thumbnail generation failed'));

      await expect(imageStorageService.generateThumbnails(testBuffer))
        .rejects.toThrow('Thumbnail generation failed');
    });
  });

  describe('storeToIPFS', () => {
    const testBuffer = Buffer.from('test data');
    const metadata = {
      filename: 'test.jpg',
      contentType: 'image/jpeg',
      size: 1024,
    };

    it('should store file to IPFS and pin it', async () => {
      mockIPFS.add.mockResolvedValue([{
        path: 'QmTestHash123',
        hash: 'QmTestHash123',
      }]);
      mockIPFS.pin.add.mockResolvedValue({ hash: 'QmTestHash123' });

      const result = await imageStorageService.storeToIPFS(testBuffer, metadata);

      expect(result).toBe('QmTestHash123');
      expect(mockIPFS.add).toHaveBeenCalledWith(testBuffer, {
        pin: false,
        wrapWithDirectory: false,
      });
      expect(mockIPFS.pin.add).toHaveBeenCalledWith('QmTestHash123');
    });

    it('should handle IPFS storage errors', async () => {
      mockIPFS.add.mockRejectedValue(new Error('IPFS storage failed'));

      await expect(imageStorageService.storeToIPFS(testBuffer, metadata))
        .rejects.toThrow('IPFS storage failed');
    });

    it('should handle pinning errors', async () => {
      mockIPFS.add.mockResolvedValue([{
        path: 'QmTestHash123',
        hash: 'QmTestHash123',
      }]);
      mockIPFS.pin.add.mockRejectedValue(new Error('Pinning failed'));

      await expect(imageStorageService.storeToIPFS(testBuffer, metadata))
        .rejects.toThrow('IPFS pinning failed');
    });
  });

  describe('distributeToCDN', () => {
    it('should distribute file to CDN', async () => {
      const ipfsHash = 'QmTestHash123';
      const cdnUrl = 'https://cdn.example.com/QmTestHash123';
      
      mockS3.upload().promise.mockResolvedValue({
        Location: cdnUrl,
      });

      const result = await imageStorageService.distributeToCDN(ipfsHash);

      expect(result).toBe(cdnUrl);
      expect(mockS3.upload).toHaveBeenCalledWith({
        Bucket: expect.any(String),
        Key: ipfsHash,
        Body: expect.any(Buffer),
        ContentType: 'application/octet-stream',
        CacheControl: 'public, max-age=31536000',
      });
    });

    it('should handle CDN distribution errors', async () => {
      const ipfsHash = 'QmTestHash123';
      mockS3.upload().promise.mockRejectedValue(new Error('CDN upload failed'));

      await expect(imageStorageService.distributeToCDN(ipfsHash))
        .rejects.toThrow('CDN distribution failed');
    });
  });

  describe('deleteImage', () => {
    it('should delete image from IPFS and CDN', async () => {
      const ipfsHash = 'QmTestHash123';
      mockS3.deleteObject().promise.mockResolvedValue({});

      await imageStorageService.deleteImage(ipfsHash);

      expect(mockS3.deleteObject).toHaveBeenCalledWith({
        Bucket: expect.any(String),
        Key: ipfsHash,
      });
    });

    it('should handle deletion errors gracefully', async () => {
      const ipfsHash = 'QmTestHash123';
      mockS3.deleteObject().promise.mockRejectedValue(new Error('Deletion failed'));

      // Should not throw, but log the error
      await expect(imageStorageService.deleteImage(ipfsHash))
        .resolves.not.toThrow();
    });
  });

  describe('File Validation', () => {
    it('should validate file size limits', () => {
      const validFile = {
        size: 2 * 1024 * 1024, // 2MB
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const isValid = imageStorageService.validateFile(validFile);
      expect(isValid).toBe(true);
    });

    it('should reject oversized files', () => {
      const oversizedFile = {
        size: 10 * 1024 * 1024, // 10MB
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const isValid = imageStorageService.validateFile(oversizedFile);
      expect(isValid).toBe(false);
    });

    it('should validate allowed file types', () => {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      
      validTypes.forEach(mimetype => {
        const file = {
          size: 1024,
          mimetype,
        } as Express.Multer.File;

        const isValid = imageStorageService.validateFile(file);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid file types', () => {
      const invalidTypes = ['text/plain', 'application/pdf', 'video/mp4'];
      
      invalidTypes.forEach(mimetype => {
        const file = {
          size: 1024,
          mimetype,
        } as Express.Multer.File;

        const isValid = imageStorageService.validateFile(file);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed operations', async () => {
      const testBuffer = Buffer.from('test data');
      
      // First call fails, second succeeds
      mockIPFS.add
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([{ hash: 'QmTestHash123' }]);

      const result = await imageStorageService.storeToIPFSWithRetry(testBuffer, {}, 2);

      expect(result).toBe('QmTestHash123');
      expect(mockIPFS.add).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const testBuffer = Buffer.from('test data');
      
      mockIPFS.add.mockRejectedValue(new Error('Persistent error'));

      await expect(imageStorageService.storeToIPFSWithRetry(testBuffer, {}, 3))
        .rejects.toThrow('Persistent error');

      expect(mockIPFS.add).toHaveBeenCalledTimes(3);
    });
  });
});
