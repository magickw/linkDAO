import request from 'supertest';
import express from 'express';
import customScamDetectionRoutes from '../routes/customScamDetectionRoutes';

// Mock auth middleware for testing
jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

describe('Custom Scam Detection Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/scam-detection', customScamDetectionRoutes);
  });

  describe('POST /api/scam-detection/analyze', () => {
    it('should analyze content and return results', async () => {
      const response = await request(app)
        .post('/api/scam-detection/analyze')
        .send({
          text: 'This is a normal message about cryptocurrency',
          metadata: { contentId: 'test-1' }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.isScam).toBe(false);
      expect(response.body.result.category).toBe('clean');
    });

    it('should detect scam content', async () => {
      const response = await request(app)
        .post('/api/scam-detection/analyze')
        .send({
          text: 'Elon Musk Bitcoin giveaway! Send 1 BTC get 10 back!',
          metadata: { contentId: 'test-2' }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result.isScam).toBe(true);
      expect(response.body.result.confidence).toBeGreaterThan(0);
    });

    it('should return 400 for missing content', async () => {
      const response = await request(app)
        .post('/api/scam-detection/analyze')
        .send({
          metadata: { contentId: 'test-3' }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should handle user profile data', async () => {
      const response = await request(app)
        .post('/api/scam-detection/analyze')
        .send({
          text: 'Official announcement from our team',
          userProfile: {
            handle: 'coinbase_official',
            reputation: 0,
            accountAge: 1
          },
          metadata: { contentId: 'test-4' }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toBeDefined();
    });
  });

  describe('POST /api/scam-detection/batch-analyze', () => {
    it('should analyze multiple contents', async () => {
      const contents = [
        {
          text: 'Normal crypto discussion',
          metadata: { contentId: 'batch-1' }
        },
        {
          text: 'Bitcoin giveaway scam!',
          metadata: { contentId: 'batch-2' }
        },
        {
          text: 'Another normal message',
          metadata: { contentId: 'batch-3' }
        }
      ];

      const response = await request(app)
        .post('/api/scam-detection/batch-analyze')
        .send({ contents });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(3);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.total).toBe(3);
    });

    it('should return 400 for empty contents array', async () => {
      const response = await request(app)
        .post('/api/scam-detection/batch-analyze')
        .send({ contents: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('empty');
    });

    it('should return 400 for too many contents', async () => {
      const contents = Array.from({ length: 101 }, (_, i) => ({
        text: `Message ${i}`,
        metadata: { contentId: `batch-${i}` }
      }));

      const response = await request(app)
        .post('/api/scam-detection/batch-analyze')
        .send({ contents });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Maximum 100');
    });

    it('should handle mixed success and failure in batch', async () => {
      const contents = [
        {
          text: 'Valid content',
          metadata: { contentId: 'valid-1' }
        },
        {
          // Invalid content that might cause processing error
          text: null,
          metadata: { contentId: 'invalid-1' }
        }
      ];

      const response = await request(app)
        .post('/api/scam-detection/batch-analyze')
        .send({ contents });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.summary.total).toBe(2);
    });
  });

  describe('GET /api/scam-detection/statistics', () => {
    it('should return statistics', async () => {
      const response = await request(app)
        .get('/api/scam-detection/statistics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.totalAnalyzed).toBeDefined();
      expect(response.body.statistics.scamsDetected).toBeDefined();
      expect(response.body.statistics.patternBreakdown).toBeDefined();
    });
  });

  describe('GET /api/scam-detection/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/scam-detection/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.testResult).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should not require authentication', async () => {
      // This test ensures the health endpoint is public
      const response = await request(app)
        .get('/api/scam-detection/health');

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/scam-detection/analyze')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });

    it('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/scam-detection/analyze')
        .send();

      expect(response.status).toBe(400);
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/scam-detection/analyze')
          .send({
            text: `Concurrent test message ${i}`,
            metadata: { contentId: `concurrent-${i}` }
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/scam-detection/analyze')
        .send({
          text: 'Performance test message with some crypto content',
          metadata: { contentId: 'performance-test' }
        });

      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});