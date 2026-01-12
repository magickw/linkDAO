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
      safeLogger.info('Creating tip request:', { body: req.body, user: req.user });
      const { postId, creatorAddress, amount, message, transactionHash, token, currency } = req.body;
      const { walletAddress: fromAddress } = req.user as { walletAddress: string };

      // Validate input
      if (!postId || !creatorAddress || !amount) {
        return res.status(400).json({ error: 'Missing required fields: postId, creatorAddress, amount' });
      }

      const tokenSymbol = token || currency || 'LDAO';

      if (parseFloat(amount) <= 0) {
        return res.status(400).json({ error: 'Tip amount must be greater than 0' });
      }

      // Resolve user IDs
      const fromUser = await tipService.getUserByWalletAddress(fromAddress);
      const toUser = await tipService.getUserByWalletAddress(creatorAddress);

      if (!fromUser || !toUser) {
        safeLogger.warn('User lookup failed:', { fromAddress, creatorAddress, fromUserFound: !!fromUser, toUserFound: !!toUser });
        return res.status(404).json({ error: 'User not found. Ensure both sender and recipient have profiles.' });
      }

      // Save the tip to the database
      const newTip = await tipService.recordTip(
        postId,
        fromUser.id,
        toUser.id,
        amount.toString(),
        tokenSymbol,
        message,
        transactionHash
      );

      safeLogger.info('Tip recorded:', newTip);

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
          chainId: 11155111, // ETH Sepolia
          verifyingContract: process.env.TIP_ROUTER_ADDRESS || '0x4200000000000000000000000000000000000006',
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
          id: newTip.id.toString(), // Convert number to string for frontend
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
      const { id: userIdOrAddress } = req.params;
      let targetUserId = userIdOrAddress;

      safeLogger.info('Getting earnings for user identifier:', userIdOrAddress);

      // Check if the identifier is a wallet address
      if (userIdOrAddress.toLowerCase().startsWith('0x')) {
        const user = await tipService.getUserByWalletAddress(userIdOrAddress);
        if (!user) {
          safeLogger.warn('User not found for address:', userIdOrAddress);
          return res.status(404).json({ error: 'User not found' });
        }
        targetUserId = user.id;
        safeLogger.info(`Resolved wallet ${userIdOrAddress} to user ID ${targetUserId}`);
      }

      // Query the database for tips received by this user
      const totalEarned = await tipService.getTotalTipsReceived(targetUserId);
      const totalGiven = await tipService.getTotalTipsSent(targetUserId);

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
      safeLogger.info('Fetching tips for post:', postId);

      const rawTips = await tipService.getTipsForPost(postId);
      safeLogger.info(`Found ${rawTips.length} tips for post ${postId}`);

      const tips = rawTips.map(tip => ({
        id: tip.id.toString(),
        from: tip.tipperWallet || 'Unknown',
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
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const user = await tipService.getUserByWalletAddress(address);
      if (!user) {
        return res.json({ success: true, tips: [] });
      }

      const tips = await tipService.getReceivedTips(user.id, limit, offset);
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
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const user = await tipService.getUserByWalletAddress(address);
      if (!user) {
        return res.json({ success: true, tips: [] });
      }

      const tips = await tipService.getSentTips(user.id, limit, offset);
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
      safeLogger.info('Getting total tips for address:', address);

      const user = await tipService.getUserByWalletAddress(address);
      if (!user) {
        safeLogger.warn('User not found for address:', address);
        return res.json({
          success: true,
          totals: { LDAO: '0', USDC: '0', USDT: '0' }
        });
      }

      const totalReceived = await tipService.getTotalTipsReceived(user.id);

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
