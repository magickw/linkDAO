import { UserProfileService } from '../src/services/userProfileService';
import { CreateUserProfileInput, UpdateUserProfileInput } from '../src/models/UserProfile';

describe('UserProfileService', () => {
  let userProfileService: UserProfileService;

  beforeEach(() => {
    // Reset the Jest module registry to force re-import of modules
    jest.resetModules();
    
    // Re-import the module after reset
    const { UserProfileService } = require('../src/services/userProfileService');
    userProfileService = new UserProfileService();
  });

  describe('createProfile', () => {
    it('should create a new profile successfully', async () => {
      const input: CreateUserProfileInput = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
        ens: 'testuser.eth',
        avatarCid: 'QmAvatar123',
        bioCid: 'QmBio123'
      };

      const profile = await userProfileService.createProfile(input);

      expect(profile).toBeDefined();
      expect(profile.id).toBeDefined();
      expect(profile.walletAddress).toBe(input.walletAddress);
      expect(profile.handle).toBe(input.handle);
      expect(profile.ens).toBe(input.ens);
      expect(profile.avatarCid).toBe(input.avatarCid);
      expect(profile.bioCid).toBe(input.bioCid);
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw an error when creating a profile with an existing address', async () => {
      const input: CreateUserProfileInput = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser'
      };

      // Create the first profile
      await userProfileService.createProfile(input);

      // Try to create another profile with the same address
      await expect(userProfileService.createProfile(input)).rejects.toThrow('Profile already exists for this address');
    });
  });

  describe('getProfileById', () => {
    it('should return a profile when given a valid ID', async () => {
      const input: CreateUserProfileInput = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser'
      };

      const createdProfile = await userProfileService.createProfile(input);
      const retrievedProfile = await userProfileService.getProfileById(createdProfile.id);

      expect(retrievedProfile).toBeDefined();
      expect(retrievedProfile).toEqual(createdProfile);
    });

    it('should return undefined when given an invalid ID', async () => {
      const profile = await userProfileService.getProfileById('invalid-id');
      expect(profile).toBeUndefined();
    });
  });

  describe('getProfileByAddress', () => {
    it('should return a profile when given a valid address', async () => {
      const input: CreateUserProfileInput = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser'
      };

      const createdProfile = await userProfileService.createProfile(input);
      const retrievedProfile = await userProfileService.getProfileByAddress(input.walletAddress);

      expect(retrievedProfile).toBeDefined();
      expect(retrievedProfile).toEqual(createdProfile);
    });

    it('should return undefined when given an invalid address', async () => {
      const profile = await userProfileService.getProfileByAddress('0x0000000000000000000000000000000000000000');
      expect(profile).toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    it('should update a profile successfully', async () => {
      const input: CreateUserProfileInput = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser'
      };

      const createdProfile = await userProfileService.createProfile(input);
      
      const updateInput: UpdateUserProfileInput = {
        handle: 'updateduser',
        ens: 'updateduser.eth',
        avatarCid: 'QmUpdatedAvatar123',
        bioCid: 'QmUpdatedBio123'
      };

      const updatedProfile = await userProfileService.updateProfile(createdProfile.id, updateInput);

      expect(updatedProfile).toBeDefined();
      expect(updatedProfile?.id).toBe(createdProfile.id);
      expect(updatedProfile?.walletAddress).toBe(createdProfile.walletAddress);
      expect(updatedProfile?.handle).toBe(updateInput.handle);
      expect(updatedProfile?.ens).toBe(updateInput.ens);
      expect(updatedProfile?.avatarCid).toBe(updateInput.avatarCid);
      expect(updatedProfile?.bioCid).toBe(updateInput.bioCid);
      expect(updatedProfile?.createdAt).toEqual(createdProfile.createdAt);
      expect(updatedProfile?.updatedAt).toBeInstanceOf(Date);
      expect(updatedProfile?.updatedAt.getTime()).toBeGreaterThanOrEqual(createdProfile.updatedAt.getTime());
    });

    it('should return undefined when trying to update a non-existent profile', async () => {
      const updateInput: UpdateUserProfileInput = {
        handle: 'updateduser'
      };

      const updatedProfile = await userProfileService.updateProfile('invalid-id', updateInput);
      expect(updatedProfile).toBeUndefined();
    });
  });

  describe('deleteProfile', () => {
    it('should delete a profile successfully', async () => {
      const input: CreateUserProfileInput = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser'
      };

      const createdProfile = await userProfileService.createProfile(input);
      const deleted = await userProfileService.deleteProfile(createdProfile.id);

      expect(deleted).toBe(true);

      // Verify the profile is deleted
      const retrievedProfile = await userProfileService.getProfileById(createdProfile.id);
      expect(retrievedProfile).toBeUndefined();
    });

    it('should return false when trying to delete a non-existent profile', async () => {
      const deleted = await userProfileService.deleteProfile('invalid-id');
      expect(deleted).toBe(false);
    });
  });

  describe('getAllProfiles', () => {
    it('should return all profiles', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { UserProfileService } = require('../src/services/userProfileService');
      userProfileService = new UserProfileService();
      
      const input1: CreateUserProfileInput = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser1'
      };

      const input2: CreateUserProfileInput = {
        walletAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        handle: 'testuser2'
      };

      await userProfileService.createProfile(input1);
      await userProfileService.createProfile(input2);

      const profilesResult = await userProfileService.getAllProfiles();

      expect(profilesResult).toHaveLength(2);
      expect(profilesResult[0].handle).toBe(input1.handle);
      expect(profilesResult[1].handle).toBe(input2.handle);
    });

    it('should return an empty array when there are no profiles', async () => {
      // Reset modules and re-import
      jest.resetModules();
      const { UserProfileService } = require('../src/services/userProfileService');
      userProfileService = new UserProfileService();
      
      const profilesResult = await userProfileService.getAllProfiles();
      expect(profilesResult).toHaveLength(0);
    });
  });
});