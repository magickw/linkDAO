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
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { ssl: 'require' });
const db = drizzle(sql);

async function createAdmin() {
  const walletAddress = process.argv[2]?.toLowerCase();
  const role = (process.argv[3] || 'admin') as 'admin' | 'super_admin' | 'moderator';
  const password = process.argv[4]; // Optional
  const email = process.argv[5]?.toLowerCase(); // Optional

  // Validate inputs
  if (!walletAddress) {
    console.error('❌ Error: Wallet address is required');
    console.log('\nUsage: npx ts-node src/scripts/createAdminUser.ts <walletAddress> <role> [password] [email]');
    console.log('\nRoles: admin, super_admin, moderator (default: admin)');
    console.log('\nExamples:');
    console.log('  # Upgrade existing wallet to admin');
    console.log('  npx ts-node src/scripts/createAdminUser.ts 0x1234...5678 super_admin');
    console.log('\n  # Create admin with optional email/password');
    console.log('  npx ts-node src/scripts/createAdminUser.ts 0x1234...5678 admin mypassword admin@linkdao.io');
    process.exit(1);
  }

  // Validate wallet address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    console.error('❌ Error: Invalid Ethereum wallet address format');
    console.log('Expected: 0x followed by 40 hexadecimal characters');
    process.exit(1);
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Error: Invalid email format');
      process.exit(1);
    }
  }

  // Validate password length if provided
  if (password && password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters');
    process.exit(1);
  }

  // Validate role
  const validRoles = ['admin', 'super_admin', 'moderator'];
  if (!validRoles.includes(role)) {
    console.error('❌ Error: Invalid role. Must be one of: admin, super_admin, moderator');
    process.exit(1);
  }

  console.log('\n🔐 Setting up admin user...');
  console.log('Wallet:', walletAddress);
  console.log('Role:', role);
  if (email) console.log('Email:', email);
  if (password) console.log('Password:', '********');

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
      console.log('\n📝 User exists - upgrading to admin role...');
      
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

      console.log('\n✅ User upgraded to admin successfully!');
      console.log('User ID:', existingUser[0].id);
      console.log('Handle:', existingUser[0].handle || 'Not set');
    } else {
      // Create new admin user
      console.log('\n📝 Creating new admin user...');
      
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

      console.log('\n✅ Admin user created successfully!');
      console.log('User ID:', newUser[0].id);
    }

    console.log('\nYou can now login at: /admin-login');
    console.log('Authentication options:');
    console.log('  - Wallet Connect (always available)');
    if (email && password) {
      console.log('  - Email + Password:', email);
    } else {
      console.log('  - Email + Password: Not configured');
    }
    
    console.log('\nPermissions:');
    defaultPermissions[role].forEach(perm => console.log('  -', perm));
    
    if (password) {
      console.log('\n⚠️  Important: Store these credentials securely!');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting up admin user:', error);
    await sql.end();
    process.exit(1);
  }
}

createAdmin().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
