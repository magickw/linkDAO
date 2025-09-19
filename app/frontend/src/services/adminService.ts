import { authService } from './authService';
import { 
  ModerationQueue, 
  SellerApplication, 
  DisputeCase, 
  AdminAction,
  AuthUser 
} from '@/types/auth';

class AdminService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
  }

  private getHeaders() {
    return authService.getAuthHeaders();
  }

  // Moderation Queue Management
  async getModerationQueue(filters?: {
    type?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: ModerationQueue[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/moderation?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch moderation queue');
    }

    return response.json();
  }

  async assignModerationItem(itemId: string, assigneeId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/moderation/${itemId}/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ assigneeId }),
    });

    if (!response.ok) {
      throw new Error('Failed to assign moderation item');
    }

    return response.json();
  }

  async resolveModerationItem(itemId: string, resolution: {
    action: 'approve' | 'reject' | 'escalate' | 'require_changes';
    reason: string;
    details?: any;
  }): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/moderation/${itemId}/resolve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(resolution),
    });

    if (!response.ok) {
      throw new Error('Failed to resolve moderation item');
    }

    return response.json();
  }

  // Seller Application Management
  async getSellerApplications(filters?: {
    status?: string;
    businessType?: string;
    submittedAfter?: string;
    page?: number;
    limit?: number;
  }): Promise<{ applications: SellerApplication[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/sellers/applications?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch seller applications');
    }

    return response.json();
  }

  async getSellerApplication(applicationId: string): Promise<SellerApplication> {
    const response = await fetch(`${this.baseUrl}/api/admin/sellers/applications/${applicationId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch seller application');
    }

    return response.json();
  }

  async reviewSellerApplication(applicationId: string, review: {
    status: 'approved' | 'rejected' | 'requires_info';
    notes?: string;
    rejectionReason?: string;
    requiredInfo?: string[];
  }): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/sellers/applications/${applicationId}/review`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(review),
    });

    if (!response.ok) {
      throw new Error('Failed to review seller application');
    }

    return response.json();
  }

  // Dispute Resolution
  async getDisputes(filters?: {
    status?: string;
    type?: string;
    priority?: string;
    assignedTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ disputes: DisputeCase[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/disputes?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch disputes');
    }

    return response.json();
  }

  async getDispute(disputeId: string): Promise<DisputeCase> {
    const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dispute');
    }

    return response.json();
  }

  async assignDispute(disputeId: string, assigneeId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/assign`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ assigneeId }),
    });

    if (!response.ok) {
      throw new Error('Failed to assign dispute');
    }

    return response.json();
  }

  async resolveDispute(disputeId: string, resolution: {
    outcome: 'buyer_favor' | 'seller_favor' | 'partial_refund' | 'no_action';
    refundAmount?: number;
    reasoning: string;
    adminNotes?: string;
  }): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/resolve`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(resolution),
    });

    if (!response.ok) {
      throw new Error('Failed to resolve dispute');
    }

    return response.json();
  }

  async addDisputeNote(disputeId: string, note: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/notes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ note }),
    });

    if (!response.ok) {
      throw new Error('Failed to add dispute note');
    }

    return response.json();
  }

  // User Management
  async getUsers(filters?: {
    role?: string;
    status?: string;
    kycStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: AuthUser[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/users?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return response.json();
  }

  async suspendUser(userId: string, suspension: {
    reason: string;
    duration?: number; // days
    permanent?: boolean;
  }): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(suspension),
    });

    if (!response.ok) {
      throw new Error('Failed to suspend user');
    }

    return response.json();
  }

  async unsuspendUser(userId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/users/${userId}/unsuspend`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to unsuspend user');
    }

    return response.json();
  }

  async updateUserRole(userId: string, role: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user role');
    }

    return response.json();
  }

  // Content Management
  async moderateContent(contentId: string, action: {
    type: 'approve' | 'reject' | 'flag' | 'feature';
    reason?: string;
    notes?: string;
  }): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/content/${contentId}/moderate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(action),
    });

    if (!response.ok) {
      throw new Error('Failed to moderate content');
    }

    return response.json();
  }

  // Analytics and Reporting
  async getAdminStats(): Promise<{
    pendingModerations: number;
    pendingSellerApplications: number;
    openDisputes: number;
    suspendedUsers: number;
    totalUsers: number;
    totalSellers: number;
    recentActions: AdminAction[];
  }> {
    const response = await fetch(`${this.baseUrl}/api/admin/stats`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch admin stats');
    }

    return response.json();
  }

  async getAuditLog(filters?: {
    adminId?: string;
    action?: string;
    targetType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ actions: AdminAction[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/audit?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch audit log');
    }

    return response.json();
  }
}

export const adminService = new AdminService();
export default adminService;