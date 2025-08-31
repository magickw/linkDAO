/**
 * A/B Testing Framework for Policy Threshold Optimization
 * Tests different policy configurations and measures effectiveness
 */

import request from 'supertest';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { Express } from 'express';
import { createTestApp } from '../../utils/testApp';
import { TestDatabase } from '../../utils/testDatabase';
import { MockAIServices } from '../../utils/mockAIServices';
import { ABTestingFramework } from '../../utils/abTestingFramework';
import { PolicyTestGenerator } from '../../utils/policyTestGenerator';
import { MetricsCollector } from '../../utils/metricsCollector';

describe('A/B Testing Framework - Policy Threshold Optimization', () => {
  let app: Express;
  let testDb: TestDatabase;
  let mockAI: MockAIServices;
  let abFramework: ABTestingFramework;
  let policyGenerator: PolicyTestGenerator;
  let metricsCollector: MetricsCollector;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
    
    mockAI = new MockAIServices();
    await mockAI.setup();
    
    app = createTestApp({
      database: testDb.getConnection(),
      aiServices: mockAI.getServices(),
      enableABTesting: true
    });
    
    abFramework = new ABTestingFramework();
    policyGenerator = new PolicyTestGenerator();
    metricsCollector = new MetricsCollector();
  });

  afterAll(async () => {
    await mockAI.cleanup();
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.reset();
    mockAI.reset();
    abFramework.reset();
    metricsCollector.reset();
  });

  describe('Confidence Threshold A/B Testing', () => {
    it('should test different confidence thresholds for auto-blocking', async () => {
      // Define test variants
      const variants = [
        { name: 'conservative', autoBlockThreshold: 0.95 },
        { name: 'moderate', autoBlockThreshold: 0.85 },
        { name: 'aggressive', autoBlockThreshold: 0.75 }
      ];

      const testContent = policyGenerator.generateMixedConfidenceContent(300);
      
      // Run A/B test for each variant
      for (const variant of variants) {
        abFramework.setVariant(variant.name, {
          autoBlockThreshold: variant.autoBlockThreshold
        });

        const variantResults = [];
        
        for (const content of testContent) {
          mockAI.setTextModerationResponse({
            confidence: content.expectedConfidence,
            categories: content.categories,
            action: content.expectedAction
          });

          const response = await request(app)
            .post('/api/content')
            .send({
              type: 'post',
              content: content.text,
              userId: `test-user-${content.id}`,
              abTestVariant: variant.name
            })
            .expect(200);

          variantResults.push({
            contentId: response.body.contentId,
            status: response.body.status,
            expectedAction: content.expectedAction,
            confidence: content.expectedConfidence
          });
        }

        // Collect metrics for this variant
        const metrics = await metricsCollector.calculateVariantMetrics(variant.name, variantResults);
        abFramework.recordVariantMetrics(variant.name, metrics);
      }

      // Analyze results
      const results = abFramework.analyzeResults();
      
      expect(results.variants).toHaveLength(3);
      expect(results.statisticalSignificance).toBeDefined();
      
      // Conservative should have lowest false positive rate
      const conservative = results.variants.find(v => v.name === 'conservative');
      const aggressive = results.variants.find(v => v.name === 'aggressive');
      
      expect(conservative.falsePositiveRate).toBeLessThan(aggressive.falsePositiveRate);
      expect(aggressive.throughput).toBeGreaterThan(conservative.throughput);
    });

    it('should test reputation-based threshold adjustments', async () => {
      const variants = [
        { name: 'flat_thresholds', reputationAdjustment: false },
        { name: 'linear_adjustment', reputationAdjustment: true, adjustmentFactor: 0.1 },
        { name: 'exponential_adjustment', reputationAdjustment: true, adjustmentFactor: 0.2 }
      ];

      const userProfiles = policyGenerator.generateUserProfiles(100);
      const testContent = policyGenerator.generateContentForUsers(userProfiles);

      for (const variant of variants) {
        abFramework.setVariant(variant.name, variant);

        const variantResults = [];

        for (const content of testContent) {
          mockAI.setTextModerationResponse({
            confidence: content.aiConfidence,
            categories: content.categories,
            action: 'review'
          });

          const response = await request(app)
            .post('/api/content')
            .send({
              type: 'post',
              content: content.text,
              userId: content.userId,
              abTestVariant: variant.name
            })
            .expect(200);

          variantResults.push({
            userId: content.userId,
            userReputation: content.userReputation,
            status: response.body.status,
            aiConfidence: content.aiConfidence
          });
        }

        const metrics = await metricsCollector.calculateReputationMetrics(variant.name, variantResults);
        abFramework.recordVariantMetrics(variant.name, metrics);
      }

      const results = abFramework.analyzeResults();
      
      // Reputation-based adjustments should show different patterns
      const flatThresholds = results.variants.find(v => v.name === 'flat_thresholds');
      const linearAdjustment = results.variants.find(v => v.name === 'linear_adjustment');
      
      expect(linearAdjustment.highReputationUserExperience).toBeGreaterThan(flatThresholds.highReputationUserExperience);
      expect(linearAdjustment.lowReputationUserSafety).toBeGreaterThan(flatThresholds.lowReputationUserSafety);
    });
  });

  describe('Policy Rule A/B Testing', () => {
    it('should test different policy rule configurations', async () => {
      const variants = [
        {
          name: 'strict_harassment',
          rules: {
            harassment: { threshold: 0.7, action: 'block' },
            hate: { threshold: 0.8, action: 'block' },
            violence: { threshold: 0.9, action: 'review' }
          }
        },
        {
          name: 'balanced_approach',
          rules: {
            harassment: { threshold: 0.8, action: 'review' },
            hate: { threshold: 0.85, action: 'block' },
            violence: { threshold: 0.85, action: 'review' }
          }
        },
        {
          name: 'lenient_content',
          rules: {
            harassment: { threshold: 0.9, action: 'review' },
            hate: { threshold: 0.9, action: 'review' },
            violence: { threshold: 0.8, action: 'review' }
          }
        }
      ];

      const testScenarios = policyGenerator.generatePolicyTestScenarios(200);

      for (const variant of variants) {
        abFramework.setVariant(variant.name, { policyRules: variant.rules });

        const variantResults = [];

        for (const scenario of testScenarios) {
          mockAI.setTextModerationResponse({
            confidence: scenario.confidence,
            categories: scenario.categories,
            action: scenario.expectedAction
          });

          const response = await request(app)
            .post('/api/content')
            .send({
              type: 'post',
              content: scenario.content,
              userId: scenario.userId,
              abTestVariant: variant.name
            })
            .expect(200);

          variantResults.push({
            scenario: scenario.type,
            categories: scenario.categories,
            confidence: scenario.confidence,
            actualStatus: response.body.status,
            expectedStatus: scenario.expectedStatus
          });
        }

        const metrics = await metricsCollector.calculatePolicyMetrics(variant.name, variantResults);
        abFramework.recordVariantMetrics(variant.name, metrics);
      }

      const results = abFramework.analyzeResults();
      
      // Verify different policy approaches show measurable differences
      expect(results.variants).toHaveLength(3);
      
      const strict = results.variants.find(v => v.name === 'strict_harassment');
      const lenient = results.variants.find(v => v.name === 'lenient_content');
      
      expect(strict.blockedContentRate).toBeGreaterThan(lenient.blockedContentRate);
      expect(lenient.userSatisfactionScore).toBeGreaterThan(strict.userSatisfactionScore);
    });

    it('should test marketplace-specific policy variations', async () => {
      const variants = [
        {
          name: 'high_value_strict',
          marketplaceRules: {
            highValueThreshold: 1000,
            requireProofOfOwnership: true,
            enhancedCounterfeitDetection: true
          }
        },
        {
          name: 'balanced_marketplace',
          marketplaceRules: {
            highValueThreshold: 5000,
            requireProofOfOwnership: false,
            enhancedCounterfeitDetection: true
          }
        },
        {
          name: 'low_friction',
          marketplaceRules: {
            highValueThreshold: 10000,
            requireProofOfOwnership: false,
            enhancedCounterfeitDetection: false
          }
        }
      ];

      const marketplaceListings = policyGenerator.generateMarketplaceListings(150);

      for (const variant of variants) {
        abFramework.setVariant(variant.name, variant);

        const variantResults = [];

        for (const listing of marketplaceListings) {
          mockAI.setMarketplaceModerationResponse({
            confidence: listing.riskScore,
            categories: listing.riskCategories,
            action: listing.expectedAction
          });

          const response = await request(app)
            .post('/api/marketplace/listings')
            .send({
              ...listing,
              abTestVariant: variant.name
            })
            .expect(200);

          variantResults.push({
            listingValue: listing.value,
            riskCategories: listing.riskCategories,
            actualStatus: response.body.status,
            processingTime: response.body.processingTime
          });
        }

        const metrics = await metricsCollector.calculateMarketplaceMetrics(variant.name, variantResults);
        abFramework.recordVariantMetrics(variant.name, metrics);
      }

      const results = abFramework.analyzeResults();
      
      const highValueStrict = results.variants.find(v => v.name === 'high_value_strict');
      const lowFriction = results.variants.find(v => v.name === 'low_friction');
      
      expect(highValueStrict.fraudDetectionRate).toBeGreaterThan(lowFriction.fraudDetectionRate);
      expect(lowFriction.listingCompletionRate).toBeGreaterThan(highValueStrict.listingCompletionRate);
    });
  });

  describe('Performance Impact A/B Testing', () => {
    it('should test performance impact of different AI vendor combinations', async () => {
      const variants = [
        {
          name: 'full_ensemble',
          vendors: ['openai', 'perspective', 'google_vision', 'aws_rekognition']
        },
        {
          name: 'dual_vendor',
          vendors: ['openai', 'perspective']
        },
        {
          name: 'single_vendor',
          vendors: ['openai']
        }
      ];

      const testContent = policyGenerator.generatePerformanceTestContent(100);

      for (const variant of variants) {
        abFramework.setVariant(variant.name, { enabledVendors: variant.vendors });

        const variantResults = [];
        const startTime = Date.now();

        for (const content of testContent) {
          mockAI.setVendorLatencies({
            openai: 300,
            perspective: 400,
            google_vision: 1500,
            aws_rekognition: 1200
          });

          const requestStart = Date.now();
          
          const response = await request(app)
            .post('/api/content')
            .send({
              type: content.type,
              content: content.text,
              userId: content.userId,
              abTestVariant: variant.name
            })
            .expect(200);

          const requestTime = Date.now() - requestStart;

          variantResults.push({
            requestTime,
            status: response.body.status,
            confidence: response.body.confidence
          });
        }

        const totalTime = Date.now() - startTime;
        const metrics = await metricsCollector.calculatePerformanceMetrics(variant.name, {
          results: variantResults,
          totalTime,
          vendorCount: variant.vendors.length
        });
        
        abFramework.recordVariantMetrics(variant.name, metrics);
      }

      const results = abFramework.analyzeResults();
      
      const fullEnsemble = results.variants.find(v => v.name === 'full_ensemble');
      const singleVendor = results.variants.find(v => v.name === 'single_vendor');
      
      expect(singleVendor.averageLatency).toBeLessThan(fullEnsemble.averageLatency);
      expect(fullEnsemble.accuracyScore).toBeGreaterThan(singleVendor.accuracyScore);
    });
  });

  describe('User Experience A/B Testing', () => {
    it('should test different appeal process configurations', async () => {
      const variants = [
        {
          name: 'low_stake_appeal',
          appealStake: 10,
          appealTimeLimit: 7 * 24 * 60 * 60 * 1000 // 7 days
        },
        {
          name: 'medium_stake_appeal',
          appealStake: 50,
          appealTimeLimit: 5 * 24 * 60 * 60 * 1000 // 5 days
        },
        {
          name: 'high_stake_appeal',
          appealStake: 100,
          appealTimeLimit: 3 * 24 * 60 * 60 * 1000 // 3 days
        }
      ];

      // First, create blocked content for appeals
      const blockedContent = policyGenerator.generateBlockedContent(60);
      const contentIds = [];

      for (const content of blockedContent) {
        mockAI.setTextModerationResponse({
          confidence: 0.92,
          categories: ['harassment'],
          action: 'block'
        });

        const response = await request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content.text,
            userId: content.userId
          })
          .expect(200);

        contentIds.push({
          contentId: response.body.contentId,
          userId: content.userId,
          legitimateAppeal: content.legitimateAppeal
        });
      }

      // Test appeal process for each variant
      for (const variant of variants) {
        abFramework.setVariant(variant.name, variant);

        const variantResults = [];
        const variantContentIds = contentIds.slice(0, 20); // 20 appeals per variant

        for (const { contentId, userId, legitimateAppeal } of variantContentIds) {
          const appealResponse = await request(app)
            .post('/api/appeals')
            .send({
              contentId,
              stakeAmount: variant.appealStake.toString(),
              reasoning: legitimateAppeal ? 'This was incorrectly flagged' : 'Random appeal',
              abTestVariant: variant.name
            })
            .expect(200);

          variantResults.push({
            appealId: appealResponse.body.appealId,
            stakeAmount: variant.appealStake,
            legitimateAppeal,
            appealSubmitted: true
          });
        }

        const metrics = await metricsCollector.calculateAppealMetrics(variant.name, variantResults);
        abFramework.recordVariantMetrics(variant.name, metrics);
      }

      const results = abFramework.analyzeResults();
      
      const lowStake = results.variants.find(v => v.name === 'low_stake_appeal');
      const highStake = results.variants.find(v => v.name === 'high_stake_appeal');
      
      expect(lowStake.appealSubmissionRate).toBeGreaterThan(highStake.appealSubmissionRate);
      expect(highStake.frivolousAppealRate).toBeLessThan(lowStake.frivolousAppealRate);
    });

    it('should test different notification and feedback mechanisms', async () => {
      const variants = [
        {
          name: 'detailed_feedback',
          provideFeedback: true,
          feedbackDetail: 'high',
          showConfidenceScore: true
        },
        {
          name: 'basic_feedback',
          provideFeedback: true,
          feedbackDetail: 'low',
          showConfidenceScore: false
        },
        {
          name: 'minimal_feedback',
          provideFeedback: false,
          feedbackDetail: 'none',
          showConfidenceScore: false
        }
      ];

      const testUsers = policyGenerator.generateTestUsers(90);
      
      for (const variant of variants) {
        abFramework.setVariant(variant.name, variant);

        const variantResults = [];
        const variantUsers = testUsers.slice(0, 30);

        for (const user of variantUsers) {
          const content = policyGenerator.generateUserContent(user);
          
          mockAI.setTextModerationResponse({
            confidence: content.expectedConfidence,
            categories: content.categories,
            action: content.expectedAction
          });

          const response = await request(app)
            .post('/api/content')
            .send({
              type: 'post',
              content: content.text,
              userId: user.id,
              abTestVariant: variant.name
            })
            .expect(200);

          // Simulate user feedback collection
          const userFeedback = await request(app)
            .get(`/api/user/feedback/${response.body.contentId}`)
            .set('Authorization', `Bearer ${user.token}`)
            .expect(200);

          variantResults.push({
            userId: user.id,
            contentStatus: response.body.status,
            feedbackProvided: userFeedback.body.feedbackProvided,
            userSatisfaction: userFeedback.body.satisfactionScore,
            understandsDecision: userFeedback.body.understandsDecision
          });
        }

        const metrics = await metricsCollector.calculateFeedbackMetrics(variant.name, variantResults);
        abFramework.recordVariantMetrics(variant.name, metrics);
      }

      const results = abFramework.analyzeResults();
      
      const detailedFeedback = results.variants.find(v => v.name === 'detailed_feedback');
      const minimalFeedback = results.variants.find(v => v.name === 'minimal_feedback');
      
      expect(detailedFeedback.userUnderstandingScore).toBeGreaterThan(minimalFeedback.userUnderstandingScore);
      expect(detailedFeedback.userSatisfactionScore).toBeGreaterThan(minimalFeedback.userSatisfactionScore);
    });
  });

  describe('Statistical Analysis and Reporting', () => {
    it('should provide comprehensive statistical analysis of A/B test results', async () => {
      // Run a comprehensive A/B test
      const variants = [
        { name: 'control', autoBlockThreshold: 0.9 },
        { name: 'treatment', autoBlockThreshold: 0.8 }
      ];

      const testContent = policyGenerator.generateStatisticalTestContent(1000);
      
      for (const variant of variants) {
        abFramework.setVariant(variant.name, variant);

        const variantResults = [];
        const variantContent = testContent.slice(0, 500);

        for (const content of variantContent) {
          mockAI.setTextModerationResponse({
            confidence: content.confidence,
            categories: content.categories,
            action: content.expectedAction
          });

          const response = await request(app)
            .post('/api/content')
            .send({
              type: 'post',
              content: content.text,
              userId: content.userId,
              abTestVariant: variant.name
            })
            .expect(200);

          variantResults.push({
            status: response.body.status,
            confidence: content.confidence,
            truePositive: content.truePositive,
            falsePositive: content.falsePositive
          });
        }

        const metrics = await metricsCollector.calculateComprehensiveMetrics(variant.name, variantResults);
        abFramework.recordVariantMetrics(variant.name, metrics);
      }

      const analysis = abFramework.performStatisticalAnalysis();
      
      expect(analysis.pValue).toBeDefined();
      expect(analysis.confidenceInterval).toBeDefined();
      expect(analysis.effectSize).toBeDefined();
      expect(analysis.statisticalPower).toBeDefined();
      expect(analysis.sampleSize).toBe(1000);
      
      // Should provide actionable recommendations
      expect(analysis.recommendation).toBeDefined();
      expect(analysis.recommendation.action).toMatch(/^(adopt|reject|continue_testing)$/);
      expect(analysis.recommendation.reasoning).toBeDefined();
    });

    it('should generate detailed A/B test reports', async () => {
      // Set up a multi-variant test
      const variants = [
        { name: 'baseline', config: { threshold: 0.9, reputation: false } },
        { name: 'lower_threshold', config: { threshold: 0.8, reputation: false } },
        { name: 'reputation_based', config: { threshold: 0.9, reputation: true } },
        { name: 'combined', config: { threshold: 0.8, reputation: true } }
      ];

      // Run abbreviated test for report generation
      for (const variant of variants) {
        abFramework.setVariant(variant.name, variant.config);
        
        // Simulate test results
        const simulatedMetrics = metricsCollector.generateSimulatedMetrics(variant.name, 250);
        abFramework.recordVariantMetrics(variant.name, simulatedMetrics);
      }

      const report = await abFramework.generateReport();
      
      expect(report.testId).toBeDefined();
      expect(report.testDuration).toBeDefined();
      expect(report.totalParticipants).toBe(1000);
      expect(report.variants).toHaveLength(4);
      
      // Report should include key metrics
      expect(report.keyMetrics).toContain('falsePositiveRate');
      expect(report.keyMetrics).toContain('falseNegativeRate');
      expect(report.keyMetrics).toContain('userSatisfaction');
      expect(report.keyMetrics).toContain('processingLatency');
      
      // Should include visualizations
      expect(report.charts).toBeDefined();
      expect(report.charts.conversionFunnel).toBeDefined();
      expect(report.charts.confidenceOverTime).toBeDefined();
      
      // Should provide business impact analysis
      expect(report.businessImpact).toBeDefined();
      expect(report.businessImpact.estimatedCostSavings).toBeDefined();
      expect(report.businessImpact.userExperienceImpact).toBeDefined();
    });
  });
});