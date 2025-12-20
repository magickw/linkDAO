import { OnboardingService } from '../../services/onboardingService';
import { db } from '../../db';
import { users, userOnboardingPreferences } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Mock the database
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock the schema
jest.mock('../../db/schema', () => ({
  users: {
    id: 'users-table',
    walletAddress: 'walletAddress',
  },
  userOnboardingPreferences: {
    userId: 'userId',
    preferredCategories: 'preferredCategories',
    preferredTags: 'preferredTags',
    onboardingCompleted: 'onboardingCompleted',
    skipOnboarding: 'skipOnboarding',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  eq: jest.fn(),
}));

describe('OnboardingService', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock db.select chain
    const mockSelect = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    };

    // Mock db.insert chain
    const mockInsert = {
      values: jest.fn().mockReturnThis(),
      onConflictDoNothing: jest.fn().mockResolvedValue(undefined),
    };

    // Mock db.update chain
    const mockUpdate = {
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
    };

    (db.select as jest.Mock).mockReturnValue(mockSelect);
    (db.insert as jest.Mock).mockReturnValue(mockInsert);
    (db.update as jest.Mock).mockReturnValue(mockUpdate);
    
    (eq as jest.Mock).mockReturnValue('mock-eq-condition');
  });

  describe('getUserPreferences', () => {
    it('should return null when user is not found', async () => {
      // Mock user lookup returning empty array
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([]);

      const result = await OnboardingService.getUserPreferences(mockUserAddress);

      expect(result).toBeNull();
      expect(db.select).toHaveBeenCalledWith({ id: users.id });
      expect(db.select().from).toHaveBeenCalledWith(users);
      expect(db.select().where).toHaveBeenCalledWith('mock-eq-condition');
    });

    it('should return null when preferences are not found', async () => {
      // Mock user lookup returning user
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{ id: mockUserId }]);
      
      // Mock preferences lookup returning empty array
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([]);

      const result = await OnboardingService.getUserPreferences(mockUserAddress);

      expect(result).toBeNull();
    });

    it('should return user preferences when found', async () => {
      const mockPreferences = {
        id: 'pref-123',
        userId: mockUserId,
        preferredCategories: ['development', 'defi'],
        preferredTags: ['react', 'ethereum'],
        onboardingCompleted: true,
        skipOnboarding: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock user lookup
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{ id: mockUserId }]);
      
      // Mock preferences lookup
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([mockPreferences]);

      const result = await OnboardingService.getUserPreferences(mockUserAddress);

      expect(result).toEqual(mockPreferences);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      (db.select as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      await expect(OnboardingService.getUserPreferences(mockUserAddress))
        .rejects.toThrow('Failed to retrieve onboarding preferences');
    });
  });

  describe('saveUserPreferences', () => {
    const mockPreferences = {
      preferredCategories: ['development', 'defi'],
      preferredTags: ['react', 'ethereum'],
    };

    it('should create new user if not exists and save preferences', async () => {
      // Mock user lookup returning empty
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([]);
      
      // Mock user creation
      (db.insert as jest.Mock).values.mockResolvedValueOnce({ id: mockUserId });
      
      // Mock preferences creation
      const mockInsertResult = {
        insertId: 'pref-123',
        rows: [{
          id: 'pref-123',
          userId: mockUserId,
          preferredCategories: mockPreferences.preferredCategories,
          preferredTags: mockPreferences.preferredTags,
          onboardingCompleted: true,
          skipOnboarding: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };
      (db.insert as jest.Mock).values.mockResolvedValueOnce(mockInsertResult);

      const result = await OnboardingService.saveUserPreferences(mockUserAddress, mockPreferences);

      expect(result).toEqual(mockInsertResult.rows[0]);
      expect(db.insert).toHaveBeenCalledWith(users);
      expect(db.insert).toHaveBeenCalledTimes(2); // Once for user, once for preferences
    });

    it('should update existing preferences', async () => {
      // Mock existing user
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{ id: mockUserId }]);
      
      // Mock existing preferences
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{
        id: 'pref-123',
        userId: mockUserId,
        preferredCategories: ['old-category'],
        preferredTags: ['old-tag'],
        onboardingCompleted: false,
        skipOnboarding: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);
      
      // Mock update result
      const mockUpdateResult = [{
        id: 'pref-123',
        userId: mockUserId,
        preferredCategories: mockPreferences.preferredCategories,
        preferredTags: mockPreferences.preferredTags,
        onboardingCompleted: true,
        skipOnboarding: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];
      (db.update as jest.Mock).returning.mockResolvedValueOnce(mockUpdateResult);

      const result = await OnboardingService.saveUserPreferences(mockUserAddress, mockPreferences);

      expect(result).toEqual(mockUpdateResult[0]);
      expect(db.update).toHaveBeenCalledWith(userOnboardingPreferences);
    });

    it('should normalize wallet address to lowercase', async () => {
      const uppercaseAddress = mockUserAddress.toUpperCase();
      
      // Mock user lookup
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{ id: mockUserId }]);
      
      // Mock preferences creation
      (db.insert as jest.Mock).values.mockResolvedValueOnce({
        rows: [{
          id: 'pref-123',
          userId: mockUserId,
          preferredCategories: mockPreferences.preferredCategories,
          preferredTags: mockPreferences.preferredTags,
          onboardingCompleted: true,
          skipOnboarding: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      });

      await OnboardingService.saveUserPreferences(uppercaseAddress, mockPreferences);

      // Verify that eq was called with lowercase address
      expect(eq).toHaveBeenCalledWith(users.walletAddress, mockUserAddress.toLowerCase());
    });
  });

  describe('skipOnboarding', () => {
    it('should mark onboarding as skipped', async () => {
      // Mock existing user
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{ id: mockUserId }]);
      
      // Mock update result
      const mockUpdateResult = [{
        id: 'pref-123',
        userId: mockUserId,
        preferredCategories: [],
        preferredTags: [],
        onboardingCompleted: false,
        skipOnboarding: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];
      (db.update as jest.Mock).returning.mockResolvedValueOnce(mockUpdateResult);

      const result = await OnboardingService.skipOnboarding(mockUserAddress);

      expect(result).toEqual(mockUpdateResult[0]);
      expect(db.update).toHaveBeenCalledWith(userOnboardingPreferences);
      expect(db.update().set).toHaveBeenCalledWith({
        skipOnboarding: true,
        updatedAt: expect.any(Date),
      });
    });

    it('should create user if not exists before skipping', async () => {
      // Mock user lookup returning empty
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([]);
      
      // Mock user creation
      (db.insert as jest.Mock).values.mockResolvedValueOnce({ id: mockUserId });
      
      // Mock preferences creation with skip flag
      (db.insert as jest.Mock).values.mockResolvedValueOnce({
        rows: [{
          id: 'pref-123',
          userId: mockUserId,
          preferredCategories: [],
          preferredTags: [],
          onboardingCompleted: false,
          skipOnboarding: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      });

      const result = await OnboardingService.skipOnboarding(mockUserAddress);

      expect(result.skipOnboarding).toBe(true);
      expect(db.insert).toHaveBeenCalledWith(users);
    });
  });

  describe('needsOnboarding', () => {
    it('should return true for user with no preferences', async () => {
      // Mock existing user
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{ id: mockUserId }]);
      
      // Mock no preferences
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([]);

      const result = await OnboardingService.needsOnboarding(mockUserAddress);

      expect(result).toBe(true);
    });

    it('should return false for user who completed onboarding', async () => {
      // Mock existing user
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{ id: mockUserId }]);
      
      // Mock completed onboarding
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{
        id: 'pref-123',
        userId: mockUserId,
        preferredCategories: ['dev'],
        preferredTags: ['react'],
        onboardingCompleted: true,
        skipOnboarding: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      const result = await OnboardingService.needsOnboarding(mockUserAddress);

      expect(result).toBe(false);
    });

    it('should return false for user who skipped onboarding', async () => {
      // Mock existing user
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{ id: mockUserId }]);
      
      // Mock skipped onboarding
      (db.select as jest.Mock)().limit.mockResolvedValueOnce([{
        id: 'pref-123',
        userId: mockUserId,
        preferredCategories: [],
        preferredTags: [],
        onboardingCompleted: false,
        skipOnboarding: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);

      const result = await OnboardingService.needsOnboarding(mockUserAddress);

      expect(result).toBe(false);
    });
  });
});