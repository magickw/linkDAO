import { VendorModerationService, ModerationResult } from '../aiModerationOrchestrator';
import { safeLogger } from '../utils/safeLogger';

interface OpenAIModerationResponse {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: {
      sexual: boolean;
      hate: boolean;
      harassment: boolean;
      'self-harm': boolean;
      'sexual/minors': boolean;
      'hate/threatening': boolean;
      'violence/graphic': boolean;
      'self-harm/intent': boolean;
      'self-harm/instructions': boolean;
      'harassment/threatening': boolean;
    };
    category_scores: {
      sexual: number;
      hate: number;
      harassment: number;
      'self-harm': number;
      'sexual/minors': number;
      'hate/threatening': number;
      'violence/graphic': number;
      'self-harm/intent': number;
      'self-harm/instructions': number;
      'harassment/threatening': number;
    };
  }>;
}

export class OpenAIModerationService implements VendorModerationService {
  name = 'openai';
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1/moderations';
  private costPerRequest = 0.0002; // Approximate cost in USD

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      safeLogger.warn('OpenAI API key not found in environment variables');
    }
  }

  async scanText(text: string): Promise<ModerationResult> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: text,
          model: 'text-moderation-latest'
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OpenAIModerationResponse;
      const result = data.results[0];
      
      if (!result) {
        throw new Error('No moderation result returned from OpenAI');
      }

      // Extract flagged categories and their scores
      const flaggedCategories: string[] = [];
      let maxConfidence = 0;

      Object.entries(result.categories).forEach(([category, flagged]) => {
        if (flagged) {
          flaggedCategories.push(this.normalizeCategory(category));
          const score = result.category_scores[category as keyof typeof result.category_scores];
          maxConfidence = Math.max(maxConfidence, score);
        }
      });

      // If nothing flagged, use highest score as confidence
      if (flaggedCategories.length === 0) {
        maxConfidence = Math.max(...Object.values(result.category_scores));
      }

      return {
        vendor: this.name,
        confidence: maxConfidence,
        categories: flaggedCategories,
        reasoning: flaggedCategories.length > 0 
          ? `Flagged for: ${flaggedCategories.join(', ')}` 
          : 'Content appears safe',
        cost: this.costPerRequest,
        latency: Date.now() - startTime,
        success: true
      };

    } catch (error) {
      safeLogger.error('OpenAI moderation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        vendor: this.name,
        confidence: 0,
        categories: [],
        reasoning: `OpenAI error: ${errorMessage}`,
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
      safeLogger.error('OpenAI health check failed:', error);
      return false;
    }
  }

  private normalizeCategory(openaiCategory: string): string {
    // Map OpenAI categories to our standard categories
    const categoryMap: Record<string, string> = {
      'sexual': 'sexual',
      'sexual/minors': 'sexual',
      'hate': 'hate',
      'hate/threatening': 'hate',
      'harassment': 'harassment',
      'harassment/threatening': 'harassment',
      'self-harm': 'self-harm',
      'self-harm/intent': 'self-harm',
      'self-harm/instructions': 'self-harm',
      'violence/graphic': 'violence'
    };

    return categoryMap[openaiCategory] || openaiCategory;
  }
}