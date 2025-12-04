import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL;

export interface MonthlyUpdateHighlight {
    title: string;
    description: string;
    icon?: string;
    link?: string;
}

export interface MonthlyUpdateMetrics {
    newMembers?: number;
    totalPosts?: number;
    activeProposals?: number;
    treasuryBalance?: string;
    engagementRate?: number;
    [key: string]: any;
}

export interface MonthlyUpdate {
    id: string;
    communityId: string;
    title: string;
    content: string;
    summary?: string;
    month: number;
    year: number;
    highlights: MonthlyUpdateHighlight[];
    metrics: MonthlyUpdateMetrics;
    mediaCids: string[];
    isPublished: boolean;
    publishedAt?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMonthlyUpdateInput {
    communityId: string;
    title: string;
    content: string;
    summary?: string;
    month: number;
    year: number;
    highlights?: MonthlyUpdateHighlight[];
    metrics?: MonthlyUpdateMetrics;
    mediaCids?: string[];
}

export interface UpdateMonthlyUpdateInput {
    title?: string;
    content?: string;
    summary?: string;
    highlights?: MonthlyUpdateHighlight[];
    metrics?: MonthlyUpdateMetrics;
    mediaCids?: string[];
    isPublished?: boolean;
}

class MonthlyUpdateService {
    private getHeaders() {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        };
    }

    /**
     * Create a new monthly update
     */
    async createMonthlyUpdate(input: CreateMonthlyUpdateInput): Promise<{ success: boolean; message: string; data?: MonthlyUpdate }> {
        try {
            const response = await fetch(`${API_URL}/communities/${input.communityId}/monthly-updates`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(input),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating monthly update:', error);
            return { success: false, message: 'Failed to create monthly update' };
        }
    }

    /**
     * Update a monthly update
     */
    async updateMonthlyUpdate(id: string, input: UpdateMonthlyUpdateInput): Promise<{ success: boolean; message: string; data?: MonthlyUpdate }> {
        try {
            const response = await fetch(`${API_URL}/monthly-updates/${id}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(input),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating monthly update:', error);
            return { success: false, message: 'Failed to update monthly update' };
        }
    }

    /**
     * Publish a monthly update
     */
    async publishMonthlyUpdate(id: string): Promise<{ success: boolean; message: string; data?: MonthlyUpdate }> {
        try {
            const response = await fetch(`${API_URL}/monthly-updates/${id}/publish`, {
                method: 'POST',
                headers: this.getHeaders(),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error publishing monthly update:', error);
            return { success: false, message: 'Failed to publish monthly update' };
        }
    }

    /**
     * Unpublish a monthly update
     */
    async unpublishMonthlyUpdate(id: string): Promise<{ success: boolean; message: string; data?: MonthlyUpdate }> {
        try {
            const response = await fetch(`${API_URL}/monthly-updates/${id}/unpublish`, {
                method: 'POST',
                headers: this.getHeaders(),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error unpublishing monthly update:', error);
            return { success: false, message: 'Failed to unpublish monthly update' };
        }
    }

    /**
     * Delete a monthly update
     */
    async deleteMonthlyUpdate(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${API_URL}/monthly-updates/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders(),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting monthly update:', error);
            return { success: false, message: 'Failed to delete monthly update' };
        }
    }

    /**
     * Get a single monthly update by ID
     */
    async getMonthlyUpdate(id: string): Promise<{ success: boolean; data?: MonthlyUpdate }> {
        try {
            const response = await fetch(`${API_URL}/monthly-updates/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching monthly update:', error);
            return { success: false };
        }
    }

    /**
     * Get published monthly updates for a community
     */
    async getPublishedUpdates(communityId: string, limit: number = 12): Promise<{ success: boolean; data: MonthlyUpdate[] }> {
        try {
            const response = await fetch(`${API_URL}/communities/${communityId}/monthly-updates?limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching published monthly updates:', error);
            return { success: false, data: [] };
        }
    }

    /**
     * Get all monthly updates for a community (for management)
     */
    async getAllUpdates(communityId: string): Promise<{ success: boolean; data: MonthlyUpdate[] }> {
        try {
            const response = await fetch(`${API_URL}/communities/${communityId}/monthly-updates/all`, {
                method: 'GET',
                headers: this.getHeaders(),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching all monthly updates:', error);
            return { success: false, data: [] };
        }
    }

    /**
     * Get the latest published monthly update for a community
     */
    async getLatestUpdate(communityId: string): Promise<{ success: boolean; data?: MonthlyUpdate }> {
        try {
            const response = await fetch(`${API_URL}/communities/${communityId}/monthly-updates/latest`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching latest monthly update:', error);
            return { success: false };
        }
    }

    /**
     * Get monthly update for a specific month/year
     */
    async getUpdateForMonth(communityId: string, month: number, year: number): Promise<{ success: boolean; data?: MonthlyUpdate }> {
        try {
            const response = await fetch(`${API_URL}/communities/${communityId}/monthly-updates/${year}/${month}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching monthly update for period:', error);
            return { success: false };
        }
    }

    /**
     * Get month name from number
     */
    getMonthName(month: number): string {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1] || '';
    }

    /**
     * Format date string for display
     */
    formatUpdateDate(month: number, year: number): string {
        return `${this.getMonthName(month)} ${year}`;
    }
}

export const monthlyUpdateService = new MonthlyUpdateService();
