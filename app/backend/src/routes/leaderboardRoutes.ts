import { Router } from 'express';
import { leaderboardService } from '../services/leaderboardService';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * GET /api/leaderboard/voters
 * Get top voters leaderboard
 */
router.get('/voters', async (req, res) => {
    try {
        const { communityId, limit, timeRange, userAddress } = req.query;

        const leaderboard = await leaderboardService.getTopVoters({
            communityId: communityId as string,
            limit: limit ? parseInt(limit as string) : 10,
            timeRange: (timeRange as '7d' | '30d' | 'all') || 'all',
            currentUserAddress: userAddress as string,
        });

        res.json({
            success: true,
            data: leaderboard,
        });
    } catch (error) {
        safeLogger.error('Error fetching top voters:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top voters',
        });
    }
});

/**
 * GET /api/leaderboard/posters
 * Get top posters leaderboard
 */
router.get('/posters', async (req, res) => {
    try {
        const { communityId, limit, timeRange, userAddress } = req.query;

        const leaderboard = await leaderboardService.getTopPosters({
            communityId: communityId as string,
            limit: limit ? parseInt(limit as string) : 10,
            timeRange: (timeRange as '7d' | '30d' | 'all') || 'all',
            currentUserAddress: userAddress as string,
        });

        res.json({
            success: true,
            data: leaderboard,
        });
    } catch (error) {
        safeLogger.error('Error fetching top posters:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top posters',
        });
    }
});

/**
 * GET /api/leaderboard/engaged
 * Get most engaged wallets leaderboard
 */
router.get('/engaged', async (req, res) => {
    try {
        const { communityId, limit, timeRange, userAddress } = req.query;

        const leaderboard = await leaderboardService.getMostEngagedWallets({
            communityId: communityId as string,
            limit: limit ? parseInt(limit as string) : 10,
            timeRange: (timeRange as '7d' | '30d' | 'all') || 'all',
            currentUserAddress: userAddress as string,
        });

        res.json({
            success: true,
            data: leaderboard,
        });
    } catch (error) {
        safeLogger.error('Error fetching most engaged wallets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch most engaged wallets',
        });
    }
});

/**
 * GET /api/leaderboard/stakers
 * Get top stakers leaderboard
 */
router.get('/stakers', async (req, res) => {
    try {
        const { communityId, limit, userAddress } = req.query;

        const leaderboard = await leaderboardService.getTopStakers({
            communityId: communityId as string,
            limit: limit ? parseInt(limit as string) : 10,
            currentUserAddress: userAddress as string,
        });

        res.json({
            success: true,
            data: leaderboard,
        });
    } catch (error) {
        safeLogger.error('Error fetching top stakers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top stakers',
        });
    }
});

export default router;
