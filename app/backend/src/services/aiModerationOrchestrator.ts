import { OpenAIModerationService } from './vendors/openaiModerationService';
import { PerspectiveAPIService } from './vendors/perspectiveApiService';
import { GoogleVisionService } from './vendors/googleVisionService';

export interface ContentInput {
  id: string;
  type: 'post' | 'comment' | 'listing' | 'dm' | 'username';
  text?: string;
  media?: MediaFile[];
  links?: string[];
  userId: string;
  userReputation: number;
  walletAddress: string;
  metadata: Record<string, any>;
}

export interface MediaFile {
  url: string;
  type: 'image' | 'video';
  mimeType: string;
  size: number;
}

export interface ModerationResult {
  vendor: string;
  confidence: number;
  categories: string[];
  reasoning?: string;
  cost: number;
  latency: number;
  success: boolean;
  error?: string;
}

export interface EnsembleDecision {
  overallConfidence: number;
  primaryCategory: string;
  action: 'allow' | 'limit' | 'block' | 'review';
  vendorResults: ModerationResult[];
  evidenceHash: string;
  riskScore: number;
}

export interface VendorModerationService {
  name: string;
  scanText(text: string): Promise<ModerationResult>;
  scanImage?(imageUrl: string): Promise<ModerationResult>;
  scanVideo?(videoUrl: string): Promise<ModerationResult>;
  isHealthy(): Promise<boolean>;
}

export class AIModerationOrchestrator {
  private textVendors: VendorModerationService[];
  private imageVendors: VendorModerationService[];
  private confidenceWeights: Record<string, number>;
  private categoryThresholds: Record<string, number>;

  constructor() {
    this.textVendors = [
      new OpenAIModerationService(),
      new PerspectiveAPIService()
    ];
    
    this.imageVendors = [
      new GoogleVisionService()
    ];

    // Vendor confidence weights for ensemble scoring
    this.confidenceWeights = {
      'openai': 0.4,
      'perspective': 0.3,
      'google-vision': 0.3
    };

    // Category-specific confidence thresholds
    this.categoryThresholds = {
      'harassment': 0.8,
      'hate': 0.9,
      'self-harm': 0.95,
      'sexual': 0.85,
      'violence': 0.9,
      'scam': 0.7,
      'spam': 0.6
    };
  }

  async scanContent(content: ContentInput): Promise<EnsembleDecision> {
    const startTime = Date.now();
    const results: ModerationResult[] = [];

    try {
      // Scan text content if present
      if (content.text) {
        const textResults = await this.scanTextContent(content.text);
        results.push(...textResults);
      }

      // Scan media content if present
      if (content.media && content.media.length > 0) {
        const mediaResults = await this.scanMediaContent(content.media);
        results.push(...mediaResults);
      }

      // Aggregate results into final decision
      const decision = this.aggregateResults(results, content);
      
      return {
        ...decision,
        evidenceHash: this.generateEvidenceHash(content, results)
      };

    } catch (error) {
      console.error('Error in AI moderation orchestrator:', error);
      
      // Return safe fallback decision
      return {
        overallConfidence: 0,
        primaryCategory: 'error',
        action: 'review',
        vendorResults: results,
        evidenceHash: this.generateEvidenceHash(content, results),
        riskScore: 0.5
      };
    }
  }

  private async scanTextContent(text: string): Promise<ModerationResult[]> {
    const results: ModerationResult[] = [];
    
    // Run text vendors in parallel with timeout
    const textPromises = this.textVendors.map(async (vendor) => {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          vendor.scanText(text),
          this.timeoutPromise(5000) // 5 second timeout
        ]);
        
        return {
          ...result,
          latency: Date.now() - startTime
        };
      } catch (error) {
        console.error(`Text scanning failed for vendor ${vendor.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          vendor: vendor.name,
          confidence: 0,
          categories: [],
          reasoning: `Vendor error: ${errorMessage}`,
          cost: 0,
          latency: 0,
          success: false,
          error: errorMessage
        };
      }
    });

    const textResults = await Promise.allSettled(textPromises);
    
    textResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    });

    return results;
  }

  private async scanMediaContent(media: MediaFile[]): Promise<ModerationResult[]> {
    const results: ModerationResult[] = [];
    
    // Process images and videos
    for (const file of media) {
      if (file.type === 'image') {
        const imageResults = await this.scanImageContent(file.url);
        results.push(...imageResults);
      } else if (file.type === 'video') {
        // For now, treat video as image (first frame analysis)
        const videoResults = await this.scanImageContent(file.url);
        results.push(...videoResults);
      }
    }

    return results;
  }

  private async scanImageContent(imageUrl: string): Promise<ModerationResult[]> {
    const results: ModerationResult[] = [];
    
    const imagePromises = this.imageVendors.map(async (vendor) => {
      try {
        if (!vendor.scanImage) {
          return null;
        }
        
        const startTime = Date.now();
        const result = await Promise.race([
          vendor.scanImage(imageUrl),
          this.timeoutPromise(30000) // 30 second timeout for images
        ]);
        
        return {
          ...result,
          latency: Date.now() - startTime
        };
      } catch (error) {
        console.error(`Image scanning failed for vendor ${vendor.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          vendor: vendor.name,
          confidence: 0,
          categories: [],
          reasoning: `Image scan error: ${errorMessage}`,
          cost: 0,
          latency: 0,
          success: false,
          error: errorMessage
        };
      }
    });

    const imageResults = await Promise.allSettled(imagePromises);
    
    imageResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    });

    return results;
  }

  private aggregateResults(results: ModerationResult[], content: ContentInput): Omit<EnsembleDecision, 'evidenceHash'> {
    if (results.length === 0) {
      return {
        overallConfidence: 0,
        primaryCategory: 'unknown',
        action: 'review',
        vendorResults: results,
        riskScore: 0.5
      };
    }

    // Calculate weighted confidence scores by category
    const categoryScores: Record<string, number> = {};
    const categoryWeights: Record<string, number> = {};
    
    results.forEach((result) => {
      if (!result.success) return;
      
      const vendorWeight = this.confidenceWeights[result.vendor] || 0.1;
      
      if (result.categories.length === 0) {
        // If no categories flagged, still consider the confidence for overall scoring
        const category = 'safe';
        if (!categoryScores[category]) {
          categoryScores[category] = 0;
          categoryWeights[category] = 0;
        }
        categoryScores[category] += result.confidence * vendorWeight;
        categoryWeights[category] += vendorWeight;
      } else {
        result.categories.forEach((category) => {
          if (!categoryScores[category]) {
            categoryScores[category] = 0;
            categoryWeights[category] = 0;
          }
          
          categoryScores[category] += result.confidence * vendorWeight;
          categoryWeights[category] += vendorWeight;
        });
      }
    });

    // Normalize scores by total weights
    Object.keys(categoryScores).forEach((category) => {
      if (categoryWeights[category] > 0) {
        categoryScores[category] /= categoryWeights[category];
      }
    });

    // Find primary category with highest confidence (excluding 'safe')
    const harmfulCategories = Object.keys(categoryScores).filter(cat => cat !== 'safe');
    let primaryCategory = 'unknown';
    let overallConfidence = 0;
    
    if (harmfulCategories.length > 0) {
      primaryCategory = harmfulCategories.reduce((a, b) => 
        categoryScores[a] > categoryScores[b] ? a : b
      );
      overallConfidence = categoryScores[primaryCategory];
    } else if (categoryScores['safe']) {
      primaryCategory = 'safe';
      overallConfidence = categoryScores['safe'];
    }
    
    // Apply reputation-based threshold adjustment
    const reputationModifier = this.calculateReputationModifier(content.userReputation);
    const adjustedThreshold = (this.categoryThresholds[primaryCategory] || 0.7) * reputationModifier;
    
    // Determine action based on confidence and thresholds
    let action: 'allow' | 'limit' | 'block' | 'review';
    
    // Check if any individual vendor has very high confidence for blocking
    const hasHighConfidenceBlock = results.some(r => 
      r.success && r.confidence >= 0.95 && r.categories.length > 0
    );
    
    if (hasHighConfidenceBlock || overallConfidence >= 0.95) {
      action = 'block';
    } else if (overallConfidence >= Math.max(adjustedThreshold, 0.7)) {
      action = 'review';
    } else if (overallConfidence >= 0.3) {
      action = 'limit';
    } else {
      action = 'allow';
    }

    // Calculate risk score
    const riskScore = Math.min(1.0, overallConfidence + (1 - content.userReputation / 100) * 0.2);

    return {
      overallConfidence,
      primaryCategory,
      action,
      vendorResults: results,
      riskScore
    };
  }

  private calculateReputationModifier(reputation: number): number {
    // Higher reputation = lower thresholds (more lenient)
    // Lower reputation = higher thresholds (more strict)
    if (reputation >= 80) return 0.8;
    if (reputation >= 60) return 0.9;
    if (reputation >= 40) return 1.0;
    if (reputation >= 20) return 1.1;
    return 1.2;
  }

  private generateEvidenceHash(content: ContentInput, results: ModerationResult[]): string {
    const evidence = {
      contentId: content.id,
      timestamp: new Date().toISOString(),
      results: results.map(r => ({
        vendor: r.vendor,
        confidence: r.confidence,
        categories: r.categories,
        success: r.success
      }))
    };
    
    // Simple hash generation (in production, use crypto.createHash)
    return Buffer.from(JSON.stringify(evidence)).toString('base64').slice(0, 32);
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), ms);
    });
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    const allVendors = [...this.textVendors, ...this.imageVendors];
    
    for (const vendor of allVendors) {
      try {
        health[vendor.name] = await vendor.isHealthy();
      } catch (error) {
        health[vendor.name] = false;
      }
    }
    
    return health;
  }
}