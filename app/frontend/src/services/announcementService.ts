import { API_BASE_URL } from '../config/api';
import { enhancedAuthService } from './enhancedAuthService';

const API_URL = API_BASE_URL;

export interface Announcement {
    id: string;
    communityId: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success';
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    expiresAt?: string;
}

export interface CreateAnnouncementInput {
    communityId: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'success';
    expiresAt?: Date;
}

export interface UpdateAnnouncementInput {
    title?: string;
    content?: string;
    type?: 'info' | 'warning' | 'success';
    isActive?: boolean;
    expiresAt?: Date;
}

class AnnouncementService {
    private async getHeaders() {
        const headers = await enhancedAuthService.getAuthHeaders();
        return {
            'Content-Type': 'application/json',
            ...headers
        };
    }

    /**
     * Create a new announcement
     */
    async createAnnouncement(input: CreateAnnouncementInput): Promise<{ success: boolean; message: string; data?: Announcement }> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/communities/${input.communityId}/announcements`, {
                method: 'POST',
                headers,
                body: JSON.stringify(input),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating announcement:', error);
            return { success: false, message: 'Failed to create announcement' };
        }
    }

    /**
     * Update an announcement
     */
    async updateAnnouncement(id: string, input: UpdateAnnouncementInput): Promise<{ success: boolean; message: string; data?: Announcement }> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/announcements/${id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(input),
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating announcement:', error);
            return { success: false, message: 'Failed to update announcement' };
        }
    }

    /**
     * Delete an announcement
     */
    async deleteAnnouncement(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/announcements/${id}`, {
                method: 'DELETE',
                headers,
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting announcement:', error);
            return { success: false, message: 'Failed to delete announcement' };
        }
    }

    /**
     * Get active announcements for a community
     */
    async getActiveAnnouncements(communityId: string): Promise<{ success: boolean; data: Announcement[] }> {
        try {
            const response = await fetch(`${API_URL}/communities/${communityId}/announcements`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching active announcements:', error);
            return { success: false, data: [] };
        }
    }

    /**
     * Get all announcements for a community (for management)
     */
    async getAllAnnouncements(communityId: string): Promise<{ success: boolean; data: Announcement[] }> {
        try {
            const headers = await this.getHeaders();
            const response = await fetch(`${API_URL}/communities/${communityId}/announcements/all`, {
                method: 'GET',
                headers,
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching all announcements:', error);
            return { success: false, data: [] };
        }
    }
}

export const announcementService = new AnnouncementService();
