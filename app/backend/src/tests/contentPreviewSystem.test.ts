import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { contentPreviewService } from '../services/contentPreviewService';
import { securityScanService } from '../services/securityScanService';
import { linkScraperService } from '../services/linkScraperService';
import { nftDataService } from '../services/nftDataService';
import { tokenDataService } from '../services/tokenDataService';
import { governanceService } from '../services/governanceService';

// Mock external dependencies
jest.mock('axios');

describe('Content Preview System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ContentPreviewService', () => {
    it('should detect NFT URLs correctly', async () => {
      const nftUrl = 'https://opensea.io/assets/ethereum/0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d/1';
      
      // Mock NFT data service
      jest.spyOn(nftDataService, 'getFromOpensea').mockResolvedValue({
        name: 'Test NFT',
        description: 'Test Description',
        image: 'https://example.com/image.png',
        collection: 'Test Collection',
        owner: '0x1234567890123456789012345678901234567890'
      });

      jest.spyOn(nftDataService, 'getFromAlchemy').mockRejectedValue(new Error('Not found'));
      jest.spyOn(securityScanService, 'scanUrl').mockResolvedValue({
        status: 'safe',
        score: 95,
        threats: [],
        recommendations: [],
        scannedAt: new Date()
      });

      const preview = await contentPreviewService.generatePreview(nftUrl);

      expect(preview.type).toBe('nft');
      expect(preview.data.name).toBe('Test NFT');
      expect(preview.securityStatus).toBe('safe');
    });

    it('should detect proposal URLs correctly', async () => {
      const proposalUrl = 'https://snapshot.org/#/ens.eth/proposal/0x123456789';
      
      // Mock governance service
      jest.spyOn(governanceService, 'getProposal').mockResolvedValue({
        id: '0x123456789',
        title: 'Test Proposal',
        description: 'Test proposal description',
        status: 'active',
        votingEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        votingStarts: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        yesVotes: 1000,
        noVotes: 500,
        quorum: 800,
        proposer: '0x1234567890123456789012345678901234567890',
        category: 'governance',
        requiredMajority: 50
      });

      jest.spyOn(securityScanService, 'scanUrl').mockResolvedValue({
        status: 'safe',
        score: 100,
        threats: [],
        recommendations: [],
        scannedAt: new Date()
      });

      const preview = await contentPreviewService.generatePreview(proposalUrl);

      expect(preview.type).toBe('proposal');
      expect(preview.data.title).toBe('Test Proposal');
      expect(preview.data.status).toBe('active');
    });

    it('should detect token URLs correctly', async () => {
      const tokenUrl = 'https://etherscan.io/token/0xa0b86a33e6441e6c8c7c4b4c8c4b4c8c4b4c8c4b';
      
      // Mock token data service
      jest.spyOn(tokenDataService, 'getTokenInfo').mockResolvedValue({
        symbol: 'TEST',
        name: 'Test Token',
        usdValue: 1.25,
        change24h: 5.67,
        logo: 'https://example.com/logo.png',
        decimals: 18,
        verified: true
      });

      jest.spyOn(securityScanService, 'scanUrl').mockResolvedValue({
        status: 'safe',
        score: 90,
        threats: [],
        recommendations: [],
        scannedAt: new Date()
      });

      const preview = await contentPreviewService.generatePreview(tokenUrl);

      expect(preview.type).toBe('token');
      expect(preview.data.symbol).toBe('TEST');
      expect(preview.data.verified).toBe(true);
    });

    it('should handle link URLs correctly', async () => {
      const linkUrl = 'https://example.com/article';
      
      // Mock link scraper service
      jest.spyOn(linkScraperService, 'scrapeUrl').mockResolvedValue({
        title: 'Test Article',
        description: 'Test article description',
        image: 'https://example.com/image.png',
        siteName: 'Example Site',
        type: 'article',
        securityScore: 85
      });

      jest.spyOn(securityScanService, 'scanUrl').mockResolvedValue({
        status: 'safe',
        score: 85,
        threats: [],
        recommendations: [],
        scannedAt: new Date()
      });

      const preview = await contentPreviewService.generatePreview(linkUrl);

      expect(preview.type).toBe('link');
      expect(preview.data.title).toBe('Test Article');
      expect(preview.data.type).toBe('article');
    });

    it('should cache previews correctly', async () => {
      const url = 'https://example.com/test';
      
      jest.spyOn(linkScraperService, 'scrapeUrl').mockResolvedValue({
        title: 'Cached Test',
        description: 'Test description',
        siteName: 'Example',
        securityScore: 90
      });

      jest.spyOn(securityScanService, 'scanUrl').mockResolvedValue({
        status: 'safe',
        score: 90,
        threats: [],
        recommendations: [],
        scannedAt: new Date()
      });

      // First call should generate preview
      const preview1 = await contentPreviewService.generatePreview(url, { cacheEnabled: true });
      expect(preview1.cached).toBe(false);

      // Second call should return cached version
      const preview2 = await contentPreviewService.generatePreview(url, { cacheEnabled: true });
      expect(preview2.cached).toBe(true);

      // Verify scraper was only called once
      expect(linkScraperService.scrapeUrl).toHaveBeenCalledTimes(1);
    });

    it('should handle blocked domains', async () => {
      const blockedUrl = 'https://malicious-site.com/test';
      
      await expect(
        contentPreviewService.generatePreview(blockedUrl, {
          blockedDomains: ['malicious-site.com']
        })
      ).rejects.toThrow('Domain is blocked for security reasons');
    });
  });

  describe('SecurityScanService', () => {
    it('should detect blocked domains', async () => {
      const result = await securityScanService.scanUrl('https://malicious-site.com/test');
      
      expect(result.status).toBe('blocked');
      expect(result.score).toBe(0);
      expect(result.threats).toContain('Domain is on blocklist');
    });

    it('should detect suspicious patterns', async () => {
      const result = await securityScanService.scanUrl('https://192.168.1.1/free-crypto-claim-now');
      
      expect(result.status).toBe('warning');
      expect(result.score).toBeLessThan(80);
      expect(result.threats.length).toBeGreaterThan(0);
    });

    it('should prefer HTTPS URLs', async () => {
      const httpResult = await securityScanService.scanUrl('http://example.com');
      const httpsResult = await securityScanService.scanUrl('https://example.com');
      
      expect(httpsResult.score).toBeGreaterThan(httpResult.score);
      expect(httpResult.threats).toContain('Non-HTTPS connection');
    });
  });

  describe('LinkScraperService', () => {
    it('should extract basic metadata', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Test Page</title>
            <meta name="description" content="Test description">
            <meta property="og:image" content="https://example.com/image.png">
            <meta property="og:site_name" content="Test Site">
          </head>
          <body>
            <h1>Test Content</h1>
          </body>
        </html>
      `;

      // Mock axios response
      const axios = require('axios');
      axios.get.mockResolvedValue({
        data: mockHtml,
        headers: {
          'content-type': 'text/html'
        }
      });

      const result = await linkScraperService.scrapeUrl('https://example.com');

      expect(result.title).toBe('Test Page');
      expect(result.description).toBe('Test description');
      expect(result.image).toBe('https://example.com/image.png');
      expect(result.siteName).toBe('Test Site');
    });

    it('should handle scraping errors gracefully', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await linkScraperService.scrapeUrl('https://example.com');

      expect(result.title).toBe('Unable to load title');
      expect(result.description).toBe('Content could not be retrieved');
      expect(result.securityScore).toBe(0);
    });
  });

  describe('NFTDataService', () => {
    it('should combine data from multiple sources', async () => {
      const mockOpenseaData = {
        name: 'OpenSea NFT',
        description: 'From OpenSea',
        image_url: 'https://opensea.com/image.png',
        collection: { name: 'OpenSea Collection' },
        owner: { address: '0x123' },
        traits: [{ trait_type: 'Color', value: 'Blue' }]
      };

      const mockAlchemyData = {
        title: 'Alchemy NFT',
        description: 'From Alchemy',
        media: [{ gateway: 'https://alchemy.com/image.png' }],
        contractMetadata: { name: 'Alchemy Collection' },
        owners: ['0x456'],
        metadata: { attributes: [{ trait_type: 'Size', value: 'Large' }] }
      };

      jest.spyOn(nftDataService, 'getFromOpensea').mockResolvedValue(mockOpenseaData);
      jest.spyOn(nftDataService, 'getFromAlchemy').mockResolvedValue(mockAlchemyData);

      const result = await nftDataService.getFromOpensea('0xtest', '1');

      expect(result.name).toBe('OpenSea NFT');
      expect(result.collection).toBe('OpenSea Collection');
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = contentPreviewService.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('urls');
      expect(Array.isArray(stats.urls)).toBe(true);
    });

    it('should clear cache', async () => {
      // Generate a cached preview first
      jest.spyOn(linkScraperService, 'scrapeUrl').mockResolvedValue({
        title: 'Test',
        siteName: 'Test',
        securityScore: 90
      });
      jest.spyOn(securityScanService, 'scanUrl').mockResolvedValue({
        status: 'safe',
        score: 90,
        threats: [],
        recommendations: [],
        scannedAt: new Date()
      });

      await contentPreviewService.generatePreview('https://test.com', { cacheEnabled: true });
      
      let stats = contentPreviewService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      await contentPreviewService.clearCache();
      
      stats = contentPreviewService.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
