#!/usr/bin/env node

/**
 * Script to fix admin authentication issues
 * Ensures the configured admin address has proper admin permissions
 */

import { databaseService } from '../services/databaseService';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';

async function fixAdminAuth() {
  try {
    console.log('🔧 Starting admin authentication fix...');
    
    const db = databaseService.getDatabase();
    if (!db) {
      console.error('❌ Database connection not available');
      process.exit(1);
    }
    
    // Get the configured admin address
    const configuredAdminAddress = process.env.NEXT_PUBLIC_ADMIN_ADDRESS || 
      process.env.ADMIN_ADDRESS || 
      '0xEe034b53D4cCb101b2a4faec27708be507197350';
      
    console.log(`🔍 Checking admin address: ${configuredAdminAddress}`);
    
    // Find the user by wallet address
    const userResult = await db.select()
      .from(users)
      .where(eq(users.walletAddress, configuredAdminAddress.toLowerCase()))
      .limit(1);
      
    if (userResult.length === 0) {
      console.log('⚠️ Admin user not found, creating new admin user...');
      
      // Create the admin user
      const [newUser] = await db.insert(users)
        .values({
          walletAddress: configuredAdminAddress.toLowerCase(),
          role: 'admin',
          permissions: ['admin_access', 'manage_users', 'manage_content', 'view_analytics', 'system.monitor'],
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      console.log(`✅ Created admin user with ID: ${newUser.id}`);
    } else {
      const user = userResult[0];
      console.log(`✅ Found existing user with ID: ${user.id}`);
      
      // Ensure the user has admin role
      const adminRoles = ['admin', 'super_admin'];
      if (!adminRoles.includes(user.role || '')) {
        console.log(`🔄 Updating user ${user.id} to admin role...`);
        await db.update(users)
          .set({ 
            role: 'admin',
            permissions: ['admin_access', 'manage_users', 'manage_content', 'view_analytics', 'system.monitor']
          })
          .where(eq(users.id, user.id));
        console.log('✅ Updated user role to admin');
      } else {
        console.log('✅ User already has admin role');
      }
      
      // Ensure the user has required admin permissions
      const requiredPermissions = ['admin_access', 'manage_users', 'manage_content', 'system.monitor'];
      const currentPermissions = user.permissions || [];
      const missingPermissions = requiredPermissions.filter(perm => !currentPermissions.includes(perm));
      
      if (missingPermissions.length > 0) {
        console.log(`🔄 Adding missing permissions: ${missingPermissions.join(', ')}`);
        const updatedPermissions = [...currentPermissions, ...missingPermissions];
        await db.update(users)
          .set({ permissions: updatedPermissions })
          .where(eq(users.id, user.id));
        console.log('✅ Added missing permissions');
      } else {
        console.log('✅ User already has all required permissions');
      }
    }
    
    console.log('🎉 Admin authentication fix completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing admin authentication:', error);
    process.exit(1);
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixAdminAuth();
}

export { fixAdminAuth };