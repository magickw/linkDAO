/**
 * Return and Refund Service
 * Handles return requests, refund processing, and dispute management
 */

import { fetchWithRetry } from '../utils/apiUtils';
import { API_BASE_URL } from '../config/api';

export interface ReturnRefundRequest {
  orderId: string;
  productId: string;
  reason: string;
  reasonCategory: 'damaged' | 'wrong_item' | 'not_as_described' | 'defective' | 'changed_mind' | 'other';
  description: string;
  images: string[];
  requestedAction: 'return_refund' | 'refund_only' | 'replacement';
  returnShippingMethod?: 'buyer_pays' | 'seller_pays' | 'prepaid_label';
}

export interface ReturnRefundResponse {
  id: string;
  orderId: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed' | 'cancelled';
  requestedAction: ReturnRefundRequest['requestedAction'];
  reason: string;
  reasonCategory: ReturnRefundRequest['reasonCategory'];
  description: string;
  images: string[];
  sellerResponse?: {
    approved: boolean;
    message: string;
    respondedAt: string;
  };
  returnShipping?: {
    method: string;
    trackingNumber?: string;
    carrier?: string;
    prepaidLabel?: string;
  };
  refund?: {
    amount: number;
    currency: string;
    processedAt?: string;
    transactionHash?: string;
  };
  timeline: {
    status: string;
    timestamp: string;
    note?: string;
  }[];
  createdAt: string;
  updatedAt: string;
  estimatedRefundDate?: string;
}

export interface ReturnEligibility {
  eligible: boolean;
  reason?: string;
  returnDeadline?: string;
  daysRemaining?: number;
  conditions?: string[];
  restockingFee?: number;
  canRefundOnly?: boolean;
  canReplacement?: boolean;
}

class ReturnRefundService {
  /**
   * Submit a return/refund request
   */
  async submitReturnRequest(request: ReturnRefundRequest): Promise<ReturnRefundResponse> {
    try {
      const response = await fetchWithRetry<ReturnRefundResponse>(`${API_BASE_URL}/marketplace/returns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      return response;
    } catch (error) {
      console.error('Error submitting return request:', error);
      throw error; // Don't fallback to mock in production
    }
  }

  /**
   * Check return eligibility for an order
   */
  async checkReturnEligibility(orderId: string, productId: string): Promise<ReturnEligibility> {
    try {
      const response = await fetchWithRetry<ReturnEligibility>(
        `${API_BASE_URL}/marketplace/returns/eligibility?orderId=${orderId}&productId=${productId}`
      );

      return response;
    } catch (error) {
      console.error('Error checking return eligibility:', error);
      throw error; // Don't fallback to mock in production
    }
  }

  /**
   * Get return request details
   */
  async getReturnRequest(returnId: string): Promise<ReturnRefundResponse> {
    try {
      const response = await fetchWithRetry<ReturnRefundResponse>(`${API_BASE_URL}/marketplace/returns/${returnId}`);

      return response;
    } catch (error) {
      console.error('Error getting return request:', error);
      throw error;
    }
  }

  /**
   * Get all return requests for a user
   */
  async getUserReturns(userAddress: string, filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ReturnRefundResponse[]> {
    try {
      const response = await fetchWithRetry<ReturnRefundResponse[]>(
        `${API_BASE_URL}/marketplace/returns/user/${userAddress}?role=seller&limit=100&offset=0`
      );

      return response;
    } catch (error) {
      console.error('Error getting user returns:', error);
      return [];
    }
  }

  /**
   * Cancel a return request
   */
  async cancelReturnRequest(returnId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetchWithRetry(`${API_BASE_URL}/marketplace/returns/${returnId}/cancel`, {
        method: 'POST'
      });

      return { success: true };
    } catch (error) {
      console.error('Error cancelling return request:', error);
      return { success: false };
    }
  }

  /**
   * Update return shipping tracking
   */
  async updateReturnTracking(
    returnId: string,
    tracking: {
      trackingNumber: string;
      carrier: string;
    }
  ): Promise<{ success: boolean }> {
    try {
      const response = await fetchWithRetry(
        `${API_BASE_URL}/marketplace/returns/${returnId}/tracking`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tracking)
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating return tracking:', error);
      return { success: false };
    }
  }

  /**
   * Seller: Approve or reject return request
   */
  async respondToReturnRequest(
    returnId: string,
    response: {
      approved: boolean;
      message: string;
      refundAmount?: number;
      restockingFee?: number;
    }
  ): Promise<{ success: boolean }> {
    try {
      const endpoint = response.approved ? 'approve' : 'reject';
      const apiResponse = await fetchWithRetry(
        `${API_BASE_URL}/marketplace/returns/${returnId}/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approverId: 'current-user',
            rejectorId: 'current-user',
            notes: response.message,
            reason: response.message
          })
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error responding to return request:', error);
      return { success: false };
    }
  }

  /**
   * Process refund with real payment provider integration
   */
  async processRefund(returnId: string, paymentProvider: 'stripe' | 'blockchain' = 'stripe'): Promise<{
    success: boolean;
    transactionHash?: string;
    refundId?: string;
    error?: string;
  }> {
    try {
      // Call the backend API to process the refund.
      // fetchWithRetry will throw an ApiError for non-2xx responses, so we can
      // directly ask for the typed response body here.
      const data = await fetchWithRetry<{
        transactionHash?: string;
        refundId?: string;
      }>(`${API_BASE_URL}/marketplace/returns/${returnId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: paymentProvider })
      });

      // Return success response with transaction details
      return {
        success: true,
        transactionHash: data.transactionHash,
        refundId: data.refundId
      };
    } catch (error) {
      console.error('Error processing refund:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Refund processing failed' 
      };
    }
  }

  /**
   * Get refund policy for a product/order
   */
  async getRefundPolicy(productId: string): Promise<{
    returnWindow: number; // days
    restockingFee: number; // percentage
    freeReturnShipping: boolean;
    conditions: string[];
  }> {
    try {
      const response = await fetchWithRetry<{
        returnWindow: number; // days
        restockingFee: number; // percentage
        freeReturnShipping: boolean;
        conditions: string[];
      }>(
        `${API_BASE_URL}/marketplace/products/${productId}/refund-policy`
      );

      return response;
    } catch (error) {
      console.error('Error getting refund policy:', error);
      throw error; // Don't fallback to mock in production
    }
  }

  /**
   * Create return policy for seller
   */
  async createReturnPolicy(policy: {
    sellerId: string;
    returnWindowDays: number;
    restockingFeePercentage: number;
    buyerPaysReturnShipping: boolean;
    freeReturnShippingThreshold?: number;
    policyText: string;
    acceptsReturns: boolean;
  }): Promise<{ success: boolean; policyId?: string; error?: string }> {
    try {
      // fetchWithRetry returns parsed JSON when using a generic type.
      const data = await fetchWithRetry<{ id: string }>(
        `${API_BASE_URL}/marketplace/return-policies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policy)
        }
      );

      return { success: true, policyId: data.id };
    } catch (error) {
      console.error('Error creating return policy:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create return policy' 
      };
    }
  }

  /**
   * Update return policy for seller
   */
  async updateReturnPolicy(policyId: string, policy: Partial<{
    returnWindowDays: number;
    restockingFeePercentage: number;
    buyerPaysReturnShipping: boolean;
    freeReturnShippingThreshold?: number;
    policyText: string;
    acceptsReturns: boolean;
    isActive: boolean;
  }>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetchWithRetry(
        `${API_BASE_URL}/marketplace/return-policies/${policyId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(policy)
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error updating return policy:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update return policy' 
      };
    }
  }

  /**
   * Get seller's return policy
   */
  async getSellerReturnPolicy(sellerId: string): Promise<any> {
    try {
      const response = await fetchWithRetry(
        `${API_BASE_URL}/marketplace/return-policies/${sellerId}`
      );

      return response;
    } catch (error) {
      console.error('Error getting seller return policy:', error);
      return null;
    }
  }

  /**
   * Calculate risk score for return request (fraud prevention)
   */
  async calculateReturnRisk(returnRequest: ReturnRefundRequest, order: any): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
  }> {
    try {
      const response = await fetchWithRetry<{
        riskScore: number;
        riskLevel: 'low' | 'medium' | 'high';
        riskFactors: string[];
      }>(
        `${API_BASE_URL}/marketplace/returns/risk-assessment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnRequest, order })
        }
      );

      return response;
    } catch (error) {
      console.error('Error calculating return risk:', error);
      // Return a default low risk score if the service fails
      return {
        riskScore: 20,
        riskLevel: 'low',
        riskFactors: ['Service unavailable - default low risk']
      };
    }
  }

  /**
   * Get return analytics for seller
   */
  async getSellerReturnAnalytics(sellerId: string, period: {
    start: string;
    end: string;
  }): Promise<any> {
    try {
      const params = new URLSearchParams({
        sellerId,
        periodStart: period.start,
        periodEnd: period.end
      });

      const response = await fetchWithRetry(
        `${API_BASE_URL}/marketplace/returns/analytics?${params.toString()}`
      );

      return response;
    } catch (error) {
      console.error('Error getting return analytics:', error);
      throw error;
    }
  }

  /**
   * Generate return shipping label
   */
  async generateReturnLabel(returnId: string, data: {
    fromAddress: any;
    toAddress: any;
    weight: number;
    carrier: 'usps' | 'ups' | 'fedex';
  }): Promise<{ success: boolean; labelUrl?: string; trackingNumber?: string; error?: string }> {
    try {
      const res = await fetchWithRetry<{
        labelUrl?: string;
        trackingNumber?: string;
        success?: boolean;
        error?: string;
      }>(`${API_BASE_URL}/marketplace/returns/${returnId}/label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      // Normalize the backend response into the expected shape. Some backends
      // may omit the `success` boolean; coerce to boolean to satisfy typings.
      return {
        success: !!res.success,
        labelUrl: res.labelUrl,
        trackingNumber: res.trackingNumber,
        error: res.error
      };
    } catch (error) {
      console.error('Error generating return label:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate label' };
    }
  }

  /**
   * Get fraud risk assessment for return
   */
  async getReturnRiskAssessment(returnId: string, data: {
    userId: string;
    orderId: string;
    returnReason: string;
    orderValue: number;
    accountAge: number;
    previousReturns: number;
  }): Promise<{ riskScore: number; riskLevel: 'low' | 'medium' | 'high'; flags: string[] }> {
    try {
      const res = await fetchWithRetry<{
        riskScore: number;
        riskLevel: 'low' | 'medium' | 'high';
        flags: string[];
      }>(`${API_BASE_URL}/marketplace/returns/${returnId}/risk-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      return res;
    } catch (error) {
      console.error('Error getting risk assessment:', error);
      return { riskScore: 0, riskLevel: 'low', flags: [] };
    }
  }
}

// Export singleton instance
export const returnRefundService = new ReturnRefundService();
