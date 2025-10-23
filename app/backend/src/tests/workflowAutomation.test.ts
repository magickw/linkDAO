import { WorkflowAutomationEngine } from '../services/workflowAutomationEngine';
import { CreateWorkflowTemplateRequest } from '../types/workflow';

describe('Workflow Automation Engine', () => {
  let workflowEngine: WorkflowAutomationEngine;

  beforeAll(() => {
    workflowEngine = WorkflowAutomationEngine.getInstance();
  });

  describe('Template Management', () => {
    it('should create a workflow template', async () => {
      const templateData: CreateWorkflowTemplateRequest = {
        name: 'Test Workflow',
        description: 'A test workflow for unit testing',
        category: 'moderation',
        triggerType: 'event',
        triggerConfig: {
          eventType: 'content_created'
        },
        steps: [
          {
            stepOrder: 1,
            stepType: 'action',
            stepConfig: {
              actionType: 'log_message',
              parameters: {
                message: 'Workflow started'
              }
            },
            timeoutMinutes: 60,
            retryCount: 0
          },
          {
            stepOrder: 2,
            stepType: 'assignment',
            stepConfig: {
              assignmentRules: [
                {
                  type: 'role',
                  criteria: {
                    role: 'moderator'
                  }
                }
              ],
              taskType: 'review',
              taskData: {
                instructions: 'Please review this content'
              }
            },
            timeoutMinutes: 1440,
            retryCount: 0
          }
        ]
      };

      const template = await workflowEngine.createTemplate(templateData);
      
      expect(template).toBeDefined();
      expect(template.name).toBe('Test Workflow');
      expect(template.category).toBe('moderation');
      expect(template.steps).toHaveLength(2);
    });

    it('should retrieve a workflow template', async () => {
      const templateData: CreateWorkflowTemplateRequest = {
        name: 'Retrieve Test Workflow',
        description: 'A test workflow for retrieval testing',
        category: 'seller_management',
        triggerType: 'manual',
        triggerConfig: {},
        steps: [
          {
            stepOrder: 1,
            stepType: 'notification',
            stepConfig: {
              notificationTemplate: {
                subject: 'Test Notification',
                body: 'This is a test notification',
                channels: ['email'],
                priority: 'medium'
              }
            },
            timeoutMinutes: 60,
            retryCount: 0
          }
        ]
      };

      const createdTemplate = await workflowEngine.createTemplate(templateData);
      const retrievedTemplate = await workflowEngine.getTemplate(createdTemplate.id);
      
      expect(retrievedTemplate).toBeDefined();
      expect(retrievedTemplate?.id).toBe(createdTemplate.id);
      expect(retrievedTemplate?.name).toBe('Retrieve Test Workflow');
    });

    it('should list workflow templates', async () => {
      const templates = await workflowEngine.listTemplates();
      
      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should update a workflow template', async () => {
      const templateData: CreateWorkflowTemplateRequest = {
        name: 'Update Test Workflow',
        description: 'A test workflow for update testing',
        category: 'dispute_resolution',
        triggerType: 'event',
        triggerConfig: {
          eventType: 'dispute_created'
        },
        steps: [
          {
            stepOrder: 1,
            stepType: 'action',
            stepConfig: {
              actionType: 'log_event'
            },
            timeoutMinutes: 60,
            retryCount: 0
          }
        ]
      };

      const createdTemplate = await workflowEngine.createTemplate(templateData);
      const updatedTemplate = await workflowEngine.updateTemplate(
        createdTemplate.id, 
        { name: 'Updated Test Workflow', description: 'Updated description' }
      );
      
      expect(updatedTemplate).toBeDefined();
      expect(updatedTemplate.name).toBe('Updated Test Workflow');
      expect(updatedTemplate.description).toBe('Updated description');
    });
  });

  describe('Workflow Execution', () => {
    it('should execute a workflow', async () => {
      const templateData: CreateWorkflowTemplateRequest = {
        name: 'Execution Test Workflow',
        description: 'A test workflow for execution testing',
        category: 'moderation',
        triggerType: 'manual',
        triggerConfig: {},
        steps: [
          {
            stepOrder: 1,
            stepType: 'action',
            stepConfig: {
              actionType: 'log_message',
              parameters: {
                message: 'Workflow executed successfully'
              }
            },
            timeoutMinutes: 60,
            retryCount: 0
          }
        ]
      };

      const template = await workflowEngine.createTemplate(templateData);
      const executionRequest = {
        templateId: template.id,
        contextData: {
          test: 'data'
        }
      };

      const instance = await workflowEngine.executeWorkflow(executionRequest);
      
      expect(instance).toBeDefined();
      expect(instance.templateId).toBe(template.id);
      expect(instance.status).toBe('pending');
    });
  });

  describe('Task Management', () => {
    it('should get user tasks', async () => {
      const tasks = await workflowEngine.getUserTasks('test-user-id');
      
      expect(tasks).toBeDefined();
      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe('Rule Management', () => {
    it('should create a workflow rule', async () => {
      const ruleData = {
        name: 'Test Rule',
        description: 'A test rule for unit testing',
        ruleType: 'trigger',
        conditions: [
          {
            field: 'eventType',
            operator: 'equals',
            value: 'content_created'
          }
        ],
        actions: [
          {
            type: 'create_workflow',
            parameters: {
              templateId: 'test-template-id'
            }
          }
        ],
        priority: 5,
        isActive: true
      };

      const rule = await workflowEngine.createRule(ruleData);
      
      expect(rule).toBeDefined();
      expect(rule.name).toBe('Test Rule');
      expect(rule.ruleType).toBe('trigger');
    });
  });
});