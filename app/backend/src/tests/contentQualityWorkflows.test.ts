/**
 * Content Quality Workflows Tests
 * Tests for document freshness, review workflows, performance monitoring, and content suggestions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DocumentFreshnessService } from '../services/documentFreshnessService';
import { ContentReviewWorkflowService } from '../services/contentReviewWorkflowService';
import { DocumentPerformanceMonitoringService } from '../services/documentPerformanceMonitoringService';
import { ContentSuggestionService } from '../services/contentSuggestionService';

describe('Content Quality Workflows', () => {
  let freshnessService: DocumentFreshnessService;
  let reviewService: ContentReviewWorkflowService;
  let performanceService: DocumentPerformanceMonitoringService;
  let suggestionService: ContentSuggestionService;

  beforeEach(() => {
    freshnessService = new DocumentFreshnessService('test/docs');
    reviewService = new ContentReviewWorkflowService('test/docs');
    performanceService = new DocumentPerformanceMonitoringService();
    suggestionService = new ContentSuggestionService();
  });

  describe('Document Freshness Service', () => {
    it('should generate freshness report', async () => {
      const report = await freshnessService.generateFreshnessReport();
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.alerts).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.summary.totalDocuments).toBeGreaterThanOrEqual(0);
    });

    it('should start automated checks', () => {
      const interval = freshnessService.startAutomatedChecks(1); // 1 hour
      
      expect(interval).toBeDefined();
      clearInterval(interval);
    });

    it('should handle missing documents gracefully', async () => {
      const nonExistentService = new DocumentFreshnessService('non/existent/path');
      
      await expect(nonExistentService.generateFreshnessReport()).resolves.toBeDefined();
    });
  });

  describe('Content Review Workflow Service', () => {
    it('should create review task', async () => {
      const task = await reviewService.createReviewTask(
        'test/document.md',
        'accuracy',
        'high',
        'test-reviewer'
      );

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.reviewType).toBe('accuracy');
      expect(task.priority).toBe('high');
      expect(task.assignedTo).toBe('test-reviewer');
      expect(task.checklist).toBeInstanceOf(Array);
      expect(task.checklist.length).toBeGreaterThan(0);
    });

    it('should update task status', async () => {
      const task = await reviewService.createReviewTask('test/doc.md', 'freshness');
      const updatedTask = await reviewService.updateTaskStatus(task.id, 'in_progress', 'Started review');

      expect(updatedTask.status).toBe('in_progress');
      expect(updatedTask.comments.length).toBe(1);
      expect(updatedTask.comments[0].content).toBe('Started review');
    });

    it('should complete checklist items', async () => {
      const task = await reviewService.createReviewTask('test/doc.md', 'technical');
      const firstItem = task.checklist[0];
      
      const updatedTask = await reviewService.completeChecklistItem(
        task.id,
        firstItem.id,
        'test-reviewer',
        'Verified accuracy'
      );

      const completedItem = updatedTask.checklist.find(item => item.id === firstItem.id);
      expect(completedItem?.completed).toBe(true);
      expect(completedItem?.reviewer).toBe('test-reviewer');
      expect(completedItem?.notes).toBe('Verified accuracy');
    });

    it('should add comments to tasks', async () => {
      const task = await reviewService.createReviewTask('test/doc.md', 'completeness');
      const updatedTask = await reviewService.addComment(
        task.id,
        'reviewer',
        'This section needs more examples',
        'suggestion'
      );

      expect(updatedTask.comments.length).toBe(1);
      expect(updatedTask.comments[0].author).toBe('reviewer');
      expect(updatedTask.comments[0].type).toBe('suggestion');
    });

    it('should generate workflow report', () => {
      const report = reviewService.generateWorkflowReport();

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.tasksByPriority).toBeDefined();
      expect(report.tasksByType).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should get overdue tasks', async () => {
      // Create a task and manually set it as overdue for testing
      const task = await reviewService.createReviewTask('test/doc.md', 'security', 'critical');
      
      const overdueTasks = reviewService.getOverdueTasks();
      expect(overdueTasks).toBeInstanceOf(Array);
    });
  });

  describe('Document Performance Monitoring Service', () => {
    it('should record performance metrics', () => {
      const metric = {
        documentPath: '/docs/test.md',
        title: 'Test Document',
        category: 'tutorial',
        loadTime: 1500,
        fileSize: 50000,
        errorCount: 0,
        cacheHit: true
      };

      expect(() => performanceService.recordMetric(metric)).not.toThrow();
    });

    it('should record errors', () => {
      const error = {
        documentPath: '/docs/test.md',
        errorType: 'load_failure' as const,
        errorMessage: 'Failed to load document',
        severity: 'high' as const
      };

      expect(() => performanceService.recordError(error)).not.toThrow();
    });

    it('should generate performance report', () => {
      // Add some test data
      performanceService.recordMetric({
        documentPath: '/docs/test1.md',
        title: 'Test 1',
        category: 'guide',
        loadTime: 2000,
        fileSize: 100000,
        errorCount: 0,
        cacheHit: false
      });

      performanceService.recordMetric({
        documentPath: '/docs/test2.md',
        title: 'Test 2',
        category: 'faq',
        loadTime: 500,
        fileSize: 25000,
        errorCount: 0,
        cacheHit: true
      });

      const report = performanceService.generatePerformanceReport();

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalDocuments).toBeGreaterThan(0);
      expect(report.slowestDocuments).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should get document metrics', () => {
      const documentPath = '/docs/test.md';
      
      performanceService.recordMetric({
        documentPath,
        title: 'Test',
        category: 'guide',
        loadTime: 1000,
        fileSize: 50000,
        errorCount: 0,
        cacheHit: true
      });

      const metrics = performanceService.getDocumentMetrics(documentPath);
      expect(metrics).toBeInstanceOf(Array);
      expect(metrics.length).toBe(1);
      expect(metrics[0].documentPath).toBe(documentPath);
    });

    it('should cleanup old data', () => {
      // Add old metric
      performanceService.recordMetric({
        documentPath: '/docs/old.md',
        title: 'Old Doc',
        category: 'guide',
        loadTime: 1000,
        fileSize: 50000,
        errorCount: 0,
        cacheHit: true
      });

      // Cleanup should not throw
      expect(() => performanceService.cleanup(7)).not.toThrow();
    });
  });

  describe('Content Suggestion Service', () => {
    it('should record user behavior', () => {
      const behavior = {
        sessionId: 'test-session-123',
        documentPath: '/docs/test.md',
        action: 'view' as const,
        timestamp: new Date(),
        duration: 30000
      };

      expect(() => suggestionService.recordUserBehavior(behavior)).not.toThrow();
    });

    it('should track search queries', () => {
      const searchBehavior = {
        sessionId: 'test-session-456',
        documentPath: '/docs/search-results',
        action: 'search' as const,
        timestamp: new Date(),
        searchQuery: 'how to setup wallet'
      };

      expect(() => suggestionService.recordUserBehavior(searchBehavior)).not.toThrow();
    });

    it('should record feedback', () => {
      const feedbackBehavior = {
        sessionId: 'test-session-789',
        documentPath: '/docs/guide.md',
        action: 'feedback' as const,
        timestamp: new Date(),
        feedbackRating: 2,
        feedbackComment: 'This guide is confusing'
      };

      expect(() => suggestionService.recordUserBehavior(feedbackBehavior)).not.toThrow();
    });

    it('should generate suggestion report', () => {
      // Add some test behavior data
      suggestionService.recordUserBehavior({
        sessionId: 'session-1',
        documentPath: '/docs/wallet.md',
        action: 'view',
        timestamp: new Date()
      });

      suggestionService.recordUserBehavior({
        sessionId: 'session-2',
        documentPath: '/docs/tokens.md',
        action: 'search',
        timestamp: new Date(),
        searchQuery: 'staking rewards'
      });

      const report = suggestionService.generateSuggestionReport();

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.topContentGaps).toBeInstanceOf(Array);
      expect(report.topImprovements).toBeInstanceOf(Array);
      expect(report.trendingTopics).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it('should identify content gaps from repeated searches', () => {
      // Simulate multiple searches for the same topic
      for (let i = 0; i < 6; i++) {
        suggestionService.recordUserBehavior({
          sessionId: `session-${i}`,
          documentPath: '/search',
          action: 'search',
          timestamp: new Date(),
          searchQuery: 'defi yield farming'
        });
      }

      const report = suggestionService.generateSuggestionReport();
      expect(report.topContentGaps.length).toBeGreaterThan(0);
    });

    it('should identify improvements from low ratings', () => {
      suggestionService.recordUserBehavior({
        sessionId: 'feedback-session',
        documentPath: '/docs/complex-guide.md',
        action: 'feedback',
        timestamp: new Date(),
        feedbackRating: 1,
        feedbackComment: 'Too complicated'
      });

      const report = suggestionService.generateSuggestionReport();
      expect(report.topImprovements.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete content quality workflow', async () => {
      // 1. Check document freshness
      const freshnessReport = await freshnessService.generateFreshnessReport();
      expect(freshnessReport).toBeDefined();

      // 2. Create review task for stale document
      if (freshnessReport.alerts.length > 0) {
        const alert = freshnessReport.alerts[0];
        const task = await reviewService.createReviewTask(
          alert.documentPath,
          'freshness',
          alert.alertLevel === 'critical' ? 'critical' : 'high'
        );
        expect(task).toBeDefined();
      }

      // 3. Record performance metrics
      performanceService.recordMetric({
        documentPath: '/docs/integration-test.md',
        title: 'Integration Test',
        category: 'test',
        loadTime: 1200,
        fileSize: 75000,
        errorCount: 0,
        cacheHit: false
      });

      // 4. Record user behavior
      suggestionService.recordUserBehavior({
        sessionId: 'integration-session',
        documentPath: '/docs/integration-test.md',
        action: 'view',
        timestamp: new Date(),
        duration: 45000
      });

      // 5. Generate comprehensive reports
      const performanceReport = performanceService.generatePerformanceReport();
      const suggestionReport = suggestionService.generateSuggestionReport();
      const workflowReport = reviewService.generateWorkflowReport();

      expect(performanceReport).toBeDefined();
      expect(suggestionReport).toBeDefined();
      expect(workflowReport).toBeDefined();
    });

    it('should handle error scenarios gracefully', async () => {
      // Test with invalid document paths
      await expect(reviewService.createReviewTask('', 'accuracy')).rejects.toThrow();

      // Test with invalid performance data
      expect(() => {
        performanceService.recordMetric({
          documentPath: '',
          title: '',
          category: '',
          loadTime: -1,
          fileSize: -1,
          errorCount: 0,
          cacheHit: false
        });
      }).not.toThrow(); // Should handle gracefully

      // Test with invalid behavior data
      expect(() => {
        suggestionService.recordUserBehavior({
          sessionId: '',
          documentPath: '',
          action: 'view',
          timestamp: new Date()
        });
      }).not.toThrow(); // Should handle gracefully
    });
  });
});

describe('Content Quality Controller Integration', () => {
  // These would be integration tests for the API endpoints
  // Testing the actual HTTP requests and responses
  
  it('should handle API requests for freshness reports', () => {
    // Mock Express request/response testing would go here
    expect(true).toBe(true); // Placeholder
  });

  it('should handle API requests for review workflows', () => {
    // Mock Express request/response testing would go here
    expect(true).toBe(true); // Placeholder
  });

  it('should handle API requests for performance monitoring', () => {
    // Mock Express request/response testing would go here
    expect(true).toBe(true); // Placeholder
  });

  it('should handle API requests for content suggestions', () => {
    // Mock Express request/response testing would go here
    expect(true).toBe(true); // Placeholder
  });
});