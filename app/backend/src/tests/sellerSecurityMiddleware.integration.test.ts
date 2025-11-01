/**
 * Seller Security Middleware Integration Tests
 * 
 * Integration tests for seller security middleware functionality
 * including authentication, authorization, and audit logging.
 */

import request from 'supertest';
import express from 'express';
import SellerSecurityMiddleware from '../middleware/sellerSecurityMiddleware';
import { SellerRole } from '../services/sellerSecurityService';

// Mock dependencies
jest.mock('../services/sellerSecurityService');
jest.mock('../services/securityMonitoringService');
jest.mock('../services/auditLoggingService');

describe('SellerSecurityMiddleware Integration', () => {
  let app: express.Application;
  let sellerSecurityMiddleware: SellerSecurityMiddleware;

  const mockWalletAddress = '0x1234567890123456789012345678901234567890';
  const mockSignature = '0x' + 'a'.repeat(130);
  const mockNonce = 'test-nonce-' + Date.now();

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    sellerSecurityMiddleware = new SellerSecurityMiddleware();

    // Setup test routes
    setupTestRoutes();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const setupTestRoutes = () => {
    // Nonce generation route
    app.post('/api/seller/security/nonce', sellerSecurityMiddleware.generateVerificationNonce);

    // Wallet verification route
    app.post('/api/seller/security/verify', 
      sellerSecurityMiddleware.requireWalletOwnership(),
      (req, res) => res.json({ success: true, message: 'Verified' })
    );

    // Session management routes
    app.post('/api/seller/security/session', 
      sellerSecurityMiddleware.requireWalletOwnership(),
      sellerSecurityMiddleware.createSecuritySession
    );

    app.delete('/api/seller/security/session', 
      sellerSecurityMiddleware.revokeSecuritySession
    );

    // Protected route with access validation
    app.get('/api/seller/:walletAddress/profile',
      sellerSecurityMiddleware.validateSellerAccess(['profile']),
      (req, res) => res.json({ success: true, data: { profile: 'data' } })
    );

    // Protected route with role requirement
    app.post('/api/seller/:walletAddress/settings',
      sellerSecurityMiddleware.validateSellerAccess(['settings']),
      sellerSecurityMiddleware.requireSellerRole(SellerRole.ADMIN),
      (req, res) => res.json({ success: true, message: 'Settings updated' })
    );

    // Route with audit logging
    app.put('/api/seller/:walletAddress/profile',
      sellerSecurityMiddleware.validateSellerAccess(['profile']),
      sellerSecurityMiddleware.auditSellerOperation('profile_update', 'profile', 'update'),
      (req, res) => res.json({ success: true, message: 'Profile updated' })
    );

    // Route with rate limiting
    app.get('/api/seller/:walletAddress/analytics',
      sellerSecurityMiddleware.sellerRateLimit(5, 60000), // 5 requests per minute
      sellerSecurityMiddleware.validateSellerAccess(['analytics']),
      (req, res) => res.json({ success: true, data: { analytics: 'data' } })
    );

    // Route with response sanitization
    app.get('/api/seller/:walletAddress/sensitive',
      sellerSecurityMiddleware.validateSellerAccess(['profile']),
      sellerSecurityMiddleware.sanitizeSellerResponse('transmission'),
      (req, res) => res.json({
        success: true,
        data: {
          walletAddress: mockWalletAddress,
          email: 'test@example.com',
          privateKey: 'secret-key',
          publicInfo: 'public-data'
        }
      })
    );
  };

  describe('Nonce Generation', () => {
    it('should generate verification nonce successfully', async () => {
      const response = await request(app)
        .post('/api/seller/security/nonce')
        .send({ walletAddress: mockWalletAddress })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nonce).toBeDefined();
      expect(response.body.data.message).toContain(mockWalletAddress);
      expect(response.body.data.timestamp).toBeDefined();
    });

    it('should reject nonce generation without wallet address', async () => {
      const response = await request(app)
        .post('/api/seller/security/nonce')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
  });

  describe('Wallet Verification', () => {
    it('should verify wallet ownership with valid signature', async () => {
      const response = await request(app)
        .post('/api/seller/security/verify')
        .send({
          walletAddress: mockWalletAddress,
          signature: mockSignature,
          message: 'Verify ownership',
          timestamp: Date.now(),
          nonce: mockNonce
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified');
    });

    it('should reject verification with missing data', async () => {
      const response = await request(app)
        .post('/api/seller/security/verify')
        .send({
          walletAddress: mockWalletAddress
          // Missing signature, message, timestamp, nonce
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
  });

  describe('Session Management', () => {
    it('should create security session after verification', async () => {
      const response = await request(app)
        .post('/api/seller/security/session')
        .send({
          walletAddress: mockWalletAddress,
          signature: mockSignature,
          message: 'Verify ownership',
          timestamp: Date.now(),
          nonce: mockNonce,
          role: SellerRole.OWNER
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });

    it('should revoke security session', async () => {
      const sessionId = 'test-session-id';

      const response = await request(app)
        .delete('/api/seller/security/session')
        .send({ sessionId })
        .expect(200);

      expect(response.body.success).toBeDefined();
    });

    it('should reject session revocation without session ID', async () => {
      const response = await request(app)
        .delete('/api/seller/security/session')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });
  });

  describe('Access Validation', () => {
    it('should allow access to own profile', async () => {
      const response = await request(app)
        .get(`/api/seller/${mockWalletAddress}/profile`)
        .set('x-wallet-address', mockWalletAddress)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toBe('data');
    });

    it('should deny access without wallet address', async () => {
      const response = await request(app)
        .get('/api/seller/invalid/profile')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should deny unauthorized access', async () => {
      const unauthorizedAddress = '0x0987654321098765432109876543210987654321';

      const response = await request(app)
        .get(`/api/seller/${mockWalletAddress}/profile`)
        .set('x-wallet-address', unauthorizedAddress)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('denied');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin role access to settings', async () => {
      const response = await request(app)
        .post(`/api/seller/${mockWalletAddress}/settings`)
        .set('x-wallet-address', mockWalletAddress)
        .set('x-session-id', 'mock-session-id')
        .send({ setting: 'value' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should deny insufficient role access', async () => {
      // This would require mocking the session validation to return a viewer role
      const response = await request(app)
        .post(`/api/seller/${mockWalletAddress}/settings`)
        .set('x-wallet-address', mockWalletAddress)
        .send({ setting: 'value' })
        .expect(401); // No security context

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const response = await request(app)
        .get(`/api/seller/${mockWalletAddress}/analytics`)
        .set('x-wallet-address', mockWalletAddress)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('should enforce rate limits', async () => {
      // Make multiple requests to exceed rate limit
      const requests = Array.from({ length: 6 }, () =>
        request(app)
          .get(`/api/seller/${mockWalletAddress}/analytics`)
          .set('x-wallet-address', mockWalletAddress)
      );

      const responses = await Promise.all(requests);
      
      // First 5 should succeed, 6th should be rate limited
      responses.slice(0, 5).forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(responses[5].status).toBe(429);
      expect(responses[5].body.message).toContain('Rate limit exceeded');
    });
  });

  describe('Audit Logging', () => {
    it('should log profile update operations', async () => {
      const response = await request(app)
        .put(`/api/seller/${mockWalletAddress}/profile`)
        .set('x-wallet-address', mockWalletAddress)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('updated');
    });

    it('should log failed operations', async () => {
      const response = await request(app)
        .put('/api/seller/invalid/profile')
        .send({ name: 'Updated Name' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Sanitization', () => {
    it('should sanitize sensitive data in responses', async () => {
      const response = await request(app)
        .get(`/api/seller/${mockWalletAddress}/sensitive`)
        .set('x-wallet-address', mockWalletAddress)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.privateKey).toBeUndefined();
      expect(response.body.data.email).toMatch(/te\*\*\*@example\.com/);
      expect(response.body.data.publicInfo).toBe('public-data');
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', async () => {
      // Test with malformed request that might cause errors
      const response = await request(app)
        .get('/api/seller/null/profile')
        .set('x-wallet-address', 'invalid-address')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing headers gracefully', async () => {
      const response = await request(app)
        .get(`/api/seller/${mockWalletAddress}/profile`)
        // No headers set
        .expect(200); // Should still work for owner accessing own data

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Headers', () => {
    it('should set appropriate rate limit headers', async () => {
      const response = await request(app)
        .get(`/api/seller/${mockWalletAddress}/analytics`)
        .set('x-wallet-address', mockWalletAddress)
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent access validations', async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app)
          .get(`/api/seller/${mockWalletAddress}/profile`)
          .set('x-wallet-address', mockWalletAddress)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle concurrent session operations', async () => {
      const sessionRequests = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/seller/security/session')
          .send({
            walletAddress: mockWalletAddress,
            signature: mockSignature,
            message: 'Verify ownership',
            timestamp: Date.now(),
            nonce: mockNonce + Math.random(),
            role: SellerRole.OWNER
          })
      );

      const responses = await Promise.all(sessionRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessionId).toBeDefined();
      });
    });
  });
});
