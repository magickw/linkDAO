const { Client } = require('pg');
require('dotenv').config();

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database successfully!');

    // Check if reward_epochs table exists
    const rewardEpochsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'reward_epochs'
      );
    `);
    
    console.log('reward_epochs table exists:', rewardEpochsResult.rows[0].exists);
    
    // Check if creator_rewards table exists
    const creatorRewardsResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'creator_rewards'
      );
    `);
    
    console.log('creator_rewards table exists:', creatorRewardsResult.rows[0].exists);
    
    // Check if reward_epochs table structure
    if (rewardEpochsResult.rows[0].exists) {
      const rewardEpochsColumns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'reward_epochs' 
        ORDER BY ordinal_position;
      `);
      
      console.log('reward_epochs table columns:');
      rewardEpochsColumns.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
    }
    
    // Check if creator_rewards table structure
    if (creatorRewardsResult.rows[0].exists) {
      const creatorRewardsColumns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'creator_rewards' 
        ORDER BY ordinal_position;
      `);
      
      console.log('creator_rewards table columns:');
      creatorRewardsColumns.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type}`);
      });
    }
    
    console.log('Schema check completed successfully!');
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await client.end();
  }
}

checkSchema();