import request from 'supertest';
import express from 'express';
import { createAuthenticationRoutes } from '../../routes/authenticationRoutes';
import { AuthenticationService } from '../../services/authenticationService';
import { AuthenticationMiddleware } from '../../middleware/authenticationMiddleware';

// Mock the services with realistic implementations
const mockAuthService = {
  generateNonce: jest.fn(),
  authenticateWallet: jest.fn(),
  validateSession: jest.fn(),
  refreshSession: jest.fn(),
  logout: jest.fn(),
  getAuthStats: jest.fn(),
  cleanupExpiredSessions: jest.fn(),
} as jest.Mocked<AuthenticationService>;

const mockAuthMiddleware = {
  authRateLimit: jest.fn(() => (req: any, res: any, next: any) => next()),
  optionalAuth: jest.fn(),
  requireAuth: jest.fn(),
} as jest.Mocked<AuthenticationMiddleware>;

// Mock validation middleware
jest.mock('../../controllers/authenticationController', () => {
  const originalModule = jest.requireActual('../../controllers/authenticationController');
  return {
    ...originalModule,
    authValidationRules: {
      generateNonce: (req: any, res: any, next: any) => {
        const { walletAddress } = req.body;
        if (!walletAddress) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Wallet address is required',
            },
            metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
          });
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid wallet address format',
            },
            metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
          });
        }
        next();
      },
      authenticateWallet: (req: any, res: any, next: any) => {
        const { walletAddress, signature, nonce } = req.body;
        const errors = [];
        
        if (!walletAddress) errors.push('Wallet address is required');
        if (!signature) errors.push('Signature is required');
        if (!nonce) errors.push('Nonce is required');
        
        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: errors,
            },
            metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
          });
        }
        next();
      },
      refreshSession: (req: any, res: any, next: any) => {
        const { refreshToken } = req.body;
        if (!refreshToken) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Refresh token is required',
            },
            metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
          });
        }
        next();
      },
    },
  };
});

describe('Authentication Workflow E2E Tests', () => {
  let app: express.Application;

  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const testSignature = 'mock-signature-hex-string';
  const testNonce = 'mock-nonce-hex-string';
  const testMessage = `Sign this message to authenticate with LinkDAO Marketplace.\n\nNonce: ${testNonce}\nTimestamp: ${Date.now()}`;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthenticationRoutes(mockAuthService, mockAuthMiddleware));
    
    jest.clearAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full authentication workflow from nonce generation to authenticated requests', async () => {
      // Step 1: Generate nonce for wallet authentication
      const mockNonceInfo = {
        nonce: testNonce,
        message: testMessage,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      };

      mockAuthService.generateNonce.mockResolvedValue(mockNonceInfo);

      const nonceResponse = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: testWalletAddress })
        .expect(200);

      expect(nonceResponse.body).toEqual({
        success: true,
        data: {
          nonce: testNonce,
          message: testMessage,
          expiresAt: mockNonceInfo.expiresAt.toISOString(),
        },
        metadata: expect.any(Object),
      });

      expect(mockAuthService.generateNonce).toHaveBeenCalledWith(testWalletAddress);

      // Step 2: Authenticate wallet with signature
      const mockAuthResult = {
        success: true,
        sessionToken: 'session-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      mockAuthService.authenticateWallet.mockResolvedValue(mockAuthResult);

      const authResponse = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: testWalletAddress,
          signature: testSignature,
          nonce: testNonce,
        })
        .expect(200);

      expect(authResponse.body).toEqual({
        success: true,
        data: {
          sessionToken: 'session-token-123',
          refreshToken: 'refresh-token-456',
          expiresAt: mockAuthResult.expiresAt.toISOString(),
          walletAddress: testWalletAddress,
        },
        metadata: expect.any(Object),
      });

      expect(mockAuthService.authenticateWallet).toHaveBeenCalledWith(
        testWalletAddress,
        testSignature,
        testNonce,
        expect.any(String), // user agent
        expect.any(String)  // ip address
      );

      // Step 3: Check authentication status with valid session
      const mockSessionInfo = {
        id: 'session-123',
        walletAddress: testWalletAddress,
        sessionToken: 'session-token-123',
        expiresAt: mockAuthResult.expiresAt,
        isActive: true,
        lastUsedAt: new Date(),
      };

      // Mock middleware to simulate authenticated user
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        req.user = { walletAddress: testWalletAddress };
        req.sessionInfo = mockSessionInfo;
        next();
      });

      const statusResponse = await request(app)
        .get('/api/auth/status')
        .set('Authorization', 'Bearer session-token-123')
        .expect(200);

      expect(statusResponse.body).toEqual({
        success: true,
        data: {
          authenticated: true,
          walletAddress: testWalletAddress,
          sessionInfo: {
            expiresAt: mockSessionInfo.expiresAt.toISOString(),
            lastUsedAt: mockSessionInfo.lastUsedAt.toISOString(),
          },
        },
        metadata: expect.any(Object),
      });

      // Step 4: Make authenticated request (simulate protected endpoint)
      mockAuthMiddleware.requireAuth.mockImplementation((req: any, res: any, next: any) => {
        req.user = { walletAddress: testWalletAddress };
        next();
      });

      mockAuthService.getAuthStats.mockResolvedValue({
        totalSessions: 150,
        activeSessions: 45,
        recentAttempts: 25,
        successRate: 92.5,
      });

      const protectedResponse = await request(app)
        .get('/api/auth/stats')
        .set('Authorization', 'Bearer session-token-123')
        .expect(200);

      expect(protectedResponse.body.data).toEqual({
        totalSessions: 150,
        activeSessions: 45,
        recentAttempts: 25,
        successRate: 92.5,
      });

      // Step 5: Logout and invalidate session
      mockAuthService.logout.mockResolvedValue(true);

      // Mock middleware to provide session token for logout
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        req.sessionToken = 'session-token-123';
        next();
      });

      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer session-token-123')
        .expect(200);

      expect(logoutResponse.body).toEqual({
        success: true,
        data: {
          message: 'Successfully logged out',
        },
        metadata: expect.any(Object),
      });

      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'session-token-123',
        expect.any(String), // ip address
        expect.any(String)  // user agent
      );

      // Step 6: Verify session is invalidated
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        // No user set - session is invalid
        next();
      });

      const invalidStatusResponse = await request(app)
        .get('/api/auth/status')
        .set('Authorization', 'Bearer session-token-123')
        .expect(200);

      expect(invalidStatusResponse.body).toEqual({
        success: true,
        data: {
          authenticated: false,
        },
        metadata: expect.any(Object),
      });

      // Verify all service calls were made correctly
      expect(mockAuthService.generateNonce).toHaveBeenCalledTimes(1);
      expect(mockAuthService.authenticateWallet).toHaveBeenCalledTimes(1);
      expect(mockAuthService.getAuthStats).toHaveBeenCalledTimes(1);
      expect(mockAuthService.logout).toHaveBeenCalledTimes(1);
    });

    it('should handle session refresh workflow', async () => {
      // Step 1: Initial authentication (abbreviated)
      const initialAuthResult = {
        success: true,
        sessionToken: 'initial-session-token',
        refreshToken: 'initial-refresh-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      };

      mockAuthService.authenticateWallet.mockResolvedValue(initialAuthResult);

      const initialAuthResponse = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: testWalletAddress,
          signature: testSignature,
          nonce: testNonce,
        })
        .expect(200);

      expect(initialAuthResponse.body.data.refreshToken).toBe('initial-refresh-token');

      // Step 2: Session expires, use refresh token
      const refreshResult = {
        success: true,
        sessionToken: 'new-session-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      mockAuthService.refreshSession.mockResolvedValue(refreshResult);

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'initial-refresh-token' })
        .expect(200);

      expect(refreshResponse.body).toEqual({
        success: true,
        data: {
          sessionToken: 'new-session-token',
          refreshToken: 'new-refresh-token',
          expiresAt: refreshResult.expiresAt.toISOString(),
        },
        metadata: expect.any(Object),
      });

      expect(mockAuthService.refreshSession).toHaveBeenCalledWith(
        'initial-refresh-token',
        expect.any(String), // user agent
        expect.any(String)  // ip address
      );

      // Step 3: Use new session token for authenticated requests
      mockAuthMiddleware.requireAuth.mockImplementation((req: any, res: any, next: any) => {
        req.user = { walletAddress: testWalletAddress };
        next();
      });

      mockAuthService.getAuthStats.mockResolvedValue({
        totalSessions: 200,
        activeSessions: 50,
        recentAttempts: 30,
        successRate: 95.0,
      });

      const newSessionResponse = await request(app)
        .get('/api/auth/stats')
        .set('Authorization', 'Bearer new-session-token')
        .expect(200);

      expect(newSessionResponse.body.data.totalSessions).toBe(200);
    });

    it('should handle multiple concurrent sessions for same wallet', async () => {
      // Simulate user logging in from multiple devices
      const device1AuthResult = {
        success: true,
        sessionToken: 'device1-session-token',
        refreshToken: 'device1-refresh-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      const device2AuthResult = {
        success: true,
        sessionToken: 'device2-session-token',
        refreshToken: 'device2-refresh-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      mockAuthService.authenticateWallet
        .mockResolvedValueOnce(device1AuthResult)
        .mockResolvedValueOnce(device2AuthResult);

      // Device 1 authentication
      const device1Response = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: testWalletAddress,
          signature: testSignature,
          nonce: testNonce,
        })
        .set('User-Agent', 'Device1-Browser')
        .expect(200);

      expect(device1Response.body.data.sessionToken).toBe('device1-session-token');

      // Device 2 authentication
      const device2Response = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: testWalletAddress,
          signature: testSignature,
          nonce: testNonce,
        })
        .set('User-Agent', 'Device2-Browser')
        .expect(200);

      expect(device2Response.body.data.sessionToken).toBe('device2-session-token');

      // Both sessions should be valid
      expect(mockAuthService.authenticateWallet).toHaveBeenCalledTimes(2);
    });
  });

  describe('Authentication Error Scenarios', () => {
    it('should handle authentication failures gracefully', async () => {
      // Step 1: Invalid nonce error
      const invalidNonceResult = {
        success: false,
        error: {
          code: 'INVALID_NONCE',
          message: 'Invalid or expired nonce. Please request a new one.',
        },
      };

      mockAuthService.authenticateWallet.mockResolvedValue(invalidNonceResult);

      const invalidNonceResponse = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: testWalletAddress,
          signature: testSignature,
          nonce: 'invalid-nonce',
        })
        .expect(400);

      expect(invalidNonceResponse.body.error.code).toBe('INVALID_NONCE');

      // Step 2: Invalid signature error
      const invalidSignatureResult = {
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid wallet signature. Please try signing again.',
        },
      };

      mockAuthService.authenticateWallet.mockResolvedValue(invalidSignatureResult);

      const invalidSignatureResponse = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: testWalletAddress,
          signature: 'invalid-signature',
          nonce: testNonce,
        })
        .expect(401);

      expect(invalidSignatureResponse.body.error.code).toBe('INVALID_SIGNATURE');

      // Step 3: Wallet not connected error
      const walletNotConnectedResult = {
        success: false,
        error: {
          code: 'WALLET_NOT_CONNECTED',
          message: 'Wallet is not connected. Please connect your wallet and try again.',
          details: 'The wallet connector is not available. This may be due to network issues or the wallet being disconnected.',
        },
      };

      mockAuthService.authenticateWallet.mockResolvedValue(walletNotConnectedResult);

      const walletNotConnectedResponse = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: testWalletAddress,
          signature: testSignature,
          nonce: testNonce,
        })
        .expect(400);

      expect(walletNotConnectedResponse.body.error.code).toBe('WALLET_NOT_CONNECTED');
      expect(walletNotConnectedResponse.body.error.details).toContain('wallet connector');
    });

    it('should handle refresh token errors', async () => {
      // Step 1: Invalid refresh token
      const invalidRefreshResult = {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token. Please log in again.',
        },
      };

      mockAuthService.refreshSession.mockResolvedValue(invalidRefreshResult);

      const invalidRefreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(invalidRefreshResponse.body.error.code).toBe('INVALID_REFRESH_TOKEN');

      // Step 2: Expired refresh token
      const expiredRefreshResult = {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token. Please log in again.',
        },
      };

      mockAuthService.refreshSession.mockResolvedValue(expiredRefreshResult);

      const expiredRefreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'expired-refresh-token' })
        .expect(401);

      expect(expiredRefreshResponse.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should handle service unavailability', async () => {
      // Step 1: Nonce generation service failure
      mockAuthService.generateNonce.mockRejectedValue(new Error('Failed to generate authentication nonce'));

      const nonceFailureResponse = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: testWalletAddress })
        .expect(500);

      expect(nonceFailureResponse.body.error.code).toBe('NONCE_GENERATION_FAILED');

      // Step 2: Authentication service failure
      mockAuthService.authenticateWallet.mockRejectedValue(new Error('Database connection failed'));

      const authFailureResponse = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: testWalletAddress,
          signature: testSignature,
          nonce: testNonce,
        })
        .expect(500);

      expect(authFailureResponse.body.error.code).toBe('AUTHENTICATION_ERROR');

      // Step 3: Refresh service failure
      mockAuthService.refreshSession.mockRejectedValue(new Error('Database error'));

      const refreshFailureResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' })
        .expect(500);

      expect(refreshFailureResponse.body.error.code).toBe('REFRESH_ERROR');
    });
  });

  describe('Session Management Scenarios', () => {
    it('should handle session expiration and cleanup', async () => {
      // Step 1: Create session that will expire
      const shortLivedAuthResult = {
        success: true,
        sessionToken: 'short-lived-token',
        refreshToken: 'short-lived-refresh',
        expiresAt: new Date(Date.now() + 1000), // Expires in 1 second
      };

      mockAuthService.authenticateWallet.mockResolvedValue(shortLivedAuthResult);

      const authResponse = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: testWalletAddress,
          signature: testSignature,
          nonce: testNonce,
        })
        .expect(200);

      expect(authResponse.body.data.sessionToken).toBe('short-lived-token');

      // Step 2: Wait for session to expire (simulate)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Step 3: Try to use expired session
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        // Simulate expired session - no user set
        next();
      });

      const expiredSessionResponse = await request(app)
        .get('/api/auth/status')
        .set('Authorization', 'Bearer short-lived-token')
        .expect(200);

      expect(expiredSessionResponse.body.data.authenticated).toBe(false);

      // Step 4: Cleanup expired sessions
      mockAuthService.cleanupExpiredSessions.mockResolvedValue(undefined);

      // This would typically be called by a background job
      await mockAuthService.cleanupExpiredSessions();
      expect(mockAuthService.cleanupExpiredSessions).toHaveBeenCalled();
    });

    it('should handle logout from multiple sessions', async () => {
      // Step 1: Create multiple sessions
      const session1Token = 'session1-token';
      const session2Token = 'session2-token';

      // Step 2: Logout from first session
      mockAuthService.logout.mockResolvedValueOnce(true);

      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        req.sessionToken = session1Token;
        next();
      });

      const logout1Response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${session1Token}`)
        .expect(200);

      expect(logout1Response.body.data.message).toBe('Successfully logged out');

      // Step 3: Logout from second session
      mockAuthService.logout.mockResolvedValueOnce(true);

      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        req.sessionToken = session2Token;
        next();
      });

      const logout2Response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${session2Token}`)
        .expect(200);

      expect(logout2Response.body.data.message).toBe('Successfully logged out');

      expect(mockAuthService.logout).toHaveBeenCalledTimes(2);
    });

    it('should handle logout without active session', async () => {
      // Try to logout without providing session token
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        // No session token provided
        next();
      });

      const noSessionLogoutResponse = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(noSessionLogoutResponse.body.data.message).toBe('No active session to logout');
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });
  });

  describe('Validation and Security Scenarios', () => {
    it('should validate input parameters correctly', async () => {
      // Step 1: Invalid wallet address format
      const invalidWalletResponse = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);

      expect(invalidWalletResponse.body.error.code).toBe('VALIDATION_ERROR');
      expect(invalidWalletResponse.body.error.message).toBe('Invalid wallet address format');

      // Step 2: Missing required fields in authentication
      const missingFieldsResponse = await request(app)
        .post('/api/auth/wallet')
        .send({ walletAddress: testWalletAddress }) // Missing signature and nonce
        .expect(400);

      expect(missingFieldsResponse.body.error.code).toBe('VALIDATION_ERROR');
      expect(missingFieldsResponse.body.error.details).toContain('Signature is required');
      expect(missingFieldsResponse.body.error.details).toContain('Nonce is required');

      // Step 3: Missing refresh token
      const missingRefreshTokenResponse = await request(app)
        .post('/api/auth/refresh')
        .send({}) // Missing refreshToken
        .expect(400);

      expect(missingRefreshTokenResponse.body.error.code).toBe('VALIDATION_ERROR');
      expect(missingRefreshTokenResponse.body.error.message).toBe('Refresh token is required');
    });

    it('should handle rate limiting scenarios', async () => {
      // Mock rate limiting to trigger after certain number of requests
      let requestCount = 0;
      mockAuthMiddleware.authRateLimit.mockImplementation(() => (req: any, res: any, next: any) => {
        requestCount++;
        if (requestCount > 5) {
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many authentication attempts. Please try again later.',
            },
            metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
          });
        }
        next();
      });

      // Make multiple requests to trigger rate limiting
      for (let i = 0; i < 5; i++) {
        mockAuthService.generateNonce.mockResolvedValue({
          nonce: `nonce-${i}`,
          message: `message-${i}`,
          expiresAt: new Date(),
        });

        await request(app)
          .post('/api/auth/nonce')
          .send({ walletAddress: testWalletAddress })
          .expect(200);
      }

      // 6th request should be rate limited
      const rateLimitedResponse = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: testWalletAddress })
        .expect(429);

      expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Health Check and Monitoring', () => {
    it('should provide health status', async () => {
      const healthResponse = await request(app)
        .get('/api/auth/health')
        .expect(200);

      expect(healthResponse.body).toEqual({
        success: true,
        data: {
          status: 'healthy',
          service: 'authentication',
          timestamp: expect.any(String),
        },
        metadata: expect.any(Object),
      });
    });

    it('should provide authentication statistics for monitoring', async () => {
      const mockStats = {
        totalSessions: 1000,
        activeSessions: 250,
        recentAttempts: 150,
        successRate: 94.5,
      };

      mockAuthService.getAuthStats.mockResolvedValue(mockStats);

      // Mock admin authentication
      mockAuthMiddleware.requireAuth.mockImplementation((req: any, res: any, next: any) => {
        req.user = { walletAddress: testWalletAddress, isAdmin: true };
        next();
      });

      const statsResponse = await request(app)
        .get('/api/auth/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(statsResponse.body.data).toEqual(mockStats);
      expect(mockAuthService.getAuthStats).toHaveBeenCalled();
    });
  });
});
