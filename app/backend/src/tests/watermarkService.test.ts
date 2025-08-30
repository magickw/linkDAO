import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { watermarkService } from '../services/watermarkService';
import { AssetType, WatermarkType } from '../types/digitalAsset';

// Mock database connection
vi.mock('../db/connection');

describe('WatermarkService', () => {
  const mockUserId = 'user-123';
  const mockLicenseKey = 'license-key-123';
  const testContent = Buffer.from('test content for watermarking');
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('applyWatermark', () => {
    it('should apply watermark to image content', async () => {
      const result = await watermarkService.applyWatermark(
        testContent,
        AssetType.IMAGE,
        mockUserId,
        mockLicenseKey
      );
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThanOrEqual(testContent.length);
    });
    
    it('should apply watermark to video content', async () => {
      const result = await watermarkService.applyWatermark(
        testContent,
        AssetType.VIDEO,
        mockUserId,
        mockLicenseKey
      );
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThanOrEqual(testContent.length);
    });
    
    it('should apply watermark to audio content', async () => {
      const result = await watermarkService.applyWatermark(
        testContent,
        AssetType.AUDIO,
        mockUserId,
        mockLicenseKey
      );
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThanOrEqual(testContent.length);
    });
    
    it('should apply watermark to document content', async () => {
      const result = await watermarkService.applyWatermark(
        testContent,
        AssetType.DOCUMENT,
        mockUserId,
        mockLicenseKey
      );
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThanOrEqual(testContent.length);
    });
    
    it('should apply metadata watermark to unsupported types', async () => {
      const result = await watermarkService.applyWatermark(
        testContent,
        AssetType.SOFTWARE,
        mockUserId,
        mockLicenseKey
      );
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(testContent.length);
      
      // Check if watermark metadata is present
      const resultString = result.toString('utf8');
      expect(resultString).toContain('WATERMARK:');
    });
    
    it('should return original content if watermarking fails', async () => {
      // Mock a watermarking method to throw an error
      const originalMethod = (watermarkService as any).applyImageWatermark;
      (watermarkService as any).applyImageWatermark = vi.fn().mockRejectedValue(new Error('Watermark failed'));
      
      const result = await watermarkService.applyWatermark(
        testContent,
        AssetType.IMAGE,
        mockUserId,
        mockLicenseKey
      );
      
      expect(result).toEqual(testContent);
      
      // Restore original method
      (watermarkService as any).applyImageWatermark = originalMethod;
    });
  });
  
  describe('createWatermarkTemplate', () => {
    it('should create a text watermark template', async () => {
      const templateData = {
        text: {
          content: 'Copyright © 2024',
          fontSize: 12,
          fontFamily: 'Arial',
          color: '#ffffff',
          opacity: 0.5,
          position: 'bottom-right' as const
        }
      };
      
      const mockTemplate = {
        id: 'template-123',
        creatorId: mockUserId,
        name: 'Copyright Template',
        templateType: WatermarkType.TEXT,
        templateData: JSON.stringify(templateData),
        isDefault: false,
        createdAt: new Date().toISOString()
      };
      
      // Mock database insert
      vi.doMock('../db/connection', () => ({
        db: {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockTemplate])
            })
          })
        }
      }));
      
      const result = await watermarkService.createWatermarkTemplate(
        mockUserId,
        'Copyright Template',
        WatermarkType.TEXT,
        templateData,
        false
      );
      
      expect(result).toBe(mockTemplate.id);
    });
    
    it('should create an image watermark template', async () => {
      const templateData = {
        image: {
          ipfsHash: 'QmTestImageHash',
          opacity: 0.3,
          scale: 0.5,
          position: 'center' as const
        }
      };
      
      const mockTemplate = {
        id: 'template-456',
        creatorId: mockUserId,
        name: 'Logo Template',
        templateType: WatermarkType.IMAGE,
        templateData: JSON.stringify(templateData),
        isDefault: true,
        createdAt: new Date().toISOString()
      };
      
      // Mock database insert
      vi.doMock('../db/connection', () => ({
        db: {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockTemplate])
            })
          })
        }
      }));
      
      const result = await watermarkService.createWatermarkTemplate(
        mockUserId,
        'Logo Template',
        WatermarkType.IMAGE,
        templateData,
        true
      );
      
      expect(result).toBe(mockTemplate.id);
    });
  });
  
  describe('getWatermarkTemplates', () => {
    it('should retrieve watermark templates for a creator', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          creatorId: mockUserId,
          name: 'Text Template',
          templateType: WatermarkType.TEXT,
          templateData: JSON.stringify({ text: { content: 'Test' } }),
          isDefault: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'template-2',
          creatorId: mockUserId,
          name: 'Image Template',
          templateType: WatermarkType.IMAGE,
          templateData: JSON.stringify({ image: { ipfsHash: 'QmTest' } }),
          isDefault: true,
          createdAt: new Date().toISOString()
        }
      ];
      
      // Mock database select
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(mockTemplates)
            })
          })
        }
      }));
      
      const result = await watermarkService.getWatermarkTemplates(mockUserId);
      
      expect(result).toHaveLength(2);
      expect(result[0].templateData).toEqual({ text: { content: 'Test' } });
      expect(result[1].templateData).toEqual({ image: { ipfsHash: 'QmTest' } });
    });
    
    it('should return empty array if no templates found', async () => {
      // Mock database select to return empty array
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([])
            })
          })
        }
      }));
      
      const result = await watermarkService.getWatermarkTemplates(mockUserId);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('detectWatermark', () => {
    it('should detect metadata watermark in content', async () => {
      const watermarkData = {
        licensedTo: mockUserId,
        licenseKey: mockLicenseKey.substring(0, 8) + '****',
        timestamp: new Date().toISOString(),
        watermarkId: 'watermark-123'
      };
      
      const watermarkedContent = Buffer.concat([
        testContent,
        Buffer.from(`\n<!-- WATERMARK: ${JSON.stringify(watermarkData)} -->`)
      ]);
      
      const result = await watermarkService.detectWatermark(watermarkedContent, AssetType.IMAGE);
      
      expect(result.hasWatermark).toBe(true);
      expect(result.watermarkData).toEqual(watermarkData);
      expect(result.confidence).toBe(1.0);
    });
    
    it('should detect malformed watermark with lower confidence', async () => {
      const watermarkedContent = Buffer.concat([
        testContent,
        Buffer.from('\n<!-- WATERMARK: invalid json -->')
      ]);
      
      const result = await watermarkService.detectWatermark(watermarkedContent, AssetType.IMAGE);
      
      expect(result.hasWatermark).toBe(true);
      expect(result.confidence).toBe(0.5);
      expect(result.watermarkData).toBeUndefined();
    });
    
    it('should return false for content without watermark', async () => {
      const result = await watermarkService.detectWatermark(testContent, AssetType.IMAGE);
      
      expect(result.hasWatermark).toBe(false);
      expect(result.watermarkData).toBeUndefined();
      expect(result.confidence).toBeUndefined();
    });
  });
  
  describe('removeWatermark', () => {
    it('should deny watermark removal for unauthorized users', async () => {
      // Mock verification to return false
      vi.spyOn(watermarkService as any, 'verifyWatermarkRemovalRights').mockResolvedValue(false);
      
      await expect(
        watermarkService.removeWatermark(testContent, AssetType.IMAGE, mockUserId, mockLicenseKey)
      ).rejects.toThrow('Unauthorized to remove watermark');
    });
    
    it('should remove metadata watermark for authorized users', async () => {
      const watermarkData = {
        licensedTo: mockUserId,
        licenseKey: mockLicenseKey,
        timestamp: new Date().toISOString()
      };
      
      const watermarkedContent = Buffer.concat([
        testContent,
        Buffer.from(`\n<!-- WATERMARK: ${JSON.stringify(watermarkData)} -->`)
      ]);
      
      // Mock verification to return true
      vi.spyOn(watermarkService as any, 'verifyWatermarkRemovalRights').mockResolvedValue(true);
      
      const result = await watermarkService.removeWatermark(
        watermarkedContent,
        AssetType.SOFTWARE,
        mockUserId,
        mockLicenseKey
      );
      
      expect(result.toString()).not.toContain('WATERMARK:');
      expect(result.toString()).toContain(testContent.toString());
    });
  });
  
  describe('private helper methods', () => {
    it('should generate watermark text with user and license info', () => {
      const generateWatermarkText = (watermarkService as any).generateWatermarkText;
      const result = generateWatermarkText(mockUserId, mockLicenseKey);
      
      expect(result).toContain(mockUserId.substring(0, 8));
      expect(result).toContain(mockLicenseKey.substring(0, 8));
      expect(result).toContain(new Date().toISOString().split('T')[0]);
    });
    
    it('should generate audio watermark data', () => {
      const generateAudioWatermarkData = (watermarkService as any).generateAudioWatermarkData;
      const result = generateAudioWatermarkData(mockUserId, mockLicenseKey);
      
      expect(result).toBeInstanceOf(Buffer);
      
      const data = JSON.parse(result.toString());
      expect(data.userId).toBe(mockUserId.substring(0, 16));
      expect(data.licenseKey).toBe(mockLicenseKey.substring(0, 16));
      expect(data.timestamp).toBeDefined();
    });
    
    it('should add metadata to different file types', () => {
      const addMetadataToImage = (watermarkService as any).addMetadataToImage;
      const addMetadataToVideo = (watermarkService as any).addMetadataToVideo;
      const addMetadataToDocument = (watermarkService as any).addMetadataToDocument;
      
      const watermarkText = 'Test watermark';
      
      const imageResult = addMetadataToImage(testContent, watermarkText);
      const videoResult = addMetadataToVideo(testContent, watermarkText);
      const documentResult = addMetadataToDocument(testContent, watermarkText);
      
      expect(imageResult.length).toBeGreaterThan(testContent.length);
      expect(videoResult.length).toBeGreaterThan(testContent.length);
      expect(documentResult.length).toBeGreaterThan(testContent.length);
      
      expect(imageResult.toString()).toContain(watermarkText);
      expect(videoResult.toString()).toContain(watermarkText);
      expect(documentResult.toString()).toContain(watermarkText);
    });
  });
  
  describe('error handling', () => {
    it('should handle database errors gracefully in createWatermarkTemplate', async () => {
      // Mock database to throw error
      vi.doMock('../db/connection', () => ({
        db: {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockRejectedValue(new Error('Database error'))
            })
          })
        }
      }));
      
      await expect(
        watermarkService.createWatermarkTemplate(
          mockUserId,
          'Test Template',
          WatermarkType.TEXT,
          { text: { content: 'Test' } }
        )
      ).rejects.toThrow('Failed to create watermark template');
    });
    
    it('should handle database errors gracefully in getWatermarkTemplates', async () => {
      // Mock database to throw error
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockRejectedValue(new Error('Database error'))
            })
          })
        }
      }));
      
      await expect(watermarkService.getWatermarkTemplates(mockUserId))
        .rejects.toThrow('Failed to get watermark templates');
    });
    
    it('should handle detection errors gracefully', async () => {
      // Create content that will cause parsing errors
      const problematicContent = Buffer.from('<!-- WATERMARK: {invalid json} -->');
      
      const result = await watermarkService.detectWatermark(problematicContent, AssetType.IMAGE);
      
      expect(result.hasWatermark).toBe(false);
    });
  });
});