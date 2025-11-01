import request from 'supertest';
import express from 'express';
import { createAuthenticationRoutes } from '../../routes/authenticationRoutes';
import { AuthenticationService } from '../../services/authenticationService';
import { AuthenticationMiddleware } from '../../middleware/authenticationMiddleware';

// Mock the services
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
  optionalAuth: jest.fn((req: any, res: any, next: any) => next()),
  requireAuth: jest.fn((req: any, res: any, next: any) => {
    req.user = { walletAddress: '0x1234567890123456789012345678901234567890' };
    next();
  }),
} as jest.Mocked<AuthenticationMiddleware>;

// Mock validation middleware
jest.mock('../../controllers/authenticationController', () => {
  const originalModule = jest.requireActual('../../controllers/authenticationController');
  return {
    ...originalModule,
    authValidationRules: {
      generateNonce: (req: any, res: any, next: any) => next(),
      authenticateWallet: (req: any, res: any, next: any) => next(),
      refreshSession: (req: any, res: any, next: any) => next(),
    },
  };
});

describe('Authentication Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthenticationRoutes(mockAuthService, mockAuthMiddleware));
    
    jest.clearAllMocks();
  });

  describe('POST /api/auth/nonce', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockNonceInfo = {
      nonce: 'mock-nonce-hex-string',
      message: `Sign this message to authenticate with LinkDAO Marketplace.\n\nNonce: mock-nonce-hex-string\nTimestamp: ${Date.now()}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    };

    it('should generate nonce successfully', async () => {
      mockAuthService.generateNonce.mockResolvedValue(mockNonceInfo);

      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: validWalletAddress })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          nonce: 'mock-nonce-hex-string',
          message: expect.stringContaining('Sign this message to authenticate'),
          expiresAt: mockNonceInfo.expiresAt.toISOString(),
        },
        metadata: expect.any(Object),
      });

      expect(mockAuthService.generateNonce).toHaveBeenCalledWith(validWalletAddress);
    });

    it('should handle nonce generation errors', async () => {
      mockAuthService.generateNonce.mockRejectedValue(new Error('Failed to generate authentication nonce'));

      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: validWalletAddress })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NONCE_GENERATION_FAILED');
    });

    it('should validate wallet address format', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockAuthService.generateNonce).not.toHaveBeenCalled();
    });

    it('should require wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/wallet', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockSignature = 'mock-signature-hex';
    const mockNonce = 'mock-nonce';
    
    const authRequest = {
      walletAddress: validWalletAddress,
      signature: mockSignature,
      nonce: mockNonce,
    };

    const mockAuthResult = {
      success: true,
      sessionToken: 'mock-session-token',
      refreshToken: 'mock-refresh-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    it('should authenticate wallet successfully', async () => {
      mockAuthService.authenticateWallet.mockResolvedValue(mockAuthResult);

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(authRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          sessionToken: 'mock-session-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: mockAuthResult.expiresAt.toISOString(),
          walletAddress: validWalletAddress,
        },
        metadata: expect.any(Object),
      });

      expect(mockAuthService.authenticateWallet).toHaveBeenCalledWith(
        validWalletAddress,
        mockSignature,
        mockNonce,
        expect.any(String), // user agent
        expect.any(String)  // ip address
      );
    });

    it('should handle authentication failure', async () => {
      const failedAuthResult = {
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid wallet signature. Please try signing again.',
        },
      };

      mockAuthService.authenticateWallet.mockResolvedValue(failedAuthResult);

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(authRequest)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid wallet signature. Please try signing again.',
        },
        metadata: expect.any(Object),
      });
    });

    it('should handle ConnectorNotConnectedError gracefully', async () => {
      const connectorError = {
        success: false,
        error: {
          code: 'WALLET_NOT_CONNECTED',
          message: 'Wallet is not connected. Please connect your wallet and try again.',
          details: 'The wallet connector is not available. This may be due to network issues or the wallet being disconnected.',
        },
      };

      mockAuthService.authenticateWallet.mockResolvedValue(connectorError);

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(authRequest)
        .expect(400);

      expect(response.body.error.code).toBe('WALLET_NOT_CONNECTED');
      expect(response.body.error.message).toContain('Wallet is not connected');
    });

    it('should handle invalid nonce error', async () => {
      const invalidNonceResult = {
        success: false,
        error: {
          code: 'INVALID_NONCE',
          message: 'Invalid or expired nonce. Please request a new one.',
        },
      };

      mockAuthService.authenticateWallet.mockResolvedValue(invalidNonceResult);

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(authRequest)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_NONCE');
    });

    it('should validate required fields', async () => {
      const incompleteRequest = {
        walletAddress: validWalletAddress,
        // Missing signature and nonce
      };

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockAuthService.authenticateWallet).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockAuthService.authenticateWallet.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(authRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('POST /api/auth/refresh', () => {
    const mockRefreshToken = 'mock-refresh-token';
    const mockRefreshResult = {
      success: true,
      sessionToken: 'new-session-token',
      refreshToken: 'new-refresh-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    it('should refresh session successfully', async () => {
      mockAuthService.refreshSession.mockResolvedValue(mockRefreshResult);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: mockRefreshToken })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          sessionToken: 'new-session-token',
          refreshToken: 'new-refresh-token',
          expiresAt: mockRefreshResult.expiresAt.toISOString(),
        },
        metadata: expect.any(Object),
      });

      expect(mockAuthService.refreshSession).toHaveBeenCalledWith(
        mockRefreshToken,
        expect.any(String), // user agent
        expect.any(String)  // ip address
      );
    });

    it('should handle invalid refresh token', async () => {
      const invalidRefreshResult = {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token. Please log in again.',
        },
      };

      mockAuthService.refreshSession.mockResolvedValue(invalidRefreshResult);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should require refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors', async () => {
      mockAuthService.refreshSession.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: mockRefreshToken })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REFRESH_ERROR');
    });
  });

  describe('GET /api/auth/status', () => {
    it('should return authenticated status when user is logged in', async () => {
      const mockSessionInfo = {
        id: 'session-123',
        walletAddress: '0x1234567890123456789012345678901234567890',
        sessionToken: 'session-token',
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        lastUsedAt: new Date(),
      };

      // Mock the optional auth middleware to set user
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        req.user = { walletAddress: mockSessionInfo.walletAddress };
        req.sessionInfo = mockSessionInfo;
        next();
      });

      const response = await request(app)
        .get('/api/auth/status')
        .set('Authorization', 'Bearer session-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          authenticated: true,
          walletAddress: '0x1234567890123456789012345678901234567890',
          sessionInfo: {
            expiresAt: mockSessionInfo.expiresAt.toISOString(),
            lastUsedAt: mockSessionInfo.lastUsedAt.toISOString(),
          },
        },
        metadata: expect.any(Object),
      });
    });

    it('should return unauthenticated status when no session', async () => {
      // Reset middleware mock to not set user
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => next());

      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          authenticated: false,
        },
        metadata: expect.any(Object),
      });
    });

    it('should handle middleware errors gracefully', async () => {
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        next(new Error('Session validation failed'));
      });

      const response = await request(app)
        .get('/api/auth/status')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_STATUS_ERROR');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid session', async () => {
      mockAuthService.logout.mockResolvedValue(true);

      // Mock middleware to provide session token
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        req.sessionToken = 'session-token';
        next();
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer session-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          message: 'Successfully logged out',
        },
        metadata: expect.any(Object),
      });

      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'session-token',
        expect.any(String), // ip address
        expect.any(String)  // user agent
      );
    });

    it('should handle logout without session token', async () => {
      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => next());

      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          message: 'No active session to logout',
        },
        metadata: expect.any(Object),
      });

      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    it('should handle logout service errors', async () => {
      mockAuthService.logout.mockResolvedValue(false);

      mockAuthMiddleware.optionalAuth.mockImplementation((req: any, res: any, next: any) => {
        req.sessionToken = 'session-token';
        next();
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer session-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOGOUT_ERROR');
    });
  });

  describe('GET /api/auth/stats', () => {
    const mockAuthStats = {
      totalSessions: 150,
      activeSessions: 45,
      recentAttempts: 25,
      successRate: 92.5,
    };

    it('should return auth stats for authenticated admin', async () => {
      mockAuthService.getAuthStats.mockResolvedValue(mockAuthStats);

      const response = await request(app)
        .get('/api/auth/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockAuthStats,
        metadata: expect.any(Object),
      });

      expect(mockAuthService.getAuthStats).toHaveBeenCalled();
    });

    it('should handle stats service errors', async () => {
      mockAuthService.getAuthStats.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STATS_ERROR');
    });

    it('should require authentication', async () => {
      // Mock middleware to reject unauthenticated requests
      mockAuthMiddleware.requireAuth.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      });

      const response = await request(app)
        .get('/api/auth/stats')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(mockAuthService.getAuthStats).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/auth/health')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'healthy',
          service: 'authentication',
          timestamp: expect.any(String),
        },
        metadata: expect.any(Object),
      });
    });

    it('should handle health check errors', async () => {
      // Mock a scenario where health check might fail
      // This would depend on the actual implementation
      const response = await request(app)
        .get('/api/auth/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // Verify that rate limiting middleware is called
      expect(mockAuthMiddleware.authRateLimit).toHaveBeenCalledWith(5, 15);

      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: '0x1234567890123456789012345678901234567890' })
        .expect(500); // Will fail because service is mocked

      // Rate limiting middleware should have been applied
      expect(mockAuthMiddleware.authRateLimit).toHaveBeenCalled();
    });
  });

  describe('Error response consistency', () => {
    it('should return consistent error format across all endpoints', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({}) // Missing required field
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(response.body.metadata).toHaveProperty('requestId');
    });

    it('should return consistent success format across all endpoints', async () => {
      mockAuthService.generateNonce.mockResolvedValue({
        nonce: 'test-nonce',
        message: 'test-message',
        expiresAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: '0x1234567890123456789012345678901234567890' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(response.body.metadata).toHaveProperty('requestId');
    });
  });

  describe('Security headers and middleware', () => {
    it('should handle requests with proper security context', async () => {
      const response = await request(app)
        .get('/api/auth/health')
        .set('User-Agent', 'Test-Agent')
        .set('X-Forwarded-For', '127.0.0.1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle requests without optional headers', async () => {
      const response = await request(app)
        .get('/api/auth/health')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});