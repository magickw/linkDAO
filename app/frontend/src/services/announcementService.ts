import { API_BASE_URL } from '../config/api';
import { get, post, put, del } from './globalFetchWrapper';

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

interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

class AnnouncementService {
    /**
     * Create a new announcement
     */
    async createAnnouncement(input: CreateAnnouncementInput): Promise<{ success: boolean; message: string; data?: Announcement }> {
        try {
            const response = await post<ApiResponse<Announcement>>(
                `${API_URL}/api/communities/${input.communityId}/announcements`,
                input
            );

            if (!response.success || !response.data) {
                return { success: false, message: response.error || 'Failed to create announcement' };
            }

            return {
                success: response.data.success,
                message: response.data.message || (response.data.success ? 'Announcement created' : 'Failed to create announcement'),
                data: response.data.data
            };
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
            const response = await put<ApiResponse<Announcement>>(
                `${API_URL}/api/announcements/${id}`,
                input
            );

            if (!response.success || !response.data) {
                return { success: false, message: response.error || 'Failed to update announcement' };
            }

            return {
                success: response.data.success,
                message: response.data.message || (response.data.success ? 'Announcement updated' : 'Failed to update announcement'),
                data: response.data.data
            };
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
            const response = await del<ApiResponse<void>>(
                `${API_URL}/api/announcements/${id}`
            );

            if (!response.success || !response.data) {
                return { success: false, message: response.error || 'Failed to delete announcement' };
            }

            return {
                success: response.data.success,
                message: response.data.message || (response.data.success ? 'Announcement deleted' : 'Failed to delete announcement')
            };
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
            // Public endpoint, but globalFetchWrapper handles auth if token exists (which is fine)
            // or we can specific skipAuth: true if we want to ensure public access even if auth fails
            // But since it's public, sending token doesn't hurt.
            // Note: Added /api prefix
            const response = await get<ApiResponse<Announcement[]>>(
                `${API_URL}/api/communities/${communityId}/announcements`
            );

            if (!response.success || !response.data) {
                // If 404/500 from wrapper
                return { success: false, data: [] };
            }

            return {
                success: response.data.success,
                data: response.data.data || []
            };
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
            // Note: Added /api prefix
            const response = await get<ApiResponse<Announcement[]>>(
                `${API_URL}/api/communities/${communityId}/announcements/all`
            );

            if (!response.success || !response.data) {
                return { success: false, data: [] };
            }

            return {
                success: response.data.success,
                data: response.data.data || []
            };
        } catch (error) {
            console.error('Error fetching all announcements:', error);
            return { success: false, data: [] };
        }
    }
}

export const announcementService = new AnnouncementService();
