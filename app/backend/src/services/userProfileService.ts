import { databaseService } from './databaseService';
import { users } from '../db/schema';
import { eq } from "drizzle-orm";
import { DataEncryptionService } from './dataEncryptionService';
import { 
  UserProfile, 
  CreateUserProfileInput, 
  UpdateUserProfileInput
} from '../models/UserProfile';

// Initialize encryption service
const encryptionService = new DataEncryptionService();

// Helper function to encrypt address data
async function encryptAddressData(addressData: any): Promise<string> {
  if (!addressData || Object.keys(addressData).length === 0) {
    return '';
  }
  
  try {
    const encryptedData = await encryptionService.encryptData(JSON.stringify(addressData), 'PII');
    return JSON.stringify(encryptedData);
  } catch (error) {
    console.error('Error encrypting address data:', error);
    // Return empty string if encryption fails to avoid storing unencrypted data
    return '';
  }
}

// Helper function to decrypt address data
async function decryptAddressData(encryptedData: string): Promise<any> {
  if (!encryptedData) {
    return {};
  }
  
  try {
    const encryptedObj = JSON.parse(encryptedData);
    const decryptedData = await encryptionService.decryptData(encryptedObj);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Error decrypting address data:', error);
    return {};
  }
}

export class UserProfileService {
  async createProfile(input: CreateUserProfileInput): Promise<UserProfile> {
    // Check if profile already exists
    const existingProfile = await databaseService.getUserByAddress(input.walletAddress);
    if (existingProfile) {
      throw new Error('Profile already exists for this address');
    }

    // Prepare address data for encryption
    const addressData = {
      physicalAddress: input.physicalAddress,
      email: (input as any).email,
      preferences: (input as any).preferences,
      privacySettings: (input as any).privacySettings
    };

    // Encrypt address data
    const encryptedAddressData = await encryptAddressData(addressData);

    // Create user in database with enhanced data
    const db = databaseService.getDatabase();
    const userData = {
      walletAddress: input.walletAddress,
      handle: input.handle,
      profileCid: input.bioCid || null,
      physicalAddress: encryptedAddressData,
      createdAt: new Date()
    };

    const [dbUser] = await db.insert(users).values(userData).returning();

    // Handle potential null dates by providing default values
    const now = new Date();
    const createdAt = dbUser.createdAt || now;

    // Create profile object
    const profile: UserProfile = {
      id: dbUser.id,
      walletAddress: dbUser.walletAddress,
      handle: dbUser.handle || '',
      ens: '',
      avatarCid: '',
      bioCid: dbUser.profileCid || '',
      createdAt,
      updatedAt: createdAt
    };

    return profile;
  }

  async getProfileById(id: string): Promise<UserProfile | undefined> {
    const db = databaseService.getDatabase();
    const [dbUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    
    if (!dbUser) {
      return undefined;
    }

    // Decrypt address data
    let additionalData: any = {};
    try {
      if (dbUser.physicalAddress) {
        additionalData = await decryptAddressData(dbUser.physicalAddress);
      }
    } catch (error) {
      console.error('Error decrypting user additional data, defaulting to empty object:', error);
    }

    // Handle potential null dates by providing default values
    const now = new Date();
    const createdAt = dbUser.createdAt || now;
    const updatedAt = dbUser.updatedAt || now;

    // Create profile object with decrypted data
    const profile: UserProfile = {
      id: dbUser.id,
      walletAddress: dbUser.walletAddress,
      handle: dbUser.handle || '',
      ens: additionalData.ens || '',
      avatarCid: additionalData.avatarCid || '',
      bioCid: dbUser.profileCid || '',
      physicalAddress: additionalData.physicalAddress,
      createdAt,
      updatedAt
    };

    return profile;
  }

  async getProfileByAddress(address: string): Promise<UserProfile | undefined> {
    const db = databaseService.getDatabase();
    const [dbUser] = await db.select().from(users).where(eq(users.walletAddress, address)).limit(1);
    
    if (!dbUser) {
      return undefined;
    }

    // Decrypt address data
    let additionalData: any = {};
    try {
      if (dbUser.physicalAddress) {
        additionalData = await decryptAddressData(dbUser.physicalAddress);
      }
    } catch (error) {
      console.error('Error decrypting user additional data, defaulting to empty object:', error);
    }

    // Handle potential null dates by providing default values
    const now = new Date();
    const createdAt = dbUser.createdAt || now;
    const updatedAt = dbUser.updatedAt || now;

    // Create profile object with decrypted data
    const profile: UserProfile = {
      id: dbUser.id,
      walletAddress: dbUser.walletAddress,
      handle: dbUser.handle || '',
      ens: additionalData.ens || '',
      avatarCid: additionalData.avatarCid || '',
      bioCid: dbUser.profileCid || '',
      physicalAddress: additionalData.physicalAddress,
      createdAt,
      updatedAt
    };

    return profile;
  }

  async updateProfile(id: string, input: UpdateUserProfileInput): Promise<UserProfile | undefined> {
    const db = databaseService.getDatabase();
    
    // Get existing profile to preserve existing address data
    const existingProfile = await this.getProfileById(id);
    if (!existingProfile) {
      return undefined;
    }

    // Prepare updated address data
    const addressData = {
      physicalAddress: input.physicalAddress || existingProfile.physicalAddress,
      email: (input as any).email || (existingProfile as any).email,
      ens: input.ens || (existingProfile as any).ens,
      avatarCid: input.avatarCid || existingProfile.avatarCid,
      bioCid: input.bioCid || existingProfile.bioCid
    };

    // Encrypt updated address data
    const encryptedAddressData = await encryptAddressData(addressData);

    // Update in database
    await db.update(users)
      .set({ 
        handle: input.handle ?? existingProfile.handle,
        profileCid: input.bioCid ?? existingProfile.bioCid,
        physicalAddress: encryptedAddressData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));

    return await this.getProfileById(id);
  }

  async updatePreferences(address: string, preferences: any): Promise<UserProfile> {
    const db = databaseService.getDatabase();
    const [dbUser] = await db.select().from(users).where(eq(users.walletAddress, address)).limit(1);
    
    if (!dbUser) {
      throw new Error('User not found');
    }

    // Parse existing additional data
    let additionalData = {};
    try {
      if (dbUser.physicalAddress) {
        additionalData = await decryptAddressData(dbUser.physicalAddress);
      }
    } catch (error) {
      console.error('Error decrypting user additional data:', error);
    }

    // Update preferences
    const updatedData = {
      ...additionalData,
      preferences: { ...(additionalData as any).preferences, ...preferences }
    };

    // Encrypt updated data
    const encryptedAddressData = await encryptAddressData(updatedData);

    // Update in database
    await db.update(users)
      .set({ physicalAddress: encryptedAddressData })
      .where(eq(users.walletAddress, address));

    // Return updated profile
    const updatedProfile = await this.getProfileByAddress(address);
    if (!updatedProfile) {
      throw new Error('Failed to retrieve updated profile');
    }

    return updatedProfile;
  }

  async updatePrivacySettings(address: string, privacySettings: any): Promise<UserProfile> {
    const db = databaseService.getDatabase();
    const [dbUser] = await db.select().from(users).where(eq(users.walletAddress, address)).limit(1);
    
    if (!dbUser) {
      throw new Error('User not found');
    }

    // Parse existing additional data
    let additionalData = {};
    try {
      if (dbUser.physicalAddress) {
        additionalData = await decryptAddressData(dbUser.physicalAddress);
      }
    } catch (error) {
      console.error('Error decrypting user additional data:', error);
    }

    // Update privacy settings
    const updatedData = {
      ...additionalData,
      privacySettings: { ...(additionalData as any).privacySettings, ...privacySettings }
    };

    // Encrypt updated data
    const encryptedAddressData = await encryptAddressData(updatedData);

    // Update in database
    await db.update(users)
      .set({ physicalAddress: encryptedAddressData })
      .where(eq(users.walletAddress, address));

    // Return updated profile
    const updatedProfile = await this.getProfileByAddress(address);
    if (!updatedProfile) {
      throw new Error('Failed to retrieve updated profile');
    }

    return updatedProfile;
  }

  async deleteProfile(id: string): Promise<boolean> {
    const db = databaseService.getDatabase();
    
    try {
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting profile:', error);
      return false;
    }
  }

  async getAllProfiles(): Promise<UserProfile[]> {
    const db = databaseService.getDatabase();
    const dbUsers = await db.select().from(users).limit(100); // Limit for performance
    
    const profiles: UserProfile[] = [];
    
    for (const dbUser of dbUsers) {
      const profile = await this.getProfileByAddress(dbUser.walletAddress);
      if (profile) {
        profiles.push(profile);
      }
    }
    
    return profiles;
  }
}

export const userProfileService = new UserProfileService();