import OpenAI from 'openai';
import { safeLogger } from '../utils/safeLogger';

export interface MLModerationResult {
  riskScore: number;
  confidence: number;
  categories: {
    hate_speech: number;
    harassment: number;
    spam: number;
    nsfw: number;
    violence: number;
    self_harm: number;
    sexual_content: number;
  };
  suggestedAction: 'approve' | 'review' | 'reject';
  reasoning: string[];
  flagged: boolean;
  providers: {
    openai?: any;
    perspective?: any;
  };
}

export interface ContentItem {
  text?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  metadata?: {
    authorId?: string;
    communityId?: string;
    previousViolations?: number;
  };
}

/**
 * Content Moderation ML Service
 * Integrates multiple AI providers for comprehensive content analysis
 */
export class ContentModerationMLService {
  private openai: OpenAI;
  private perspectiveApiKey?: string;

  constructor() {
    // Initialize OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for content moderation');
    }
    
    this.openai = new OpenAI({ apiKey });
    this.perspectiveApiKey = process.env.PERSPECTIVE_API_KEY;
  }

  /**
   * Analyze content using multiple AI providers
   */
  async analyzeContent(content: ContentItem): Promise<MLModerationResult> {
    const results: Partial<MLModerationResult> = {
      providers: {},
      reasoning: [],
      categories: {
        hate_speech: 0,
        harassment: 0,
        spam: 0,
        nsfw: 0,
        violence: 0,
        self_harm: 0,
        sexual_content: 0,
      }
    };

    // Analyze text content with OpenAI
    if (content.text) {
      const openaiResult = await this.analyzeTextWithOpenAI(content.text);
      results.providers!.openai = openaiResult;
      this.mergeOpenAIResults(results, openaiResult);
    }

    // Analyze with Perspective API if available
    if (content.text && this.perspectiveApiKey) {
      try {
        const perspectiveResult = await this.analyzeTextWithPerspective(content.text);
        results.providers!.perspective = perspectiveResult;
        this.mergePerspectiveResults(results, perspectiveResult);
      } catch (error) {
        safeLogger.warn('Perspective API analysis failed:', error);
      }
    }

    // Analyze images if present
    if (content.imageUrls && content.imageUrls.length > 0) {
      for (const imageUrl of content.imageUrls) {
        try {
          const imageResult = await this.analyzeImageWithOpenAI(imageUrl);
          this.mergeImageResults(results, imageResult);
        } catch (error) {
          safeLogger.warn(`Image analysis failed for ${imageUrl}:`, error);
        }
      }
    }

    // Calculate ensemble risk score
    const riskScore = this.calculateEnsembleRiskScore(results.categories!);
    const confidence = this.calculateConfidence(results.providers!);
    
    // Determine suggested action
    const suggestedAction = this.determineSuggestedAction(riskScore, confidence, content.metadata);

    return {
      riskScore,
      confidence,
      categories: results.categories!,
      suggestedAction,
      reasoning: results.reasoning!,
      flagged: riskScore > 0.5,
      providers: results.providers!,
    };
  }

  /**
   * Analyze text content using OpenAI Moderation API
   */
  private async analyzeTextWithOpenAI(text: string): Promise<any> {
    try {
      const moderation = await this.openai.moderations.create({
        input: text,
      });

      const result = moderation.results[0];
      return {
        flagged: result.flagged,
        categories: result.categories,
        categoryScores: result.category_scores,
      };
    } catch (error) {
      safeLogger.error('OpenAI moderation error:', error);
      throw error;
    }
  }

  /**
   * Analyze text using Google Perspective API for toxicity
   */
  private async analyzeTextWithPerspective(text: string): Promise<any> {
    if (!this.perspectiveApiKey) {
      throw new Error('Perspective API key not configured');
    }

    try {
      const response = await fetch(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${this.perspectiveApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comment: { text },
            languages: ['en'],
            requestedAttributes: {
              TOXICITY: {},
              SEVERE_TOXICITY: {},
              IDENTITY_ATTACK: {},
              INSULT: {},
              PROFANITY: {},
              THREAT: {},
              SEXUALLY_EXPLICIT: {},
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Perspective API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.attributeScores;
    } catch (error) {
      safeLogger.error('Perspective API error:', error);
      throw error;
    }
  }

  /**
   * Analyze image content (would integrate with AWS Rekognition or similar)
   */
  private async analyzeImageWithOpenAI(imageUrl: string): Promise<any> {
    try {
      // Use OpenAI Vision API to analyze image content
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for inappropriate content including: violence, nudity, hate symbols, graphic content. Return a JSON with categories and scores 0-1.",
              },
              {
                type: "image_url",
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          return { raw_analysis: content };
        }
      }
      return {};
    } catch (error) {
      safeLogger.error('Image analysis error:', error);
      return {};
    }
  }

  /**
   * Merge OpenAI results into ensemble
   */
  private mergeOpenAIResults(results: Partial<MLModerationResult>, openaiResult: any) {
    const categories = results.categories!;
    const scores = openaiResult.categoryScores;

    if (scores.hate) {
      categories.hate_speech = Math.max(categories.hate_speech, scores.hate);
      if (scores.hate > 0.7) {
        results.reasoning!.push('High hate speech probability detected by OpenAI');
      }
    }

    if (scores.harassment) {
      categories.harassment = Math.max(categories.harassment, scores.harassment);
      if (scores.harassment > 0.7) {
        results.reasoning!.push('Harassment content detected');
      }
    }

    if (scores.violence) {
      categories.violence = Math.max(categories.violence, scores.violence);
      if (scores.violence > 0.7) {
        results.reasoning!.push('Violent content detected');
      }
    }

    if (scores['self-harm']) {
      categories.self_harm = Math.max(categories.self_harm, scores['self-harm']);
      if (scores['self-harm'] > 0.7) {
        results.reasoning!.push('Self-harm content detected');
      }
    }

    if (scores.sexual) {
      categories.sexual_content = Math.max(categories.sexual_content, scores.sexual);
      categories.nsfw = Math.max(categories.nsfw, scores.sexual);
      if (scores.sexual > 0.7) {
        results.reasoning!.push('Sexual content detected');
      }
    }
  }

  /**
   * Merge Perspective API results
   */
  private mergePerspectiveResults(results: Partial<MLModerationResult>, perspectiveResult: any) {
    const categories = results.categories!;

    if (perspectiveResult.TOXICITY) {
      const toxicityScore = perspectiveResult.TOXICITY.summaryScore.value;
      categories.harassment = Math.max(categories.harassment, toxicityScore);
      
      if (toxicityScore > 0.8) {
        results.reasoning!.push(`High toxicity detected (${(toxicityScore * 100).toFixed(0)}%)`);
      }
    }

    if (perspectiveResult.IDENTITY_ATTACK) {
      const attackScore = perspectiveResult.IDENTITY_ATTACK.summaryScore.value;
      categories.hate_speech = Math.max(categories.hate_speech, attackScore);
    }

    if (perspectiveResult.THREAT) {
      const threatScore = perspectiveResult.THREAT.summaryScore.value;
      categories.violence = Math.max(categories.violence, threatScore);
    }
  }

  /**
   * Merge image analysis results
   */
  private mergeImageResults(results: Partial<MLModerationResult>, imageResult: any) {
    const categories = results.categories!;

    if (imageResult.violence) {
      categories.violence = Math.max(categories.violence, imageResult.violence);
    }

    if (imageResult.nsfw || imageResult.nudity) {
      const nsfwScore = Math.max(imageResult.nsfw || 0, imageResult.nudity || 0);
      categories.nsfw = Math.max(categories.nsfw, nsfwScore);
      categories.sexual_content = Math.max(categories.sexual_content, nsfwScore);
    }
  }

  /**
   * Calculate ensemble risk score from all categories
   */
  private calculateEnsembleRiskScore(categories: MLModerationResult['categories']): number {
    // Weighted average of all categories
    const weights = {
      hate_speech: 1.2,
      harassment: 1.0,
      spam: 0.6,
      nsfw: 0.9,
      violence: 1.1,
      self_harm: 1.5,
      sexual_content: 0.8,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [category, score] of Object.entries(categories)) {
      const weight = weights[category as keyof typeof weights] || 1.0;
      weightedSum += score * weight;
      totalWeight += weight;
    }

    return Math.min(1.0, weightedSum / totalWeight);
  }

  /**
   * Calculate confidence based on provider agreement
   */
  private calculateConfidence(providers: MLModerationResult['providers']): number {
    const providerCount = Object.keys(providers).length;
    
    if (providerCount === 0) return 0;
    if (providerCount === 1) return 0.7;
    if (providerCount === 2) return 0.85;
    return 0.95;
  }

  /**
   * Determine suggested action based on risk score and context
   */
  private determineSuggestedAction(
    riskScore: number,
    confidence: number,
    metadata?: ContentItem['metadata']
  ): 'approve' | 'review' | 'reject' {
    // High risk = reject
    if (riskScore > 0.8) {
      return 'reject';
    }

    // Medium risk = review
    if (riskScore > 0.5) {
      return 'review';
    }

    // Consider user history
    if (metadata?.previousViolations && metadata.previousViolations > 2) {
      // Lower threshold for repeat offenders
      if (riskScore > 0.3) {
        return 'review';
      }
    }

    // Low confidence in low risk = review to be safe
    if (riskScore > 0.3 && confidence < 0.7) {
      return 'review';
    }

    return 'approve';
  }

  /**
   * Batch analyze multiple content items
   */
  async batchAnalyze(items: ContentItem[]): Promise<MLModerationResult[]> {
    const batchSize = 10; // Process in batches to avoid rate limits
    const results: MLModerationResult[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(item => this.analyzeContent(item))
      );
      results.push(...batchResults);

      // Add small delay between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Provide feedback to improve future predictions
   */
  async provideFeedback(
    contentId: string,
    prediction: MLModerationResult,
    actualOutcome: 'approve' | 'reject',
    moderatorNotes?: string
  ): Promise<void> {
    // Store feedback for future model training
    // This would be saved to database for analytics and model improvement
    safeLogger.info('ML Feedback received:', {
      contentId,
      predicted: prediction.suggestedAction,
      actual: actualOutcome,
      riskScore: prediction.riskScore,
      notes: moderatorNotes,
    });

    // In production, this would:
    // 1. Store in database
    // 2. Flag cases with large discrepancies
    // 3. Periodically retrain or adjust thresholds
  }
}

// Export singleton instance
export const contentModerationML = new ContentModerationMLService();
