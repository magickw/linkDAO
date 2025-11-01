import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db';
import { createTestUser, createTestAdmin, cleanupTestData } from '../fixtures/testDataFactory';

describe('Admin Dashboard API Integration Tests', () => {
  let adminToken: string;
  let testAdminId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test database and create test admin
    const testAdmin = await createTestAdmin({
      email: 'admin@test.com',
      role: 'super_admin',
      permissions: ['dashboard_access', 'analytics_view', 'system_monitoring']
    });
    testAdminId = testAdmin.id;
    adminToken = testAdmin.token;

    // Create test user for metrics
    const testUser = await createTestUser({
      email: 'user@test.com',
      status: 'active'
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/dashboard/metrics', () => {
    it('should return real-time dashboard metrics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('realTimeUsers');
      expect(response.body).toHaveProperty('systemHealth');
      expect(response.body).toHaveProperty('moderationQueue');
      expect(response.body).toHaveProperty('sellerMetrics');
      expect(response.body).toHaveProperty('disputeStats');
      expect(response.body).toHaveProperty('aiInsights');

      expect(typeof response.body.realTimeUsers).toBe('number');
      expect(response.body.systemHealth).toHaveProperty('overall');
      expect(['healthy', 'degraded', 'critical']).toContain(response.body.systemHealth.overall);
    });

    it('should require admin authentication', async () => {
      await request(app)
        .get('/api/admin/dashboard/metrics')
        .expect(401);
    });

    it('should require dashboard access permission', async () => {
      const limitedAdmin = await createTestAdmin({
        email: 'limited@test.com',
        role: 'moderator',
        permissions: ['content_moderation']
      });

      await request(app)
        .get('/api/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${limitedAdmin.token}`)
        .expect(403);
    });
  });

  describe('GET /api/admin/dashboard/system-health', () => {
    it('should return detailed system health information', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/system-health')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('components');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('performance');

      expect(Array.isArray(response.body.components)).toBe(true);
      expect(Array.isArray(response.body.alerts)).toBe(true);

      response.body.components.forEach((component: any) => {
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('status');
        expect(component).toHaveProperty('responseTime');
      });
    });
  });

  describe('GET /api/admin/dashboard/analytics', () => {
    it('should return analytics data with time range filtering', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/analytics')
        .query({
          timeRange: '7d',
          metrics: 'users,content,engagement'
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('userMetrics');
      expect(response.body).toHaveProperty('contentMetrics');
      expect(response.body).toHaveProperty('engagementMetrics');
      expect(response.body).toHaveProperty('timeRange', '7d');

      expect(response.body.userMetrics).toHaveProperty('totalUsers');
      expect(response.body.userMetrics).toHaveProperty('activeUsers');
      expect(response.body.userMetrics).toHaveProperty('newUsers');
    });

    it('should handle custom date ranges', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      const response = await request(app)
        .get('/api/admin/dashboard/analytics')
        .query({
          startDate,
          endDate,
          metrics: 'users'
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dateRange');
      expect(response.body.dateRange).toEqual({ startDate, endDate });
    });
  });

  describe('POST /api/admin/dashboard/layout', () => {
    it('should save dashboard layout preferences', async () => {
      const layout = {
        widgets: [
          { id: 'metrics', x: 0, y: 0, w: 6, h: 4 },
          { id: 'charts', x: 6, y: 0, w: 6, h: 4 },
          { id: 'alerts', x: 0, y: 4, w: 12, h: 2 }
        ]
      };

      const response = await request(app)
        .post('/api/admin/dashboard/layout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ layout })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('layoutId');
    });

    it('should validate layout structure', async () => {
      const invalidLayout = {
        widgets: [
          { id: 'metrics' } // Missing required properties
        ]
      };

      await request(app)
        .post('/api/admin/dashboard/layout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ layout: invalidLayout })
        .expect(400);
    });
  });

  describe('GET /api/admin/dashboard/layout', () => {
    it('should retrieve saved dashboard layout', async () => {
      // First save a layout
      const layout = {
        widgets: [
          { id: 'test-widget', x: 0, y: 0, w: 4, h: 4 }
        ]
      };

      await request(app)
        .post('/api/admin/dashboard/layout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ layout });

      // Then retrieve it
      const response = await request(app)
        .get('/api/admin/dashboard/layout')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('layout');
      expect(response.body.layout).toHaveProperty('widgets');
      expect(Array.isArray(response.body.layout.widgets)).toBe(true);
    });

    it('should return default layout if none saved', async () => {
      const newAdmin = await createTestAdmin({
        email: 'newadmin@test.com',
        role: 'admin'
      });

      const response = await request(app)
        .get('/api/admin/dashboard/layout')
        .set('Authorization', `Bearer ${newAdmin.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('layout');
      expect(response.body.layout).toHaveProperty('widgets');
      expect(response.body.layout.widgets.length).toBeGreaterThan(0);
    });
  });

  describe('WebSocket Integration', () => {
    it('should establish WebSocket connection for real-time updates', (done) => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${process.env.PORT || 3000}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'subscribe', channels: ['metrics', 'alerts'] }));
      });

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed') {
          expect(message.channels).toContain('metrics');
          expect(message.channels).toContain('alerts');
          ws.close();
          done();
        }
      });

      ws.on('error', (error: Error) => {
        done(error);
      });
    });

    it('should receive real-time metric updates', (done) => {
      const WebSocket = require('ws');
      const ws = new WebSocket(`ws://localhost:${process.env.PORT || 3000}/admin-dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });

      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'subscribe', channels: ['metrics'] }));
      });

      let subscriptionConfirmed = false;
      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscription_confirmed') {
          subscriptionConfirmed = true;
          return;
        }

        if (subscriptionConfirmed && message.type === 'metrics_update') {
          expect(message).toHaveProperty('data');
          expect(message.data).toHaveProperty('realTimeUsers');
          expect(message.data).toHaveProperty('timestamp');
          ws.close();
          done();
        }
      });

      // Trigger a metric update after subscription
      setTimeout(() => {
        if (subscriptionConfirmed) {
          // Simulate user activity to trigger metrics update
          request(app)
            .post('/api/test/trigger-metrics-update')
            .set('Authorization', `Bearer ${adminToken}`)
            .send()
            .catch(() => {}); // Ignore errors for this test trigger
        }
      }, 100);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      jest.spyOn(db, 'select').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/api/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to fetch metrics');

      // Restore mock
      jest.restoreAllMocks();
    });

    it('should handle invalid query parameters', async () => {
      await request(app)
        .get('/api/admin/dashboard/analytics')
        .query({
          timeRange: 'invalid',
          metrics: 'nonexistent'
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should handle malformed request bodies', async () => {
      await request(app)
        .post('/api/admin/dashboard/layout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send('invalid json')
        .expect(400);
    });
  });

  describe('Performance', () => {
    it('should respond to metrics request within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/admin/dashboard/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/admin/dashboard/metrics')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(totalTime).toBeLessThan(5000); // All requests should complete within 5 seconds
    });
  });
});