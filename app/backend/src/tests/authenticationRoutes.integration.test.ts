import request from 'supertest';
import express from 'express';
import { createDefaultAuthRoutes } from '../routes/authenticationRoutes';

// Mock environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';

// Mock the authentication service
jest.mock('../services/authenticationService');
jest.mock('drizzle-orm/postgres-js');
jest.mock('postgres');

describe('Authentication Routes Integration', () => {
  let app: express.Application;
  let mockAuthService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock the authentication service
    mockAuthService = {
      generateNonce: jest.fn(),
      authenticateWallet: jest.fn(),
      refreshSession: jest.fn(),
      validateSession: jest.fn(),
      logout: jest.fn(),
      getAuthStats: jest.fn(),
    };

    // Mock the service constructor
    const { AuthenticationService } = require('../services/authenticationService');
    AuthenticationService.mockImplementation(() => mockAuthService);

    // Add routes
    app.use('/api/auth', createDefaultAuthRoutes());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/nonce', () => {
    it('should generate nonce for valid wallet address', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const mockNonce = {
        nonce: 'test-nonce',
        message: 'Sign this message...',
        expiresAt: new Date(),
      };

      mockAuthService.generateNonce.mockResolvedValue(mockNonce);

      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nonce).toBe(mockNonce.nonce);
      expect(mockAuthService.generateNonce).toHaveBeenCalledWith(walletAddress);
    });

    it('should reject invalid wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing wallet address', async () => {
      const response = await request(app)
        .post('/api/auth/nonce')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/wallet', () => {
    it('should authenticate wallet with valid signature', async () => {
      const authRequest = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        signature: '0x' + 'a'.repeat(130),
        nonce: 'test-nonce',
      };

      const mockAuthResult = {
        success: true,
        sessionToken: 'session-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
      };

      mockAuthService.authenticateWallet.mockResolvedValue(mockAuthResult);

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(authRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionToken).toBe(mockAuthResult.sessionToken);
      expect(response.body.refreshToken).toBe(mockAuthResult.refreshToken);
      expect(mockAuthService.authenticateWallet).toHaveBeenCalledWith(
        authRequest.walletAddress,
        authRequest.signature,
        authRequest.nonce,
        expect.any(String), // userAgent
        expect.any(String)  // ipAddress
      );
    });

    it('should handle authentication failure', async () => {
      const authRequest = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        signature: '0x' + 'a'.repeat(130),
        nonce: 'test-nonce',
      };

      const mockAuthResult = {
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid wallet signature',
        },
      };

      mockAuthService.authenticateWallet.mockResolvedValue(mockAuthResult);

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(authRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/wallet')
        .send({
          walletAddress: '0x1234567890123456789012345678901234567890',
          // missing signature and nonce
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle ConnectorNotConnectedError', async () => {
      const authRequest = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        signature: '0x' + 'a'.repeat(130),
        nonce: 'test-nonce',
      };

      const mockAuthResult = {
        success: false,
        error: {
          code: 'WALLET_NOT_CONNECTED',
          message: 'Wallet is not connected',
        },
      };

      mockAuthService.authenticateWallet.mockResolvedValue(mockAuthResult);

      const response = await request(app)
        .post('/api/auth/wallet')
        .send(authRequest)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WALLET_NOT_CONNECTED');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh session with valid refresh token', async () => {
      const refreshRequest = {
        refreshToken: 'valid-refresh-token',
      };

      const mockRefreshResult = {
        success: true,
        sessionToken: 'new-session-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(),
      };

      mockAuthService.refreshSession.mockResolvedValue(mockRefreshResult);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.sessionToken).toBe(mockRefreshResult.sessionToken);
      expect(response.body.refreshToken).toBe(mockRefreshResult.refreshToken);
    });

    it('should handle invalid refresh token', async () => {
      const refreshRequest = {
        refreshToken: 'invalid-refresh-token',
      };

      const mockRefreshResult = {
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      };

      mockAuthService.refreshSession.mockResolvedValue(mockRefreshResult);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshRequest)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('GET /api/auth/status', () => {
    it('should return authenticated status for valid session', async () => {
      const mockSessionInfo = {
        id: 'session-id',
        walletAddress: '0x1234567890123456789012345678901234567890',
        sessionToken: 'session-token',
        expiresAt: new Date(),
        isActive: true,
        lastUsedAt: new Date(),
      };

      mockAuthService.validateSession.mockResolvedValue(mockSessionInfo);

      const response = await request(app)
        .get('/api/auth/status')
        .set('Authorization', 'Bearer session-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authenticated).toBe(true);
      expect(response.body.data.walletAddress).toBe(mockSessionInfo.walletAddress);
    });

    it('should return unauthenticated status for invalid session', async () => {
      mockAuthService.validateSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authenticated).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      mockAuthService.logout.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer session-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully logged out');
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'session-token',
        expect.any(String), // ipAddress
        expect.any(String)  // userAgent
      );
    });

    it('should handle logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Successfully logged out');
    });
  });

  describe('GET /api/auth/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/auth/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.service).toBe('authentication');
    });
  });

  describe('Rate limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      mockAuthService.generateNonce.mockResolvedValue({
        nonce: 'test-nonce',
        message: 'Sign this message...',
        expiresAt: new Date(),
      });

      // Make multiple requests quickly
      const requests = Array(6).fill(null).map(() =>
        request(app)
          .post('/api/auth/nonce')
          .send({ walletAddress })
      );

      const responses = await Promise.all(requests);

      // First 5 should succeed, 6th should be rate limited
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBe(5);
      expect(rateLimitedCount).toBe(1);
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      
      mockAuthService.generateNonce.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NONCE_GENERATION_FAILED');
    });
  });
});
