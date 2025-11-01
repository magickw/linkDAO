import { drizzle } from 'drizzle-orm/postgres-js';
import { safeLogger } from '../utils/safeLogger';
import postgres from 'postgres';
import { safeLogger } from '../utils/safeLogger';
import dotenv from 'dotenv';
import { safeLogger } from '../utils/safeLogger';

dotenv.config();

async function checkSchema() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  try {
    safeLogger.info('Checking if required tables exist...');
    
    // Check if reward_epochs table exists
    const rewardEpochsExists = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'reward_epochs'
      ) AS exists;
    `);
    
    safeLogger.info('reward_epochs table exists:', rewardEpochsExists[0].exists);
    
    // Check if creator_rewards table exists
    const creatorRewardsExists = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'creator_rewards'
      ) AS exists;
    `);
    
    safeLogger.info('creator_rewards table exists:', creatorRewardsExists[0].exists);
    
    // Check if tips table has the correct structure
    const tipsColumns = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tips' 
      ORDER BY ordinal_position;
    `);
    
    safeLogger.info('tips table columns:');
    tipsColumns.forEach((row: any) => {
      safeLogger.info(`  ${row.column_name}: ${row.data_type}`);
    });
    
    safeLogger.info('Schema check completed successfully!');
  } catch (error) {
    safeLogger.error('Error checking schema:', error);
  } finally {
    await client.end();
  }
}

checkSchema();