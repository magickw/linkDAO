import { renderHook, act } from '@testing-library/react';
import { useProfile, useCreateProfile, useUpdateProfile } from './useProfile';

// Mock the ProfileService
jest.mock('@/services/profileService', () => ({
  ProfileService: {
    getProfileByAddress: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

describe('useProfile', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890';
  const mockProfile = {
    id: '1',
    address: mockAddress,
    handle: 'testuser',
    ens: 'testuser.eth',
    avatarCid: 'QmAvatar123',
    bioCid: 'QmBio123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useProfile', () => {
    it('should fetch profile by address', async () => {
      const mockGetProfileByAddress = require('@/services/profileService').ProfileService.getProfileByAddress;
      mockGetProfileByAddress.mockResolvedValue(mockProfile);
      
      const { result } = renderHook(() => useProfile(mockAddress));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockGetProfileByAddress).toHaveBeenCalledWith(mockAddress);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle profile not found', async () => {
      const mockGetProfileByAddress = require('@/services/profileService').ProfileService.getProfileByAddress;
      mockGetProfileByAddress.mockResolvedValue(null);
      
      const { result } = renderHook(() => useProfile(mockAddress));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(mockGetProfileByAddress).toHaveBeenCalledWith(mockAddress);
      expect(result.current.profile).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors when fetching profile', async () => {
      const mockGetProfileByAddress = require('@/services/profileService').ProfileService.getProfileByAddress;
      mockGetProfileByAddress.mockRejectedValue(new Error('Profile not found'));
      
      const { result } = renderHook(() => useProfile(mockAddress));
      
      // Wait for the effect to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      
      expect(result.current.profile).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Profile not found');
    });
  });

  describe('useCreateProfile', () => {
    it('should create a new profile', async () => {
      const mockCreateProfile = require('@/services/profileService').ProfileService.createProfile;
      mockCreateProfile.mockResolvedValue(mockProfile);
      
      const { result } = renderHook(() => useCreateProfile());
      
      await act(async () => {
        await result.current.createProfile({
          address: mockAddress,
          handle: 'testuser',
          ens: 'testuser.eth',
          avatarCid: 'QmAvatar123',
          bioCid: 'QmBio123',
        });
      });
      
      expect(mockCreateProfile).toHaveBeenCalled();
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(true);
    });

    it('should handle errors when creating profile', async () => {
      const mockCreateProfile = require('@/services/profileService').ProfileService.createProfile;
      mockCreateProfile.mockRejectedValue(new Error('Failed to create profile'));
      
      const { result } = renderHook(() => useCreateProfile());
      
      await act(async () => {
        try {
          await result.current.createProfile({
            address: mockAddress,
            handle: 'testuser',
            ens: 'testuser.eth',
            avatarCid: 'QmAvatar123',
            bioCid: 'QmBio123',
          });
        } catch (error) {
          // Expected error
        }
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.error).toBe('Failed to create profile');
    });
  });

  describe('useUpdateProfile', () => {
    it('should update an existing profile', async () => {
      const mockUpdateProfile = require('@/services/profileService').ProfileService.updateProfile;
      mockUpdateProfile.mockResolvedValue(mockProfile);
      
      const { result } = renderHook(() => useUpdateProfile());
      
      await act(async () => {
        await result.current.updateProfile('1', {
          handle: 'updateduser',
          ens: 'updateduser.eth',
          avatarCid: 'QmUpdatedAvatar123',
          bioCid: 'QmUpdatedBio123',
        });
      });
      
      expect(mockUpdateProfile).toHaveBeenCalled();
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(true);
    });

    it('should handle errors when updating profile', async () => {
      const mockUpdateProfile = require('@/services/profileService').ProfileService.updateProfile;
      mockUpdateProfile.mockRejectedValue(new Error('Failed to update profile'));
      
      const { result } = renderHook(() => useUpdateProfile());
      
      await act(async () => {
        try {
          await result.current.updateProfile('1', {
            handle: 'updateduser',
            ens: 'updateduser.eth',
            avatarCid: 'QmUpdatedAvatar123',
            bioCid: 'QmUpdatedBio123',
          });
        } catch (error) {
          // Expected error
        }
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.error).toBe('Failed to update profile');
    });
  });
});