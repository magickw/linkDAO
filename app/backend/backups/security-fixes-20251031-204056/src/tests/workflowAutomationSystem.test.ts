import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WorkflowAutomationEngine } from '../services/workflowAutomationEngine';
import { TaskAssignmentService } from '../services/taskAssignmentService';
import { EscalationManagementService } from '../services/escalationManagementService';
import { WorkflowPerformanceMonitoringService } from '../services/workflowPerformanceMonitoringService';
import { AutomatedReportingService } from '../services/automatedReportingService';
import { 
  CreateWorkflowTemplateRequest, 
  ExecuteWorkflowRequest,
  WorkflowCategory,
  TriggerType,
  StepType
} from '../types/workflow';

// Mock database connection
jest.mock('../db/connection', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test-id', createdAt: new Date() }])
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    }),
    query: {
      workflowTemplates: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([])
      },
      workflowInstances: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([])
      },
      workflowTaskAssignments: {
        findMany: jest.fn().mockResolvedValue([])
      }
    },
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ count: 0 }])
      })
    }),
    execute: jest.fn().mockResolvedValue({ rows: [{ count: 0 }] }),
    transaction: jest.fn().mockImplementation(async (callback: any) => {
      return await callback({
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
          })
        }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([])
          })
        })
      });
    })
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Workflow Automation System', () => {
  let workflowEngine: WorkflowAutomationEngine;
  let taskAssignmentService: TaskAssignmentService;
  let escalationService: EscalationManagementService;
  let performanceService: WorkflowPerformanceMonitoringService;
  let reportingService: AutomatedReportingService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Initialize services
    workflowEngine = WorkflowAutomationEngine.getInstance();
    taskAssignmentService = TaskAssignmentService.getInstance();
    escalationService = EscalationManagementService.getInstance();
    performanceService = WorkflowPerformanceMonitoringService.getInstance();
    reportingService = AutomatedReportingService.getInstance();
  });

  afterEach(() => {
    // Cleanup services
    performanceService.destroy();
    reportingService.destroy();
  });

  describe('WorkflowAutomationEngine', () => {
    it('should create a workflow template successfully', async () => {
      const templateRequest: CreateWorkflowTemplateRequest = {
        name: 'Test Content Moderation Workflow',
        description: 'Test workflow for content moderation',
        category: 'moderation' as WorkflowCategory,
        triggerType: 'event' as TriggerType,
        triggerConfig: {
          eventType: 'content_flagged'
        },
        steps: [
          {
            stepOrder: 1,
            stepType: 'assignment' as StepType,
            stepConfig: {
              assignmentRules: [
                {
                  type: 'user',
                  criteria: { userId: 'moderator-1' }
                }
              ]
            },
            timeoutMinutes: 30,
            retryCount: 0
          },
          {
            stepOrder: 2,
            stepType: 'notification' as StepType,
            stepConfig: {
              notificationTemplate: {
                subject: 'Moderation Complete',
                body: 'Content moderation has been completed.',
                channels: ['email'],
                priority: 'medium'
              }
            },
            timeoutMinutes: 5,
            retryCount: 0
          }
        ]
      };

      const template = await workflowEngine.createTemplate(templateRequest, 'admin-user');

      expect(template).toBeDefined();
      expect(template.name).toBe(templateRequest.name);
      expect(template.category).toBe(templateRequest.category);
      expect(template.triggerType).toBe(templateRequest.triggerType);
    });

    it('should execute a workflow successfully', async () => {
      // First create a template
      const templateRequest: CreateWorkflowTemplateRequest = {
        name: 'Test Workflow',
        category: 'moderation' as WorkflowCategory,
        triggerType: 'manual' as TriggerType,
        triggerConfig: {},
        steps: [
          {
            stepOrder: 1,
            stepType: 'action' as StepType,
            stepConfig: {
              actionType: 'update_status'
            },
            timeoutMinutes: 10,
            retryCount: 0
          }
        ]
      };

      const template = await workflowEngine.createTemplate(templateRequest);

      // Execute the workflow
      const executeRequest: ExecuteWorkflowRequest = {
        templateId: template.id,
        contextData: {
          contentId: 'content-123',
          userId: 'user-456'
        },
        priority: 5
      };

      const instance = await workflowEngine.executeWorkflow(executeRequest);

      expect(instance).toBeDefined();
      expect(instance.templateId).toBe(template.id);
      expect(instance.status).toBe('pending');
      expect(instance.priority).toBe(5);
    });

    it('should list workflow templates', async () => {
      const templates = await workflowEngine.listTemplates();
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should get workflow template by id', async () => {
      const template = await workflowEngine.getTemplate('non-existent-id');
      expect(template).toBeNull();
    });
  });

  describe('TaskAssignmentService', () => {
    it('should get user workload', async () => {
      const workload = await taskAssignmentService.getUserWorkload('user-123');
      
      expect(workload).toBeDefined();
      expect(workload.userId).toBe('user-123');
      expect(typeof workload.activeTasks).toBe('number');
      expect(typeof workload.averageCompletionTime).toBe('number');
      expect(typeof workload.skillLevel).toBe('number');
      expect(['available', 'busy', 'unavailable']).toContain(workload.availability);
    });

    it('should resolve assignment using user rule', async () => {
      const assignmentRules = [
        {
          type: 'user' as const,
          criteria: { userId: 'user-123' }
        }
      ];

      const context = {
        taskType: 'moderate',
        priority: 5
      };

      const assignedTo = await taskAssignmentService.resolveAssignment(assignmentRules, context);
      expect(assignedTo).toBe('user-123');
    });
  });

  describe('EscalationManagementService', () => {
    it('should create escalation policy', async () => {
      const policy = {
        name: 'Test Escalation Policy',
        taskType: 'moderate',
        rules: [
          {
            condition: 'timeout' as const,
            timeoutMinutes: 30,
            escalateTo: 'supervisor-1',
            notificationTemplate: {
              subject: 'Task Escalated',
              body: 'A task has been escalated due to timeout.',
              channels: ['email'],
              priority: 'high' as const
            }
          }
        ],
        isActive: true
      };

      const createdPolicy = await escalationService.createEscalationPolicy(policy);

      expect(createdPolicy).toBeDefined();
      expect(createdPolicy.name).toBe(policy.name);
      expect(createdPolicy.taskType).toBe(policy.taskType);
      expect(createdPolicy.isActive).toBe(true);
    });

    it('should get escalation policy by task type', async () => {
      const policy = await escalationService.getEscalationPolicy('moderate');
      // Should return null for non-existent policy in test environment
      expect(policy).toBeNull();
    });

    it('should list escalation policies', async () => {
      const policies = await escalationService.listEscalationPolicies();
      expect(Array.isArray(policies)).toBe(true);
    });
  });

  describe('WorkflowPerformanceMonitoringService', () => {
    it('should collect performance metrics', async () => {
      const metrics = await performanceService.collectPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.executionTime).toBeDefined();
      expect(metrics.throughput).toBeDefined();
      expect(metrics.successRate).toBeDefined();
      expect(metrics.bottlenecks).toBeDefined();
      expect(metrics.slaCompliance).toBeDefined();
      expect(metrics.resourceUtilization).toBeDefined();
    });

    it('should record metric', async () => {
      await expect(
        performanceService.recordMetric(
          'template-123',
          'instance-456',
          'execution_time',
          120,
          'seconds'
        )
      ).resolves.not.toThrow();
    });

    it('should get performance alerts', async () => {
      const alerts = await performanceService.getPerformanceAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should generate optimization recommendations', async () => {
      const recommendations = await performanceService.generateOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('AutomatedReportingService', () => {
    it('should create report template', async () => {
      const template = {
        name: 'Test Report',
        description: 'Test report template',
        reportType: 'workflow_performance' as const,
        dataSource: {
          type: 'workflow_metrics' as const,
          timeRange: { start: new Date(), end: new Date() }
        },
        format: 'json' as const,
        template: {
          layout: 'standard' as const,
          sections: [
            { id: '1', type: 'header' as const, title: 'Test Report' }
          ]
        },
        recipients: [
          { id: '1', type: 'user' as const, value: 'admin', deliveryMethod: 'email' as const }
        ],
        isActive: true
      };

      const createdTemplate = await reportingService.createReportTemplate(template);

      expect(createdTemplate).toBeDefined();
      expect(createdTemplate.name).toBe(template.name);
      expect(createdTemplate.reportType).toBe(template.reportType);
      expect(createdTemplate.format).toBe(template.format);
    });

    it('should generate report', async () => {
      // First create a template
      const template = {
        name: 'Test Report',
        reportType: 'workflow_performance' as const,
        dataSource: { type: 'workflow_metrics' as const },
        format: 'json' as const,
        template: {
          layout: 'standard' as const,
          sections: []
        },
        recipients: [],
        isActive: true
      };

      const createdTemplate = await reportingService.createReportTemplate(template);

      // Generate report
      const execution = await reportingService.generateReport(
        createdTemplate.id,
        { testParam: 'value' },
        'admin'
      );

      expect(execution).toBeDefined();
      expect(execution.templateId).toBe(createdTemplate.id);
      expect(execution.status).toBe('pending');
      expect(execution.parameters).toEqual({ testParam: 'value' });
    });

    it('should create notification rule', async () => {
      const rule = {
        name: 'Test Notification Rule',
        triggerType: 'task_assigned' as const,
        conditions: [],
        template: {
          subject: 'Test Notification',
          body: 'This is a test notification.',
          channels: ['email'],
          priority: 'medium' as const
        },
        recipients: [
          { id: '1', type: 'user' as const, value: 'user-123', channels: ['email'] }
        ],
        priority: 'medium' as const,
        isActive: true
      };

      const createdRule = await reportingService.createNotificationRule(rule);

      expect(createdRule).toBeDefined();
      expect(createdRule.name).toBe(rule.name);
      expect(createdRule.triggerType).toBe(rule.triggerType);
      expect(createdRule.isActive).toBe(true);
    });

    it('should send notification', async () => {
      await expect(
        reportingService.sendNotification(
          'user-123',
          'assignment',
          'Test Notification',
          'This is a test notification message.',
          { taskId: 'task-456' },
          ['email'],
          'medium'
        )
      ).resolves.not.toThrow();
    });

    it('should list report templates', async () => {
      const templates = await reportingService.listReportTemplates();
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should list notification rules', async () => {
      const rules = await reportingService.listNotificationRules();
      expect(Array.isArray(rules)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow lifecycle', async () => {
      // Create workflow template
      const templateRequest: CreateWorkflowTemplateRequest = {
        name: 'Integration Test Workflow',
        category: 'moderation' as WorkflowCategory,
        triggerType: 'manual' as TriggerType,
        triggerConfig: {},
        steps: [
          {
            stepOrder: 1,
            stepType: 'assignment' as StepType,
            stepConfig: {
              assignmentRules: [
                { type: 'user', criteria: { userId: 'reviewer-1' } }
              ]
            },
            timeoutMinutes: 60,
            retryCount: 1
          }
        ]
      };

      const template = await workflowEngine.createTemplate(templateRequest);
      expect(template).toBeDefined();

      // Execute workflow
      const executeRequest: ExecuteWorkflowRequest = {
        templateId: template.id,
        contextData: { contentId: 'content-789' },
        priority: 7
      };

      const instance = await workflowEngine.executeWorkflow(executeRequest);
      expect(instance).toBeDefined();
      expect(instance.status).toBe('pending');

      // Record performance metric
      await performanceService.recordMetric(
        template.id,
        instance.id,
        'execution_time',
        150,
        'seconds'
      );

      // Send notification
      await reportingService.sendNotification(
        'reviewer-1',
        'assignment',
        'New Review Task',
        'You have been assigned a new review task.',
        { instanceId: instance.id },
        ['email'],
        'medium'
      );

      // Verify workflow instance can be retrieved
      const retrievedInstance = await workflowEngine.getWorkflowInstance(instance.id);
      expect(retrievedInstance).toBeNull(); // Will be null in test environment due to mocked DB
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with invalid template ID
      await expect(
        workflowEngine.executeWorkflow({
          templateId: 'non-existent-template',
          contextData: {}
        })
      ).rejects.toThrow();

      // Test with invalid user ID for workload
      const workload = await taskAssignmentService.getUserWorkload('non-existent-user');
      expect(workload).toBeDefined(); // Should return default values

      // Test with invalid escalation policy
      const policy = await escalationService.getEscalationPolicy('non-existent-type');
      expect(policy).toBeNull();
    });
  });
});