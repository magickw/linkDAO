import { safeLogger } from '../../utils/safeLogger';
import { DatabaseService } from '../databaseService';
import * as schema from '../../db/schema';
import { eq, and, or, ilike, desc, gte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const databaseService = new DatabaseService();

export class UserService {
  async createUser(address: string, handle?: string, profileCid?: string) {
    try {
      const result = await databaseService.db.insert(schema.users).values({
        walletAddress: address,
        handle: handle || null,
        profileCid: profileCid || null
      })
        .onConflictDoUpdate({
          target: schema.users.walletAddress,
          set: {
            handle: handle || undefined, // Only update handle if provided
            updatedAt: new Date()
          }
        })
        .returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating/updating user:", error);
      throw error;
    }
  }

  async getUserByAddress(address: string) {
    try {
      const normalizedAddress = address.toLowerCase();
      const [user] = await databaseService.db.select()
        .from(schema.users)
        .where(sql`LOWER(${schema.users.walletAddress}) = LOWER(${normalizedAddress})`)
        .limit(1);
      return user || null;
    } catch (error) {
      safeLogger.error("Error getting user by address:", error);
      throw error;
    }
  }

  async getUserById(id: string) {
    try {
      const [user] = await databaseService.db.select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
      return user || null;
    } catch (error) {
      safeLogger.error("Error getting user by ID:", error);
      throw error;
    }
  }

  async getRecentUsers(limit: number = 10) {
    try {
      const result = await databaseService.db.select().from(schema.users)
        .orderBy(desc(schema.users.createdAt))
        .limit(limit);
      return result;
    } catch (error) {
      safeLogger.error("Error getting recent users:", error);
      throw error;
    }
  }

  async searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const result = await databaseService.db.select().from(schema.users).where(
        or(
          ilike(schema.users.handle, `%${query}%`),
          ilike(schema.users.walletAddress, `%${query}%`)
        )
      ).limit(limit).offset(offset);
      return result;
    } catch (error) {
      safeLogger.error("Error searching users:", error);
      throw error;
    }
  }

  async getUserReputation(address: string) {
    try {
      const result = await databaseService.db.select().from(schema.reputations).where(eq(schema.reputations.walletAddress, address));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting user reputation:", error);
      throw error;
    }
  }

  async createUserReputation(address: string, score: string, daoApproved: boolean) {
    try {
      const result = await databaseService.db.insert(schema.reputations).values({
        walletAddress: address,
        score,
        daoApproved
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating user reputation:", error);
      throw error;
    }
  }

  async updateUserReputation(address: string, updates: Partial<typeof schema.reputations.$inferInsert>) {
    try {
      const result = await databaseService.db.update(schema.reputations).set(updates).where(eq(schema.reputations.walletAddress, address)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating user reputation:", error);
      throw error;
    }
  }

  async getDAOApprovedVendors() {
    try {
      return await databaseService.db.select().from(schema.reputations).where(eq(schema.reputations.daoApproved, true));
    } catch (error) {
      safeLogger.error("Error getting DAO approved vendors:", error);
      throw error;
    }
  }

  async getAllUsersWithReputation(): Promise<Array<{
    id: string;
    walletAddress: string;
    handle?: string;
    reputationScore: string;
  }>> {
    try {
      const users = await databaseService.db
        .select({
          id: schema.users.id,
          walletAddress: schema.users.walletAddress,
          handle: schema.users.handle,
          reputationScore: schema.reputations.score
        })
        .from(schema.users)
        .leftJoin(schema.reputations, eq(schema.users.walletAddress, schema.reputations.walletAddress))
        .where(sql`${schema.reputations.score} IS NOT NULL`)
        .orderBy(desc(schema.reputations.score));

      return users.map((user: any) => ({
        id: user.id,
        walletAddress: user.walletAddress,
        handle: user.handle || undefined,
        reputationScore: user.reputationScore || 0
      }));
    } catch (error) {
      safeLogger.error("Error getting all users with reputation:", error);
      throw error;
    }
  }

  async updateUserVisibilityBoost(userId: string, visibilityBoost: string): Promise<void> {
    try {
      // This would update a visibility_boost field if it existed
      // For now, we'll just log it as this field doesn't exist in current schema
      safeLogger.info(`Updated visibility boost for user ${userId}: ${visibilityBoost}`);
    } catch (error) {
      safeLogger.error("Error updating user visibility boost:", error);
      throw error;
    }
  }
}
