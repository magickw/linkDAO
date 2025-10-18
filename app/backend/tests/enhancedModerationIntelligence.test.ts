import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { aiContentRiskScoringService } from '../src/services/aiContentRiskScoringService';
import { moderationWorkflowOptimizationService } from '../src/services/moderationWorkflowOptimizationService';
import { similarCaseMatchingService } from '../src/services/similarCaseMatchingService';
import { moderationQualityAssuranceService } from '../src/services/moderationQualityAssuranceService';

// Mock the database service
jest.mock('../src/services/databaseService', () => ({
  databaseService: {
    getDatabase: jest.fn(() => ({
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => Promise.resolve([]))
            }))
          }))
        }))
      })),
      insert: jest.fn(() => ({
        values: jest.fn(() => Promise.resolve())
      }))
    }))
  }
}));

// Mock the AI moderation orchestrator
jest.mock('../src/services/aiModerationOrchestrator', () => ({
  AIModerationOrchestrator: jest.fn(() => ({
    scanContent: jest.fn(() => Promise.resolve({
      overallConfidence: 0.85,
      primaryCategory: 'safe',
      action: 'allow',
      vendorResults: [],
      evidenceHash: 'test-hash',
      riskScore: 0.2
    }))
  }))
}));

describe('Enhanced Moderation Intelligence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Content Risk Scoring Service', () => {
    it('should assess content risk with multiple factors', async () => {
      const mockContent = {
        id: 'test-content-1',
        type: 'post' as const,
        text: 'This is a test post content',
        userId: 'user-123',
        userReputation: 85,
        walletAddress: '0x123...',
        metadata: {}
      };

      const assessment = await aiContentRiskScoringService.assessContentRisk(mockContent);

      expect(assessment).toBeDefined();
      expect(assessment.contentId).toBe(mockContent.id);
      expect(assessment.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallRiskScore).toBeLessThanOrEqual(1);
      expect(assessment.confidence).toBeGreaterThanOrEqual(0);
      expect(assessment.confidence).toBeLessThanOrEqual(1);
      expect(assessment.riskFactors).toBeInstanceOf(Array);
      expect(assessment.recommendedAction).toMatch(/^(allow|limit|block|review)$/);
      expect(assessment.explainabilityData).toBeDefined();
    });

    it('should return performance metrics', () => {
      const metrics = aiContentRiskScoringService.getPerformanceMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
      expect(metrics.precision).toBeGreaterThanOrEqual(0);
      expect(metrics.precision).toBeLessThanOrEqual(1);
      expect(metrics.recall).toBeGreaterThanOrEqual(0);
      expect(metrics.recall).toBeLessThanOrEqual(1);
      expect(metrics.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Moderation Workflow Optimization Service', () => {
    it('should optimize moderation queue', async () => {
      const optimization = await moderationWorkflowOptimizationService.optimizeQueue();

      expect(optimization).toBeDefined();
      expect(optimization.reorderedTasks).toBeInstanceOf(Array);
      expect(optimization.assignments).toBeInstanceOf(Array);
      expect(optimization.estimatedCompletionTime).toBeGreaterThanOrEqual(0);
      expect(optimization.reasoning).toBeDefined();
      expect(typeof optimization.reasoning).toBe('string');
    });

    it('should analyze workflow bottlenecks', async () => {
      const bottlenecks = await moderationWorkflowOptimizationService.analyzeBottlenecks();

      expect(bottlenecks).toBeInstanceOf(Array);
      bottlenecks.forEach(bottleneck => {
        expect(bottleneck.stage).toBeDefined();
        expect(bottleneck.averageWaitTime).toBeGreaterThanOrEqual(0);
        expect(bottleneck.taskCount).toBeGreaterThanOrEqual(0);
        expect(bottleneck.severity).toMatch(/^(low|medium|high|critical)$/);
        expect(bottleneck.recommendations).toBeInstanceOf(Array);
      });
    });

    it('should get workflow metrics', async () => {
      const metrics = await moderationWorkflowOptimizationService.getWorkflowMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(metrics.queueLength).toBeGreaterThanOrEqual(0);
      expect(metrics.throughputPerHour).toBeGreaterThanOrEqual(0);
      expect(metrics.bottlenecks).toBeInstanceOf(Array);
      expect(metrics.moderatorEfficiency).toBeInstanceOf(Array);
      expect(metrics.slaCompliance).toBeGreaterThanOrEqual(0);
      expect(metrics.slaCompliance).toBeLessThanOrEqual(1);
    });
  });

  describe('Similar Case Matching Service', () => {
    it('should find similar cases', async () => {
      const caseId = 'test-case-1';
      const similarCases = await similarCaseMatchingService.findSimilarCases(caseId, 5);

      expect(similarCases).toBeInstanceOf(Array);
      expect(similarCases.length).toBeLessThanOrEqual(5);
      
      similarCases.forEach(case_ => {
        expect(case_.caseId).toBeDefined();
        expect(case_.similarity).toBeGreaterThanOrEqual(0);
        expect(case_.similarity).toBeLessThanOrEqual(1);
        expect(case_.outcome).toBeDefined();
        expect(case_.confidence).toBeGreaterThanOrEqual(0);
        expect(case_.confidence).toBeLessThanOrEqual(1);
        expect(case_.features).toBeDefined();
      });
    });

    it('should build precedent database', async () => {
      const precedents = await similarCaseMatchingService.buildPrecedentDatabase();

      expect(precedents).toBeInstanceOf(Array);
      precedents.forEach(precedent => {
        expect(precedent.precedentId).toBeDefined();
        expect(precedent.pattern).toBeDefined();
        expect(precedent.consistency).toBeGreaterThanOrEqual(0);
        expect(precedent.consistency).toBeLessThanOrEqual(1);
        expect(precedent.outcomes).toBeInstanceOf(Array);
        expect(precedent.confidence).toBeGreaterThanOrEqual(0);
        expect(precedent.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should analyze decision consistency', async () => {
      const analysis = await similarCaseMatchingService.analyzeConsistency(30);

      expect(analysis).toBeDefined();
      expect(analysis.overallConsistency).toBeGreaterThanOrEqual(0);
      expect(analysis.overallConsistency).toBeLessThanOrEqual(1);
      expect(analysis.patternConsistency).toBeInstanceOf(Array);
      expect(analysis.moderatorConsistency).toBeInstanceOf(Array);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    it('should get decision recommendation', async () => {
      const caseId = 'test-case-1';
      const recommendation = await similarCaseMatchingService.getDecisionRecommendation(caseId);

      expect(recommendation).toBeDefined();
      expect(recommendation.recommendedOutcome).toMatch(/^(allow|limit|block|review)$/);
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
      expect(recommendation.reasoning).toBeDefined();
      expect(recommendation.precedents).toBeInstanceOf(Array);
      expect(recommendation.riskFactors).toBeInstanceOf(Array);
      expect(recommendation.mitigatingFactors).toBeInstanceOf(Array);
    });
  });

  describe('Moderation Quality Assurance Service', () => {
    it('should audit moderation decision', async () => {
      const caseId = 'test-case-1';
      const auditorId = 'auditor-123';
      
      const audit = await moderationQualityAssuranceService.auditModerationDecision(caseId, auditorId);

      expect(audit).toBeDefined();
      expect(audit.auditId).toBeDefined();
      expect(audit.caseId).toBe(caseId);
      expect(audit.auditorId).toBe(auditorId);
      expect(typeof audit.agreement).toBe('boolean');
      expect(audit.auditScore).toBeGreaterThanOrEqual(0);
      expect(audit.auditScore).toBeLessThanOrEqual(1);
      expect(audit.discrepancies).toBeInstanceOf(Array);
      expect(audit.actionItems).toBeInstanceOf(Array);
      expect(audit.auditDate).toBeInstanceOf(Date);
    });

    it('should calculate quality metrics', async () => {
      const moderatorId = 'mod-123';
      const metrics = await moderationQualityAssuranceService.calculateQualityMetrics(moderatorId, 30);

      expect(metrics).toBeDefined();
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(metrics.accuracy).toBeLessThanOrEqual(1);
      expect(metrics.consistency).toBeGreaterThanOrEqual(0);
      expect(metrics.consistency).toBeLessThanOrEqual(1);
      expect(metrics.efficiency).toBeGreaterThanOrEqual(0);
      expect(metrics.efficiency).toBeLessThanOrEqual(1);
      expect(metrics.appealRate).toBeGreaterThanOrEqual(0);
      expect(metrics.reversalRate).toBeGreaterThanOrEqual(0);
      expect(metrics.userSatisfaction).toBeGreaterThanOrEqual(0);
      expect(metrics.userSatisfaction).toBeLessThanOrEqual(1);
      expect(metrics.processingTime).toBeGreaterThanOrEqual(0);
      expect(metrics.slaCompliance).toBeGreaterThanOrEqual(0);
      expect(metrics.slaCompliance).toBeLessThanOrEqual(1);
    });

    it('should evaluate moderator performance', async () => {
      const moderatorId = 'mod-123';
      const performance = await moderationQualityAssuranceService.evaluateModeratorPerformance(moderatorId, 30);

      expect(performance).toBeDefined();
      expect(performance.moderatorId).toBe(moderatorId);
      expect(performance.metrics).toBeDefined();
      expect(performance.caseCount).toBeGreaterThanOrEqual(0);
      expect(performance.specializations).toBeInstanceOf(Array);
      expect(performance.strengths).toBeInstanceOf(Array);
      expect(performance.improvementAreas).toBeInstanceOf(Array);
      expect(performance.trainingRecommendations).toBeInstanceOf(Array);
      expect(performance.performanceGrade).toMatch(/^[A-D][+]?$/);
      expect(performance.trend).toMatch(/^(improving|stable|declining)$/);
    });

    it('should process feedback', async () => {
      const feedbackData = {
        sourceType: 'moderator' as const,
        caseId: 'case-123',
        moderatorId: 'mod-123',
        feedbackType: 'positive' as const,
        category: 'accuracy',
        description: 'Good decision making',
        actionTaken: 'none',
        resolved: true
      };

      const feedback = await moderationQualityAssuranceService.processFeedback(feedbackData);

      expect(feedback).toBeDefined();
      expect(feedback.feedbackId).toBeDefined();
      expect(feedback.sourceType).toBe(feedbackData.sourceType);
      expect(feedback.caseId).toBe(feedbackData.caseId);
      expect(feedback.moderatorId).toBe(feedbackData.moderatorId);
      expect(feedback.feedbackType).toBe(feedbackData.feedbackType);
      expect(feedback.createdAt).toBeInstanceOf(Date);
    });

    it('should create calibration session', async () => {
      const moderatorIds = ['mod-1', 'mod-2', 'mod-3'];
      const facilitatorId = 'facilitator-123';
      const objectives = ['Improve consistency', 'Policy alignment'];

      const session = await moderationQualityAssuranceService.createCalibrationSession(
        moderatorIds,
        facilitatorId,
        objectives
      );

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.moderatorIds).toEqual(moderatorIds);
      expect(session.facilitatorId).toBe(facilitatorId);
      expect(session.objectives).toEqual(objectives);
      expect(session.testCases).toBeInstanceOf(Array);
      expect(session.sessionDate).toBeInstanceOf(Date);
    });

    it('should generate training recommendations', async () => {
      const moderatorId = 'mod-123';
      const mockMetrics = {
        accuracy: 0.75,
        consistency: 0.70,
        efficiency: 0.80,
        appealRate: 0.15,
        reversalRate: 0.08,
        userSatisfaction: 0.85,
        processingTime: 45,
        slaCompliance: 0.88
      };
      const improvementAreas = ['accuracy', 'consistency'];

      const recommendations = await moderationQualityAssuranceService.generateTrainingRecommendations(
        moderatorId,
        mockMetrics,
        improvementAreas
      );

      expect(recommendations).toBeInstanceOf(Array);
      recommendations.forEach(rec => {
        expect(rec.moderatorId).toBe(moderatorId);
        expect(rec.trainingType).toMatch(/^(policy|consistency|efficiency|technology)$/);
        expect(rec.priority).toMatch(/^(low|medium|high|urgent)$/);
        expect(rec.description).toBeDefined();
        expect(rec.expectedOutcome).toBeDefined();
        expect(rec.estimatedDuration).toBeGreaterThan(0);
        expect(rec.prerequisites).toBeInstanceOf(Array);
        expect(rec.resources).toBeInstanceOf(Array);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work together for complete moderation intelligence workflow', async () => {
      // 1. Assess content risk
      const mockContent = {
        id: 'integration-test-1',
        type: 'post' as const,
        text: 'Test content for integration',
        userId: 'user-123',
        userReputation: 75,
        walletAddress: '0x123...',
        metadata: {}
      };

      const riskAssessment = await aiContentRiskScoringService.assessContentRisk(mockContent);
      expect(riskAssessment.recommendedAction).toMatch(/^(allow|limit|block|review)$/);

      // 2. Optimize workflow
      const optimization = await moderationWorkflowOptimizationService.optimizeQueue();
      expect(optimization.reorderedTasks).toBeInstanceOf(Array);

      // 3. Find similar cases
      const similarCases = await similarCaseMatchingService.findSimilarCases('test-case', 3);
      expect(similarCases).toBeInstanceOf(Array);

      // 4. Quality assurance
      const metrics = await moderationQualityAssuranceService.calculateQualityMetrics('mod-123', 30);
      expect(metrics.accuracy).toBeGreaterThanOrEqual(0);

      // All components should work without errors
      expect(true).toBe(true);
    });
  });
});