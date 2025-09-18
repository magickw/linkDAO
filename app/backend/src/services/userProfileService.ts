import { UserProfile, CreateUserProfileInput, UpdateUserProfileInput } from '../models/UserProfile';
import { DatabaseService } from './databaseService';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const databaseService = new DatabaseService();

export interface EnhancedCreateUserProfileInput extends CreateUserProfileInput {
  email?: string;
  preferences?: {
    notifications?: {
      email?: boolean;
      push?: boolean;
      inApp?: boolean;
    };
    privacy?: {
      showEmail?: boolean;
      showTransactions?: boolean;
      allowDirectMessages?: boolean;
    };
    trading?: {
      autoApproveSmallAmounts?: boolean;
      defaultSlippage?: number;
      preferredCurrency?: string;
    };
  };
  privacySettings?: {
    profileVisibility?: 'public' | 'private' | 'friends';
    activityVisibility?: 'public' | 'private' | 'friends';
    contactVisibility?: 'public' | 'private' | 'friends';
  };
}

export interface EnhancedUserProfile extends UserProfile {
  email?: string;
  kycStatus?: string;
  preferences?: any;
  privacySettings?: any;
}

export class UserProfileService {
  async createProfile(input: EnhancedCreateUserProfileInput): Promise<EnhancedUserProfile> {
    // Check if profile already exists
    const existingProfile = await databaseService.getUserByAddress(input.walletAddress);
    if (existingProfile) {
      throw new Error('Profile already exists for this address');
    }

    // Create user in database with enhanced data
    const db = databaseService.getDatabase();
    const userData = {
      walletAddress: input.walletAddress,
      handle: input.handle,
      profileCid: input.bioCid || null,
      physicalAddress: JSON.stringify({
        email: input.email || null,
        preferences: input.preferences || {},
        privacySettings: input.privacySettings || {}
      }),
      createdAt: new Date()
    };

    const [dbUser] = await db.insert(users).values(userData).returning();

    // Handle potential null dates by providing default values
    const now = new Date();
    const createdAt = dbUser.createdAt || now;

    const profile: EnhancedUserProfile = {
      id: dbUser.id,
      walletAddress: dbUser.walletAddress,
      handle: dbUser.handle || '',
      ens: input.ens || '',
      avatarCid: input.avatarCid || '',
      bioCid: input.bioCid || '',
      email: input.email,
      kycStatus: 'none',
      preferences: input.preferences || {},
      privacySettings: input.privacySettings || {},
      createdAt,
      updatedAt: createdAt
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

  async getProfileByAddress(address: string): Promise<EnhancedUserProfile | undefined> {
    const db = databaseService.getDatabase();
    const [dbUser] = await db.select().from(users).where(eq(users.walletAddress, address)).limit(1);
    
    if (!dbUser) {
      return undefined;
    }

    // Parse additional data from physicalAddress field
    let additionalData: any = {};
    try {
      if (dbUser.physicalAddress) {
        const parsed = JSON.parse(dbUser.physicalAddress);
        if (typeof parsed === 'object' && parsed !== null) {
          additionalData = parsed;
        } else {
          console.warn('physicalAddress field contains non-object JSON:', dbUser.physicalAddress);
        }
      }
    } catch (error) {
      console.error('Error parsing user additional data, defaulting to empty object:', error);
      // If parsing fails, additionalData remains an empty object
    }

    // Handle potential null dates by providing default values
    const now = new Date();
    const createdAt = dbUser.createdAt || now;

    const profile: EnhancedUserProfile = {
      id: dbUser.id,
      walletAddress: dbUser.walletAddress,
      handle: dbUser.handle || '',
      ens: '', // Would need to be stored in database in full implementation
      avatarCid: '', // Would need to be stored in database in full implementation
      bioCid: dbUser.profileCid || '',
      email: (additionalData as any).email,
      kycStatus: (additionalData as any).kycStatus || 'none',
      preferences: (additionalData as any).preferences || {},
      privacySettings: (additionalData as any).privacySettings || {},
      createdAt,
      updatedAt: createdAt
    };

    return profile;
  }

  async getProfileByHandle(handle: string): Promise<EnhancedUserProfile | undefined> {
    const db = databaseService.getDatabase();
    const [dbUser] = await db.select().from(users).where(eq(users.handle, handle)).limit(1);
    
    if (!dbUser) {
      return undefined;
    }

    return this.getProfileByAddress(dbUser.walletAddress);
  }

  async updatePreferences(address: string, preferences: any): Promise<EnhancedUserProfile> {
    const db = databaseService.getDatabase();
    const [dbUser] = await db.select().from(users).where(eq(users.walletAddress, address)).limit(1);
    
    if (!dbUser) {
      throw new Error('User not found');
    }

    // Parse existing additional data
    let additionalData = {};
    try {
      if (dbUser.physicalAddress) {
        additionalData = JSON.parse(dbUser.physicalAddress);
      }
    } catch (error) {
      console.error('Error parsing user additional data:', error);
    }

    // Update preferences
    const updatedData = {
      ...additionalData,
      preferences: { ...(additionalData as any).preferences, ...preferences }
    };

    // Update in database
    await db.update(users)
      .set({ physicalAddress: JSON.stringify(updatedData) })
      .where(eq(users.walletAddress, address));

    // Return updated profile
    const updatedProfile = await this.getProfileByAddress(address);
    if (!updatedProfile) {
      throw new Error('Failed to retrieve updated profile');
    }

    return updatedProfile;
  }

  async updatePrivacySettings(address: string, privacySettings: any): Promise<EnhancedUserProfile> {
    const db = databaseService.getDatabase();
    const [dbUser] = await db.select().from(users).where(eq(users.walletAddress, address)).limit(1);
    
    if (!dbUser) {
      throw new Error('User not found');
    }

    // Parse existing additional data
    let additionalData = {};
    try {
      if (dbUser.physicalAddress) {
        additionalData = JSON.parse(dbUser.physicalAddress);
      }
    } catch (error) {
      console.error('Error parsing user additional data:', error);
    }

    // Update privacy settings
    const updatedData = {
      ...additionalData,
      privacySettings: { ...(additionalData as any).privacySettings, ...privacySettings }
    };

    // Update in database
    await db.update(users)
      .set({ physicalAddress: JSON.stringify(updatedData) })
      .where(eq(users.walletAddress, address));

    // Return updated profile
    const updatedProfile = await this.getProfileByAddress(address);
    if (!updatedProfile) {
      throw new Error('Failed to retrieve updated profile');
    }

    return updatedProfile;
  }

  async updateProfile(id: string, input: UpdateUserProfileInput): Promise<EnhancedUserProfile | undefined> {
    const db = databaseService.getDatabase();
    
    // Update basic profile fields
    await db.update(users)
      .set({
        handle: input.handle,
        profileCid: input.bioCid
      })
      .where(eq(users.id, id));

    return await this.getProfileById(id);
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

  async getAllProfiles(): Promise<EnhancedUserProfile[]> {
    const db = databaseService.getDatabase();
    const dbUsers = await db.select().from(users).limit(100); // Limit for performance
    
    const profiles: EnhancedUserProfile[] = [];
    
    for (const dbUser of dbUsers) {
      const profile = await this.getProfileByAddress(dbUser.walletAddress);
      if (profile) {
        profiles.push(profile);
      }
    }
    
    return profiles;
  }
}