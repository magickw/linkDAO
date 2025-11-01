import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import digitalAssetRoutes from '../routes/digitalAssetRoutes';
import { AssetType, LicenseType, AccessType } from '../types/digitalAsset';

// Mock services
vi.mock('../services/digitalAssetService');
vi.mock('../services/analyticsService');
vi.mock('../services/watermarkService');
vi.mock('../middleware/auth');

describe('DigitalAssetController Integration Tests', () => {
  let app: express.Application;
  const mockUserId = 'user-123';
  const mockAssetId = 'asset-123';
  const mockLicenseId = 'license-123';
  const mockTransactionHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/digital-assets', digitalAssetRoutes);
    
    // Mock authentication middleware
    vi.doMock('../middleware/auth', () => ({
      authenticateToken: (req: any, res: any, next: any) => {
        req.user = { id: mockUserId };
        next();
      }
    }));
    
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe('POST /api/digital-assets', () => {
    it('should create a digital asset successfully', async () => {
      const mockAsset = {
        id: mockAssetId,
        creatorId: mockUserId,
        title: 'Test Digital Asset',
        description: 'A test digital asset',
        assetType: AssetType.IMAGE,
        fileSize: 1024,
        fileFormat: 'jpg',
        drmEnabled: true,
        licenseType: LicenseType.STANDARD,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Mock digitalAssetService.createDigitalAsset
      const { digitalAssetService } = await import('../services/digitalAssetService');
      vi.mocked(digitalAssetService.createDigitalAsset).mockResolvedValue(mockAsset as any);
      
      const response = await request(app)
        .post('/api/digital-assets')
        .field('title', 'Test Digital Asset')
        .field('description', 'A test digital asset')
        .field('assetType', AssetType.IMAGE)
        .field('licenseType', LicenseType.STANDARD)
        .attach('file', Buffer.from('test file content'), 'test.jpg');
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Digital Asset');
      expect(response.body.data.creatorId).toBe(mockUserId);
    });
    
    it('should return 400 if file is missing', async () => {
      const response = await request(app)
        .post('/api/digital-assets')
        .send({
          title: 'Test Digital Asset',
          assetType: AssetType.IMAGE,
          licenseType: LicenseType.STANDARD
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('File is required');
    });
    
    it('should return 400 for invalid asset type', async () => {
      const response = await request(app)
        .post('/api/digital-assets')
        .field('title', 'Test Digital Asset')
        .field('assetType', 'invalid_type')
        .field('licenseType', LicenseType.STANDARD)
        .attach('file', Buffer.from('test file content'), 'test.jpg');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
    
    it('should return 401 if user is not authenticated', async () => {
      // Override auth middleware to not set user
      vi.doMock('../middleware/auth', () => ({
        authenticateToken: (req: any, res: any, next: any) => {
          next();
        }
      }));
      
      const response = await request(app)
        .post('/api/digital-assets')
        .field('title', 'Test Digital Asset')
        .field('assetType', AssetType.IMAGE)
        .field('licenseType', LicenseType.STANDARD)
        .attach('file', Buffer.from('test file content'), 'test.jpg');
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });
  
  describe('POST /api/digital-assets/:assetId/licenses', () => {
    it('should create a license successfully', async () => {
      const mockLicense = {
        id: mockLicenseId,
        assetId: mockAssetId,
        licenseName: 'Standard License',
        licenseType: LicenseType.STANDARD,
        price: '1000000000000000000',
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
        },
        maxDownloads: -1,
        maxUsers: 1,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      // Mock digitalAssetService.createLicense
      const { digitalAssetService } = await import('../services/digitalAssetService');
      vi.mocked(digitalAssetService.createLicense).mockResolvedValue(mockLicense as any);
      
      const response = await request(app)
        .post(`/api/digital-assets/${mockAssetId}/licenses`)
        .send({
          assetId: mockAssetId,
          licenseName: 'Standard License',
          licenseType: LicenseType.STANDARD,
          price: '1000000000000000000',
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
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseName).toBe('Standard License');
    });
    
    it('should return 400 for invalid license data', async () => {
      const response = await request(app)
        .post(`/api/digital-assets/${mockAssetId}/licenses`)
        .send({
          assetId: 'invalid-uuid',
          licenseName: '',
          licenseType: 'invalid_type'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });
  
  describe('POST /api/digital-assets/purchase-license', () => {
    it('should purchase a license successfully', async () => {
      const mockPurchase = {
        id: 'purchase-123',
        assetId: mockAssetId,
        licenseId: mockLicenseId,
        buyerId: mockUserId,
        sellerId: 'seller-123',
        transactionHash: mockTransactionHash,
        pricePaid: '1000000000000000000',
        currency: 'ETH',
        licenseKey: 'generated-license-key',
        isActive: true,
        purchasedAt: new Date().toISOString()
      };
      
      // Mock digitalAssetService.purchaseLicense
      const { digitalAssetService } = await import('../services/digitalAssetService');
      vi.mocked(digitalAssetService.purchaseLicense).mockResolvedValue(mockPurchase as any);
      
      const response = await request(app)
        .post('/api/digital-assets/purchase-license')
        .send({
          assetId: mockAssetId,
          licenseId: mockLicenseId,
          transactionHash: mockTransactionHash,
          pricePaid: '1000000000000000000',
          currency: 'ETH'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseKey).toBe('generated-license-key');
    });
    
    it('should return 400 for invalid transaction hash', async () => {
      const response = await request(app)
        .post('/api/digital-assets/purchase-license')
        .send({
          assetId: mockAssetId,
          licenseId: mockLicenseId,
          transactionHash: 'invalid-hash',
          pricePaid: '1000000000000000000',
          currency: 'ETH'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });
  
  describe('POST /api/digital-assets/access', () => {
    it('should provide download access with valid license', async () => {
      const mockContent = Buffer.from('decrypted and watermarked content');
      
      // Mock digitalAssetService.accessAsset
      const { digitalAssetService } = await import('../services/digitalAssetService');
      vi.mocked(digitalAssetService.accessAsset).mockResolvedValue({
        content: mockContent
      });
      
      const response = await request(app)
        .post('/api/digital-assets/access')
        .send({
          licenseKey: 'valid-license-key',
          accessType: AccessType.DOWNLOAD
        });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toBe('attachment');
      expect(Buffer.from(response.body)).toEqual(mockContent);
    });
    
    it('should provide stream URL for streaming access', async () => {
      const mockStreamUrl = 'https://cdn.example.com/stream/token';
      
      // Mock digitalAssetService.accessAsset
      const { digitalAssetService } = await import('../services/digitalAssetService');
      vi.mocked(digitalAssetService.accessAsset).mockResolvedValue({
        streamUrl: mockStreamUrl
      });
      
      const response = await request(app)
        .post('/api/digital-assets/access')
        .send({
          licenseKey: 'valid-license-key',
          accessType: AccessType.STREAM
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.streamUrl).toBe(mockStreamUrl);
    });
    
    it('should return 403 for invalid license', async () => {
      // Mock digitalAssetService.accessAsset
      const { digitalAssetService } = await import('../services/digitalAssetService');
      vi.mocked(digitalAssetService.accessAsset).mockResolvedValue({
        error: 'Invalid or expired license'
      });
      
      const response = await request(app)
        .post('/api/digital-assets/access')
        .send({
          licenseKey: 'invalid-license-key',
          accessType: AccessType.DOWNLOAD
        });
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid or expired license');
    });
    
    it('should return 400 if license key or access type is missing', async () => {
      const response = await request(app)
        .post('/api/digital-assets/access')
        .send({
          licenseKey: 'valid-license-key'
          // Missing accessType
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('License key and access type are required');
    });
  });
  
  describe('POST /api/digital-assets/dmca-request', () => {
    it('should submit DMCA request successfully', async () => {
      const mockRequestId = 'dmca-request-123';
      
      // Mock digitalAssetService.submitDMCARequest
      const { digitalAssetService } = await import('../services/digitalAssetService');
      vi.mocked(digitalAssetService.submitDMCARequest).mockResolvedValue(mockRequestId);
      
      const response = await request(app)
        .post('/api/digital-assets/dmca-request')
        .send({
          assetId: mockAssetId,
          reporterName: 'John Doe',
          reporterEmail: 'john@example.com',
          copyrightHolderName: 'Copyright Holder Inc.',
          originalWorkDescription: 'This is my original work that was created in 2023.',
          infringementDescription: 'The uploaded asset is an exact copy of my copyrighted work.',
          swornStatement: 'I swear under penalty of perjury that the information in this notification is accurate.',
          contactInformation: 'John Doe, 123 Main St, City, State, 12345, john@example.com'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requestId).toBe(mockRequestId);
    });
    
    it('should return 400 for invalid DMCA request data', async () => {
      const response = await request(app)
        .post('/api/digital-assets/dmca-request')
        .send({
          assetId: 'invalid-uuid',
          reporterName: '',
          reporterEmail: 'invalid-email'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });
  
  describe('GET /api/digital-assets/analytics', () => {
    it('should return analytics data', async () => {
      const mockAnalytics = {
        totalDownloads: 100,
        totalStreams: 50,
        totalPreviews: 200,
        uniqueUsers: 75,
        totalRevenue: '5000000000000000000',
        bandwidthUsed: 1024000000,
        averageFileSize: 5242880,
        popularAssets: [],
        userEngagement: {
          dailyActiveUsers: 25,
          averageSessionDuration: 300,
          returnUserRate: 0.6
        },
        performanceMetrics: {
          averageResponseTime: 150,
          cacheHitRate: 85,
          errorRate: 0.02
        }
      };
      
      // Mock analyticsService.getAnalytics
      const { analyticsService } = await import('../services/analyticsService');
      vi.mocked(analyticsService.getAnalytics).mockResolvedValue(mockAnalytics);
      
      const response = await request(app)
        .get('/api/digital-assets/analytics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics);
    });
    
    it('should return 400 if start date or end date is missing', async () => {
      const response = await request(app)
        .get('/api/digital-assets/analytics')
        .query({
          startDate: '2024-01-01'
          // Missing endDate
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Start date and end date are required');
    });
  });
  
  describe('GET /api/digital-assets/analytics/time-series', () => {
    it('should return time series data', async () => {
      const mockTimeSeriesData = [
        {
          date: '2024-01-01',
          downloads: 10,
          streams: 5,
          previews: 20,
          revenue: '1000000000000000000',
          uniqueUsers: 8
        },
        {
          date: '2024-01-02',
          downloads: 15,
          streams: 8,
          previews: 25,
          revenue: '1500000000000000000',
          uniqueUsers: 12
        }
      ];
      
      // Mock analyticsService.getTimeSeriesData
      const { analyticsService } = await import('../services/analyticsService');
      vi.mocked(analyticsService.getTimeSeriesData).mockResolvedValue(mockTimeSeriesData);
      
      const response = await request(app)
        .get('/api/digital-assets/analytics/time-series')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          groupBy: 'day'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTimeSeriesData);
    });
  });
  
  describe('GET /api/digital-assets/analytics/real-time', () => {
    it('should return real-time statistics', async () => {
      const mockRealTimeStats = {
        activeUsers: 25,
        currentDownloads: 5,
        currentStreams: 3,
        recentActivity: [
          {
            userId: 'user-1',
            accessType: AccessType.DOWNLOAD,
            timestamp: new Date().toISOString(),
            success: true
          }
        ]
      };
      
      // Mock analyticsService.getRealTimeStats
      const { analyticsService } = await import('../services/analyticsService');
      vi.mocked(analyticsService.getRealTimeStats).mockResolvedValue(mockRealTimeStats);
      
      const response = await request(app)
        .get('/api/digital-assets/analytics/real-time');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRealTimeStats);
    });
  });
  
  describe('POST /api/digital-assets/watermark-templates', () => {
    it('should create watermark template successfully', async () => {
      const mockTemplateId = 'template-123';
      
      // Mock watermarkService.createWatermarkTemplate
      const { watermarkService } = await import('../services/watermarkService');
      vi.mocked(watermarkService.createWatermarkTemplate).mockResolvedValue(mockTemplateId);
      
      const response = await request(app)
        .post('/api/digital-assets/watermark-templates')
        .send({
          name: 'Copyright Template',
          templateType: 'text',
          templateData: {
            text: {
              content: 'Copyright © 2024',
              fontSize: 12,
              fontFamily: 'Arial',
              color: '#ffffff',
              opacity: 0.5,
              position: 'bottom-right'
            }
          },
          isDefault: false
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.templateId).toBe(mockTemplateId);
    });
    
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/digital-assets/watermark-templates')
        .send({
          name: 'Template Name'
          // Missing templateType and templateData
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name, template type, and template data are required');
    });
  });
  
  describe('GET /api/digital-assets/watermark-templates', () => {
    it('should return watermark templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          creatorId: mockUserId,
          name: 'Text Template',
          templateType: 'text',
          templateData: { text: { content: 'Test' } },
          isDefault: false,
          createdAt: new Date().toISOString()
        }
      ];
      
      // Mock watermarkService.getWatermarkTemplates
      const { watermarkService } = await import('../services/watermarkService');
      vi.mocked(watermarkService.getWatermarkTemplates).mockResolvedValue(mockTemplates);
      
      const response = await request(app)
        .get('/api/digital-assets/watermark-templates');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTemplates);
    });
  });
  
  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock digitalAssetService.createDigitalAsset to throw error
      const { digitalAssetService } = await import('../services/digitalAssetService');
      vi.mocked(digitalAssetService.createDigitalAsset).mockRejectedValue(new Error('Service error'));
      
      const response = await request(app)
        .post('/api/digital-assets')
        .field('title', 'Test Digital Asset')
        .field('assetType', AssetType.IMAGE)
        .field('licenseType', LicenseType.STANDARD)
        .attach('file', Buffer.from('test file content'), 'test.jpg');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create digital asset');
    });
  });
});
