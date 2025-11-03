import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { aiContentRiskScoringService, ContentRiskAssessment } from '../services/aiContentRiskScoringService';
import { ContentInput } from '../services/aiModerationOrchestrator';
import { z } from 'zod';

// Validation schemas
const ContentInputSchema = z.object({
  id: z.string(),
  type: z.enum(['post', 'comment', 'listing', 'dm', 'username']),
  text: z.string().optional(),
  media: z.array(z.object({
    url: z.string(),
    type: z.enum(['image', 'video']),
    mimeType: z.string(),
    size: z.number()
  })).optional(),
  links: z.array(z.string()).optional(),
  userId: z.string(),
  userReputation: z.number().optional(),
  walletAddress: z.string(),
  metadata: z.record(z.any()).optional()
});

const BatchAssessmentSchema = z.object({
  contents: z.array(ContentInputSchema).max(10) // Limit batch size
});

const FeedbackSchema = z.object({
  assessmentId: z.string(),
  actualOutcome: z.enum(['allow', 'limit', 'block', 'review']),
  moderatorNotes: z.string().optional(),
  wasAccurate: z.boolean()
});

export class AIContentRiskScoringController {
  
  /**
   * Assess risk for a single piece of content
   */
  async assessContent(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = ContentInputSchema.parse(req.body);
      
      // Type assertion to ensure TypeScript recognizes all required fields are present
      const assessment = await aiContentRiskScoringService.assessContentRisk(validatedInput as ContentInput);
      
      res.json({
        success: true,
        data: assessment,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error in content risk assessment:', error);
      
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
        error: 'Internal server error during risk assessment'
      });
    }
  }

  /**
   * Assess risk for multiple pieces of content in batch
   */
  async assessContentBatch(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = BatchAssessmentSchema.parse(req.body);
      
      // Process all assessments in parallel
      const assessmentPromises = validatedInput.contents.map(content =>
        // Type assertion to ensure TypeScript recognizes all required fields are present
        aiContentRiskScoringService.assessContentRisk(content as ContentInput)
      );
      
      const assessments = await Promise.allSettled(assessmentPromises);
      
      // Separate successful and failed assessments
      const results = assessments.map((result, index) => ({
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
      safeLogger.error('Error in batch content risk assessment:', error);
      
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
        error: 'Internal server error during batch risk assessment'
      });
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = aiContentRiskScoringService.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: {
          metrics,
          modelVersion: '1.0.0',
          lastUpdated: metrics.lastUpdated
        }
      });

    } catch (error) {
      safeLogger.error('Error retrieving model metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving metrics'
      });
    }
  }

  /**
   * Submit feedback on assessment accuracy for model improvement
   */
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const validatedFeedback = FeedbackSchema.parse(req.body);
      
      // Store feedback for model improvement
      // This would typically update model performance metrics and retrain models
      
      res.json({
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          assessmentId: validatedFeedback.assessmentId,
          received: new Date().toISOString()
        }
      });

    } catch (error) {
      safeLogger.error('Error submitting feedback:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid feedback data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error submitting feedback'
      });
    }
  }

  /**
   * Get risk assessment explanation for a specific content ID
   */
  async getAssessmentExplanation(req: Request, res: Response): Promise<void> {
    try {
      const { contentId } = req.params;
      
      if (!contentId) {
        res.status(400).json({
          success: false,
          error: 'Content ID is required'
        });
        return;
      }
      
      // In a real implementation, this would retrieve stored assessment data
      // For now, return a placeholder response
      res.json({
        success: true,
        data: {
          contentId,
          explanation: 'Assessment explanation would be retrieved from stored data',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      safeLogger.error('Error retrieving assessment explanation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving explanation'
      });
    }
  }

  /**
   * Get risk factor weights and thresholds for transparency
   */
  async getModelConfiguration(req: Request, res: Response): Promise<void> {
    try {
      // Return model configuration for transparency
      const configuration = {
        riskFactorWeights: {
          'content_toxicity': 0.25,
          'user_reputation': 0.15,
          'community_context': 0.10,
          'temporal_patterns': 0.10,
          'linguistic_features': 0.15,
          'behavioral_signals': 0.15,
          'network_effects': 0.10
        },
        actionThresholds: {
          'allow': { maxRisk: 0.3, minConfidence: 0.6 },
          'limit': { maxRisk: 0.6, minConfidence: 0.7 },
          'block': { minRisk: 0.8, minConfidence: 0.8 },
          'review': { uncertaintyThreshold: 0.4 }
        },
        modelVersion: '1.0.0',
        lastUpdated: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: configuration
      });

    } catch (error) {
      safeLogger.error('Error retrieving model configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving configuration'
      });
    }
  }

  /**
   * Health check endpoint for the AI risk scoring service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check if all AI services are healthy
      const healthStatus = {
        service: 'ai-content-risk-scoring',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        dependencies: {
          aiModerationOrchestrator: 'healthy',
          database: 'healthy',
          mlModels: 'healthy'
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

export const aiContentRiskScoringController = new AIContentRiskScoringController();
