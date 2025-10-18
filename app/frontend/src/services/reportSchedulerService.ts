import { SchedulingConfig, ReportExecution } from '../types/reporting';

interface ScheduledReport {
  id: string;
  templateId: string;
  schedule: SchedulingConfig;
  nextRun: Date;
  lastRun?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  parameters: Record<string, any>;
  executionHistory: ReportExecution[];
}

class ReportSchedulerService {
  private baseUrl = '/api/admin/report-scheduler';

  // Scheduled Reports
  async scheduleReport(
    templateId: string,
    schedule: SchedulingConfig,
    parameters: Record<string, any> = {}
  ): Promise<ScheduledReport> {
    const response = await fetch(`${this.baseUrl}/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId,
        schedule,
        parameters
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to schedule report');
    }

    const result = await response.json();
    return result.data;
  }

  async getScheduledReport(id: string): Promise<ScheduledReport> {
    const response = await fetch(`${this.baseUrl}/scheduled/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get scheduled report');
    }

    const result = await response.json();
    return result.data;
  }

  async updateScheduledReport(id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport> {
    const response = await fetch(`${this.baseUrl}/scheduled/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update scheduled report');
    }

    const result = await response.json();
    return result.data;
  }

  async listScheduledReports(filters?: {
    templateId?: string;
    createdBy?: string;
    isActive?: boolean;
  }): Promise<ScheduledReport[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.templateId) params.append('templateId', filters.templateId);
      if (filters.createdBy) params.append('createdBy', filters.createdBy);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
    }

    const response = await fetch(`${this.baseUrl}/scheduled?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list scheduled reports');
    }

    const result = await response.json();
    return result.data;
  }

  async deleteScheduledReport(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/scheduled/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete scheduled report');
    }
  }

  // Report Execution
  async executeReport(
    templateId: string,
    parameters: Record<string, any> = {},
    format: 'pdf' | 'excel' | 'csv' | 'html' | 'json' = 'pdf'
  ): Promise<ReportExecution> {
    const response = await fetch(`${this.baseUrl}/execute/${templateId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parameters,
        format
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute report');
    }

    const result = await response.json();
    return result.data;
  }

  async getExecution(id: string): Promise<ReportExecution> {
    const response = await fetch(`${this.baseUrl}/executions/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get execution');
    }

    const result = await response.json();
    return result.data;
  }

  async listExecutions(filters?: {
    templateId?: string;
    status?: string;
    executedBy?: string;
    limit?: number;
  }): Promise<ReportExecution[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.templateId) params.append('templateId', filters.templateId);
      if (filters.status) params.append('status', filters.status);
      if (filters.executedBy) params.append('executedBy', filters.executedBy);
      if (filters.limit) params.append('limit', filters.limit.toString());
    }

    const response = await fetch(`${this.baseUrl}/executions?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list executions');
    }

    const result = await response.json();
    return result.data;
  }

  async cancelExecution(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/executions/${id}/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to cancel execution');
    }
  }

  // Parameter Management
  async validateParameters(templateId: string, parameters: Record<string, any>): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/validate/${templateId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parameters }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to validate parameters');
    }

    const result = await response.json();
    return result.data;
  }

  // History and Version Control
  async getExecutionHistory(templateId: string, limit: number = 50): Promise<ReportExecution[]> {
    const response = await fetch(`${this.baseUrl}/history/${templateId}?limit=${limit}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get execution history');
    }

    const result = await response.json();
    return result.data;
  }

  async compareExecutions(executionId1: string, executionId2: string): Promise<{
    execution1: ReportExecution | null;
    execution2: ReportExecution | null;
    differences: string[];
  }> {
    const response = await fetch(`${this.baseUrl}/compare/${executionId1}/${executionId2}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to compare executions');
    }

    const result = await response.json();
    return result.data;
  }

  // Statistics and Monitoring
  async getSchedulerStats(): Promise<{
    totalScheduled: number;
    activeScheduled: number;
    totalExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    runningExecutions: number;
    pendingExecutions: number;
    averageExecutionTime: number;
    successRate: number;
  }> {
    const response = await fetch(`${this.baseUrl}/stats`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get scheduler stats');
    }

    const result = await response.json();
    return result.data;
  }

  // Utility methods
  formatNextRun(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) {
      return 'Overdue';
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `In ${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `In ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `In ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return 'Soon';
    }
  }

  formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return '✓';
      case 'running':
        return '⟳';
      case 'pending':
        return '⏳';
      case 'failed':
        return '✗';
      case 'cancelled':
        return '⊘';
      default:
        return '?';
    }
  }
}

export const reportSchedulerService = new ReportSchedulerService();