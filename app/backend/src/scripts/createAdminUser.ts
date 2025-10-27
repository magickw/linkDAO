/**
 * Create Admin User Script
 * 
 * Usage: npx ts-node src/scripts/createAdminUser.ts <email> <password> [role] [walletAddress]
 * 
 * Examples:
 *   npx ts-node src/scripts/createAdminUser.ts admin@linkdao.com mypassword super_admin
 *   npx ts-node src/scripts/createAdminUser.ts mod@linkdao.com modpass moderator 0x1234...
 */

import { AdminAuthService } from '../services/adminAuthService';

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const role = (process.argv[4] || 'admin') as 'admin' | 'super_admin' | 'moderator';
  const walletAddress = process.argv[5] || '0x0000000000000000000000000000000000000000';

  // Validate inputs
  if (!email || !password) {
    console.error('❌ Error: Email and password are required');
    console.log('\nUsage: npx ts-node src/scripts/createAdminUser.ts <email> <password> [role] [walletAddress]');
    console.log('\nRoles: admin, super_admin, moderator (default: admin)');
    console.log('\nExamples:');
    console.log('  npx ts-node src/scripts/createAdminUser.ts admin@linkdao.com mypassword super_admin');
    console.log('  npx ts-node src/scripts/createAdminUser.ts moderator@linkdao.com modpass moderator');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('❌ Error: Invalid email format');
    process.exit(1);
  }

  // Validate password length
  if (password.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters');
    process.exit(1);
  }

  // Validate role
  const validRoles = ['admin', 'super_admin', 'moderator'];
  if (!validRoles.includes(role)) {
    console.error('❌ Error: Invalid role. Must be one of: admin, super_admin, moderator');
    process.exit(1);
  }

  console.log('\n🔐 Creating admin user...');
  console.log('Email:', email);
  console.log('Role:', role);
  console.log('Wallet:', walletAddress);

  try {
    const result = await AdminAuthService.createAdminUser(
      email,
      password,
      role,
      walletAddress
    );

    if (result.success) {
      console.log('\n✅ Admin user created successfully!');
      console.log('User ID:', result.userId);
      console.log('\nYou can now login at: /admin-login');
      console.log('Email:', email);
      console.log('Role:', role);
      
      // Display permissions
      const defaultPermissions: Record<string, string[]> = {
        super_admin: ['All permissions (*)'],
        admin: [
          'content.moderate',
          'users.manage',
          'disputes.resolve',
          'marketplace.seller_review',
          'system.analytics',
        ],
        moderator: ['content.moderate', 'users.view', 'disputes.view'],
      };
      
      console.log('\nPermissions:');
      defaultPermissions[role].forEach(perm => console.log('  -', perm));
      
      console.log('\n⚠️  Important: Store these credentials securely!');
    } else {
      console.error('\n❌ Failed to create admin user:', result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error);
    process.exit(1);
  }

  process.exit(0);
}

createAdmin().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
