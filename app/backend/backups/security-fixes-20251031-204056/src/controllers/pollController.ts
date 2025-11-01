import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { pollService, CreatePollInput, PollVoteInput } from '../services/pollService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { z } from 'zod';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

// Validation schemas
const createPollSchema = z.object({
  postId: z.number().int().positive(),
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  allowMultiple: z.boolean().optional(),
  tokenWeighted: z.boolean().optional(),
  minTokens: z.number().min(0).optional(),
  expiresAt: z.string().datetime().optional(),
});

const voteOnPollSchema = z.object({
  optionIds: z.array(z.string().uuid()).min(1),
  tokenAmount: z.number().min(0).optional(),
});

export class PollController {
  /**
   * Create a new poll
   */
  async createPoll(req: Request, res: Response): Promise<void> {
    try {
      const validation = createPollSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: 'Invalid input',
          details: 'Validation failed'
        });
        return;
      }

      const { postId, question, options, allowMultiple, tokenWeighted, minTokens, expiresAt } = validation.data;

      // Check if user is authenticated
      if (!req.user?.walletAddress) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const input: CreatePollInput = {
        postId,
        question,
        options,
        allowMultiple,
        tokenWeighted,
        minTokens,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      };

      const pollId = await pollService.createPoll(input);

      res.status(201).json({
        success: true,
        pollId,
        message: 'Poll created successfully'
      });
    } catch (error) {
      safeLogger.error('Error creating poll:', error);
      res.status(500).json({
        error: 'Failed to create poll',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get poll by ID
   */
  async getPoll(req: Request, res: Response): Promise<void> {
    try {
      const { pollId } = req.params;
      
      if (!pollId) {
        res.status(400).json({ error: 'Poll ID is required' });
        return;
      }

      const userId = req.user?.walletAddress;
      const poll = await pollService.getPollById(pollId, userId);

      if (!poll) {
        res.status(404).json({ error: 'Poll not found' });
        return;
      }

      res.json({
        success: true,
        poll
      });
    } catch (error) {
      safeLogger.error('Error fetching poll:', error);
      res.status(500).json({
        error: 'Failed to fetch poll',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get poll by post ID
   */
  async getPollByPost(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const postIdNum = parseInt(postId);
      
      if (!postId || isNaN(postIdNum)) {
        res.status(400).json({ error: 'Valid post ID is required' });
        return;
      }

      const userId = req.user?.walletAddress;
      const poll = await pollService.getPollByPostId(postIdNum, userId);

      if (!poll) {
        res.status(404).json({ error: 'Poll not found for this post' });
        return;
      }

      res.json({
        success: true,
        poll
      });
    } catch (error) {
      safeLogger.error('Error fetching poll by post:', error);
      res.status(500).json({
        error: 'Failed to fetch poll',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Vote on a poll
   */
  async voteOnPoll(req: Request, res: Response): Promise<void> {
    try {
      const { pollId } = req.params;
      const validation = voteOnPollSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          error: 'Invalid input',
          details: 'Validation failed'
        });
        return;
      }

      if (!req.user?.walletAddress) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { optionIds, tokenAmount } = validation.data;

      const input: PollVoteInput = {
        pollId,
        optionIds,
        userId: req.user.walletAddress,
        tokenAmount,
      };

      await pollService.voteOnPoll(input);

      // Return updated poll results
      const updatedPoll = await pollService.getPollById(pollId, req.user.walletAddress);

      res.json({
        success: true,
        message: 'Vote recorded successfully',
        poll: updatedPoll
      });
    } catch (error) {
      safeLogger.error('Error voting on poll:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('already voted')) {
          res.status(409).json({ error: error.message });
          return;
        }
        if (error.message.includes('expired')) {
          res.status(410).json({ error: error.message });
          return;
        }
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message.includes('Invalid') || error.message.includes('not allowed') || error.message.includes('required')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to record vote',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user's voting history
   */
  async getUserVotingHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.walletAddress) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await pollService.getUserVotingHistory(req.user.walletAddress, limit);

      res.json({
        success: true,
        history
      });
    } catch (error) {
      safeLogger.error('Error fetching voting history:', error);
      res.status(500).json({
        error: 'Failed to fetch voting history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get polls expiring soon (admin/moderator endpoint)
   */
  async getExpiringSoonPolls(req: Request, res: Response): Promise<void> {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const polls = await pollService.getExpiringSoonPolls(hours);

      res.json({
        success: true,
        polls,
        count: polls.length
      });
    } catch (error) {
      safeLogger.error('Error fetching expiring polls:', error);
      res.status(500).json({
        error: 'Failed to fetch expiring polls',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a poll (admin/moderator endpoint)
   */
  async deletePoll(req: Request, res: Response): Promise<void> {
    try {
      const { pollId } = req.params;
      
      if (!pollId) {
        res.status(400).json({ error: 'Poll ID is required' });
        return;
      }

      // TODO: Add admin/moderator permission check
      if (!req.user?.walletAddress) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      await pollService.deletePoll(pollId);

      res.json({
        success: true,
        message: 'Poll deleted successfully'
      });
    } catch (error) {
      safeLogger.error('Error deleting poll:', error);
      res.status(500).json({
        error: 'Failed to delete poll',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update poll expiration (admin/moderator endpoint)
   */
  async updatePollExpiration(req: Request, res: Response): Promise<void> {
    try {
      const { pollId } = req.params;
      const { expiresAt } = req.body;
      
      if (!pollId) {
        res.status(400).json({ error: 'Poll ID is required' });
        return;
      }

      // TODO: Add admin/moderator permission check
      if (!req.user?.walletAddress) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const expirationDate = expiresAt ? new Date(expiresAt) : null;
      await pollService.updatePollExpiration(pollId, expirationDate);

      res.json({
        success: true,
        message: 'Poll expiration updated successfully'
      });
    } catch (error) {
      safeLogger.error('Error updating poll expiration:', error);
      res.status(500).json({
        error: 'Failed to update poll expiration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const pollController = new PollController();