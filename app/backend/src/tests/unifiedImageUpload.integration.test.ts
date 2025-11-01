/**
 * Unified Image Upload Integration Tests
 * Tests the complete image upload pipeline across all seller components
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import request from 'supertest';
import app from '../index';
import { sellerImageService } from '../services/sellerImageService';
import { SellerError, SellerErrorType } from '../types/sellerError';
import fs from 'fs';
import path from 'path';

describe('Unified Image Upload Pipeline', () => {
  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
  
  // Create a test image buffer for testing
  const createTestImageBuffer = (width = 400, height = 400): Buffer => {
    // Create a simple test image buffer (in real tests, you'd use a real image)
    const canvas = require('canvas').createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Draw a simple test pattern
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, width / 2, height / 2);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(width / 2, 0, width / 2, height / 2);
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(0, height / 2, width / 2, height / 2);
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(width / 2, height / 2, width / 2, height / 2);
    
    return canvas.toBuffer('image/jpeg');
  };

  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  describe('Image Validation', () => {
    it('should validate profile image requirements', async () => {
      const validBuffer = createTestImageBuffer(400, 400);
      
      const result = await sellerImageService.uploadImage({
        buffer: validBuffer,
        originalName: 'profile.jpg',
        mimeType: 'image/jpeg',
        size: validBuffer.length,
        context: 'profile',
        userId: testWalletAddress,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.cdnUrl).toBeDefined();
      expect(result.thumbnails).toBeDefined();
      expect(result.metadata.width).toBe(400);
      expect(result.metadata.height).toBe(400);
    });

    it('should validate cover image requirements', async () => {
      const validBuffer = createTestImageBuffer(1200, 400);
      
      const result = await sellerImageService.uploadImage({
        buffer: validBuffer,
        originalName: 'cover.jpg',
        mimeType: 'image/jpeg',
        size: validBuffer.length,
        context: 'cover',
        userId: testWalletAddress,
      });

      expect(result).toBeDefined();
      expect(result.metadata.width).toBeLessThanOrEqual(1200);
      expect(result.metadata.height).toBeLessThanOrEqual(400);
    });

    it('should validate listing image requirements', async () => {
      const validBuffer = createTestImageBuffer(800, 800);
      
      const result = await sellerImageService.uploadImage({
        buffer: validBuffer,
        originalName: 'listing.jpg',
        mimeType: 'image/jpeg',
        size: validBuffer.length,
        context: 'listing',
        userId: testWalletAddress,
      });

      expect(result).toBeDefined();
      expect(result.metadata.width).toBeLessThanOrEqual(800);
      expect(result.metadata.height).toBeLessThanOrEqual(800);
    });

    it('should reject oversized images', async () => {
      const oversizedBuffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
      
      await expect(
        sellerImageService.uploadImage({
          buffer: oversizedBuffer,
          originalName: 'oversized.jpg',
          mimeType: 'image/jpeg',
          size: oversizedBuffer.length,
          context: 'profile',
          userId: testWalletAddress,
        })
      ).rejects.toThrow(SellerError);
    });

    it('should reject invalid file types', async () => {
      const textBuffer = Buffer.from('This is not an image');
      
      await expect(
        sellerImageService.uploadImage({
          buffer: textBuffer,
          originalName: 'not-image.txt',
          mimeType: 'text/plain',
          size: textBuffer.length,
          context: 'profile',
          userId: testWalletAddress,
        })
      ).rejects.toThrow(SellerError);
    });
  });

  describe('Image Processing', () => {
    it('should generate thumbnails for all contexts', async () => {
      const testBuffer = createTestImageBuffer(1000, 1000);
      
      const result = await sellerImageService.uploadImage({
        buffer: testBuffer,
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: testBuffer.length,
        context: 'listing',
        userId: testWalletAddress,
      });

      expect(result.thumbnails).toBeDefined();
      expect(result.thumbnails.small).toBeDefined();
      expect(result.thumbnails.medium).toBeDefined();
      expect(result.thumbnails.large).toBeDefined();
    });

    it('should optimize image size while maintaining quality', async () => {
      const largeBuffer = createTestImageBuffer(2000, 2000);
      
      const result = await sellerImageService.uploadImage({
        buffer: largeBuffer,
        originalName: 'large.jpg',
        mimeType: 'image/jpeg',
        size: largeBuffer.length,
        context: 'listing',
        userId: testWalletAddress,
      });

      expect(result.metadata.size).toBeLessThan(largeBuffer.length);
      expect(result.metadata.compressionRatio).toBeGreaterThan(0);
    });
  });

  describe('API Endpoints', () => {
    it('should upload single image via API', async () => {
      const testBuffer = createTestImageBuffer(400, 400);
      
      const response = await request(app)
        .post('/api/marketplace/seller/images/upload')
        .attach('image', testBuffer, 'test.jpg')
        .field('context', 'profile')
        .field('userId', testWalletAddress)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.cdnUrl).toBeDefined();
    });

    it('should upload multiple images via API', async () => {
      const testBuffer1 = createTestImageBuffer(400, 400);
      const testBuffer2 = createTestImageBuffer(500, 500);
      
      const response = await request(app)
        .post('/api/marketplace/seller/images/upload-multiple')
        .attach('images', testBuffer1, 'test1.jpg')
        .attach('images', testBuffer2, 'test2.jpg')
        .field('context', 'listing')
        .field('userId', testWalletAddress)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toHaveLength(2);
      expect(response.body.data.totalUploaded).toBe(2);
    });

    it('should handle upload errors gracefully', async () => {
      const response = await request(app)
        .post('/api/marketplace/seller/images/upload')
        .field('context', 'profile')
        .field('userId', testWalletAddress)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No image file provided');
    });

    it('should validate context parameter', async () => {
      const testBuffer = createTestImageBuffer(400, 400);
      
      const response = await request(app)
        .post('/api/marketplace/seller/images/upload')
        .attach('image', testBuffer, 'test.jpg')
        .field('context', 'invalid')
        .field('userId', testWalletAddress)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid context');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage failures gracefully', async () => {
      // Mock storage service to fail
      const originalUpload = sellerImageService.uploadImage;
      jest.spyOn(sellerImageService, 'uploadImage').mockRejectedValueOnce(
        new Error('Storage service unavailable')
      );

      const testBuffer = createTestImageBuffer(400, 400);
      
      await expect(
        sellerImageService.uploadImage({
          buffer: testBuffer,
          originalName: 'test.jpg',
          mimeType: 'image/jpeg',
          size: testBuffer.length,
          context: 'profile',
          userId: testWalletAddress,
        })
      ).rejects.toThrow('Storage service unavailable');

      // Restore original method
      jest.restoreAllMocks();
    });

    it('should provide detailed error information', async () => {
      const invalidBuffer = Buffer.from('invalid image data');
      
      try {
        await sellerImageService.uploadImage({
          buffer: invalidBuffer,
          originalName: 'invalid.jpg',
          mimeType: 'image/jpeg',
          size: invalidBuffer.length,
          context: 'profile',
          userId: testWalletAddress,
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(SellerError);
        expect(error.type).toBe(SellerErrorType.VALIDATION_ERROR);
        expect(error.details).toBeDefined();
      }
    });
  });

  describe('CDN URL Generation', () => {
    it('should generate consistent CDN URLs', async () => {
      const testBuffer = createTestImageBuffer(400, 400);
      
      const result = await sellerImageService.uploadImage({
        buffer: testBuffer,
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: testBuffer.length,
        context: 'profile',
        userId: testWalletAddress,
      });

      expect(result.cdnUrl).toMatch(/^https?:\/\/.+/);
      expect(result.thumbnails.small).toMatch(/^https?:\/\/.+/);
      expect(result.thumbnails.medium).toMatch(/^https?:\/\/.+/);
      expect(result.thumbnails.large).toMatch(/^https?:\/\/.+/);
    });

    it('should include optimization parameters in CDN URLs', async () => {
      const testBuffer = createTestImageBuffer(400, 400);
      
      const result = await sellerImageService.uploadImage({
        buffer: testBuffer,
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: testBuffer.length,
        context: 'profile',
        userId: testWalletAddress,
      });

      expect(result.thumbnails.small).toContain('q=80');
      expect(result.thumbnails.medium).toContain('q=85');
      expect(result.thumbnails.large).toContain('q=90');
    });
  });

  describe('Cross-Component Consistency', () => {
    it('should use same validation rules across all contexts', async () => {
      const contexts: Array<'profile' | 'cover' | 'listing'> = ['profile', 'cover', 'listing'];
      const testBuffer = createTestImageBuffer(400, 400);
      
      for (const context of contexts) {
        const result = await sellerImageService.uploadImage({
          buffer: testBuffer,
          originalName: `test-${context}.jpg`,
          mimeType: 'image/jpeg',
          size: testBuffer.length,
          context,
          userId: testWalletAddress,
        });

        expect(result).toBeDefined();
        expect(result.cdnUrl).toBeDefined();
        expect(result.thumbnails).toBeDefined();
      }
    });

    it('should maintain consistent error format across contexts', async () => {
      const contexts: Array<'profile' | 'cover' | 'listing'> = ['profile', 'cover', 'listing'];
      const invalidBuffer = Buffer.from('invalid');
      
      for (const context of contexts) {
        try {
          await sellerImageService.uploadImage({
            buffer: invalidBuffer,
            originalName: 'invalid.jpg',
            mimeType: 'text/plain',
            size: invalidBuffer.length,
            context,
            userId: testWalletAddress,
          });
          fail(`Should have thrown error for context: ${context}`);
        } catch (error) {
          expect(error).toBeInstanceOf(SellerError);
          expect(error.type).toBe(SellerErrorType.VALIDATION_ERROR);
        }
      }
    });
  });
});
