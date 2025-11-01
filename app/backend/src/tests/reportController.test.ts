import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { reportController } from '../controllers/reportController';
import { reportService } from '../services/reportService';
import { authMiddleware } from '../middleware/authMiddleware';

// Mock the services
vi.mock('../services/reportService', () => ({
  reportService: {
    submitReport: vi.fn(),
    getExistingReport: vi.fn(),
    getReporterWeight: vi.fn(),
    checkAggregationThreshold: vi.fn(),
    getUserReports: vi.fn(),
    getContentReportStatus: vi.fn(),
    getModerationQueue: vi.fn(),
    updateReportStatus: vi.fn(),
    updateReporterReputation: vi.fn(),
    getReportAnalytics: vi.fn(),
    aggregateReportsForContent: vi.fn()
  }
}));

// Mock auth middleware
vi.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  }
}));

describe('ReportController', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(authMiddleware);
    
    // Setup routes
    app.post('/submit', reportController.submitReport);
    app.get('/my-reports', reportController.getUserReports);
    app.get('/status/:contentId', reportController.getReportStatus);
    app.get('/queue', reportController.getModerationQueue);
    app.put('/:reportId/status', reportController.updateReportStatus);
    app.get('/analytics', reportController.getReportAnalytics);
    app.post('/_internal/aggregate', reportController.aggregateReports);
    app.post('/_internal/reputation-update', reportController.updateReporterReputation);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /submit', () => {
    it('should successfully submit a report', async () => {
      const mockReport = {
        id: 1,
        contentId: 'test-content-1',
        reporterId: 'test-user-id'
      };

      (reportService.getExistingReport as any).mockResolvedValue(null);
      (reportService.getReporterWeight as any).mockResolvedValue(1.5);
      (reportService.submitReport as any).mockResolvedValue(mockReport);
      (reportService.checkAggregationThreshold as any).mockResolvedValue(false);

      const response = await request(app)
        .post('/submit')
        .send({
          contentId: 'test-content-1',
          contentType: 'post',
          reason: 'spam',
          details: 'This is spam content'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.reportId).toBe(1);
      expect(reportService.submitReport).toHaveBeenCalledWith({
        contentId: 'test-content-1',
        contentType: 'post',
        reporterId: 'test-user-id',
        reason: 'spam',
        details: 'This is spam content',
        category: undefined,
        weight: 1.5
      });
    });

    it('should return 409 if user already reported content', async () => {
      const existingReport = {
        id: 1,
        contentId: 'test-content-1',
        reporterId: 'test-user-id'
      };

      (reportService.getExistingReport as any).mockResolvedValue(existingReport);

      const response = await request(app)
        .post('/submit')
        .send({
          contentId: 'test-content-1',
          contentType: 'post',
          reason: 'spam'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('You have already reported this content');
      expect(response.body.reportId).toBe(1);
    });

    it('should handle service errors gracefully', async () => {
      (reportService.getExistingReport as any).mockResolvedValue(null);
      (reportService.getReporterWeight as any).mockResolvedValue(1.0);
      (reportService.submitReport as any).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/submit')
        .send({
          contentId: 'test-content-1',
          contentType: 'post',
          reason: 'spam'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to submit report');
    });
  });

  describe('GET /my-reports', () => {
    it('should return user reports with pagination', async () => {
      const mockReports = {
        data: [
          {
            id: 1,
            contentId: 'content-1',
            reason: 'spam',
            status: 'open',
            createdAt: new Date()
          },
          {
            id: 2,
            contentId: 'content-2',
            reason: 'harassment',
            status: 'resolved',
            createdAt: new Date()
          }
        ],
        total: 2
      };

      (reportService.getUserReports as any).mockResolvedValue(mockReports);

      const response = await request(app)
        .get('/my-reports?page=1&limit=20');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.reports).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
      expect(reportService.getUserReports).toHaveBeenCalledWith('test-user-id', 1, 20);
    });

    it('should use default pagination values', async () => {
      const mockReports = { data: [], total: 0 };
      (reportService.getUserReports as any).mockResolvedValue(mockReports);

      const response = await request(app).get('/my-reports');

      expect(response.status).toBe(200);
      expect(reportService.getUserReports).toHaveBeenCalledWith('test-user-id', 1, 20);
    });
  });

  describe('GET /status/:contentId', () => {
    it('should return content report status', async () => {
      const mockStatus = {
        hasReported: true,
        reportCount: 3,
        totalWeight: 4.5,
        status: 'under_review',
        canReport: false
      };

      (reportService.getContentReportStatus as any).mockResolvedValue(mockStatus);

      const response = await request(app).get('/status/test-content-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.hasReported).toBe(true);
      expect(response.body.status).toBe('under_review');
      expect(reportService.getContentReportStatus).toHaveBeenCalledWith('test-content-1', 'test-user-id');
    });
  });

  describe('GET /queue', () => {
    it('should return moderation queue with pagination', async () => {
      const mockQueue = {
        data: [
          {
            id: 1,
            contentId: 'content-1',
            reason: 'spam',
            status: 'under_review',
            reporterHandle: 'user1'
          }
        ],
        total: 1
      };

      (reportService.getModerationQueue as any).mockResolvedValue(mockQueue);

      const response = await request(app)
        .get('/queue?status=under_review&page=1&limit=50');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.reports).toHaveLength(1);
      expect(reportService.getModerationQueue).toHaveBeenCalledWith({
        status: 'under_review',
        page: 1,
        limit: 50
      });
    });
  });

  describe('PUT /:reportId/status', () => {
    it('should update report status successfully', async () => {
      const mockUpdatedReport = {
        id: 1,
        reporterId: 'reporter-id',
        status: 'resolved'
      };

      (reportService.updateReportStatus as any).mockResolvedValue(mockUpdatedReport);
      (reportService.updateReporterReputation as any).mockResolvedValue(undefined);

      const response = await request(app)
        .put('/1/status')
        .send({
          status: 'resolved',
          resolution: 'Content removed',
          moderatorNotes: 'Clear violation'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(reportService.updateReportStatus).toHaveBeenCalledWith(
        1,
        'resolved',
        'test-user-id',
        {
          resolution: 'Content removed',
          moderatorNotes: 'Clear violation'
        }
      );
      expect(reportService.updateReporterReputation).toHaveBeenCalledWith('reporter-id', true);
    });

    it('should update reputation for dismissed reports', async () => {
      const mockUpdatedReport = {
        id: 1,
        reporterId: 'reporter-id',
        status: 'dismissed'
      };

      (reportService.updateReportStatus as any).mockResolvedValue(mockUpdatedReport);
      (reportService.updateReporterReputation as any).mockResolvedValue(undefined);

      const response = await request(app)
        .put('/1/status')
        .send({
          status: 'dismissed',
          resolution: 'No violation found'
        });

      expect(response.status).toBe(200);
      expect(reportService.updateReporterReputation).toHaveBeenCalledWith('reporter-id', false);
    });
  });

  describe('GET /analytics', () => {
    it('should return report analytics', async () => {
      const mockAnalytics = {
        totalReports: 100,
        openReports: 25,
        resolvedReports: 60,
        dismissedReports: 15,
        averageResolutionTime: 24.5,
        topReasons: [
          { reason: 'spam', count: 40 },
          { reason: 'harassment', count: 25 }
        ],
        reportsByDay: [
          { date: '2024-01-01', count: 5 },
          { date: '2024-01-02', count: 8 }
        ],
        falsePositiveRate: 0.15
      };

      (reportService.getReportAnalytics as any).mockResolvedValue(mockAnalytics);

      const response = await request(app).get('/analytics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analytics.totalReports).toBe(100);
      expect(response.body.analytics.falsePositiveRate).toBe(0.15);
    });
  });

  describe('POST /_internal/aggregate', () => {
    it('should aggregate reports for content', async () => {
      const mockResult = {
        escalated: true,
        totalWeight: 4.5,
        reportCount: 3
      };

      (reportService.aggregateReportsForContent as any).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/_internal/aggregate')
        .send({ contentId: 'test-content-1' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.escalated).toBe(true);
      expect(response.body.totalWeight).toBe(4.5);
    });
  });

  describe('POST /_internal/reputation-update', () => {
    it('should update reporter reputation', async () => {
      (reportService.updateReporterReputation as any).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/_internal/reputation-update')
        .send({
          reporterId: 'user-1',
          isAccurate: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(reportService.updateReporterReputation).toHaveBeenCalledWith('user-1', true);
    });
  });
});
