import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../models/UserProfile';
import { DatabaseService } from './databaseService';

const databaseService = new DatabaseService();

export class UserProfileService {
  async createProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    // Check if profile already exists
    const existingProfile = await databaseService.getUserByAddress(input.walletAddress);
    if (existingProfile) {
      throw new Error('Profile already exists for this address');
    }

    // Create user in database
    const dbUser = await databaseService.createUser(
      input.walletAddress,
      input.handle,
      input.bioCid // Storing bioCid in profileCid field
    );

    // Handle potential null dates by providing default values
    const now = new Date();
    const createdAt = dbUser.createdAt || now;
    const updatedAt = dbUser.createdAt || now; // Using createdAt for updatedAt in this case

    const profile: UserProfile = {
      id: dbUser.id,
      walletAddress: dbUser.walletAddress,
      handle: dbUser.handle || '',
      ens: input.ens || '',
      avatarCid: input.avatarCid || '',
      bioCid: input.bioCid || '',
      createdAt, // Using the non-null value
      updatedAt  // Using the non-null value
    };

    return profile;
  }

  async getProfileById(id: string): Promise<UserProfile | undefined> {
    const dbUser = await databaseService.getUserById(id);
    if (!dbUser) {
      return undefined;
    }

    // Handle potential null dates by providing default values
    const now = new Date();
    const createdAt = dbUser.createdAt || now;
    const updatedAt = dbUser.createdAt || now; // Using createdAt for updatedAt in this case

    const profile: UserProfile = {
      id: dbUser.id,
      walletAddress: dbUser.walletAddress,
      handle: dbUser.handle || '',
      ens: '', // Would need to be stored in database in full implementation
      avatarCid: '', // Would need to be stored in database in full implementation
      bioCid: dbUser.profileCid || '',
      createdAt, // Using the non-null value
      updatedAt  // Using the non-null value
    };

    return profile;
  }

  async getProfileByAddress(address: string): Promise<UserProfile | undefined> {
    const dbUser = await databaseService.getUserByAddress(address);
    if (!dbUser) {
      return undefined;
    }

    // Handle potential null dates by providing default values
    const now = new Date();
    const createdAt = dbUser.createdAt || now;
    const updatedAt = dbUser.createdAt || now; // Using createdAt for updatedAt in this case

    const profile: UserProfile = {
      id: dbUser.id,
      walletAddress: dbUser.walletAddress,
      handle: dbUser.handle || '',
      ens: '', // Would need to be stored in database in full implementation
      avatarCid: '', // Would need to be stored in database in full implementation
      bioCid: dbUser.profileCid || '',
      createdAt, // Using the non-null value
      updatedAt  // Using the non-null value
    };

    return profile;
  }

  async updateProfile(id: string, input: UpdateUserProfileInput): Promise<UserProfile | undefined> {
    // In a full implementation, you would update the database record
    // For now, we'll just fetch the existing profile and return it
    return await this.getProfileById(id);
  }

  async deleteProfile(id: string): Promise<boolean> {
    // In a full implementation, you would delete the database record
    // For now, we'll just return true
    return true;
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    // In a full implementation, you would fetch all profiles from the database
    // For now, we'll return an empty array
    return [];
  }
}