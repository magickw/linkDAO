import { eq, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { stripeConnectAccounts } from '../db/schema';

export interface StripeConnectAccount {
  id: string;
  userAddress: string;
  stripeAccountId: string;
  accountStatus: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  requirements: any;
  createdAt: Date;
  updatedAt: Date;
}

export class StripeConnectService {
  /**
   * Get Stripe Connect account by user wallet address
   */
  async getAccountByAddress(userAddress: string): Promise<StripeConnectAccount | null> {
    try {
      const normalizedAddress = userAddress.toLowerCase();
      
      const [account] = await db
        .select()
        .from(stripeConnectAccounts)
        .where(eq(sql`LOWER(${stripeConnectAccounts.userAddress})`, normalizedAddress))
        .limit(1);

      if (!account) return null;

      return {
        id: account.id,
        userAddress: account.userAddress,
        stripeAccountId: account.stripeAccountId,
        accountStatus: account.accountStatus || 'pending',
        payoutsEnabled: account.payoutsEnabled || false,
        chargesEnabled: account.chargesEnabled || false,
        requirements: account.requirements,
        createdAt: account.createdAt || new Date(),
        updatedAt: account.updatedAt || new Date()
      };
    } catch (error) {
      safeLogger.error('Error fetching Stripe Connect account:', error);
      throw error;
    }
  }

  /**
   * Create or update a Stripe Connect account record
   */
  async createOrUpdateAccount(
    userAddress: string, 
    stripeAccountId: string, 
    data: Partial<StripeConnectAccount> = {}
  ): Promise<StripeConnectAccount> {
    try {
      const normalizedAddress = userAddress.toLowerCase();
      
      const existingAccount = await this.getAccountByAddress(normalizedAddress);

      if (existingAccount) {
        // Update existing
        const [updated] = await db
          .update(stripeConnectAccounts)
          .set({
            stripeAccountId, // In case it changed (unlikely but possible)
            ...data,
            updatedAt: new Date()
          })
          .where(eq(stripeConnectAccounts.id, existingAccount.id))
          .returning();
          
        return {
          id: updated.id,
          userAddress: updated.userAddress,
          stripeAccountId: updated.stripeAccountId,
          accountStatus: updated.accountStatus || 'pending',
          payoutsEnabled: updated.payoutsEnabled || false,
          chargesEnabled: updated.chargesEnabled || false,
          requirements: updated.requirements,
          createdAt: updated.createdAt || new Date(),
          updatedAt: updated.updatedAt || new Date()
        };
      } else {
        // Create new
        const [created] = await db
          .insert(stripeConnectAccounts)
          .values({
            userAddress: normalizedAddress,
            stripeAccountId,
            accountStatus: data.accountStatus || 'pending',
            payoutsEnabled: data.payoutsEnabled || false,
            chargesEnabled: data.chargesEnabled || false,
            requirements: data.requirements,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();

        return {
          id: created.id,
          userAddress: created.userAddress,
          stripeAccountId: created.stripeAccountId,
          accountStatus: created.accountStatus || 'pending',
          payoutsEnabled: created.payoutsEnabled || false,
          chargesEnabled: created.chargesEnabled || false,
          requirements: created.requirements,
          createdAt: created.createdAt || new Date(),
          updatedAt: created.updatedAt || new Date()
        };
      }
    } catch (error) {
      safeLogger.error('Error creating/updating Stripe Connect account:', error);
      throw error;
    }
  }

  /**
   * Update account status from Stripe
   */
  async updateAccountStatus(
    stripeAccountId: string,
    status: {
      payoutsEnabled: boolean;
      chargesEnabled: boolean;
      requirements: any;
      detailsSubmitted: boolean;
    }
  ): Promise<void> {
    try {
      await db
        .update(stripeConnectAccounts)
        .set({
          payoutsEnabled: status.payoutsEnabled,
          chargesEnabled: status.chargesEnabled,
          requirements: status.requirements,
          accountStatus: status.detailsSubmitted ? 'active' : 'pending',
          verificationStatus: status.detailsSubmitted ? 'verified' : 'pending',
          updatedAt: new Date()
        })
        .where(eq(stripeConnectAccounts.stripeAccountId, stripeAccountId));
    } catch (error) {
      safeLogger.error('Error updating Stripe Connect account status:', error);
      throw error;
    }
  }
}

export const stripeConnectService = new StripeConnectService();
