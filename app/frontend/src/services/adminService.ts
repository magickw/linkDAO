import { authService } from './authService';
import { 
  ModerationQueue, 
  SellerApplication, 
  DisputeCase, 
  AdminAction,
  AuthUser 
} from '@/types/auth';

// AI Insights Types
interface ContentDemandPrediction {
  topic: string;
  category: string;
  predictedDemand: number;
  confidence: number;
  timeframe: 'week' | 'month' | 'quarter';
  factors: Array<{
    factor: string;
    weight: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  recommendations: string[];
}

interface UserBehaviorPrediction {
  userId?: string;
  sessionId: string;
  predictions: Array<{
    action: 'view_document' | 'search' | 'contact_support' | 'abandon' | 'convert';
    probability: number;
    confidence: number;
    timeframe: number;
    factors: string[];
  }>;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
}

interface ContentPerformancePrediction {
  documentPath: string;
  predictions: Array<{
    metric: 'views' | 'satisfaction' | 'conversion' | 'support_escalation';
    predictedValue: number;
    currentValue: number;
    trend: 'improving' | 'declining' | 'stable';
    confidence: number;
  }>;
  recommendations: string[];
}

interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert' | 'opportunity' | 'risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;
  actionItems: any[];
  relatedMetrics: string[];
  timestamp: string;
  category: string;
  priority: number;
  impact: 'positive' | 'negative' | 'neutral';
  timeframe: string;
  metadata: Record<string, any>;
}

interface ComprehensiveInsightReport {
  generatedAt: string;
  timeframe: string;
  summary: {
    totalInsights: number;
    criticalAlerts: number;
    opportunities: number;
    risks: number;
    trends: number;
    anomalies: number;
  };
  insights: AIInsight[];
  predictions: any[];
  anomalies: any[];
  trends: any[];
  recommendations: string[];
  nextActions: string[];
}

interface EngineStatus {
  isRunning: boolean;
  lastUpdate: string;
  componentsStatus: {
    predictiveAnalytics: 'active' | 'inactive' | 'error';
    anomalyDetection: 'active' | 'inactive' | 'error';
    automatedInsights: 'active' | 'inactive' | 'error';
    trendAnalysis: 'active' | 'inactive' | 'error';
  };
  performance: {
    totalInsightsGenerated: number;
    averageProcessingTime: number;
    errorRate: number;
    lastError?: string;
  };
}

interface AdminNotification {
  id: string;
  adminId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'moderation' | 'system' | 'security' | 'user' | 'seller' | 'dispute';
  metadata?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

class AdminService {
  private baseUrl: string;

  constructor() {
    // Use port 10000 based on the start-services.sh script
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
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
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/moderation?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch moderation queue: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getModerationQueue:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { items: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async assignModerationItem(itemId: string, assigneeId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/moderation/${itemId}/assign`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ assigneeId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to assign moderation item: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in assignModerationItem:', error);
      return { success: false };
    }
  }

  async resolveModerationItem(itemId: string, resolution: {
    action: 'approve' | 'reject' | 'escalate' | 'require_changes';
    reason: string;
    details?: any;
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/moderation/${itemId}/resolve`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(resolution),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to resolve moderation item: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in resolveModerationItem:', error);
      return { success: false };
    }
  }

  // Seller Application Management
  async getSellerApplications(filters?: {
    status?: string;
    businessType?: string;
    submittedAfter?: string;
    page?: number;
    limit?: number;
  }): Promise<{ applications: SellerApplication[]; total: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/sellers/applications?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch seller applications: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || { applications: [], total: 0, page: 1, totalPages: 0 };
    } catch (error) {
      console.error('Error in getSellerApplications:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { applications: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async getSellerApplication(applicationId: string): Promise<SellerApplication> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/sellers/applications/${applicationId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch seller application: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getSellerApplication:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async reviewSellerApplication(applicationId: string, review: {
    status: 'approved' | 'rejected' | 'requires_info';
    notes?: string;
    rejectionReason?: string;
    requiredInfo?: string[];
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/sellers/applications/${applicationId}/review`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(review),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to review seller application: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in reviewSellerApplication:', error);
      return { success: false };
    }
  }

  async getSellerRiskAssessment(applicationId: string): Promise<{ assessment: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/sellers/applications/${applicationId}/risk-assessment`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch seller risk assessment: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getSellerRiskAssessment:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async getSellerPerformance(filters?: {
    status?: string;
    minRating?: string;
    search?: string;
    sortBy?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ sellers: any[]; total: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/sellers/performance?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch seller performance: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getSellerPerformance:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { sellers: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async exportSellerPerformance(filters?: {
    status?: string;
    minRating?: string;
    search?: string;
    sortBy?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; downloadUrl?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/sellers/performance/export?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to export seller performance: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in exportSellerPerformance:', error);
      return { success: false };
    }
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
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/disputes?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch disputes: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || { disputes: [], total: 0, page: 1, totalPages: 0 };
    } catch (error) {
      console.error('Error in getDisputes:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { disputes: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async getDispute(disputeId: string): Promise<DisputeCase> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/disputes/${disputeId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch dispute: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getDispute:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async assignDispute(disputeId: string, assigneeId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/disputes/${disputeId}/assign`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ assigneeId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to assign dispute: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in assignDispute:', error);
      return { success: false };
    }
  }

  async resolveDispute(disputeId: string, resolution: {
    outcome: 'buyer_favor' | 'seller_favor' | 'partial_refund' | 'no_action';
    refundAmount?: number;
    reasoning: string;
    adminNotes?: string;
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(resolution),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to resolve dispute: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in resolveDispute:', error);
      return { success: false };
    }
  }

  async addDisputeNote(disputeId: string, note: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/disputes/${disputeId}/notes`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ note }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to add dispute note: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in addDisputeNote:', error);
      return { success: false };
    }
  }

  // Evidence Management
  async uploadDisputeEvidence(disputeId: string, formData: FormData): Promise<{ success: boolean; evidence: any[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/disputes/${disputeId}/evidence`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          // Remove Content-Type to let browser set it with boundary for FormData
          'Content-Type': undefined as any
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to upload evidence: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in uploadDisputeEvidence:', error);
      return { success: false, evidence: [] };
    }
  }

  async deleteDisputeEvidence(disputeId: string, evidenceId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/disputes/${disputeId}/evidence/${evidenceId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete evidence: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in deleteDisputeEvidence:', error);
      return { success: false };
    }
  }

  async updateEvidenceStatus(disputeId: string, evidenceId: string, status: 'verified' | 'rejected' | 'pending'): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/disputes/${disputeId}/evidence/${evidenceId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update evidence status: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in updateEvidenceStatus:', error);
      return { success: false };
    }
  }

  // Communication Thread
  async getDisputeMessages(disputeId: string): Promise<{ messages: any[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/disputes/${disputeId}/messages`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch dispute messages: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getDisputeMessages:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { messages: [] };
    }
  }

  async sendDisputeMessage(disputeId: string, messageData: {
    message: string;
    sender: string;
    isInternal?: boolean;
  }): Promise<{ success: boolean; message: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to send message: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in sendDisputeMessage:', error);
      return { success: false, message: null };
    }
  }

  // User Management
  async getUsers(filters?: {
    role?: string;
    status?: string;
    kycStatus?: string;
    search?: string;
    searchField?: string;
    lastLoginAfter?: string;
    lastLoginBefore?: string;
    createdAfter?: string;
    createdBefore?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<{ users: AuthUser[]; total: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/users?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getUsers:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { users: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async suspendUser(userId: string, suspension: {
    reason: string;
    duration?: number; // days
    permanent?: boolean;
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(suspension),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to suspend user: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in suspendUser:', error);
      return { success: false };
    }
  }

  async unsuspendUser(userId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to unsuspend user: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in unsuspendUser:', error);
      return { success: false };
    }
  }

  async updateUserRole(userId: string, role: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update user role: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      return { success: false };
    }
  }

  async getUserActivity(userId: string): Promise<{ activities: any[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/users/${userId}/activity`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch user activity: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getUserActivity:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { activities: [] };
    }
  }

  async exportUsers(filters?: {
    role?: string;
    status?: string;
    kycStatus?: string;
    search?: string;
  }): Promise<{ success: boolean; downloadUrl?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/users/export?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to export users: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in exportUsers:', error);
      return { success: false };
    }
  }

  // Moderation History
  async getModerationHistory(filters?: {
    moderatorId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ actions: any[]; total: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/moderation/history?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch moderation history: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getModerationHistory:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { actions: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async undoModerationAction(actionId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/moderation/history/${actionId}/undo`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to undo moderation action: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in undoModerationAction:', error);
      return { success: false };
    }
  }

  async exportModerationHistory(filters?: {
    moderatorId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ success: boolean; downloadUrl?: string }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/moderation/history/export?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to export moderation history: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in exportModerationHistory:', error);
      return { success: false };
    }
  }

  async deleteModerationItem(itemId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/moderation/${itemId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to delete moderation item: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in deleteModerationItem:', error);
      return { success: false };
    }
  }

  // Content Management
  async moderateContent(contentId: string, action: {
    type: 'approve' | 'reject' | 'flag' | 'feature';
    reason?: string;
    notes?: string;
  }): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/content/${contentId}/moderate`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(action),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to moderate content: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in moderateContent:', error);
      return { success: false };
    }
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
    try {
      const response = await fetch(`${this.baseUrl}/admin/stats`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch admin stats: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getAdminStats:', error);
      // Return default state instead of throwing to maintain UI stability
      return {
        pendingModerations: 0,
        pendingSellerApplications: 0,
        openDisputes: 0,
        suspendedUsers: 0,
        totalUsers: 0,
        totalSellers: 0,
        recentActions: []
      };
    }
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
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/audit?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch audit log: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getAuditLog:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { actions: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  // AI Insights and Predictive Analytics
  async getAIInsightsReport(timeframe: string = 'daily'): Promise<ComprehensiveInsightReport> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/ai-insights/report?timeframe=${timeframe}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch AI insights report: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getAIInsightsReport:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async getAIEngineStatus(): Promise<EngineStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/ai-insights/status`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch AI engine status: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getAIEngineStatus:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async getPredictiveAnalytics(type: string, horizon: number = 7): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/ai-insights/predictions?type=${type}&horizon=${horizon}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch predictive analytics: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getPredictiveAnalytics:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async getContentDemandPredictions(timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<ContentDemandPrediction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/ai-insights/predictions?type=content_demand&timeframe=${timeframe}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch content demand predictions: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getContentDemandPredictions:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async getUserBehaviorPredictions(horizon: number = 7): Promise<UserBehaviorPrediction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/ai-insights/predictions?type=user_behavior&horizon=${horizon}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch user behavior predictions: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getUserBehaviorPredictions:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async getContentPerformancePredictions(): Promise<ContentPerformancePrediction[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/ai-insights/predictions?type=content_performance`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch content performance predictions: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getContentPerformancePredictions:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async getAnomalies(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/ai-insights/anomalies`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch anomalies: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getAnomalies:', error);
      throw error; // Re-throw for critical operations
    }
  }

  async getTrendAnalysis(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/ai-insights/trends`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch trend analysis: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getTrendAnalysis:', error);
      throw error; // Re-throw for critical operations
    }
  }

  // Admin Notification Management
  async getAdminNotifications(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: AdminNotification[]; total: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/admin/notifications?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch admin notifications: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getAdminNotifications:', error);
      // Return empty state instead of throwing to maintain UI stability
      return { notifications: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to mark notification as read: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      return { success: false };
    }
  }

  async markAllNotificationsAsRead(): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/notifications/read-all`, {
        method: 'PATCH',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to mark all notifications as read: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in markAllNotificationsAsRead:', error);
      return { success: false };
    }
  }

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/notifications/unread-count`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch unread notification count: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getUnreadNotificationCount:', error);
      // Return default state instead of throwing to maintain UI stability
      return { count: 0 };
    }
  }

  async getNotificationStats(): Promise<NotificationStats> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/notifications/stats`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch notification stats: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getNotificationStats:', error);
      // Return default state instead of throwing to maintain UI stability
      return { 
        total: 0, 
        unread: 0, 
        byType: {}, 
        byCategory: {} 
      };
    }
  }

  async registerMobilePushToken(token: string, platform: 'ios' | 'android' | 'web'): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/mobile/push/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ token, platform }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to register mobile push token: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in registerMobilePushToken:', error);
      return { success: false };
    }
  }

  async unregisterMobilePushToken(token: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/mobile/push/unregister`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to unregister mobile push token: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in unregisterMobilePushToken:', error);
      return { success: false };
    }
  }
}

export const adminService = new AdminService();
export default adminService;
