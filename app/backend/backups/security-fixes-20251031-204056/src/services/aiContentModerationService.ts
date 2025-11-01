import { databaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { moderationCases, contentReports } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, gte, desc } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { aiContentRiskScoringService } from './aiContentRiskScoringService';
import { safeLogger } from '../utils/safeLogger';

export interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number;
  spamType: 'repetitive' | 'promotional' | 'irrelevant' | 'bot_behavior' | 'other';
  explanation: string;
  riskScore: number;
}

export interface ContentPolicyResult {
  violatesPolicy: boolean;
  policyType: string;
  confidence: number;
  explanation: string;
  riskScore: number;
  recommendedAction: 'allow' | 'limit' | 'block' | 'review';
}

export interface ToxicityDetectionResult {
  isToxic: boolean;
  toxicityType: 'hate_speech' | 'harassment' | 'violence' | 'profanity' | 'other';
  confidence: number;
  explanation: string;
  riskScore: number;
}

export interface CopyrightDetectionResult {
  potentialInfringement: boolean;
  confidence: number;
  explanation: string;
  riskScore: number;
  similarContent: Array<{
    source: string;
    similarity: number;
    contentPreview: string;
  }>;
}

export interface ContentModerationReport {
  contentId: string;
  overallRiskScore: number;
  spamDetection: SpamDetectionResult;
  contentPolicy: ContentPolicyResult;
  toxicityDetection: ToxicityDetectionResult;
  copyrightDetection: CopyrightDetectionResult;
  recommendedAction: 'allow' | 'limit' | 'block' | 'review';
  explanation: string;
  timestamp: Date;
}

export class AIContentModerationService {
  /**
   * Detect spam content using pattern analysis and behavioral signals
   */
  async detectSpam(content: { id: string; text?: string; userId: string; type: string }): Promise<SpamDetectionResult> {
    try {
      const db = databaseService.getDatabase();
      
      // Get user's recent activity
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentPosts = await db
        .select()
        .from(moderationCases)
        .where(
          and(
            eq(moderationCases.userId, content.userId),
            gte(moderationCases.createdAt, oneHourAgo)
          )
        );

      // Check for repetitive posting patterns
      const repetitivePattern = this.checkRepetitivePatterns(content, recentPosts);
      if (repetitivePattern.isSpam) {
        return repetitivePattern;
      }

      // Check for promotional content
      const promotionalContent = this.checkPromotionalContent(content);
      if (promotionalContent.isSpam) {
        return promotionalContent;
      }

      // Check for bot-like behavior
      const botBehavior = this.checkBotBehavior(content, recentPosts);
      if (botBehavior.isSpam) {
        return botBehavior;
      }

      // Default result if no spam detected
      return {
        isSpam: false,
        confidence: 0.1,
        spamType: 'other',
        explanation: 'No spam patterns detected',
        riskScore: 0.1
      };

    } catch (error) {
      safeLogger.error('Error in spam detection:', error);
      return {
        isSpam: false,
        confidence: 0,
        spamType: 'other',
        explanation: 'Error during spam detection',
        riskScore: 0
      };
    }
  }

  /**
   * Enforce content policies using AI analysis
   */
  async enforceContentPolicy(content: { id: string; text?: string; type: string }): Promise<ContentPolicyResult> {
    try {
      // Use existing AI risk scoring service for policy enforcement
      const riskAssessment = await aiContentRiskScoringService.assessContentRisk({
        id: content.id,
        type: content.type as any,
        text: content.text,
        userId: '', // Placeholder, would be passed in real implementation
        userReputation: 0,
        walletAddress: '',
        metadata: {}
      });

      return {
        violatesPolicy: riskAssessment.recommendedAction === 'block' || riskAssessment.recommendedAction === 'limit',
        policyType: riskAssessment.explainabilityData.keyPhrases.join(', ') || 'general',
        confidence: riskAssessment.confidence,
        explanation: riskAssessment.explanation,
        riskScore: riskAssessment.overallRiskScore,
        recommendedAction: riskAssessment.recommendedAction
      };

    } catch (error) {
      safeLogger.error('Error in content policy enforcement:', error);
      return {
        violatesPolicy: false,
        policyType: 'error',
        confidence: 0,
        explanation: 'Error during policy enforcement',
        riskScore: 0,
        recommendedAction: 'review'
      };
    }
  }

  /**
   * Detect toxic content using AI analysis
   */
  async detectToxicity(content: { id: string; text?: string }): Promise<ToxicityDetectionResult> {
    try {
      if (!content.text) {
        return {
          isToxic: false,
          toxicityType: 'other',
          confidence: 0,
          explanation: 'No text content to analyze',
          riskScore: 0
        };
      }

      // Use existing AI risk scoring service for toxicity detection
      const riskAssessment = await aiContentRiskScoringService.assessContentRisk({
        id: content.id,
        type: 'post',
        text: content.text,
        userId: '',
        userReputation: 0,
        walletAddress: '',
        metadata: {}
      });

      // Map risk assessment to toxicity detection result
      let toxicityType: 'hate_speech' | 'harassment' | 'violence' | 'profanity' | 'other' = 'other';
      if (riskAssessment.explainabilityData.keyPhrases.some(phrase => 
        phrase.includes('hate') || phrase.includes('discrimin'))) {
        toxicityType = 'hate_speech';
      } else if (riskAssessment.explainabilityData.keyPhrases.some(phrase => 
        phrase.includes('harass') || phrase.includes('bully'))) {
        toxicityType = 'harassment';
      } else if (riskAssessment.explainabilityData.keyPhrases.some(phrase => 
        phrase.includes('violence') || phrase.includes('threat'))) {
        toxicityType = 'violence';
      }

      return {
        isToxic: riskAssessment.recommendedAction === 'block' || riskAssessment.recommendedAction === 'limit',
        toxicityType,
        confidence: riskAssessment.confidence,
        explanation: riskAssessment.explanation,
        riskScore: riskAssessment.overallRiskScore
      };

    } catch (error) {
      safeLogger.error('Error in toxicity detection:', error);
      return {
        isToxic: false,
        toxicityType: 'other',
        confidence: 0,
        explanation: 'Error during toxicity detection',
        riskScore: 0
      };
    }
  }

  /**
   * Detect potential copyright infringement
   */
  async detectCopyrightInfringement(content: { id: string; text?: string }): Promise<CopyrightDetectionResult> {
    try {
      if (!content.text) {
        return {
          potentialInfringement: false,
          confidence: 0,
          explanation: 'No text content to analyze',
          riskScore: 0,
          similarContent: []
        };
      }

      // Simple heuristic-based copyright detection
      // In a real implementation, this would integrate with content fingerprinting services
      const copyrightPatterns = [
        /©\s*\d{4}/i,
        /all rights reserved/i,
        /trademark/i,
        /registered trademark/i,
        /patent pending/i,
        /patent #/i
      ];

      let infringementScore = 0;
      const detectedPatterns: string[] = [];
      
      for (const pattern of copyrightPatterns) {
        if (pattern.test(content.text)) {
          infringementScore += 0.2;
          detectedPatterns.push(pattern.toString());
        }
      }

      // Check for excessive quoted content (potential reproduction)
      const quotedContent = (content.text.match(/["'][^"']*["']/g) || []).length;
      if (quotedContent > 3) {
        infringementScore += 0.3;
      }

      // Check for known brand names (simplified)
      const brandNames = ['disney', 'netflix', 'spotify', 'microsoft', 'apple', 'google'];
      const textLower = content.text.toLowerCase();
      let brandMatches = 0;
      for (const brand of brandNames) {
        if (textLower.includes(brand)) {
          brandMatches++;
        }
      }
      
      if (brandMatches > 2) {
        infringementScore += 0.2;
      }

      infringementScore = Math.min(1.0, infringementScore);

      return {
        potentialInfringement: infringementScore > 0.5,
        confidence: infringementScore > 0.3 ? 0.8 : 0.3,
        explanation: detectedPatterns.length > 0 
          ? `Detected potential copyright patterns: ${detectedPatterns.join(', ')}`
          : 'No clear copyright patterns detected',
        riskScore: infringementScore,
        similarContent: brandMatches > 0 
          ? [{ source: 'Potential brand references', similarity: brandMatches / brandNames.length, contentPreview: '' }] 
          : []
      };

    } catch (error) {
      safeLogger.error('Error in copyright detection:', error);
      return {
        potentialInfringement: false,
        confidence: 0,
        explanation: 'Error during copyright detection',
        riskScore: 0,
        similarContent: []
      };
    }
  }

  /**
   * Perform comprehensive content moderation analysis
   */
  async moderateContent(content: { id: string; text?: string; userId: string; type: string }): Promise<ContentModerationReport> {
    try {
      // Run all detection methods in parallel
      const [spamResult, policyResult, toxicityResult, copyrightResult] = await Promise.all([
        this.detectSpam(content),
        this.enforceContentPolicy(content),
        this.detectToxicity(content),
        this.detectCopyrightInfringement(content)
      ]);

      // Calculate overall risk score
      const overallRiskScore = Math.max(
        spamResult.riskScore,
        policyResult.riskScore,
        toxicityResult.riskScore,
        copyrightResult.riskScore
      );

      // Determine recommended action based on highest risk
      let recommendedAction: 'allow' | 'limit' | 'block' | 'review' = 'allow';
      if (overallRiskScore > 0.8) {
        recommendedAction = 'block';
      } else if (overallRiskScore > 0.6) {
        recommendedAction = 'limit';
      } else if (overallRiskScore > 0.4) {
        recommendedAction = 'review';
      }

      // Generate explanation
      const explanations: string[] = [];
      if (spamResult.isSpam) explanations.push(`Spam detected (${spamResult.spamType})`);
      if (policyResult.violatesPolicy) explanations.push(`Policy violation (${policyResult.policyType})`);
      if (toxicityResult.isToxic) explanations.push(`Toxic content (${toxicityResult.toxicityType})`);
      if (copyrightResult.potentialInfringement) explanations.push('Potential copyright infringement');

      const explanation = explanations.length > 0 
        ? `Content flagged for: ${explanations.join(', ')}`
        : 'Content passed all moderation checks';

      const report: ContentModerationReport = {
        contentId: content.id,
        overallRiskScore,
        spamDetection: spamResult,
        contentPolicy: policyResult,
        toxicityDetection: toxicityResult,
        copyrightDetection: copyrightResult,
        recommendedAction,
        explanation,
        timestamp: new Date()
      };

      // Store moderation result
      await this.storeModerationResult(content.id, report);

      return report;

    } catch (error) {
      safeLogger.error('Error in content moderation:', error);
      
      // Return safe fallback report
      return {
        contentId: content.id,
        overallRiskScore: 0.5,
        spamDetection: {
          isSpam: false,
          confidence: 0,
          spamType: 'other',
          explanation: 'Error in spam detection',
          riskScore: 0
        },
        contentPolicy: {
          violatesPolicy: false,
          policyType: 'error',
          confidence: 0,
          explanation: 'Error in policy enforcement',
          riskScore: 0,
          recommendedAction: 'review'
        },
        toxicityDetection: {
          isToxic: false,
          toxicityType: 'other',
          confidence: 0,
          explanation: 'Error in toxicity detection',
          riskScore: 0
        },
        copyrightDetection: {
          potentialInfringement: false,
          confidence: 0,
          explanation: 'Error in copyright detection',
          riskScore: 0,
          similarContent: []
        },
        recommendedAction: 'review',
        explanation: 'System error during moderation - manual review required',
        timestamp: new Date()
      };
    }
  }

  /**
   * Check for repetitive posting patterns
   */
  private checkRepetitivePatterns(content: { text?: string }, recentPosts: any[]): SpamDetectionResult {
    if (!content.text || recentPosts.length < 3) {
      return {
        isSpam: false,
        confidence: 0,
        spamType: 'other',
        explanation: 'Insufficient data for repetitive pattern analysis',
        riskScore: 0
      };
    }

    // Check if similar content has been posted recently
    let similarCount = 0;
    const contentWords = content.text.toLowerCase().split(/\s+/);
    
    for (const post of recentPosts) {
      if (post.content && post.content.toLowerCase().includes(content.text.toLowerCase().substring(0, 20))) {
        similarCount++;
      }
    }

    if (similarCount >= 2) {
      return {
        isSpam: true,
        confidence: 0.9,
        spamType: 'repetitive',
        explanation: `Detected ${similarCount} similar posts in the last hour`,
        riskScore: 0.8
      };
    }

    return {
      isSpam: false,
      confidence: 0.1,
      spamType: 'other',
      explanation: 'No repetitive patterns detected',
      riskScore: 0.1
    };
  }

  /**
   * Check for promotional content
   */
  private checkPromotionalContent(content: { text?: string }): SpamDetectionResult {
    if (!content.text) {
      return {
        isSpam: false,
        confidence: 0,
        spamType: 'other',
        explanation: 'No text content to analyze',
        riskScore: 0
      };
    }

    const promotionalKeywords = [
      'buy now', 'limited time', 'discount', 'sale', 'offer', 'free shipping',
      'click here', 'act now', 'don\'t miss', 'exclusive deal', 'best price',
      'guaranteed', 'no risk', 'money back', 'satisfaction guaranteed'
    ];

    const textLower = content.text.toLowerCase();
    let promoCount = 0;
    
    for (const keyword of promotionalKeywords) {
      if (textLower.includes(keyword)) {
        promoCount++;
      }
    }

    if (promoCount >= 3) {
      return {
        isSpam: true,
        confidence: 0.8,
        spamType: 'promotional',
        explanation: `Detected ${promoCount} promotional keywords`,
        riskScore: 0.7
      };
    }

    return {
      isSpam: false,
      confidence: 0.1,
      spamType: 'other',
      explanation: 'No promotional content detected',
      riskScore: 0.1
    };
  }

  /**
   * Check for bot-like behavior
   */
  private checkBotBehavior(content: { text?: string }, recentPosts: any[]): SpamDetectionResult {
    if (recentPosts.length < 5) {
      return {
        isSpam: false,
        confidence: 0,
        spamType: 'other',
        explanation: 'Insufficient data for bot behavior analysis',
        riskScore: 0
      };
    }

    // Check posting frequency
    const timeWindow = 60 * 60 * 1000; // 1 hour
    const postsInWindow = recentPosts.filter(post => 
      Date.now() - post.createdAt.getTime() < timeWindow
    );

    // High frequency posting may indicate bot behavior
    if (postsInWindow.length >= 10) {
      return {
        isSpam: true,
        confidence: 0.85,
        spamType: 'bot_behavior',
        explanation: `High posting frequency: ${postsInWindow.length} posts in the last hour`,
        riskScore: 0.75
      };
    }

    return {
      isSpam: false,
      confidence: 0.1,
      spamType: 'other',
      explanation: 'No bot-like behavior detected',
      riskScore: 0.1
    };
  }

  /**
   * Store moderation result in database
   */
  private async storeModerationResult(contentId: string, report: ContentModerationReport): Promise<void> {
    try {
      const db = databaseService.getDatabase();
      
      // Store in moderation cases table
      await db.insert(moderationCases).values({
        contentId,
        contentType: 'post', // This should be dynamic based on content type
        userId: '', // This should be passed in real implementation
        status: report.recommendedAction === 'block' ? 'blocked' : 
                report.recommendedAction === 'limit' ? 'quarantined' : 
                report.recommendedAction === 'review' ? 'under_review' : 'allowed',
        riskScore: report.overallRiskScore,
        confidence: Math.max(
          report.spamDetection.confidence,
          report.contentPolicy.confidence,
          report.toxicityDetection.confidence,
          report.copyrightDetection.confidence
        ),
        decision: report.recommendedAction,
        reasonCode: report.explanation.substring(0, 48),
        createdAt: new Date(),
        updatedAt: new Date()
      });

    } catch (error) {
      safeLogger.error('Error storing moderation result:', error);
      // Don't throw - this is for analytics, not critical path
    }
  }
}

export const aiContentModerationService = new AIContentModerationService();