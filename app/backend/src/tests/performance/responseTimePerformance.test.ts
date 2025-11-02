/**
 * Response Time Performance Tests
 * Tests for API response times, database query performance, and real-time update latency
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { safeLogger } from '../../utils/safeLogger';
import { performance } from 'perf_hooks';
import express from 'express';
import request from 'supertest';
import { DatabaseOptimizationService } from '../../services/databaseOptimizationService';
import { WebSocketService } from '../../services/webSocketService';
import { FeedService } from '../../services/feedService';
import { CommunityService } from '../../services/communityService';
import { MessagingService } from '../../services/messagingService';

describe('Response Time Performance Tests', () => {
  let app: express.Application;
  let dbService: DatabaseOptimizationService;
  let wsService: WebSocketService;
  let feedService: FeedService;
  let communityService: CommunityService;
  let messagingService: MessagingService;

  beforeAll(async () => {
    // Initialize services
    dbService = new DatabaseOptimizationService({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'test_marketplace',
      user: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      max: 20,
      min: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000,
    }, process.env.TEST_REDIS_URL || 'redis://localhost:6379');

    wsService = new WebSocketService();
    feedService = new FeedService(dbService);
    communityService = new CommunityService(dbService);
    messagingService = new MessagingService(dbService);

    // Setup Express app
    app = express();
    app.use(express.json());

    // Add performance tracking middleware
    app.use((req, res, next) => {
      req.startTime = performance.now();
      res.on('finish', () => {
        const responseTime = performance.now() - req.startTime;
        res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
      });
      next();
    });

    // Feed endpoints
    app.get('/api/feed', async (req, res) => {
      try {
        const { page = 1, limit = 20, sortBy = 'hot' } = req.query;
        const result = await feedService.getEnhancedFeed({
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          sortBy: sortBy as string,
          userId: req.headers['x-user-id'] as string
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/posts', async (req, res) => {
      try {
        const post = await feedService.createPost({
          ...req.body,
          authorAddress: req.headers['x-user-address'] as string
        });
        res.status(201).json(post);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Community endpoints
    app.get('/api/communities', async (req, res) => {
      try {
        const { page = 1, limit = 20, category } = req.query;
        const result = await communityService.getCommunities({
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          category: category as string
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/communities/:id', async (req, res) => {
      try {
        const community = await communityService.getCommunityById(req.params.id);
        if (!community) {
          return res.status(404).json({ error: 'Community not found' });
        }
        res.json(community);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/communities/:id/posts', async (req, res) => {
      try {
        const { page = 1, limit = 20, sortBy = 'new' } = req.query;
        const result = await communityService.getCommunityPosts(req.params.id, {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          sortBy: sortBy as string
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Messaging endpoints
    app.get('/api/conversations', async (req, res) => {
      try {
        const conversations = await messagingService.getConversations(
          req.headers['x-user-address'] as string
        );
        res.json(conversations);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/conversations/:id/messages', async (req, res) => {
      try {
        const { page = 1, limit = 50 } = req.query;
        const messages = await messagingService.getMessages(req.params.id, {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          userAddress: req.headers['x-user-address'] as string
        });
        res.json(messages);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Search endpoint
    app.get('/api/search', async (req, res) => {
      try {
        const { q, type = 'all', page = 1, limit = 20 } = req.query;
        const results = await feedService.searchContent({
          query: q as string,
          type: type as string,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        });
        res.json(results);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    await dbService.initialize();
  });

  afterAll(async () => {
    await dbService?.close();
    await wsService?.close();
  });

  beforeEach(async () => {
    // Clear any test data
    await dbService.query('DELETE FROM posts WHERE author_address LIKE $1', ['test_%']);
    await dbService.query('DELETE FROM communities WHERE name LIKE $1', ['test_%']);
  });

  describe('API Response Time Performance', () => {
    it('should respond to feed requests within performance budget', async () => {
      const iterations = 50;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const response = await request(app)
          .get('/api/feed')
          .set('x-user-id', 'test-user-1')
          .expect(200);
        
        const end = performance.now();
        const responseTime = end - start;
        responseTimes.push(responseTime);

        expect(response.body).toHaveProperty('posts');
        expect(Array.isArray(response.body.posts)).toBe(true);
      }

      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95Time = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];
      const maxTime = Math.max(...responseTimes);

      // Feed requests should be fast
      expect(averageTime).toBeLessThan(200); // Average under 200ms
      expect(p95Time).toBeLessThan(500); // 95th percentile under 500ms
      expect(maxTime).toBeLessThan(1000); // No request over 1 second

      safeLogger.info(`Feed API Response Times:
        Average: ${averageTime.toFixed(2)}ms
        P95: ${p95Time.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms`);
    });

    it('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 20;
      const requestsPerEndpoint = 5;

      const endpoints = [
        '/api/feed',
        '/api/communities',
        '/api/conversations',
        '/api/search?q=test'
      ];

      const allRequests: Promise<any>[] = [];

      const startTime = performance.now();

      // Create concurrent requests to different endpoints
      for (const endpoint of endpoints) {
        for (let i = 0; i < requestsPerEndpoint; i++) {
          allRequests.push(
            request(app)
              .get(endpoint)
              .set('x-user-id', `test-user-${i}`)
              .set('x-user-address', `0x${i.toString().padStart(40, '0')}`)
          );
        }
      }

      const responses = await Promise.all(allRequests);
      const totalTime = performance.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBeLessThan(400);
      });

      const averageTime = totalTime / allRequests.length;

      // Concurrent requests should be handled efficiently
      expect(totalTime).toBeLessThan(5000); // Total time under 5 seconds
      expect(averageTime).toBeLessThan(250); // Average per request under 250ms

      safeLogger.info(`Concurrent API Requests Performance:
        Total Requests: ${allRequests.length}
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Request: ${averageTime.toFixed(2)}ms`);
    });

    it('should maintain performance under load', async () => {
      const loadDuration = 10000; // 10 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      const responseTimes: number[] = [];
      const errors: number[] = [];

      while (Date.now() - startTime < loadDuration) {
        const requestStart = performance.now();
        
        try {
          const response = await request(app)
            .get('/api/feed')
            .set('x-user-id', 'load-test-user')
            .timeout(2000);
          
          const requestEnd = performance.now();
          responseTimes.push(requestEnd - requestStart);
          
          if (response.status >= 400) {
            errors.push(response.status);
          }
        } catch (error) {
          errors.push(500);
        }

        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const errorRate = errors.length / (responseTimes.length + errors.length);

      // Performance should remain stable under sustained load
      expect(averageResponseTime).toBeLessThan(300);
      expect(errorRate).toBeLessThan(0.05); // Less than 5% error rate

      safeLogger.info(`Load Test Performance:
        Total Requests: ${responseTimes.length + errors.length}
        Average Response Time: ${averageResponseTime.toFixed(2)}ms
        Error Rate: ${(errorRate * 100).toFixed(2)}%`);
    });
  });

  describe('Database Query Performance', () => {
    it('should execute optimized queries within performance budget', async () => {
      // Create test data
      const testPosts = Array.from({ length: 1000 }, (_, i) => ({
        id: `test-post-${i}`,
        authorAddress: `test_user_${i % 10}`,
        content: `Test post content ${i}`,
        communityId: i % 5 === 0 ? `test-community-${i % 5}` : null,
        createdAt: new Date(Date.now() - i * 60000), // Spread over time
        engagementScore: Math.floor(Math.random() * 1000)
      }));

      // Insert test data
      for (const post of testPosts) {
        await dbService.query(
          'INSERT INTO posts (id, author_address, content, community_id, created_at, engagement_score) VALUES ($1, $2, $3, $4, $5, $6)',
          [post.id, post.authorAddress, post.content, post.communityId, post.createdAt, post.engagementScore]
        );
      }

      const queries = [
        {
          name: 'Feed Query with Pagination',
          sql: `
            SELECT p.*, u.username, u.avatar_url 
            FROM posts p 
            LEFT JOIN users u ON p.author_address = u.wallet_address 
            WHERE p.created_at > $1 
            ORDER BY p.engagement_score DESC, p.created_at DESC 
            LIMIT $2 OFFSET $3
          `,
          params: [new Date(Date.now() - 24 * 60 * 60 * 1000), 20, 0]
        },
        {
          name: 'Community Posts Query',
          sql: `
            SELECT p.*, COUNT(r.id) as reaction_count 
            FROM posts p 
            LEFT JOIN reactions r ON p.id = r.post_id 
            WHERE p.community_id = $1 
            GROUP BY p.id 
            ORDER BY p.created_at DESC 
            LIMIT $2
          `,
          params: ['test-community-0', 20]
        },
        {
          name: 'User Activity Query',
          sql: `
            SELECT p.id, p.content, p.created_at, 
                   COUNT(DISTINCT r.id) as reactions,
                   COUNT(DISTINCT c.id) as comments
            FROM posts p 
            LEFT JOIN reactions r ON p.id = r.post_id 
            LEFT JOIN comments c ON p.id = c.post_id 
            WHERE p.author_address = $1 
            GROUP BY p.id, p.content, p.created_at 
            ORDER BY p.created_at DESC 
            LIMIT $2
          `,
          params: ['test_user_1', 10]
        },
        {
          name: 'Search Query',
          sql: `
            SELECT p.*, ts_rank(search_vector, plainto_tsquery($1)) as rank
            FROM posts p 
            WHERE search_vector @@ plainto_tsquery($1)
            ORDER BY rank DESC, p.created_at DESC 
            LIMIT $2
          `,
          params: ['test', 20]
        }
      ];

      for (const query of queries) {
        const iterations = 20;
        const queryTimes: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          
          const result = await dbService.executeOptimizedQuery(
            query.sql,
            query.params,
            `${query.name.toLowerCase().replace(/\s+/g, '_')}_${i}`,
            60
          );
          
          const end = performance.now();
          queryTimes.push(end - start);

          expect(Array.isArray(result)).toBe(true);
        }

        const averageTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
        const maxTime = Math.max(...queryTimes);

        // Database queries should be optimized
        expect(averageTime).toBeLessThan(100); // Average under 100ms
        expect(maxTime).toBeLessThan(300); // No query over 300ms

        safeLogger.info(`${query.name} Performance:
          Average: ${averageTime.toFixed(2)}ms
          Max: ${maxTime.toFixed(2)}ms`);
      }
    });

    it('should handle complex aggregation queries efficiently', async () => {
      const complexQuery = `
        WITH user_stats AS (
          SELECT 
            p.author_address,
            COUNT(p.id) as post_count,
            AVG(p.engagement_score) as avg_engagement,
            MAX(p.created_at) as last_post_date
          FROM posts p 
          WHERE p.created_at > $1
          GROUP BY p.author_address
        ),
        community_stats AS (
          SELECT 
            p.community_id,
            COUNT(p.id) as post_count,
            COUNT(DISTINCT p.author_address) as unique_authors
          FROM posts p 
          WHERE p.community_id IS NOT NULL 
          AND p.created_at > $1
          GROUP BY p.community_id
        )
        SELECT 
          us.author_address,
          us.post_count,
          us.avg_engagement,
          cs.post_count as community_posts
        FROM user_stats us
        LEFT JOIN posts p ON us.author_address = p.author_address
        LEFT JOIN community_stats cs ON p.community_id = cs.community_id
        WHERE us.post_count > 0
        ORDER BY us.avg_engagement DESC
        LIMIT $2
      `;

      const iterations = 10;
      const queryTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const result = await dbService.executeOptimizedQuery(
          complexQuery,
          [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 50],
          `complex_aggregation_${i}`,
          120
        );
        
        const end = performance.now();
        queryTimes.push(end - start);

        expect(Array.isArray(result)).toBe(true);
      }

      const averageTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
      const maxTime = Math.max(...queryTimes);

      // Complex queries should still be reasonably fast
      expect(averageTime).toBeLessThan(500); // Average under 500ms
      expect(maxTime).toBeLessThan(1000); // No query over 1 second

      safeLogger.info(`Complex Aggregation Query Performance:
        Average: ${averageTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms`);
    });

    it('should optimize connection pool performance', async () => {
      const concurrentQueries = 50;
      const queryPromises: Promise<any>[] = [];

      const startTime = performance.now();

      // Execute many concurrent queries to test connection pool
      for (let i = 0; i < concurrentQueries; i++) {
        queryPromises.push(
          dbService.executeOptimizedQuery(
            'SELECT COUNT(*) as count FROM posts WHERE author_address = $1',
            [`test_user_${i % 10}`],
            `pool_test_${i}`,
            30
          )
        );
      }

      const results = await Promise.all(queryPromises);
      const totalTime = performance.now() - startTime;

      // All queries should complete successfully
      expect(results).toHaveLength(concurrentQueries);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      const averageTime = totalTime / concurrentQueries;

      // Connection pool should handle concurrent queries efficiently
      expect(totalTime).toBeLessThan(2000); // Total time under 2 seconds
      expect(averageTime).toBeLessThan(100); // Average per query under 100ms

      // Check pool statistics
      const poolStats = await dbService.getPoolStats();
      expect(poolStats.totalCount).toBeGreaterThan(0);
      expect(poolStats.waitingCount).toBe(0); // No queries should be waiting

      safeLogger.info(`Connection Pool Performance:
        Concurrent Queries: ${concurrentQueries}
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Query: ${averageTime.toFixed(2)}ms
        Pool Stats: ${JSON.stringify(poolStats)}`);
    });
  });

  describe('Real-Time Update Performance', () => {
    it('should deliver WebSocket messages with low latency', async () => {
      const messageCount = 100;
      const latencies: number[] = [];

      // Setup WebSocket connections
      const clients = Array.from({ length: 5 }, () => wsService.createTestClient());

      for (let i = 0; i < messageCount; i++) {
        const sendTime = performance.now();
        const message = {
          type: 'feed_update',
          data: { postId: `test-post-${i}`, action: 'new_reaction' },
          timestamp: sendTime
        };

        // Broadcast message
        wsService.broadcast('feed_updates', message);

        // Measure latency for first client
        const receivedMessage = await new Promise(resolve => {
          clients[0].once('message', resolve);
        });

        const receiveTime = performance.now();
        const latency = receiveTime - sendTime;
        latencies.push(latency);

        expect(receivedMessage).toMatchObject({
          type: 'feed_update',
          data: { postId: `test-post-${i}` }
        });
      }

      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

      // WebSocket messages should have low latency
      expect(averageLatency).toBeLessThan(10); // Average under 10ms
      expect(p95Latency).toBeLessThan(50); // 95th percentile under 50ms
      expect(maxLatency).toBeLessThan(100); // No message over 100ms

      safeLogger.info(`WebSocket Message Latency:
        Average: ${averageLatency.toFixed(2)}ms
        P95: ${p95Latency.toFixed(2)}ms
        Max: ${maxLatency.toFixed(2)}ms`);

      // Cleanup
      clients.forEach(client => client.close());
    });

    it('should handle high-frequency real-time updates', async () => {
      const updateFrequency = 10; // Updates per second
      const testDuration = 5000; // 5 seconds
      const expectedUpdates = (testDuration / 1000) * updateFrequency;

      const client = wsService.createTestClient();
      const receivedUpdates: any[] = [];
      const latencies: number[] = [];

      client.on('message', (message: any) => {
        const receiveTime = performance.now();
        const latency = receiveTime - message.timestamp;
        receivedUpdates.push(message);
        latencies.push(latency);
      });

      const startTime = Date.now();
      let updateCount = 0;

      // Send high-frequency updates
      const updateInterval = setInterval(() => {
        if (Date.now() - startTime >= testDuration) {
          clearInterval(updateInterval);
          return;
        }

        const message = {
          type: 'live_update',
          data: { updateId: updateCount++, value: Math.random() },
          timestamp: performance.now()
        };

        wsService.broadcast('live_updates', message);
      }, 1000 / updateFrequency);

      // Wait for test completion
      await new Promise(resolve => setTimeout(resolve, testDuration + 1000));

      const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const deliveryRate = receivedUpdates.length / expectedUpdates;

      // High-frequency updates should be delivered reliably with low latency
      expect(deliveryRate).toBeGreaterThan(0.95); // At least 95% delivery rate
      expect(averageLatency).toBeLessThan(20); // Average latency under 20ms

      safeLogger.info(`High-Frequency Updates Performance:
        Expected Updates: ${expectedUpdates}
        Received Updates: ${receivedUpdates.length}
        Delivery Rate: ${(deliveryRate * 100).toFixed(2)}%
        Average Latency: ${averageLatency.toFixed(2)}ms`);

      client.close();
    });

    it('should scale WebSocket connections efficiently', async () => {
      const connectionCount = 100;
      const clients: any[] = [];
      const connectionTimes: number[] = [];

      // Create multiple WebSocket connections
      for (let i = 0; i < connectionCount; i++) {
        const start = performance.now();
        const client = wsService.createTestClient();
        
        await new Promise(resolve => {
          client.on('open', resolve);
        });
        
        const end = performance.now();
        connectionTimes.push(end - start);
        clients.push(client);
      }

      // Test broadcast to all connections
      const broadcastStart = performance.now();
      const testMessage = {
        type: 'broadcast_test',
        data: { message: 'Hello all clients' },
        timestamp: performance.now()
      };

      wsService.broadcast('broadcast_test', testMessage);

      // Wait for all clients to receive the message
      const receivePromises = clients.map(client => 
        new Promise(resolve => client.once('message', resolve))
      );

      await Promise.all(receivePromises);
      const broadcastTime = performance.now() - broadcastStart;

      const averageConnectionTime = connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length;
      const maxConnectionTime = Math.max(...connectionTimes);

      // WebSocket scaling should be efficient
      expect(averageConnectionTime).toBeLessThan(100); // Average connection under 100ms
      expect(maxConnectionTime).toBeLessThan(500); // No connection over 500ms
      expect(broadcastTime).toBeLessThan(1000); // Broadcast to all clients under 1 second

      safeLogger.info(`WebSocket Scaling Performance:
        Connections: ${connectionCount}
        Average Connection Time: ${averageConnectionTime.toFixed(2)}ms
        Max Connection Time: ${maxConnectionTime.toFixed(2)}ms
        Broadcast Time: ${broadcastTime.toFixed(2)}ms`);

      // Cleanup
      clients.forEach(client => client.close());
    });
  });

  describe('End-to-End Response Time Performance', () => {
    it('should maintain performance across full user workflows', async () => {
      const workflows = [
        {
          name: 'Browse Feed Workflow',
          steps: [
            () => request(app).get('/api/feed').set('x-user-id', 'workflow-user'),
            () => request(app).get('/api/feed?page=2').set('x-user-id', 'workflow-user'),
            () => request(app).get('/api/communities').set('x-user-id', 'workflow-user')
          ]
        },
        {
          name: 'Community Interaction Workflow',
          steps: [
            () => request(app).get('/api/communities'),
            () => request(app).get('/api/communities/test-community-1'),
            () => request(app).get('/api/communities/test-community-1/posts')
          ]
        },
        {
          name: 'Search and Discovery Workflow',
          steps: [
            () => request(app).get('/api/search?q=test'),
            () => request(app).get('/api/search?q=test&type=posts'),
            () => request(app).get('/api/search?q=test&type=communities')
          ]
        }
      ];

      for (const workflow of workflows) {
        const workflowTimes: number[] = [];
        const iterations = 10;

        for (let i = 0; i < iterations; i++) {
          const workflowStart = performance.now();
          
          // Execute all steps in the workflow
          for (const step of workflow.steps) {
            const response = await step();
            expect(response.status).toBeLessThan(400);
          }
          
          const workflowEnd = performance.now();
          workflowTimes.push(workflowEnd - workflowStart);
        }

        const averageWorkflowTime = workflowTimes.reduce((sum, time) => sum + time, 0) / workflowTimes.length;
        const maxWorkflowTime = Math.max(...workflowTimes);

        // Complete workflows should be reasonably fast
        expect(averageWorkflowTime).toBeLessThan(1000); // Average workflow under 1 second
        expect(maxWorkflowTime).toBeLessThan(2000); // No workflow over 2 seconds

        safeLogger.info(`${workflow.name} Performance:
          Average: ${averageWorkflowTime.toFixed(2)}ms
          Max: ${maxWorkflowTime.toFixed(2)}ms`);
      }
    });
  });
});
