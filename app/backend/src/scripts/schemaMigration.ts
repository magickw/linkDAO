import { drizzle } from 'drizzle-orm/postgres-js';
import { safeLogger } from '../utils/safeLogger';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    safeLogger.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  safeLogger.info('🔄 Starting schema sync migration...');
  
  // Create postgres client
  const client = postgres(connectionString, { max: 1 });
  
  try {
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '../../drizzle/0001_schema_sync.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.unsafe(migrationSQL);
    
    safeLogger.info('✅ Schema sync migration completed successfully!');
    safeLogger.info('📋 Applied changes:');
    safeLogger.info('   • Added auction fields to listings table (highest_bid, reserve_price, etc.)');
    safeLogger.info('   • Added missing NFT fields to listings table');
    safeLogger.info('   • Added delivery tracking to escrows table'); 
    safeLogger.info('   • Added evidence tracking to disputes table');
    safeLogger.info('   • Created offers table');
    safeLogger.info('   • Created disputes table');
    safeLogger.info('   • Created orders table');
    safeLogger.info('   • Created ai_moderation table');
    safeLogger.info('   • Updated numeric precision for amount fields');
    safeLogger.info('   • Set embeddings to use TEXT format');
    
  } catch (error) {
    safeLogger.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runMigration();
}

export default runMigration;
