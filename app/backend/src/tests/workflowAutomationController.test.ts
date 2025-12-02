import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';
import { db } from '../db';
import { users, workflowTemplates, workflowApprovalCriteria, workflowDecisions } from '../db/schema';
import { eq } from 'drizzle-orm';

// Mock authentication
jest.mock('../middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-123', role: 'admin' };
    next();
  }
}));

// Mock CSRF protection
jest.mock('../middleware/csrfProtection', () => ({
  csrfProtection: (req: any, res: any, next: any) => next()
}));

// Mock admin validation
jest.mock('../middleware/adminAuthMiddleware', () => ({
  validateAdminRole: (req: any, res: any, next: any) => next()
}));

describe('WorkflowAutomationController', () => {
  let authToken: string;
  let testUserId: string;
  let testTemplateId: string;

  beforeEach(async () => {
    // Create test user
    const [user] = await db.insert(users).values({
      id: 'test-user-123',
      walletAddress: '0x1234567890abcdef',
      email: 'test@example.com',
      role: 'admin'
    }).returning();
    testUserId = user.id;

    // Create test workflow template
    const template = await db.insert(workflowTemplates).values({
      id: 'test-template-123',
      name: 'Test Workflow',
      description: 'Test workflow template',
      category: 'return_processing',
      triggerType: 'manual',
      triggerConfig: { event: 'test_event' },
      isActive: true,
      createdBy: testUserId
    }).returning();
    testTemplateId = template[0].id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(workflowDecisions).where(eq(workflowDecisions.entityId, 'test-return-123'));
    await db.delete(workflowApprovalCriteria).where(eq(workflowApprovalCriteria.createdBy, testUserId));
    await db.delete(workflowTemplates).where(eq(workflowTemplates.id, testTemplateId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe('POST /api/admin/workflows/auto-approval/evaluate', () => {
    it('should evaluate auto-approval successfully', async () => {
      const response = await request(app)
        .post('/api/admin/workflows/auto-approval/evaluate')
        .send({
          entityType: 'return',
          entityId: 'test-return-123',
          riskScore: 25,
          riskLevel: 'low',
          amount: 100,
          userId: testUserId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('approved');
      expect(response.body.data).toHaveProperty('confidence');
      expect(response.body.data).toHaveProperty('requiresManualReview');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/admin/workflows/auto-approval/evaluate')
        .send({
          entityType: 'return',
          entityId: 'test-return-123'
          // Missing riskScore and riskLevel
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should handle system errors gracefully', async () => {
      // Mock database error
      jest.spyOn(db, 'select').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/admin/workflows/auto-approval/evaluate')
        .send({
          entityType: 'return',
          entityId: 'test-return-123',
          riskScore: 25,
          riskLevel: 'low',
          amount: 100,
          userId: testUserId
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database error');
    });
  });

  describe('POST /api/admin/workflows/approval-criteria', () => {
    it('should create approval criteria successfully', async () => {
      const criteriaData = {
        name: 'Test Approval Criteria',
        description: 'Test criteria for returns',
        entityType: 'return',
        maxRiskScore: 50,
        maxAmount: 200,
        requirePositiveHistory: true,
        requireFraudCheck: true,
        priority: 1,
        isActive: true
      };

      const response = await request(app)
        .post('/api/admin/workflows/approval-criteria')
        .send(criteriaData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(criteriaData.name);
      expect(response.body.data.entityType).toBe(criteriaData.entityType);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/admin/workflows/approval-criteria')
        .send({
          description: 'Test criteria'
          // Missing name and entityType
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should handle database errors', async () => {
      // Mock database error
      jest.spyOn(db, 'insert').mockRejectedValueOnce(new Error('Database constraint violation'));

      const response = await request(app)
        .post('/api/admin/workflows/approval-criteria')
        .send({
          name: 'Test Criteria',
          entityType: 'return',
          requirePositiveHistory: false,
          requireFraudCheck: false,
          priority: 1,
          isActive: true
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database constraint violation');
    });
  });

  describe('GET /api/admin/workflows/approval-criteria/:entityType', () => {
    beforeEach(async () => {
      // Create test approval criteria
      await db.insert(workflowApprovalCriteria).values([
        {
          id: 'criteria-1',
          name: 'Low Risk Criteria',
          entityType: 'return',
          maxRiskScore: 30,
          requirePositiveHistory: true,
          requireFraudCheck: true,
          priority: 1,
          isActive: true,
          createdBy: testUserId
        },
        {
          id: 'criteria-2',
          name: 'Medium Risk Criteria',
          entityType: 'return',
          maxRiskScore: 60,
          requirePositiveHistory: false,
          requireFraudCheck: true,
          priority: 2,
          isActive: true,
          createdBy: testUserId
        }
      ]);
    });

    it('should retrieve approval criteria for entity type', async () => {
      const response = await request(app)
        .get('/api/admin/workflows/approval-criteria/return');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].entityType).toBe('return');
    });

    it('should return empty array for non-existent entity type', async () => {
      const response = await request(app)
        .get('/api/admin/workflows/approval-criteria/non-existent');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    it('should handle missing entity type parameter', async () => {
      const response = await request(app)
        .get('/api/admin/workflows/approval-criteria/');

      expect(response.status).toBe(404); // Route not found
    });
  });

  describe('POST /api/admin/workflows/instances/:instanceId/recover', () => {
    let testInstanceId: string;

    beforeEach(async () => {
      // Create a failed workflow instance
      const [instance] = await db.insert(workflowInstances).values({
        id: 'failed-instance-123',
        templateId: testTemplateId,
        status: 'failed',
        priority: 5,
        errorMessage: 'Test failure',
        createdAt: new Date()
      }).returning();
      testInstanceId = instance.id;
    });

    it('should recover failed workflow successfully', async () => {
      const response = await request(app)
        .post(`/api/admin/workflows/instances/${testInstanceId}/recover`)
        .send({
          recoveryStrategy: 'retry'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recovered');
    });

    it('should handle missing instance ID', async () => {
      const response = await request(app)
        .post('/api/admin/workflows/instances//recover')
        .send({
          recoveryStrategy: 'retry'
        });

      expect(response.status).toBe(404); // Route not found
    });

    it('should handle recovery failures', async () => {
      // Mock database error
      jest.spyOn(db, 'update').mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post(`/api/admin/workflows/instances/${testInstanceId}/recover`)
        .send({
          recoveryStrategy: 'retry'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database error');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete auto-approval workflow', async () => {
      // 1. Create approval criteria
      const createResponse = await request(app)
        .post('/api/admin/workflows/approval-criteria')
        .send({
          name: 'Integration Test Criteria',
          entityType: 'return',
          maxRiskScore: 40,
          maxAmount: 200,
          requirePositiveHistory: false,
          requireFraudCheck: false,
          priority: 1,
          isActive: true
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      // 2. Evaluate auto-approval
      const evaluateResponse = await request(app)
        .post('/api/admin/workflows/auto-approval/evaluate')
        .send({
          entityType: 'return',
          entityId: 'integration-test-return',
          riskScore: 25,
          riskLevel: 'low',
          amount: 100,
          userId: testUserId
        });

      expect(evaluateResponse.status).toBe(200);
      expect(evaluateResponse.body.success).toBe(true);
      expect(evaluateResponse.body.data.approved).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .post('/api/admin/workflows/auto-approval/evaluate')
          .send({
            entityType: 'return',
            entityId: `concurrent-test-${i}`,
            riskScore: 20 + i * 10,
            riskLevel: 'low',
            amount: 50 + i * 25,
            userId: testUserId
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('approved');
      });
    });
  });
});

describe('WorkflowAutomationController Error Handling', () => {
  it('should handle malformed JSON in request body', async () => {
    const response = await request(app)
      .post('/api/admin/workflows/auto-approval/evaluate')
      .set('Content-Type', 'application/json')
      .send('invalid json');

    expect(response.status).toBe(400);
  });

  it('should handle extremely large request payloads', async () => {
    const largePayload = {
      entityType: 'return',
      entityId: 'test-return-123',
      riskScore: 25,
      riskLevel: 'low',
      historicalData: {
        // Create a very large object
        ...Array.from({ length: 1000 }, (_, i) => ([`key${i}`]: `value${i}`))
      }
    };

    const response = await request(app)
      .post('/api/admin/workflows/auto-approval/evaluate')
      .send(largePayload);

    expect(response.status).toBe(200); // Should handle gracefully
  });

  it('should handle missing authentication gracefully', async () => {
    // Temporarily remove auth mock
    jest.resetModules();
    
    const response = await request(app)
      .get('/api/admin/workflows/approval-criteria/return');

    // Should redirect or return unauthorized
    expect([401, 302]).toContain(response.status);
  });
});