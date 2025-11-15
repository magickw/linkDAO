/**
 * Migration: Add Display Name to Users
 *
 * Adds displayName column to users table for public display names
 * Removes billing and shipping address columns that were previously stored in plain text
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { sql } from 'drizzle-orm';

async function runMigration() {
  safeLogger.info('🔄 Running migration: Add Display Name to Users...\n');

  try {
    // Add displayName column to users table
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(100)
    `);
    safeLogger.info('✅ Added display_name column to users table');

    // Add comment to describe the purpose of the column
    await db.execute(sql`
      COMMENT ON COLUMN users.display_name IS 'Public display name for user profiles'
    `);
    safeLogger.info('✅ Added comment to display_name column');

    // Remove billing address columns that were previously stored in plain text
    const billingColumns = [
      'billing_first_name',
      'billing_last_name',
      'billing_company',
      'billing_address1',
      'billing_address2',
      'billing_city',
      'billing_state',
      'billing_zip_code',
      'billing_country',
      'billing_phone'
    ];

    for (const column of billingColumns) {
      try {
        await db.execute(sql`
          ALTER TABLE users 
          DROP COLUMN IF EXISTS ${sql.raw(column)}
        `);
        safeLogger.info(`✅ Removed ${column} column from users table`);
      } catch (error) {
        safeLogger.warn(`⚠️  Could not remove ${column} column:`, error);
      }
    }

    // Remove shipping address columns that were previously stored in plain text
    const shippingColumns = [
      'shipping_first_name',
      'shipping_last_name',
      'shipping_company',
      'shipping_address1',
      'shipping_address2',
      'shipping_city',
      'shipping_state',
      'shipping_zip_code',
      'shipping_country',
      'shipping_phone',
      'shipping_same_as_billing'
    ];

    for (const column of shippingColumns) {
      try {
        await db.execute(sql`
          ALTER TABLE users 
          DROP COLUMN IF EXISTS ${sql.raw(column)}
        `);
        safeLogger.info(`✅ Removed ${column} column from users table`);
      } catch (error) {
        safeLogger.warn(`⚠️  Could not remove ${column} column:`, error);
      }
    }

    safeLogger.info('\n✅ Migration completed successfully!\n');
    process.exit(0);
  } catch (error) {
    safeLogger.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();