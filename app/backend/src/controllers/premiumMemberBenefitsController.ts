import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import PremiumMemberBenefitsService from '../services/premiumMemberBenefitsService';

const premiumBenefitsService = new PremiumMemberBenefitsService();

/**
 * Check premium membership status
 */
export const checkPremiumMembershipStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const status = await premiumBenefitsService.checkPremiumMembershipStatus(userId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    safeLogger.error('Error checking premium membership status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check premium membership status'
    });
  }
};

/**
 * Get exclusive staking pools for premium members
 */
export const getExclusiveStakingPools = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const pools = await premiumBenefitsService.getExclusiveStakingPools(userId);
    
    res.json({
      success: true,
      data: pools
    });
  } catch (error) {
    safeLogger.error('Error fetching exclusive staking pools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exclusive staking pools'
    });
  }
};

/**
 * Calculate premium member penalty discount
 */
export const calculatePremiumPenaltyDiscount = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { originalPenalty } = req.body;
    
    if (!userId || !originalPenalty) {
      return res.status(400).json({
        success: false,
        error: 'User ID and original penalty amount are required'
      });
    }

    const discount = await premiumBenefitsService.calculatePremiumPenaltyDiscount(
      userId,
      originalPenalty.toString()
    );
    
    res.json({
      success: true,
      data: discount
    });
  } catch (error) {
    safeLogger.error('Error calculating premium penalty discount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate penalty discount'
    });
  }
};

/**
 * Get premium member analytics
 */
export const getPremiumAnalytics = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const analytics = await premiumBenefitsService.getPremiumAnalytics(userId);
    
    if (!analytics) {
      return res.status(403).json({
        success: false,
        error: 'Advanced analytics not available for your membership tier'
      });
    }
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    safeLogger.error('Error fetching premium analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch premium analytics'
    });
  }
};

/**
 * Create custom staking option for premium members
 */
export const createCustomStakingOption = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, customDuration, requestedApr, specialTerms } = req.body;
    
    if (!userId || !amount || !customDuration || !requestedApr) {
      return res.status(400).json({
        success: false,
        error: 'User ID, amount, custom duration, and requested APR are required'
      });
    }

    // Validate inputs
    if (customDuration < 1 || customDuration > 730) {
      return res.status(400).json({
        success: false,
        error: 'Custom duration must be between 1 and 730 days'
      });
    }

    if (requestedApr < 0 || requestedApr > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Requested APR must be between 0 and 5000 basis points (50%)'
      });
    }

    const result = await premiumBenefitsService.createCustomStakingOption(userId, {
      amount: amount.toString(),
      customDuration: parseInt(customDuration),
      requestedApr: parseInt(requestedApr),
      specialTerms
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    safeLogger.error('Error creating custom staking option:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create custom staking option'
    });
  }
};

/**
 * Get premium member staking events and promotions
 */
export const getPremiumStakingEvents = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const events = await premiumBenefitsService.getPremiumStakingEvents(userId);
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    safeLogger.error('Error fetching premium staking events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch premium staking events'
    });
  }
};

/**
 * Get premium member dashboard summary
 */
export const getPremiumMemberDashboard = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Fetch all premium member data
    const [membershipStatus, exclusivePools, analytics, events] = await Promise.all([
      premiumBenefitsService.checkPremiumMembershipStatus(userId),
      premiumBenefitsService.getExclusiveStakingPools(userId),
      premiumBenefitsService.getPremiumAnalytics(userId),
      premiumBenefitsService.getPremiumStakingEvents(userId)
    ]);

    const dashboard = {
      membershipStatus,
      exclusivePools,
      analytics,
      events,
      quickStats: {
        totalExclusivePools: exclusivePools.length,
        activeEvents: events.activeEvents.length,
        upcomingEvents: events.upcomingEvents.length,
        eligiblePromotions: events.eligiblePromotions.length
      }
    };
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    safeLogger.error('Error fetching premium member dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch premium member dashboard'
    });
  }
};

/**
 * Validate premium member benefits access
 */
export const validatePremiumAccess = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { feature } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const membershipStatus = await premiumBenefitsService.checkPremiumMembershipStatus(userId);
    const benefits = membershipStatus.benefits;
    
    let hasAccess = false;
    let accessLevel = 'none';
    
    switch (feature) {
      case 'exclusive_pools':
        hasAccess = membershipStatus.isPremium;
        accessLevel = membershipStatus.isVip ? 'vip' : membershipStatus.isPremium ? 'premium' : 'none';
        break;
      case 'advanced_analytics':
        hasAccess = benefits.advancedAnalytics;
        accessLevel = hasAccess ? (membershipStatus.isVip ? 'vip' : 'premium') : 'none';
        break;
      case 'custom_staking':
        hasAccess = benefits.customStakingOptions;
        accessLevel = hasAccess ? (membershipStatus.isVip ? 'vip' : 'premium') : 'none';
        break;
      case 'priority_support':
        hasAccess = benefits.prioritySupport;
        accessLevel = hasAccess ? (membershipStatus.isVip ? 'vip' : 'premium') : 'none';
        break;
      case 'early_access':
        hasAccess = benefits.earlyAccess;
        accessLevel = hasAccess ? (membershipStatus.isVip ? 'vip' : 'premium') : 'none';
        break;
      default:
        hasAccess = membershipStatus.isPremium;
        accessLevel = membershipStatus.isVip ? 'vip' : membershipStatus.isPremium ? 'premium' : 'none';
    }
    
    res.json({
      success: true,
      data: {
        hasAccess,
        accessLevel,
        membershipTier: membershipStatus.membershipTier,
        feature: feature || 'general'
      }
    });
  } catch (error) {
    safeLogger.error('Error validating premium access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate premium access'
    });
  }
};
