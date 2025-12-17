import { Request, Response } from "express";
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { databaseService } from "../services/databaseService";
import { userProfileService } from "../services/userProfileService";
import { eq, desc, and, gte, sql, asc } from "drizzle-orm";
import { users } from "../db/schema";
import bcrypt from 'bcryptjs';

export class UserController {
  // Get users
  async getUsers(req: Request, res: Response) {
    try {
      const { role, status, kycStatus, search, page = 1, limit = 10, searchField, lastLoginAfter, lastLoginBefore, createdAfter, createdBefore, sortBy, sortOrder } = req.query;
      
      // Sanitize and validate inputs
      const sanitizedSearch = search ? sanitizeString(search as string) : '';
      const sanitizedSearchField = searchField ? sanitizeString(searchField as string) : 'all';
      const sanitizedRole = role ? sanitizeString(role as string) : null;
      const sanitizedPage = Math.max(1, parseInt(page as string) || 1);
      const sanitizedLimit = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
      
      const db = databaseService.getDatabase();
      
      // Build query with filters
      let query = db.select().from(users);
      
      // Apply filters
      if (sanitizedRole) {
        query = query.where(eq(users.role, sanitizedRole));
      }
      
      // Apply search
      if (sanitizedSearch) {
        if (sanitizedSearchField === 'handle') {
          query = query.where(sql`LOWER(${users.handle}) LIKE ${`%${sanitizedSearch}%`}`);
        } else if (sanitizedSearchField === 'email') {
          query = query.where(sql`LOWER(${users.email}) LIKE ${`%${sanitizedSearch}%`}`);
        } else if (sanitizedSearchField === 'address') {
          query = query.where(sql`LOWER(${users.walletAddress}) LIKE ${`%${sanitizedSearch}%`}`);
        } else if (sanitizedSearchField === 'ens') {
          query = query.where(sql`LOWER(${users.ens}) LIKE ${`%${sanitizedSearch}%`}`);
        } else {
          // Search all fields
          query = query.where(
            and(
              sql`(
                LOWER(${users.handle}) LIKE ${`%${sanitizedSearch}%`} OR
                LOWER(${users.email}) LIKE ${`%${sanitizedSearch}%`} OR
                LOWER(${users.walletAddress}) LIKE ${`%${sanitizedSearch}%`} OR
                LOWER(${users.ens}) LIKE ${`%${sanitizedSearch}%`}
              )`
            )
          );
        }
      }
      
      // Apply date filters
      if (lastLoginAfter) {
        query = query.where(gte(users.lastLogin, new Date(lastLoginAfter as string)));
      }
      if (lastLoginBefore) {
        query = query.where(sql`${users.lastLogin} <= ${new Date(lastLoginBefore as string)}`);
      }
      if (createdAfter) {
        query = query.where(gte(users.createdAt, new Date(createdAfter as string)));
      }
      if (createdBefore) {
        query = query.where(sql`${users.createdAt} <= ${new Date(createdBefore as string)}`);
      }
      
      // Apply sorting
      if (sortOrder === 'asc') {
        if (sortBy === 'handle') {
          query = query.orderBy(asc(users.handle));
        } else if (sortBy === 'lastLogin') {
          query = query.orderBy(asc(users.lastLogin));
        } else {
          query = query.orderBy(asc(users.createdAt));
        }
      } else {
        if (sortBy === 'handle') {
          query = query.orderBy(desc(users.handle));
        } else if (sortBy === 'lastLogin') {
          query = query.orderBy(desc(users.lastLogin));
        } else {
          query = query.orderBy(desc(users.createdAt));
        }
      }
      
      // Apply pagination
      const offset = (sanitizedPage - 1) * sanitizedLimit;
      query = query.limit(sanitizedLimit).offset(offset);
      
      const userList = await query;
      
      // Get total count
      const countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
      if (sanitizedRole) {
        countQuery.where(eq(users.role, sanitizedRole));
      }
      if (sanitizedSearch) {
        if (sanitizedSearchField === 'handle') {
          countQuery.where(sql`LOWER(${users.handle}) LIKE ${`%${sanitizedSearch}%`}`);
        } else if (sanitizedSearchField === 'email') {
          countQuery.where(sql`LOWER(${users.email}) LIKE ${`%${sanitizedSearch}%`}`);
        } else if (sanitizedSearchField === 'address') {
          countQuery.where(sql`LOWER(${users.walletAddress}) LIKE ${`%${sanitizedSearch}%`}`);
        } else if (sanitizedSearchField === 'ens') {
          countQuery.where(sql`LOWER(${users.ens}) LIKE ${`%${sanitizedSearch}%`}`);
        } else {
          countQuery.where(
            and(
              sql`(
                LOWER(${users.handle}) LIKE ${`%${sanitizedSearch}%`} OR
                LOWER(${users.email}) LIKE ${`%${sanitizedSearch}%`} OR
                LOWER(${users.walletAddress}) LIKE ${`%${sanitizedSearch}%`} OR
                LOWER(${users.ens}) LIKE ${`%${sanitizedSearch}%`}
              )`
            )
          );
        }
      }
      const totalResult = await countQuery;
      const totalCount = totalResult[0].count || 0;
      
      res.json({
        users: userList,
        total: totalCount,
        page: sanitizedPage,
        totalPages: Math.ceil(totalCount / sanitizedLimit)
      });
    } catch (error) {
      safeLogger.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  // Get user statistics
  async getUserStats(req: Request, res: Response) {
    try {
      const db = databaseService.getDatabase();
      
      // Get total user count
      const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users);
      const totalUsers = totalUsersResult[0].count || 0;
      
      // Get active users count - TODO: Implement user status field
      // const activeUsersResult = await db.select({ count: sql<number>`count(*)` })
      //   .from(users)
      //   .where(eq(users.isActive, true));
      const activeUsers = 0; // TODO: Implement when isActive field exists
      
      // Get suspended users count - TODO: Implement user status field
      // const suspendedUsersResult = await db.select({ count: sql<number>`count(*)` })
      //   .from(users)
      //   .where(eq(users.isSuspended, true));
      const suspendedUsers = 0; // TODO: Implement when isSuspended field exists
      
      // Get new users this month
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const newUsersThisMonthResult = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, monthAgo));
      const newUsersThisMonth = newUsersThisMonthResult[0].count || 0;
      
      // Get new users this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newUsersThisWeekResult = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, weekAgo));
      const newUsersThisWeek = newUsersThisWeekResult[0].count || 0;
      
      // Calculate growth rate (simplified)
      const userGrowthRate = totalUsers > 0 ? Math.round((newUsersThisMonth / totalUsers) * 100 * 10) / 10 : 0;
      
      res.json({
        totalUsers,
        activeUsers,
        suspendedUsers,
        newUsersThisMonth,
        newUsersThisWeek,
        userGrowthRate
      });
    } catch (error) {
      safeLogger.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user stats" });
    }
  }

  // Suspend user
  async suspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason, duration, permanent } = req.body;
      
      const db = databaseService.getDatabase();
      
      // Update user suspension status
      const updatedUser = await db.update(users)
        .set({ 
          isSuspended: true,
          suspensionReason: reason,
          suspensionExpiresAt: duration ? new Date(Date.now() + (duration as number * 24 * 60 * 60 * 1000)) : null
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (updatedUser.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, message: "User suspended successfully" });
    } catch (error) {
      safeLogger.error("Error suspending user:", error);
      res.status(500).json({ error: "Failed to suspend user" });
    }
  }

  // Unsuspend user
  async unsuspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const db = databaseService.getDatabase();
      
      // Update user suspension status
      const updatedUser = await db.update(users)
        .set({ 
          isSuspended: false,
          suspensionReason: null,
          suspensionExpiresAt: null
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (updatedUser.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, message: "User unsuspended successfully" });
    } catch (error) {
      safeLogger.error("Error unsuspending user:", error);
      res.status(500).json({ error: "Failed to unsuspend user" });
    }
  }

  // Update user role
  async updateUserRole(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      // Validate role
      const validRoles = ['user', 'moderator', 'admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      const db = databaseService.getDatabase();
      
      // Update user role in database
      const updatedUser = await db.update(users)
        .set({ role: role })
        .where(eq(users.id, userId))
        .returning();
      
      if (updatedUser.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, message: `User ${userId} role updated to: ${role}` });
    } catch (error) {
      safeLogger.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  }

  // Create new user
  async createUser(req: Request, res: Response) {
    try {
      const { handle, email, walletAddress, role = 'user', password } = req.body;
      
      // Validate required fields
      if (!handle || !walletAddress) {
        return res.status(400).json({ error: "Handle and wallet address are required" });
      }
      
      // Validate role
      const validRoles = ['user', 'moderator', 'admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      
      const db = databaseService.getDatabase();
      
      // Check if user already exists
      const existingUser = await db.select().from(users).where(
        eq(users.walletAddress, walletAddress)
      );
      
      if (existingUser.length > 0) {
        return res.status(409).json({ error: "User with this wallet address already exists" });
      }
      
      // Hash password if provided
      let hashedPassword = null;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
      }
      
      // Create new user
      const newUser = await db.insert(users).values({
        walletAddress: sanitizeWalletAddress(walletAddress),
        handle: sanitizeString(handle),
        email: email ? sanitizeString(email) : null,
        role: role,
        passwordHash: hashedPassword,
        isActive: true,
        isSuspended: false,
        kycStatus: 'none',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      res.json({ success: true, user: newUser[0] });
    } catch (error) {
      safeLogger.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  }

  // Delete user
  async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const db = databaseService.getDatabase();
      
      // Soft delete user by marking as inactive
      const updatedUser = await db.update(users)
        .set({ 
          isActive: false,
          isSuspended: true,
          suspensionReason: 'Account deleted by admin'
        })
        .where(eq(users.id, userId))
        .returning();
      
      if (updatedUser.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      safeLogger.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
}

export const userController = new UserController();
