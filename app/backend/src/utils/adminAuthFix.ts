import { safeLogger } from './safeLogger';
import { databaseService } from '../services/databaseService';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

/**
 * Fix for admin authentication issues
 * This utility ensures that the configured admin address has proper admin permissions
 */
export class AdminAuthFix {
  static async ensureAdminPermissions(walletAddress: string): Promise<boolean> {
    try {
      const db = databaseService.getDatabase();
      if (!db) {
        safeLogger.error('Database not available for admin permission fix');
        return false;
      }

      // Check if this is the configured admin address
      const configuredAdminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 
        process.env.ADMIN_ADDRESS || 
        '0xEe034b53D4cCb101b2a4faec27708be507197350';
        
      const normalizedConfigured = configuredAdminAddress.toLowerCase().trim();
      const normalizedUser = walletAddress.toLowerCase().trim();
      
      if (normalizedConfigured !== normalizedUser) {
        return false; // Not the configured admin address
      }
      
      safeLogger.info(`Ensuring admin permissions for configured admin address: ${walletAddress}`);
      
      // Find the user by wallet address
      const userResult = await db.select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
        
      if (userResult.length === 0) {
        safeLogger.warn(`Admin user with wallet address ${walletAddress} not found`);
        return false;
      }
      
      const user = userResult[0];
      
      // Ensure the user has admin role
      const adminRoles = ['admin', 'super_admin'];
      if (!adminRoles.includes(user.role || '')) {
        safeLogger.info(`Updating user ${user.id} to admin role`);
        await db.update(users)
          .set({ 
            role: 'admin',
            permissions: ['admin_access', 'manage_users', 'manage_content', 'view_analytics']
          })
          .where(eq(users.id, user.id));
      }
      
      // Ensure the user has required admin permissions
      const requiredPermissions = ['admin_access', 'manage_users', 'manage_content'];
      const currentPermissions = user.permissions || [];
      const missingPermissions = requiredPermissions.filter(perm => !currentPermissions.includes(perm));
      
      if (missingPermissions.length > 0) {
        safeLogger.info(`Adding missing permissions to admin user: ${missingPermissions.join(', ')}`);
        const updatedPermissions = [...currentPermissions, ...missingPermissions];
        await db.update(users)
          .set({ permissions: updatedPermissions })
          .where(eq(users.id, user.id));
      }
      
      safeLogger.info(`Admin permissions ensured for ${walletAddress}`);
      return true;
    } catch (error) {
      safeLogger.error('Error ensuring admin permissions:', error);
      return false;
    }
  }
  
  /**
   * Create admin user if it doesn't exist
   */
  static async createAdminUserIfNotExists(walletAddress: string): Promise<boolean> {
    try {
      const db = databaseService.getDatabase();
      if (!db) {
        safeLogger.error('Database not available for admin user creation');
        return false;
      }
      
      // Check if user already exists
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);
        
      if (existingUser.length > 0) {
        return true; // User already exists
      }
      
      // Create the admin user
      await db.insert(users)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          role: 'admin',
          permissions: ['admin_access', 'manage_users', 'manage_content', 'view_analytics'],
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
      safeLogger.info(`Created admin user for wallet address: ${walletAddress}`);
      return true;
    } catch (error) {
      safeLogger.error('Error creating admin user:', error);
      return false;
    }
  }
}

export const adminAuthFix = new AdminAuthFix();