/**
 * Tipping Service
 * Handle token tipping for posts, comments, and users
 */

import { apiClient } from './apiClient';

export interface TipData {
    recipientId: string;
    amount: number;
    contentType: 'post' | 'comment' | 'user';
    contentId?: string;
    message?: string;
}

export interface TipHistory {
    id: string;
    senderId: string;
    recipientId: string;
    amount: number;
    contentType: string;
    contentId?: string;
    message?: string;
    createdAt: string;
    sender: {
        displayName: string;
        username: string;
    };
    recipient: {
        displayName: string;
        username: string;
    };
}

class TippingService {
    /**
     * Send a tip to a user for their content
     */
    async sendTip(tipData: TipData): Promise<{ success: boolean; tip?: any; error?: string }> {
        try {
            const response = await apiClient.post('/api/tips', tipData);
            return { success: true, tip: response.data };
        } catch (error: any) {
            console.error('Error sending tip:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to send tip',
            };
        }
    }

    /**
     * Get tip history for the current user
     */
    async getTipHistory(type: 'sent' | 'received' = 'sent', walletAddress: string): Promise<TipHistory[]> {
        try {
            const endpoint = type === 'sent' ? '/api/tips/sent' : '/api/tips/received';
            const response = await apiClient.post(endpoint, {
                address: walletAddress,
                limit: 50,
                offset: 0
            });
            return response.data.tips || [];
        } catch (error) {
            console.error('Error fetching tip history:', error);
            return [];
        }
    }

    /**
     * Get tips for a specific content item (post)
     */
    async getContentTips(postId: string): Promise<TipHistory[]> {
        try {
            const response = await apiClient.get(`/api/tips/posts/${postId}/tips`);
            return response.data || [];
        } catch (error) {
            console.error('Error fetching content tips:', error);
            return [];
        }
    }

    /**
     * Get user's tip balance and earnings
     */
    async getTipBalance(userId: string): Promise<{ balance: number; earned: number; spent: number }> {
        try {
            const response = await apiClient.get(`/api/tips/users/${userId}/earnings`);
            const data = response.data;
            return {
                balance: parseFloat(data.totalEarned || '0') - parseFloat(data.totalGiven || '0'),
                earned: parseFloat(data.totalEarned || '0'),
                spent: parseFloat(data.totalGiven || '0'),
            };
        } catch (error) {
            console.error('Error fetching tip balance:', error);
            return { balance: 0, earned: 0, spent: 0 };
        }
    }

    /**
     * Withdraw tips to wallet
     */
    async withdrawTips(amount: number, walletAddress: string): Promise<{ success: boolean; error?: string }> {
        try {
            await apiClient.post('/api/tips/withdraw', { amount, walletAddress });
            return { success: true };
        } catch (error: any) {
            console.error('Error withdrawing tips:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to withdraw tips',
            };
        }
    }
}

export const tippingService = new TippingService();
