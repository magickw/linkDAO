import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { RiskBasedDecisionEngine } from '../services/riskBasedDecisionEngine';
import { db } from '../db';

// Mock the database
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  }
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('RiskBasedDecisionEngine', () => {
  let decisionEngine: RiskBasedDecisionEngine;

  beforeEach(() => {
    decisionEngine = new RiskBasedDecisionEngine();
    jest.clearAllMocks();
    
    // Mock policy loading
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue([
            {
              id: 1,
              category: 'hate_speech',
              severity: 'critical',
              confidenceThreshold: '0.95',
              action: 'block',
              reputationModifier: '-0.2',
              description: 'Hate speech detection',
              isActive: true
            },
            {
              id: 2,
              category: 'spam',
              severity: 'medium',
              confidenceThreshold: '0.80',
              action: 'limit',
              reputationModifier: '-0.05',
              description: 'Spam detection',
              isActive: true
            }
          ])
        })
      })
    } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('makeDecision', () => {
    it('should allow content with low confidence scores', async () => {
      const content = {
        id: 'test-content-1',
        type: 'post' as const,
        text: 'This is a normal post',
        userId: 'user-123',
        userReputation: 75,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {}
      };

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

      // Mock user info query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
              walletAddress: content.walletAddress
            }])
          })
        })
      } as any);

      // Mock recent violations query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }])
        })
      } as any);

      // Mock insert for logging
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      } as any);

      const decision = await decisionEngine.makeDecision(content, vendorResults);

      expect(decision.action).toBe('allow');
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.riskScore).toBeLessThan(0.5);
    });

    it('should block content with high confidence hate speech detection', async () => {
      const content = {
        id: 'test-content-2',
        type: 'post' as const,
        text: 'This contains hate speech',
        userId: 'user-123',
        userReputation: 50,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {}
      };

      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0.98,
          categories: ['hate_speech'],
          cost: 0.001,
          latency: 500,
          success: true
        },
        {
          vendor: 'perspective',
          confidence: 0.95,
          categories: ['hate_speech'],
          cost: 0.001,
          latency: 600,
          success: true
        }
      ];

      // Mock user info query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              walletAddress: content.walletAddress
            }])
          })
        })
      } as any);

      // Mock recent violations query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }])
        })
      } as any);

      // Mock insert for logging
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      } as any);

      const decision = await decisionEngine.makeDecision(content, vendorResults);

      expect(decision.action).toBe('block');
      expect(decision.primaryCategory).toBe('hate_speech');
      expect(decision.confidence).toBeGreaterThan(0.9);
      expect(decision.riskScore).toBeGreaterThan(0.8);
    });

    it('should apply stricter thresholds for new users', async () => {
      const content = {
        id: 'test-content-3',
        type: 'post' as const,
        text: 'Borderline content',
        userId: 'user-new',
        userReputation: 30,
        walletAddress: '0x9876543210987654321098765432109876543210',
        metadata: {}
      };

      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0.75,
          categories: ['spam'],
          cost: 0.001,
          latency: 500,
          success: true
        }
      ];

      // Mock user info query - new user (created yesterday)
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
              walletAddress: content.walletAddress
            }])
          })
        })
      } as any);

      // Mock recent violations query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }])
        })
      } as any);

      // Mock insert for logging
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      } as any);

      const decision = await decisionEngine.makeDecision(content, vendorResults);

      // New user with low reputation should get stricter treatment
      expect(decision.action).toBe('review');
      expect(decision.thresholdAdjustments.spam).toBeGreaterThan(1.0);
    });

    it('should escalate repeat offenders', async () => {
      const content = {
        id: 'test-content-4',
        type: 'post' as const,
        text: 'Another violation',
        userId: 'user-repeat',
        userReputation: 25,
        walletAddress: '0x1111111111111111111111111111111111111111',
        metadata: {}
      };

      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0.75,
          categories: ['spam'],
          cost: 0.001,
          latency: 500,
          success: true
        }
      ];

      // Mock user info query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
              walletAddress: content.walletAddress
            }])
          })
        })
      } as any);

      // Mock recent violations query - repeat offender
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 4 }]) // 4 recent violations
        })
      } as any);

      // Mock insert for logging
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      } as any);

      const decision = await decisionEngine.makeDecision(content, vendorResults);

      // Repeat offender should get blocked even with moderate confidence
      expect(decision.action).toBe('block');
      expect(decision.reasoning).toContain('Repeat offender');
    });

    it('should handle vendor failures gracefully', async () => {
      const content = {
        id: 'test-content-5',
        type: 'post' as const,
        text: 'Test content',
        userId: 'user-123',
        userReputation: 75,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {}
      };

      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0,
          categories: [],
          cost: 0,
          latency: 0,
          success: false,
          error: 'API timeout'
        }
      ];

      // Mock user info query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              walletAddress: content.walletAddress
            }])
          })
        })
      } as any);

      // Mock recent violations query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }])
        })
      } as any);

      // Mock insert for logging
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue({})
      } as any);

      const decision = await decisionEngine.makeDecision(content, vendorResults);

      // Should default to allow when no successful vendor results
      expect(decision.action).toBe('allow');
      expect(decision.confidence).toBe(0);
    });

    it('should apply content-type specific rules', async () => {
      const dmContent = {
        id: 'test-dm-1',
        type: 'dm' as const,
        text: 'Private message with mild spam',
        userId: 'user-123',
        userReputation: 60,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {}
      };

      const listingContent = {
        id: 'test-listing-1',
        type: 'listing' as const,
        text: 'NFT for sale with mild spam',
        userId: 'user-123',
        userReputation: 60,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {}
      };

      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0.75,
          categories: ['spam'],
          cost: 0.001,
          latency: 500,
          success: true
        }
      ];

      // Mock user info and violations for both tests
      const mockUserQuery = () => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              walletAddress: dmContent.walletAddress
            }])
          })
        })
      });

      const mockViolationsQuery = () => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 0 }])
        })
      });

      // Mock insert for logging
      const mockInsert = () => ({
        values: jest.fn().mockResolvedValue({})
      });

      // Test DM (more lenient)
      mockDb.select.mockReturnValueOnce(mockUserQuery() as any);
      mockDb.select.mockReturnValueOnce(mockViolationsQuery() as any);
      mockDb.insert.mockReturnValue(mockInsert() as any);

      const dmDecision = await decisionEngine.makeDecision(dmContent, vendorResults);

      // Test listing (stricter)
      mockDb.select.mockReturnValueOnce(mockUserQuery() as any);
      mockDb.select.mockReturnValueOnce(mockViolationsQuery() as any);
      mockDb.insert.mockReturnValue(mockInsert() as any);

      const listingDecision = await decisionEngine.makeDecision(listingContent, vendorResults);

      // DM should be more lenient than listing
      expect(dmDecision.thresholdAdjustments.spam).toBeLessThan(listingDecision.thresholdAdjustments.spam);
    });

    it('should handle links and media with increased scrutiny', async () => {
      const contentWithLinks = {
        id: 'test-content-links',
        type: 'post' as const,
        text: 'Check out this link',
        links: ['https://suspicious-site.com'],
        userId: 'user-123',
        userReputation: 60,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {}
      };

      const contentWithMedia = {
        id: 'test-content-media',
        type: 'post' as const,
        text: 'Check out this image',
        media: [{
          url: 'https://example.com/image.jpg',
          type: 'image' as const,
          mimeType: 'image/jpeg',
          size: 1024000
        }],
        userId: 'user-123',
        userReputation: 60,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {}
      };

      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0.70,
          categories: ['spam'],
          cost: 0.001,
          latency: 500,
          success: true
        }
      ];

      // Mock queries for both tests
      const mockQueries = () => {
        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                walletAddress: contentWithLinks.walletAddress
              }])
            })
          })
        } as any);

        mockDb.select.mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }])
          })
        } as any);

        mockDb.insert.mockReturnValue({
          values: jest.fn().mockResolvedValue({})
        } as any);
      };

      // Test content with links
      mockQueries();
      const linksDecision = await decisionEngine.makeDecision(contentWithLinks, vendorResults);

      // Test content with media
      mockQueries();
      const mediaDecision = await decisionEngine.makeDecision(contentWithMedia, vendorResults);

      // Both should have higher risk scores due to links/media
      expect(linksDecision.riskScore).toBeGreaterThan(0.5);
      expect(mediaDecision.riskScore).toBeGreaterThan(0.5);
      expect(linksDecision.thresholdAdjustments.spam).toBeGreaterThan(1.0);
      expect(mediaDecision.thresholdAdjustments.spam).toBeGreaterThan(1.0);
    });
  });

  describe('calculateActionDuration', () => {
    it('should return appropriate durations for different actions and categories', () => {
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

      // Test limit action for spam
      const spamLimitDuration = (decisionEngine as any).calculateActionDuration('limit', context, 'spam');
      expect(spamLimitDuration).toBeGreaterThan(0);
      expect(spamLimitDuration).toBeLessThan(7 * 24 * 60 * 60); // Less than 7 days

      // Test block action for hate speech
      const hateSpeechBlockDuration = (decisionEngine as any).calculateActionDuration('block', context, 'hate_speech');
      expect(hateSpeechBlockDuration).toBeGreaterThan(spamLimitDuration);

      // Test that repeat offenders get longer durations
      const repeatOffenderContext = { ...context, recentViolations: 3 };
      const repeatOffenderDuration = (decisionEngine as any).calculateActionDuration('block', repeatOffenderContext, 'spam');
      const normalDuration = (decisionEngine as any).calculateActionDuration('block', context, 'spam');
      expect(repeatOffenderDuration).toBeGreaterThan(normalDuration);
    });
  });

  describe('updatePolicy', () => {
    it('should update policy configuration', async () => {
      const policyUpdate = {
        id: 1,
        category: 'hate_speech',
        severity: 'critical' as const,
        confidenceThreshold: 0.90,
        action: 'block' as const,
        reputationModifier: -0.3,
        description: 'Updated hate speech policy',
        isActive: true
      };

      // Mock update query
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue({})
        })
      } as any);

      const result = await decisionEngine.updatePolicy(policyUpdate);

      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getDecisionStats', () => {
    it('should return decision statistics', async () => {
      // Mock stats query
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([
            {
              decision: 'allow',
              reasonCode: 'safe',
              confidence: '0.9',
              riskScore: '0.1'
            },
            {
              decision: 'block',
              reasonCode: 'hate_speech',
              confidence: '0.95',
              riskScore: '0.9'
            },
            {
              decision: 'limit',
              reasonCode: 'spam',
              confidence: '0.8',
              riskScore: '0.6'
            }
          ])
        })
      } as any);

      const stats = await decisionEngine.getDecisionStats('day');

      expect(stats.totalDecisions).toBe(3);
      expect(stats.actionBreakdown.allow).toBe(1);
      expect(stats.actionBreakdown.block).toBe(1);
      expect(stats.actionBreakdown.limit).toBe(1);
      expect(stats.categoryBreakdown.safe).toBe(1);
      expect(stats.categoryBreakdown.hate_speech).toBe(1);
      expect(stats.categoryBreakdown.spam).toBe(1);
      expect(stats.averageConfidence).toBeCloseTo(0.883, 2);
      expect(stats.averageRiskScore).toBeCloseTo(0.533, 2);
    });
  });

  describe('error handling', () => {
    it('should return safe fallback decision on database errors', async () => {
      const content = {
        id: 'test-error',
        type: 'post' as const,
        text: 'Test content',
        userId: 'user-123',
        userReputation: 75,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {}
      };

      const vendorResults = [
        {
          vendor: 'openai',
          confidence: 0.8,
          categories: ['spam'],
          cost: 0.001,
          latency: 500,
          success: true
        }
      ];

      // Mock database error
      mockDb.select.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const decision = await decisionEngine.makeDecision(content, vendorResults);

      expect(decision.action).toBe('review');
      expect(decision.confidence).toBe(0);
      expect(decision.primaryCategory).toBe('error');
      expect(decision.reasoning).toContain('Decision engine error');
    });
  });
});