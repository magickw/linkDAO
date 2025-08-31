import { Request, Response } from 'express';
import { CustomScamDetectionService, ContentInput } from '../services/customScamDetectionService';
import { logger } from '../utils/logger';

export class CustomScamDetectionController {
  private scamDetectionService: CustomScamDetectionService;

  constructor() {
    this.scamDetectionService = new CustomScamDetectionService();
  }

  /**
   * Analyze content for scam patterns
   */
  async analyzeContent(req: Request, res: Response): Promise<void> {
    try {
      const { text, title, metadata, userProfile } = req.body;

      if (!text && !title) {
        res.status(400).json({
          error: 'Content text or title is required'
        });
        return;
      }

      const contentInput: ContentInput = {
        text,
        title,
        metadata,
        userProfile
      };

      const result = await this.scamDetectionService.analyzeContent(contentInput);

      logger.info('Scam detection analysis completed', {
        contentId: metadata?.contentId,
        isScam: result.isScam,
        confidence: result.confidence,
        patterns: result.patterns
      });

      res.json({
        success: true,
        result
      });
    } catch (error) {
      logger.error('Error in scam detection analysis', { error });
      res.status(500).json({
        error: 'Internal server error during scam detection analysis'
      });
    }
  }

  /**
   * Batch analyze multiple content items
   */
  async batchAnalyze(req: Request, res: Response): Promise<void> {
    try {
      const { contents } = req.body;

      if (!Array.isArray(contents) || contents.length === 0) {
        res.status(400).json({
          error: 'Contents array is required and must not be empty'
        });
        return;
      }

      if (contents.length > 100) {
        res.status(400).json({
          error: 'Maximum 100 contents can be analyzed in a single batch'
        });
        return;
      }

      const results = await Promise.all(
        contents.map(async (content: ContentInput, index: number) => {
          try {
            const result = await this.scamDetectionService.analyzeContent(content);
            return {
              index,
              contentId: content.metadata?.contentId,
              result,
              success: true
            };
          } catch (error) {
            logger.error('Error analyzing content in batch', { index, error });
            return {
              index,
              contentId: content.metadata?.contentId,
              error: 'Analysis failed',
              success: false
            };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;
      const scamCount = results.filter(r => r.success && r.result?.isScam).length;

      logger.info('Batch scam detection completed', {
        totalContents: contents.length,
        successCount,
        scamCount
      });

      res.json({
        success: true,
        results,
        summary: {
          total: contents.length,
          analyzed: successCount,
          scamsDetected: scamCount,
          errors: contents.length - successCount
        }
      });
    } catch (error) {
      logger.error('Error in batch scam detection', { error });
      res.status(500).json({
        error: 'Internal server error during batch scam detection'
      });
    }
  }

  /**
   * Get scam detection statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      // This would typically query the database for statistics
      // For now, returning mock statistics
      const stats = {
        totalAnalyzed: 0,
        scamsDetected: 0,
        patternBreakdown: {
          seed_phrase: 0,
          crypto_scam: 0,
          impersonation: 0,
          market_manipulation: 0,
          phishing: 0
        },
        averageConfidence: 0,
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      logger.error('Error getting scam detection statistics', { error });
      res.status(500).json({
        error: 'Internal server error getting statistics'
      });
    }
  }

  /**
   * Health check for scam detection service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Test with a simple non-scam content
      const testContent: ContentInput = {
        text: 'This is a test message for health check',
        metadata: { contentId: 'health-check' }
      };

      const result = await this.scamDetectionService.analyzeContent(testContent);

      res.json({
        success: true,
        status: 'healthy',
        testResult: {
          analyzed: true,
          isScam: result.isScam,
          confidence: result.confidence
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: 'Service health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
}