import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { similarCaseMatchingService } from '../services/similarCaseMatchingService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { z } from 'zod';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

// Validation schemas
const FindSimilarCasesSchema = z.object({
  caseId: z.string(),
  limit: z.number().min(1).max(50).optional().default(10),
  similarityThreshold: z.number().min(0).max(1).optional().default(0.7),
  includeFeatures: z.boolean().optional().default(false)
});

const ConsistencyAnalysisSchema = z.object({
  timeRange: z.number().min(1).max(365).optional().default(30), // days
  includePatterns: z.boolean().optional().default(true),
  includeModerators: z.boolean().optional().default(true)
});

const DecisionRecommendationSchema = z.object({
  caseId: z.string(),
  includeReasoning: z.boolean().optional().default(true),
  maxPrecedents: z.number().min(1).max(10).optional().default(5)
});

const PrecedentSearchSchema = z.object({
  pattern: z.string().optional(),
  contentType: z.string().optional(),
  outcome: z.string().optional(),
  minConsistency: z.number().min(0).max(1).optional().default(0.7),
  limit: z.number().min(1).max(100).optional().default(20)
});

export class SimilarCaseMatchingController {

  /**
   * Find similar cases for a given moderation case
   */
  async findSimilarCases(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = FindSimilarCasesSchema.parse(req.body);
      
      const similarCases = await similarCaseMatchingService.findSimilarCases(
        validatedInput.caseId,
        validatedInput.limit
      );
      
      // Filter by similarity threshold if specified
      const filteredCases = similarCases.filter(
        case_ => case_.similarity >= validatedInput.similarityThreshold
      );
      
      // Remove features if not requested to reduce response size
      const responseCases = validatedInput.includeFeatures 
        ? filteredCases 
        : filteredCases.map(case_ => {
            const { features, ...caseWithoutFeatures } = case_;
            return caseWithoutFeatures;
          });

      res.json({
        success: true,
        data: {
          targetCaseId: validatedInput.caseId,
          similarCases: responseCases,
          analysis: {
            totalFound: similarCases.length,
            aboveThreshold: filteredCases.length,
            averageSimilarity: filteredCases.reduce((sum, c) => sum + c.similarity, 0) / filteredCases.length,
            outcomeDistribution: this.analyzeOutcomeDistribution(filteredCases)
          },
          parameters: {
            limit: validatedInput.limit,
            similarityThreshold: validatedInput.similarityThreshold
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error finding similar cases:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error finding similar cases'
      });
    }
  }

  /**
   * Build and retrieve case precedent database
   */
  async buildPrecedentDatabase(req: Request, res: Response): Promise<void> {
    try {
      const precedents = await similarCaseMatchingService.buildPrecedentDatabase();
      
      res.json({
        success: true,
        data: {
          precedents,
          summary: {
            totalPrecedents: precedents.length,
            averageConsistency: precedents.reduce((sum, p) => sum + p.consistency, 0) / precedents.length,
            highConfidencePrecedents: precedents.filter(p => p.confidence > 0.8).length,
            patternCoverage: this.analyzePrecedentCoverage(precedents)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error building precedent database:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error building precedent database'
      });
    }
  }

  /**
   * Analyze decision consistency across similar cases
   */
  async analyzeConsistency(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = ConsistencyAnalysisSchema.parse(req.query);
      
      const consistencyAnalysis = await similarCaseMatchingService.analyzeConsistency(
        validatedInput.timeRange
      );
      
      // Filter analysis based on request parameters
      const filteredAnalysis = {
        overallConsistency: consistencyAnalysis.overallConsistency,
        patternConsistency: validatedInput.includePatterns ? consistencyAnalysis.patternConsistency : [],
        moderatorConsistency: validatedInput.includeModerators ? consistencyAnalysis.moderatorConsistency : [],
        recommendations: consistencyAnalysis.recommendations
      };

      res.json({
        success: true,
        data: {
          analysis: filteredAnalysis,
          insights: {
            consistencyGrade: this.calculateConsistencyGrade(consistencyAnalysis.overallConsistency),
            topInconsistentPatterns: consistencyAnalysis.patternConsistency
              .filter(p => p.consistency < 0.7)
              .sort((a, b) => a.consistency - b.consistency)
              .slice(0, 5),
            moderatorPerformance: this.analyzeModeratorsPerformance(consistencyAnalysis.moderatorConsistency),
            timeRange: validatedInput.timeRange
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error analyzing consistency:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid analysis parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error analyzing consistency'
      });
    }
  }

  /**
   * Get decision recommendation based on similar cases and precedents
   */
  async getDecisionRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = DecisionRecommendationSchema.parse(req.body);
      
      const recommendation = await similarCaseMatchingService.getDecisionRecommendation(
        validatedInput.caseId
      );
      
      // Limit precedents if requested
      const limitedRecommendation = {
        ...recommendation,
        precedents: recommendation.precedents.slice(0, validatedInput.maxPrecedents)
      };

      res.json({
        success: true,
        data: {
          caseId: validatedInput.caseId,
          recommendation: limitedRecommendation,
          analysis: {
            confidenceLevel: this.categorizeConfidence(recommendation.confidence),
            riskAssessment: this.assessRecommendationRisk(recommendation),
            alternativeOutcomes: this.suggestAlternatives(recommendation)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error generating decision recommendation:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid recommendation parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error generating recommendation'
      });
    }
  }

  /**
   * Search precedents by pattern or criteria
   */
  async searchPrecedents(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = PrecedentSearchSchema.parse(req.query);
      
      // Build precedent database (in practice, this would be cached)
      const allPrecedents = await similarCaseMatchingService.buildPrecedentDatabase();
      
      // Filter precedents based on search criteria
      let filteredPrecedents = allPrecedents.filter(p => p.consistency >= validatedInput.minConsistency);
      
      if (validatedInput.pattern) {
        filteredPrecedents = filteredPrecedents.filter(p => 
          p.pattern.includes(validatedInput.pattern!) || 
          p.applicability.some(a => a.includes(validatedInput.pattern!))
        );
      }
      
      if (validatedInput.outcome) {
        filteredPrecedents = filteredPrecedents.filter(p =>
          p.outcomes.some(o => o.outcome === validatedInput.outcome)
        );
      }
      
      // Limit results
      const limitedPrecedents = filteredPrecedents.slice(0, validatedInput.limit);

      res.json({
        success: true,
        data: {
          precedents: limitedPrecedents,
          searchCriteria: validatedInput,
          results: {
            totalFound: filteredPrecedents.length,
            returned: limitedPrecedents.length,
            averageConsistency: limitedPrecedents.reduce((sum, p) => sum + p.consistency, 0) / limitedPrecedents.length,
            patternDistribution: this.analyzePrecedentPatterns(limitedPrecedents)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error searching precedents:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid search parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error searching precedents'
      });
    }
  }

  /**
   * Get case pattern analysis for understanding decision patterns
   */
  async analyzePatterns(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = 30 } = req.query;
      
      const consistencyAnalysis = await similarCaseMatchingService.analyzeConsistency(Number(timeRange));
      
      const patternAnalysis = {
        patterns: consistencyAnalysis.patternConsistency,
        insights: {
          mostConsistentPatterns: consistencyAnalysis.patternConsistency
            .sort((a, b) => b.consistency - a.consistency)
            .slice(0, 5),
          leastConsistentPatterns: consistencyAnalysis.patternConsistency
            .sort((a, b) => a.consistency - b.consistency)
            .slice(0, 5),
          patternComplexity: this.analyzePatternComplexity(consistencyAnalysis.patternConsistency),
          emergingPatterns: this.identifyEmergingPatterns(consistencyAnalysis.patternConsistency)
        }
      };

      res.json({
        success: true,
        data: patternAnalysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error analyzing patterns:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error analyzing patterns'
      });
    }
  }

  /**
   * Get moderation decision pattern analysis
   */
  async getModerationPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { moderatorId, timeRange = 30 } = req.query;
      
      const consistencyAnalysis = await similarCaseMatchingService.analyzeConsistency(Number(timeRange));
      
      let moderatorAnalysis = consistencyAnalysis.moderatorConsistency;
      
      // Filter by specific moderator if requested
      if (moderatorId) {
        moderatorAnalysis = moderatorAnalysis.filter(m => m.moderatorId === moderatorId);
      }

      res.json({
        success: true,
        data: {
          moderators: moderatorAnalysis,
          teamInsights: {
            averageConsistency: moderatorAnalysis.reduce((sum, m) => sum + m.consistency, 0) / moderatorAnalysis.length,
            topPerformers: moderatorAnalysis
              .sort((a, b) => b.consistency - a.consistency)
              .slice(0, 5),
            improvementOpportunities: moderatorAnalysis
              .filter(m => m.consistency < 0.7)
              .map(m => ({
                moderatorId: m.moderatorId,
                consistency: m.consistency,
                recommendedActions: this.generateModeratorRecommendations(m)
              }))
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error analyzing moderation patterns:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error analyzing moderation patterns'
      });
    }
  }

  // Helper methods for analysis and insights

  private analyzeOutcomeDistribution(cases: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    cases.forEach(case_ => {
      const outcome = case_.outcome || 'unknown';
      distribution[outcome] = (distribution[outcome] || 0) + 1;
    });
    
    // Convert to percentages
    const total = cases.length;
    Object.keys(distribution).forEach(outcome => {
      distribution[outcome] = (distribution[outcome] / total) * 100;
    });
    
    return distribution;
  }

  private analyzePrecedentCoverage(precedents: any[]): any {
    const patterns = new Set(precedents.map(p => p.pattern));
    const outcomes = new Set(precedents.flatMap(p => p.outcomes.map((o: any) => o.outcome)));
    
    return {
      uniquePatterns: patterns.size,
      uniqueOutcomes: outcomes.size,
      averageCasesPerPrecedent: precedents.reduce((sum, p) => sum + p.caseIds.length, 0) / precedents.length
    };
  }

  private calculateConsistencyGrade(consistency: number): string {
    if (consistency >= 0.95) return 'Excellent';
    if (consistency >= 0.90) return 'Very Good';
    if (consistency >= 0.80) return 'Good';
    if (consistency >= 0.70) return 'Fair';
    if (consistency >= 0.60) return 'Poor';
    return 'Very Poor';
  }

  private analyzeModeratorsPerformance(moderators: any[]): any {
    return {
      totalModerators: moderators.length,
      averageConsistency: moderators.reduce((sum, m) => sum + m.consistency, 0) / moderators.length,
      highPerformers: moderators.filter(m => m.consistency > 0.85).length,
      needsImprovement: moderators.filter(m => m.consistency < 0.70).length
    };
  }

  private categorizeConfidence(confidence: number): string {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.7) return 'Medium';
    if (confidence >= 0.6) return 'Low';
    return 'Very Low';
  }

  private assessRecommendationRisk(recommendation: any): any {
    const riskLevel = recommendation.riskFactors.length > recommendation.mitigatingFactors.length ? 'High' : 'Low';
    
    return {
      level: riskLevel,
      factors: {
        risk: recommendation.riskFactors.length,
        mitigating: recommendation.mitigatingFactors.length
      },
      confidence: recommendation.confidence
    };
  }

  private suggestAlternatives(recommendation: any): any[] {
    // Generate alternative outcomes based on precedents
    const alternatives = ['allow', 'limit', 'block', 'review']
      .filter(outcome => outcome !== recommendation.recommendedOutcome)
      .map(outcome => ({
        outcome,
        likelihood: Math.random() * 0.3, // Mock likelihood
        reasoning: `Alternative based on ${outcome} precedents`
      }));
    
    return alternatives.sort((a, b) => b.likelihood - a.likelihood).slice(0, 2);
  }

  private analyzePrecedentPatterns(precedents: any[]): Record<string, number> {
    const patterns: Record<string, number> = {};
    
    precedents.forEach(p => {
      patterns[p.pattern] = (patterns[p.pattern] || 0) + 1;
    });
    
    return patterns;
  }

  private analyzePatternComplexity(patterns: any[]): any {
    return {
      simplePatterns: patterns.filter(p => p.caseCount < 10).length,
      complexPatterns: patterns.filter(p => p.caseCount >= 10).length,
      averageCasesPerPattern: patterns.reduce((sum, p) => sum + p.caseCount, 0) / patterns.length
    };
  }

  private identifyEmergingPatterns(patterns: any[]): any[] {
    // Identify patterns with low case count but high consistency (emerging patterns)
    return patterns
      .filter(p => p.caseCount < 5 && p.consistency > 0.8)
      .map(p => ({
        pattern: p.pattern,
        consistency: p.consistency,
        caseCount: p.caseCount,
        status: 'emerging'
      }));
  }

  private generateModeratorRecommendations(moderator: any): string[] {
    const recommendations: string[] = [];
    
    if (moderator.consistency < 0.7) {
      recommendations.push('Review decision patterns with supervisor');
    }
    
    if (moderator.agreementRate < 0.8) {
      recommendations.push('Participate in peer review sessions');
    }
    
    if (moderator.caseCount < 10) {
      recommendations.push('Gain more experience with guided cases');
    }
    
    return recommendations;
  }
}

export const similarCaseMatchingController = new SimilarCaseMatchingController();