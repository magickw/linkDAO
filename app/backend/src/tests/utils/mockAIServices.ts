/**
 * Mock AI Services for Testing
 * Provides controllable AI service responses for testing scenarios
 */

export class MockAIServices {
  private textResponses: Map<string, any> = new Map();
  private imageResponses: Map<string, any> = new Map();
  private linkSafetyResponses: Map<string, any> = new Map();
  private piiDetectionResponses: Map<string, any> = new Map();
  private marketplaceResponses: Map<string, any> = new Map();
  private ensembleResponses: Map<string, any> = new Map();
  
  private defaultTextResponse: any = null;
  private defaultImageResponse: any = null;
  private failureRate: number = 0;
  private vendorLatencies: Record<string, number> = {};

  async setup(): Promise<void> {
    // Initialize mock services
    this.reset();
  }

  async cleanup(): Promise<void> {
    // Clean up mock services
    this.reset();
  }

  reset(): void {
    this.textResponses.clear();
    this.imageResponses.clear();
    this.linkSafetyResponses.clear();
    this.piiDetectionResponses.clear();
    this.marketplaceResponses.clear();
    this.ensembleResponses.clear();
    this.defaultTextResponse = null;
    this.defaultImageResponse = null;
    this.failureRate = 0;
    this.vendorLatencies = {};
  }

  getServices(): any {
    return {
      moderateContent: this.moderateContent.bind(this),
      moderateMarketplaceListing: this.moderateMarketplaceListing.bind(this),
      detectPII: this.detectPII.bind(this),
      checkLinkSafety: this.checkLinkSafety.bind(this)
    };
  }

  // Configuration Methods
  setTextModerationResponse(response: any): void {
    this.defaultTextResponse = response;
  }

  setImageModerationResponse(response: any): void {
    this.defaultImageResponse = response;
  }

  setLinkSafetyResponse(response: any): void {
    this.linkSafetyResponses.set('default', response);
  }

  setPIIDetectionResponse(response: any): void {
    this.piiDetectionResponses.set('default', response);
  }

  setMarketplaceModerationResponse(response: any): void {
    this.marketplaceResponses.set('default', response);
  }

  setEnsembleResponse(responses: any): void {
    this.ensembleResponses.set('default', responses);
  }

  setDefaultTextResponse(response: any): void {
    this.defaultTextResponse = response;
  }

  setDefaultImageResponse(response: any): void {
    this.defaultImageResponse = response;
  }

  setFailureRate(rate: number): void {
    this.failureRate = rate;
  }

  setVendorLatencies(latencies: Record<string, number>): void {
    this.vendorLatencies = latencies;
  }

  // Main Moderation Method
  async moderateContent(content: any): Promise<any> {
    // Simulate network latency
    await this.simulateLatency('moderation');

    // Simulate failures
    if (Math.random() < this.failureRate) {
      throw new Error('Simulated AI service failure');
    }

    let response: any;

    if (content.media && content.media.length > 0) {
      // Image/video content
      response = this.getImageModerationResponse(content);
    } else if (content.content) {
      // Text content
      response = this.getTextModerationResponse(content);
    } else {
      throw new Error('No content to moderate');
    }

    // Check for ensemble response override
    const ensembleResponse = this.ensembleResponses.get('default');
    if (ensembleResponse) {
      return this.buildEnsembleResponse(ensembleResponse);
    }

    return this.buildStandardResponse(response);
  }

  async moderateMarketplaceListing(listing: any): Promise<any> {
    await this.simulateLatency('marketplace');

    if (Math.random() < this.failureRate) {
      throw new Error('Simulated marketplace moderation failure');
    }

    const response = this.marketplaceResponses.get('default') || {
      confidence: 0.85,
      categories: ['safe'],
      action: 'allow'
    };

    return this.buildStandardResponse(response);
  }

  async detectPII(content: string): Promise<any> {
    await this.simulateLatency('pii_detection');

    const response = this.piiDetectionResponses.get('default') || {
      detected: false,
      types: [],
      confidence: 0.1,
      redactedContent: content
    };

    return response;
  }

  async checkLinkSafety(url: string): Promise<any> {
    await this.simulateLatency('link_safety');

    const response = this.linkSafetyResponses.get('default') || {
      confidence: 0.95,
      categories: ['safe'],
      action: 'allow'
    };

    return this.buildStandardResponse(response);
  }

  // Response Building Methods
  private getTextModerationResponse(content: any): any {
    if (this.defaultTextResponse) {
      return this.defaultTextResponse;
    }

    // Generate response based on content
    const text = content.content.toLowerCase();
    
    if (this.containsHarmfulPatterns(text)) {
      return {
        confidence: 0.92,
        categories: ['harassment', 'hate'],
        action: 'block'
      };
    } else if (this.containsUncertainPatterns(text)) {
      return {
        confidence: 0.75,
        categories: ['potentially_harmful'],
        action: 'review'
      };
    } else {
      return {
        confidence: 0.95,
        categories: ['safe'],
        action: 'allow'
      };
    }
  }

  private getImageModerationResponse(content: any): any {
    if (this.defaultImageResponse) {
      return this.defaultImageResponse;
    }

    // Simulate image analysis based on filename or metadata
    const filename = content.media[0]?.filename || '';
    
    if (filename.includes('nsfw') || filename.includes('explicit')) {
      return {
        confidence: 0.94,
        categories: ['adult', 'explicit'],
        action: 'block'
      };
    } else if (filename.includes('faces') || filename.includes('biometric')) {
      return {
        confidence: 0.91,
        categories: ['faces_detected', 'biometric_data'],
        action: 'review',
        faceCount: 2,
        faceBoxes: [
          { x: 100, y: 100, width: 50, height: 50 },
          { x: 200, y: 150, width: 45, height: 45 }
        ]
      };
    } else {
      return {
        confidence: 0.92,
        categories: ['safe'],
        action: 'allow',
        perceptualHash: 'abc123def456'
      };
    }
  }

  private buildStandardResponse(response: any): any {
    const baseResponse = {
      confidence: response.confidence || 0.85,
      categories: response.categories || ['safe'],
      action: response.action || 'allow',
      vendorScores: this.generateVendorScores(response),
      latency: this.getTotalLatency(),
      cost: this.calculateCost(response)
    };

    // Add specific fields based on response type
    if (response.faceCount) {
      baseResponse.faceCount = response.faceCount;
      baseResponse.faceBoxes = response.faceBoxes;
    }

    if (response.perceptualHash) {
      baseResponse.perceptualHash = response.perceptualHash;
    }

    return baseResponse;
  }

  private buildEnsembleResponse(ensembleData: any): any {
    const vendorScores = {};
    let overallConfidence = 0;
    let overallAction = 'allow';

    // Process individual vendor responses
    Object.entries(ensembleData).forEach(([vendor, data]: [string, any]) => {
      if (vendor !== 'overall') {
        vendorScores[vendor] = data.confidence;
      }
    });

    if (ensembleData.overall) {
      overallConfidence = ensembleData.overall.confidence;
      overallAction = ensembleData.overall.action;
    } else {
      // Calculate ensemble result
      const confidences = Object.values(vendorScores) as number[];
      overallConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
      overallAction = overallConfidence > 0.8 ? 'block' : 'allow';
    }

    return {
      confidence: overallConfidence,
      categories: ['ensemble_result'],
      action: overallAction,
      vendorScores,
      latency: this.getTotalLatency(),
      cost: this.calculateEnsembleCost(vendorScores)
    };
  }

  private generateVendorScores(response: any): Record<string, any> {
    const scores = {};
    const vendors = ['openai', 'perspective', 'google_vision', 'aws_rekognition'];
    
    vendors.forEach(vendor => {
      scores[vendor] = {
        confidence: response.confidence + (Math.random() - 0.5) * 0.1,
        categories: response.categories,
        latency: this.vendorLatencies[vendor] || Math.random() * 1000
      };
    });

    return scores;
  }

  private getTotalLatency(): number {
    const latencies = Object.values(this.vendorLatencies);
    return latencies.length > 0 ? Math.max(...latencies) : Math.random() * 1000;
  }

  private calculateCost(response: any): number {
    // Simulate cost calculation
    const baseCost = 0.001; // $0.001 per request
    const complexityMultiplier = response.categories.length * 0.5;
    return baseCost * (1 + complexityMultiplier);
  }

  private calculateEnsembleCost(vendorScores: Record<string, any>): number {
    return Object.keys(vendorScores).length * 0.001;
  }

  private async simulateLatency(operation: string): Promise<void> {
    const latencies = {
      moderation: this.vendorLatencies.moderation || 300,
      marketplace: this.vendorLatencies.marketplace || 500,
      pii_detection: this.vendorLatencies.pii_detection || 200,
      link_safety: this.vendorLatencies.link_safety || 400
    };

    const latency = latencies[operation] || 300;
    
    if (latency > 0) {
      await new Promise(resolve => setTimeout(resolve, latency));
    }
  }

  // Content Analysis Helpers
  private containsHarmfulPatterns(text: string): boolean {
    const harmfulPatterns = [
      'hate', 'harassment', 'threat', 'violence', 'abuse',
      'kill', 'die', 'hurt', 'attack', 'destroy'
    ];
    
    return harmfulPatterns.some(pattern => text.includes(pattern));
  }

  private containsUncertainPatterns(text: string): boolean {
    const uncertainPatterns = [
      'maybe', 'possibly', 'might', 'could be', 'uncertain',
      'borderline', 'questionable', 'suspicious'
    ];
    
    return uncertainPatterns.some(pattern => text.includes(pattern));
  }

  // Test Scenario Helpers
  generateFailureScenario(vendor: string): void {
    this.vendorLatencies[vendor] = 10000; // 10 second timeout
  }

  generateDegradedPerformance(): void {
    Object.keys(this.vendorLatencies).forEach(vendor => {
      this.vendorLatencies[vendor] *= 3; // 3x slower
    });
  }

  simulateVendorOutage(vendor: string): void {
    const originalMethod = this.moderateContent;
    this.moderateContent = async (content: any) => {
      if (vendor === 'openai') {
        throw new Error(`${vendor} service unavailable`);
      }
      return originalMethod.call(this, content);
    };
  }

  // Batch Processing Support
  async moderateContentBatch(contents: any[]): Promise<any[]> {
    const results = [];
    
    for (const content of contents) {
      try {
        const result = await this.moderateContent(content);
        results.push(result);
      } catch (error) {
        results.push({
          error: error.message,
          confidence: 0,
          action: 'error'
        });
      }
    }
    
    return results;
  }

  // Performance Monitoring
  getPerformanceMetrics(): any {
    return {
      totalRequests: this.getTotalRequests(),
      averageLatency: this.getAverageLatency(),
      failureRate: this.failureRate,
      vendorLatencies: this.vendorLatencies
    };
  }

  private getTotalRequests(): number {
    // Simulate request counting
    return Math.floor(Math.random() * 1000);
  }

  private getAverageLatency(): number {
    const latencies = Object.values(this.vendorLatencies);
    return latencies.length > 0 
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
      : 0;
  }
}
