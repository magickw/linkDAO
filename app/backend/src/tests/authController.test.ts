import request from 'supertest';
import express from 'express';
import { AuthController } from '../controllers/authController';
import { UserProfileService } from '../services/userProfileService';
import { AuthService } from '../services/authService';
import { KYCService } from '../services/kycService';

// Mock dependencies
jest.mock('../services/userProfileService');
jest.mock('../services/authService');
jest.mock('../services/kycService');
jest.mock('../middleware/authMiddleware', () => ({
  generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
  verifySignature: jest.fn().mockResolvedValue(true),
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { walletAddress: '0x1234567890123456789012345678901234567890' };
    next();
  }
}));

describe('AuthController', () => {
  let app: express.Application;
  let authController: AuthController;
  let mockUserProfileService: jest.Mocked<UserProfileService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockKYCService: jest.Mocked<KYCService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    authController = new AuthController();
    mockUserProfileService = new UserProfileService() as jest.Mocked<UserProfileService>;
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    mockKYCService = new KYCService() as jest.Mocked<KYCService>;

    // Setup routes
    app.get('/nonce/:address', authController.getNonce.bind(authController));
    app.post('/wallet', authController.authenticateWallet.bind(authController));
    app.post('/register', authController.register.bind(authController));
    app.get('/me', require('../middleware/authMiddleware').authenticateToken, authController.getCurrentUser.bind(authController));
    app.post('/kyc/initiate', require('../middleware/authMiddleware').authenticateToken, authController.initiateKYC.bind(authController));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('GET /nonce/:address', () => {
    it('should generate nonce for valid address', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const nonce = 'test-nonce-123';
      
      mockAuthService.generateNonce = jest.fn().mockResolvedValue(nonce);

      const response = await request(app)
        .get(`/nonce/${address}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.nonce).toBe(nonce);
      expect(response.body.message).toContain(nonce);
      expect(mockAuthService.generateNonce).toHaveBeenCalledWith(address);
    });

    it('should return error for missing address', async () => {
      const response = await request(app)
        .get('/nonce/')
        .expect(404);
    });
  });

  describe('POST /wallet', () => {
    it('should authenticate wallet with valid signature', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const signature = '0xsignature';
      const message = 'Sign this message';
      const nonce = 'test-nonce';
      
      const mockProfile = {
        id: 'user-123',
        walletAddress: address,
        handle: 'testuser',
        ens: '',
        kycStatus: 'none',
        createdAt: new Date().toISOString()
      };

      mockAuthService.verifyNonce = jest.fn().mockResolvedValue(true);
      mockUserProfileService.getProfileByAddress = jest.fn().mockResolvedValue(mockProfile);
      mockAuthService.getUserPermissions = jest.fn().mockResolvedValue(['basic_trading']);
      mockAuthService.updateLastLogin = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/wallet')
        .send({ address, signature, message, nonce })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user.address).toBe(address);
    });

    it('should create profile for new user', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const signature = '0xsignature';
      const message = 'Sign this message';
      const nonce = 'test-nonce';
      
      const mockProfile = {
        id: 'user-123',
        walletAddress: address,
        handle: `user_${address.slice(-8)}`,
        ens: '',
        kycStatus: 'none',
        createdAt: new Date().toISOString()
      };

      mockAuthService.verifyNonce = jest.fn().mockResolvedValue(true);
      mockUserProfileService.getProfileByAddress = jest.fn()
        .mockResolvedValueOnce(null) // First call returns null (no profile)
        .mockResolvedValueOnce(mockProfile); // Second call returns created profile
      mockUserProfileService.createProfile = jest.fn().mockResolvedValue(mockProfile);
      mockAuthService.getUserPermissions = jest.fn().mockResolvedValue(['basic_trading']);
      mockAuthService.updateLastLogin = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/wallet')
        .send({ address, signature, message, nonce })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockUserProfileService.createProfile).toHaveBeenCalled();
    });

    it('should return error for invalid signature', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const signature = '0xinvalidsignature';
      const message = 'Sign this message';
      const nonce = 'test-nonce';

      // Mock verifySignature to return false
      const { verifySignature } = require('../middleware/authMiddleware');
      verifySignature.mockResolvedValue(false);

      const response = await request(app)
        .post('/wallet')
        .send({ address, signature, message, nonce })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for invalid nonce', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const signature = '0xsignature';
      const message = 'Sign this message';
      const nonce = 'invalid-nonce';

      mockAuthService.verifyNonce = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/wallet')
        .send({ address, signature, message, nonce })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /register', () => {
    it('should register new user with valid data', async () => {
      const userData = {
        address: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
        ens: 'testuser.eth',
        email: 'test@example.com'
      };

      const mockProfile = {
        id: 'user-123',
        walletAddress: userData.address,
        handle: userData.handle,
        ens: userData.ens,
        email: userData.email,
        kycStatus: 'none',
        createdAt: new Date().toISOString()
      };

      mockUserProfileService.getProfileByAddress = jest.fn().mockResolvedValue(null);
      mockUserProfileService.getProfileByHandle = jest.fn().mockResolvedValue(null);
      mockUserProfileService.createProfile = jest.fn().mockResolvedValue(mockProfile);
      mockAuthService.initializeUserSession = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.user.handle).toBe(userData.handle);
    });

    it('should return error for existing user', async () => {
      const userData = {
        address: '0x1234567890123456789012345678901234567890',
        handle: 'testuser'
      };

      const existingProfile = {
        id: 'user-123',
        walletAddress: userData.address,
        handle: userData.handle
      };

      mockUserProfileService.getProfileByAddress = jest.fn().mockResolvedValue(existingProfile);

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error for taken handle', async () => {
      const userData = {
        address: '0x1234567890123456789012345678901234567890',
        handle: 'testuser'
      };

      const existingProfile = {
        id: 'user-456',
        walletAddress: '0xdifferentaddress',
        handle: userData.handle
      };

      mockUserProfileService.getProfileByAddress = jest.fn().mockResolvedValue(null);
      mockUserProfileService.getProfileByHandle = jest.fn().mockResolvedValue(existingProfile);

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error for invalid handle format', async () => {
      const userData = {
        address: '0x1234567890123456789012345678901234567890',
        handle: 'ab' // Too short
      };

      const response = await request(app)
        .post('/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /me', () => {
    it('should return current user profile', async () => {
      const mockProfile = {
        id: 'user-123',
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
        ens: 'testuser.eth',
        email: 'test@example.com',
        kycStatus: 'basic',
        createdAt: new Date().toISOString()
      };

      const mockKYCStatus = {
        status: 'approved',
        tier: 'basic'
      };

      const mockSessionInfo = {
        lastLogin: new Date().toISOString(),
        loginCount: 5
      };

      mockUserProfileService.getProfileByAddress = jest.fn().mockResolvedValue(mockProfile);
      mockKYCService.getKYCStatus = jest.fn().mockResolvedValue(mockKYCStatus);
      mockAuthService.getSessionInfo = jest.fn().mockResolvedValue(mockSessionInfo);

      const response = await request(app)
        .get('/me')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.handle).toBe(mockProfile.handle);
      expect(response.body.user.kycStatus).toBe(mockKYCStatus.status);
    });

    it('should return error for non-existent user', async () => {
      mockUserProfileService.getProfileByAddress = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/me')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /kyc/initiate', () => {
    it('should initiate KYC verification', async () => {
      const kycData = {
        tier: 'basic',
        documents: []
      };

      const mockKYCResult = {
        id: 'kyc-123',
        status: 'pending',
        requiredDocuments: ['national_id'],
        estimatedProcessingTime: '1-2 business days'
      };

      mockKYCService.initiateKYC = jest.fn().mockResolvedValue(mockKYCResult);

      const response = await request(app)
        .post('/kyc/initiate')
        .send(kycData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.kycId).toBe(mockKYCResult.id);
      expect(response.body.status).toBe(mockKYCResult.status);
    });

    it('should return error for invalid tier', async () => {
      const kycData = {
        tier: 'invalid',
        documents: []
      };

      const response = await request(app)
        .post('/kyc/initiate')
        .send(kycData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});