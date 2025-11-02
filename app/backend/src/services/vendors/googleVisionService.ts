import { VendorModerationService, ModerationResult } from '../aiModerationOrchestrator';
import { safeLogger } from '../../utils/safeLogger';

interface GoogleVisionResponse {
  responses: Array<{
    safeSearchAnnotation?: {
      adult: string;
      spoof: string;
      medical: string;
      violence: string;
      racy: string;
    };
    error?: {
      code: number;
      message: string;
      status: string;
    };
  }>;
}

type SafeSearchLikelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';

export class GoogleVisionService implements VendorModerationService {
  name = 'google-vision';
  private apiKey: string;
  private baseUrl = 'https://vision.googleapis.com/v1/images:annotate';
  private costPerRequest = 0.0015; // Approximate cost in USD

  constructor() {
    this.apiKey = process.env.GOOGLE_VISION_API_KEY || '';
    if (!this.apiKey) {
      safeLogger.warn('Google Vision API key not found in environment variables');
    }
  }

  async scanText(text: string): Promise<ModerationResult> {
    // Google Vision doesn't scan text content directly
    return {
      vendor: this.name,
      confidence: 0,
      categories: [],
      reasoning: 'Google Vision does not process text content',
      cost: 0,
      latency: 0,
      success: true
    };
  }

  async scanImage(imageUrl: string): Promise<ModerationResult> {
    const startTime = Date.now();
    
    try {
      if (!this.apiKey) {
        throw new Error('Google Vision API key not configured');
      }

      const requestBody = {
        requests: [
          {
            image: {
              source: {
                imageUri: imageUrl
              }
            },
            features: [
              {
                type: 'SAFE_SEARCH_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
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
        throw new Error(`Google Vision API error: ${response.status} ${errorText}`);
      }

      const data = await response.json() as GoogleVisionResponse;
      const result = data.responses[0];
      
      if (result.error) {
        throw new Error(`Google Vision API error: ${result.error.message}`);
      }

      if (!result.safeSearchAnnotation) {
        throw new Error('No safe search annotation returned from Google Vision');
      }

      // Process safe search results
      const safeSearch = result.safeSearchAnnotation;
      const flaggedCategories: string[] = [];
      let maxConfidence = 0;

      // Check each category and convert likelihood to confidence score
      const categories = {
        adult: 'sexual',
        racy: 'sexual', 
        violence: 'violence',
        medical: 'medical'
        // Note: spoof is not mapped as it's not harmful content
      };

      Object.entries(categories).forEach(([visionCategory, standardCategory]) => {
        const likelihood = safeSearch[visionCategory as keyof typeof safeSearch] as SafeSearchLikelihood;
        const confidence = this.likelihoodToConfidence(likelihood);
        
        maxConfidence = Math.max(maxConfidence, confidence);
        
        if (confidence > 0.7) {
          flaggedCategories.push(standardCategory);
        }
      });

      return {
        vendor: this.name,
        confidence: maxConfidence,
        categories: [...new Set(flaggedCategories)], // Remove duplicates
        reasoning: flaggedCategories.length > 0 
          ? `Flagged categories: ${flaggedCategories.join(', ')}. Scores - Adult: ${safeSearch.adult}, Violence: ${safeSearch.violence}, Racy: ${safeSearch.racy}`
          : `Image appears safe. Adult: ${safeSearch.adult}, Violence: ${safeSearch.violence}, Racy: ${safeSearch.racy}`,
        cost: this.costPerRequest,
        latency: Date.now() - startTime,
        success: true
      };

    } catch (error) {
      safeLogger.error('Google Vision API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        vendor: this.name,
        confidence: 0,
        categories: [],
        reasoning: `Google Vision error: ${errorMessage}`,
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

      // Test with a simple image URL (placeholder)
      // In production, you'd use a known safe test image
      const testImageUrl = 'https://via.placeholder.com/150';
      const testResult = await this.scanImage(testImageUrl);
      return testResult.success;
    } catch (error) {
      safeLogger.error('Google Vision health check failed:', error);
      return false;
    }
  }

  private likelihoodToConfidence(likelihood: SafeSearchLikelihood): number {
    // Convert Google's likelihood scale to 0-1 confidence score
    const likelihoodMap: Record<SafeSearchLikelihood, number> = {
      'UNKNOWN': 0,
      'VERY_UNLIKELY': 0.1,
      'UNLIKELY': 0.3,
      'POSSIBLE': 0.5,
      'LIKELY': 0.8,
      'VERY_LIKELY': 0.95
    };

    return likelihoodMap[likelihood] || 0;
  }
}
