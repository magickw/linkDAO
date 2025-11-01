import { SellerProfileService } from '../services/sellerProfileService';

// Mock the database connection
jest.mock('../db/connection', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  }
}));

describe('SellerProfileService', () => {
  let service: SellerProfileService;

  beforeEach(() => {
    service = new SellerProfileService();
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return null for non-existent profile', async () => {
      const { db } = require('../db/connection');
      db.select().from().where().limit.mockResolvedValue([]);

      const result = await service.getProfile('0x1234567890123456789012345678901234567890');
      expect(result).toBeNull();
    });

    it('should throw error for invalid wallet address', async () => {
      await expect(service.getProfile('invalid-address')).rejects.toThrow('Invalid wallet address format');
    });

    it('should return profile data for existing profile', async () => {
      const mockProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        ensHandle: 'test.eth',
        storeDescription: 'Test store',
        coverImageUrl: 'https://example.com/image.jpg',
        isVerified: false,
        onboardingCompleted: false,
        onboardingSteps: {
          profile_setup: true,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { db } = require('../db/connection');
      db.select().from().where().limit.mockResolvedValue([mockProfile]);

      const result = await service.getProfile('0x1234567890123456789012345678901234567890');
      expect(result).toMatchObject({
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        ensHandle: 'test.eth',
        storeDescription: 'Test store',
        isVerified: false,
        onboardingCompleted: false,
      });
    });
  });

  describe('createProfile', () => {
    it('should throw error for invalid wallet address', async () => {
      const profileData = {
        walletAddress: 'invalid-address',
        displayName: 'Test Seller'
      };

      await expect(service.createProfile(profileData)).rejects.toThrow('Invalid wallet address format');
    });

    it('should throw error for invalid ENS handle', async () => {
      const profileData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        ensHandle: 'invalid-ens'
      };

      await expect(service.createProfile(profileData)).rejects.toThrow('Invalid ENS handle format');
    });

    it('should create profile successfully', async () => {
      const profileData = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        ensHandle: 'test.eth',
        storeDescription: 'Test store'
      };

      const mockCreatedProfile = {
        ...profileData,
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

      const { db } = require('../db/connection');
      db.insert().values().returning.mockResolvedValue([mockCreatedProfile]);

      const result = await service.createProfile(profileData);
      expect(result).toMatchObject({
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        ensHandle: 'test.eth',
        storeDescription: 'Test store',
        isVerified: false,
        onboardingCompleted: false,
      });
    });
  });

  describe('getOnboardingStatus', () => {
    it('should return default onboarding status for non-existent profile', async () => {
      const { db } = require('../db/connection');
      db.select().from().where().limit.mockResolvedValue([]);

      const result = await service.getOnboardingStatus('0x1234567890123456789012345678901234567890');
      expect(result).toMatchObject({
        walletAddress: '0x1234567890123456789012345678901234567890',
        completed: false,
        steps: {
          profile_setup: false,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        completionPercentage: 0,
        nextStep: 'profile_setup'
      });
    });

    it('should return onboarding status for existing profile', async () => {
      const mockProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        displayName: 'Test Seller',
        isVerified: false,
        onboardingCompleted: false,
        onboardingSteps: {
          profile_setup: true,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { db } = require('../db/connection');
      db.select().from().where().limit.mockResolvedValue([mockProfile]);

      const result = await service.getOnboardingStatus('0x1234567890123456789012345678901234567890');
      expect(result).toMatchObject({
        walletAddress: '0x1234567890123456789012345678901234567890',
        completed: false,
        steps: {
          profile_setup: true,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        completionPercentage: 25,
        nextStep: 'verification'
      });
    });
  });

  describe('updateProfile', () => {
    it('should throw error for non-existent profile', async () => {
      const { db } = require('../db/connection');
      db.select().from().where().limit.mockResolvedValue([]);

      const updates = { displayName: 'Updated Name' };
      await expect(service.updateProfile('0x1234567890123456789012345678901234567890', updates))
        .rejects.toThrow('Seller profile not found');
    });

    it('should update profile successfully', async () => {
      const existingProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
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

      const updatedProfile = {
        ...existingProfile,
        displayName: 'Updated Name',
        onboardingSteps: {
          profile_setup: true,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        updatedAt: new Date(),
      };

      const { db } = require('../db/connection');
      db.select().from().where().limit.mockResolvedValue([existingProfile]);
      db.update().set().where().returning.mockResolvedValue([updatedProfile]);

      const updates = { displayName: 'Updated Name' };
      const result = await service.updateProfile('0x1234567890123456789012345678901234567890', updates);
      
      expect(result.displayName).toBe('Updated Name');
      expect(result.onboardingSteps.profile_setup).toBe(true);
    });
  });
});
