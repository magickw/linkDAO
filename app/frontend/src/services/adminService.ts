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
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10001';
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

    try {
      const response = await fetch(`${this.baseUrl}/api/admin/sellers/applications?${params}`, {
        headers: this.getHeaders(),
      });

      const data = await response.json();

      // Handle error responses gracefully - return empty results
      if (!response.ok || !data.success) {
        console.warn('Seller applications API error:', data.error?.message || 'Unknown error');
        return { applications: [], total: 0, page: 1, totalPages: 0 };
      }

      return data.data || { applications: [], total: 0, page: 1, totalPages: 0 };
    } catch (error) {
      console.error('Failed to fetch seller applications:', error);
      // Return empty state instead of throwing
      return { applications: [], total: 0, page: 1, totalPages: 0 };
    }
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

  async getSellerRiskAssessment(applicationId: string): Promise<{ assessment: any }> {
    const response = await fetch(`${this.baseUrl}/api/admin/sellers/applications/${applicationId}/risk-assessment`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch seller risk assessment');
    }

    return response.json();
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
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/sellers/performance?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch seller performance');
    }

    return response.json();
  }

  async exportSellerPerformance(filters?: {
    status?: string;
    minRating?: string;
    search?: string;
    sortBy?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; downloadUrl?: string }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/sellers/performance/export?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export seller performance');
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

    try {
      const response = await fetch(`${this.baseUrl}/api/admin/disputes?${params}`, {
        headers: this.getHeaders(),
      });

      const data = await response.json();

      // Handle error responses gracefully - return empty results
      if (!response.ok || !data.success) {
        console.warn('Disputes API error:', data.error?.message || 'Unknown error');
        return { disputes: [], total: 0, page: 1, totalPages: 0 };
      }

      return data.data || { disputes: [], total: 0, page: 1, totalPages: 0 };
    } catch (error) {
      console.error('Failed to fetch disputes:', error);
      // Return empty state instead of throwing
      return { disputes: [], total: 0, page: 1, totalPages: 0 };
    }
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

  // Evidence Management
  async uploadDisputeEvidence(disputeId: string, formData: FormData): Promise<{ success: boolean; evidence: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/evidence`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        // Remove Content-Type to let browser set it with boundary for FormData
        'Content-Type': undefined as any
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload evidence');
    }

    return response.json();
  }

  async deleteDisputeEvidence(disputeId: string, evidenceId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/evidence/${evidenceId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete evidence');
    }

    return response.json();
  }

  async updateEvidenceStatus(disputeId: string, evidenceId: string, status: 'verified' | 'rejected' | 'pending'): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/evidence/${evidenceId}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update evidence status');
    }

    return response.json();
  }

  // Communication Thread
  async getDisputeMessages(disputeId: string): Promise<{ messages: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/messages`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dispute messages');
    }

    return response.json();
  }

  async sendDisputeMessage(disputeId: string, messageData: {
    message: string;
    sender: string;
    isInternal?: boolean;
  }): Promise<{ success: boolean; message: any }> {
    const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
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

  async getUserActivity(userId: string): Promise<{ activities: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/admin/users/${userId}/activity`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user activity');
    }

    return response.json();
  }

  async exportUsers(filters?: {
    role?: string;
    status?: string;
    kycStatus?: string;
    search?: string;
  }): Promise<{ success: boolean; downloadUrl?: string }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/users/export?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export users');
    }

    return response.json();
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
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/moderation/history?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch moderation history');
    }

    return response.json();
  }

  async undoModerationAction(actionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/moderation/history/${actionId}/undo`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to undo moderation action');
    }

    return response.json();
  }

  async exportModerationHistory(filters?: {
    moderatorId?: string;
    action?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ success: boolean; downloadUrl?: string }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/moderation/history/export?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to export moderation history');
    }

    return response.json();
  }

  async deleteModerationItem(itemId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/moderation/${itemId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete moderation item');
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

  // AI Insights and Predictive Analytics
  async getAIInsightsReport(timeframe: string = 'daily'): Promise<ComprehensiveInsightReport> {
    const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/report?timeframe=${timeframe}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch AI insights report');
    }

    return response.json();
  }

  async getAIEngineStatus(): Promise<EngineStatus> {
    const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/status`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch AI engine status');
    }

    return response.json();
  }

  async getPredictiveAnalytics(type: string, horizon: number = 7): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/predictions?type=${type}&horizon=${horizon}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch predictive analytics');
    }

    return response.json();
  }

  async getContentDemandPredictions(timeframe: 'week' | 'month' | 'quarter' = 'month'): Promise<ContentDemandPrediction[]> {
    const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/predictions?type=content_demand&timeframe=${timeframe}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch content demand predictions');
    }

    return response.json();
  }

  async getUserBehaviorPredictions(horizon: number = 7): Promise<UserBehaviorPrediction[]> {
    const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/predictions?type=user_behavior&horizon=${horizon}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user behavior predictions');
    }

    return response.json();
  }

  async getContentPerformancePredictions(): Promise<ContentPerformancePrediction[]> {
    const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/predictions?type=content_performance`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch content performance predictions');
    }

    return response.json();
  }

  async getAnomalies(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/anomalies`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch anomalies');
    }

    return response.json();
  }

  async getTrendAnalysis(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/trends`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch trend analysis');
    }

    return response.json();
  }

  // Admin Notification Management
  async getAdminNotifications(filters?: {
    limit?: number;
    offset?: number;
  }): Promise<{ notifications: AdminNotification[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseUrl}/api/admin/notifications?${params}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch admin notifications');
    }

    return response.json();
  }

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }

    return response.json();
  }

  async markAllNotificationsAsRead(): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/notifications/read-all`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }

    return response.json();
  }

  async getUnreadNotificationCount(): Promise<{ count: number }> {
    const response = await fetch(`${this.baseUrl}/api/admin/notifications/unread-count`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch unread notification count');
    }

    return response.json();
  }

  async getNotificationStats(): Promise<NotificationStats> {
    const response = await fetch(`${this.baseUrl}/api/admin/notifications/stats`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notification stats');
    }

    return response.json();
  }

  async registerMobilePushToken(token: string, platform: 'ios' | 'android' | 'web'): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/mobile/push/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ token, platform }),
    });

    if (!response.ok) {
      throw new Error('Failed to register mobile push token');
    }

    return response.json();
  }

  async unregisterMobilePushToken(token: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/api/admin/mobile/push/unregister`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Failed to unregister mobile push token');
    }

    return response.json();
  }
}

export const adminService = new AdminService();
export default adminService;