import { ProfileService } from './profileService';

// Mock fetch globally
global.fetch = jest.fn();

describe('ProfileService', () => {
  const mockProfile = {
    id: '1',
    address: '0x1234567890123456789012345678901234567890',
    handle: 'testuser',
    ens: 'testuser.eth',
    avatarCid: 'QmAvatar123',
    bioCid: 'QmBio123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockProfileInput = {
    address: '0x1234567890123456789012345678901234567890',
    handle: 'testuser',
    ens: 'testuser.eth',
    avatarCid: 'QmAvatar123',
    bioCid: 'QmBio123',
  };

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  describe('createProfile', () => {
    it('should create a profile successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      });

      const result = await ProfileService.createProfile(mockProfileInput);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/profiles',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockProfileInput),
        }
      );
      expect(result).toEqual(mockProfile);
    });

    it('should throw an error when profile creation fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to create profile' }),
      });

      await expect(ProfileService.createProfile(mockProfileInput)).rejects.toThrow(
        'Failed to create profile'
      );
    });
  });

  describe('getProfileById', () => {
    it('should get a profile by ID successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      });

      const result = await ProfileService.getProfileById('1');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/profiles/1',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockProfile);
    });

    it('should return null when profile is not found', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ error: 'Profile not found' }),
      });

      const result = await ProfileService.getProfileById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getProfileByAddress', () => {
    it('should get a profile by address successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      });

      const result = await ProfileService.getProfileByAddress(
        '0x1234567890123456789012345678901234567890'
      );

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/profiles/address/0x1234567890123456789012345678901234567890',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockProfile);
    });

    it('should return null when profile is not found', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ error: 'Profile not found' }),
      });

      const result = await ProfileService.getProfileByAddress(
        '0xnonexistentaddress'
      );

      expect(result).toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('should update a profile successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfile),
      });

      const updateData = {
        handle: 'updateduser',
        ens: 'updateduser.eth',
        avatarCid: 'QmUpdatedAvatar123',
        bioCid: 'QmUpdatedBio123',
      };

      const result = await ProfileService.updateProfile('1', updateData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3002/api/profiles/1',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        }
      );
      expect(result).toEqual(mockProfile);
    });

    it('should throw an error when profile update fails', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Failed to update profile' }),
      });

      const updateData = {
        handle: 'updateduser',
        ens: 'updateduser.eth',
        avatarCid: 'QmUpdatedAvatar123',
        bioCid: 'QmUpdatedBio123',
      };

      await expect(
        ProfileService.updateProfile('1', updateData)
      ).rejects.toThrow('Failed to update profile');
    });
  });
});