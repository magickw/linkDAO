import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../models/UserProfile';

// In a real implementation, this would connect to a database
// For now, we'll use an in-memory store for demonstration
let profiles: UserProfile[] = [];
let nextId = 1;

export class UserProfileService {
  async createProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    const existingProfile = profiles.find(p => p.address === input.address);
    if (existingProfile) {
      throw new Error('Profile already exists for this address');
    }

    const profile: UserProfile = {
      id: `profile_${nextId++}`,
      address: input.address,
      handle: input.handle,
      ens: input.ens || '',
      avatarCid: input.avatarCid || '',
      bioCid: input.bioCid || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    profiles.push(profile);
    return profile;
  }

  async getProfileById(id: string): Promise<UserProfile | undefined> {
    return profiles.find(p => p.id === id);
  }

  async getProfileByAddress(address: string): Promise<UserProfile | undefined> {
    return profiles.find(p => p.address === address);
  }

  async updateProfile(id: string, input: UpdateUserProfileInput): Promise<UserProfile | undefined> {
    const profileIndex = profiles.findIndex(p => p.id === id);
    if (profileIndex === -1) {
      return undefined;
    }

    const profile = profiles[profileIndex];
    const updatedProfile = {
      ...profile,
      ...input,
      updatedAt: new Date()
    };

    profiles[profileIndex] = updatedProfile;
    return updatedProfile;
  }

  async deleteProfile(id: string): Promise<boolean> {
    const profileIndex = profiles.findIndex(p => p.id === id);
    if (profileIndex === -1) {
      return false;
    }

    profiles.splice(profileIndex, 1);
    return true;
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    return [...profiles];
  }
}