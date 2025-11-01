import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { EnhancedStakingService } from '../services/enhancedStakingService';
import { ethers } from 'ethers';

// This would be injected via dependency injection in a real app
let stakingService: EnhancedStakingService;

// Initialize the service (this would be done in app startup)
export const initializeStakingService = (service: EnhancedStakingService) => {
  stakingService = service;
};

/**
 * Get all available staking tiers
 */
export const getStakingTiers = async (req: Request, res: Response) => {
  try {
    const tiers = await stakingService.getStakingTiers();
    res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    safeLogger.error('Error fetching staking tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staking tiers'
    });
  }
};

/**
 * Get flexible staking options for a user
 */
export const getFlexibleStakingOptions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const options = await stakingService.getFlexibleStakingOptions(userId);
    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    safeLogger.error('Error fetching flexible staking options:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staking options'
    });
  }
};

/**
 * Calculate staking rewards and penalties
 */
export const calculateStakingRewards = async (req: Request, res: Response) => {
  try {
    const { amount, tierId, duration, isPremiumMember } = req.body;

    if (!amount || !tierId) {
      return res.status(400).json({
        success: false,
        error: 'Amount and tier ID are required'
      });
    }

    // Validate amount format
    try {
      ethers.parseEther(amount.toString());
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount format'
      });
    }

    const calculation = await stakingService.calculateStakingRewards(
      amount.toString(),
      parseInt(tierId),
      duration ? parseInt(duration) : undefined,
      Boolean(isPremiumMember)
    );

    res.json({
      success: true,
      data: calculation
    });
  } catch (error) {
    safeLogger.error('Error calculating staking rewards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate staking rewards'
    });
  }
};

/**
 * Create a new staking position
 */
export const createStakePosition = async (req: Request, res: Response) => {
  try {
    const { userId, walletAddress, options, transactionHash } = req.body;

    if (!userId || !walletAddress || !options || !transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format'
      });
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash format'
      });
    }

    // Validate amount format
    try {
      ethers.parseEther(options.amount.toString());
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount format'
      });
    }

    const positionId = await stakingService.createStakePosition(
      userId,
      walletAddress,
      {
        tierId: parseInt(options.tierId),
        amount: options.amount.toString(),
        duration: options.duration ? parseInt(options.duration) : undefined,
        autoCompound: Boolean(options.autoCompound),
        compoundFrequency: options.compoundFrequency
      },
      transactionHash
    );

    res.status(201).json({
      success: true,
      data: {
        positionId
      }
    });
  } catch (error) {
    safeLogger.error('Error creating stake position:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stake position'
    });
  }
};

/**
 * Get user's staking positions
 */
export const getUserStakePositions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const positions = await stakingService.getUserStakePositions(userId);
    res.json({
      success: true,
      data: positions
    });
  } catch (error) {
    safeLogger.error('Error fetching user stake positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stake positions'
    });
  }
};

/**
 * Calculate early withdrawal penalty
 */
export const calculateEarlyWithdrawalPenalty = async (req: Request, res: Response) => {
  try {
    const { positionId } = req.params;
    const { withdrawalAmount } = req.query;

    if (!positionId) {
      return res.status(400).json({
        success: false,
        error: 'Position ID is required'
      });
    }

    const penalty = await stakingService.calculateEarlyWithdrawalPenalty(
      positionId,
      withdrawalAmount as string
    );

    res.json({
      success: true,
      data: penalty
    });
  } catch (error) {
    safeLogger.error('Error calculating early withdrawal penalty:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate penalty'
    });
  }
};

/**
 * Process partial unstaking
 */
export const processPartialUnstaking = async (req: Request, res: Response) => {
  try {
    const { positionId, amount, transactionHash } = req.body;

    if (!positionId || !amount || !transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'Position ID, amount, and transaction hash are required'
      });
    }

    // Validate amount format
    try {
      ethers.parseEther(amount.toString());
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount format'
      });
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash format'
      });
    }

    await stakingService.processPartialUnstaking(
      positionId,
      amount.toString(),
      transactionHash
    );

    res.json({
      success: true,
      message: 'Partial unstaking processed successfully'
    });
  } catch (error) {
    safeLogger.error('Error processing partial unstaking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process partial unstaking'
    });
  }
};

/**
 * Process auto-compounding for a position
 */
export const processAutoCompounding = async (req: Request, res: Response) => {
  try {
    const { positionId, rewardAmount, transactionHash } = req.body;

    if (!positionId || !rewardAmount || !transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'Position ID, reward amount, and transaction hash are required'
      });
    }

    // Validate reward amount format
    try {
      ethers.parseEther(rewardAmount.toString());
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid reward amount format'
      });
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction hash format'
      });
    }

    await stakingService.processAutoCompounding(
      positionId,
      rewardAmount.toString(),
      transactionHash
    );

    res.json({
      success: true,
      message: 'Auto-compounding processed successfully'
    });
  } catch (error) {
    safeLogger.error('Error processing auto-compounding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process auto-compounding'
    });
  }
};

/**
 * Get user's staking analytics
 */
export const getUserStakingAnalytics = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const analytics = await stakingService.getUserStakingAnalytics(userId);
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    safeLogger.error('Error fetching user staking analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staking analytics'
    });
  }
};

/**
 * Get staking tier details
 */
export const getStakingTierDetails = async (req: Request, res: Response) => {
  try {
    const { tierId } = req.params;
    
    if (!tierId) {
      return res.status(400).json({
        success: false,
        error: 'Tier ID is required'
      });
    }

    const tiers = await stakingService.getStakingTiers();
    const tier = tiers.find(t => t.id === parseInt(tierId));

    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'Staking tier not found'
      });
    }

    res.json({
      success: true,
      data: tier
    });
  } catch (error) {
    safeLogger.error('Error fetching staking tier details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tier details'
    });
  }
};

/**
 * Get staking position details
 */
export const getStakePositionDetails = async (req: Request, res: Response) => {
  try {
    const { positionId } = req.params;
    
    if (!positionId) {
      return res.status(400).json({
        success: false,
        error: 'Position ID is required'
      });
    }

    // This would need to be implemented in the service
    // For now, we'll return a placeholder response
    res.status(501).json({
      success: false,
      error: 'Position details endpoint not yet implemented'
    });
  } catch (error) {
    safeLogger.error('Error fetching stake position details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch position details'
    });
  }
};

/**
 * Health check endpoint
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Basic health check - could be expanded to check database connectivity, etc.
    res.json({
      success: true,
      message: 'Enhanced staking service is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    safeLogger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Service health check failed'
    });
  }
};
