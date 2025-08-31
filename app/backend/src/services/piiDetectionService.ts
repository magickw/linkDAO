import { z } from 'zod';

// PII Detection patterns and configurations
const PII_PATTERNS = {
  // Phone numbers (various formats)
  PHONE: /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
  
  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Social Security Numbers
  SSN: /\b(?:\d{3}-?\d{2}-?\d{4})\b/g,
  
  // Credit card numbers (basic pattern)
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  
  // Crypto seed phrases (12-24 words)
  SEED_PHRASE: /\b(?:(?:[a-z]+\s+){11,23}[a-z]+)\b/gi,
  
  // Wallet addresses (Ethereum format)
  WALLET_ADDRESS: /\b0x[a-fA-F0-9]{40}\b/g,
  
  // IP addresses
  IP_ADDRESS: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
  
  // Physical addresses (basic pattern)
  ADDRESS: /\b\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi,
  
  // Government ID patterns
  PASSPORT: /\b[A-Z]{1,2}\d{6,9}\b/g,
  DRIVER_LICENSE: /\b[A-Z]{1,2}\d{6,8}\b/g,
};

// Redaction configurations
const REDACTION_CONFIG = {
  PHONE: '[PHONE_REDACTED]',
  EMAIL: '[EMAIL_REDACTED]',
  SSN: '[SSN_REDACTED]',
  CREDIT_CARD: '[CARD_REDACTED]',
  SEED_PHRASE: '[SEED_PHRASE_REDACTED]',
  WALLET_ADDRESS: '[WALLET_REDACTED]',
  IP_ADDRESS: '[IP_REDACTED]',
  ADDRESS: '[ADDRESS_REDACTED]',
  PASSPORT: '[PASSPORT_REDACTED]',
  DRIVER_LICENSE: '[LICENSE_REDACTED]',
};

export interface PIIDetectionResult {
  hasPII: boolean;
  detectedTypes: string[];
  redactedContent: string;
  originalLength: number;
  redactedLength: number;
  confidence: number;
  matches: Array<{
    type: string;
    match: string;
    position: number;
    length: number;
  }>;
}

export interface PIIDetectionOptions {
  enableRedaction: boolean;
  preservePartial: boolean; // Keep first/last chars for context
  customPatterns?: Record<string, RegExp>;
  sensitivityLevel: 'low' | 'medium' | 'high';
}

export class PIIDetectionService {
  private patterns: Record<string, RegExp>;
  private redactionMap: Record<string, string>;

  constructor() {
    this.patterns = { ...PII_PATTERNS };
    this.redactionMap = { ...REDACTION_CONFIG };
  }

  /**
   * Detect and optionally redact PII from text content
   */
  async detectAndRedact(
    content: string,
    options: PIIDetectionOptions = {
      enableRedaction: true,
      preservePartial: false,
      sensitivityLevel: 'medium'
    }
  ): Promise<PIIDetectionResult> {
    const matches: PIIDetectionResult['matches'] = [];
    let redactedContent = content;
    let confidence = 0;

    // Apply sensitivity-based pattern filtering
    const activePatterns = this.getActivePatternsForSensitivity(options.sensitivityLevel);

    // Detect PII patterns
    for (const [type, pattern] of Object.entries(activePatterns)) {
      const typeMatches = Array.from(content.matchAll(pattern));
      
      for (const match of typeMatches) {
        if (match.index !== undefined) {
          matches.push({
            type,
            match: match[0],
            position: match.index,
            length: match[0].length
          });

          // Calculate confidence based on pattern specificity
          confidence = Math.max(confidence, this.calculateConfidence(type, match[0]));

          // Apply redaction if enabled
          if (options.enableRedaction) {
            const replacement = options.preservePartial 
              ? this.createPartialRedaction(match[0], type)
              : this.redactionMap[type];
            
            redactedContent = redactedContent.replace(match[0], replacement);
          }
        }
      }
    }

    // Apply custom patterns if provided
    if (options.customPatterns) {
      for (const [type, pattern] of Object.entries(options.customPatterns)) {
        const typeMatches = Array.from(content.matchAll(pattern));
        
        for (const match of typeMatches) {
          if (match.index !== undefined) {
            matches.push({
              type: `CUSTOM_${type}`,
              match: match[0],
              position: match.index,
              length: match[0].length
            });

            if (options.enableRedaction) {
              const replacement = `[${type.toUpperCase()}_REDACTED]`;
              redactedContent = redactedContent.replace(match[0], replacement);
            }
          }
        }
      }
    }

    return {
      hasPII: matches.length > 0,
      detectedTypes: [...new Set(matches.map(m => m.type))],
      redactedContent,
      originalLength: content.length,
      redactedLength: redactedContent.length,
      confidence,
      matches: matches.sort((a, b) => a.position - b.position)
    };
  }

  /**
   * Validate if content is safe for storage/transmission
   */
  async validateContentSafety(content: string): Promise<{
    isSafe: boolean;
    violations: string[];
    riskScore: number;
  }> {
    const detection = await this.detectAndRedact(content, {
      enableRedaction: false,
      preservePartial: false,
      sensitivityLevel: 'high'
    });

    const violations = detection.detectedTypes;
    const riskScore = this.calculateRiskScore(detection);

    return {
      isSafe: riskScore < 0.7,
      violations,
      riskScore
    };
  }

  /**
   * Create safe version of content for evidence storage
   */
  async createSafeEvidence(content: string): Promise<{
    safeContent: string;
    piiMap: Record<string, string>;
    hash: string;
  }> {
    const detection = await this.detectAndRedact(content, {
      enableRedaction: true,
      preservePartial: true,
      sensitivityLevel: 'high'
    });

    // Create mapping for potential restoration
    const piiMap: Record<string, string> = {};
    detection.matches.forEach((match, index) => {
      const key = `PII_${index}_${match.type}`;
      piiMap[key] = match.match;
    });

    // Create content hash for integrity
    const hash = await this.createContentHash(content);

    return {
      safeContent: detection.redactedContent,
      piiMap,
      hash
    };
  }

  private getActivePatternsForSensitivity(level: 'low' | 'medium' | 'high'): Record<string, RegExp> {
    const basePatternsLow = ['PHONE', 'EMAIL', 'CREDIT_CARD'];
    const basePatternseMedium = [...basePatternsLow, 'SSN', 'WALLET_ADDRESS', 'SEED_PHRASE'];
    const basePatternsHigh = [...basePatternseMedium, 'IP_ADDRESS', 'ADDRESS', 'PASSPORT', 'DRIVER_LICENSE'];

    let activePatternNames: string[];
    switch (level) {
      case 'low':
        activePatternNames = basePatternsLow;
        break;
      case 'medium':
        activePatternNames = basePatternseMedium;
        break;
      case 'high':
        activePatternNames = basePatternsHigh;
        break;
    }

    const activePatterns: Record<string, RegExp> = {};
    activePatternNames.forEach(name => {
      if (this.patterns[name]) {
        activePatterns[name] = this.patterns[name];
      }
    });

    return activePatterns;
  }

  private calculateConfidence(type: string, match: string): number {
    // Higher confidence for more specific patterns
    const confidenceMap: Record<string, number> = {
      SSN: 0.95,
      CREDIT_CARD: 0.90,
      SEED_PHRASE: 0.85,
      WALLET_ADDRESS: 0.90,
      EMAIL: 0.80,
      PHONE: 0.75,
      IP_ADDRESS: 0.70,
      ADDRESS: 0.60,
      PASSPORT: 0.85,
      DRIVER_LICENSE: 0.80
    };

    return confidenceMap[type] || 0.50;
  }

  private calculateRiskScore(detection: PIIDetectionResult): number {
    if (!detection.hasPII) return 0;

    // Weight different PII types by risk
    const riskWeights: Record<string, number> = {
      SSN: 1.0,
      CREDIT_CARD: 1.0,
      SEED_PHRASE: 1.0,
      PASSPORT: 0.9,
      DRIVER_LICENSE: 0.8,
      WALLET_ADDRESS: 0.7,
      EMAIL: 0.5,
      PHONE: 0.5,
      IP_ADDRESS: 0.4,
      ADDRESS: 0.6
    };

    let totalRisk = 0;
    let maxRisk = 0;

    detection.detectedTypes.forEach(type => {
      const risk = riskWeights[type] || 0.3;
      totalRisk += risk;
      maxRisk = Math.max(maxRisk, risk);
    });

    // Combine total risk with max risk (high-risk items dominate)
    return Math.min(1.0, (totalRisk * 0.3) + (maxRisk * 0.7));
  }

  private createPartialRedaction(original: string, type: string): string {
    if (original.length <= 4) {
      return this.redactionMap[type];
    }

    const keepChars = Math.min(2, Math.floor(original.length * 0.2));
    const start = original.substring(0, keepChars);
    const end = original.substring(original.length - keepChars);
    const middle = '*'.repeat(Math.max(1, original.length - (keepChars * 2)));

    return `${start}${middle}${end}`;
  }

  private async createContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const piiDetectionService = new PIIDetectionService();