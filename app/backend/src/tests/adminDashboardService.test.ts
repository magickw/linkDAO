import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AdminDashboardService } from '../services/adminDashboardService';
import { db } from '../db';

// Mock database
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    groupBy: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    count: jest.fn()
  }
}));

// Mock WebSocket service
jest.mock('../services/adminWebSocketService', () => ({
  AdminWebSocketService: {
    broadcastMetrics: jest.fn(),
    broadcastAlert: jest.fn()
  }
}));

describe('AdminDashboardService', () => {
  let adminDashboardService: AdminDashboardService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = jest.mocked(db);
    adminDashboardService = new AdminDashboardService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getRealTimeMetrics', () => {
    it('should return current platform metrics', async () => {
      // Mock database responses
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 150 }])
        })
      });

      const metrics = await adminDashboardService.getRealTimeMetrics();

      expect(metrics).toHaveProperty('realTimeUsers');
      expect(metrics).toHaveProperty('systemHealth');
      expect(metrics).toHaveProperty('moderationQueue');
      expect(metrics).toHaveProperty('sellerMetrics');
      expect(metrics).toHaveProperty('disputeStats');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(adminDashboardService.getRealTimeMetrics())
        .rejects.toThrow('Failed to fetch real-time metrics');
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      const health = await adminDashboardService.getSystemHealth();

      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('components');
      expect(health).toHaveProperty('alerts');
      expect(health).toHaveProperty('performance');
      expect(['healthy', 'degraded', 'critical']).toContain(health.overall);
    });

    it('should detect system issues', async () => {
      // Mock unhealthy system state
      jest.spyOn(adminDashboardService as any, 'checkDatabaseHealth')
        .mockResolvedValue({ status: 'critical', responseTime: 5000 });

      const health = await adminDashboardService.getSystemHealth();

      expect(health.overall).toBe('critical');
      expect(health.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('getModerationQueueStats', () => {
    it('should return moderation queue statistics', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            { status: 'pending', count: 5 },
            { status: 'processed', count: 100 }
          ])
        })
      });

      const stats = await adminDashboardService.getModerationQueueStats();

      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processed');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(typeof stats.pending).toBe('number');
    });
  });

  describe('getSellerMetrics', () => {
    it('should return seller performance metrics', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            { status: 'active', count: 25 },
            { status: 'pending', count: 3 }
          ])
        })
      });

      const metrics = await adminDashboardService.getSellerMetrics();

      expect(metrics).toHaveProperty('active');
      expect(metrics).toHaveProperty('pending');
      expect(metrics).toHaveProperty('totalRevenue');
      expect(metrics).toHaveProperty('averageRating');
    });
  });

  describe('getDisputeStats', () => {
    it('should return dispute resolution statistics', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            { status: 'open', count: 2 },
            { status: 'resolved', count: 15 }
          ])
        })
      });

      const stats = await adminDashboardService.getDisputeStats();

      expect(stats).toHaveProperty('open');
      expect(stats).toHaveProperty('resolved');
      expect(stats).toHaveProperty('averageResolutionTime');
      expect(stats).toHaveProperty('satisfactionRate');
    });
  });

  describe('getAIInsights', () => {
    it('should return AI-generated insights', async () => {
      const insights = await adminDashboardService.getAIInsights();

      expect(Array.isArray(insights)).toBe(true);
      insights.forEach(insight => {
        expect(insight).toHaveProperty('id');
        expect(insight).toHaveProperty('type');
        expect(insight).toHaveProperty('severity');
        expect(insight).toHaveProperty('title');
        expect(insight).toHaveProperty('description');
        expect(insight).toHaveProperty('confidence');
      });
    });

    it('should filter insights by severity', async () => {
      const criticalInsights = await adminDashboardService.getAIInsights('critical');

      criticalInsights.forEach(insight => {
        expect(insight.severity).toBe('critical');
      });
    });
  });

  describe('updateDashboardLayout', () => {
    it('should save dashboard layout preferences', async () => {
      const layout = {
        widgets: [
          { id: 'metrics', x: 0, y: 0, w: 6, h: 4 },
          { id: 'charts', x: 6, y: 0, w: 6, h: 4 }
        ]
      };

      await expect(adminDashboardService.updateDashboardLayout('admin-123', layout))
        .resolves.not.toThrow();
    });
  });

  describe('getDashboardLayout', () => {
    it('should retrieve saved dashboard layout', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{
            layout: JSON.stringify({
              widgets: [{ id: 'metrics', x: 0, y: 0, w: 6, h: 4 }]
            })
          }])
        })
      });

      const layout = await adminDashboardService.getDashboardLayout('admin-123');

      expect(layout).toHaveProperty('widgets');
      expect(Array.isArray(layout.widgets)).toBe(true);
    });

    it('should return default layout if none saved', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      const layout = await adminDashboardService.getDashboardLayout('admin-123');

      expect(layout).toHaveProperty('widgets');
      expect(layout.widgets.length).toBeGreaterThan(0);
    });
  });

  describe('generateAlert', () => {
    it('should create and broadcast system alert', async () => {
      const alert = {
        type: 'system_overload',
        severity: 'high' as const,
        message: 'CPU usage exceeds 90%',
        metadata: { cpu: 95, memory: 80 }
      };

      await adminDashboardService.generateAlert(alert);

      expect(require('../services/adminWebSocketService').AdminWebSocketService.broadcastAlert)
        .toHaveBeenCalledWith(expect.objectContaining({
          type: 'system_overload',
          severity: 'high',
          message: 'CPU usage exceeds 90%'
        }));
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return system performance data', async () => {
      const metrics = await adminDashboardService.getPerformanceMetrics();

      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('disk');
      expect(metrics).toHaveProperty('network');
      expect(metrics).toHaveProperty('responseTime');
      expect(metrics).toHaveProperty('throughput');
    });
  });

  describe('getActivityLog', () => {
    it('should return recent admin activities', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: '1',
                adminId: 'admin-123',
                action: 'user_banned',
                timestamp: new Date(),
                metadata: {}
              }
            ])
          })
        })
      });

      const activities = await adminDashboardService.getActivityLog();

      expect(Array.isArray(activities)).toBe(true);
      activities.forEach(activity => {
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('adminId');
        expect(activity).toHaveProperty('action');
        expect(activity).toHaveProperty('timestamp');
      });
    });
  });
});