/**
 * Gas Fee Sponsorship Controller
 * Handles API endpoints for gas fee sponsorship system
 */

import { Request, Response } from 'express';
import { GasFeeSponsorshipService } from '../services/gasFeeSponsorshipService';

const gasFeeSponsorshipService = new GasFeeSponsorshipService();

/**
 * Get active sponsorship tiers
 */
export const getSponsorshipTiers = async (req: Request, res: Response) => {
  try {
    const tiers = await gasFeeSponsorshipService.getActiveTiers();
    
    res.json({
      success: true,
      data: tiers,
      message: 'Sponsorship tiers retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting sponsorship tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sponsorship tiers'
    });
  }
};

/**
 * Check user eligibility for sponsorship
 */
export const checkSponsorshipEligibility = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reputation = 0, transactionCount = 0, isDaoMember = false } = req.query;
    
    const eligibleTiers = await gasFeeSponsorshipService.checkEligibility(
      userId,
      parseInt(reputation as string),
      parseInt(transactionCount as string),
      isDaoMember === 'true'
    );
    
    const dailyUsage = await gasFeeSponsorshipService.getDailyUsage(userId);
    
    res.json({
      success: true,
      data: {
        eligibleTiers,
        dailyUsage,
        bestTier: eligibleTiers[0] || null
      },
      message: 'Eligibility checked successfully'
    });
  } catch (error) {
    console.error('Error checking sponsorship eligibility:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check sponsorship eligibility'
    });
  }
};

/**
 * Apply for gas fee sponsorship
 */
export const applyForSponsorship = async (req: Request, res: Response) => {
  try {
    const { userId, transactionType, estimatedGasCost, tierId } = req.body;
    
    if (!userId || !transactionType || !estimatedGasCost || !tierId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, transactionType, estimatedGasCost, tierId'
      });
    }
    
    const sponsorshipResult = await gasFeeSponsorshipService.applyForSponsorship({
      userId,
      transactionType,
      estimatedGasCost,
      tierId
    });
    
    res.json({
      success: sponsorshipResult.approved,
      data: sponsorshipResult,
      message: sponsorshipResult.approved ? 
        'Sponsorship approved successfully' : 
        sponsorshipResult.reason || 'Sponsorship application denied'
    });
  } catch (error) {
    console.error('Error applying for sponsorship:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process sponsorship application'
    });
  }
};

/**
 * Get sponsorship statistics
 */
export const getSponsorshipStats = async (req: Request, res: Response) => {
  try {
    const stats = await gasFeeSponsorshipService.getSponsorshipStats();
    const poolHealth = await gasFeeSponsorshipService.checkPoolHealth();
    
    res.json({
      success: true,
      data: {
        ...stats,
        poolHealth
      },
      message: 'Sponsorship statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting sponsorship stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sponsorship statistics'
    });
  }
};

/**
 * Get user sponsorship history
 */
export const getUserSponsorshipHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    const history = await gasFeeSponsorshipService.getUserSponsorshipHistory(
      userId,
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      data: history,
      message: 'Sponsorship history retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user sponsorship history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sponsorship history'
    });
  }
};

/**
 * Get gas estimates for different transaction types
 */
export const getGasEstimates = async (req: Request, res: Response) => {
  try {
    const estimates = gasFeeSponsorshipService.getGasEstimates();
    
    res.json({
      success: true,
      data: estimates,
      message: 'Gas estimates retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting gas estimates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve gas estimates'
    });
  }
};

/**
 * Get sponsorship pool balance
 */
export const getSponsorshipPoolBalance = async (req: Request, res: Response) => {
  try {
    const balance = await gasFeeSponsorshipService.getSponsorshipPoolBalance();
    const poolHealth = await gasFeeSponsorshipService.checkPoolHealth();
    
    res.json({
      success: true,
      data: {
        balance,
        health: poolHealth
      },
      message: 'Pool balance retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting pool balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pool balance'
    });
  }
};

/**
 * Update sponsorship tier (Admin only)
 */
export const updateSponsorshipTier = async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params;
    const updates = req.body;
    
    // In a real implementation, check admin permissions here
    
    await gasFeeSponsorshipService.updateTier(tierId, updates);
    
    res.json({
      success: true,
      message: 'Sponsorship tier updated successfully'
    });
  } catch (error) {
    console.error('Error updating sponsorship tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sponsorship tier'
    });
  }
};

/**
 * Create new sponsorship tier (Admin only)
 */
export const createSponsorshipTier = async (req: Request, res: Response) => {
  try {
    const tierData = req.body;
    
    // In a real implementation, check admin permissions here
    // Validate required fields
    const requiredFields = ['name', 'description', 'coveragePercentage', 'maxSponsorshipPerDay'];
    const missingFields = requiredFields.filter(field => !tierData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    const tierId = await gasFeeSponsorshipService.createTier(tierData);
    
    res.status(201).json({
      success: true,
      data: { tierId },
      message: 'Sponsorship tier created successfully'
    });
  } catch (error) {
    console.error('Error creating sponsorship tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sponsorship tier'
    });
  }
};

/**
 * Get daily usage for a user
 */
export const getDailyUsage = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const dailyUsage = await gasFeeSponsorshipService.getDailyUsage(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        dailyUsage,
        date: new Date().toISOString().split('T')[0]
      },
      message: 'Daily usage retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting daily usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve daily usage'
    });
  }
};", "original_text": "", "replace_all": false}]