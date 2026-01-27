import { db } from '../db';
import { sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

/**
 * Script to fix the conversations table by ensuring it has the id column
 * 
 * The error logs show: PostgresError: column "id" of relation "conversations" does not exist
 * This script will check if the column exists and add it if missing.
 */

async function fixConversationsTable() {
    try {
        safeLogger.info('Checking conversations table schema...');

        // Check if the id column exists
        const checkColumnQuery = sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

        const columns: any = await db.execute(checkColumnQuery);
        safeLogger.info('Current columns in conversations table:', columns);

        // Handle different result formats
        const rows = Array.isArray(columns) ? columns : (columns.rows || []);
        const hasIdColumn = rows.some((row: any) => row.column_name === 'id');

        if (!hasIdColumn) {
            safeLogger.warn('ID column is missing from conversations table. Adding it now...');

            // Add the id column as UUID with default value
            await db.execute(sql`
        ALTER TABLE conversations 
        ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
      `);

            safeLogger.info('✅ Successfully added id column to conversations table');
        } else {
            safeLogger.info('✅ ID column already exists in conversations table');
        }

        // Verify the fix
        const verifyColumns = await db.execute(checkColumnQuery);
        const verifyRows = Array.isArray(verifyColumns) ? verifyColumns : [];
        safeLogger.info('Updated columns in conversations table:', verifyRows);

        safeLogger.info('✅ Conversations table fix completed successfully');
        process.exit(0);
    } catch (error) {
        safeLogger.error('❌ Error fixing conversations table:', error);
        process.exit(1);
    }
}

// Run the script
fixConversationsTable();
