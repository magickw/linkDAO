import request from 'supertest';
import express from 'express';
import { sellerProfileService } from '../../services/sellerProfileService';
import { authenticationService } from '../../services/authenticationService';
import sellerProfileRoutes from '../../routes/sellerProfileRoutes';
import { createDefaultAuthRoutes } from '../../routes/authenticationRoutes';

// Mock services for controlled testing
jest.mock('../../services/sellerProfileService');
jest.mock('../../services/authenticationService');

// Mock middleware
jest.mock('../../middleware/cachingMiddleware', () => ({
  cachingMiddleware: {
    sellerProfileCache: () => (req: any, res: any, next: any) => next(),
    invalidate: () => (req: any, res: any, next: any) => next(),
    cache: () => (req: any, res: any, next: any) => next(),
  },
  rateLimitWithCache: () => (req: any, res: any, next: any) => next(),
}));

describe('Seller Onboarding Workflow E2E Tests', () => {
  let app: express.Application;
  let mockSellerProfileService: jest.Mocked<typeof sellerProfileService>;
  let mockAuthenticationService: jest.Mocked<typeof authenticationService>;

  const testWalletAddress = '0x1234567890123456789012345678901234567890';
  const testSignature = 'mock-signature-hex-string';
  const testNonce = 'mock-nonce-hex-string';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/marketplace', sellerProfileRoutes);
    
    mockSellerProfileService = sellerProfileService as jest.Mocked<typeof sellerProfileService>;
    mockAuthenticationService = authenticationService as jest.Mocked<typeof authenticationService>;
    
    jest.clearAllMocks();
  });

  describe('Complete Seller Onboarding Flow', () => {
    it('should complete full seller onboarding workflow from wallet connection to profile creation', async () => {
      // Step 1: Check initial onboarding status (should return default for new user)
      const initialOnboardingStatus = {
        walletAddress: testWalletAddress,
        completed: false,
        steps: {
          profile_setup: false,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        completionPercentage: 0,
        nextStep: 'profile_setup'
      };

      mockSellerProfileService.getOnboardingStatus.mockResolvedValue(initialOnboardingStatus);

      const initialStatusResponse = await request(app)
        .get(`/api/marketplace/seller/onboarding/${testWalletAddress}`)
        .expect(200);

      expect(initialStatusResponse.body.data).toEqual(initialOnboardingStatus);
      expect(initialStatusResponse.body.data.nextStep).toBe('profile_setup');

      // Step 2: Create seller profile (first step in onboarding)
      const profileCreateRequest = {
        walletAddress: testWalletAddress,
        displayName: 'New Marketplace Seller',
        ensHandle: 'newseller.eth',
        storeDescription: 'Welcome to my new store on the marketplace!',
        coverImageUrl: 'https://example.com/store-cover.jpg',
      };

      const createdProfile = {
        ...profileCreateRequest,
        isVerified: false,
        onboardingCompleted: false,
        onboardingSteps: {
          profile_setup: true, // Should be marked as completed after profile creation
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      // Mock profile doesn't exist initially
      mockSellerProfileService.getProfile.mockResolvedValueOnce(null);
      mockSellerProfileService.createProfile.mockResolvedValue(createdProfile);

      const profileCreateResponse = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(profileCreateRequest)
        .expect(201);

      expect(profileCreateResponse.body.data).toEqual({
        walletAddress: testWalletAddress,
        displayName: 'New Marketplace Seller',
        ensHandle: 'newseller.eth',
        storeDescription: 'Welcome to my new store on the marketplace!',
        coverImageUrl: 'https://example.com/store-cover.jpg',
        isVerified: false,
        onboardingCompleted: false,
        onboardingSteps: {
          profile_setup: true,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      });

      // Step 3: Check onboarding status after profile creation
      const updatedOnboardingStatus = {
        walletAddress: testWalletAddress,
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

      mockSellerProfileService.getOnboardingStatus.mockResolvedValue(updatedOnboardingStatus);

      const updatedStatusResponse = await request(app)
        .get(`/api/marketplace/seller/onboarding/${testWalletAddress}`)
        .expect(200);

      expect(updatedStatusResponse.body.data.completionPercentage).toBe(25);
      expect(updatedStatusResponse.body.data.nextStep).toBe('verification');
      expect(updatedStatusResponse.body.data.steps.profile_setup).toBe(true);

      // Step 4: Complete verification step
      const verificationCompletedStatus = {
        walletAddress: testWalletAddress,
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

      mockSellerProfileService.updateOnboardingStep.mockResolvedValue(verificationCompletedStatus);

      const verificationResponse = await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/verification`)
        .send({ completed: true })
        .expect(200);

      expect(verificationResponse.body.data.completionPercentage).toBe(50);
      expect(verificationResponse.body.data.nextStep).toBe('payout_setup');
      expect(verificationResponse.body.data.steps.verification).toBe(true);

      // Step 5: Complete payout setup step
      const payoutCompletedStatus = {
        walletAddress: testWalletAddress,
        completed: false,
        steps: {
          profile_setup: true,
          verification: true,
          payout_setup: true,
          first_listing: false
        },
        completionPercentage: 75,
        nextStep: 'first_listing'
      };

      mockSellerProfileService.updateOnboardingStep.mockResolvedValue(payoutCompletedStatus);

      const payoutResponse = await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/payout_setup`)
        .send({ completed: true })
        .expect(200);

      expect(payoutResponse.body.data.completionPercentage).toBe(75);
      expect(payoutResponse.body.data.nextStep).toBe('first_listing');
      expect(payoutResponse.body.data.steps.payout_setup).toBe(true);

      // Step 6: Complete first listing step (final step)
      const onboardingCompletedStatus = {
        walletAddress: testWalletAddress,
        completed: true,
        steps: {
          profile_setup: true,
          verification: true,
          payout_setup: true,
          first_listing: true
        },
        completionPercentage: 100,
        nextStep: undefined // All steps completed
      };

      mockSellerProfileService.updateOnboardingStep.mockResolvedValue(onboardingCompletedStatus);

      const firstListingResponse = await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/first_listing`)
        .send({ completed: true })
        .expect(200);

      expect(firstListingResponse.body.data.completionPercentage).toBe(100);
      expect(firstListingResponse.body.data.completed).toBe(true);
      expect(firstListingResponse.body.data.nextStep).toBeUndefined();
      expect(firstListingResponse.body.data.steps.first_listing).toBe(true);

      // Step 7: Verify final profile state
      const finalProfile = {
        ...createdProfile,
        onboardingCompleted: true,
        onboardingSteps: {
          profile_setup: true,
          verification: true,
          payout_setup: true,
          first_listing: true
        },
        updatedAt: new Date('2023-01-02'),
      };

      mockSellerProfileService.getProfile.mockResolvedValue(finalProfile);

      const finalProfileResponse = await request(app)
        .get(`/api/marketplace/seller/${testWalletAddress}`)
        .expect(200);

      expect(finalProfileResponse.body.data.onboardingCompleted).toBe(true);
      expect(finalProfileResponse.body.data.onboardingSteps).toEqual({
        profile_setup: true,
        verification: true,
        payout_setup: true,
        first_listing: true
      });

      // Verify all service calls were made correctly
      expect(mockSellerProfileService.getOnboardingStatus).toHaveBeenCalledTimes(2);
      expect(mockSellerProfileService.createProfile).toHaveBeenCalledWith(profileCreateRequest);
      expect(mockSellerProfileService.updateOnboardingStep).toHaveBeenCalledTimes(3);
      expect(mockSellerProfileService.updateOnboardingStep).toHaveBeenCalledWith(testWalletAddress, 'verification', true);
      expect(mockSellerProfileService.updateOnboardingStep).toHaveBeenCalledWith(testWalletAddress, 'payout_setup', true);
      expect(mockSellerProfileService.updateOnboardingStep).toHaveBeenCalledWith(testWalletAddress, 'first_listing', true);
    });

    it('should handle partial onboarding completion and resumption', async () => {
      // Scenario: User starts onboarding, completes profile setup, then returns later
      
      // Step 1: User has already completed profile setup
      const partialOnboardingStatus = {
        walletAddress: testWalletAddress,
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

      mockSellerProfileService.getOnboardingStatus.mockResolvedValue(partialOnboardingStatus);

      const statusResponse = await request(app)
        .get(`/api/marketplace/seller/onboarding/${testWalletAddress}`)
        .expect(200);

      expect(statusResponse.body.data.completionPercentage).toBe(25);
      expect(statusResponse.body.data.nextStep).toBe('verification');

      // Step 2: User skips verification and goes directly to payout setup
      const payoutCompletedStatus = {
        walletAddress: testWalletAddress,
        completed: false,
        steps: {
          profile_setup: true,
          verification: false,
          payout_setup: true,
          first_listing: false
        },
        completionPercentage: 50, // 2 out of 4 steps completed
        nextStep: 'verification' // Still need verification
      };

      mockSellerProfileService.updateOnboardingStep.mockResolvedValue(payoutCompletedStatus);

      const payoutResponse = await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/payout_setup`)
        .send({ completed: true })
        .expect(200);

      expect(payoutResponse.body.data.completionPercentage).toBe(50);
      expect(payoutResponse.body.data.steps.payout_setup).toBe(true);
      expect(payoutResponse.body.data.steps.verification).toBe(false);

      // Step 3: User later completes verification
      const verificationCompletedStatus = {
        walletAddress: testWalletAddress,
        completed: false,
        steps: {
          profile_setup: true,
          verification: true,
          payout_setup: true,
          first_listing: false
        },
        completionPercentage: 75,
        nextStep: 'first_listing'
      };

      mockSellerProfileService.updateOnboardingStep.mockResolvedValue(verificationCompletedStatus);

      const verificationResponse = await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/verification`)
        .send({ completed: true })
        .expect(200);

      expect(verificationResponse.body.data.completionPercentage).toBe(75);
      expect(verificationResponse.body.data.nextStep).toBe('first_listing');
    });

    it('should handle onboarding step rollback', async () => {
      // Scenario: User wants to mark a completed step as incomplete
      
      const currentStatus = {
        walletAddress: testWalletAddress,
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

      // User marks verification as incomplete
      const rolledBackStatus = {
        walletAddress: testWalletAddress,
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

      mockSellerProfileService.updateOnboardingStep.mockResolvedValue(rolledBackStatus);

      const rollbackResponse = await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/verification`)
        .send({ completed: false })
        .expect(200);

      expect(rollbackResponse.body.data.completionPercentage).toBe(25);
      expect(rollbackResponse.body.data.steps.verification).toBe(false);
      expect(rollbackResponse.body.data.nextStep).toBe('verification');
    });
  });

  describe('Error Handling in Onboarding Workflow', () => {
    it('should handle profile creation failure gracefully', async () => {
      const profileCreateRequest = {
        walletAddress: testWalletAddress,
        displayName: 'Test Seller',
      };

      // Mock profile doesn't exist
      mockSellerProfileService.getProfile.mockResolvedValue(null);
      // Mock creation failure
      mockSellerProfileService.createProfile.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(profileCreateRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROFILE_CREATE_ERROR');
      expect(response.body.error.message).toBe('Failed to create or update seller profile');
    });

    it('should handle onboarding step update failure', async () => {
      mockSellerProfileService.updateOnboardingStep.mockRejectedValue(new Error('Seller profile not found'));

      const response = await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/verification`)
        .send({ completed: true })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Seller profile not found');
    });

    it('should validate onboarding step parameters', async () => {
      // Invalid step name
      const invalidStepResponse = await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/invalid_step`)
        .send({ completed: true })
        .expect(400);

      expect(invalidStepResponse.body.error.code).toBe('VALIDATION_ERROR');
      expect(invalidStepResponse.body.error.details[0].field).toBe('step');

      // Invalid completed value
      const invalidCompletedResponse = await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/verification`)
        .send({ completed: 'not-boolean' })
        .expect(400);

      expect(invalidCompletedResponse.body.error.code).toBe('VALIDATION_ERROR');
      expect(invalidCompletedResponse.body.error.details[0].field).toBe('completed');
    });

    it('should handle concurrent onboarding updates', async () => {
      // Simulate concurrent updates to different steps
      const verificationUpdate = {
        walletAddress: testWalletAddress,
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

      const payoutUpdate = {
        walletAddress: testWalletAddress,
        completed: false,
        steps: {
          profile_setup: true,
          verification: false,
          payout_setup: true,
          first_listing: false
        },
        completionPercentage: 50,
        nextStep: 'verification'
      };

      mockSellerProfileService.updateOnboardingStep
        .mockResolvedValueOnce(verificationUpdate)
        .mockResolvedValueOnce(payoutUpdate);

      // Make concurrent requests
      const [verificationResponse, payoutResponse] = await Promise.all([
        request(app)
          .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/verification`)
          .send({ completed: true }),
        request(app)
          .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/payout_setup`)
          .send({ completed: true })
      ]);

      expect(verificationResponse.status).toBe(200);
      expect(payoutResponse.status).toBe(200);
      expect(mockSellerProfileService.updateOnboardingStep).toHaveBeenCalledTimes(2);
    });
  });

  describe('Profile Update Workflow', () => {
    it('should handle profile updates during onboarding', async () => {
      // Existing profile with partial onboarding
      const existingProfile = {
        walletAddress: testWalletAddress,
        displayName: 'Old Name',
        ensHandle: 'oldname.eth',
        storeDescription: 'Old description',
        isVerified: false,
        onboardingCompleted: false,
        onboardingSteps: {
          profile_setup: true,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      const updateRequest = {
        walletAddress: testWalletAddress,
        displayName: 'Updated Name',
        storeDescription: 'Updated description with more details',
      };

      const updatedProfile = {
        ...existingProfile,
        displayName: 'Updated Name',
        storeDescription: 'Updated description with more details',
        updatedAt: new Date('2023-01-02'),
      };

      mockSellerProfileService.getProfile.mockResolvedValue(existingProfile);
      mockSellerProfileService.updateProfile.mockResolvedValue(updatedProfile);

      const response = await request(app)
        .post('/api/marketplace/seller/profile')
        .send(updateRequest)
        .expect(200);

      expect(response.body.data.displayName).toBe('Updated Name');
      expect(response.body.data.storeDescription).toBe('Updated description with more details');
      expect(mockSellerProfileService.updateProfile).toHaveBeenCalledWith(
        testWalletAddress,
        {
          displayName: 'Updated Name',
          ensHandle: undefined,
          storeDescription: 'Updated description with more details',
          coverImageUrl: undefined,
        }
      );
    });
  });

  describe('Data Consistency Validation', () => {
    it('should maintain data consistency throughout onboarding workflow', async () => {
      // Track state changes throughout the workflow
      const stateChanges: any[] = [];

      // Mock service to track state changes
      mockSellerProfileService.updateOnboardingStep.mockImplementation(async (walletAddress, step, completed) => {
        const newState = {
          walletAddress,
          completed: false,
          steps: {
            profile_setup: step === 'profile_setup' ? completed : false,
            verification: step === 'verification' ? completed : false,
            payout_setup: step === 'payout_setup' ? completed : false,
            first_listing: step === 'first_listing' ? completed : false,
          },
          completionPercentage: 0,
          nextStep: 'profile_setup'
        };

        // Calculate completion percentage
        const completedSteps = Object.values(newState.steps).filter(Boolean).length;
        newState.completionPercentage = Math.round((completedSteps / 4) * 100);

        stateChanges.push({ step, completed, state: newState });
        return newState;
      });

      // Complete steps in order
      await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/profile_setup`)
        .send({ completed: true })
        .expect(200);

      await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/verification`)
        .send({ completed: true })
        .expect(200);

      await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/payout_setup`)
        .send({ completed: true })
        .expect(200);

      await request(app)
        .put(`/api/marketplace/seller/onboarding/${testWalletAddress}/first_listing`)
        .send({ completed: true })
        .expect(200);

      // Verify state progression
      expect(stateChanges).toHaveLength(4);
      expect(stateChanges[0].state.completionPercentage).toBe(25);
      expect(stateChanges[1].state.completionPercentage).toBe(25); // Only verification completed
      expect(stateChanges[2].state.completionPercentage).toBe(25); // Only payout_setup completed
      expect(stateChanges[3].state.completionPercentage).toBe(25); // Only first_listing completed
    });
  });
});
