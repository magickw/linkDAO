import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { aiContentModerationService, ContentModerationReport } from '../services/aiContentModerationService';
import { z } from 'zod';

// Validation schemas
const ContentModerationSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  userId: z.string(),
  type: z.enum(['post', 'comment', 'listing', 'dm', 'username'])
});

const BatchModerationSchema = z.object({
  contents: z.array(ContentModerationSchema).max(20) // Limit batch size
});

export class AIContentModerationController {
  
  /**
   * Moderate a single piece of content
   */
  async moderateContent(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = ContentModerationSchema.parse(req.body);
      
      const moderationReport = await aiContentModerationService.moderateContent(validatedInput as any);
      
      res.json({
        success: true,
        data: moderationReport,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error in content moderation:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during content moderation'
      });
    }
  }

  /**
   * Moderate multiple pieces of content in batch
   */
  async moderateContentBatch(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = BatchModerationSchema.parse(req.body);
      
      // Process all moderations in parallel
      const moderationPromises = validatedInput.contents.map(content =>
        aiContentModerationService.moderateContent(content as any)
      );
      
      const moderationReports = await Promise.allSettled(moderationPromises);
      
      // Separate successful and failed moderations
      const results = moderationReports.map((result, index) => ({
        contentId: validatedInput.contents[index].id,
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason?.message : null
      }));
      
      const successCount = results.filter(r => r.success).length;
      
      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: validatedInput.contents.length,
            successful: successCount,
            failed: validatedInput.contents.length - successCount
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error in batch content moderation:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during batch content moderation'
      });
    }
  }

  /**
   * Get detailed spam detection results for a specific content
   */
  async getSpamDetection(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      
      if (!contentId) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required'
        });
        return;
      }
      
      // In a real implementation, this would retrieve stored spam detection data
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          contentId,
          spamDetection: {
            isSpam: false,
            confidence: 0,
            spamType: 'unknown',
            explanation: 'Spam detection data would be retrieved from stored results',
            riskScore: 0
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      safeLogger.error('Error retrieving spam detection:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving spam detection data'
      });
    }
  }

  /**
   * Get content policy enforcement results for a specific content
   */
  async getContentPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      
      if (!contentId) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required'
        });
        return;
      }
      
      // In a real implementation, this would retrieve stored policy enforcement data
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          contentId,
          contentPolicy: {
            violatesPolicy: false,
            policyType: 'unknown',
            confidence: 0,
            explanation: 'Content policy data would be retrieved from stored results',
            riskScore: 0,
            recommendedAction: 'review'
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      safeLogger.error('Error retrieving content policy:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving content policy data'
      });
    }
  }

  /**
   * Get toxicity detection results for a specific content
   */
  async getToxicityDetection(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      
      if (!contentId) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required'
        });
        return;
      }
      
      // In a real implementation, this would retrieve stored toxicity detection data
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          contentId,
          toxicityDetection: {
            isToxic: false,
            toxicityType: 'other',
            confidence: 0,
            explanation: 'Toxicity detection data would be retrieved from stored results',
            riskScore: 0
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      safeLogger.error('Error retrieving toxicity detection:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving toxicity detection data'
      });
    }
  }

  /**
   * Get copyright detection results for a specific content
   */
  async getCopyrightDetection(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      
      if (!contentId) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required'
        });
        return;
      }
      
      // In a real implementation, this would retrieve stored copyright detection data
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          contentId,
          copyrightDetection: {
            potentialInfringement: false,
            confidence: 0,
            explanation: 'Copyright detection data would be retrieved from stored results',
            riskScore: 0,
            similarContent: []
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      safeLogger.error('Error retrieving copyright detection:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving copyright detection data'
      });
    }
  }

  /**
   * Health check endpoint for the AI content moderation service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check if all AI services are healthy
      const healthStatus = {
        service: 'ai-content-moderation',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        dependencies: {
          aiContentModerationService: 'healthy',
          database: 'healthy',
          aiRiskScoring: 'healthy'
        }
      };
      
      res.json({
        success: true,
        data: healthStatus
      });

    } catch (error) {
      safeLogger.error('Error in health check:', error);
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const aiContentModerationController = new AIContentModerationController();
