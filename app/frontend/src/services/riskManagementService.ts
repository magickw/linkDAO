import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface RiskMetrics {
  totalReturns: number;
  highRiskReturns: number;
  mediumRiskReturns: number;
  lowRiskReturns: number;
  flaggedForReview: number;
  fraudDetected: number;
  averageRiskScore: number;
  riskTrend: {
    daily: Array<{
      date: string;
      highRisk: number;
      mediumRisk: number;
      lowRisk: number;
      averageScore: number;
    }>;
    weekly: Array<{
      week: string;
      highRisk: number;
      mediumRisk: number;
      lowRisk: number;
      averageScore: number;
    }>;
  };
}

export interface RiskReturn {
  id: string;
  customerEmail: string;
  customerWalletAddress: string;
  sellerWalletAddress: string;
  orderId: string;
  returnReason: string;
  amount: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'escalated';
  flaggedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  evidence: Evidence[];
}

export interface RiskFactor {
  category: 'behavioral' | 'financial' | 'historical' | 'network' | 'content';
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: number;
  description: string;
  detectedAt: string;
}

export interface Evidence {
  type: 'transaction' | 'communication' | 'behavior' | 'network' | 'document';
  description: string;
  data: Record<string, any>;
  timestamp: string;
  confidence: number;
}

export interface RiskAlert {
  id: string;
  type: 'threshold_breach' | 'pattern_detected' | 'unusual_activity' | 'system_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedEntities: Array<{
    type: 'user' | 'seller' | 'return' | 'transaction';
    id: string;
    name: string;
  }>;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  metadata: Record<string, any>;
}

export interface ReviewAssignment {
  id: string;
  riskReturnId: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'escalated';
}

export interface ReviewAction {
  id: string;
  riskReturnId: string;
  actionType: 'approve' | 'reject' | 'escalate' | 'request_info' | 'flag';
  actionedBy: string;
  actionedAt: string;
  notes: string;
  previousStatus: string;
  newStatus: string;
  metadata: Record<string, any>;
}

export interface RiskReport {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period: {
    start: string;
    end: string;
  };
  metrics: RiskMetrics;
  topRiskFactors: Array<{
    factor: string;
    count: number;
    averageImpact: number;
  }>;
  riskTrends: {
    improving: number;
    stable: number;
    deteriorating: number;
  };
  recommendations: string[];
  generatedAt: string;
  generatedBy: string;
}

class RiskManagementService {
  /**
   * Get risk metrics and dashboard data
   */
  async getRiskMetrics(period?: { start: string; end: string }): Promise<RiskMetrics> {
    const response = await axios.get(`${API_URL}/admin/risk/metrics`, {
      params: period,
      withCredentials: true,
    });
    return response.data.data;
  }

  /**
   * Get high-risk returns list
   */
  async getHighRiskReturns(filters?: {
    riskLevel?: string;
    status?: string;
    dateRange?: { start: string; end: string };
    limit?: number;
    offset?: number;
  }): Promise<{ returns: RiskReturn[]; total: number }> {
    const response = await axios.get(`${API_URL}/admin/risk/returns`, {
      params: filters,
      withCredentials: true,
    });
    return response.data.data;
  }

  /**
   * Get detailed risk return information
   */
  async getRiskReturn(returnId: string): Promise<RiskReturn> {
    const response = await axios.get(`${API_URL}/admin/risk/returns/${returnId}`, {
      withCredentials: true,
    });
    return response.data.data;
  }

  /**
   * Get risk alerts
   */
  async getRiskAlerts(filters?: {
    type?: string;
    severity?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: RiskAlert[]; total: number }> {
    const response = await axios.get(`${API_URL}/admin/risk/alerts`, {
      params: filters,
      withCredentials: true,
    });
    return response.data.data;
  }

  /**
   * Acknowledge risk alert
   */
  async acknowledgeAlert(alertId: string, notes?: string): Promise<void> {
    await axios.post(`${API_URL}/admin/risk/alerts/${alertId}/acknowledge`, {
      notes,
    }, {
      withCredentials: true,
    });
  }

  /**
   * Resolve risk alert
   */
  async resolveAlert(alertId: string, resolution: string, notes?: string): Promise<void> {
    await axios.post(`${API_URL}/admin/risk/alerts/${alertId}/resolve`, {
      resolution,
      notes,
    }, {
      withCredentials: true,
    });
  }

  /**
   * Get review assignments
   */
  async getReviewAssignments(filters?: {
    assignee?: string;
    status?: string;
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ assignments: ReviewAssignment[]; total: number }> {
    const response = await axios.get(`${API_URL}/admin/risk/assignments`, {
      params: filters,
      withCredentials: true,
    });
    return response.data.data;
  }

  /**
   * Assign risk return for review
   */
  async assignForReview(returnId: string, assigneeId: string, priority: string, dueDate: string): Promise<void> {
    await axios.post(`${API_URL}/admin/risk/returns/${returnId}/assign`, {
      assigneeId,
      priority,
      dueDate,
    }, {
      withCredentials: true,
    });
  }

  /**
   * Submit review action
   */
  async submitReviewAction(returnId: string, action: {
    actionType: string;
    notes: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await axios.post(`${API_URL}/admin/risk/returns/${returnId}/review`, action, {
      withCredentials: true,
    });
  }

  /**
   * Get review history for a return
   */
  async getReviewHistory(returnId: string): Promise<ReviewAction[]> {
    const response = await axios.get(`${API_URL}/admin/risk/returns/${returnId}/history`, {
      withCredentials: true,
    });
    return response.data.data;
  }

  /**
   * Get risk reports
   */
  async getRiskReports(filters?: {
    type?: string;
    period?: { start: string; end: string };
    limit?: number;
    offset?: number;
  }): Promise<{ reports: RiskReport[]; total: number }> {
    const response = await axios.get(`${API_URL}/admin/risk/reports`, {
      params: filters,
      withCredentials: true,
    });
    return response.data.data;
  }

  /**
   * Generate risk report
   */
  async generateRiskReport(config: {
    title: string;
    type: string;
    period: { start: string; end: string };
    includeRecommendations?: boolean;
  }): Promise<RiskReport> {
    const response = await axios.post(`${API_URL}/admin/risk/reports/generate`, config, {
      withCredentials: true,
    });
    return response.data.data;
  }

  /**
   * Export risk data
   */
  async exportRiskData(config: {
    format: 'csv' | 'excel' | 'pdf';
    type: 'returns' | 'alerts' | 'metrics' | 'reports';
    filters?: Record<string, any>;
  }): Promise<Blob> {
    const response = await axios.post(`${API_URL}/admin/risk/export`, config, {
      withCredentials: true,
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Get risk configuration
   */
  async getRiskConfiguration(): Promise<{
    thresholds: Record<string, number>;
    alertRules: Array<{
      id: string;
      name: string;
      condition: string;
      enabled: boolean;
    }>;
    escalationRules: Array<{
      id: string;
      name: string;
      criteria: string;
      action: string;
      enabled: boolean;
    }>;
  }> {
    const response = await axios.get(`${API_URL}/admin/risk/configuration`, {
      withCredentials: true,
    });
    return response.data.data;
  }

  /**
   * Update risk configuration
   */
  async updateRiskConfiguration(config: {
    thresholds?: Record<string, number>;
    alertRules?: Array<{
      id: string;
      enabled: boolean;
    }>;
    escalationRules?: Array<{
      id: string;
      enabled: boolean;
    }>;
  }): Promise<void> {
    await axios.put(`${API_URL}/admin/risk/configuration`, config, {
      withCredentials: true,
    });
  }

  /**
   * Get risk statistics for dashboard
   */
  async getRiskStatistics(period?: { start: string; end: string }): Promise<{
    totalReturns: number;
    riskDistribution: Record<string, number>;
    riskTrends: {
      daily: Array<{ date: string; averageScore: number }>;
      weekly: Array<{ week: string; averageScore: number }>;
    };
    topRiskFactors: Array<{ factor: string; count: number }>;
    alertSummary: {
      total: number;
      active: number;
      acknowledged: number;
      resolved: number;
    };
    reviewQueue: {
      pending: number;
      overdue: number;
      completed: number;
    };
  }> {
    const response = await axios.get(`${API_URL}/admin/risk/statistics`, {
      params: period,
      withCredentials: true,
    });
    return response.data.data;
  }
}

export const riskManagementService = new RiskManagementService();