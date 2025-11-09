// import { DisputeFormData } from '../components/DisputeCreationModal';

// Temporary type definition while DisputeCreationModal is disabled
export interface DisputeFormData {
  title: string;
  description: string;
  category: string;
  evidence: File[];
}

export interface DisputeDetails {
  id: number;
  escrowId: number;
  initiator: string;
  respondent: string;
  disputeType: string;
  description: string;
  status: string;
  resolutionMethod: string;
  createdAt: string;
  evidenceDeadline?: string;
  votingDeadline?: string;
  resolvedAt?: string;
  verdict?: string;
  refundAmount?: number;
  resolver?: string;
  evidence: Evidence[];
  votes: CommunityVote[];
}

export interface Evidence {
  id: number;
  submitterId: string;
  evidenceType: string;
  ipfsHash: string;
  description: string;
  timestamp: string;
  verified: boolean;
}

export interface CommunityVote {
  voterId: string;
  verdict: string;
  votingPower: number;
  reasoning?: string;
  timestamp: string;
}

export interface DisputeAnalytics {
  totalDisputes: number;
  resolvedDisputes: number;
  averageResolutionTime: number;
  disputesByType: Record<string, number>;
  verdictsByType: Record<string, number>;
  successRateByArbitrator: Record<string, number>;
}

export interface ArbitratorApplication {
  qualifications: string;
  experience?: string;
}

export interface ArbitratorDashboard {
  assignedDisputes: DisputeDetails[];
  completedCases: number;
  successRate: number;
  averageResolutionTime: number;
  reputation: number;
}

class DisputeService {
  private baseUrl = '/api';

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.details || 'Request failed');
    }

    const data = await response.json();
    return data.data || data;
  }

  /**
   * Create a new dispute
   */
  async createDispute(disputeData: DisputeFormData): Promise<{ disputeId: number }> {
    return this.makeRequest('/disputes', {
      method: 'POST',
      body: JSON.stringify(disputeData),
    });
  }

  /**
   * Submit evidence for a dispute
   */
  async submitEvidence(
    disputeId: number,
    evidenceData: {
      evidenceType: string;
      ipfsHash: string;
      description: string;
    }
  ): Promise<void> {
    return this.makeRequest(`/disputes/${disputeId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(evidenceData),
    });
  }

  /**
   * Proceed dispute to arbitration
   */
  async proceedToArbitration(disputeId: number): Promise<void> {
    return this.makeRequest(`/disputes/${disputeId}/proceed-arbitration`, {
      method: 'POST',
    });
  }

  /**
   * Cast community vote on dispute
   */
  async castCommunityVote(
    disputeId: number,
    voteData: {
      verdict: string;
      votingPower: number;
      reasoning?: string;
    }
  ): Promise<void> {
    return this.makeRequest(`/disputes/${disputeId}/vote`, {
      method: 'POST',
      body: JSON.stringify(voteData),
    });
  }

  /**
   * Resolve dispute as arbitrator
   */
  async resolveAsArbitrator(
    disputeId: number,
    resolution: {
      verdict: string;
      refundAmount?: number;
      reasoning: string;
    }
  ): Promise<void> {
    return this.makeRequest(`/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(resolution),
    });
  }

  /**
   * Get dispute details
   */
  async getDisputeDetails(disputeId: number): Promise<DisputeDetails> {
    return this.makeRequest(`/disputes/${disputeId}`);
  }

  /**
   * Get dispute analytics
   */
  async getDisputeAnalytics(timeRange?: string): Promise<DisputeAnalytics> {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    try {
      return await this.makeRequest(`/disputes/analytics${params}`);
    } catch (err) {
      console.warn('Dispute analytics unavailable, returning defaults');
      return {
        totalDisputes: 0,
        resolvedDisputes: 0,
        averageResolutionTime: 0,
        disputesByType: {},
        verdictsByType: {},
        successRateByArbitrator: {},
      };
    }
  }

  /**
   * Get user's dispute history
   */
  async getUserDisputeHistory(): Promise<DisputeDetails[]> {
    try {
      return await this.makeRequest('/disputes/user/history');
    } catch (err) {
      console.warn('User dispute history unavailable, returning empty list');
      return [];
    }
  }

  /**
   * Get disputes available for arbitration
   */
  async getDisputesForArbitration(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    disputes: DisputeDetails[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return this.makeRequest(`/disputes/arbitration/available${query ? `?${query}` : ''}`);
  }

  /**
   * Apply to become an arbitrator
   */
  async applyForArbitrator(application: ArbitratorApplication): Promise<void> {
    return this.makeRequest('/arbitrator/apply', {
      method: 'POST',
      body: JSON.stringify(application),
    });
  }

  /**
   * Get arbitrator dashboard data
   */
  async getArbitratorDashboard(): Promise<ArbitratorDashboard> {
    return this.makeRequest('/arbitrator/dashboard');
  }

  /**
   * Upload file to IPFS (mock implementation)
   */
  async uploadToIPFS(file: File): Promise<string> {
    // In a real implementation, this would upload to IPFS
    // For now, return a mock hash
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
        resolve(mockHash);
      }, 1000);
    });
  }

  /**
   * Get dispute statistics for dashboard
   */
  async getDisputeStats(): Promise<{
    totalDisputes: number;
    activeDisputes: number;
    resolvedDisputes: number;
    userDisputes: number;
  }> {
    // This would be a separate endpoint in a real implementation
    const analytics = await this.getDisputeAnalytics();
    const userHistory = await this.getUserDisputeHistory();
    
    return {
      totalDisputes: analytics.totalDisputes,
      activeDisputes: analytics.totalDisputes - analytics.resolvedDisputes,
      resolvedDisputes: analytics.resolvedDisputes,
      userDisputes: userHistory.length,
    };
  }

  /**
   * Search disputes by criteria
   */
  async searchDisputes(criteria: {
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    escrowId?: number;
  }): Promise<DisputeDetails[]> {
    const queryParams = new URLSearchParams();
    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const query = queryParams.toString();
    return this.makeRequest(`/disputes/search${query ? `?${query}` : ''}`);
  }

  /**
   * Get dispute timeline/events
   */
  async getDisputeTimeline(disputeId: number): Promise<{
    events: Array<{
      type: string;
      description: string;
      timestamp: string;
      actor: string;
    }>;
  }> {
    return this.makeRequest(`/disputes/${disputeId}/timeline`);
  }

  /**
   * Cancel dispute (if allowed)
   */
  async cancelDispute(disputeId: number, reason: string): Promise<void> {
    return this.makeRequest(`/disputes/${disputeId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Request dispute escalation
   */
  async requestEscalation(disputeId: number, reason: string): Promise<void> {
    return this.makeRequest(`/disputes/${disputeId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Get available arbitrators
   */
  async getAvailableArbitrators(): Promise<Array<{
    id: string;
    address: string;
    reputation: number;
    casesHandled: number;
    successRate: number;
    specializations: string[];
  }>> {
    return this.makeRequest('/arbitrators/available');
  }

  /**
   * Request specific arbitrator
   */
  async requestArbitrator(disputeId: number, arbitratorId: string): Promise<void> {
    return this.makeRequest(`/disputes/${disputeId}/request-arbitrator`, {
      method: 'POST',
      body: JSON.stringify({ arbitratorId }),
    });
  }
}

export const disputeService = new DisputeService();