/**
 * AI Scam Detection Service for Messaging
 * 
 * Uses AI to detect potential scams, phishing attempts, and malicious content
 * in messages. Provides real-time analysis and warnings to protect users.
 * 
 * Features:
 * - Pattern-based scam detection
 * - Keyword analysis
 * - Link safety checking
 * - Suspicious behavior detection
 * - User reputation scoring
 */

import apiClient from './apiClient';

// Scam detection result
export interface ScamDetectionResult {
  isSuspicious: boolean;
  confidence: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  warnings: ScamWarning[];
  analysis: ScamAnalysis;
}

// Scam warning
export interface ScamWarning {
  type: ScamWarningType;
  message: string;
  severity: 'low' | 'medium' | 'high';
  evidence?: string[];
}

// Scam warning types
export enum ScamWarningType {
  PHISHING_LINK = 'phishing_link',
  MALICIOUS_URL = 'malicious_url',
  CRYPTO_SCAM = 'crypto_scam',
  IMPERSONATION = 'impersonation',
  URGENT_ACTION = 'urgent_action',
  FAKE_SUPPORT = 'fake_support',
  GIVEAWAY_SCAM = 'giveaway_scam',
  INVESTMENT_SCAM = 'investment_scam',
  WALLET_DRAIN = 'wallet_drain',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
}

// Scam analysis details
export interface ScamAnalysis {
  detectedPatterns: string[];
  suspiciousKeywords: string[];
  suspiciousLinks: string[];
  senderReputation: number; // 0-100
  messageScore: number; // 0-100
  recommendations: string[];
}

// Message to analyze
export interface MessageToAnalyze {
  id: string;
  content: string;
  senderId: string;
  senderAddress?: string;
  timestamp: Date;
  attachments?: MessageAttachment[];
}

// Message attachment
export interface MessageAttachment {
  type: 'image' | 'video' | 'file' | 'link';
  url?: string;
  content?: string;
}

// Known scam patterns
const SCAM_PATTERNS = [
  /send\s+\d+\s+(eth|btc|usdt|usdc| dai|matic|bnb)/gi,
  /double\s+your\s+(eth|crypto|money|investment)/gi,
  /guaranteed\s+returns?\s+\d+%?/gi,
  /urgent\s+action\s+required/gi,
  /verify\s+your\s+(wallet|account|identity)/gi,
  /claim\s+your\s+(bonus|reward|airdrop|giveaway)/gi,
  /click\s+here\s+to\s+(claim|receive|verify)/gi,
  /limited\s+time\s+offer/gi,
  /act\s+now\s+or\s+lose/gi,
  /contact\s+support\s+immediately/gi,
  /wallet\s+compromised/gi,
  /unauthorized\s+access\s+detected/gi,
  /security\s+alert/gi,
  /your\s+account\s+will\s+be\s+(suspended|banned|deleted)/gi,
];

// Suspicious keywords
const SUSPICIOUS_KEYWORDS = [
  'airdrop',
  'giveaway',
  'bonus',
  'reward',
  'free',
  'double',
  'triple',
  'guarantee',
  '100%',
  'risk-free',
  'urgent',
  'immediately',
  'verify',
  'confirm',
  'suspended',
  'banned',
  'compromised',
  'security',
  'support',
  'help',
  'recover',
  'restore',
  'unlock',
  'activate',
  'claim',
  'receive',
  'send',
  'transfer',
  'deposit',
  'withdraw',
  'wallet',
  'private key',
  'seed phrase',
  'mnemonic',
  '12 words',
  '24 words',
];

// Known malicious domains (placeholder - should be fetched from backend)
const MALICIOUS_DOMAINS = [
  'eth-giveaway.com',
  'crypto-reward.net',
  'free-eth.org',
  'claim-bonus.xyz',
];

class AIScamDetectionService {
  private userReputationCache: Map<string, number> = new Map();
  private messageHistory: Map<string, MessageToAnalyze[]> = new Map();

  /**
   * Analyze a message for potential scams
   */
  async analyzeMessage(message: MessageToAnalyze): Promise<ScamDetectionResult> {
    const warnings: ScamWarning[] = [];
    const detectedPatterns: string[] = [];
    const suspiciousKeywords: string[] = [];
    const suspiciousLinks: string[] = [];

    // Check for scam patterns
    const patternMatches = this.checkScamPatterns(message.content);
    if (patternMatches.length > 0) {
      detectedPatterns.push(...patternMatches);
      warnings.push({
        type: ScamWarningType.SUSPICIOUS_PATTERN,
        message: 'Message contains suspicious patterns commonly used in scams',
        severity: 'medium',
        evidence: patternMatches,
      });
    }

    // Check for suspicious keywords
    const keywordMatches = this.checkSuspiciousKeywords(message.content);
    if (keywordMatches.length > 0) {
      suspiciousKeywords.push(...keywordMatches);
      if (keywordMatches.length >= 3) {
        warnings.push({
          type: ScamWarningType.SUSPICIOUS_PATTERN,
          message: 'Message contains multiple suspicious keywords',
          severity: 'medium',
          evidence: keywordMatches,
        });
      }
    }

    // Check for malicious links
    const linkMatches = this.extractLinks(message.content);
    for (const link of linkMatches) {
      const isMalicious = await this.checkLinkSafety(link);
      if (isMalicious) {
        suspiciousLinks.push(link);
        warnings.push({
          type: ScamWarningType.MALICIOUS_URL,
          message: 'Message contains a potentially malicious link',
          severity: 'high',
          evidence: [link],
        });
      }
    }

    // Check for urgent action requests
    if (this.checkUrgentAction(message.content)) {
      warnings.push({
        type: ScamWarningType.URGENT_ACTION,
        message: 'Message attempts to create urgency and pressure you to act quickly',
        severity: 'medium',
      });
    }

    // Check for impersonation attempts
    if (await this.checkImpersonation(message)) {
      warnings.push({
        type: ScamWarningType.IMPERSONATION,
        message: 'Sender may be attempting to impersonate someone else',
        severity: 'high',
      });
    }

    // Check for fake support claims
    if (this.checkFakeSupport(message.content)) {
      warnings.push({
        type: ScamWarningType.FAKE_SUPPORT,
        message: 'Message claims to be from support but may be fake',
        severity: 'high',
      });
    }

    // Check for giveaway scams
    if (this.checkGiveawayScam(message.content)) {
      warnings.push({
        type: ScamWarningType.GIVEAWAY_SCAM,
        message: 'Message appears to be a giveaway scam',
        severity: 'high',
      });
    }

    // Check for investment scams
    if (this.checkInvestmentScam(message.content)) {
      warnings.push({
        type: ScamWarningType.INVESTMENT_SCAM,
        message: 'Message promises unrealistic investment returns',
        severity: 'high',
      });
    }

    // Check for wallet drain attempts
    if (this.checkWalletDrain(message.content)) {
      warnings.push({
        type: ScamWarningType.WALLET_DRAIN,
        message: 'Message may attempt to drain your wallet',
        severity: 'high',
      });
    }

    // Get sender reputation
    const senderReputation = await this.getSenderReputation(message.senderId);

    // Calculate message score
    const messageScore = this.calculateMessageScore(
      detectedPatterns,
      suspiciousKeywords,
      suspiciousLinks,
      senderReputation
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(messageScore, warnings);

    // Generate recommendations
    const recommendations = this.generateRecommendations(warnings, riskLevel);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(warnings, messageScore);

    return {
      isSuspicious: warnings.length > 0,
      confidence,
      riskLevel,
      warnings,
      analysis: {
        detectedPatterns,
        suspiciousKeywords,
        suspiciousLinks,
        senderReputation,
        messageScore,
        recommendations,
      },
    };
  }

  /**
   * Check for scam patterns in message content
   */
  private checkScamPatterns(content: string): string[] {
    const matches: string[] = [];
    
    for (const pattern of SCAM_PATTERNS) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    return matches;
  }

  /**
   * Check for suspicious keywords
   */
  private checkSuspiciousKeywords(content: string): string[] {
    const matches: string[] = [];
    const lowerContent = content.toLowerCase();

    for (const keyword of SUSPICIOUS_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        matches.push(keyword);
      }
    }

    return matches;
  }

  /**
   * Extract links from message content
   */
  private extractLinks(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);
    return matches || [];
  }

  /**
   * Check if a link is malicious
   */
  private async checkLinkSafety(url: string): Promise<boolean> {
    try {
      // Check against known malicious domains
      for (const domain of MALICIOUS_DOMAINS) {
        if (url.toLowerCase().includes(domain)) {
          return true;
        }
      }

      // In production, this would call a backend API for link checking
      // For now, we'll do basic checks
      const hostname = new URL(url).hostname;
      
      // Check for suspicious TLDs
      const suspiciousTLDs = ['.xyz', '.top', '.win', '.loan', '.credit'];
      if (suspiciousTLDs.some(tld => hostname.endsWith(tld))) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking link safety:', error);
      return false;
    }
  }

  /**
   * Check for urgent action requests
   */
  private checkUrgentAction(content: string): boolean {
    const urgentPhrases = [
      'act now',
      'immediately',
      'urgent',
      'asap',
      'right now',
      'don\'t wait',
      'limited time',
      'expiring soon',
      'last chance',
      'before it\'s too late',
    ];

    const lowerContent = content.toLowerCase();
    return urgentPhrases.some(phrase => lowerContent.includes(phrase));
  }

  /**
   * Check for impersonation attempts
   */
  private async checkImpersonation(message: MessageToAnalyze): Promise<boolean> {
    // In production, this would verify sender identity
    // For now, we'll check if the sender address is suspicious
    if (message.senderAddress) {
      // Check for impersonation patterns (e.g., similar to admin addresses)
      return false; // Placeholder
    }
    return false;
  }

  /**
   * Check for fake support claims
   */
  private checkFakeSupport(content: string): boolean {
    const fakeSupportPhrases = [
      'support team',
      'customer service',
      'help desk',
      'official support',
      'admin',
      'moderator',
    ];

    const lowerContent = content.toLowerCase();
    return fakeSupportPhrases.some(phrase => lowerContent.includes(phrase));
  }

  /**
   * Check for giveaway scams
   */
  private checkGiveawayScam(content: string): boolean {
    const giveawayPhrases = [
      'giveaway',
      'free eth',
      'free crypto',
      'claim bonus',
      'receive reward',
      'double your',
      'triple your',
    ];

    const lowerContent = content.toLowerCase();
    return giveawayPhrases.some(phrase => lowerContent.includes(phrase));
  }

  /**
   * Check for investment scams
   */
  private checkInvestmentScam(content: string): boolean {
    const investmentPhrases = [
      'guaranteed returns',
      'risk-free investment',
      '100% profit',
      'guarantee profit',
      'no risk',
      'sure thing',
    ];

    const lowerContent = content.toLowerCase();
    return investmentPhrases.some(phrase => lowerContent.includes(phrase));
  }

  /**
   * Check for wallet drain attempts
   */
  private checkWalletDrain(content: string): boolean {
    const drainPhrases = [
      'private key',
      'seed phrase',
      'mnemonic',
      '12 words',
      '24 words',
      'recover wallet',
      'restore wallet',
      'verify wallet',
      'connect wallet',
    ];

    const lowerContent = content.toLowerCase();
    return drainPhrases.some(phrase => lowerContent.includes(phrase));
  }

  /**
   * Get sender reputation score
   */
  private async getSenderReputation(senderId: string): Promise<number> {
    // Check cache first
    if (this.userReputationCache.has(senderId)) {
      return this.userReputationCache.get(senderId)!;
    }

    // In production, this would fetch from backend
    // For now, return a default score
    const reputation = 75; // Default neutral score
    this.userReputationCache.set(senderId, reputation);
    return reputation;
  }

  /**
   * Calculate message score (0-100, higher = more suspicious)
   */
  private calculateMessageScore(
    patterns: string[],
    keywords: string[],
    links: string[],
    reputation: number
  ): number {
    let score = 0;

    // Pattern score (up to 30 points)
    score += Math.min(patterns.length * 10, 30);

    // Keyword score (up to 25 points)
    score += Math.min(keywords.length * 5, 25);

    // Link score (up to 25 points)
    score += Math.min(links.length * 25, 25);

    // Reputation adjustment (up to 20 points)
    const reputationScore = (100 - reputation) / 5;
    score += reputationScore;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Determine risk level based on score and warnings
   */
  private determineRiskLevel(
    score: number,
    warnings: ScamWarning[]
  ): 'low' | 'medium' | 'high' {
    const highSeverityWarnings = warnings.filter(w => w.severity === 'high').length;
    
    if (highSeverityWarnings > 0 || score >= 70) {
      return 'high';
    }
    
    if (score >= 40 || warnings.length >= 3) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate recommendations based on warnings
   */
  private generateRecommendations(
    warnings: ScamWarning[],
    riskLevel: 'low' | 'medium' | 'high'
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'high') {
      recommendations.push('Do not click any links in this message');
      recommendations.push('Do not send any cryptocurrency or provide wallet information');
      recommendations.push('Block this user immediately');
      recommendations.push('Report this message to platform administrators');
    } else if (riskLevel === 'medium') {
      recommendations.push('Be cautious when interacting with this user');
      recommendations.push('Verify any requests through official channels');
      recommendations.push('Do not provide sensitive information');
    } else {
      recommendations.push('Proceed with caution');
    }

    return recommendations;
  }

  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(
    warnings: ScamWarning[],
    messageScore: number
  ): number {
    // More warnings = higher confidence
    // Higher score = higher confidence
    const warningConfidence = Math.min(warnings.length * 0.2, 0.8);
    const scoreConfidence = messageScore / 100;

    return Math.min(warningConfidence + scoreConfidence, 1);
  }

  /**
   * Clear reputation cache
   */
  clearReputationCache(): void {
    this.userReputationCache.clear();
  }

  /**
   * Clear message history
   */
  clearMessageHistory(): void {
    this.messageHistory.clear();
  }
}

// Export singleton instance
export const aiScamDetectionService = new AIScamDetectionService();

export default aiScamDetectionService;