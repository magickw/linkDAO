const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

export interface LeaderboardEntry {
    rank: number;
    address: string;
    ensName?: string;
    value: number;
    change?: number;
    isCurrentUser?: boolean;
}

export interface LeaderboardParams {
    communityId?: string;
    limit?: number;
    timeRange?: '7d' | '30d' | 'all';
    userAddress?: string;
}

export const leaderboardService = {
    /**
     * Get top voters by voting power
     */
    async getTopVoters(params?: LeaderboardParams): Promise<{ success: boolean; data: LeaderboardEntry[] }> {
        try {
            const query = new URLSearchParams(params as any).toString();
            const res = await fetch(`${API_BASE}/api/leaderboard/voters?${query}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching top voters:', error);
            return { success: false, data: [] };
        }
    },

    /**
     * Get top posters by post count
     */
    async getTopPosters(params?: LeaderboardParams): Promise<{ success: boolean; data: LeaderboardEntry[] }> {
        try {
            const query = new URLSearchParams(params as any).toString();
            const res = await fetch(`${API_BASE}/api/leaderboard/posters?${query}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching top posters:', error);
            return { success: false, data: [] };
        }
    },

    /**
     * Get most engaged wallets by engagement score
     */
    async getMostEngaged(params?: LeaderboardParams): Promise<{ success: boolean; data: LeaderboardEntry[] }> {
        try {
            const query = new URLSearchParams(params as any).toString();
            const res = await fetch(`${API_BASE}/api/leaderboard/engaged?${query}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching most engaged wallets:', error);
            return { success: false, data: [] };
        }
    },

    /**
     * Get top stakers by staked amount
     */
    async getTopStakers(params?: Omit<LeaderboardParams, 'timeRange'>): Promise<{ success: boolean; data: LeaderboardEntry[] }> {
        try {
            const query = new URLSearchParams(params as any).toString();
            const res = await fetch(`${API_BASE}/api/leaderboard/stakers?${query}`);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            return await res.json();
        } catch (error) {
            console.error('Error fetching top stakers:', error);
            return { success: false, data: [] };
        }
    },
};
