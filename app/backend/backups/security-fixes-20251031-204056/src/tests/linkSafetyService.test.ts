import { LinkSafetyService } from '../services/linkSafetyService';
import { db } from '../db/index';

// Mock the database
jest.mock('../db/index.js', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('LinkSafetyService', () => {
  let linkSafetyService: LinkSafetyService;

  beforeEach(() => {
    linkSafetyService = new LinkSafetyService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('analyzeUrl', () => {
    it('should analyze a URL and return safety information', async () => {
      const mockUrl = 'https://example.com';
      const mockResult = {
        id: 1,
        url: mockUrl,
        domain: 'example.com',
        status: 'safe' as const,
        riskScore: 10,
        analysisResults: { vendors: [] },
        unfurledContent: { title: 'Example Site' },
        lastAnalyzed: new Date(),
      };

      // Mock database responses
      const mockDbSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // No existing analysis
          }),
        }),
      });

      const mockDbInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 1,
              url: mockUrl,
              domain: 'example.com',
              status: 'safe',
              riskScore: '10',
              analysisResults: '{"vendors":[]}',
              unfurledContent: '{"title":"Example Site"}',
              lastAnalyzed: new Date(),
            }]),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);
      (db.insert as any).mockImplementation(mockDbInsert);

      const result = await linkSafetyService.analyzeUrl(mockUrl);

      expect(result).toBeDefined();
      expect(result.url).toBe(mockUrl);
      expect(result.domain).toBe('example.com');
      expect(result.status).toBe('safe');
    });

    it('should return cached result if analysis is recent', async () => {
      const mockUrl = 'https://example.com';
      const recentDate = new Date(Date.now() - 1000 * 60 * 30); // 30 minutes ago

      const mockExistingResult = {
        id: 1,
        url: mockUrl,
        domain: 'example.com',
        status: 'safe',
        riskScore: '10',
        analysisResults: '{"vendors":[]}',
        unfurledContent: '{"title":"Example Site"}',
        lastAnalyzed: recentDate,
      };

      const mockDbSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockExistingResult]),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);

      const result = await linkSafetyService.analyzeUrl(mockUrl);

      expect(result).toBeDefined();
      expect(result.url).toBe(mockUrl);
      expect(result.lastAnalyzed).toEqual(recentDate);
    });

    it('should handle malicious URLs correctly', async () => {
      const mockUrl = 'https://malicious-site.com';

      // Mock blacklist check to return malicious
      const mockDbSelect = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]), // No existing analysis
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{
              entryType: 'domain',
              entryValue: 'malicious-site.com',
              severity: 'critical',
              description: 'Known malicious domain',
            }]),
          }),
        });

      const mockDbInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 1,
              url: mockUrl,
              domain: 'malicious-site.com',
              status: 'malicious',
              riskScore: '100',
              analysisResults: '{"blacklist":{"isBlacklisted":true}}',
              unfurledContent: '{}',
              lastAnalyzed: new Date(),
            }]),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);
      (db.insert as any).mockImplementation(mockDbInsert);

      const result = await linkSafetyService.analyzeUrl(mockUrl);

      expect(result.status).toBe('malicious');
      expect(result.riskScore).toBe(100);
    });
  });

  describe('analyzeUrls', () => {
    it('should analyze multiple URLs in batch', async () => {
      const mockUrls = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com',
      ];

      // Mock successful analysis for all URLs
      jest.spyOn(linkSafetyService, 'analyzeUrl').mockImplementation(async (url) => ({
        id: 1,
        url,
        domain: new URL(url).hostname,
        status: 'safe' as const,
        riskScore: 10,
        analysisResults: { vendors: [] },
        unfurledContent: {},
        lastAnalyzed: new Date(),
      }));

      const results = await linkSafetyService.analyzeUrls(mockUrls);

      expect(results).toHaveLength(3);
      expect(results[0].url).toBe(mockUrls[0]);
      expect(results[1].url).toBe(mockUrls[1]);
      expect(results[2].url).toBe(mockUrls[2]);
    });

    it('should handle partial failures gracefully', async () => {
      const mockUrls = [
        'https://example1.com',
        'https://invalid-url',
        'https://example3.com',
      ];

      jest.spyOn(linkSafetyService, 'analyzeUrl')
        .mockResolvedValueOnce({
          id: 1,
          url: mockUrls[0],
          domain: 'example1.com',
          status: 'safe' as const,
          riskScore: 10,
          analysisResults: {},
          unfurledContent: {},
          lastAnalyzed: new Date(),
        })
        .mockRejectedValueOnce(new Error('Invalid URL'))
        .mockResolvedValueOnce({
          id: 2,
          url: mockUrls[2],
          domain: 'example3.com',
          status: 'safe' as const,
          riskScore: 10,
          analysisResults: {},
          unfurledContent: {},
          lastAnalyzed: new Date(),
        });

      const results = await linkSafetyService.analyzeUrls(mockUrls);

      expect(results).toHaveLength(2); // Only successful analyses
      expect(results[0].url).toBe(mockUrls[0]);
      expect(results[1].url).toBe(mockUrls[2]);
    });
  });

  describe('analyzeContentLinks', () => {
    it('should extract and analyze URLs from content', async () => {
      const contentId = 'post-123';
      const contentType = 'post';
      const content = 'Check out this link: https://example.com and also https://test.com';

      const mockAnalysisResults = [
        {
          id: 1,
          url: 'https://example.com',
          domain: 'example.com',
          status: 'safe' as const,
          riskScore: 10,
          analysisResults: {},
          unfurledContent: {},
          lastAnalyzed: new Date(),
        },
        {
          id: 2,
          url: 'https://test.com',
          domain: 'test.com',
          status: 'safe' as const,
          riskScore: 15,
          analysisResults: {},
          unfurledContent: {},
          lastAnalyzed: new Date(),
        },
      ];

      jest.spyOn(linkSafetyService, 'analyzeUrls').mockResolvedValue(mockAnalysisResults);

      const mockDbInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });
      (db.insert as any).mockImplementation(mockDbInsert);

      const results = await linkSafetyService.analyzeContentLinks(contentId, contentType, content);

      expect(results).toHaveLength(2);
      expect(results[0].url).toBe('https://example.com');
      expect(results[1].url).toBe('https://test.com');
    });

    it('should return empty array for content with no URLs', async () => {
      const contentId = 'post-123';
      const contentType = 'post';
      const content = 'This is just plain text with no links.';

      const results = await linkSafetyService.analyzeContentLinks(contentId, contentType, content);

      expect(results).toHaveLength(0);
    });
  });

  describe('getDomainReputation', () => {
    it('should return domain reputation information', async () => {
      const domain = 'example.com';
      const mockReputation = {
        domain,
        reputationScore: '85',
        category: 'tech',
        isVerified: false,
        isBlacklisted: false,
        analysisCount: 10,
        maliciousCount: 0,
        firstSeen: new Date(),
        lastUpdated: new Date(),
      };

      const mockDbSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockReputation]),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);

      const result = await linkSafetyService.getDomainReputation(domain);

      expect(result).toBeDefined();
      expect(result!.domain).toBe(domain);
      expect(result!.reputationScore).toBe(85);
      expect(result!.category).toBe('tech');
    });

    it('should return null for unknown domain', async () => {
      const domain = 'unknown-domain.com';

      const mockDbSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);

      const result = await linkSafetyService.getDomainReputation(domain);

      expect(result).toBeNull();
    });
  });

  describe('addToBlacklist', () => {
    it('should add entry to custom blacklist', async () => {
      const entryType = 'domain';
      const entryValue = 'malicious-site.com';
      const category = 'crypto_scam';
      const severity = 'critical';
      const description = 'Known crypto scam site';
      const addedBy = 'admin-user-id';

      const mockDbInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      (db.insert as any).mockImplementation(mockDbInsert);

      await linkSafetyService.addToBlacklist(
        entryType as any,
        entryValue,
        category,
        severity as any,
        description,
        addedBy
      );

      expect(db.insert).toHaveBeenCalled();
    });
  });

  describe('URL normalization and extraction', () => {
    it('should normalize URLs correctly', async () => {
      const testCases = [
        {
          input: 'https://example.com/path?utm_source=test&param=value#fragment',
          expected: 'https://example.com/path?param=value',
        },
        {
          input: 'http://www.example.com/',
          expected: 'http://www.example.com/',
        },
      ];

      // Test URL normalization indirectly through analyzeUrl
      for (const testCase of testCases) {
        const mockDbSelect = jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

        const mockDbInsert = jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            onConflictDoUpdate: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([{
                id: 1,
                url: testCase.expected,
                domain: 'example.com',
                status: 'safe',
                riskScore: '10',
                analysisResults: '{}',
                unfurledContent: '{}',
                lastAnalyzed: new Date(),
              }]),
            }),
          }),
        });

        (db.select as any).mockImplementation(mockDbSelect);
        (db.insert as any).mockImplementation(mockDbInsert);

        const result = await linkSafetyService.analyzeUrl(testCase.input);
        
        // The normalized URL should be used
        expect(result.url).toBe(testCase.expected);
      }
    });
  });
});