/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { TipService } from '../services/tipService';
import { ethers } from 'ethers';

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

      // Resolve user IDs
      const fromUser = await tipService.getUserByWalletAddress(fromAddress);
      const toUser = await tipService.getUserByWalletAddress(creatorAddress);

      if (!fromUser || !toUser) {
        return res.status(404).json({ error: 'User not found. Ensure both sender and recipient have profiles.' });
      }

      // Save the tip to the database
      // Note: In a full implementation, we might want to wait for on-chain confirmation 
      // or use a webhook, but for now we record it immediately or after EIP-712 signature verification (skipped here).
      const newTip = await tipService.recordTip(
        postId,
        fromUser.id,
        toUser.id,
        amount.toString(),
        'LDAO',
        message
      );

      // In a real implementation, this would:
      // 1. Validate the post exists (done effectively by foreign key if we checked)
      // 2. Validate the creator address (done above)
      // 3. Generate EIP-712 permit data for gasless tipping
      // 4. Save the tip to the database (done above)
      // 5. Return the permit data for the client to sign

      // Generate EIP-712 data for client signing (simplified)
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
          // chainId: 8453, // Base Mainnet
          chainId: 11155111, // ETH Sepolia
          verifyingContract: process.env.TIP_ROUTER_ADDRESS || '0x4200000000000000000000000000000000000006', // Example
        },
        primaryType: 'Permit',
        message: {
          owner: fromAddress,
          spender: process.env.TIP_ROUTER_ADDRESS || '0x4200000000000000000000000000000000000006',
          value: ethers.parseEther(amount).toString(),
          nonce: 0, // Should fetch from contract
          deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        },
      };

      return res.status(201).json({
        success: true,
        permitData,
        tip: {
          id: newTip.id,
          postId,
          from: fromAddress,
          to: creatorAddress,
          amount,
          message,
          token: 'LDAO',
          timestamp: newTip.createdAt
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

      // Query the database for tips received by this user
      const totalEarned = await tipService.getTotalTipsReceived(userId);
      const totalGiven = await tipService.getTotalTipsSent(userId);

      // In a real implementation, claimable would be calculated based on what hasn't been paid out
      // For now, we'll assume everything is claimed or handle it via on-chain state
      // This is a simplification to remove the hardcoded mock values
      const earnings = {
        totalEarned: totalEarned.toString(),
        claimable: '0', // TODO: Implement claimable logic with tracking
        rank: 0, // TODO: Implement ranking
        totalGiven: totalGiven.toString(),
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

      // In a full implementation, this needs to interact with the RewardPool contract
      // Since we don't have the ABI or address here yet, we will return a 501 Not Implemented
      // or a placeholder that indicates this feature requires contract integration.

      // For now, we'll return a placeholder that doesn't pretend to be real transaction data
      // preventing the frontend from trying to sign invalid data.
      /*
      const transactionData = {
        to: process.env.REWARD_POOL_ADDRESS || '0x...',
        data: '0x...', // ABI-encoded claim() function call
        value: '0',
      };
      */

      return res.status(501).json({
        error: 'Claiming rewards is not yet fully implemented on chain.',
        success: false
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
      const rawTips = await tipService.getTipsForPost(postId);

      const tips = rawTips.map(tip => ({
        id: tip.id.toString(),
        from: tip.tipperWallet || 'Unknown', // Fallback if user deleted
        amount: tip.amount,
        message: tip.message || '',
        timestamp: tip.timestamp,
        tipperName: tip.tipperName || tip.tipperHandle || undefined,
        txHash: tip.txHash
      }));

      return res.json(tips);
    } catch (error) {
      safeLogger.error('Error fetching post tips:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  /**
   * Get tips received by a user
   */
  async getReceivedTips(req: Request, res: Response): Promise<Response> {
    try {
      const { address, limit, offset } = req.body;
      const tips = await tipService.getReceivedTips(address, limit, offset);
      return res.json({ success: true, tips });
    } catch (error) {
      safeLogger.error('Error fetching received tips:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get tips sent by a user
   */
  async getSentTips(req: Request, res: Response): Promise<Response> {
    try {
      const { address, limit, offset } = req.body;
      const tips = await tipService.getSentTips(address, limit, offset);
      return res.json({ success: true, tips });
    } catch (error) {
      safeLogger.error('Error fetching sent tips:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get total tips for a user
   */
  async getUserTotalTips(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const totalReceived = await tipService.getTotalTipsReceived(address);

      return res.json({
        success: true,
        totals: {
          LDAO: totalReceived.toString(),
          USDC: '0',
          USDT: '0'
        }
      });
    } catch (error) {
      safeLogger.error('Error fetching total tips:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
