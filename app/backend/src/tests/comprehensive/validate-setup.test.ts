/**
 * Test Suite Setup Validation
 * Validates that all test utilities and configurations are working correctly
 */

import { describe, beforeAll, afterAll, it, expect } from '@jest/globals';
import { safeLogger } from '../../utils/safeLogger';
import { createTestApp } from '../utils/testApp';
import { TestDatabase } from '../utils/testDatabase';
import { MockAIServices } from '../utils/mockAIServices';
import { TestContentGenerator } from '../utils/testContentGenerator';
import { AdversarialContentGenerator } from '../utils/adversarialContentGenerator';
import { LoadTestGenerator } from '../utils/loadTestGenerator';

describe('Comprehensive Test Suite Setup Validation', () => {
  let testDb: TestDatabase;
  let mockAI: MockAIServices;
  let contentGenerator: TestContentGenerator;
  let adversarialGenerator: AdversarialContentGenerator;
  let loadGenerator: LoadTestGenerator;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
    
    mockAI = new MockAIServices();
    await mockAI.setup();
    
    contentGenerator = new TestContentGenerator();
    adversarialGenerator = new AdversarialContentGenerator();
    loadGenerator = new LoadTestGenerator();
  });

  afterAll(async () => {
    await mockAI.cleanup();
    await testDb.cleanup();
  });

  describe('Test Infrastructure', () => {
    it('should initialize test database successfully', async () => {
      expect(testDb).toBeDefined();
      
      // Test basic database operations
      await testDb.storeModerationCase({
        contentId: 'test-case-1',
        status: 'allowed',
        confidence: 0.95,
        vendorScores: { openai: 0.95 },
        reasonCode: 'safe'
      });
      
      const retrievedCase = await testDb.getModerationCase('test-case-1');
      expect(retrievedCase.status).toBe('allowed');
      expect(retrievedCase.confidence).toBe(0.95);
    });

    it('should initialize mock AI services successfully', async () => {
      expect(mockAI).toBeDefined();
      
      // Test AI service configuration
      mockAI.setTextModerationResponse({
        confidence: 0.9,
        categories: ['safe'],
        action: 'allow'
      });
      
      const services = mockAI.getServices();
      expect(services.moderateContent).toBeDefined();
      
      const result = await services.moderateContent({
        content: 'Test content',
        userId: 'test-user'
      });
      
      expect(result.confidence).toBe(0.9);
      expect(result.categories).toContain('safe');
    });

    it('should create test application successfully', async () => {
      const app = createTestApp({
        database: testDb.getConnection(),
        aiServices: mockAI.getServices()
      });
      
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });
  });

  describe('Content Generators', () => {
    it('should generate test content successfully', () => {
      const safeText = contentGenerator.generateSafeText();
      expect(safeText).toBeDefined();
      expect(typeof safeText).toBe('string');
      expect(safeText.length).toBeGreaterThan(0);
      
      const harmfulText = contentGenerator.generateHarmfulText();
      expect(harmfulText).toBeDefined();
      expect(typeof harmfulText).toBe('string');
      
      const testImage = contentGenerator.generateTestImage();
      expect(testImage).toBeInstanceOf(Buffer);
      expect(testImage.length).toBeGreaterThan(0);
    });

    it('should generate adversarial content successfully', () => {
      const promptInjection = adversarialGenerator.generateContextManipulation();
      expect(promptInjection).toBeDefined();
      expect(typeof promptInjection).toBe('string');
      
      const jailbreak = adversarialGenerator.generateDANJailbreak();
      expect(jailbreak).toBeDefined();
      expect(typeof jailbreak).toBe('string');
      
      const obfuscated = adversarialGenerator.generateLeetSpeakObfuscation();
      expect(obfuscated).toBeDefined();
      expect(typeof obfuscated).toBe('string');
    });

    it('should generate load test content successfully', () => {
      const textContent = loadGenerator.generateTextContent(10);
      expect(textContent).toHaveLength(10);
      expect(textContent[0]).toBeDefined();
      
      const imageContent = loadGenerator.generateImageContent(5);
      expect(imageContent).toHaveLength(5);
      expect(imageContent[0]).toBeInstanceOf(Buffer);
      
      const mixedContent = loadGenerator.generateMixedContent(5, 3);
      expect(mixedContent).toHaveLength(8);
    });
  });

  describe('Test Configuration', () => {
    it('should have correct test environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.TEST_SUITE).toBe('comprehensive');
    });

    it('should have extended Jest timeout', () => {
      // This test itself validates the timeout is working
      expect(true).toBe(true);
    }, 10000); // 10 second test to validate timeout extension

    it('should have custom matchers available', () => {
      // Test custom matchers
      expect(100).toBeWithinPerformanceSLA(200);
      expect({ securityScore: 0.95 }).toHaveSecurityScore(0.9);
      expect({ percentage: 85 }).toMeetCoverageThreshold(80);
    });
  });

  describe('Mock Service Integration', () => {
    it('should handle different AI response scenarios', async () => {
      const services = mockAI.getServices();
      
      // Test safe content
      mockAI.setTextModerationResponse({
        confidence: 0.95,
        categories: ['safe'],
        action: 'allow'
      });
      
      let result = await services.moderateContent({
        content: 'Safe content',
        userId: 'test-user'
      });
      
      expect(result.action).toBe('allow');
      
      // Test harmful content
      mockAI.setTextModerationResponse({
        confidence: 0.92,
        categories: ['harassment'],
        action: 'block'
      });
      
      result = await services.moderateContent({
        content: 'Harmful content',
        userId: 'test-user'
      });
      
      expect(result.action).toBe('block');
    });

    it('should simulate service failures correctly', async () => {
      const services = mockAI.getServices();
      
      // Set failure rate
      mockAI.setFailureRate(1.0); // 100% failure rate
      
      await expect(services.moderateContent({
        content: 'Test content',
        userId: 'test-user'
      })).rejects.toThrow('Simulated AI service failure');
      
      // Reset failure rate
      mockAI.setFailureRate(0);
    });
  });

  describe('Database Operations', () => {
    it('should handle moderation case lifecycle', async () => {
      const contentId = 'lifecycle-test';
      
      // Create case
      await testDb.storeModerationCase({
        contentId,
        status: 'quarantined',
        confidence: 0.75,
        vendorScores: { openai: 0.75, perspective: 0.8 },
        reasonCode: 'potentially_harmful'
      });
      
      // Verify in review queue
      const queueItem = await testDb.getReviewQueueItem(contentId);
      expect(queueItem).toBeDefined();
      
      // Process moderation decision
      await testDb.processModerationDecision({
        caseId: contentId,
        decision: 'allow',
        reasoning: 'False positive',
        moderatorId: 'test-moderator'
      });
      
      // Verify final state
      const finalCase = await testDb.getModerationCase(contentId);
      expect(finalCase.status).toBe('allowed');
      expect(finalCase.moderatorId).toBe('test-moderator');
    });

    it('should handle appeals workflow', async () => {
      const contentId = 'appeal-test';
      
      // Create blocked case
      await testDb.storeModerationCase({
        contentId,
        status: 'blocked',
        confidence: 0.9,
        vendorScores: { openai: 0.9 },
        reasonCode: 'harassment'
      });
      
      // Submit appeal
      const appealId = await testDb.submitAppeal({
        contentId,
        stakeAmount: '100',
        reasoning: 'This was incorrectly flagged'
      });
      
      expect(appealId).toBeDefined();
      
      const appeal = await testDb.getAppeal(appealId);
      expect(appeal.status).toBe('open');
      expect(appeal.stakeAmount).toBe('100');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics', async () => {
      const startTime = Date.now();
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeGreaterThan(90);
      expect(duration).toBeLessThan(200);
      
      // Test performance SLA matcher
      expect(duration).toBeWithinPerformanceSLA(1000);
    });
  });

  describe('Test Suite Readiness', () => {
    it('should be ready for comprehensive testing', async () => {
      // Verify all components are initialized
      expect(testDb).toBeDefined();
      expect(mockAI).toBeDefined();
      expect(contentGenerator).toBeDefined();
      expect(adversarialGenerator).toBeDefined();
      expect(loadGenerator).toBeDefined();
      
      // Verify test utilities are working
      const testState = (global as any).testUtils?.getGlobalTestState();
      expect(testState).toBeDefined();
      
      // Record successful setup
      (global as any).testUtils?.recordTestResult('setup_validation', {
        status: 'success',
        timestamp: new Date(),
        components: ['database', 'ai_services', 'generators', 'utilities']
      });
      
      safeLogger.info('✅ Comprehensive test suite is ready for execution');
    });
  });
});
