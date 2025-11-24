import {
  TimeTracking,
  ProjectDeliverable,
  MilestonePayment,
  ProjectThread,
  ProjectMessage,
  ProjectApproval,
  ProjectFile,
  ProjectDashboard,
  StartTimeTrackingRequest,
  StopTimeTrackingRequest,
  CreateDeliverableRequest,
  UpdateDeliverableRequest,
  CreateMilestonePaymentRequest,
  CreateProjectThreadRequest,
  SendProjectMessageRequest,
  CreateApprovalRequest,
  ProcessApprovalRequest,
  UploadProjectFileRequest
} from '../types/service';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

class ProjectManagementService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';

    const response = await fetch(`${API_BASE_URL}/api/project-management${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Time Tracking Methods
  async startTimeTracking(request: StartTimeTrackingRequest): Promise<TimeTracking> {
    return this.request<TimeTracking>('/time-tracking/start', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async stopTimeTracking(request: StopTimeTrackingRequest): Promise<TimeTracking> {
    return this.request<TimeTracking>('/time-tracking/stop', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getActiveTimeTracking(): Promise<TimeTracking | null> {
    return this.request<TimeTracking | null>('/time-tracking/active');
  }

  async getTimeTrackingByBooking(bookingId: string): Promise<TimeTracking[]> {
    return this.request<TimeTracking[]>(`/time-tracking/booking/${bookingId}`);
  }

  // Deliverables Methods
  async createDeliverable(request: CreateDeliverableRequest): Promise<ProjectDeliverable> {
    return this.request<ProjectDeliverable>('/deliverables', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async updateDeliverable(deliverableId: string, request: UpdateDeliverableRequest): Promise<ProjectDeliverable> {
    return this.request<ProjectDeliverable>(`/deliverables/${deliverableId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async getDeliverablesByBooking(bookingId: string): Promise<ProjectDeliverable[]> {
    return this.request<ProjectDeliverable[]>(`/deliverables/booking/${bookingId}`);
  }

  // Milestone Payments Methods
  async createMilestonePayment(request: CreateMilestonePaymentRequest): Promise<MilestonePayment> {
    return this.request<MilestonePayment>('/milestone-payments', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async processMilestonePayment(paymentId: string, status: string, transactionHash?: string): Promise<MilestonePayment> {
    return this.request<MilestonePayment>(`/milestone-payments/${paymentId}/process`, {
      method: 'PUT',
      body: JSON.stringify({ status, transactionHash }),
    });
  }

  // Communication Methods
  async createProjectThread(request: CreateProjectThreadRequest): Promise<ProjectThread> {
    return this.request<ProjectThread>('/threads', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async sendProjectMessage(request: SendProjectMessageRequest): Promise<ProjectMessage> {
    return this.request<ProjectMessage>('/messages', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getProjectThreads(bookingId: string): Promise<ProjectThread[]> {
    return this.request<ProjectThread[]>(`/threads/booking/${bookingId}`);
  }

  async getProjectMessages(threadId: string, limit: number = 50, offset: number = 0): Promise<ProjectMessage[]> {
    return this.request<ProjectMessage[]>(`/messages/thread/${threadId}?limit=${limit}&offset=${offset}`);
  }

  // Approval Methods
  async createApproval(request: CreateApprovalRequest): Promise<ProjectApproval> {
    return this.request<ProjectApproval>('/approvals', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async processApproval(request: ProcessApprovalRequest): Promise<ProjectApproval> {
    return this.request<ProjectApproval>(`/approvals/${request.approvalId}/process`, {
      method: 'PUT',
      body: JSON.stringify({ status: request.status, feedback: request.feedback }),
    });
  }

  // File Management Methods
  async uploadProjectFile(request: UploadProjectFileRequest): Promise<ProjectFile> {
    return this.request<ProjectFile>('/files', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getProjectFiles(bookingId: string, milestoneId?: string): Promise<ProjectFile[]> {
    const query = milestoneId ? `?milestoneId=${milestoneId}` : '';
    return this.request<ProjectFile[]>(`/files/booking/${bookingId}${query}`);
  }

  // Dashboard Method
  async getProjectDashboard(bookingId: string): Promise<ProjectDashboard> {
    return this.request<ProjectDashboard>(`/dashboard/${bookingId}`);
  }

  // Utility Methods
  async markMessageAsRead(messageId: string): Promise<void> {
    // This would be implemented if we had a separate endpoint for marking messages as read
    // For now, we can implement this as part of the message fetching logic
  }

  async downloadFile(fileHash: string, fileName: string): Promise<void> {
    // This would integrate with IPFS service to download files
    // Implementation would depend on how files are stored and retrieved
    const ipfsGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';
    const url = `${ipfsGateway}${fileHash}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Real-time updates (would integrate with WebSocket or Server-Sent Events)
  subscribeToProjectUpdates(bookingId: string, callback: (update: any) => void): () => void {
    // This would set up real-time subscriptions for project updates
    // For now, return a no-op unsubscribe function
    return () => { };
  }

  // Analytics and reporting
  async getTimeTrackingReport(bookingId: string, startDate?: Date, endDate?: Date): Promise<{
    totalHours: number;
    billableHours: number;
    totalAmount: string;
    dailyBreakdown: Array<{
      date: string;
      hours: number;
      amount: string;
    }>;
  }> {
    const timeRecords = await this.getTimeTrackingByBooking(bookingId);

    let filteredRecords = timeRecords;
    if (startDate || endDate) {
      filteredRecords = timeRecords.filter(record => {
        const recordDate = new Date(record.startTime);
        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
        return true;
      });
    }

    const totalHours = filteredRecords.reduce((sum, record) => sum + (record.durationMinutes || 0), 0) / 60;
    const billableHours = filteredRecords
      .filter(record => record.isBillable)
      .reduce((sum, record) => sum + (record.durationMinutes || 0), 0) / 60;
    const totalAmount = filteredRecords
      .reduce((sum, record) => sum + parseFloat(record.totalAmount || '0'), 0)
      .toFixed(8);

    // Group by date for daily breakdown
    const dailyMap = new Map<string, { hours: number; amount: number }>();
    filteredRecords.forEach(record => {
      const date = new Date(record.startTime).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { hours: 0, amount: 0 };
      existing.hours += (record.durationMinutes || 0) / 60;
      existing.amount += parseFloat(record.totalAmount || '0');
      dailyMap.set(date, existing);
    });

    const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      hours: Math.round(data.hours * 100) / 100,
      amount: data.amount.toFixed(2)
    }));

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      totalAmount,
      dailyBreakdown
    };
  }
}

export const projectManagementService = new ProjectManagementService();