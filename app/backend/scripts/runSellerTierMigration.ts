import { db } from '../src/db';
import { safeLogger } from '../src/utils/safeLogger';
import fs from 'fs';
import path from 'path';

/**
 * Migration Runner for Seller Tier System
 * This script applies the seller tier system migration
 */

async function runSellerTierMigration(): Promise<void> {
  try {
    safeLogger.info('🔄 Running seller tier system migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../../drizzle/0073_seller_tier_system_migration_fixed.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    safeLogger.info('\n✅ Seller tier system migration completed successfully!');
    
    // Verify the tables were created
    const tables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('seller_tier_requirements', 'seller_tier_benefits', 'seller_tier_progression', 'seller_tier_history')
    `);
    
    safeLogger.info(`\n📊 Created/updated ${tables.length} tables:`);
    tables.forEach((table: any) => {
      safeLogger.info(`  ✓ ${table.table_name}`);
    });

  } catch (error) {
    safeLogger.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runSellerTierMigration();
}

export { runSellerTierMigration };