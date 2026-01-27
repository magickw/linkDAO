import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('Starting timestamp column fix migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../db/migrations/fix_chat_messages_timestamp_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!');
    console.log('The "timestamp" column in chat_messages has been renamed to "sent_at"');

    // Verify the change
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'chat_messages' 
      AND column_name IN ('sent_at', 'timestamp')
    `);

    console.log('\nColumn verification:');
    console.table(result);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();