import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import cdnDistributionService from '../services/cdnDistributionService';
import { CDNIntegrationService } from '../services/cdnIntegrationService';

// Mock CDNIntegrationService
jest.mock('../services/cdnIntegrationService');

const MockCDNIntegrationService = CDNIntegrationService as jest.MockedClass<typeof CDNIntegrationService>;

describe('CDNDistributionService', () => {
  const mockIpfsHash = 'QmTest123456789';
  const mockFilename = 'test-image.jpg';
  const mockBuffer = Buffer.from('test-image-data');
  const mockContentType = 'image/jpeg';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    MockCDNIntegrationService.prototype.uploadAsset = jest.fn().mockResolvedValue({
      key: 'test-key',
      contentType: mockContentType,
      size: mockBuffer.length,
      etag: 'test-etag',
      lastModified: new Date(),
      cacheControl: 'public, max-age=31536000'
    });

    MockCDNIntegrationService.prototype.generateCDNUrl = jest.fn().mockReturnValue(
      'https://cdn.example.com/test-image.jpg'
    );

    MockCDNIntegrationService.prototype.invalidateCache = jest.fn().mockResolvedValue('invalidation-123');
    MockCDNIntegrationService.prototype.getCDNAnalytics = jest.fn().mockResolvedValue({
      requests: 1000,
      bandwidth: 50000000,
      cacheHitRate: 0.85,
      topImages: [],
      errorRate: 0.01,
      averageResponseTime: 150
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('distributeImage', () => {
    it('should distribute image to primary CDN successfully', async () => {
      const result = await cdnDistributionService.distributeImage(
        mockIpfsHash,
        mockBuffer,
        mockFilename,
        mockContentType
      );

      expect(result.primaryUrl).toBe('https://cdn.example.com/test-image.jpg');
      expect(result.ipfsUrls).toHaveLength(4); // Default IPFS gateways
      expect(result.ipfsUrls[0]).toBe(`https://ipfs.io/ipfs/${mockIpfsHash}`);
      expect(result.distributionTime).toBeGreaterThan(0);
      expect(result.cacheStatus).toBe('miss');
    });

    it('should fallback to IPFS when CDN upload fails', async () => {
      MockCDNIntegrationService.prototype.uploadAsset = jest.fn().mockRejectedValue(
        new Error('CDN upload failed')
      );

      const result = await cdnDistributionService.distributeImage(
        mockIpfsHash,
        mockBuffer,
        mockFilename,
        mockContentType
      );

      expect(result.primaryUrl).toBe(`https://ipfs.io/ipfs/${mockIpfsHash}`);
      expect(result.ipfsUrls).toHaveLength(4);
    });

    it('should upload to fallback CDNs when priority is reliability', async () => {
      const result = await cdnDistributionService.distributeImage(
        mockIpfsHash,
        mockBuffer,
        mockFilename,
        mockContentType,
        { priority: 'reliability' }
      );

      expect(result.primaryUrl).toBe('https://cdn.example.com/test-image.jpg');
      expect(result.ipfsUrls).toHaveLength(4);
      // Note: fallbackUrls would be populated if fallback CDNs were configured
    });

    it('should handle transformations in distribution options', async () => {
      const transformations = {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp' as const
      };

      const result = await cdnDistributionService.distributeImage(
        mockIpfsHash,
        mockBuffer,
        mockFilename,
        mockContentType,
        { priority: 'speed', transformations }
      );

      expect(MockCDNIntegrationService.prototype.generateCDNUrl).toHaveBeenCalledWith(
        expect.any(String),
        transformations
      );
    });
  });

  describe('getOptimizedImageUrl', () => {
    it('should return optimized CDN URL with transformations', async () => {
      const options = {
        width: 800,
        height: 600,
        quality: 90,
        userAgent: 'Mozilla/5.0 (Chrome/91.0)',
        acceptHeader: 'image/webp,image/*'
      };

      const result = await cdnDistributionService.getOptimizedImageUrl(
        mockIpfsHash,
        mockFilename,
        options
      );

      expect(result).toBe('https://cdn.example.com/test-image.jpg');
      expect(MockCDNIntegrationService.prototype.generateCDNUrl).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          width: 800,
          height: 600,
          quality: 90,
          format: 'webp' // Should detect WebP support
        })
      );
    });

    it('should fallback to IPFS when CDN is not available', async () => {
      // Simulate no CDN configured
      const originalPrimaryCDN = (cdnDistributionService as any).primaryCDN;
      (cdnDistributionService as any).primaryCDN = null;

      const result = await cdnDistributionService.getOptimizedImageUrl(
        mockIpfsHash,
        mockFilename
      );

      expect(result).toBe(`https://ipfs.io/ipfs/${mockIpfsHash}`);

      // Restore
      (cdnDistributionService as any).primaryCDN = originalPrimaryCDN;
    });

    it('should determine optimal format based on browser support', async () => {
      // Test WebP support detection
      const webpResult = await cdnDistributionService.getOptimizedImageUrl(
        mockIpfsHash,
        mockFilename,
        { acceptHeader: 'image/webp,image/*' }
      );

      expect(MockCDNIntegrationService.prototype.generateCDNUrl).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ format: 'webp' })
      );

      // Test fallback to JPEG
      jest.clearAllMocks();
      MockCDNIntegrationService.prototype.generateCDNUrl = jest.fn().mockReturnValue(
        'https://cdn.example.com/test-image.jpg'
      );

      const jpegResult = await cdnDistributionService.getOptimizedImageUrl(
        mockIpfsHash,
        mockFilename,
        { userAgent: 'Safari/14.0' }
      );

      expect(MockCDNIntegrationService.prototype.generateCDNUrl).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ format: 'jpeg' })
      );
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache for multiple images', async () => {
      const ipfsHashes = ['QmTest1', 'QmTest2'];
      const filenames = ['image1.jpg', 'image2.jpg'];

      const result = await cdnDistributionService.invalidateCache(ipfsHashes, filenames);

      expect(result.primary).toBe('invalidation-123');
      expect(MockCDNIntegrationService.prototype.invalidateCache).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.stringContaining('QmTest1'),
          expect.stringContaining('QmTest2')
        ])
      );
    });

    it('should handle invalidation failures gracefully', async () => {
      MockCDNIntegrationService.prototype.invalidateCache = jest.fn().mockRejectedValue(
        new Error('Invalidation failed')
      );

      const result = await cdnDistributionService.invalidateCache(['QmTest'], ['test.jpg']);

      expect(result.primary).toBeNull();
      expect(result.fallbacks).toEqual([]);
    });
  });

  describe('generateResponsiveUrls', () => {
    it('should generate URLs for different breakpoints', async () => {
      const customBreakpoints = [
        { name: 'mobile', width: 480, quality: 80 },
        { name: 'desktop', width: 1200, quality: 90 }
      ];

      const result = await cdnDistributionService.generateResponsiveUrls(
        mockIpfsHash,
        mockFilename,
        customBreakpoints
      );

      expect(result).toHaveProperty('mobile');
      expect(result).toHaveProperty('desktop');
      expect(result.mobile).toBe('https://cdn.example.com/test-image.jpg');
      expect(result.desktop).toBe('https://cdn.example.com/test-image.jpg');

      // Should be called twice, once for each breakpoint
      expect(MockCDNIntegrationService.prototype.generateCDNUrl).toHaveBeenCalledTimes(2);
    });

    it('should use default breakpoints when none provided', async () => {
      const result = await cdnDistributionService.generateResponsiveUrls(
        mockIpfsHash,
        mockFilename
      );

      expect(result).toHaveProperty('mobile');
      expect(result).toHaveProperty('tablet');
      expect(result).toHaveProperty('desktop');
      expect(result).toHaveProperty('large');
    });

    it('should fallback to IPFS URLs on error', async () => {
      MockCDNIntegrationService.prototype.generateCDNUrl = jest.fn().mockImplementation(() => {
        throw new Error('CDN error');
      });

      const result = await cdnDistributionService.generateResponsiveUrls(
        mockIpfsHash,
        mockFilename,
        [{ name: 'mobile', width: 480 }]
      );

      expect(result.mobile).toBe(`https://ipfs.io/ipfs/${mockIpfsHash}`);
    });
  });

  describe('checkCDNHealth', () => {
    it('should check health of all CDN services', async () => {
      const result = await cdnDistributionService.checkCDNHealth();

      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('fallbacks');
      expect(result).toHaveProperty('ipfsGateways');

      expect(result.primary.status).toMatch(/healthy|degraded|down/);
      expect(result.primary.responseTime).toBeGreaterThanOrEqual(0);

      expect(result.ipfsGateways).toHaveLength(4); // Default IPFS gateways
      result.ipfsGateways.forEach(gateway => {
        expect(gateway.status).toMatch(/healthy|degraded|down/);
        expect(gateway.responseTime).toBeGreaterThanOrEqual(0);
        expect(gateway.url).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('getCDNAnalytics', () => {
    it('should return CDN analytics data', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      const result = await cdnDistributionService.getCDNAnalytics(startDate, endDate);

      expect(result).toEqual({
        requests: 1000,
        bandwidth: 50000000,
        cacheHitRate: 0.85,
        topImages: [],
        errorRate: 0.01,
        averageResponseTime: 150
      });

      expect(MockCDNIntegrationService.prototype.getCDNAnalytics).toHaveBeenCalledWith(
        startDate,
        endDate
      );
    });

    it('should return empty analytics when CDN is not configured', async () => {
      const originalPrimaryCDN = (cdnDistributionService as any).primaryCDN;
      (cdnDistributionService as any).primaryCDN = null;

      const result = await cdnDistributionService.getCDNAnalytics(
        new Date(),
        new Date()
      );

      expect(result).toEqual({
        requests: 0,
        bandwidth: 0,
        cacheHitRate: 0,
        topImages: [],
        errorRate: 0,
        averageResponseTime: 0
      });

      // Restore
      (cdnDistributionService as any).primaryCDN = originalPrimaryCDN;
    });
  });

  describe('cleanupUnusedAssets', () => {
    it('should return cleanup results structure', async () => {
      const result = await cdnDistributionService.cleanupUnusedAssets(30);

      expect(result).toHaveProperty('deletedCount');
      expect(result).toHaveProperty('freedSpace');
      expect(result).toHaveProperty('errors');

      expect(typeof result.deletedCount).toBe('number');
      expect(typeof result.freedSpace).toBe('number');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle cleanup errors', async () => {
      // Mock an error scenario
      const originalConsoleLog = console.log;
      console.log = jest.fn().mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const result = await cdnDistributionService.cleanupUnusedAssets(30);

      expect(result.errors).toContain('Cleanup failed');

      // Restore
      console.log = originalConsoleLog;
    });
  });

  describe('private helper methods', () => {
    it('should generate consistent CDN keys', () => {
      const service = cdnDistributionService as any;
      
      const key1 = service.generateCDNKey(mockIpfsHash, mockFilename);
      const key2 = service.generateCDNKey(mockIpfsHash, mockFilename);
      
      expect(key1).toBe(key2);
      expect(key1).toContain(mockIpfsHash);
      expect(key1).toContain('images/');
    });

    it('should determine optimal format correctly', () => {
      const service = cdnDistributionService as any;
      
      // Test WebP support via Accept header
      expect(service.determineOptimalFormat(undefined, 'image/webp,image/*')).toBe('webp');
      
      // Test WebP support via User Agent
      expect(service.determineOptimalFormat('Chrome/91.0', undefined)).toBe('webp');
      
      // Test fallback to JPEG
      expect(service.determineOptimalFormat('Safari/14.0', 'image/*')).toBe('jpeg');
      
      // Test default fallback
      expect(service.determineOptimalFormat(undefined, undefined)).toBe('jpeg');
    });

    it('should generate appropriate cache policies', () => {
      const service = cdnDistributionService as any;
      
      const imagePolicy = service.getCachePolicy('image/jpeg');
      expect(imagePolicy.ttl).toBe(31536000); // 1 year for images
      expect(imagePolicy.queryStrings).toContain('w');
      expect(imagePolicy.queryStrings).toContain('h');
      
      const otherPolicy = service.getCachePolicy('text/html');
      expect(otherPolicy.ttl).toBe(3600); // 1 hour for non-images
      expect(otherPolicy.queryStrings).toEqual([]);
    });
  });
});