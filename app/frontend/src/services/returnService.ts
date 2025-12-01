import { fetchWithRetry } from '../utils/apiUtils';
import { API_BASE_URL } from '../config/api';

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
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    return res;
  }

  async getReturn(returnId: string) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/${returnId}`);
    return res;
  }

  async getUserReturns(userId: string, role: 'buyer' | 'seller', limit = 20, offset = 0) {
    const params = new URLSearchParams({ role, limit: String(limit), offset: String(offset) });
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/user/${userId}?${params.toString()}`);
    return res;
  }

  async approveReturn(returnId: string, approverId: string, notes?: string) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/${returnId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approverId, notes })
    });

    return res;
  }

  async rejectReturn(returnId: string, rejectorId: string, reason: string) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/${returnId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectorId, reason })
    });

    return res;
  }

  async processRefund(request: RefundRequest) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/${request.returnId}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    return res;
  }

  async getReturnPolicy(sellerId: string) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/return-policies/${sellerId}`);
    return res;
  }

  async saveReturnPolicy(policy: any) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/return-policies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policy)
    });

    return res;
  }

  async getReturnMessages(returnId: string) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/${returnId}/messages`);
    return res;
  }

  async addReturnMessage(returnId: string, messageData: {
    message: string;
    attachments?: string[];
    isInternal?: boolean;
  }) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/${returnId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });

    return res;
  }

  async getReturnHistory(returnId: string) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/${returnId}/history`);
    return res;
  }

  async generateShippingLabel(returnId: string) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/${returnId}/shipping-label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    return res;
  }

  async updateTracking(returnId: string, trackingData: {
    trackingNumber?: string;
    carrier?: string;
    status?: string;
  }) {
    const res = await fetchWithRetry<any>(`${API_BASE_URL}/returns/${returnId}/tracking`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData)
    });

    return res;
  }
}

export const returnService = new ReturnService();
