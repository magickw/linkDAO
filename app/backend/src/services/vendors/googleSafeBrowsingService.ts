import axios from 'axios';
import { safeLogger } from '../../utils/safeLogger';

export interface GoogleSafeBrowsingResult {
  status: 'safe' | 'malicious' | 'suspicious' | 'error';
  threatTypes: string[];
  confidence: number;
  rawResponse: any;
  analysisTimeMs: number;
}

export interface ThreatMatch {
  threatType: string;
  platformType: string;
  threatEntryType: string;
  threat: {
    url: string;
  };
  threatEntryMetadata?: {
    entries: Array<{
      key: string;
      value: string;
    }>;
  };
  cacheDuration: string;
}

export class GoogleSafeBrowsingService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://safebrowsing.googleapis.com/v4';
  private readonly clientId = 'linkdao-moderation';
  private readonly clientVersion = '1.0.0';

  constructor() {
    this.apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY || '';
    if (!this.apiKey) {
      safeLogger.warn('Google Safe Browsing API key not configured');
    }
  }

  /**
   * Check a single URL against Google Safe Browsing
   */
  async checkUrl(url: string): Promise<GoogleSafeBrowsingResult> {
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
      const response = await this.makeApiRequest([url]);
      const analysisTimeMs = Date.now() - startTime;

      if (!response.matches || response.matches.length === 0) {
        return {
          status: 'safe',
          threatTypes: [],
          confidence: 95,
          rawResponse: response,
          analysisTimeMs,
        };
      }

      const threatTypes = response.matches.map((match: ThreatMatch) => match.threatType);
      const { status, confidence } = this.evaluateThreatLevel(threatTypes);

      return {
        status,
        threatTypes,
        confidence,
        rawResponse: response,
        analysisTimeMs,
      };
    } catch (error) {
      safeLogger.error('Google Safe Browsing API error:', error);
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
  async checkUrls(urls: string[]): Promise<GoogleSafeBrowsingResult[]> {
    if (urls.length === 0) return [];

    // Google Safe Browsing API supports up to 500 URLs per request
    const batchSize = 500;
    const results: GoogleSafeBrowsingResult[] = [];

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);
    }

    return results;
  }

  private async processBatch(urls: string[]): Promise<GoogleSafeBrowsingResult[]> {
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
      const response = await this.makeApiRequest(urls);
      const analysisTimeMs = Date.now() - startTime;

      // Create a map of URL to threat matches
      const threatMap = new Map<string, ThreatMatch[]>();
      if (response.matches) {
        response.matches.forEach((match: ThreatMatch) => {
          const url = match.threat.url;
          if (!threatMap.has(url)) {
            threatMap.set(url, []);
          }
          threatMap.get(url)!.push(match);
        });
      }

      // Generate results for each URL
      return urls.map(url => {
        const matches = threatMap.get(url) || [];
        
        if (matches.length === 0) {
          return {
            status: 'safe' as const,
            threatTypes: [],
            confidence: 95,
            rawResponse: { url, matches: [] },
            analysisTimeMs: analysisTimeMs / urls.length,
          };
        }

        const threatTypes = matches.map(match => match.threatType);
        const { status, confidence } = this.evaluateThreatLevel(threatTypes);

        return {
          status,
          threatTypes,
          confidence,
          rawResponse: { url, matches },
          analysisTimeMs: analysisTimeMs / urls.length,
        };
      });
    } catch (error) {
      safeLogger.error('Google Safe Browsing batch API error:', error);
      return urls.map(() => ({
        status: 'error' as const,
        threatTypes: [],
        confidence: 0,
        rawResponse: { error: error.message },
        analysisTimeMs: 0,
      }));
    }
  }

  private async makeApiRequest(urls: string[]): Promise<any> {
    const requestBody = {
      client: {
        clientId: this.clientId,
        clientVersion: this.clientVersion,
      },
      threatInfo: {
        threatTypes: [
          'MALWARE',
          'SOCIAL_ENGINEERING',
          'UNWANTED_SOFTWARE',
          'POTENTIALLY_HARMFUL_APPLICATION',
          'THREAT_TYPE_UNSPECIFIED',
        ],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: urls.map(url => ({ url })),
      },
    };

    const response = await axios.post(
      `${this.baseUrl}/threatMatches:find?key=${this.apiKey}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    return response.data;
  }

  private evaluateThreatLevel(threatTypes: string[]): { 
    status: 'safe' | 'malicious' | 'suspicious'; 
    confidence: number 
  } {
    if (threatTypes.length === 0) {
      return { status: 'safe', confidence: 95 };
    }

    // Categorize threat types by severity
    const highSeverityThreats = ['MALWARE', 'SOCIAL_ENGINEERING'];
    const mediumSeverityThreats = ['UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'];
    const unknownThreats = ['THREAT_TYPE_UNSPECIFIED'];

    const hasHighSeverity = threatTypes.some(type => highSeverityThreats.includes(type));
    const hasMediumSeverity = threatTypes.some(type => mediumSeverityThreats.includes(type));
    const hasUnknownThreats = threatTypes.some(type => unknownThreats.includes(type));

    if (hasHighSeverity) {
      return { status: 'malicious', confidence: 95 };
    } else if (hasMediumSeverity) {
      return { status: 'suspicious', confidence: 85 };
    } else if (hasUnknownThreats) {
      return { status: 'suspicious', confidence: 70 };
    } else {
      // Unknown threat types - be cautious
      return { status: 'suspicious', confidence: 60 };
    }
  }

  /**
   * Get threat type descriptions for user-friendly display
   */
  getThreatTypeDescription(threatType: string): string {
    const descriptions: Record<string, string> = {
      'MALWARE': 'Malware or virus detected',
      'SOCIAL_ENGINEERING': 'Phishing or social engineering attempt',
      'UNWANTED_SOFTWARE': 'Potentially unwanted software',
      'POTENTIALLY_HARMFUL_APPLICATION': 'Potentially harmful application',
      'THREAT_TYPE_UNSPECIFIED': 'Unspecified security threat',
    };

    return descriptions[threatType] || `Unknown threat type: ${threatType}`;
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
      // Test with a known safe URL
      const result = await this.checkUrl('https://www.google.com');
      return { success: result.status !== 'error' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
