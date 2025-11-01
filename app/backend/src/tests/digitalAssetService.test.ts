import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { digitalAssetService } from '../services/digitalAssetService';
import { encryptionService } from '../services/encryptionService';
import { watermarkService } from '../services/watermarkService';
import { ipfsService } from '../services/ipfsService';
import { AssetType, LicenseType, AccessType } from '../types/digitalAsset';
import crypto from 'crypto';

// Mock dependencies
vi.mock('../services/ipfsService');
vi.mock('../services/encryptionService');
vi.mock('../services/watermarkService');
vi.mock('../db/connection');

describe('DigitalAssetService', () => {
  const mockUserId = 'user-123';
  const mockAssetId = 'asset-123';
  const mockLicenseId = 'license-123';
  const mockPurchaseId = 'purchase-123';
  const mockTransactionHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(ipfsService.uploadBuffer).mockResolvedValue('QmTestHash');
    vi.mocked(ipfsService.uploadJSON).mockResolvedValue('QmMetadataHash');
    vi.mocked(ipfsService.getBuffer).mockResolvedValue(Buffer.from('test content'));
    
    vi.mocked(encryptionService.encryptContent).mockResolvedValue({
      encryptedContent: Buffer.from('encrypted content'),
      encryptionKey: 'test-encryption-key'
    });
    vi.mocked(encryptionService.decryptContent).mockResolvedValue(Buffer.from('decrypted content'));
    vi.mocked(encryptionService.storeKey).mockResolvedValue();
    vi.mocked(encryptionService.getKey).mockResolvedValue('test-encryption-key');
    
    vi.mocked(watermarkService.applyWatermark).mockResolvedValue(Buffer.from('watermarked content'));
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('createDigitalAsset', () => {
    it('should create a digital asset with DRM protection', async () => {
      const request = {
        title: 'Test Digital Asset',
        description: 'A test digital asset',
        assetType: AssetType.IMAGE,
        fileFormat: 'jpg',
        licenseType: LicenseType.STANDARD,
        file: Buffer.from('test file content')
      };
      
      // Mock database operations
      const mockAsset = {
        id: mockAssetId,
        creatorId: mockUserId,
        title: request.title,
        description: request.description,
        assetType: request.assetType,
        fileSize: request.file.length,
        fileFormat: request.fileFormat,
        contentHash: crypto.createHash('sha256').update(request.file).digest('hex'),
        encryptedContentHash: 'encrypted-hash',
        encryptionKeyHash: 'key-hash',
        metadataHash: 'QmMetadataHash',
        drmEnabled: true,
        licenseType: request.licenseType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Mock database insert
      vi.doMock('../db/connection', () => ({
        db: {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockAsset])
            })
          })
        }
      }));
      
      const result = await digitalAssetService.createDigitalAsset(mockUserId, request);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(request.title);
      expect(result.creatorId).toBe(mockUserId);
      expect(result.drmEnabled).toBe(true);
      
      // Verify encryption was called
      expect(encryptionService.encryptContent).toHaveBeenCalledWith(request.file);
      
      // Verify IPFS upload was called
      expect(ipfsService.uploadBuffer).toHaveBeenCalled();
      expect(ipfsService.uploadJSON).toHaveBeenCalled();
      
      // Verify key storage was called
      expect(encryptionService.storeKey).toHaveBeenCalledWith(mockAssetId, 'test-encryption-key');
    });
    
    it('should handle file upload errors gracefully', async () => {
      const request = {
        title: 'Test Asset',
        assetType: AssetType.IMAGE,
        fileFormat: 'jpg',
        licenseType: LicenseType.STANDARD,
        file: Buffer.from('test content')
      };
      
      // Mock IPFS upload failure
      vi.mocked(ipfsService.uploadBuffer).mockRejectedValue(new Error('IPFS upload failed'));
      
      await expect(digitalAssetService.createDigitalAsset(mockUserId, request))
        .rejects.toThrow('Failed to create digital asset');
    });
  });
  
  describe('createLicense', () => {
    it('should create a license for a digital asset', async () => {
      const request = {
        assetId: mockAssetId,
        licenseName: 'Standard License',
        licenseType: LicenseType.STANDARD,
        price: '1000000000000000000', // 1 ETH in wei
        currency: 'ETH',
        usageRights: {
          personalUse: true,
          commercialUse: false,
          modification: false,
          redistribution: false,
          printRights: true,
          digitalRights: true,
          exclusiveRights: false,
          resaleRights: false,
          sublicensingRights: false
        }
      };
      
      const mockLicense = {
        id: mockLicenseId,
        ...request,
        usageRights: JSON.stringify(request.usageRights),
        maxDownloads: -1,
        maxUsers: 1,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      // Mock database insert
      vi.doMock('../db/connection', () => ({
        db: {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockLicense])
            })
          })
        }
      }));
      
      const result = await digitalAssetService.createLicense(request);
      
      expect(result).toBeDefined();
      expect(result.licenseName).toBe(request.licenseName);
      expect(result.price).toBe(request.price);
      expect(result.licenseType).toBe(request.licenseType);
    });
  });
  
  describe('purchaseLicense', () => {
    it('should purchase a license and generate DRM keys', async () => {
      const request = {
        assetId: mockAssetId,
        licenseId: mockLicenseId,
        transactionHash: mockTransactionHash,
        pricePaid: '1000000000000000000',
        currency: 'ETH'
      };
      
      const mockAsset = {
        id: mockAssetId,
        creatorId: 'creator-123',
        title: 'Test Asset'
      };
      
      const mockLicense = {
        id: mockLicenseId,
        maxDownloads: 5,
        durationDays: 30
      };
      
      const mockPurchase = {
        id: mockPurchaseId,
        ...request,
        buyerId: mockUserId,
        sellerId: mockAsset.creatorId,
        licenseKey: 'generated-license-key',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        downloadsRemaining: 5,
        isActive: true,
        purchasedAt: new Date().toISOString()
      };
      
      // Mock service methods
      vi.spyOn(digitalAssetService as any, 'getAssetById').mockResolvedValue(mockAsset);
      vi.spyOn(digitalAssetService as any, 'getLicenseById').mockResolvedValue(mockLicense);
      vi.spyOn(digitalAssetService as any, 'generateDRMKeys').mockResolvedValue();
      
      // Mock database insert
      vi.doMock('../db/connection', () => ({
        db: {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockPurchase])
            })
          })
        }
      }));
      
      const result = await digitalAssetService.purchaseLicense(mockUserId, request);
      
      expect(result).toBeDefined();
      expect(result.buyerId).toBe(mockUserId);
      expect(result.transactionHash).toBe(request.transactionHash);
      expect(result.licenseKey).toBeDefined();
    });
    
    it('should throw error if asset or license not found', async () => {
      const request = {
        assetId: 'non-existent-asset',
        licenseId: 'non-existent-license',
        transactionHash: mockTransactionHash,
        pricePaid: '1000000000000000000',
        currency: 'ETH'
      };
      
      // Mock service methods to return null
      vi.spyOn(digitalAssetService as any, 'getAssetById').mockResolvedValue(null);
      vi.spyOn(digitalAssetService as any, 'getLicenseById').mockResolvedValue(null);
      
      await expect(digitalAssetService.purchaseLicense(mockUserId, request))
        .rejects.toThrow('Asset or license not found');
    });
  });
  
  describe('accessAsset', () => {
    it('should allow download access with valid license', async () => {
      const request = {
        licenseKey: 'valid-license-key',
        accessType: AccessType.DOWNLOAD
      };
      
      const mockPurchase = {
        id: mockPurchaseId,
        assetId: mockAssetId,
        buyerId: mockUserId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        downloadsRemaining: 5,
        isActive: true
      };
      
      const mockAsset = {
        id: mockAssetId,
        encryptedContentHash: 'encrypted-hash',
        watermarkEnabled: true,
        assetType: AssetType.IMAGE
      };
      
      // Mock service methods
      vi.spyOn(digitalAssetService as any, 'verifyLicenseKey').mockResolvedValue(mockPurchase);
      vi.spyOn(digitalAssetService as any, 'getAssetById').mockResolvedValue(mockAsset);
      vi.spyOn(digitalAssetService as any, 'getEncryptionKey').mockResolvedValue('encryption-key');
      vi.spyOn(digitalAssetService as any, 'logAccess').mockResolvedValue();
      
      // Mock database update
      vi.doMock('../db/connection', () => ({
        db: {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue()
            })
          })
        }
      }));
      
      const result = await digitalAssetService.accessAsset(mockUserId, request);
      
      expect(result.content).toBeDefined();
      expect(result.error).toBeUndefined();
      
      // Verify decryption was called
      expect(encryptionService.decryptContent).toHaveBeenCalled();
      
      // Verify watermark was applied
      expect(watermarkService.applyWatermark).toHaveBeenCalled();
    });
    
    it('should deny access with invalid license key', async () => {
      const request = {
        licenseKey: 'invalid-license-key',
        accessType: AccessType.DOWNLOAD
      };
      
      // Mock service method to return null
      vi.spyOn(digitalAssetService as any, 'verifyLicenseKey').mockResolvedValue(null);
      vi.spyOn(digitalAssetService as any, 'logAccess').mockResolvedValue();
      
      const result = await digitalAssetService.accessAsset(mockUserId, request);
      
      expect(result.error).toBe('Invalid or expired license');
      expect(result.content).toBeUndefined();
    });
    
    it('should deny access when download limit exceeded', async () => {
      const request = {
        licenseKey: 'valid-license-key',
        accessType: AccessType.DOWNLOAD
      };
      
      const mockPurchase = {
        id: mockPurchaseId,
        assetId: mockAssetId,
        buyerId: mockUserId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        downloadsRemaining: 0, // No downloads remaining
        isActive: true
      };
      
      // Mock service methods
      vi.spyOn(digitalAssetService as any, 'verifyLicenseKey').mockResolvedValue(mockPurchase);
      vi.spyOn(digitalAssetService as any, 'logAccess').mockResolvedValue();
      
      const result = await digitalAssetService.accessAsset(mockUserId, request);
      
      expect(result.error).toBe('Download limit exceeded');
      expect(result.content).toBeUndefined();
    });
    
    it('should provide stream URL for streaming access', async () => {
      const request = {
        licenseKey: 'valid-license-key',
        accessType: AccessType.STREAM
      };
      
      const mockPurchase = {
        id: mockPurchaseId,
        assetId: mockAssetId,
        buyerId: mockUserId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        downloadsRemaining: -1,
        isActive: true
      };
      
      const mockAsset = {
        id: mockAssetId,
        streamingEnabled: true
      };
      
      // Mock service methods
      vi.spyOn(digitalAssetService as any, 'verifyLicenseKey').mockResolvedValue(mockPurchase);
      vi.spyOn(digitalAssetService as any, 'getAssetById').mockResolvedValue(mockAsset);
      vi.spyOn(digitalAssetService as any, 'generateSecureStreamUrl').mockResolvedValue('https://cdn.example.com/stream/token');
      vi.spyOn(digitalAssetService as any, 'logAccess').mockResolvedValue();
      
      const result = await digitalAssetService.accessAsset(mockUserId, request);
      
      expect(result.streamUrl).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });
  
  describe('submitDMCARequest', () => {
    it('should submit DMCA takedown request', async () => {
      const request = {
        assetId: mockAssetId,
        reporterName: 'John Doe',
        reporterEmail: 'john@example.com',
        copyrightHolderName: 'Copyright Holder Inc.',
        originalWorkDescription: 'Original work description',
        infringementDescription: 'Infringement description',
        swornStatement: 'I swear under penalty of perjury that the information is accurate',
        contactInformation: 'Contact information'
      };
      
      const mockDMCARequest = {
        id: 'dmca-123',
        ...request,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      // Mock database insert
      vi.doMock('../db/connection', () => ({
        db: {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockDMCARequest])
            })
          })
        }
      }));
      
      // Mock notification method
      vi.spyOn(digitalAssetService as any, 'notifyAdministrators').mockResolvedValue();
      
      const result = await digitalAssetService.submitDMCARequest(mockUserId, request);
      
      expect(result).toBe(mockDMCARequest.id);
    });
  });
  
  describe('getAnalytics', () => {
    it('should return analytics data for specified date range', async () => {
      const query = {
        assetId: mockAssetId,
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };
      
      const mockAnalytics = [
        {
          id: 'analytics-1',
          assetId: mockAssetId,
          date: '2024-01-01',
          totalDownloads: 10,
          totalStreams: 5,
          totalPreviews: 20,
          uniqueUsers: 8,
          totalRevenue: '1000000000000000000',
          bandwidthUsed: 1024000
        }
      ];
      
      // Mock database select
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(mockAnalytics)
              })
            })
          })
        }
      }));
      
      const result = await digitalAssetService.getAnalytics(query);
      
      expect(result).toEqual(mockAnalytics);
    });
  });
  
  describe('updateAnalytics', () => {
    it('should update daily analytics for an asset', async () => {
      const assetId = mockAssetId;
      const date = '2024-01-01';
      
      const mockAccessLogs = [
        {
          userId: 'user-1',
          accessType: AccessType.DOWNLOAD,
          fileSizeAccessed: 1024
        },
        {
          userId: 'user-2',
          accessType: AccessType.STREAM,
          fileSizeAccessed: 2048
        }
      ];
      
      const mockPurchases = [
        {
          pricePaid: '500000000000000000'
        },
        {
          pricePaid: '750000000000000000'
        }
      ];
      
      // Mock database operations
      vi.doMock('../db/connection', () => ({
        db: {
          select: vi.fn()
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockAccessLogs)
              })
            })
            .mockReturnValueOnce({
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(mockPurchases)
              })
            }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoUpdate: vi.fn().mockResolvedValue()
            })
          })
        }
      }));
      
      await expect(digitalAssetService.updateAnalytics(assetId, date)).resolves.not.toThrow();
    });
  });
});
