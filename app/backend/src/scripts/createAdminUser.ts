/**
 * Create Admin User Script - Web3 Version
 * 
 * For existing wallet users: Upgrade wallet to admin with optional password
 * For new users: Create admin with wallet + optional email/password
 * 
 * Usage: 
 *   npx ts-node src/scripts/createAdminUser.ts <walletAddress> <role> [password] [email]
 * 
 * Examples:
 *   # Upgrade existing wallet to admin (no password)
 *   npx ts-node src/scripts/createAdminUser.ts 0x1234...5678 super_admin
 * 
 *   # Create new admin with optional email/password for dual auth
 *   npx ts-node src/scripts/createAdminUser.ts 0x1234...5678 admin mypassword admin@linkdao.io
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { safeLogger } from '../utils/safeLogger';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  safeLogger.error('❌ Error: DATABASE_URL environment variable is not set');
  safeLogger.info('\nPlease set DATABASE_URL in your .env file or environment:');
  safeLogger.info('export DATABASE_URL="postgresql://user:pass@host:port/dbname"');
  process.exit(1);
}

// Configure SSL - check if URL contains sslmode or if it's a cloud database
const requiresSSL = connectionString.includes('sslmode=require') || 
                    connectionString.includes('.supabase.co') ||
                    connectionString.includes('.render.com') ||
                    connectionString.includes('.aws') ||
                    connectionString.includes('.azure') ||
                    connectionString.includes('.neon.tech');

const sslConfig = requiresSSL 
  ? { rejectUnauthorized: false }  // Cloud database with SSL
  : 'prefer';  // Try SSL first, fall back to no SSL

const sql = postgres(connectionString, { 
  ssl: sslConfig,
  max: 1,  // Single connection for script
  idle_timeout: 20,
  connect_timeout: 10
});
const db = drizzle(sql);

async function createAdmin() {
  const walletAddress = process.argv[2]?.toLowerCase();
  const role = (process.argv[3] || 'admin') as 'admin' | 'super_admin' | 'moderator';
  const password = process.argv[4]; // Optional
  const email = process.argv[5]?.toLowerCase(); // Optional

  // Validate inputs
  if (!walletAddress) {
    safeLogger.error('❌ Error: Wallet address is required');
    safeLogger.info('\nUsage: npx ts-node src/scripts/createAdminUser.ts <walletAddress> <role> [password] [email]');
    safeLogger.info('\nRoles: admin, super_admin, moderator (default: admin)');
    safeLogger.info('\nExamples:');
    safeLogger.info('  # Upgrade existing wallet to admin');
    safeLogger.info('  npx ts-node src/scripts/createAdminUser.ts 0x1234...5678 super_admin');
    safeLogger.info('\n  # Create admin with optional email/password');
    safeLogger.info('  npx ts-node src/scripts/createAdminUser.ts 0x1234...5678 admin mypassword admin@linkdao.io');
    process.exit(1);
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    safeLogger.error('❌ Error: Invalid Ethereum wallet address format');
    safeLogger.info('Expected: 0x followed by 40 hexadecimal characters');
    process.exit(1);
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      safeLogger.error('❌ Error: Invalid email format');
      process.exit(1);
    }
  }

  // Validate password length if provided
  if (password && password.length < 8) {
    safeLogger.error('❌ Error: Password must be at least 8 characters');
    process.exit(1);
  }

  // Validate role
  const validRoles = ['admin', 'super_admin', 'moderator'];
  if (!validRoles.includes(role)) {
    safeLogger.error('❌ Error: Invalid role. Must be one of: admin, super_admin, moderator');
    process.exit(1);
  }

  safeLogger.info('\n🔐 Setting up admin user...');
  safeLogger.info('Wallet:', walletAddress);
  safeLogger.info('Role:', role);
  if (email) safeLogger.info('Email:', email);
  if (password) safeLogger.info('Password:', '********');

  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress))
      .limit(1);

    const defaultPermissions: Record<string, string[]> = {
      super_admin: ['*'],
      admin: [
        'content.moderate',
        'users.manage',
        'disputes.resolve',
        'marketplace.seller_review',
        'system.analytics',
      ],
      moderator: ['content.moderate', 'users.view', 'disputes.view'],
    };

    let passwordHash: string | undefined;
    if (password) {
      passwordHash = await bcrypt.hash(password, 12);
    }

    if (existingUser.length > 0) {
      // Upgrade existing user to admin
      safeLogger.info('\n📝 User exists - upgrading to admin role...');
      
      const updateData: any = {
        role,
        permissions: defaultPermissions[role],
      };
      
      if (email) updateData.email = email;
      if (passwordHash) {
        updateData.passwordHash = passwordHash;
        updateData.emailVerified = true;
      }

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, existingUser[0].id));

      safeLogger.info('\n✅ User upgraded to admin successfully!');
      safeLogger.info('User ID:', existingUser[0].id);
      safeLogger.info('Handle:', existingUser[0].handle || 'Not set');
    } else {
      // Create new admin user
      safeLogger.info('\n📝 Creating new admin user...');
      
      const newUser = await db
        .insert(users)
        .values({
          walletAddress,
          role,
          permissions: defaultPermissions[role],
          email: email || undefined,
          passwordHash: passwordHash || undefined,
          emailVerified: email && password ? true : false,
          createdAt: new Date(),
        })
        .returning();

      safeLogger.info('\n✅ Admin user created successfully!');
      safeLogger.info('User ID:', newUser[0].id);
    }

    safeLogger.info('\nYou can now login at: /admin-login');
    safeLogger.info('Authentication options:');
    safeLogger.info('  - Wallet Connect (always available)');
    if (email && password) {
      safeLogger.info('  - Email + Password:', email);
    } else {
      safeLogger.info('  - Email + Password: Not configured');
    }
    
    safeLogger.info('\nPermissions:');
    defaultPermissions[role].forEach(perm => safeLogger.info('  -', perm));
    
    if (password) {
      safeLogger.info('\n⚠️  Important: Store these credentials securely!');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    safeLogger.error('\n❌ Error setting up admin user:', error);
    await sql.end();
    process.exit(1);
  }
}

createAdmin().catch((error) => {
  safeLogger.error('Fatal error:', error);
  process.exit(1);
});
