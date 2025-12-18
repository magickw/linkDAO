import { db } from '../db';
import { 
  marketplaceUsers, 
  sellerVerifications 
} from '../db/marketplaceSchema';
import { users } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface SellerRegistrationData {
  walletAddress: string;
  legalName?: string;
  email?: string;
  country?: string;
  shippingAddress?: any;
  billingAddress?: any;
}

export interface BuyerRegistrationData {
  walletAddress: string;
  email?: string;
  shippingAddress?: any;
  billingAddress?: any;
}

export class MarketplaceRegistrationService {
  /**
   * Register a user as a seller in the marketplace
   */
  async registerSeller(data: SellerRegistrationData) {
    try {
      // First, get the user ID from the wallet address
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, data.walletAddress))
        .limit(1);

      if (userResult.length === 0) {
        throw new Error('User not found');
      }

      const userId = userResult[0].id;

      // Insert or update marketplace user record with seller role
      const [marketplaceUser] = await db
        .insert(marketplaceUsers)
        .values({
          userId: userId,
          role: 'seller',
          email: data.email,
          legalName: data.legalName,
          country: data.country,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: marketplaceUsers.userId,
          set: {
            role: 'seller',
            email: data.email,
            legalName: data.legalName,
            country: data.country,
            shippingAddress: data.shippingAddress,
            billingAddress: data.billingAddress,
            updatedAt: new Date()
          }
        })
        .returning();

      // Create initial seller verification record
      await db
        .insert(sellerVerifications)
        .values({
          userId: userId,
          currentTier: 'unverified',
          status: 'pending',
          reputationScore: 0,
          totalVolume: '0',
          successfulTransactions: 0,
          disputeRate: '0',
          lastTierUpdate: new Date(),
          submittedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoNothing();

      return marketplaceUser;
    } catch (error) {
      throw new Error(`Failed to register seller: ${error.message}`);
    }
  }

  /**
   * Register a user as a buyer in the marketplace
   */
  async registerBuyer(data: BuyerRegistrationData) {
    try {
      // First, get the user ID from the wallet address
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, data.walletAddress))
        .limit(1);

      if (userResult.length === 0) {
        throw new Error('User not found');
      }

      const userId = userResult[0].id;

      // Insert or update marketplace user record with buyer role
      const [marketplaceUser] = await db
        .insert(marketplaceUsers)
        .values({
          userId: userId,
          role: 'buyer',
          email: data.email,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: marketplaceUsers.userId,
          set: {
            role: 'buyer',
            email: data.email,
            shippingAddress: data.shippingAddress,
            billingAddress: data.billingAddress,
            updatedAt: new Date()
          }
        })
        .returning();

      return marketplaceUser;
    } catch (error) {
      throw new Error(`Failed to register buyer: ${error.message}`);
    }
  }

  /**
   * Get marketplace profile for a user
   */
  async getMarketplaceProfile(walletAddress: string) {
    try {
      // First, get the user ID from the wallet address
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (userResult.length === 0) {
        return null;
      }

      const userId = userResult[0].id;

      const profile = await db
        .select()
        .from(marketplaceUsers)
        .where(eq(marketplaceUsers.userId, userId))
        .limit(1);

      return profile[0] || null;
    } catch (error) {
      throw new Error(`Failed to retrieve marketplace profile: ${error.message}`);
    }
  }

  /**
   * Update marketplace profile
   */
  async updateMarketplaceProfile(walletAddress: string, updateData: Partial<SellerRegistrationData>) {
    try {
      // First, get the user ID from the wallet address
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (userResult.length === 0) {
        throw new Error('User not found');
      }

      const userId = userResult[0].id;

      const [updatedProfile] = await db
        .update(marketplaceUsers)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(marketplaceUsers.userId, userId))
        .returning();

      return updatedProfile;
    } catch (error) {
      throw new Error(`Failed to update marketplace profile: ${error.message}`);
    }
  }

  /**
   * Check if a user is registered as a seller
   */
  async isSeller(walletAddress: string) {
    try {
      // First, get the user ID from the wallet address
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (userResult.length === 0) {
        return false;
      }

      const userId = userResult[0].id;

      const result = await db
        .select({ count: marketplaceUsers.userId })
        .from(marketplaceUsers)
        .where(
          and(
            eq(marketplaceUsers.userId, userId),
            eq(marketplaceUsers.role, 'seller')
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to check seller status: ${error.message}`);
    }
  }

  /**
   * Check if a user is registered as a buyer
   */
  async isBuyer(walletAddress: string) {
    try {
      // First, get the user ID from the wallet address
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (userResult.length === 0) {
        return false;
      }

      const userId = userResult[0].id;

      const result = await db
        .select({ count: marketplaceUsers.userId })
        .from(marketplaceUsers)
        .where(
          and(
            eq(marketplaceUsers.userId, userId),
            eq(marketplaceUsers.role, 'buyer')
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      throw new Error(`Failed to check buyer status: ${error.message}`);
    }
  }
}
