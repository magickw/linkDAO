import { VendorModerationService, ModerationResult } from '../aiModerationOrchestrator';
import { safeLogger } from '../../utils/safeLogger';

interface PerspectiveAPIResponse {
  attributeScores: {
    [attribute: string]: {
      summaryScore: {
        value: number;
        type: string;
      };
      spanScores?: Array<{
        begin: number;
        end: number;
        score: {
          value: number;
          type: string;
        };
      }>;
    };
  };
  languages: string[];
  detectedLanguages: string[];
}

export class PerspectiveAPIService implements VendorModerationService {
  name = 'perspective';
  private apiKey: string;
  private baseUrl = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
  private costPerRequest = 0.001; // Approximate cost in USD

  // Perspective API attributes we want to check
  private attributes = [
    'TOXICITY',
    'SEVERE_TOXICITY', 
    'IDENTITY_ATTACK',
    'INSULT',
    'PROFANITY',
    'THREAT',
    'HARASSMENT',
    'HATE_SPEECH'
  ];

  constructor() {
    this.apiKey = process.env.PERSPECTIVE_API_KEY || '';
    if (!this.apiKey) {
      safeLogger.warn('Perspective API key not found in environment variables');
    }
  }

  async scanText(text: string): Promise<ModerationResult> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        throw new Error('Perspective API key not configured');
      }

      // Build request attributes
      const requestedAttributes: Record<string, {}> = {};
      this.attributes.forEach(attr => {
        requestedAttributes[attr] = {};
      });

      const requestBody = {
        comment: { text },
        requestedAttributes,
        languages: ['en'], // Focus on English for now
        doNotStore: true // Don't store comments for privacy
      };

      const url = `${this.baseUrl}?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perspective API error: ${response.status} ${errorText}`);
      }

      const data = await response.json() as PerspectiveAPIResponse;
      
      // Process attribute scores
      const flaggedCategories: string[] = [];
      let maxConfidence = 0;
      const scores: Record<string, number> = {};

      Object.entries(data.attributeScores).forEach(([attribute, scoreData]) => {
        const score = scoreData.summaryScore.value;
        scores[attribute] = score;
        maxConfidence = Math.max(maxConfidence, score);

        // Flag if score is above threshold
        if (score > 0.7) {
          flaggedCategories.push(this.normalizeCategory(attribute));
        }
      });

      return {
        vendor: this.name,
        confidence: maxConfidence,
        categories: [...new Set(flaggedCategories)], // Remove duplicates
        reasoning: flaggedCategories.length > 0 
          ? `High scores for: ${Object.entries(scores)
              .filter(([_, score]) => score > 0.7)
              .map(([attr, score]) => `${attr}(${score.toFixed(2)})`)
              .join(', ')}` 
          : `Highest score: ${Math.max(...Object.values(scores)).toFixed(2)}`,
        cost: this.costPerRequest,
        latency: Date.now() - startTime,
        success: true
      };

    } catch (error) {
      safeLogger.error('Perspective API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        vendor: this.name,
        confidence: 0,
        categories: [],
        reasoning: `Perspective API error: ${errorMessage}`,
        cost: 0,
        latency: Date.now() - startTime,
        success: false,
        error: errorMessage
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }

      // Test with a simple, safe text
      const testResult = await this.scanText('Hello world');
      return testResult.success;
    } catch (error) {
      safeLogger.error('Perspective API health check failed:', error);
      return false;
    }
  }

  private normalizeCategory(perspectiveAttribute: string): string {
    // Map Perspective API attributes to our standard categories
    const categoryMap: Record<string, string> = {
      'TOXICITY': 'harassment',
      'SEVERE_TOXICITY': 'harassment',
      'IDENTITY_ATTACK': 'hate',
      'INSULT': 'harassment',
      'PROFANITY': 'harassment',
      'THREAT': 'violence',
      'HARASSMENT': 'harassment',
      'HATE_SPEECH': 'hate'
    };

    return categoryMap[perspectiveAttribute] || perspectiveAttribute.toLowerCase();
  }
}
