/**
 * Delete Users Script
 * 
 * Safely deletes users by handling foreign key constraints.
 * First deletes related records, then deletes the users.
 * 
 * Usage: npx ts-node src/scripts/deleteUsers.ts <userId1> <userId2> ...
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { safeLogger } from '../utils/safeLogger';
import postgres from 'postgres';
import { safeLogger } from '../utils/safeLogger';
import { eq, or, inArray } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { users } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import * as dotenv from 'dotenv';
import { safeLogger } from '../utils/safeLogger';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  safeLogger.error('❌ Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Configure SSL for cloud databases
const requiresSSL = connectionString.includes('sslmode=require') || 
                    connectionString.includes('.supabase.co') ||
                    connectionString.includes('.render.com') ||
                    connectionString.includes('.aws') ||
                    connectionString.includes('.azure') ||
                    connectionString.includes('.neon.tech');

const sslConfig = requiresSSL 
  ? { rejectUnauthorized: false }
  : 'prefer';

const sql = postgres(connectionString, { 
  ssl: sslConfig,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

const db = drizzle(sql);

async function deleteUsers() {
  const userIds = process.argv.slice(2);

  if (userIds.length === 0) {
    safeLogger.error('❌ Error: No user IDs provided');
    safeLogger.info('\nUsage: npx ts-node src/scripts/deleteUsers.ts <userId1> <userId2> ...');
    safeLogger.info('\nExample:');
    safeLogger.info('  npx ts-node src/scripts/deleteUsers.ts 508c0fb3-a07e-416a-a1ac-9169aacf6422 4419945e-5c96-419b-9f85-6642ec747084');
    process.exit(1);
  }

  safeLogger.info(`\n🗑️  Preparing to delete ${userIds.length} user(s)...\n`);

  try {
    // Check which users exist
    const existingUsers = await db
      .select({ id: users.id, walletAddress: users.walletAddress, role: users.role })
      .from(users)
      .where(inArray(users.id, userIds));

    if (existingUsers.length === 0) {
      safeLogger.info('❌ No users found with the provided IDs');
      await sql.end();
      process.exit(1);
    }

    safeLogger.info(`Found ${existingUsers.length} user(s) to delete:`);
    existingUsers.forEach(user => {
      safeLogger.info(`  - ${user.id} (${user.walletAddress || 'no wallet'}, role: ${user.role || 'user'})`);
    });

    // Delete related records first (to handle foreign keys)
    safeLogger.info('\n📋 Deleting related records...');
    
    // Note: Most tables have ON DELETE CASCADE, so they should be automatically deleted
    // But we'll explicitly delete from tables that might not have CASCADE
    
    const foundUserIds = existingUsers.map(u => u.id);

    // The follows table is causing the constraint violation
    // Delete follows where user is follower or following
    await sql`DELETE FROM follows WHERE follower_id = ANY(${foundUserIds}) OR following_id = ANY(${foundUserIds})`;
    safeLogger.info('  ✓ Deleted from follows table');

    // Delete other potential references
    try {
      await sql`DELETE FROM posts WHERE author_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from posts table');
    } catch (e) {
      safeLogger.info('  ℹ️  No posts to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM comments WHERE author_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from comments table');
    } catch (e) {
      safeLogger.info('  ℹ️  No comments to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM reactions WHERE user_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from reactions table');
    } catch (e) {
      safeLogger.info('  ℹ️  No reactions to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM messages WHERE sender_id = ANY(${foundUserIds}) OR recipient_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from messages table');
    } catch (e) {
      safeLogger.info('  ℹ️  No messages to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM bids WHERE bidder_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from bids table');
    } catch (e) {
      safeLogger.info('  ℹ️  No bids to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM seller_profiles WHERE user_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from seller_profiles table');
    } catch (e) {
      safeLogger.info('  ℹ️  No seller profiles to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM marketplace_listings WHERE seller_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from marketplace_listings table');
    } catch (e) {
      safeLogger.info('  ℹ️  No listings to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM orders WHERE buyer_id = ANY(${foundUserIds}) OR seller_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from orders table');
    } catch (e) {
      safeLogger.info('  ℹ️  No orders to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM listings WHERE seller_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from listings table');
    } catch (e) {
      safeLogger.info('  ℹ️  No listings to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM reviews WHERE reviewer_id = ANY(${foundUserIds}) OR reviewee_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from reviews table');
    } catch (e) {
      safeLogger.info('  ℹ️  No reviews to delete or already cascaded');
    }

    try {
      await sql`DELETE FROM disputes WHERE complainant_id = ANY(${foundUserIds}) OR respondent_id = ANY(${foundUserIds})`;
      safeLogger.info('  ✓ Deleted from disputes table');
    } catch (e) {
      safeLogger.info('  ℹ️  No disputes to delete or already cascaded');
    }

    // Now delete the users
    safeLogger.info('\n👤 Deleting users...');
    const deleted = await db
      .delete(users)
      .where(inArray(users.id, foundUserIds))
      .returning({ id: users.id });

    safeLogger.info(`\n✅ Successfully deleted ${deleted.length} user(s)!`);
    deleted.forEach(user => {
      safeLogger.info(`  - ${user.id}`);
    });

    await sql.end();
    process.exit(0);
  } catch (error) {
    safeLogger.error('\n❌ Error deleting users:', error);
    await sql.end();
    process.exit(1);
  }
}

deleteUsers().catch((error) => {
  safeLogger.error('Fatal error:', error);
  process.exit(1);
});
