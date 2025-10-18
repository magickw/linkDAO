import request from 'supertest';
import express from 'express';
import linkSafetyRoutes from '../routes/linkSafetyRoutes';
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

// Mock auth middleware
jest.mock('../middleware/authMiddleware.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  },
}));

describe('Link Safety Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/link-safety', linkSafetyRoutes);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/link-safety/analyze', () => {
    it('should analyze a single URL successfully', async () => {
      const mockAnalysisResult = {
        id: 1,
        url: 'https://example.com',
        domain: 'example.com',
        status: 'safe',
        riskScore: '10',
        analysisResults: '{"vendors":[]}',
        unfurledContent: '{"title":"Example Site"}',
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
            returning: jest.fn().mockResolvedValue([mockAnalysisResult]),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);
      (db.insert as any).mockImplementation(mockDbInsert);

      const response = await request(app)
        .post('/api/link-safety/analyze')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBe('https://example.com');
      expect(response.body.data.status).toBe('safe');
    });

    it('should return 400 for invalid URL', async () => {
      const response = await request(app)
        .post('/api/link-safety/analyze')
        .send({ url: 'not-a-valid-url' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing URL', async () => {
      const response = await request(app)
        .post('/api/link-safety/analyze')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('URL is required');
    });
  });

  describe('POST /api/link-safety/analyze/batch', () => {
    it('should analyze multiple URLs successfully', async () => {
      const urls = [
        'https://example1.com',
        'https://example2.com',
        'https://example3.com',
      ];

      const mockResults = urls.map((url, index) => ({
        id: index + 1,
        url,
        domain: new URL(url).hostname,
        status: 'safe',
        riskScore: '10',
        analysisResults: '{"vendors":[]}',
        unfurledContent: '{}',
        lastAnalyzed: new Date(),
      }));

      // Mock database responses for each URL
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
            returning: jest.fn().mockImplementation(() => 
              Promise.resolve([mockResults.shift()])
            ),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);
      (db.insert as any).mockImplementation(mockDbInsert);

      const response = await request(app)
        .post('/api/link-safety/analyze/batch')
        .send({ urls });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.processed).toBe(3);
      expect(response.body.total).toBe(3);
    });

    it('should return 400 for too many URLs', async () => {
      const urls = Array.from({ length: 101 }, (_, i) => `https://example${i}.com`);

      const response = await request(app)
        .post('/api/link-safety/analyze/batch')
        .send({ urls });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Maximum 100 URLs allowed per batch');
    });

    it('should return 400 for invalid URLs array', async () => {
      const response = await request(app)
        .post('/api/link-safety/analyze/batch')
        .send({ urls: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/link-safety/analyze/content', () => {
    it('should analyze links in content successfully', async () => {
      const contentId = 'post-123';
      const contentType = 'post';
      const content = 'Check out https://example.com and https://test.com';

      const mockResults = [
        {
          id: 1,
          url: 'https://example.com',
          domain: 'example.com',
          status: 'safe',
          riskScore: '10',
          analysisResults: '{}',
          unfurledContent: '{}',
          lastAnalyzed: new Date(),
        },
        {
          id: 2,
          url: 'https://test.com',
          domain: 'test.com',
          status: 'safe',
          riskScore: '15',
          analysisResults: '{}',
          unfurledContent: '{}',
          lastAnalyzed: new Date(),
        },
      ];

      // Mock database responses
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
            returning: jest.fn().mockImplementation(() => 
              Promise.resolve([mockResults.shift()])
            ),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);
      (db.insert as any).mockImplementation(mockDbInsert);

      const response = await request(app)
        .post('/api/link-safety/analyze/content')
        .send({ contentId, contentType, content });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.linksFound).toBe(2);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/link-safety/analyze/content')
        .send({ contentId: 'post-123' }); // Missing contentType and content

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for invalid content type', async () => {
      const response = await request(app)
        .post('/api/link-safety/analyze/content')
        .send({
          contentId: 'post-123',
          contentType: 'invalid-type',
          content: 'Some content',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/link-safety/domain/:domain/reputation', () => {
    it('should return domain reputation successfully', async () => {
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

      const response = await request(app)
        .get(`/api/link-safety/domain/${domain}/reputation`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.domain).toBe(domain);
      expect(response.body.data.reputationScore).toBe(85);
    });

    it('should return 404 for unknown domain', async () => {
      const domain = 'unknown-domain.com';

      const mockDbSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);

      const response = await request(app)
        .get(`/api/link-safety/domain/${domain}/reputation`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Domain reputation not found');
    });

    it('should return 400 for invalid domain format', async () => {
      const response = await request(app)
        .get('/api/link-safety/domain/invalid-domain/reputation');

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/link-safety/blacklist', () => {
    it('should add entry to blacklist successfully', async () => {
      const mockDbInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      (db.insert as any).mockImplementation(mockDbInsert);

      const response = await request(app)
        .post('/api/link-safety/blacklist')
        .send({
          entryType: 'domain',
          entryValue: 'malicious-site.com',
          category: 'crypto_scam',
          severity: 'critical',
          description: 'Known crypto scam site',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Entry added to blacklist successfully');
    });

    it('should return 400 for invalid entry type', async () => {
      const response = await request(app)
        .post('/api/link-safety/blacklist')
        .send({
          entryType: 'invalid-type',
          entryValue: 'malicious-site.com',
          category: 'crypto_scam',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/link-safety/blacklist')
        .send({
          entryType: 'domain',
          // Missing entryValue and category
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/link-safety/monitoring/alerts', () => {
    it('should return monitoring alerts successfully', async () => {
      const mockAlerts = [
        {
          alert: {
            id: 1,
            urlAnalysisId: 1,
            alertType: 'reputation_change',
            severity: 'high',
            description: 'Domain reputation declined',
            affectedContentCount: 5,
            isResolved: false,
            createdAt: new Date(),
            resolvedAt: null,
          },
          url: 'https://example.com',
          domain: 'example.com',
        },
      ];

      const mockDbSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(mockAlerts),
              }),
            }),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);

      const response = await request(app)
        .get('/api/link-safety/monitoring/alerts');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.count).toBe(1);
    });

    it('should filter alerts by severity', async () => {
      const mockDbSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);

      const response = await request(app)
        .get('/api/link-safety/monitoring/alerts?severity=critical');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/link-safety/monitoring/stats', () => {
    it('should return monitoring statistics successfully', async () => {
      const mockStats = [
        {
          total: 10,
          critical: 2,
          high: 3,
          medium: 4,
          low: 1,
        },
      ];

      const mockAlertsByType = [
        { alertType: 'reputation_change', count: 5 },
        { alertType: 'new_threat_detected', count: 3 },
      ];

      const mockRecentTrends = [
        {
          newLast24h: 5,
          resolvedLast24h: 3,
          avgResolutionTime: 2.5,
        },
      ];

      const mockDbSelect = jest.fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(mockStats),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockResolvedValue(mockAlertsByType),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockResolvedValue(mockRecentTrends),
        });

      (db.select as any).mockImplementation(mockDbSelect);

      const response = await request(app)
        .get('/api/link-safety/monitoring/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalActiveAlerts).toBe(10);
      expect(response.body.data.criticalAlerts).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockDbSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Database error')),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);

      const response = await request(app)
        .post('/api/link-safety/analyze')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to analyze URL');
    });

    it('should handle service errors gracefully', async () => {
      // Mock a service that throws an error
      const mockDbSelect = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Service unavailable')),
          }),
        }),
      });

      (db.select as any).mockImplementation(mockDbSelect);

      const response = await request(app)
        .get('/api/link-safety/domain/example.com/reputation');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to get domain reputation');
    });
  });
});
