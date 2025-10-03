import request from 'supertest';
import express from 'express';
import sellerProfileRoutes from '../../routes/sellerProfileRoutes';
import { sellerProfileService } from '../../services/sellerProfileService';

// Mock the service
jest.mock('../../services/sellerProfileService');

// Mock middleware
jest.mock('../../middleware/cachingMiddleware', () => ({
  cachingMiddleware: {
    sellerProfileCache: () => (req: any, res: any, next: any) => next(),
    invalidate: () => (req: any, res: any, next: any) => next(),
    cache: () => (req: any, res: any, next: any) => next(),
  },
  rateLimitWithCache: () => (req: any, res: any, next: any) => next(),
}));

describe('Seller Profile Routes Integration Tests', () => {
  let app: express.Application;
  let mockSellerProfileService: jest.Mocked<typeof sellerProfileService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/marketplace', sellerProfileRoutes);
    
    mockSellerProfileService = sellerProfileService as jest.Mocked<typeof sellerProfileService>;
    jest.clearAllMocks();
  });

  describe('GET /api/marketplace/seller/:walletAddress', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockProfile = {
      walletAddress: validWalletAddress,
      displayName: 'Test Seller',
      ensHandle: 'testseller.eth',
      storeDescription: 'Test store',
      coverImageUrl: 'https://example.com/image.jpg',
      isVerified: false,
      onboardingCompleted: true,
      onboardingSteps: {
        profile_setup: true,
        verification: false,
        payout_setup: true,
        first_listing: true
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('should return seller profile when found', async () => {
      mockSellerProfileService.getProfile.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get(`/api/marketplace/seller/${validWalletAddress}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          walletAddress: validWalletAddress,
          displayName: 'Test Seller',
          ensHandle: 'testseller.eth',
          storeDescription: 'Test store',
          coverImageUrl: 'https://example.com/image.jpg',
          isVerified: false,
          onboardingCompleted: true,
          onboardingSteps: {
            profile_setup: true,
            verification: false,
            payout_setup: true,
            first_listing: true
          },
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z',
        },
        message: undefined,
        metadata: expect.any(Object),
      });

      expect(mockSellerProfileService.getProfile).toHaveBeenCalledWith(validWalletAddress);
    });

    it('should return 404 when seller profile not found', async () => {
      mockSellerProfileService.getProfile.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/marketplace/seller/${validWalletAddress}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Seller profile not found',
        },
        metadata: expect.any(Object),
      });
    });

    it('should return 400 for invalid wallet address format', async () => {
      const invalidAddress = 'invalid-address';

      const response = await request(app)
        .get(`/api/marketplace/seller/${invalidAddress}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid wallet address',
          details: [
            {
              field: 'walletAddress',
              message: 'Invalid wallet address format'
            }
          ]
        },
        metadata: expect.any(Object),
      });

      expect(mockSellerProfileService.getProfile).not.toHaveBeenCalled();
    });

    it('should return 500 when service throws error', async () => {
      mockSellerProfileService.getProfile.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/marketplace/seller/${validWalletAddress}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'PROFILE_FETCH_ERROR',
          message: 'Failed to fetch seller profile',
          details: {
            error: 'Database connection failed'
          }
        },
        metadata: expect.any(Object),
      });
    });

    it('should handle wallet address validation error from service', async () => {
      mockSellerProfileService.getProfile.mockRejectedValue(new Error('Invalid wallet address format'));

      const response = await request(app)
        .get(`/api/marketplace/seller/${validWalletAddress}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].message).toBe('Invalid wallet address format');
    });
  });

  describe('POST /api/marketplace/seller/profile', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const createRequest = {
      walletAddress: validWalletAddress,
      displayName: 'New Seller',
      ensHandle: 'newseller.eth',
      storeDescription: 'New store description',
      coverImageUrl: 'https://example.com/new-image.jpg',
    };

    const mockCreatedProfile = {
      ...createRequest,
      isVerified: false,
      onboardingCompleted: false,
      onboardingSteps: {
        profile_setup: false,
        verification: false,
        payout_setup: false,
        first_listing: false
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    it('should create new seller profile successfully', async () => {
      mockSellerProfileService.getProfile.mockResolvedValue(null); // Profile doesn't exist
      mockSellerProfileService.createProfile.mockResolvedValue(mockCreatedProfile);

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(createRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          walletAddress: validWalletAddress,
          displayName: 'New Seller',
          ensHandle: 'newseller.eth',
          storeDescription: 'New store description',
          coverImageUrl: 'https://example.com/new-image.jpg',
          isVerified: false,
          onboardingCompleted: false,
          onboardingSteps: {
            profile_setup: false,
            verification: false,
            payout_setup: false,
            first_listing: false
          },
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        message: undefined,
        metadata: expect.any(Object),
      });

      expect(mockSellerProfileService.getProfile).toHaveBeenCalledWith(validWalletAddress);
      expect(mockSellerProfileService.createProfile).toHaveBeenCalledWith(createRequest);
    });

    it('should update existing seller profile', async () => {
      const existingProfile = { ...mockCreatedProfile, displayName: 'Old Name' };
      const updatedProfile = { ...mockCreatedProfile, displayName: 'New Seller' };

      mockSellerProfileService.getProfile.mockResolvedValue(existingProfile);
      mockSellerProfileService.updateProfile.mockResolvedValue(updatedProfile);

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(createRequest)
        .expect(200);

      expect(response.body.data.displayName).toBe('New Seller');
      expect(mockSellerProfileService.updateProfile).toHaveBeenCalledWith(
        validWalletAddress,
        {
          displayName: 'New Seller',
          ensHandle: 'newseller.eth',
          storeDescription: 'New store description',
          coverImageUrl: 'https://example.com/new-image.jpg',
        }
      );
    });

    it('should return 400 for missing wallet address', async () => {
      const invalidRequest = { ...createRequest };
      delete invalidRequest.walletAddress;

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('walletAddress');
      expect(response.body.error.details[0].message).toBe('Wallet address is required');
    });

    it('should return 400 for invalid wallet address format', async () => {
      const invalidRequest = { ...createRequest, walletAddress: 'invalid-address' };

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('walletAddress');
      expect(response.body.error.details[0].message).toBe('Invalid wallet address format');
    });

    it('should return 400 for invalid ENS handle format', async () => {
      const invalidRequest = { ...createRequest, ensHandle: 'invalid-ens' };

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('ensHandle');
      expect(response.body.error.details[0].message).toBe('Invalid ENS handle format');
    });

    it('should handle service validation errors', async () => {
      mockSellerProfileService.getProfile.mockResolvedValue(null);
      mockSellerProfileService.createProfile.mockRejectedValue(new Error('Invalid wallet address format'));

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(createRequest)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle profile conflict errors', async () => {
      mockSellerProfileService.getProfile.mockResolvedValue(null);
      mockSellerProfileService.createProfile.mockRejectedValue(new Error('Profile already exists'));

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(createRequest)
        .expect(409);

      expect(response.body.error.code).toBe('PROFILE_CONFLICT');
      expect(response.body.error.message).toBe('Seller profile already exists');
    });

    it('should handle general service errors', async () => {
      mockSellerProfileService.getProfile.mockResolvedValue(null);
      mockSellerProfileService.createProfile.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(createRequest)
        .expect(500);

      expect(response.body.error.code).toBe('PROFILE_CREATE_ERROR');
      expect(response.body.error.message).toBe('Failed to create or update seller profile');
    });
  });

  describe('GET /api/marketplace/seller/onboarding/:walletAddress', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockOnboardingStatus = {
      walletAddress: validWalletAddress,
      completed: false,
      steps: {
        profile_setup: true,
        verification: false,
        payout_setup: false,
        first_listing: false
      },
      completionPercentage: 25,
      nextStep: 'verification'
    };

    it('should return onboarding status successfully', async () => {
      mockSellerProfileService.getOnboardingStatus.mockResolvedValue(mockOnboardingStatus);

      const response = await request(app)
        .get(`/api/marketplace/seller/onboarding/${validWalletAddress}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockOnboardingStatus,
        message: undefined,
        metadata: expect.any(Object),
      });

      expect(mockSellerProfileService.getOnboardingStatus).toHaveBeenCalledWith(validWalletAddress);
    });

    it('should return 400 for invalid wallet address', async () => {
      const response = await request(app)
        .get('/api/marketplace/seller/onboarding/invalid-address')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('walletAddress');
    });

    it('should handle service errors', async () => {
      mockSellerProfileService.getOnboardingStatus.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/marketplace/seller/onboarding/${validWalletAddress}`)
        .expect(500);

      expect(response.body.error.code).toBe('ONBOARDING_FETCH_ERROR');
    });
  });

  describe('PUT /api/marketplace/seller/onboarding/:walletAddress/:step', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const validStep = 'verification';
    const mockUpdatedStatus = {
      walletAddress: validWalletAddress,
      completed: false,
      steps: {
        profile_setup: true,
        verification: true,
        payout_setup: false,
        first_listing: false
      },
      completionPercentage: 50,
      nextStep: 'payout_setup'
    };

    it('should update onboarding step successfully', async () => {
      mockSellerProfileService.updateOnboardingStep.mockResolvedValue(mockUpdatedStatus);

      const response = await request(app)
        .put(`/api/marketplace/seller/onboarding/${validWalletAddress}/${validStep}`)
        .send({ completed: true })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedStatus,
        message: undefined,
        metadata: expect.any(Object),
      });

      expect(mockSellerProfileService.updateOnboardingStep).toHaveBeenCalledWith(
        validWalletAddress,
        validStep,
        true
      );
    });

    it('should return 400 for invalid wallet address', async () => {
      const response = await request(app)
        .put(`/api/marketplace/seller/onboarding/invalid-address/${validStep}`)
        .send({ completed: true })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('walletAddress');
    });

    it('should return 400 for invalid step', async () => {
      const response = await request(app)
        .put(`/api/marketplace/seller/onboarding/${validWalletAddress}/invalid_step`)
        .send({ completed: true })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('step');
      expect(response.body.error.details[0].message).toBe('Invalid onboarding step');
    });

    it('should return 400 for invalid completed value', async () => {
      const response = await request(app)
        .put(`/api/marketplace/seller/onboarding/${validWalletAddress}/${validStep}`)
        .send({ completed: 'not-boolean' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('completed');
      expect(response.body.error.details[0].message).toBe('Completed must be a boolean value');
    });

    it('should return 404 when profile not found', async () => {
      mockSellerProfileService.updateOnboardingStep.mockRejectedValue(new Error('Seller profile not found'));

      const response = await request(app)
        .put(`/api/marketplace/seller/onboarding/${validWalletAddress}/${validStep}`)
        .send({ completed: true })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Seller profile not found');
    });

    it('should handle general service errors', async () => {
      mockSellerProfileService.updateOnboardingStep.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/marketplace/seller/onboarding/${validWalletAddress}/${validStep}`)
        .send({ completed: true })
        .expect(500);

      expect(response.body.error.code).toBe('ONBOARDING_UPDATE_ERROR');
    });
  });

  describe('Error response format validation', () => {
    it('should return consistent error response format', async () => {
      const response = await request(app)
        .get('/api/marketplace/seller/invalid-address')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(response.body.metadata).toHaveProperty('requestId');
    });

    it('should return consistent success response format', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const mockProfile = {
        walletAddress: validWalletAddress,
        displayName: 'Test Seller',
        isVerified: false,
        onboardingCompleted: false,
        onboardingSteps: {
          profile_setup: false,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSellerProfileService.getProfile.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get(`/api/marketplace/seller/${validWalletAddress}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(response.body.metadata).toHaveProperty('requestId');
    });
  });

  describe('Rate limiting and caching', () => {
    it('should handle requests with rate limiting middleware', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      mockSellerProfileService.getProfile.mockResolvedValue(null);

      // Multiple requests should all be processed (since we're mocking the rate limiter)
      const promises = Array(5).fill(null).map(() =>
        request(app).get(`/api/marketplace/seller/${validWalletAddress}`)
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(404); // All should return 404 since profile is null
      });
    });

    it('should handle requests with caching middleware', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const mockProfile = {
        walletAddress: validWalletAddress,
        displayName: 'Cached Seller',
        isVerified: false,
        onboardingCompleted: false,
        onboardingSteps: {
          profile_setup: false,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSellerProfileService.getProfile.mockResolvedValue(mockProfile);

      const response = await request(app)
        .get(`/api/marketplace/seller/${validWalletAddress}`)
        .expect(200);

      expect(response.body.data.displayName).toBe('Cached Seller');
    });
  });
});