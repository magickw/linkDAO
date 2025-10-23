import { workflowService } from '../workflowService';
import { CreateWorkflowTemplateRequest, WorkflowTemplate } from '@/types/workflow';

// Mock fetch
global.fetch = jest.fn();

// Mock auth service
jest.mock('../authService', () => ({
  authService: {
    getAuthHeaders: jest.fn().mockReturnValue({
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json'
    })
  }
}));

describe('WorkflowService', () => {
  const baseUrl = 'http://localhost:10001';
  const templateId = 'test-template-id';
  const instanceId = 'test-instance-id';

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Template Management', () => {
    it('should create a workflow template', async () => {
      const templateData: CreateWorkflowTemplateRequest = {
        name: 'Test Workflow',
        description: 'A test workflow',
        category: 'moderation',
        triggerType: 'event',
        triggerConfig: { eventType: 'content_created' },
        steps: []
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: {
            id: templateId,
            ...templateData,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await workflowService.createTemplate(templateData);

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/workflows/templates`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(templateData)
        })
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Workflow');
    });

    it('should get a workflow template', async () => {
      const mockTemplate: WorkflowTemplate = {
        id: templateId,
        name: 'Test Workflow',
        description: 'A test workflow',
        category: 'moderation',
        triggerType: 'event',
        triggerConfig: { eventType: 'content_created' },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: mockTemplate
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await workflowService.getTemplate(templateId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/workflows/templates/${templateId}`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        })
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(templateId);
    });

    it('should list workflow templates', async () => {
      const mockTemplates: WorkflowTemplate[] = [
        {
          id: 'template-1',
          name: 'Test Workflow 1',
          description: 'A test workflow',
          category: 'moderation',
          triggerType: 'event',
          triggerConfig: { eventType: 'content_created' },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: mockTemplates
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await workflowService.listTemplates();

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/workflows/templates`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        })
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it('should update a workflow template', async () => {
      const updates = { name: 'Updated Workflow' };
      const mockTemplate: WorkflowTemplate = {
        id: templateId,
        name: 'Updated Workflow',
        description: 'A test workflow',
        category: 'moderation',
        triggerType: 'event',
        triggerConfig: { eventType: 'content_created' },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: mockTemplate
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await workflowService.updateTemplate(templateId, updates);

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/workflows/templates/${templateId}`,
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        })
      );

      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Workflow');
    });
  });

  describe('Workflow Execution', () => {
    it('should execute a workflow', async () => {
      const mockInstance = {
        id: instanceId,
        templateId,
        status: 'pending',
        priority: 5,
        createdAt: new Date()
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: mockInstance
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await workflowService.executeWorkflow(templateId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/workflows/execute`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ templateId })
        })
      );

      expect(result).toBeDefined();
      expect(result.templateId).toBe(templateId);
    });
  });

  describe('Task Management', () => {
    it('should get user tasks', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          stepExecutionId: 'step-exec-1',
          assignedTo: 'user-1',
          taskType: 'review',
          taskData: {},
          priority: 5,
          status: 'assigned',
          assignedAt: new Date()
        }
      ];

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: mockTasks
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await workflowService.getUserTasks();

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/api/admin/workflows/tasks/my-tasks`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
          }
        })
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw an error when API call fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(workflowService.createTemplate({
        name: 'Test Workflow',
        description: 'A test workflow',
        category: 'moderation',
        triggerType: 'event',
        triggerConfig: { eventType: 'content_created' },
        steps: []
      })).rejects.toThrow('Failed to create workflow template');
    });
  });
});