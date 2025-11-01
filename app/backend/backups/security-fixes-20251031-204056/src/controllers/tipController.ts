import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { TipService } from '../services/tipService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { ethers } from 'ethers';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

const tipService = new TipService();

export class TipController {
  /**
   * Create a new tip
   */
  async createTip(req: Request, res: Response): Promise<Response> {
    try {
      const { postId, creatorAddress, amount, message } = req.body;
      const { walletAddress: fromAddress } = req.user as { walletAddress: string };

      // Validate input
      if (!postId || !creatorAddress || !amount) {
        return res.status(400).json({ error: 'Missing required fields: postId, creatorAddress, amount' });
      }

      if (parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Tip amount must be greater than 0' });
      }

      // In a real implementation, this would:
      // 1. Validate the post exists
      // 2. Validate the creator address
      // 3. Generate EIP-712 permit data for gasless tipping
      // 4. Save the tip to the database
      // 5. Return the permit data for the client to sign

      // For now, we'll just return mock data
      const permitData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        },
        domain: {
          name: 'LinkDAO Token',
          version: '1',
          chainId: 8453, // Base Mainnet
          verifyingContract: process.env.TIP_ROUTER_ADDRESS || '0x...', // TipRouter contract address
        },
        primaryType: 'Permit',
        message: {
          owner: fromAddress,
          spender: process.env.TIP_ROUTER_ADDRESS || '0x...', // TipRouter contract address
          value: ethers.parseEther(amount).toString(),
          nonce: 0,
          deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        },
      };

      // Save to database
      // const tip = await tipService.recordTip(
      //   parseInt(postId),
      //   fromAddress,
      //   creatorAddress,
      //   amount,
      //   'LDAO',
      //   message
      // );

      return res.status(201).json({
        success: true,
        permitData,
        tip: {
          postId,
          from: fromAddress,
          to: creatorAddress,
          amount,
          message,
          token: 'LDAO',
        },
      });
    } catch (error) {
      safeLogger.error('Error creating tip:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get earnings for a user
   */
  async getUserEarnings(req: Request, res: Response): Promise<Response> {
    try {
      const { id: userId } = req.params;
      
      // In a real implementation, this would:
      // 1. Query the database for tips received by this user
      // 2. Calculate total earnings and claimable amount
      // 3. Return the data
      
      // For now, we'll just return mock data
      const earnings = {
        totalEarned: '1250.50',
        claimable: '875.25',
        rank: 12,
        totalCreators: 1240,
      };

      return res.json(earnings);
    } catch (error) {
      safeLogger.error('Error fetching earnings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Claim rewards
   */
  async claimRewards(req: Request, res: Response): Promise<Response> {
    try {
      const { walletAddress: userAddress } = req.user as { walletAddress: string };
      
      // In a real implementation, this would:
      // 1. Validate the user has claimable rewards
      // 2. Generate transaction data to call claim() on RewardPool contract
      // 3. Return the transaction data for the client to sign and broadcast
      
      // For now, we'll just return mock data
      const transactionData = {
        to: process.env.REWARD_POOL_ADDRESS || '0x...', // RewardPool contract address
        data: '0x...', // ABI-encoded claim() function call
        value: '0',
      };

      return res.json({
        success: true,
        transactionData,
      });
    } catch (error) {
      safeLogger.error('Error claiming rewards:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get tips for a post
   */
  async getPostTips(req: Request, res: Response): Promise<Response> {
    try {
      const { id: postId } = req.params;
      
      // In a real implementation, this would:
      // 1. Query the database for tips on this post
      // 2. Return the data with user information
      
      // For now, we'll just return mock data
      const tips = [
        {
          id: '1',
          from: '0x1234...5678',
          amount: '50',
          message: 'Great post!',
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: '2',
          from: '0x2345...6789',
          amount: '100',
          message: 'Thanks for sharing this',
          timestamp: new Date(Date.now() - 7200000),
        },
        {
          id: '3',
          from: '0x3456...7890',
          amount: '25',
          message: '',
          timestamp: new Date(Date.now() - 10800000),
        },
      ];

      return res.json(tips);
    } catch (error) {
      safeLogger.error('Error fetching post tips:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}