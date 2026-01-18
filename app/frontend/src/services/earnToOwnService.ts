import { getBackendUrl } from '@/utils/environmentConfig';

export interface EarnToOwnChallenge {
    id: string;
    title: string;
    description: string;
    rewardAmount: number;
    progress: number;
    target: number;
    type: 'daily' | 'weekly' | 'monthly' | 'milestone';
    expiresAt?: Date;
    isCompleted: boolean;
}

export interface EarnToOwnProgress {
    totalEarned: number;
    currentBalance: number;
    activeChallenges: number;
    completedChallenges: number;
    nextMilestone: {
        amount: number;
        reward: number;
    };
    rank: number;
    totalUsers: number;
}

export interface EarningHistoryItem {
    id: string;
    amount: number;
    source: string;
    description: string;
    timestamp: Date;
    txHash?: string;
}

class EarnToOwnService {
    private baseUrl = `${getBackendUrl()}/api/earn-to-own`;

    /**
     * Get user's earn-to-own progress
     */
    async getUserProgress(userId: string): Promise<EarnToOwnProgress> {
        try {
            const response = await fetch(`${this.baseUrl}/progress/${userId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user progress');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user progress:', error);
            // Return mock data for development
            return {
                totalEarned: 1250.5,
                currentBalance: 450.25,
                activeChallenges: 5,
                completedChallenges: 12,
                nextMilestone: {
                    amount: 2000,
                    reward: 100
                },
                rank: 142,
                totalUsers: 5000
            };
        }
    }

    /**
     * Get active challenges
     */
    async getActiveChallenges(): Promise<EarnToOwnChallenge[]> {
        try {
            const response = await fetch(`${this.baseUrl}/challenges`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch challenges');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching challenges:', error);
            // Return mock data for development
            return [
                {
                    id: '1',
                    title: 'Daily Login Streak',
                    description: 'Log in for 7 consecutive days',
                    rewardAmount: 10,
                    progress: 4,
                    target: 7,
                    type: 'daily',
                    expiresAt: new Date(Date.now() + 86400000 * 3),
                    isCompleted: false
                },
                {
                    id: '2',
                    title: 'First Marketplace Sale',
                    description: 'Complete your first sale on the marketplace',
                    rewardAmount: 50,
                    progress: 0,
                    target: 1,
                    type: 'milestone',
                    isCompleted: false
                },
                {
                    id: '3',
                    title: 'Community Contributor',
                    description: 'Create 10 posts in communities',
                    rewardAmount: 25,
                    progress: 7,
                    target: 10,
                    type: 'weekly',
                    expiresAt: new Date(Date.now() + 86400000 * 5),
                    isCompleted: false
                },
                {
                    id: '4',
                    title: 'Governance Participant',
                    description: 'Vote on 5 governance proposals',
                    rewardAmount: 30,
                    progress: 2,
                    target: 5,
                    type: 'monthly',
                    expiresAt: new Date(Date.now() + 86400000 * 20),
                    isCompleted: false
                },
                {
                    id: '5',
                    title: 'Social Butterfly',
                    description: 'Follow 20 users',
                    rewardAmount: 15,
                    progress: 15,
                    target: 20,
                    type: 'milestone',
                    isCompleted: false
                }
            ];
        }
    }

    /**
     * Get earning history
     */
    async getEarningHistory(userId: string, limit = 20): Promise<EarningHistoryItem[]> {
        try {
            const response = await fetch(`${this.baseUrl}/history/${userId}?limit=${limit}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch earning history');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching earning history:', error);
            // Return mock data for development
            return [
                {
                    id: '1',
                    amount: 50,
                    source: 'Challenge Completion',
                    description: 'First Marketplace Listing',
                    timestamp: new Date(Date.now() - 86400000 * 2)
                },
                {
                    id: '2',
                    amount: 10,
                    source: 'Daily Login',
                    description: '7-day streak bonus',
                    timestamp: new Date(Date.now() - 86400000 * 3)
                },
                {
                    id: '3',
                    amount: 25,
                    source: 'Community Activity',
                    description: 'Active community member',
                    timestamp: new Date(Date.now() - 86400000 * 5)
                }
            ];
        }
    }

    /**
     * Claim reward for completed challenge
     */
    async claimReward(challengeId: string): Promise<{ success: boolean; amount: number; txHash?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ challengeId })
            });

            if (!response.ok) {
                throw new Error('Failed to claim reward');
            }

            return await response.json();
        } catch (error) {
            console.error('Error claiming reward:', error);
            throw error;
        }
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(limit = 100): Promise<Array<{ rank: number; userId: string; username: string; totalEarned: number }>> {
        try {
            const response = await fetch(`${this.baseUrl}/leaderboard?limit=${limit}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }
    }
}

export const earnToOwnService = new EarnToOwnService();
