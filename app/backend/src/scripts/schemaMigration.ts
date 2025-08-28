import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Starting schema sync migration...');
  
  // Create postgres client
  const client = postgres(connectionString, { max: 1 });
  
  try {
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '../../drizzle/0001_schema_sync.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute migration
    await client.unsafe(migrationSQL);
    
    console.log('✅ Schema sync migration completed successfully!');
    console.log('📋 Applied changes:');
    console.log('   • Added auction fields to listings table (highest_bid, reserve_price, etc.)');
    console.log('   • Added missing NFT fields to listings table');
    console.log('   • Added delivery tracking to escrows table'); 
    console.log('   • Added evidence tracking to disputes table');
    console.log('   • Created offers table');
    console.log('   • Created disputes table');
    console.log('   • Created orders table');
    console.log('   • Created ai_moderation table');
    console.log('   • Updated numeric precision for amount fields');
    console.log('   • Set embeddings to use TEXT format');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
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