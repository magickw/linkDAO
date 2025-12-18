import { 
  WorkflowTemplate, 
  CreateWorkflowTemplateRequest, 
  WorkflowInstance,
  WorkflowTaskAssignment,
  WorkflowRule,
  WorkflowAnalytics
} from '@/types/workflow';
import { enhancedAuthService } from './enhancedAuthService';

class WorkflowService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10001';
  }

  private async getHeaders() {
    return await enhancedAuthService.getAuthHeaders();
  }

  // Template Management
  async createTemplate(templateData: CreateWorkflowTemplateRequest): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/templates`, {
      method: 'POST',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templateData)
    });

    if (!response.ok) {
      throw new Error('Failed to create workflow template');
    }

    const result = await response.json();
    return result.data;
  }

  async getTemplate(templateId: string): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/templates/${templateId}`, {
      headers: await this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow template');
    }

    const result = await response.json();
    return result.data;
  }

  async listTemplates(category?: string, isActive?: boolean): Promise<WorkflowTemplate[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (isActive !== undefined) params.append('isActive', isActive.toString());

    const response = await fetch(`${this.baseUrl}/admin/workflows/templates?${params}`, {
      headers: await this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to list workflow templates');
    }

    const result = await response.json();
    return result.data;
  }

  async updateTemplate(templateId: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update workflow template');
    }

    const result = await response.json();
    return result.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/templates/${templateId}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete workflow template');
    }
  }

  // Workflow Execution
  async executeWorkflow(templateId: string, contextData?: Record<string, any>): Promise<WorkflowInstance> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/execute`, {
      method: 'POST',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ templateId, contextData })
    });

    if (!response.ok) {
      throw new Error('Failed to execute workflow');
    }

    const result = await response.json();
    return result.data;
  }

  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/instances/${instanceId}`, {
      headers: await this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow instance');
    }

    const result = await response.json();
    return result.data;
  }

  async listWorkflowInstances(templateId?: string, status?: string): Promise<WorkflowInstance[]> {
    const params = new URLSearchParams();
    if (templateId) params.append('templateId', templateId);
    if (status) params.append('status', status);

    const response = await fetch(`${this.baseUrl}/admin/workflows/instances?${params}`, {
      headers: await this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to list workflow instances');
    }

    const result = await response.json();
    return result.data;
  }

  async cancelWorkflow(instanceId: string, reason: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/instances/${instanceId}/cancel`, {
      method: 'POST',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error('Failed to cancel workflow');
    }
  }

  // Task Management
  async getUserTasks(status?: string[]): Promise<WorkflowTaskAssignment[]> {
    const params = new URLSearchParams();
    if (status && status.length > 0) {
      params.append('status', status.join(','));
    }

    const response = await fetch(`${this.baseUrl}/admin/workflows/tasks/my-tasks?${params}`, {
      headers: await this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user tasks');
    }

    const result = await response.json();
    return result.data;
  }

  async completeTask(taskId: string, completionData: Record<string, any>, status: 'completed' | 'escalated'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ completionData, status })
    });

    if (!response.ok) {
      throw new Error('Failed to complete task');
    }
  }

  async assignTask(taskId: string, assignedTo: string, reason?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/tasks/${taskId}/assign`, {
      method: 'POST',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ assignedTo, reason })
    });

    if (!response.ok) {
      throw new Error('Failed to assign task');
    }
  }

  async escalateTask(taskId: string, escalatedTo: string, reason?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/tasks/${taskId}/escalate`, {
      method: 'POST',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ escalatedTo, reason })
    });

    if (!response.ok) {
      throw new Error('Failed to escalate task');
    }
  }

  // Rule Management
  async createRule(ruleData: Omit<WorkflowRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowRule> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/rules`, {
      method: 'POST',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ruleData)
    });

    if (!response.ok) {
      throw new Error('Failed to create workflow rule');
    }

    const result = await response.json();
    return result.data;
  }

  async listRules(ruleType?: string, isActive?: boolean): Promise<WorkflowRule[]> {
    const params = new URLSearchParams();
    if (ruleType) params.append('ruleType', ruleType);
    if (isActive !== undefined) params.append('isActive', isActive.toString());

    const response = await fetch(`${this.baseUrl}/admin/workflows/rules?${params}`, {
      headers: await this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to list workflow rules');
    }

    const result = await response.json();
    return result.data;
  }

  async updateRule(ruleId: string, updates: Partial<WorkflowRule>): Promise<WorkflowRule> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/rules/${ruleId}`, {
      method: 'PUT',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update workflow rule');
    }

    const result = await response.json();
    return result.data;
  }

  async deleteRule(ruleId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/rules/${ruleId}`, {
      method: 'DELETE',
      headers: await this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to delete workflow rule');
    }
  }

  // Analytics and Monitoring
  async getWorkflowAnalytics(templateId?: string, startDate?: Date, endDate?: Date): Promise<WorkflowAnalytics> {
    const params = new URLSearchParams();
    if (templateId) params.append('templateId', templateId);
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    const response = await fetch(`${this.baseUrl}/admin/workflows/analytics?${params}`, {
      headers: await this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to get workflow analytics');
    }

    const result = await response.json();
    return result.data;
  }

  // Workflow Designer Support
  async validateWorkflowDesign(designData: any): Promise<{ valid: boolean; errors?: string[] }> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/validate-design`, {
      method: 'POST',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(designData)
    });

    if (!response.ok) {
      throw new Error('Failed to validate workflow design');
    }

    const result = await response.json();
    return result.data;
  }

  async testWorkflow(templateId: string, testData: Record<string, any>): Promise<{ success: boolean; result?: any }> {
    const response = await fetch(`${this.baseUrl}/admin/workflows/test`, {
      method: 'POST',
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ templateId, testData })
    });

    if (!response.ok) {
      throw new Error('Failed to test workflow');
    }

    const result = await response.json();
    return result.data;
  }
}

export const workflowService = new WorkflowService();
export default workflowService;