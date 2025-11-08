import { apiClient } from '../config/api';

export interface CreateReturnRequest {
  orderId: string;
  buyerId: string;
  sellerId: string;
  returnReason: string;
  returnReasonDetails?: string;
  itemsToReturn: Array<{
    itemId: string;
    quantity: number;
    reason: string;
    photos?: string[];
  }>;
  originalAmount: number;
}

export interface RefundRequest {
  returnId: string;
  amount: number;
  reason?: string;
  refundMethod: 'original_payment' | 'store_credit' | 'exchange';
}

class ReturnService {
  async createReturn(request: CreateReturnRequest) {
    const response = await apiClient.post('/returns', request);
    return response.data;
  }

  async getReturn(returnId: string) {
    const response = await apiClient.get(`/returns/${returnId}`);
    return response.data;
  }

  async getUserReturns(userId: string, role: 'buyer' | 'seller', limit = 20, offset = 0) {
    const response = await apiClient.get(`/returns/user/${userId}`, {
      params: { role, limit, offset }
    });
    return response.data;
  }

  async approveReturn(returnId: string, approverId: string, notes?: string) {
    const response = await apiClient.post(`/returns/${returnId}/approve`, {
      approverId,
      notes
    });
    return response.data;
  }

  async rejectReturn(returnId: string, rejectorId: string, reason: string) {
    const response = await apiClient.post(`/returns/${returnId}/reject`, {
      rejectorId,
      reason
    });
    return response.data;
  }

  async processRefund(request: RefundRequest) {
    const response = await apiClient.post(`/returns/${request.returnId}/refund`, request);
    return response.data;
  }

  async getReturnPolicy(sellerId: string) {
    const response = await apiClient.get(`/return-policies/${sellerId}`);
    return response.data;
  }

  async saveReturnPolicy(policy: any) {
    const response = await apiClient.post('/return-policies', policy);
    return response.data;
  }
}

export const returnService = new ReturnService();
