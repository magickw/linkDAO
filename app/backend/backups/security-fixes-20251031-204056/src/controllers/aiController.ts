import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { AIService } from '../services/aiService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { AppError, ValidationError } from '../middleware/errorHandler';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

const aiService = new AIService();

export class AIController {
  /**
   * Analyze a marketplace listing for prohibited content
   */
  async analyzeListing(req: Request, res: Response): Promise<Response> {
    try {
      const { listingId } = req.params;
      
      if (!listingId) {
        throw new ValidationError('Listing ID is required');
      }
      
      const result = await aiService.analyzeListing(listingId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, 500, 'AI_ANALYSIS_ERROR');
    }
  }

  /**
   * Assist with dispute resolution
   */
  async assistDisputeResolution(req: Request, res: Response): Promise<Response> {
    try {
      const { disputeId } = req.params;
      
      if (!disputeId) {
        throw new ValidationError('Dispute ID is required');
      }
      
      const result = await aiService.assistDisputeResolution(disputeId);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, 500, 'AI_DISPUTE_ERROR');
    }
  }

  /**
   * Detect fraudulent patterns in user behavior
   */
  async detectFraud(req: Request, res: Response): Promise<Response> {
    try {
      const { userAddress } = req.params;
      
      if (!userAddress) {
        throw new ValidationError('User address is required');
      }
      
      const result = await aiService.detectFraud(userAddress);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, 500, 'AI_FRAUD_ERROR');
    }
  }

  /**
   * Suggest listing price based on comparable sales
   */
  async suggestPrice(req: Request, res: Response): Promise<Response> {
    try {
      const { itemType, metadataURI } = req.body;
      
      if (!itemType || !metadataURI) {
        throw new ValidationError('Item type and metadata URI are required');
      }
      
      const result = await aiService.suggestPrice(itemType, metadataURI);
      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, 500, 'AI_PRICE_ERROR');
    }
  }

  /**
   * Process pending AI moderation records
   */
  async processPendingModeration(req: Request, res: Response): Promise<Response> {
    try {
      await aiService.processPendingModeration();
      return res.status(200).json({ message: 'Pending moderation processed successfully' });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, 500, 'AI_MODERATION_ERROR');
    }
  }
}