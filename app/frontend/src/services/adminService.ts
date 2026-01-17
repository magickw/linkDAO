import { enhancedAuthService } from './enhancedAuthService';
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

import { OrderEvent } from '@/types/order';

export interface AdminOrderMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  recentGrowth: number;
}

export interface AdminOrderFilters {
  status?: string;
  sellerId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdminOrderDetails {
  id: string;
  sellerId: string;
  buyerId: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  items: any[];
  shippingAddress: any;
  paymentDetails: any;
  timeline: OrderEvent[];
  availableActions: string[];
  auditLog: any[];
}

class AdminService {
  private baseUrl: string;

  constructor() {
    // Use port 10000 based on the start-services.sh script
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
  }

  // Public method to get auth headers
  async getAuthHeaders() {
    return await enhancedAuthService.getAuthHeaders();
  }

  // Private method for internal use
  private async getHeaders() {
    return await this.getAuthHeaders();
  }

  // Order Management
  async getOrderMetrics(): Promise<AdminOrderMetrics> {
    try {
      console.log('[adminService] Fetching order metrics from:', `${this.baseUrl}/api/admin/orders/metrics`);
      const response = await fetch(`${this.baseUrl}/api/admin/orders/metrics`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[adminService] getOrderMetrics failed:', response.status, errorText);
        throw new Error(`Failed to fetch order metrics: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[adminService] Order metrics response:', result);
      return result.data || result;
    } catch (error) {
      console.error('[adminService] Error in getOrderMetrics:', error);
      throw error;
    }
  }

  async getOrders(filters?: AdminOrderFilters): Promise<{ orders: any[]; total: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') params.append(key, value.toString());
        });
      }

      console.log('[adminService] Fetching orders with filters:', filters);
      const response = await fetch(`${this.baseUrl}/api/admin/orders?${params}`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[adminService] getOrders failed:', response.status, errorText);
        throw new Error(`Failed to fetch orders: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[adminService] Orders response:', result);
      return result.data || { orders: [], total: 0, page: 1, totalPages: 0 };
    } catch (error) {
      console.error('[adminService] Error in getOrders:', error);
      return { orders: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async getDelayedOrders(): Promise<any[]> {
    try {
      console.log('[adminService] Fetching delayed orders');
      const response = await fetch(`${this.baseUrl}/api/admin/orders/delayed`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[adminService] getDelayedOrders failed:', response.status, errorText);
        throw new Error(`Failed to fetch delayed orders: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[adminService] Delayed orders response:', result);
      return result.data || [];
    } catch (error) {
      console.error('[adminService] Error in getDelayedOrders:', error);
      return [];
    }
  }

  async getOrderDetails(orderId: string): Promise<AdminOrderDetails | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/orders/${orderId}`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch order details: ${response.status}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Error in getOrderDetails:', error);
      return null;
    }
  }

  async performAdminAction(orderId: string, action: string, reason: string, note?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/orders/${orderId}/action`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({ action, reason, note }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to perform action: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in performAdminAction:', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getOrderReceipt(orderId: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/orders/${orderId}/receipt`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch receipt: ${response.status}`);
      }

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Error in getOrderReceipt:', error);
      return null;
    }
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

      const response = await fetch(`${this.baseUrl}/api/admin/moderation?${params}`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch moderation queue: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      console.error('Error in getModerationQueue:', error);

      // Check if it's an auth error and we should return mock data
      const errorMessage = error.message || '';
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        return {
          items: [
            {
              id: 'mock_mod_1',
              type: 'post',
              priority: 'high',
              status: 'pending',
              targetId: 'post_123',
              targetType: 'post',
              reason: 'Inappropriate content',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          total: 1,
          page: 1,
          totalPages: 1
        };
      }

      // Return empty state instead of throwing to maintain UI stability
      return { items: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async assignModerationItem(itemId: string, assigneeId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/moderation/${itemId}/assign`, {
        method: 'POST',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/moderation/${itemId}/resolve`, {
        method: 'POST',
        headers: await this.getHeaders(),
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

      const response = await fetch(`${this.baseUrl}/api/admin/sellers/applications?${params}`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch seller applications: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || { applications: [], total: 0, page: 1, totalPages: 0 };
    } catch (error: any) {
      console.error('Error in getSellerApplications:', error);

      // Check if it's an auth error and we should return mock data
      const errorMessage = error.message || '';
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        return {
          applications: [
            {
              id: 'mock_app_1',
              applicantId: 'user_123',
              applicantAddress: '0x1234567890123456789012345678901234567890',
              applicantHandle: 'seller_candidate',
              businessType: 'individual',
              description: 'Handmade crafts',
              categories: ['art'],
              documents: {},
              contactInfo: { email: 'test@example.com' },
              status: 'pending',
              submittedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          total: 1,
          page: 1,
          totalPages: 1
        };
      }

      // Return empty state instead of throwing to maintain UI stability
      return { applications: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async getSellerApplication(applicationId: string): Promise<SellerApplication> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/sellers/applications/${applicationId}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/sellers/applications/${applicationId}/review`, {
        method: 'POST',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/sellers/applications/${applicationId}/risk-assessment`, {
        headers: await this.getHeaders(),
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

      const response = await fetch(`${this.baseUrl}/api/admin/sellers/performance?${params}`, {
        headers: await this.getHeaders(),
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

      const response = await fetch(`${this.baseUrl}/api/admin/sellers/performance/export?${params}`, {
        headers: await this.getHeaders(),
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

      const response = await fetch(`${this.baseUrl}/api/admin/disputes?${params}`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch disputes: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || { disputes: [], total: 0, page: 1, totalPages: 0 };
    } catch (error: any) {
      console.error('Error in getDisputes:', error);

      // Check if it's an auth error and we should return mock data
      const errorMessage = error.message || '';
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        return {
          disputes: [
            {
              id: 'mock_dispute_1',
              orderId: 'order_123',
              buyerId: 'buyer_123',
              sellerId: 'seller_123',
              type: 'product_not_received',
              status: 'open',
              priority: 'medium',
              amount: 100,
              currency: 'USDC',
              description: 'Item never arrived',
              evidence: {},
              timeline: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          total: 1,
          page: 1,
          totalPages: 1
        };
      }

      // Return empty state instead of throwing to maintain UI stability
      return { disputes: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async getDispute(disputeId: string): Promise<DisputeCase> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/assign`, {
        method: 'POST',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/notes`, {
        method: 'POST',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/evidence`, {
        method: 'POST',
        headers: {
          ...(await this.getHeaders()),
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
      const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/evidence/${evidenceId}`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/evidence/${evidenceId}/status`, {
        method: 'PATCH',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/messages`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: await this.getHeaders(),
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

      const response = await fetch(`${this.baseUrl}/api/admin/users?${params}`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch users: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      console.error('Error in getUsers:', error);

      // Check if it's an auth error and we should return mock data
      const errorMessage = error.message || '';
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        return {
          users: [
            {
              id: 'mock_user_1',
              address: '0x1234567890123456789012345678901234567890',
              handle: 'mock_user',
              role: 'user',
              permissions: [],
              kycStatus: 'none',
              isActive: true,
              isSuspended: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          total: 1,
          page: 1,
          totalPages: 1
        };
      }

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
      const response = await fetch(`${this.baseUrl}/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/users/${userId}/activity`, {
        headers: await this.getHeaders(),
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

      const response = await fetch(`${this.baseUrl}/api/admin/users/export?${params}`, {
        headers: await this.getHeaders(),
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

      const response = await fetch(`${this.baseUrl}/api/admin/moderation/history?${params}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/moderation/history/${actionId}/undo`, {
        method: 'POST',
        headers: await this.getHeaders(),
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

      const response = await fetch(`${this.baseUrl}/api/admin/moderation/history/export?${params}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/moderation/${itemId}`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/content/${contentId}/moderate`, {
        method: 'POST',
        headers: await this.getHeaders(),
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
    pendingCharityProposals?: number;
    isMock?: boolean;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/stats`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If it's a 401 or 403 error, try to get mock data
        if (response.status === 401 || response.status === 403) {
          console.warn('Admin stats access denied, using mock data');
          return this.getMockAdminStats();
        }
        throw new Error(errorData.message || `Failed to fetch admin stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Fetch charity stats separately if not included
      let charityStats = { pendingCharityProposals: 0 };
      try {
        const charityResponse = await fetch(`${this.baseUrl}/api/admin/charities/stats`, {
          headers: await this.getHeaders(),
        });
        if (charityResponse.ok) {
          charityStats = await charityResponse.json();
        } else {
          console.warn('Failed to fetch charity stats:', charityResponse.status);
        }
      } catch (error) {
        console.warn('Failed to fetch charity stats:', error);
      }

      return {
        ...data,
        pendingCharityProposals: charityStats.pendingCharityProposals || 0,
      };
    } catch (error: any) {
      console.error('Error in getAdminStats:', error);

      // Check if it's an auth error and we should return mock data
      const errorMessage = error.message || '';
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        console.warn('Admin stats access denied, using mock data');
        return this.getMockAdminStats();
      }

      // Return default state instead of throwing to maintain UI stability
      return this.getMockAdminStats();
    }
  }

  private getMockAdminStats(): any {
    return {
      pendingModerations: 0,
      pendingSellerApplications: 0,
      openDisputes: 0,
      suspendedUsers: 0,
      totalUsers: 0,
      totalSellers: 0,
      recentActions: [],
      isMock: true
    };
  }

  // Charity Verification Methods
  async getCharities(filters?: { status?: string; limit?: number }): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, value.toString());
        });
      }

      const response = await fetch(`${this.baseUrl}/api/admin/charities?${params}`, {
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch charities: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getCharities:', error);
      return [];
    }
  }

  async approveCharity(charityId: string, notes?: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/charities/${charityId}/approve`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to approve charity: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in approveCharity:', error);
      return { success: false };
    }
  }

  async rejectCharity(charityId: string, notes: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/charities/${charityId}/reject`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to reject charity: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in rejectCharity:', error);
      return { success: false };
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

      const response = await fetch(`${this.baseUrl}/api/admin/audit/logs?${params}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/report?timeframe=${timeframe}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/status`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/predictions?type=${type}&horizon=${horizon}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/predictions?type=content_demand&timeframe=${timeframe}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/predictions?type=user_behavior&horizon=${horizon}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/predictions?type=content_performance`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/anomalies`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/ai-insights/trends`, {
        headers: await this.getHeaders(),
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

      const response = await fetch(`${this.baseUrl}/api/admin/notifications?${params}`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/notifications/read-all`, {
        method: 'PATCH',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/notifications/unread-count`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/notifications/stats`, {
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/mobile/push/register`, {
        method: 'POST',
        headers: await this.getHeaders(),
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
      const response = await fetch(`${this.baseUrl}/api/admin/mobile/push/unregister`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
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

  // User Management - Create User
  async createUser(userData: {
    handle: string;
    email: string;
    walletAddress: string;
    role: string;
    password: string;
  }): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/admin/users`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create user: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in createUser:', error);
      return { success: false, error: (error as any).message };
    }
  }
}

export const adminService = new AdminService();
export default adminService;
