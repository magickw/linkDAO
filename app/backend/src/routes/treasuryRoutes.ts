import { Router } from 'express';
import { treasuryService } from '../services/treasuryService';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * GET /api/treasury/balance
 * Get treasury balance with asset breakdown
 */
router.get('/balance', async (req, res) => {
    try {
        const { treasuryAddress } = req.query;

        const balance = await treasuryService.getTreasuryBalance(treasuryAddress as string);

        res.json({
            success: true,
            data: balance,
        });
    } catch (error) {
        safeLogger.error('Error fetching treasury balance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch treasury balance',
        });
    }
});

/**
 * GET /api/treasury/transactions
 * Get recent treasury transactions
 */
router.get('/transactions', async (req, res) => {
    try {
        const { treasuryAddress, limit } = req.query;

        const transactions = await treasuryService.getRecentTransactions(
            treasuryAddress as string,
            limit ? parseInt(limit as string) : 10
        );

        res.json({
            success: true,
            data: transactions,
        });
    } catch (error) {
        safeLogger.error('Error fetching treasury transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch treasury transactions',
        });
    }
});

/**
 * GET /api/treasury/spending-categories
 * Get spending categories breakdown
 */
router.get('/spending-categories', async (req, res) => {
    try {
        const { treasuryAddress } = req.query;

        const categories = await treasuryService.getSpendingCategories(treasuryAddress as string);

        res.json({
            success: true,
            data: categories,
        });
    } catch (error) {
        safeLogger.error('Error fetching spending categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch spending categories',
        });
    }
});

/**
 * GET /api/treasury/assets
 * Get governance-controlled assets
 */
router.get('/assets', async (req, res) => {
    try {
        const { treasuryAddress } = req.query;

        const assets = await treasuryService.getGovernanceAssets(treasuryAddress as string);

        res.json({
            success: true,
            data: assets,
        });
    } catch (error) {
        safeLogger.error('Error fetching governance assets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch governance assets',
        });
    }
});

export default router;
