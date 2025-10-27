import { Request, Response } from "express";
import { databaseService } from "../services/databaseService";
import { userProfileService } from "../services/userProfileService";
import { eq, desc } from "drizzle-orm";
import { users } from "../db/schema";

export class UserController {
  // Get users
  async getUsers(req: Request, res: Response) {
    try {
      const { role, status, kycStatus, search, page = 1, limit = 10 } = req.query;
      
      const db = databaseService.getDatabase();
      
      // Get users with profiles
      const userList = await db.select({
        id: users.id,
        walletAddress: users.walletAddress,
        handle: users.handle,
        createdAt: users.createdAt,
        // Add more fields as needed
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(parseInt(limit as string))
      .offset((parseInt(page as string) - 1) * parseInt(limit as string));
      
      // Get total count
      const totalCountResult = await db.select({ count: users.id })
        .from(users);
      const totalCount = totalCountResult.length > 0 ? totalCountResult[0].count : 0;
      
      res.json({
        users: userList,
        total: totalCount,
        page: parseInt(page as string),
        totalPages: Math.ceil(totalCount / parseInt(limit as string))
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  // Suspend user
  async suspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason, duration, permanent } = req.body;
      
      // In a real implementation, we would store suspension details in a separate table
      // For now, we'll just log it
      console.log(`User ${userId} suspended for reason: ${reason}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ error: "Failed to suspend user" });
    }
  }

  // Unsuspend user
  async unsuspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      // In a real implementation, we would update suspension details
      // For now, we'll just log it
      console.log(`User ${userId} unsuspended`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error unsuspending user:", error);
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
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  }
}

export const userController = new UserController();