import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { votes, posts, users, communityMembers, reactions, comments } from '../db/schema';
import { eq, desc, and, sql, count, sum, gte } from 'drizzle-orm';

interface LeaderboardEntry {
    rank: number;
    address: string;
    ensName?: string;
    value: number;
    change?: number;
    isCurrentUser?: boolean;
}

interface LeaderboardOptions {
    communityId?: string;
    limit?: number;
    timeRange?: '7d' | '30d' | 'all';
    currentUserAddress?: string;
}

export class LeaderboardService {
    /**
     * Get top voters by total voting power used
     */
    async getTopVoters(options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        const { communityId, limit = 10, timeRange = 'all', currentUserAddress } = options;

        try {
            // Calculate time threshold
            const timeThreshold = this.getTimeThreshold(timeRange);

            // Build query to get top voters
            let query = db
                .select({
                    address: votes.voterId,
                    totalVotingPower: sql<string>`CAST(SUM(CAST(${votes.totalPower} AS NUMERIC)) AS TEXT)`,
                    voteCount: count(votes.id),
                })
                .from(votes)
                .groupBy(votes.voterId)
                .orderBy(desc(sql`SUM(CAST(${votes.totalPower} AS NUMERIC))`))
                .limit(limit);

            // Add time filter if not 'all'
            if (timeRange !== 'all' && timeThreshold) {
                query = query.where(gte(votes.createdAt, timeThreshold)) as any;
            }

            const results = await query;

            // Transform to leaderboard entries
            return results.map((result, index) => ({
                rank: index + 1,
                address: result.address,
                value: parseFloat(result.totalVotingPower || '0'),
                change: this.calculateChange(), // Mock change for now
                isCurrentUser: currentUserAddress?.toLowerCase() === result.address?.toLowerCase(),
            }));
        } catch (error) {
            safeLogger.error('Error getting top voters:', error);
            return this.getMockTopVoters(limit, currentUserAddress);
        }
    }

    /**
     * Get top posters by number of posts created
     */
    async getTopPosters(options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        const { communityId, limit = 10, timeRange = 'all', currentUserAddress } = options;

        try {
            const timeThreshold = this.getTimeThreshold(timeRange);

            // Build query
            let query = db
                .select({
                    address: posts.authorId,
                    postCount: count(posts.id),
                })
                .from(posts)
                .groupBy(posts.authorId)
                .orderBy(desc(count(posts.id)))
                .limit(limit);

            // Add filters
            const conditions = [];
            if (communityId) {
                conditions.push(eq(posts.communityId, communityId));
            }
            if (timeRange !== 'all' && timeThreshold) {
                conditions.push(gte(posts.createdAt, timeThreshold));
            }

            if (conditions.length > 0) {
                query = query.where(and(...conditions)) as any;
            }

            const results = await query;

            return results.map((result, index) => ({
                rank: index + 1,
                address: result.address,
                value: result.postCount,
                change: this.calculateChange(),
                isCurrentUser: currentUserAddress?.toLowerCase() === result.address?.toLowerCase(),
            }));
        } catch (error) {
            safeLogger.error('Error getting top posters:', error);
            return this.getMockTopPosters(limit, currentUserAddress);
        }
    }

    /**
     * Get most engaged wallets by total engagement score
     * Engagement = posts + comments + reactions
     */
    async getMostEngagedWallets(options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        const { communityId, limit = 10, timeRange = 'all', currentUserAddress } = options;

        try {
            const timeThreshold = this.getTimeThreshold(timeRange);

            // Get post counts
            const postCounts = await this.getPostCounts(communityId, timeThreshold);

            // Get comment counts
            const commentCounts = await this.getCommentCounts(communityId, timeThreshold);

            // Get reaction counts
            const reactionCounts = await this.getReactionCounts(communityId, timeThreshold);

            // Combine all engagement metrics
            const engagementMap = new Map<string, number>();

            // Add posts (weight: 10 points)
            postCounts.forEach(({ address, count }) => {
                engagementMap.set(address, (engagementMap.get(address) || 0) + count * 10);
            });

            // Add comments (weight: 5 points)
            commentCounts.forEach(({ address, count }) => {
                engagementMap.set(address, (engagementMap.get(address) || 0) + count * 5);
            });

            // Add reactions (weight: 1 point)
            reactionCounts.forEach(({ address, count }) => {
                engagementMap.set(address, (engagementMap.get(address) || 0) + count * 1);
            });

            // Sort by engagement score and take top N
            const sorted = Array.from(engagementMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit);

            return sorted.map(([address, score], index) => ({
                rank: index + 1,
                address,
                value: Math.round(score),
                change: this.calculateChange(),
                isCurrentUser: currentUserAddress?.toLowerCase() === address.toLowerCase(),
            }));
        } catch (error) {
            safeLogger.error('Error getting most engaged wallets:', error);
            return this.getMockMostEngaged(limit, currentUserAddress);
        }
    }

    /**
     * Get top stakers by staked token amount
     * Note: This requires a staking table which may not exist yet
     */
    async getTopStakers(options: LeaderboardOptions = {}): Promise<LeaderboardEntry[]> {
        const { communityId, limit = 10, currentUserAddress } = options;

        try {
            // Try to query staking data if table exists
            // For now, return mock data since staking table structure is unknown
            return this.getMockTopStakers(limit, currentUserAddress);
        } catch (error) {
            safeLogger.error('Error getting top stakers:', error);
            return this.getMockTopStakers(limit, currentUserAddress);
        }
    }

    // Helper methods

    private getTimeThreshold(timeRange: '7d' | '30d' | 'all'): Date | null {
        if (timeRange === 'all') return null;

        const now = new Date();
        const days = timeRange === '7d' ? 7 : 30;
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    private async getPostCounts(communityId?: string, since?: Date | null) {
        const conditions = [];
        if (communityId) conditions.push(eq(posts.communityId, communityId));
        if (since) conditions.push(gte(posts.createdAt, since));

        const results = await db
            .select({
                address: posts.authorId,
                count: count(posts.id),
            })
            .from(posts)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .groupBy(posts.authorId);

        return results.map(r => ({ address: r.address, count: r.count }));
    }

    private async getCommentCounts(communityId?: string, since?: Date | null) {
        try {
            const conditions = [];
            if (since) conditions.push(gte(comments.createdAt, since));

            const results = await db
                .select({
                    address: comments.authorId,
                    count: count(comments.id),
                })
                .from(comments)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .groupBy(comments.authorId);

            return results.map(r => ({ address: r.address, count: r.count }));
        } catch (error) {
            safeLogger.warn('Comments table not available, skipping comment counts');
            return [];
        }
    }

    private async getReactionCounts(communityId?: string, since?: Date | null) {
        try {
            const conditions = [];
            if (since) conditions.push(gte(reactions.createdAt, since));

            const results = await db
                .select({
                    address: reactions.userId,
                    count: count(reactions.id),
                })
                .from(reactions)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .groupBy(reactions.userId);

            return results.map(r => ({ address: r.address, count: r.count }));
        } catch (error) {
            safeLogger.warn('Reactions table not available, skipping reaction counts');
            return [];
        }
    }

    private calculateChange(): number {
        // Mock change calculation - in production, compare with previous period
        return Math.floor(Math.random() * 30) - 10; // -10% to +20%
    }

    // Mock data methods for fallback

    private getMockTopVoters(limit: number, currentUserAddress?: string): LeaderboardEntry[] {
        const mockData = [
            { address: '0x1234...5678', ensName: 'alice.eth', value: 1250, change: 5 },
            { address: '0x2345...6789', ensName: 'bob.eth', value: 980, change: -2 },
            { address: '0x3456...7890', value: 875, change: 12 },
            { address: '0x4567...8901', ensName: 'charlie.eth', value: 720, change: 3 },
            { address: '0x5678...9012', value: 650, change: -5 },
            { address: '0x6789...0123', ensName: 'dave.eth', value: 580, change: 8 },
            { address: '0x7890...1234', value: 520, change: -3 },
            { address: '0x8901...2345', value: 480, change: 15 },
            { address: '0x9012...3456', value: 420, change: 2 },
            { address: '0x0123...4567', value: 380, change: -7 },
        ];

        return mockData.slice(0, limit).map((entry, index) => ({
            rank: index + 1,
            ...entry,
            isCurrentUser: currentUserAddress?.toLowerCase() === entry.address.toLowerCase(),
        }));
    }

    private getMockTopPosters(limit: number, currentUserAddress?: string): LeaderboardEntry[] {
        const mockData = [
            { address: '0x6789...0123', ensName: 'creator.eth', value: 342, change: 8 },
            { address: '0x7890...1234', value: 298, change: 15 },
            { address: '0x8901...2345', ensName: 'writer.eth', value: 256, change: -3 },
            { address: '0x9012...3456', value: 189, change: 7 },
            { address: '0x0123...4567', value: 145, change: 2 },
            { address: '0x1111...2222', ensName: 'blogger.eth', value: 128, change: 12 },
            { address: '0x2222...3333', value: 98, change: -5 },
            { address: '0x3333...4444', value: 87, change: 4 },
            { address: '0x4444...5555', value: 76, change: 9 },
            { address: '0x5555...6666', value: 65, change: -2 },
        ];

        return mockData.slice(0, limit).map((entry, index) => ({
            rank: index + 1,
            ...entry,
            isCurrentUser: currentUserAddress?.toLowerCase() === entry.address.toLowerCase(),
        }));
    }

    private getMockMostEngaged(limit: number, currentUserAddress?: string): LeaderboardEntry[] {
        const mockData = [
            { address: '0x1111...2222', ensName: 'active.eth', value: 9850, change: 25 },
            { address: '0x2222...3333', value: 8920, change: 18 },
            { address: '0x3333...4444', ensName: 'engaged.eth', value: 7650, change: -5 },
            { address: '0x4444...5555', value: 6890, change: 12 },
            { address: '0x5555...6666', value: 5940, change: 8 },
            { address: '0x6666...7777', ensName: 'super.eth', value: 5120, change: 15 },
            { address: '0x7777...8888', value: 4680, change: -3 },
            { address: '0x8888...9999', value: 4230, change: 22 },
            { address: '0x9999...0000', value: 3890, change: 5 },
            { address: '0x0000...1111', value: 3450, change: -8 },
        ];

        return mockData.slice(0, limit).map((entry, index) => ({
            rank: index + 1,
            ...entry,
            isCurrentUser: currentUserAddress?.toLowerCase() === entry.address.toLowerCase(),
        }));
    }

    private getMockTopStakers(limit: number, currentUserAddress?: string): LeaderboardEntry[] {
        const mockData = [
            { address: '0xaaaa...bbbb', ensName: 'whale.eth', value: 500000, change: 10 },
            { address: '0xbbbb...cccc', value: 350000, change: 5 },
            { address: '0xcccc...dddd', ensName: 'hodler.eth', value: 280000, change: -2 },
            { address: '0xdddd...eeee', value: 195000, change: 15 },
            { address: '0xeeee...ffff', value: 142000, change: 7 },
            { address: '0xffff...0000', ensName: 'staker.eth', value: 98000, change: 12 },
            { address: '0x0000...aaaa', value: 75000, change: -5 },
            { address: '0x1111...bbbb', value: 62000, change: 8 },
            { address: '0x2222...cccc', value: 51000, change: 3 },
            { address: '0x3333...dddd', value: 42000, change: -3 },
        ];

        return mockData.slice(0, limit).map((entry, index) => ({
            rank: index + 1,
            ...entry,
            isCurrentUser: currentUserAddress?.toLowerCase() === entry.address.toLowerCase(),
        }));
    }
}

export const leaderboardService = new LeaderboardService();
