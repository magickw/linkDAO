import express, { Request, Response, Router } from 'express';
import { ldaoBenefitsDashboardService } from '../services/ldaoBenefitsDashboardService';
import { authenticateToken } from '../middleware/auth';

const router: Router = express.Router();

// Get comprehensive LDAO benefits dashboard
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const dashboardData = await ldaoBenefitsDashboardService.getLDAOBenefitsDashboard(userId);

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error: any) {
    console.error('Error getting LDAO benefits dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get user's staking information
router.get('/staking', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const stakingInfo = await ldaoBenefitsDashboardService.getLDAOStakingInfo(userId);

    res.json({
      success: true,
      data: stakingInfo
    });
  } catch (error: any) {
    console.error('Error getting LDAO staking info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get marketplace benefits
router.get('/marketplace', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const marketplaceBenefits = await ldaoBenefitsDashboardService.getMarketplaceBenefitsOnly(userId);

    res.json({
      success: true,
      data: marketplaceBenefits
    });
  } catch (error: any) {
    console.error('Error getting marketplace benefits:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get staking tier details
router.get('/staking/tiers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const tierDetails = await ldaoBenefitsDashboardService.getStakingTierDetails(userId);

    res.json({
      success: true,
      data: tierDetails
    });
  } catch (error: any) {
    console.error('Error getting staking tier details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get acquisition options
router.get('/acquisition', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const acquisitionOptions = await ldaoBenefitsDashboardService.getAcquisitionOptions(userId);

    res.json({
      success: true,
      data: acquisitionOptions
    });
  } catch (error: any) {
    console.error('Error getting acquisition options:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get recent activity
router.get('/activity', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const recentActivity = await ldaoBenefitsDashboardService.getRecentActivity(userId);

    res.json({
      success: true,
      data: recentActivity
    });
  } catch (error: any) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({
      success: true,  // Return success true but empty data to avoid frontend errors
      data: [],
      warning: 'Could not load recent activity'
    });
  }
});

export default router;