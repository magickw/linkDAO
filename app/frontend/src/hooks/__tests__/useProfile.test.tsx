import { renderHook, waitFor, act } from '@testing-library/react';
import { useProfile } from '../useProfile';
import { ProfileService } from '../../services/profileService';
import { optimizedProfileService } from '../../services/optimizedProfileService';
import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../../models/UserProfile';

// Mock the services
jest.mock('../../services/profileService', () => ({
  ProfileService: {
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

jest.mock('../../services/optimizedProfileService', () => ({
  optimizedProfileService: {
    getProfileByAddress: jest.fn(),
  },
}));

const mockProfileService = ProfileService as jest.Mocked<typeof ProfileService>;
const mockOptimizedProfileService = optimizedProfileService as jest.Mocked<typeof optimizedProfileService>;

// Mock profile data
const mockProfile: UserProfile = {
  id: 'profile-123',
  walletAddress: '0x1234567890123456789012345678901234567890',
  handle: 'testuser',
  displayName: 'Test User',
  ens: 'testuser.eth',
  avatarCid: 'QmAvatar123',
  bannerCid: 'QmBanner123',
  bioCid: 'This is a test bio',
  website: 'https://example.com',
  socialLinks: [{ platform: 'twitter', url: 'https://twitter.com/testuser' }],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
};

describe('useProfile hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchProfile', () => {
    it('should fetch profile by wallet address', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(mockProfile);

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.error).toBeNull();
      expect(mockOptimizedProfileService.getProfileByAddress).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890'
      );
    });

    it('should return null profile when wallet address is not provided', async () => {
      const { result } = renderHook(() => useProfile(undefined));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(mockOptimizedProfileService.getProfileByAddress).not.toHaveBeenCalled();
    });

    it('should return null profile when profile does not exist', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('createProfile', () => {
    it('should create a new profile successfully', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(null);
      mockProfileService.createProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createData: CreateUserProfileInput = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
        displayName: 'Test User',
        ens: 'testuser.eth',
      };

      let createdProfile: UserProfile | undefined;
      await act(async () => {
        createdProfile = await result.current.createProfile(createData);
      });

      expect(createdProfile).toEqual(mockProfile);
      expect(result.current.profile).toEqual(mockProfile);
      expect(mockProfileService.createProfile).toHaveBeenCalledWith(createData);
    });

    it('should handle create profile errors', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(null);
      mockProfileService.createProfile.mockRejectedValue(
        new Error('Failed to create profile')
      );

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createData: CreateUserProfileInput = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
      };

      await act(async () => {
        await expect(result.current.createProfile(createData)).rejects.toThrow(
          'Failed to create profile'
        );
      });

      expect(result.current.error).toBe('Failed to create profile');
    });
  });

  describe('updateProfile', () => {
    it('should update an existing profile successfully', async () => {
      const updatedProfile = { ...mockProfile, displayName: 'Updated Name' };
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(mockProfile);
      mockProfileService.updateProfile.mockResolvedValue(updatedProfile);

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      const updateData: UpdateUserProfileInput = {
        displayName: 'Updated Name',
      };

      await act(async () => {
        await result.current.updateProfile(updateData);
      });

      expect(result.current.profile).toEqual(updatedProfile);
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
        mockProfile.id,
        updateData
      );
    });

    it('should throw error when updating non-existent profile', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(null);

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updateData: UpdateUserProfileInput = {
        displayName: 'Updated Name',
      };

      await act(async () => {
        await expect(result.current.updateProfile(updateData)).rejects.toThrow(
          'No profile to update'
        );
      });
    });

    it('should handle update profile errors', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(mockProfile);
      mockProfileService.updateProfile.mockRejectedValue(
        new Error('Update failed')
      );

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      const updateData: UpdateUserProfileInput = {
        displayName: 'Updated Name',
      };

      await act(async () => {
        await expect(result.current.updateProfile(updateData)).rejects.toThrow(
          'Update failed'
        );
      });

      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('saveProfile', () => {
    it('should update profile when it already exists', async () => {
      const updatedProfile = { ...mockProfile, displayName: 'Updated Name' };
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(mockProfile);
      mockProfileService.updateProfile.mockResolvedValue(updatedProfile);

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      const updateData: UpdateUserProfileInput = {
        displayName: 'Updated Name',
      };

      await act(async () => {
        await result.current.saveProfile(
          updateData,
          '0x1234567890123456789012345678901234567890'
        );
      });

      expect(result.current.profile).toEqual(updatedProfile);
      expect(mockProfileService.updateProfile).toHaveBeenCalledWith(
        mockProfile.id,
        updateData
      );
      expect(mockProfileService.createProfile).not.toHaveBeenCalled();
    });

    it('should create profile when it does not exist', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(null);
      mockProfileService.createProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toBeNull();

      const updateData: UpdateUserProfileInput = {
        handle: 'testuser',
        displayName: 'Test User',
        ens: 'testuser.eth',
        avatarCid: 'QmAvatar123',
        bioCid: 'This is a test bio',
        website: 'https://example.com',
      };

      await act(async () => {
        await result.current.saveProfile(
          updateData,
          '0x1234567890123456789012345678901234567890'
        );
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(mockProfileService.createProfile).toHaveBeenCalledWith({
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
        displayName: 'Test User',
        ens: 'testuser.eth',
        avatarCid: 'QmAvatar123',
        bioCid: 'This is a test bio',
        website: 'https://example.com',
        bannerCid: undefined,
        socialLinks: undefined,
      });
      expect(mockProfileService.updateProfile).not.toHaveBeenCalled();
    });

    it('should use truncated wallet address as handle when handle is not provided', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(null);
      mockProfileService.createProfile.mockResolvedValue(mockProfile);

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updateData: UpdateUserProfileInput = {
        displayName: 'Test User',
      };

      await act(async () => {
        await result.current.saveProfile(
          updateData,
          '0x1234567890123456789012345678901234567890'
        );
      });

      expect(mockProfileService.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          handle: '0x12345678', // First 10 characters of wallet address
        })
      );
    });

    it('should handle saveProfile errors', async () => {
      mockOptimizedProfileService.getProfileByAddress.mockResolvedValue(null);
      mockProfileService.createProfile.mockRejectedValue(
        new Error('Save failed')
      );

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updateData: UpdateUserProfileInput = {
        handle: 'testuser',
      };

      await act(async () => {
        await expect(
          result.current.saveProfile(
            updateData,
            '0x1234567890123456789012345678901234567890'
          )
        ).rejects.toThrow('Save failed');
      });

      expect(result.current.error).toBe('Save failed');
    });
  });

  describe('refetch', () => {
    it('should refetch profile data', async () => {
      const updatedProfile = { ...mockProfile, displayName: 'Refetched Name' };
      mockOptimizedProfileService.getProfileByAddress
        .mockResolvedValueOnce(mockProfile)
        .mockResolvedValueOnce(updatedProfile);

      const { result } = renderHook(() =>
        useProfile('0x1234567890123456789012345678901234567890')
      );

      await waitFor(() => {
        expect(result.current.profile).toEqual(mockProfile);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.profile).toEqual(updatedProfile);
      expect(mockOptimizedProfileService.getProfileByAddress).toHaveBeenCalledTimes(2);
    });
  });
});
