import axios from 'axios';
import { safeLogger } from '../../utils/safeLogger';

export interface PhishFortResult {
  status: 'safe' | 'malicious' | 'suspicious' | 'error';
  threatTypes: string[];
  confidence: number;
  rawResponse: any;
  analysisTimeMs: number;
}

export interface PhishFortResponse {
  url: string;
  status: 'clean' | 'malicious' | 'suspicious';
  category?: string;
  subcategory?: string;
  risk_score?: number;
  last_updated?: string;
  details?: {
    description?: string;
    tags?: string[];
    related_urls?: string[];
  };
}

export class PhishFortService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.phishfort.com/v2';
  private readonly userAgent = 'LinkDAO-Moderation/1.0';

  constructor() {
    this.apiKey = process.env.PHISHFORT_API_KEY || '';
    if (!this.apiKey) {
      safeLogger.warn('PhishFort API key not configured');
    }
  }

  /**
   * Check a single URL against PhishFort database
   */
  async checkUrl(url: string): Promise<PhishFortResult> {
    const startTime = Date.now();

    if (!this.apiKey) {
      return {
        status: 'error',
        threatTypes: [],
        confidence: 0,
        rawResponse: { error: 'API key not configured' },
        analysisTimeMs: Date.now() - startTime,
      };
    }

    try {
      const response = await this.makeApiRequest('check', { url });
      const analysisTimeMs = Date.now() - startTime;

      return this.processResponse(response.data, analysisTimeMs);
    } catch (error) {
      safeLogger.error('PhishFort API error:', error);
      return {
        status: 'error',
        threatTypes: [],
        confidence: 0,
        rawResponse: { error: error.message },
        analysisTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Check multiple URLs in batch
   */
  async checkUrls(urls: string[]): Promise<PhishFortResult[]> {
    if (urls.length === 0) return [];

    // PhishFort supports batch requests
    const batchSize = 100; // Adjust based on API limits
    const results: PhishFortResult[] = [];

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Check domain reputation
   */
  async checkDomain(domain: string): Promise<PhishFortResult> {
    const startTime = Date.now();

    if (!this.apiKey) {
      return {
        status: 'error',
        threatTypes: [],
        confidence: 0,
        rawResponse: { error: 'API key not configured' },
        analysisTimeMs: Date.now() - startTime,
      };
    }

    try {
      const response = await this.makeApiRequest('domain', { domain });
      const analysisTimeMs = Date.now() - startTime;

      return this.processResponse(response.data, analysisTimeMs);
    } catch (error) {
      safeLogger.error('PhishFort domain API error:', error);
      return {
        status: 'error',
        threatTypes: [],
        confidence: 0,
        rawResponse: { error: error.message },
        analysisTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get crypto-specific threat intelligence
   */
  async getCryptoThreatIntel(url: string): Promise<{
    isCryptoRelated: boolean;
    scamTypes: string[];
    targetedProjects: string[];
    confidence: number;
  }> {
    try {
      const response = await this.makeApiRequest('crypto-intel', { url });
      
      return {
        isCryptoRelated: response.data.crypto_related || false,
        scamTypes: response.data.scam_types || [],
        targetedProjects: response.data.targeted_projects || [],
        confidence: response.data.confidence || 0,
      };
    } catch (error) {
      safeLogger.error('PhishFort crypto intel error:', error);
      return {
        isCryptoRelated: false,
        scamTypes: [],
        targetedProjects: [],
        confidence: 0,
      };
    }
  }

  private async processBatch(urls: string[]): Promise<PhishFortResult[]> {
    const startTime = Date.now();

    if (!this.apiKey) {
      return urls.map(() => ({
        status: 'error' as const,
        threatTypes: [],
        confidence: 0,
        rawResponse: { error: 'API key not configured' },
        analysisTimeMs: 0,
      }));
    }

    try {
      const response = await this.makeApiRequest('batch-check', { urls });
      const analysisTimeMs = Date.now() - startTime;

      if (Array.isArray(response.data)) {
        return response.data.map((result: PhishFortResponse) => 
          this.processResponse(result, analysisTimeMs / urls.length)
        );
      } else {
        // Fallback to individual requests if batch fails
        return await Promise.all(urls.map(url => this.checkUrl(url)));
      }
    } catch (error) {
      safeLogger.error('PhishFort batch API error:', error);
      // Fallback to individual requests
      return await Promise.all(urls.map(url => this.checkUrl(url)));
    }
  }

  private async makeApiRequest(endpoint: string, data: any): Promise<any> {
    const response = await axios.post(
      `${this.baseUrl}/${endpoint}`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': this.userAgent,
        },
        timeout: 30000, // 30 second timeout
      }
    );

    return response;
  }

  private processResponse(data: PhishFortResponse, analysisTimeMs: number): PhishFortResult {
    const threatTypes = this.extractThreatTypes(data);
    const { status, confidence } = this.evaluateStatus(data);

    return {
      status,
      threatTypes,
      confidence,
      rawResponse: data,
      analysisTimeMs,
    };
  }

  private extractThreatTypes(data: PhishFortResponse): string[] {
    const threatTypes: string[] = [];

    if (data.category) {
      threatTypes.push(data.category);
    }

    if (data.subcategory) {
      threatTypes.push(data.subcategory);
    }

    if (data.details?.tags) {
      threatTypes.push(...data.details.tags);
    }

    return threatTypes;
  }

  private evaluateStatus(data: PhishFortResponse): {
    status: 'safe' | 'malicious' | 'suspicious';
    confidence: number;
  } {
    switch (data.status) {
      case 'clean':
        return { status: 'safe', confidence: 90 };
      
      case 'malicious':
        // Higher confidence for crypto-specific threats
        const isCryptoThreat = this.isCryptoRelatedThreat(data);
        return { 
          status: 'malicious', 
          confidence: isCryptoThreat ? 95 : 85 
        };
      
      case 'suspicious':
        return { status: 'suspicious', confidence: 75 };
      
      default:
        // Use risk score if available
        if (data.risk_score !== undefined) {
          if (data.risk_score >= 80) {
            return { status: 'malicious', confidence: 80 };
          } else if (data.risk_score >= 40) {
            return { status: 'suspicious', confidence: 70 };
          } else {
            return { status: 'safe', confidence: 85 };
          }
        }
        
        return { status: 'safe', confidence: 50 };
    }
  }

  private isCryptoRelatedThreat(data: PhishFortResponse): boolean {
    const cryptoKeywords = [
      'crypto', 'bitcoin', 'ethereum', 'defi', 'nft', 'wallet',
      'metamask', 'uniswap', 'binance', 'coinbase', 'blockchain',
      'token', 'coin', 'mining', 'staking', 'yield', 'farming'
    ];

    const textToCheck = [
      data.category,
      data.subcategory,
      data.details?.description,
      ...(data.details?.tags || [])
    ].join(' ').toLowerCase();

    return cryptoKeywords.some(keyword => textToCheck.includes(keyword));
  }

  /**
   * Get threat category descriptions
   */
  getThreatDescription(category: string): string {
    const descriptions: Record<string, string> = {
      'phishing': 'Phishing attempt to steal credentials',
      'scam': 'Fraudulent scheme or scam',
      'malware': 'Malicious software distribution',
      'crypto_scam': 'Cryptocurrency-related scam',
      'fake_exchange': 'Fake cryptocurrency exchange',
      'fake_wallet': 'Fake cryptocurrency wallet',
      'ponzi': 'Ponzi or pyramid scheme',
      'fake_ico': 'Fake Initial Coin Offering',
      'fake_defi': 'Fake DeFi protocol or service',
      'impersonation': 'Impersonating legitimate service',
      'giveaway_scam': 'Fake cryptocurrency giveaway',
      'investment_scam': 'Fraudulent investment opportunity',
    };

    return descriptions[category.toLowerCase()] || `Threat category: ${category}`;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'API key not configured' };
    }

    try {
      // Test with a known safe domain
      const result = await this.checkDomain('google.com');
      return { success: result.status !== 'error' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
