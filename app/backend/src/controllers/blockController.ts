import { Request, Response } from 'express';
import { BlockService } from '../services/blockService';
import { sanitizeWalletAddress } from '../utils/inputSanitization';

const blockService = new BlockService();

export class BlockController {
  async blockUser(req: Request, res: Response): Promise<void> {
    try {
      const { blocker, blocked } = req.body;

      if (!blocker || !blocked) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Both blocker and blocked addresses are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate and sanitize wallet addresses
      const sanitizedBlocker = sanitizeWalletAddress(blocker);
      const sanitizedBlocked = sanitizeWalletAddress(blocked);

      if (sanitizedBlocker === sanitizedBlocked) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Cannot block yourself',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await blockService.blockUser(sanitizedBlocker, sanitizedBlocked);

      if (result) {
        res.status(201).json({ message: 'Successfully blocked user' });
      } else {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'User already blocked',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error in blockUser:', error);
      res.status(500).json({
        error: 'BLOCK_ERROR',
        message: error.message || 'Failed to block user',
        timestamp: new Date().toISOString()
      });
    }
  }

  async unblockUser(req: Request, res: Response): Promise<void> {
    try {
      const { blocker, blocked } = req.body;

      if (!blocker || !blocked) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Both blocker and blocked addresses are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate and sanitize wallet addresses
      const sanitizedBlocker = sanitizeWalletAddress(blocker);
      const sanitizedBlocked = sanitizeWalletAddress(blocked);

      const result = await blockService.unblockUser(sanitizedBlocker, sanitizedBlocked);

      if (result) {
        res.json({ message: 'Successfully unblocked user' });
      } else {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'User not blocked',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error in unblockUser:', error);
      res.status(500).json({
        error: 'UNBLOCK_ERROR',
        message: error.message || 'Failed to unblock user',
        timestamp: new Date().toISOString()
      });
    }
  }

  async isBlocked(req: Request, res: Response): Promise<void> {
    try {
      const { blocker, blocked } = req.params;
      const sanitizedBlocker = sanitizeWalletAddress(blocker);
      const sanitizedBlocked = sanitizeWalletAddress(blocked);
      const isBlocked = await blockService.isBlocked(sanitizedBlocker, sanitizedBlocked);
      res.json({ isBlocked });
    } catch (error: any) {
      console.error('Error in isBlocked:', error);
      res.status(500).json({
        error: 'IS_BLOCKED_ERROR',
        message: error.message || 'Failed to check block status',
        timestamp: new Date().toISOString()
      });
    }
  }

  async getBlockedUsers(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const sanitizedAddress = sanitizeWalletAddress(address);
      const blockedUsers = await blockService.getBlockedUsers(sanitizedAddress);
      res.json(blockedUsers);
    } catch (error: any) {
      console.error('Error in getBlockedUsers:', error);
      res.status(500).json({
        error: 'BLOCKED_USERS_ERROR',
        message: error.message || 'Failed to get blocked users',
        timestamp: new Date().toISOString()
      });
    }
  }

  async getBlockedBy(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const sanitizedAddress = sanitizeWalletAddress(address);
      const blockedBy = await blockService.getBlockedBy(sanitizedAddress);
      res.json(blockedBy);
    } catch (error: any) {
      console.error('Error in getBlockedBy:', error);
      res.status(500).json({
        error: 'BLOCKED_BY_ERROR',
        message: error.message || 'Failed to get blocked by users',
        timestamp: new Date().toISOString()
      });
    }
  }
}
