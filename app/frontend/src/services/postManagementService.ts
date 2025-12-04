const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface PinnedPost {
    id: number;
    title?: string;
    content?: string;
    authorId: string;
    communityId: string;
    isPinned: boolean;
    pinnedAt: string;
    pinnedBy: string;
    createdAt: string;
}

export const postManagementService = {
    /**
     * Pin a post
     */
    async pinPost(postId: number | string, communityId: string): Promise<{ success: boolean; message: string }> {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                return { success: false, message: 'Authentication required' };
            }

            const res = await fetch(`${API_BASE}/api/posts/${postId}/pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ communityId })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || `HTTP error! status: ${res.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error pinning post:', error);
            return { success: false, message: error instanceof Error ? error.message : 'Failed to pin post' };
        }
    },

    /**
     * Unpin a post
     */
    async unpinPost(postId: number | string): Promise<{ success: boolean; message: string }> {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                return { success: false, message: 'Authentication required' };
            }

            const res = await fetch(`${API_BASE}/api/posts/${postId}/pin`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || `HTTP error! status: ${res.status}`);
            }

            return data;
        } catch (error) {
            console.error('Error unpinning post:', error);
            return { success: false, message: error instanceof Error ? error.message : 'Failed to unpin post' };
        }
    },

    /**
     * Get pinned posts for a community
     */
    async getPinnedPosts(communityId: string, limit: number = 5): Promise<{ success: boolean; data: PinnedPost[] }> {
        try {
            const res = await fetch(`${API_BASE}/api/posts/communities/${communityId}/pinned-posts?limit=${limit}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching pinned posts:', error);
            return { success: false, data: [] };
        }
    }
};
