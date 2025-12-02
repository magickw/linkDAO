import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkflowAutomationEngine } from '../services/workflowAutomationEngine';
import { db } from '../db';
import { 
  workflowTemplates, 
  workflowInstances, 
  workflowSteps, 
  workflowStepExecutions,
  workflowApprovalCriteria,
  workflowDecisions,
  returns,
  users
} from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Mock dependencies
jest.mock('../services/taskAssignmentService');
jest.mock('../services/fraudDetectionEngine');
jest.mock('../services/returnFraudDetectionService');
jest.mock('../services/aiContentRiskScoringService');

describe('WorkflowAutomationEngine', () => {
  let workflowEngine: WorkflowAutomationEngine;
  let mockTemplateId: string;
  let mockUserId: string;

  beforeEach(async () => {
    workflowEngine = WorkflowAutomationEngine.getInstance();
    
    // Create test user
    const [user] = await db.insert(users).values({
      id: 'test-user-123',
      walletAddress: '0x1234567890abcdef',
      email: 'test@example.com',
      role: 'admin'
    }).returning();
    mockUserId = user.id;

    // Create test template
    const template = await workflowEngine.createTemplate({
      name: 'Test Return Approval Workflow',
      description: 'Automated return approval workflow',
      category: 'moderation',
      triggerType: 'manual',
      triggerConfig: { eventType: 'return_created' },
      steps: [
        {
          stepType: 'condition',
          stepConfig: { 
            actionType: 'risk_score_check',
            parameters: { maxRiskScore: 50 }
          },
          conditions: { maxRiskScore: 50 },
          timeoutMinutes: 30,
          retryCount: 2
        },
        {
          stepType: 'assignment',
          stepConfig: { 
            assignmentRules: [{ type: 'role', criteria: { role: 'moderator' } }],
            parameters: { taskType: 'manual_review', dueInMinutes: 60 }
          },
          timeoutMinutes: 60,
          retryCount: 1
        }
      ]
    }, mockUserId);

    mockTemplateId = template.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(workflowDecisions).where(eq(workflowDecisions.entityId, 'test-return-123'));
    await db.delete(workflowApprovalCriteria).where(eq(workflowApprovalCriteria.entityType, 'return'));
    await db.delete(workflowStepExecutions).where(eq(workflowStepExecutions.instanceId, 'test-instance-123'));
    await db.delete(workflowInstances).where(eq(workflowInstances.id, 'test-instance-123'));
    await db.delete(workflowSteps).where(eq(workflowSteps.templateId, mockTemplateId));
    await db.delete(workflowTemplates).where(eq(workflowTemplates.id, mockTemplateId));
    await db.delete(users).where(eq(users.id, mockUserId));
  });

  describe('Auto-Approval System', () => {
    beforeEach(async () => {
      // Create test approval criteria
      await db.insert(workflowApprovalCriteria).values({
        id: 'criteria-123',
        name: 'Low Risk Return Approval',
        description: 'Auto-approve low risk returns',
        entityType: 'return',
        maxRiskScore: 30,
        maxAmount: 100,
        requirePositiveHistory: true,
        requireFraudCheck: true,
        priority: 1,
        isActive: true,
        createdBy: mockUserId
      });
    });

    describe('evaluateAutoApproval', () => {
      it('should auto-approve low risk returns', async () => {
        const result = await workflowEngine.evaluateAutoApproval({
          entityType: 'return',
          entityId: 'test-return-123',
          riskScore: 20,
          riskLevel: 'low',
          amount: 50,
          userId: mockUserId
        });

        expect(result.approved).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.requiresManualReview).toBe(false);
      });

      it('should reject high risk returns', async () => {
        const result = await workflowEngine.evaluateAutoApproval({
          entityType: 'return',
          entityId: 'test-return-123',
          riskScore: 80,
          riskLevel: 'high',
          amount: 50,
          userId: mockUserId
        });

        expect(result.approved).toBe(false);
        expect(result.requiresManualReview).toBe(true);
        expect(result.reason).toContain('exceeds maximum');
      });

      it('should reject high amount returns', async () => {
        const result = await workflowEngine.evaluateAutoApproval({
          entityType: 'return',
          entityId: 'test-return-123',
          riskScore: 20,
          riskLevel: 'low',
          amount: 200,
          userId: mockUserId
        });

        expect(result.approved).toBe(false);
        expect(result.reason).toContain('exceeds maximum');
      });

      it('should handle system errors gracefully', async () => {
        // Mock database error
        jest.spyOn(db, 'select').mockRejectedValueOnce(new Error('Database error'));

        const result = await workflowEngine.evaluateAutoApproval({
          entityType: 'return',
          entityId: 'test-return-123',
          riskScore: 20,
          riskLevel: 'low',
          amount: 50,
          userId: mockUserId
        });

        expect(result.approved).toBe(false);
        expect(result.requiresManualReview).toBe(true);
        expect(result.reason).toContain('System error');
      });
    });

    describe('createApprovalCriteria', () => {
      it('should create new approval criteria', async () => {
        const criteria = await workflowEngine.createApprovalCriteria({
          name: 'Medium Risk Return Approval',
          description: 'Auto-approve medium risk returns',
          entityType: 'return',
          maxRiskScore: 60,
          maxAmount: 500,
          requirePositiveHistory: true,
          requireFraudCheck: true,
          priority: 2,
          isActive: true
        });

        expect(criteria.id).toBeDefined();
        expect(criteria.name).toBe('Medium Risk Return Approval');
        expect(criteria.entityType).toBe('return');
      });

      it('should handle creation errors', async () => {
        // Mock database error
        jest.spyOn(db, 'insert').mockRejectedValueOnce(new Error('Database constraint violation'));

        await expect(workflowEngine.createApprovalCriteria({
          name: 'Invalid Criteria',
          entityType: 'return',
          requirePositiveHistory: false,
          requireFraudCheck: false,
          priority: 1,
          isActive: true
        })).rejects.toThrow('Failed to create approval criteria');
      });
    });

    describe('getApprovalCriteria', () => {
      it('should retrieve active approval criteria', async () => {
        const criteria = await workflowEngine.getApprovalCriteria('return');

        expect(criteria).toHaveLength(1);
        expect(criteria[0].entityType).toBe('return');
        expect(criteria[0].isActive).toBe(true);
      });

      it('should return empty array for non-existent entity type', async () => {
        const criteria = await workflowEngine.getApprovalCriteria('non-existent');

        expect(criteria).toHaveLength(0);
      });
    });
  });

  describe('Intelligent Case Routing', () => {
    describe('resolveAssignment', () => {
      it('should assign tasks based on complexity', async () => {
        const assignmentRules = [
          {
            type: 'role' as const,
            criteria: { role: 'moderator' }
          }
        ];

        const contextData = {
          taskType: 'manual_review',
          priority: 8,
          complexity: 'high',
          riskScore: 75,
          amount: 1000
        };

        // This would normally call taskAssignmentService, which is mocked
        const assignedUser = await workflowEngine['resolveAssignment'](assignmentRules, contextData);

        // Since taskAssignmentService is mocked, we expect null
        expect(assignedUser).toBeNull();
      });

      it('should assess complexity correctly', async () => {
        const lowComplexity = workflowEngine['assessComplexity']({
          riskScore: 20,
          amount: 50,
          entityType: 'return'
        });
        expect(lowComplexity).toBe('low');

        const mediumComplexity = workflowEngine['assessComplexity']({
          riskScore: 50,
          amount: 200,
          entityType: 'dispute'
        });
        expect(mediumComplexity).toBe('medium');

        const highComplexity = workflowEngine['assessComplexity']({
          riskScore: 80,
          amount: 2000,
          entityType: 'dispute',
          historicalData: { previousDisputes: 3 }
        });
        expect(highComplexity).toBe('high');
      });
    });
  });

  describe('Error Recovery System', () => {
    let mockInstanceId: string;

    beforeEach(async () => {
      // Create a failed workflow instance
      const [instance] = await db.insert(workflowInstances).values({
        id: 'test-instance-123',
        templateId: mockTemplateId,
        status: 'failed',
        priority: 5,
        errorMessage: 'Test failure',
        createdAt: new Date()
      }).returning();
      mockInstanceId = instance.id;

      // Create failed step execution
      await db.insert(workflowStepExecutions).values({
        instanceId: mockInstanceId,
        stepId: 'step-123',
        status: 'failed',
        errorMessage: 'Network timeout',
        createdAt: new Date()
      });
    });

    describe('recoverFailedWorkflow', () => {
      it('should retry retryable failures', async () => {
        const result = await workflowEngine.recoverFailedWorkflow(mockInstanceId, 'retry');

        expect(result).toBe(true);
      });

      it('should escalate non-retryable failures', async () => {
        // Update error to non-retryable
        await db.update(workflowStepExecutions)
          .set({ errorMessage: 'Validation failed' })
          .where(eq(workflowStepExecutions.instanceId, mockInstanceId));

        const result = await workflowEngine.recoverFailedWorkflow(mockInstanceId, 'escalate');

        expect(result).toBe(true);
      });

      it('should handle missing instances gracefully', async () => {
        const result = await workflowEngine.recoverFailedWorkflow('non-existent', 'retry');

        expect(result).toBe(false);
      });
    });

    describe('analyzeWorkflowFailure', () => {
      it('should categorize errors correctly', async () => {
        const analysis = await workflowEngine['analyzeWorkflowFailure'](mockInstanceId);

        expect(analysis.failurePoint).toBe('step-123');
        expect(analysis.errorType).toBe('network');
        expect(analysis.retryable).toBe(true);
      });

      it('should detect when escalation is required', async () => {
        // Create multiple failed attempts
        for (let i = 0; i < 4; i++) {
          await db.insert(workflowStepExecutions).values({
            instanceId: mockInstanceId,
            stepId: 'step-123',
            status: 'failed',
            errorMessage: 'Network timeout',
            createdAt: new Date()
          });
        }

        const analysis = await workflowEngine['analyzeWorkflowFailure'](mockInstanceId);

        expect(analysis.escalationRequired).toBe(true);
      });
    });
  });

  describe('Workflow Monitoring', () => {
    describe('getWorkflowAnalytics', () => {
      beforeEach(async () => {
        // Create test workflow instances
        await db.insert(workflowInstances).values([
          {
            id: 'analytics-1',
            templateId: mockTemplateId,
            status: 'completed',
            priority: 5,
            startedAt: new Date(Date.now() - 3600000),
            completedAt: new Date(),
            createdAt: new Date(Date.now() - 7200000)
          },
          {
            id: 'analytics-2',
            templateId: mockTemplateId,
            status: 'failed',
            priority: 3,
            errorMessage: 'Test failure',
            createdAt: new Date(Date.now() - 3600000)
          }
        ]);
      });

      it('should calculate basic analytics', async () => {
        const analytics = await workflowEngine.getWorkflowAnalytics(mockTemplateId, {
          start: new Date(Date.now() - 86400000),
          end: new Date()
        });

        expect(analytics.totalExecutions).toBeGreaterThan(0);
        expect(analytics.successRate).toBeDefined();
        expect(analytics.averageExecutionTime).toBeDefined();
        expect(analytics.bottlenecks).toBeDefined();
        expect(analytics.topFailureReasons).toBeDefined();
      });

      it('should generate optimization suggestions', async () => {
        const analytics = await workflowEngine.getWorkflowAnalytics(mockTemplateId);

        expect(analytics.optimizationSuggestions).toBeDefined();
        expect(Array.isArray(analytics.optimizationSuggestions)).toBe(true);
      });

      it('should calculate SLA breaches', async () => {
        // Create a workflow that exceeded SLA
        await db.insert(workflowInstances).values({
          id: 'sla-breach',
          templateId: mockTemplateId,
          status: 'completed',
          priority: 5,
          startedAt: new Date(Date.now() - 7200000), // 2 hours ago
          completedAt: new Date(),
          createdAt: new Date(Date.now() - 86400000)
        });

        const analytics = await workflowEngine.getWorkflowAnalytics(mockTemplateId);

        expect(analytics.slaBreaches).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow lifecycle', async () => {
      // 1. Create approval criteria
      const criteria = await workflowEngine.createApprovalCriteria({
        name: 'Integration Test Criteria',
        entityType: 'return',
        maxRiskScore: 40,
        maxAmount: 200,
        requirePositiveHistory: false,
        requireFraudCheck: false,
        priority: 1,
        isActive: true
      });

      // 2. Evaluate auto-approval
      const approvalResult = await workflowEngine.evaluateAutoApproval({
        entityType: 'return',
        entityId: 'integration-test-return',
        riskScore: 25,
        riskLevel: 'low',
        amount: 100,
        userId: mockUserId
      });

      expect(approvalResult.approved).toBe(true);

      // 3. Execute workflow
      const workflowInstance = await workflowEngine.executeWorkflow({
        templateId: mockTemplateId,
        priority: 5,
        contextData: {
          returnId: 'integration-test-return',
          autoApproved: approvalResult.approved
        }
      });

      expect(workflowInstance.id).toBeDefined();
      expect(workflowInstance.status).toBe('pending');

      // 4. Get analytics
      const analytics = await workflowEngine.getWorkflowAnalytics(mockTemplateId);
      expect(analytics.totalExecutions).toBeGreaterThan(0);
    });
  });
});

describe('WorkflowAutomationEngine Performance', () => {
  it('should handle concurrent auto-approval evaluations', async () => {
    const workflowEngine = WorkflowAutomationEngine.getInstance();
    
    const evaluations = Array.from({ length: 10 }, (_, i) => 
      workflowEngine.evaluateAutoApproval({
        entityType: 'return',
        entityId: `performance-test-${i}`,
        riskScore: 20 + i * 5,
        riskLevel: 'low',
        amount: 50 + i * 10,
        userId: 'test-user-123'
      })
    );

    const results = await Promise.all(evaluations);
    
    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result).toHaveProperty('approved');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('requiresManualReview');
    });
  });

  it('should handle large workflow analytics queries efficiently', async () => {
    const workflowEngine = WorkflowAutomationEngine.getInstance();
    
    const startTime = Date.now();
    const analytics = await workflowEngine.getWorkflowAnalytics();
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    expect(analytics).toHaveProperty('totalExecutions');
    expect(analytics).toHaveProperty('successRate');
    expect(analytics).toHaveProperty('optimizationSuggestions');
  });
});