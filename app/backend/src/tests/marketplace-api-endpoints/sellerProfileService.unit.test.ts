import { SellerProfileService } from '../../services/sellerProfileService';
import { db } from '../../db/connection';
import { sellers } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Mock the database connection
jest.mock('../../db/connection', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock the schema
jest.mock('../../db/schema', () => ({
  sellers: {
    walletAddress: 'wallet_address',
    displayName: 'display_name',
    ensHandle: 'ens_handle',
    storeDescription: 'store_description',
    coverImageUrl: 'cover_image_url',
    isVerified: 'is_verified',
    onboardingCompleted: 'onboarding_completed',
    onboardingSteps: 'onboarding_steps',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

describe('SellerProfileService', () => {
  let service: SellerProfileService;
  let mockDb: jest.Mocked<typeof db>;

  beforeEach(() => {
    service = new SellerProfileService();
    mockDb = db as jest.Mocked<typeof db>;
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const mockSellerData = {
      walletAddress: validWalletAddress,
      displayName: 'Test Seller',
      ensHandle: 'testseller.eth',
      storeDescription: 'Test store description',
      coverImageUrl: 'https://example.com/image.jpg',
      isVerified: true,
      onboardingCompleted: true,
      onboardingSteps: {
        profile_setup: true,
        verification: true,
        payout_setup: true,
        first_listing: true
      },
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('should return seller profile when found', async () => {
      // Mock database response
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSellerData]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.getProfile(validWalletAddress);

      expect(result).toEqual({
        walletAddress: validWalletAddress,
        displayName: 'Test Seller',
        ensHandle: 'testseller.eth',
        storeDescription: 'Test store description',
        coverImageUrl: 'https://example.com/image.jpg',
        isVerified: true,
        onboardingCompleted: true,
        onboardingSteps: {
          profile_setup: true,
          verification: true,
          payout_setup: true,
          first_listing: true
        },
        createdAt: mockSellerData.createdAt,
        updatedAt: mockSellerData.updatedAt,
      });

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(sellers);
      expect(mockSelect.where).toHaveBeenCalled();
      expect(mockSelect.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when seller profile not found', async () => {
      // Mock empty database response
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.getProfile(validWalletAddress);

      expect(result).toBeNull();
    });

    it('should throw error for invalid wallet address', async () => {
      const invalidAddress = 'invalid-address';

      await expect(service.getProfile(invalidAddress)).rejects.toThrow('Invalid wallet address format');
    });

    it('should handle database errors gracefully', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      await expect(service.getProfile(validWalletAddress)).rejects.toThrow('Database connection failed');
    });

    it('should handle null/undefined optional fields', async () => {
      const mockSellerDataWithNulls = {
        ...mockSellerData,
        displayName: null,
        ensHandle: null,
        storeDescription: null,
        coverImageUrl: null,
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSellerDataWithNulls]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.getProfile(validWalletAddress);

      expect(result).toEqual({
        walletAddress: validWalletAddress,
        displayName: undefined,
        ensHandle: undefined,
        storeDescription: undefined,
        coverImageUrl: undefined,
        isVerified: true,
        onboardingCompleted: true,
        onboardingSteps: {
          profile_setup: true,
          verification: true,
          payout_setup: true,
          first_listing: true
        },
        createdAt: mockSellerData.createdAt,
        updatedAt: mockSellerData.updatedAt,
      });
    });
  });

  describe('createProfile', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const createRequest = {
      walletAddress: validWalletAddress,
      displayName: 'New Seller',
      ensHandle: 'newseller.eth',
      storeDescription: 'New store description',
      coverImageUrl: 'https://example.com/new-image.jpg',
    };

    it('should create new seller profile successfully', async () => {
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedProfile]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.createProfile(createRequest);

      expect(result.walletAddress).toBe(validWalletAddress);
      expect(result.displayName).toBe('New Seller');
      expect(result.isVerified).toBe(false);
      expect(result.onboardingCompleted).toBe(false);
      expect(mockDb.insert).toHaveBeenCalledWith(sellers);
    });

    it('should throw error for invalid wallet address', async () => {
      const invalidRequest = {
        ...createRequest,
        walletAddress: 'invalid-address',
      };

      await expect(service.createProfile(invalidRequest)).rejects.toThrow('Invalid wallet address format');
    });

    it('should throw error for invalid ENS handle', async () => {
      const invalidRequest = {
        ...createRequest,
        ensHandle: 'invalid-ens',
      };

      await expect(service.createProfile(invalidRequest)).rejects.toThrow('Invalid ENS handle format');
    });

    it('should handle database insertion errors', async () => {
      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('Duplicate key violation')),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(service.createProfile(createRequest)).rejects.toThrow('Duplicate key violation');
    });

    it('should create profile with minimal required data', async () => {
      const minimalRequest = {
        walletAddress: validWalletAddress,
      };

      const mockCreatedProfile = {
        walletAddress: validWalletAddress,
        displayName: null,
        ensHandle: null,
        storeDescription: null,
        coverImageUrl: null,
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

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedProfile]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.createProfile(minimalRequest);

      expect(result.walletAddress).toBe(validWalletAddress);
      expect(result.displayName).toBeUndefined();
      expect(result.ensHandle).toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';
    const updateRequest = {
      displayName: 'Updated Seller',
      storeDescription: 'Updated description',
    };

    it('should update existing seller profile successfully', async () => {
      // Mock existing profile
      const existingProfile = {
        walletAddress: validWalletAddress,
        displayName: 'Old Name',
        ensHandle: 'seller.eth',
        storeDescription: 'Old description',
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

      // Mock getProfile call
      jest.spyOn(service, 'getProfile').mockResolvedValue(existingProfile);

      const mockUpdatedProfile = {
        ...existingProfile,
        ...updateRequest,
        onboardingSteps: {
          profile_setup: true, // Should be updated since displayName is provided
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        updatedAt: new Date(),
      };

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockUpdatedProfile]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await service.updateProfile(validWalletAddress, updateRequest);

      expect(result?.displayName).toBe('Updated Seller');
      expect(result?.storeDescription).toBe('Updated description');
      expect(result?.onboardingSteps.profile_setup).toBe(true);
      expect(mockDb.update).toHaveBeenCalledWith(sellers);
    });

    it('should throw error when profile does not exist', async () => {
      // Mock getProfile to return null
      jest.spyOn(service, 'getProfile').mockResolvedValue(null);

      await expect(service.updateProfile(validWalletAddress, updateRequest)).rejects.toThrow('Seller profile not found');
    });

    it('should throw error for invalid wallet address', async () => {
      const invalidAddress = 'invalid-address';

      await expect(service.updateProfile(invalidAddress, updateRequest)).rejects.toThrow('Invalid wallet address format');
    });

    it('should throw error for invalid ENS handle in update', async () => {
      const existingProfile = {
        walletAddress: validWalletAddress,
        displayName: 'Seller',
        onboardingSteps: {
          profile_setup: false,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        isVerified: false,
        onboardingCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getProfile').mockResolvedValue(existingProfile);

      const invalidUpdate = {
        ensHandle: 'invalid-ens',
      };

      await expect(service.updateProfile(validWalletAddress, invalidUpdate)).rejects.toThrow('Invalid ENS handle format');
    });
  });

  describe('getOnboardingStatus', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';

    it('should return onboarding status for existing profile', async () => {
      const existingProfile = {
        walletAddress: validWalletAddress,
        displayName: 'Seller',
        onboardingSteps: {
          profile_setup: true,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        onboardingCompleted: false,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getProfile').mockResolvedValue(existingProfile);

      const result = await service.getOnboardingStatus(validWalletAddress);

      expect(result).toEqual({
        walletAddress: validWalletAddress,
        completed: false,
        steps: {
          profile_setup: true,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        completionPercentage: 25, // 1 out of 4 steps completed
        nextStep: 'verification'
      });
    });

    it('should return default onboarding status when profile does not exist', async () => {
      jest.spyOn(service, 'getProfile').mockResolvedValue(null);

      const result = await service.getOnboardingStatus(validWalletAddress);

      expect(result).toEqual({
        walletAddress: validWalletAddress,
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

    it('should calculate completion percentage correctly', async () => {
      const existingProfile = {
        walletAddress: validWalletAddress,
        displayName: 'Seller',
        onboardingSteps: {
          profile_setup: true,
          verification: true,
          payout_setup: true,
          first_listing: false
        },
        onboardingCompleted: false,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getProfile').mockResolvedValue(existingProfile);

      const result = await service.getOnboardingStatus(validWalletAddress);

      expect(result.completionPercentage).toBe(75); // 3 out of 4 steps completed
      expect(result.nextStep).toBe('first_listing');
    });

    it('should return undefined nextStep when all steps completed', async () => {
      const existingProfile = {
        walletAddress: validWalletAddress,
        displayName: 'Seller',
        onboardingSteps: {
          profile_setup: true,
          verification: true,
          payout_setup: true,
          first_listing: true
        },
        onboardingCompleted: true,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getProfile').mockResolvedValue(existingProfile);

      const result = await service.getOnboardingStatus(validWalletAddress);

      expect(result.completionPercentage).toBe(100);
      expect(result.nextStep).toBeUndefined();
      expect(result.completed).toBe(true);
    });
  });

  describe('updateOnboardingStep', () => {
    const validWalletAddress = '0x1234567890123456789012345678901234567890';

    it('should update onboarding step successfully', async () => {
      const existingProfile = {
        walletAddress: validWalletAddress,
        displayName: 'Seller',
        onboardingSteps: {
          profile_setup: true,
          verification: false,
          payout_setup: false,
          first_listing: false
        },
        onboardingCompleted: false,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getProfile').mockResolvedValue(existingProfile);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      // Mock the final getOnboardingStatus call
      const expectedStatus = {
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
      jest.spyOn(service, 'getOnboardingStatus').mockResolvedValue(expectedStatus);

      const result = await service.updateOnboardingStep(validWalletAddress, 'verification', true);

      expect(result).toEqual(expectedStatus);
      expect(mockDb.update).toHaveBeenCalledWith(sellers);
    });

    it('should throw error when profile does not exist', async () => {
      jest.spyOn(service, 'getProfile').mockResolvedValue(null);

      await expect(service.updateOnboardingStep(validWalletAddress, 'verification', true)).rejects.toThrow('Seller profile not found');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed onboarding steps data', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      const mockSellerDataWithMalformedSteps = {
        walletAddress: validWalletAddress,
        displayName: 'Test Seller',
        onboardingSteps: 'invalid-json-string', // Malformed data
        isVerified: false,
        onboardingCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockSellerDataWithMalformedSteps]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.getProfile(validWalletAddress);

      // Should return default onboarding steps when parsing fails
      expect(result?.onboardingSteps).toEqual({
        profile_setup: false,
        verification: false,
        payout_setup: false,
        first_listing: false
      });
    });

    it('should validate wallet address format correctly', async () => {
      const testCases = [
        { address: '0x1234567890123456789012345678901234567890', valid: true },
        { address: '0x123456789012345678901234567890123456789', valid: false }, // Too short
        { address: '0x12345678901234567890123456789012345678901', valid: false }, // Too long
        { address: '1234567890123456789012345678901234567890', valid: false }, // Missing 0x
        { address: '0xGHIJKLMNOP123456789012345678901234567890', valid: false }, // Invalid hex
        { address: '', valid: false }, // Empty
        { address: '0x', valid: false }, // Only prefix
      ];

      for (const testCase of testCases) {
        if (testCase.valid) {
          // Should not throw for valid addresses
          const mockSelect = {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
          mockDb.select.mockReturnValue(mockSelect);

          await expect(service.getProfile(testCase.address)).resolves.toBeNull();
        } else {
          // Should throw for invalid addresses
          await expect(service.getProfile(testCase.address)).rejects.toThrow('Invalid wallet address format');
        }
      }
    });

    it('should validate ENS handle format correctly', async () => {
      const validWalletAddress = '0x1234567890123456789012345678901234567890';
      
      const testCases = [
        { ensHandle: 'valid.eth', valid: true },
        { ensHandle: 'test-name.eth', valid: true },
        { ensHandle: 'test123.eth', valid: true },
        { ensHandle: 'invalid.com', valid: false }, // Wrong TLD
        { ensHandle: 'invalid', valid: false }, // No TLD
        { ensHandle: '.eth', valid: false }, // No name
        { ensHandle: 'test.eth.com', valid: false }, // Multiple TLDs
        { ensHandle: 'test@name.eth', valid: false }, // Invalid characters
      ];

      for (const testCase of testCases) {
        const createRequest = {
          walletAddress: validWalletAddress,
          ensHandle: testCase.ensHandle,
        };

        if (testCase.valid) {
          const mockInsert = {
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([{
              ...createRequest,
              isVerified: false,
              onboardingCompleted: false,
              onboardingSteps: {},
              createdAt: new Date(),
              updatedAt: new Date(),
            }]),
          };
          mockDb.insert.mockReturnValue(mockInsert);

          await expect(service.createProfile(createRequest)).resolves.toBeDefined();
        } else {
          await expect(service.createProfile(createRequest)).rejects.toThrow('Invalid ENS handle format');
        }
      }
    });
  });
});