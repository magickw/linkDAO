#!/usr/bin/env node

/**
 * Migration Runner for Reaction Purchases Table
 * Run this script to create the new reaction_purchases table
 */

import { up } from './migrations/009_create_reaction_purchases_table';

async function runMigration() {
  try {
    console.log('Running migration: Create reaction_purchases table...');
    await up();
    console.log('✅ Migration completed successfully!');
    console.log('The reaction_purchases table has been created with all indexes and constraints.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

export { runMigration };