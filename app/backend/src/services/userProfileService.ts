import { databaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { users } from '../db/schema';
import { eq, sql } from "drizzle-orm";
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
    safeLogger.error('Error encrypting address data:', error);
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
    safeLogger.error('Error decrypting address data:', error);
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

    // Prepare address data for encryption (all private information)
    const addressData = {
      physicalAddress: input.physicalAddress,
      email: (input as any).email,
      preferences: (input as any).preferences,
      privacySettings: (input as any).privacySettings,
      // Store firstName and lastName in encrypted data for privacy
      firstName: (input as any).firstName,
      lastName: (input as any).lastName,
      // Store billing and shipping addresses in encrypted data for privacy
      billingFirstName: input.billingFirstName,
      billingLastName: input.billingLastName,
      billingCompany: input.billingCompany,
      billingAddress1: input.billingAddress1,
      billingAddress2: input.billingAddress2,
      billingCity: input.billingCity,
      billingState: input.billingState,
      billingZipCode: input.billingZipCode,
      billingCountry: input.billingCountry,
      billingPhone: input.billingPhone,
      // Shipping address fields
      shippingFirstName: input.shippingFirstName,
      shippingLastName: input.shippingLastName,
      shippingCompany: input.shippingCompany,
      shippingAddress1: input.shippingAddress1,
      shippingAddress2: input.shippingAddress2,
      shippingCity: input.shippingCity,
      shippingState: input.shippingState,
      shippingZipCode: input.shippingZipCode,
      shippingCountry: input.shippingCountry,
      shippingPhone: input.shippingPhone
    };

    // Encrypt address data
    const encryptedAddressData = await encryptAddressData(addressData);

    // Create user in database with enhanced data
    const db = databaseService.getDatabase();
    const userData = {
      walletAddress: input.walletAddress,
      handle: input.handle,
      displayName: input.displayName, // Public display name
      profileCid: input.bioCid || null,
      physicalAddress: encryptedAddressData, // All encrypted private data
      createdAt: new Date()
    };

    // Use onConflictDoUpdate to prevent duplicates and handle race conditions
    // This ensures that if a user is created by another request simultaneously,
    // we update the existing record instead of creating a duplicate
    const [dbUser] = await db.insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.walletAddress,
        set: {
          handle: userData.handle,
          displayName: userData.displayName,
          profileCid: userData.profileCid,
          physicalAddress: userData.physicalAddress,
          updatedAt: new Date()
        }
      })
      .returning();

    // Handle potential null dates by providing default values
    const now = new Date();
    const createdAt = dbUser.createdAt || now;

    // Decrypt address data to return in profile
    let additionalData: any = {};
    try {
      if (dbUser.physicalAddress) {
        additionalData = await decryptAddressData(dbUser.physicalAddress);
      }
    } catch (error) {
      safeLogger.error('Error decrypting user additional data, defaulting to empty object:', error);
    }

    // Create profile object
    const profile: UserProfile = {
      id: dbUser.id,
      walletAddress: dbUser.walletAddress,
      handle: dbUser.handle || '',
      displayName: dbUser.displayName || '', // Public display name
      ens: additionalData.ens || '',
      avatarCid: additionalData.avatarCid || '',
      bioCid: dbUser.profileCid || '',
      email: additionalData.email,
      physicalAddress: additionalData.physicalAddress,
      // Billing Address (from decrypted data)
      billingFirstName: additionalData.billingFirstName || '',
      billingLastName: additionalData.billingLastName || '',
      billingCompany: additionalData.billingCompany || '',
      billingAddress1: additionalData.billingAddress1 || '',
      billingAddress2: additionalData.billingAddress2 || '',
      billingCity: additionalData.billingCity || '',
      billingState: additionalData.billingState || '',
      billingZipCode: additionalData.billingZipCode || '',
      billingCountry: additionalData.billingCountry || '',
      billingPhone: additionalData.billingPhone || '',
      // Shipping Address (from decrypted data)
      shippingFirstName: additionalData.shippingFirstName || '',
      shippingLastName: additionalData.shippingLastName || '',
      shippingCompany: additionalData.shippingCompany || '',
      shippingAddress1: additionalData.shippingAddress1 || '',
      shippingAddress2: additionalData.shippingAddress2 || '',
      shippingCity: additionalData.shippingCity || '',
      shippingState: additionalData.shippingState || '',
      shippingZipCode: additionalData.shippingZipCode || '',
      shippingCountry: additionalData.shippingCountry || '',
      shippingPhone: additionalData.shippingPhone || '',
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
      safeLogger.error('Error decrypting user additional data, defaulting to empty object:', error);
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
      displayName: dbUser.displayName || dbUser.handle || `User ${id.substring(0, 8)}`, // Public display name - fallback to handle or wallet ID
      ens: additionalData.ens || '',
      avatarCid: additionalData.avatarCid || '',
      bioCid: dbUser.profileCid || '',
      email: additionalData.email,
      physicalAddress: additionalData.physicalAddress,
      // Billing Address - read from encrypted data for security
      billingFirstName: additionalData.billingFirstName || '',
      billingLastName: additionalData.billingLastName || '',
      billingCompany: additionalData.billingCompany || '',
      billingAddress1: additionalData.billingAddress1 || '',
      billingAddress2: additionalData.billingAddress2 || '',
      billingCity: additionalData.billingCity || '',
      billingState: additionalData.billingState || '',
      billingZipCode: additionalData.billingZipCode || '',
      billingCountry: additionalData.billingCountry || '',
      billingPhone: additionalData.billingPhone || '',
      // Shipping Address - read from encrypted data for security
      shippingFirstName: additionalData.shippingFirstName || '',
      shippingLastName: additionalData.shippingLastName || '',
      shippingCompany: additionalData.shippingCompany || '',
      shippingAddress1: additionalData.shippingAddress1 || '',
      shippingAddress2: additionalData.shippingAddress2 || '',
      shippingCity: additionalData.shippingCity || '',
      shippingState: additionalData.shippingState || '',
      shippingZipCode: additionalData.shippingZipCode || '',
      shippingCountry: additionalData.shippingCountry || '',
      shippingPhone: additionalData.shippingPhone || '',
      createdAt,
      updatedAt
    };

    return profile;
  }

  async getProfileByAddress(address: string): Promise<UserProfile | undefined> {
    try {
      const db = databaseService.getDatabase();
      const normalizedAddress = address.toLowerCase();
      const [dbUser] = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      
      if (!dbUser) {
        return undefined;
      }

      // Decrypt address data
      const decryptedData = await decryptAddressData(dbUser.physicalAddress);

      return {
        id: dbUser.id,
        walletAddress: dbUser.walletAddress,
        handle: dbUser.handle || '',
        displayName: dbUser.displayName || dbUser.handle || `User ${dbUser.walletAddress.substring(0, 8)}`, // Public display name - fallback to handle or wallet address
        profileCid: dbUser.profileCid || '',
        physicalAddress: decryptedData,
        role: dbUser.role || 'user',
        email: decryptedData.email || '',
        emailVerified: dbUser.emailVerified || false,
        permissions: dbUser.permissions || [],
        lastLogin: dbUser.lastLogin ? new Date(dbUser.lastLogin) : undefined,
        loginAttempts: dbUser.loginAttempts || 0,
        lockedUntil: dbUser.lockedUntil ? new Date(dbUser.lockedUntil) : undefined,
        // Read billing/shipping fields from decryptedData, not dbUser
        billingFirstName: decryptedData.billingFirstName || '',
        billingLastName: decryptedData.billingLastName || '',
        billingCompany: decryptedData.billingCompany || '',
        billingAddress1: decryptedData.billingAddress1 || '',
        billingAddress2: decryptedData.billingAddress2 || '',
        billingCity: decryptedData.billingCity || '',
        billingState: decryptedData.billingState || '',
        billingZipCode: decryptedData.billingZipCode || '',
        billingCountry: decryptedData.billingCountry || '',
        billingPhone: decryptedData.billingPhone || '',
        shippingFirstName: decryptedData.shippingFirstName || '',
        shippingLastName: decryptedData.shippingLastName || '',
        shippingCompany: decryptedData.shippingCompany || '',
        shippingAddress1: decryptedData.shippingAddress1 || '',
        shippingAddress2: decryptedData.shippingAddress2 || '',
        shippingCity: decryptedData.shippingCity || '',
        shippingState: decryptedData.shippingState || '',
        shippingZipCode: decryptedData.shippingZipCode || '',
        shippingCountry: decryptedData.shippingCountry || '',
        shippingPhone: decryptedData.shippingPhone || '',
        shippingSameAsBilling: decryptedData.shippingSameAsBilling ?? true,
        createdAt: dbUser.createdAt ? new Date(dbUser.createdAt) : new Date(),
        updatedAt: dbUser.updatedAt ? new Date(dbUser.updatedAt) : new Date()
      };
    } catch (error) {
      console.error('Error in getProfileByAddress:', error);
      // Return undefined instead of throwing to prevent crashes
      return undefined;
    }
  }

  async updateProfile(id: string, input: UpdateUserProfileInput): Promise<UserProfile | undefined> {
    const db = databaseService.getDatabase();
    
    // Get existing profile to preserve existing address data
    const existingProfile = await this.getProfileById(id);
    if (!existingProfile) {
      return undefined;
    }

    // Get existing decrypted data to preserve it
    let existingAdditionalData: any = {};
    try {
      if (existingProfile.physicalAddress) {
        existingAdditionalData = await decryptAddressData(existingProfile.physicalAddress);
      }
    } catch (error) {
      safeLogger.error('Error decrypting existing user additional data:', error);
    }

    // Prepare updated address data (all private information)
    const addressData = {
      physicalAddress: input.physicalAddress || existingAdditionalData.physicalAddress,
      email: input.email || existingAdditionalData.email,
      ens: input.ens || existingAdditionalData.ens,
      avatarCid: input.avatarCid || existingAdditionalData.avatarCid,
      bioCid: input.bioCid || existingProfile.bioCid,
      preferences: existingAdditionalData.preferences,
      privacySettings: existingAdditionalData.privacySettings,
      // Preserve firstName and lastName in encrypted data
      firstName: (input as any).firstName || existingAdditionalData.firstName,
      lastName: (input as any).lastName || existingAdditionalData.lastName,
      // Update billing and shipping addresses in encrypted data
      billingFirstName: input.billingFirstName || existingAdditionalData.billingFirstName,
      billingLastName: input.billingLastName || existingAdditionalData.billingLastName,
      billingCompany: input.billingCompany || existingAdditionalData.billingCompany,
      billingAddress1: input.billingAddress1 || existingAdditionalData.billingAddress1,
      billingAddress2: input.billingAddress2 || existingAdditionalData.billingAddress2,
      billingCity: input.billingCity || existingAdditionalData.billingCity,
      billingState: input.billingState || existingAdditionalData.billingState,
      billingZipCode: input.billingZipCode || existingAdditionalData.billingZipCode,
      billingCountry: input.billingCountry || existingAdditionalData.billingCountry,
      billingPhone: input.billingPhone || existingAdditionalData.billingPhone,
      // Shipping address fields
      shippingFirstName: input.shippingFirstName || existingAdditionalData.shippingFirstName,
      shippingLastName: input.shippingLastName || existingAdditionalData.shippingLastName,
      shippingCompany: input.shippingCompany || existingAdditionalData.shippingCompany,
      shippingAddress1: input.shippingAddress1 || existingAdditionalData.shippingAddress1,
      shippingAddress2: input.shippingAddress2 || existingAdditionalData.shippingAddress2,
      shippingCity: input.shippingCity || existingAdditionalData.shippingCity,
      shippingState: input.shippingState || existingAdditionalData.shippingState,
      shippingZipCode: input.shippingZipCode || existingAdditionalData.shippingZipCode,
      shippingCountry: input.shippingCountry || existingAdditionalData.shippingCountry,
      shippingPhone: input.shippingPhone || existingAdditionalData.shippingPhone
    };

    // Encrypt updated address data
    const encryptedAddressData = await encryptAddressData(addressData);

    // Update in database
    await db.update(users)
      .set({ 
        handle: input.handle !== undefined ? input.handle : existingProfile.handle,
        displayName: input.displayName !== undefined ? input.displayName : existingProfile.displayName, // Public display name
        profileCid: input.bioCid !== undefined ? input.bioCid : existingProfile.bioCid,
        physicalAddress: encryptedAddressData, // All encrypted private data
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
      safeLogger.error('Error decrypting user additional data:', error);
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
      safeLogger.error('Error decrypting user additional data:', error);
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
      safeLogger.error('Error deleting profile:', error);
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
