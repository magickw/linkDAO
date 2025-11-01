import { describe, it, expect, beforeEach } from '@jest/globals';
import { RiskBasedDecisionEngine } from '../services/riskBasedDecisionEngine';

// Mock the database module
jest.mock('../db', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => Promise.resolve([])),
          limit: jest.fn(() => Promise.resolve([])),
        })),
        orderBy: jest.fn(() => Promise.resolve([])),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => Promise.resolve({})),
    })),
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve({})),
      })),
    })),
  }
}));

describe('RiskBasedDecisionEngine - Core Logic', () => {
  let decisionEngine: RiskBasedDecisionEngine;

  beforeEach(() => {
    decisionEngine = new RiskBasedDecisionEngine();
  });

  describe('calculateReputationModifier', () => {
    it('should return lower multiplier for high reputation users', () => {
      const highRepModifier = (decisionEngine as any).calculateReputationModifier(95);
      const lowRepModifier = (decisionEngine as any).calculateReputationModifier(15);
      
      expect(highRepModifier).toBeLessThan(lowRepModifier);
      expect(highRepModifier).toBe(0.7);
      expect(lowRepModifier).toBe(1.5);
    });

    it('should return appropriate multipliers for different reputation ranges', () => {
      expect((decisionEngine as any).calculateReputationModifier(90)).toBe(0.7);
      expect((decisionEngine as any).calculateReputationModifier(80)).toBe(0.8);
      expect((decisionEngine as any).calculateReputationModifier(70)).toBe(0.9);
      expect((decisionEngine as any).calculateReputationModifier(50)).toBe(1.0);
      expect((decisionEngine as any).calculateReputationModifier(30)).toBe(1.1);
      expect((decisionEngine as any).calculateReputationModifier(10)).toBe(1.3);
      expect((decisionEngine as any).calculateReputationModifier(5)).toBe(1.5);
    });
  });

  describe('calculateWalletRiskScore', () => {
    it('should assign higher risk to new wallets', () => {
      const newWalletRisk = (decisionEngine as any).calculateWalletRiskScore('0x1234567890123456789012345678901234567890', 0);
      const oldWalletRisk = (decisionEngine as any).calculateWalletRiskScore('0x1234567890123456789012345678901234567890', 100);
      
      expect(newWalletRisk).toBeGreaterThan(oldWalletRisk);
    });

    it('should detect suspicious wallet patterns', () => {
      const sequentialWallet = '0x0123456789abcdef0123456789abcdef01234567';
      const repeatedWallet = '0x1111111111111111111111111111111111111111';
      const normalWallet = '0x742d35cc6634c0532925a3b8d4c0b3e8c8c8c8c8';
      
      const sequentialRisk = (decisionEngine as any).calculateWalletRiskScore(sequentialWallet, 30);
      const repeatedRisk = (decisionEngine as any).calculateWalletRiskScore(repeatedWallet, 30);
      const normalRisk = (decisionEngine as any).calculateWalletRiskScore(normalWallet, 30);
      
      expect(sequentialRisk).toBeGreaterThan(normalRisk);
      expect(repeatedRisk).toBeGreaterThan(normalRisk);
    });
  });

  describe('calculateCategoryScores', () => {
    it('should properly weight vendor results', () => {
      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0.9,
          categories: ['hate_speech'],
          cost: 0.001,
          latency: 500,
          success: true
        },
        {
          vendor: 'perspective',
          confidence: 0.8,
          categories: ['hate_speech'],
          cost: 0.001,
          latency: 600,
          success: true
        }
      ];

      const categoryScores = (decisionEngine as any).calculateCategoryScores(vendorResults);
      
      expect(categoryScores.hate_speech).toBeGreaterThan(0);
      expect(categoryScores.hate_speech).toBeLessThan(1);
      
      // OpenAI has higher weight (0.4) than Perspective (0.3), so result should be closer to OpenAI
      const expectedScore = (0.9 * 0.4 + 0.8 * 0.3) / (0.4 + 0.3);
      expect(categoryScores.hate_speech).toBeCloseTo(expectedScore, 2);
    });

    it('should handle failed vendor results gracefully', () => {
      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0.9,
          categories: ['spam'],
          cost: 0.001,
          latency: 500,
          success: true
        },
        {
          vendor: 'perspective',
          confidence: 0,
          categories: [],
          cost: 0,
          latency: 0,
          success: false
        }
      ];

      const categoryScores = (decisionEngine as any).calculateCategoryScores(vendorResults);
      
      // Should only consider successful results
      expect(categoryScores.spam).toBeCloseTo(0.9, 1);
    });

    it('should handle safe content properly', () => {
      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0.1,
          categories: [],
          cost: 0.001,
          latency: 500,
          success: true
        }
      ];

      const categoryScores = (decisionEngine as any).calculateCategoryScores(vendorResults);
      
      expect(categoryScores.safe).toBeCloseTo(0.9, 1); // 1 - 0.1 confidence
    });
  });

  describe('determinePrimaryCategory', () => {
    it('should identify the highest scoring violation category', () => {
      const categoryScores = {
        spam: 0.6,
        hate_speech: 0.8,
        harassment: 0.4,
        safe: 0.2
      };

      const primaryCategory = (decisionEngine as any).determinePrimaryCategory(categoryScores, []);
      
      expect(primaryCategory).toBe('hate_speech');
    });

    it('should return safe when no violations detected', () => {
      const categoryScores = {
        safe: 0.9
      };

      const primaryCategory = (decisionEngine as any).determinePrimaryCategory(categoryScores, []);
      
      expect(primaryCategory).toBe('safe');
    });

    it('should return unknown when no categories present', () => {
      const categoryScores = {};

      const primaryCategory = (decisionEngine as any).determinePrimaryCategory(categoryScores, []);
      
      expect(primaryCategory).toBe('unknown');
    });
  });

  describe('calculateRiskScore', () => {
    it('should combine multiple risk factors appropriately', () => {
      const categoryScores = { hate_speech: 0.8 };
      const context = {
        userReputation: 30,
        walletRiskScore: 0.3,
        recentViolations: 2,
        accountAge: 5,
        contentType: 'post',
        hasLinks: true,
        hasMedia: false,
        isNewUser: true
      };

      const riskScore = (decisionEngine as any).calculateRiskScore(categoryScores, context, 'hate_speech');
      
      expect(riskScore).toBeGreaterThan(0.8); // Should be higher than base confidence due to risk factors
      expect(riskScore).toBeLessThanOrEqual(1.0);
    });

    it('should return low risk for safe content with good user', () => {
      const categoryScores = { safe: 0.9 };
      const context = {
        userReputation: 90,
        walletRiskScore: 0.1,
        recentViolations: 0,
        accountAge: 100,
        contentType: 'post',
        hasLinks: false,
        hasMedia: false,
        isNewUser: false
      };

      const riskScore = (decisionEngine as any).calculateRiskScore(categoryScores, context, 'safe');
      
      expect(riskScore).toBeLessThan(0.3);
    });
  });

  describe('calculateActionDuration', () => {
    it('should return undefined for allow actions', () => {
      const context = {
        userReputation: 50,
        walletRiskScore: 0.1,
        recentViolations: 0,
        accountAge: 30,
        contentType: 'post',
        hasLinks: false,
        hasMedia: false,
        isNewUser: false
      };

      const duration = (decisionEngine as any).calculateActionDuration('allow', context, 'spam');
      
      expect(duration).toBeUndefined();
    });

    it('should return longer durations for more severe violations', () => {
      const context = {
        userReputation: 50,
        walletRiskScore: 0.1,
        recentViolations: 0,
        accountAge: 30,
        contentType: 'post',
        hasLinks: false,
        hasMedia: false,
        isNewUser: false
      };

      const spamDuration = (decisionEngine as any).calculateActionDuration('block', context, 'spam');
      const hateDuration = (decisionEngine as any).calculateActionDuration('block', context, 'hate_speech');
      
      expect(hateDuration).toBeGreaterThan(spamDuration);
    });

    it('should increase duration for repeat offenders', () => {
      const baseContext = {
        userReputation: 50,
        walletRiskScore: 0.1,
        recentViolations: 0,
        accountAge: 30,
        contentType: 'post',
        hasLinks: false,
        hasMedia: false,
        isNewUser: false
      };

      const repeatContext = { ...baseContext, recentViolations: 3 };

      const baseDuration = (decisionEngine as any).calculateActionDuration('block', baseContext, 'spam');
      const repeatDuration = (decisionEngine as any).calculateActionDuration('block', repeatContext, 'spam');
      
      expect(repeatDuration).toBeGreaterThan(baseDuration);
    });
  });

  describe('calculateReputationImpact', () => {
    it('should return appropriate negative impacts for violations', () => {
      const spamImpact = (decisionEngine as any).calculateReputationImpact('limit', 'spam');
      const hateImpact = (decisionEngine as any).calculateReputationImpact('block', 'hate_speech');
      
      expect(spamImpact).toBeLessThan(0);
      expect(hateImpact).toBeLessThan(spamImpact); // More negative
    });

    it('should scale impact based on action severity', () => {
      const limitImpact = (decisionEngine as any).calculateReputationImpact('limit', 'spam');
      const blockImpact = (decisionEngine as any).calculateReputationImpact('block', 'spam');
      
      expect(blockImpact).toBeLessThan(limitImpact); // More negative
    });

    it('should scale impact based on violation category', () => {
      const spamImpact = (decisionEngine as any).calculateReputationImpact('block', 'spam');
      const seedPhraseImpact = (decisionEngine as any).calculateReputationImpact('block', 'seed_phrase');
      
      expect(seedPhraseImpact).toBeLessThan(spamImpact); // Much more negative
    });
  });

  describe('identifyRiskFactors', () => {
    it('should identify multiple risk factors correctly', () => {
      const context = {
        userId: 'test-user',
        walletAddress: '0x1234567890123456789012345678901234567890',
        accountAge: 5, // New account
        reputation: 25, // Low reputation
        totalPosts: 0,
        totalReactions: 0,
        totalTipsReceived: 0,
        recentViolations: 2, // Recent violations
        violationHistory: [],
        walletRiskFactors: {
          isNewWallet: true,
          hasSequentialPattern: true,
          hasRepeatedPattern: false,
          transactionVolume: 'low' as const,
          associatedRiskyWallets: 0,
          onChainReputation: 30
        },
        behaviorPatterns: {
          postingFrequency: 'suspicious' as const,
          engagementRatio: 0.05, // Low engagement
          tipRatio: 0,
          timePatterns: 'bot-like' as const,
          contentDiversity: 0.1
        }
      };

      const riskFactors = (decisionEngine as any).identifyRiskFactors(context);
      
      expect(riskFactors).toContain('New account');
      expect(riskFactors).toContain('2 recent violations');
      expect(riskFactors).toContain('New wallet');
      expect(riskFactors).toContain('Suspicious wallet pattern');
      expect(riskFactors).toContain('Suspicious posting frequency');
      expect(riskFactors).toContain('Bot-like behavior');
      expect(riskFactors).toContain('Low engagement');
      expect(riskFactors).toContain('Low reputation');
    });

    it('should return empty array for low-risk users', () => {
      const context = {
        userId: 'test-user',
        walletAddress: '0x742d35cc6634c0532925a3b8d4c0b3e8c8c8c8c8',
        accountAge: 100,
        reputation: 85,
        totalPosts: 50,
        totalReactions: 200,
        totalTipsReceived: 10,
        recentViolations: 0,
        violationHistory: [],
        walletRiskFactors: {
          isNewWallet: false,
          hasSequentialPattern: false,
          hasRepeatedPattern: false,
          transactionVolume: 'high' as const,
          associatedRiskyWallets: 0,
          onChainReputation: 80
        },
        behaviorPatterns: {
          postingFrequency: 'medium' as const,
          engagementRatio: 4.0,
          tipRatio: 0.2,
          timePatterns: 'normal' as const,
          contentDiversity: 0.8
        }
      };

      const riskFactors = (decisionEngine as any).identifyRiskFactors(context);
      
      expect(riskFactors).toHaveLength(0);
    });
  });

  describe('calculateConfidenceModifier', () => {
    it('should increase modifier for high-risk users', () => {
      const highRiskContext = {
        reputation: 20,
        recentViolations: 3
      };

      const lowRiskContext = {
        reputation: 90,
        recentViolations: 0
      };

      const highRiskModifier = (decisionEngine as any).calculateConfidenceModifier(0.8, highRiskContext, 'post');
      const lowRiskModifier = (decisionEngine as any).calculateConfidenceModifier(0.2, lowRiskContext, 'post');
      
      expect(highRiskModifier).toBeGreaterThan(lowRiskModifier);
    });

    it('should adjust for content type', () => {
      const context = { reputation: 50, recentViolations: 0 };
      
      const listingModifier = (decisionEngine as any).calculateConfidenceModifier(0.5, context, 'listing');
      const dmModifier = (decisionEngine as any).calculateConfidenceModifier(0.5, context, 'dm');
      const postModifier = (decisionEngine as any).calculateConfidenceModifier(0.5, context, 'post');
      
      expect(listingModifier).toBeGreaterThan(postModifier); // Stricter for listings
      expect(dmModifier).toBeLessThan(postModifier); // More lenient for DMs
    });

    it('should stay within reasonable bounds', () => {
      const extremeContext = { reputation: 0, recentViolations: 10 };
      
      const modifier = (decisionEngine as any).calculateConfidenceModifier(1.0, extremeContext, 'listing');
      
      expect(modifier).toBeGreaterThanOrEqual(0.5);
      expect(modifier).toBeLessThanOrEqual(2.0);
    });
  });
});
