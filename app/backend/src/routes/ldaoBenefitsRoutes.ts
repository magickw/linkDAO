import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/authMiddleware';
import { ldaoBenefitsDashboardService } from '../services/ldaoBenefitsDashboardService';
import { apiResponse } from '../utils/apiResponse';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route GET /api/ldao/benefits
 * @desc Get comprehensive LDAO benefits summary for the authenticated user
 * @access Private
 */
router.get('/benefits',
  validateRequest({}),
  async (req, res) => {
    try {
      const userAddress = (req as any).user?.address;
      if (!userAddress) {
        return res.status(401).json(apiResponse.error('Authentication required', 401));
      }

      const benefitsSummary = await ldaoBenefitsDashboardService.getLDAOBenefitsSummary(userAddress);
      
      res.json(apiResponse.success(benefitsSummary, 'LDAO benefits summary retrieved successfully'));
    } catch (error) {
      res.status(500).json(apiResponse.error('Failed to retrieve LDAO benefits summary'));
    }
  }
);

/**
 * @route GET /api/ldao/benefits/staking
 * @desc Get detailed staking information for the authenticated user
 * @access Private
 */
router.get('/benefits/staking',
  validateRequest({}),
  async (req, res) => {
    try {
      const userAddress = (req as any).user?.address;
      if (!userAddress) {
        return res.status(401).json(apiResponse.error('Authentication required', 401));
      }

      const stakingInfo = await ldaoBenefitsDashboardService.getLDAOBenefitsSummary(userAddress);
      
      res.json(apiResponse.success(stakingInfo.stakingInfo, 'Staking information retrieved successfully'));
    } catch (error) {
      res.status(500).json(apiResponse.error('Failed to retrieve staking information'));
    }
  }
);

/**
 * @route GET /api/ldao/benefits/marketplace
 * @desc Get marketplace benefits information for the authenticated user
 * @access Private
 */
router.get('/benefits/marketplace',
  validateRequest({}),
  async (req, res) => {
    try {
      const userAddress = (req as any).user?.address;
      if (!userAddress) {
        return res.status(401).json(apiResponse.error('Authentication required', 401));
      }

      const marketplaceBenefits = await ldaoBenefitsDashboardService.getLDAOBenefitsSummary(userAddress);
      
      res.json(apiResponse.success(marketplaceBenefits.marketplaceBenefits, 'Marketplace benefits retrieved successfully'));
    } catch (error) {
      res.status(500).json(apiResponse.error('Failed to retrieve marketplace benefits'));
    }
  }
);

export default router;