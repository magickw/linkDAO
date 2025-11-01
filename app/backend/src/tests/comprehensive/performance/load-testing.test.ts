/**
 * Performance Tests for Concurrent Load Handling
 * Tests system performance under various load conditions
 */

import request from 'supertest';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { Express } from 'express';
import { createTestApp } from '../../utils/testApp';
import { TestDatabase } from '../../utils/testDatabase';
import { MockAIServices } from '../../utils/mockAIServices';
import { LoadTestGenerator } from '../../utils/loadTestGenerator';
import { PerformanceMonitor } from '../../utils/performanceMonitor';

describe('Performance Testing - Concurrent Load Handling', () => {
  let app: Express;
  let testDb: TestDatabase;
  let mockAI: MockAIServices;
  let loadGenerator: LoadTestGenerator;
  let perfMonitor: PerformanceMonitor;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
    
    mockAI = new MockAIServices();
    await mockAI.setup();
    
    app = createTestApp({
      database: testDb.getConnection(),
      aiServices: mockAI.getServices(),
      enablePerformanceMode: true
    });
    
    loadGenerator = new LoadTestGenerator();
    perfMonitor = new PerformanceMonitor();
  });

  afterAll(async () => {
    await mockAI.cleanup();
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.reset();
    mockAI.reset();
    perfMonitor.reset();
  });

  describe('Text Content Load Testing', () => {
    it('should handle 100 concurrent text submissions within SLA', async () => {
      const concurrentRequests = 100;
      const textContents = loadGenerator.generateTextContent(concurrentRequests);
      
      mockAI.setDefaultTextResponse({
        confidence: 0.85,
        categories: ['safe'],
        action: 'allow',
        latency: 500 // 500ms simulated AI latency
      });

      perfMonitor.startTest('concurrent_text_100');
      
      const promises = textContents.map((content, index) => 
        request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content,
            userId: `user-${index}`
          })
          .expect(200)
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      perfMonitor.endTest('concurrent_text_100', {
        totalTime,
        requestCount: concurrentRequests,
        successCount: responses.length
      });

      // All requests should complete within 5 seconds (3s SLA + 2s buffer)
      expect(totalTime).toBeLessThan(5000);
      
      // All requests should succeed
      expect(responses.length).toBe(concurrentRequests);
      responses.forEach(response => {
        expect(response.body.status).toBeDefined();
      });

      // Check database consistency
      const moderationCases = await testDb.getModerationCases();
      expect(moderationCases.length).toBe(concurrentRequests);
    });

    it('should maintain performance with 500 concurrent requests', async () => {
      const concurrentRequests = 500;
      const textContents = loadGenerator.generateTextContent(concurrentRequests);
      
      mockAI.setDefaultTextResponse({
        confidence: 0.85,
        categories: ['safe'],
        action: 'allow',
        latency: 300
      });

      perfMonitor.startTest('concurrent_text_500');
      
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < concurrentRequests; i += batchSize) {
        const batch = textContents.slice(i, i + batchSize).map((content, index) => 
          request(app)
            .post('/api/content')
            .send({
              type: 'post',
              content: content,
              userId: `user-${i + index}`
            })
        );
        batches.push(batch);
      }

      const startTime = Date.now();
      const batchResults = await Promise.all(
        batches.map(batch => Promise.all(batch))
      );
      const totalTime = Date.now() - startTime;

      const allResponses = batchResults.flat();
      const successfulResponses = allResponses.filter(r => r.status === 200);

      perfMonitor.endTest('concurrent_text_500', {
        totalTime,
        requestCount: concurrentRequests,
        successCount: successfulResponses.length
      });

      // Should handle at least 95% of requests successfully
      expect(successfulResponses.length / concurrentRequests).toBeGreaterThan(0.95);
      
      // Should complete within reasonable time (10s for 500 requests)
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Mixed Content Load Testing', () => {
    it('should handle mixed text and image content efficiently', async () => {
      const textCount = 80;
      const imageCount = 20;
      
      const textContents = loadGenerator.generateTextContent(textCount);
      const imageContents = loadGenerator.generateImageContent(imageCount);
      
      mockAI.setDefaultTextResponse({
        confidence: 0.85,
        categories: ['safe'],
        action: 'allow',
        latency: 400
      });
      
      mockAI.setDefaultImageResponse({
        confidence: 0.90,
        categories: ['safe'],
        action: 'allow',
        latency: 2000 // Images take longer
      });

      perfMonitor.startTest('mixed_content_load');
      
      const textPromises = textContents.map((content, index) => 
        request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content,
            userId: `text-user-${index}`
          })
      );

      const imagePromises = imageContents.map((imageBuffer, index) => 
        request(app)
          .post('/api/content')
          .field('type', 'post')
          .field('userId', `image-user-${index}`)
          .attach('media', imageBuffer, `test-${index}.jpg`)
      );

      const startTime = Date.now();
      const [textResponses, imageResponses] = await Promise.all([
        Promise.all(textPromises),
        Promise.all(imagePromises)
      ]);
      const totalTime = Date.now() - startTime;

      perfMonitor.endTest('mixed_content_load', {
        totalTime,
        textCount: textResponses.length,
        imageCount: imageResponses.length
      });

      // Text should be fast (within 5s)
      // Images can be slower but should complete within 30s
      expect(totalTime).toBeLessThan(30000);
      
      // All requests should succeed
      expect(textResponses.every(r => r.status === 200)).toBe(true);
      expect(imageResponses.every(r => r.status === 200)).toBe(true);
    });
  });

  describe('Queue Performance Testing', () => {
    it('should efficiently process review queue under load', async () => {
      // Generate content that requires human review
      const reviewCount = 200;
      const reviewContents = loadGenerator.generateUncertainContent(reviewCount);
      
      mockAI.setDefaultTextResponse({
        confidence: 0.75, // Uncertain confidence triggers review
        categories: ['potentially_harmful'],
        action: 'review',
        latency: 300
      });

      // Submit all content for review
      const submissionPromises = reviewContents.map((content, index) => 
        request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content,
            userId: `review-user-${index}`
          })
      );

      await Promise.all(submissionPromises);

      // Verify all items are in review queue
      const queueItems = await testDb.getReviewQueueItems();
      expect(queueItems.length).toBe(reviewCount);

      // Test moderator processing performance
      perfMonitor.startTest('review_queue_processing');
      
      const moderationPromises = queueItems.slice(0, 50).map((item, index) => 
        request(app)
          .post('/api/_internal/moderation/decision')
          .send({
            caseId: item.caseId,
            decision: index % 2 === 0 ? 'allow' : 'block',
            reasoning: 'Test moderation decision',
            moderatorId: 'test-moderator'
          })
      );

      const startTime = Date.now();
      await Promise.all(moderationPromises);
      const processingTime = Date.now() - startTime;

      perfMonitor.endTest('review_queue_processing', {
        processingTime,
        itemsProcessed: 50
      });

      // Should process 50 items within 10 seconds
      expect(processingTime).toBeLessThan(10000);
    });
  });

  describe('Database Performance Under Load', () => {
    it('should maintain database performance with high write volume', async () => {
      const writeOperations = 1000;
      const contents = loadGenerator.generateTextContent(writeOperations);
      
      mockAI.setDefaultTextResponse({
        confidence: 0.85,
        categories: ['safe'],
        action: 'allow',
        latency: 100 // Fast AI response to test DB bottleneck
      });

      perfMonitor.startTest('database_write_load');
      
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < writeOperations; i += batchSize) {
        const batch = contents.slice(i, i + batchSize).map((content, index) => 
          request(app)
            .post('/api/content')
            .send({
              type: 'post',
              content: content,
              userId: `db-user-${i + index}`
            })
        );
        batches.push(Promise.all(batch));
      }

      const startTime = Date.now();
      await Promise.all(batches);
      const totalTime = Date.now() - startTime;

      perfMonitor.endTest('database_write_load', {
        totalTime,
        writeOperations
      });

      // Verify all records were written
      const moderationCases = await testDb.getModerationCases();
      expect(moderationCases.length).toBe(writeOperations);

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(15000);
    });

    it('should handle concurrent read operations efficiently', async () => {
      // Pre-populate database
      await testDb.seedModerationCases(500);
      
      const readOperations = 200;
      perfMonitor.startTest('database_read_load');
      
      const readPromises = Array.from({ length: readOperations }, (_, index) => 
        request(app)
          .get(`/api/moderation/case-${index % 500}`)
          .expect(200)
      );

      const startTime = Date.now();
      const responses = await Promise.all(readPromises);
      const totalTime = Date.now() - startTime;

      perfMonitor.endTest('database_read_load', {
        totalTime,
        readOperations,
        successCount: responses.length
      });

      // All reads should succeed
      expect(responses.length).toBe(readOperations);
      
      // Should complete quickly
      expect(totalTime).toBeLessThan(5000);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain stable memory usage under sustained load', async () => {
      const iterations = 5;
      const requestsPerIteration = 100;
      
      const memoryUsage = [];
      
      for (let i = 0; i < iterations; i++) {
        const contents = loadGenerator.generateTextContent(requestsPerIteration);
        
        mockAI.setDefaultTextResponse({
          confidence: 0.85,
          categories: ['safe'],
          action: 'allow',
          latency: 200
        });

        const promises = contents.map((content, index) => 
          request(app)
            .post('/api/content')
            .send({
              type: 'post',
              content: content,
              userId: `memory-user-${i}-${index}`
            })
        );

        await Promise.all(promises);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const memUsage = process.memoryUsage();
        memoryUsage.push(memUsage.heapUsed);
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Memory usage should not grow significantly
      const initialMemory = memoryUsage[0];
      const finalMemory = memoryUsage[memoryUsage.length - 1];
      const memoryGrowth = (finalMemory - initialMemory) / initialMemory;
      
      // Memory growth should be less than 50%
      expect(memoryGrowth).toBeLessThan(0.5);
    });
  });

  describe('Error Handling Under Load', () => {
    it('should gracefully handle AI service failures under load', async () => {
      const requestCount = 100;
      const contents = loadGenerator.generateTextContent(requestCount);
      
      // Simulate intermittent AI failures
      mockAI.setFailureRate(0.2); // 20% failure rate
      
      perfMonitor.startTest('error_handling_load');
      
      const promises = contents.map((content, index) => 
        request(app)
          .post('/api/content')
          .send({
            type: 'post',
            content: content,
            userId: `error-user-${index}`
          })
      );

      const responses = await Promise.allSettled(promises);
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const failed = responses.filter(r => r.status === 'rejected').length;

      perfMonitor.endTest('error_handling_load', {
        successful,
        failed,
        totalRequests: requestCount
      });

      // Should handle at least 70% successfully despite failures
      expect(successful / requestCount).toBeGreaterThan(0.7);
      
      // Failed requests should not crash the system
      expect(failed).toBeLessThan(requestCount * 0.3);
    });
  });

  describe('Scalability Testing', () => {
    it('should demonstrate linear scalability characteristics', async () => {
      const testSizes = [50, 100, 200];
      const results = [];
      
      for (const size of testSizes) {
        const contents = loadGenerator.generateTextContent(size);
        
        mockAI.setDefaultTextResponse({
          confidence: 0.85,
          categories: ['safe'],
          action: 'allow',
          latency: 300
        });

        const startTime = Date.now();
        
        const promises = contents.map((content, index) => 
          request(app)
            .post('/api/content')
            .send({
              type: 'post',
              content: content,
              userId: `scale-user-${size}-${index}`
            })
        );

        await Promise.all(promises);
        const totalTime = Date.now() - startTime;
        
        results.push({
          size,
          time: totalTime,
          throughput: size / (totalTime / 1000)
        });
      }

      // Throughput should remain relatively stable
      const throughputs = results.map(r => r.throughput);
      const avgThroughput = throughputs.reduce((a, b) => a + b) / throughputs.length;
      
      throughputs.forEach(throughput => {
        const deviation = Math.abs(throughput - avgThroughput) / avgThroughput;
        expect(deviation).toBeLessThan(0.3); // Within 30% of average
      });
    });
  });
});
