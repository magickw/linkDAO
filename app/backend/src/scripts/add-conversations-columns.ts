import { db } from '../db';
import { sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

/**
 * Script to add missing columns to the conversations table
 * 
 * This adds:
 * - last_message_id (UUID) - Reference to the last message in the conversation
 * - archived_by (JSONB) - Array of user addresses who have archived this conversation
 * - title (VARCHAR) - Optional title for the conversation (alias for subject)
 */

async function addConversationsColumns() {
    try {
        safeLogger.info('Adding missing columns to conversations table...');

        // Check which columns already exist
        const checkColumnQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      AND table_schema = 'public';
    `;

        const columns: any = await db.execute(checkColumnQuery);
        const columnNames = Object.values(columns).map((row: any) => row.column_name);

        safeLogger.info('Current columns:', columnNames);

        // Add last_message_id if it doesn't exist
        if (!columnNames.includes('last_message_id')) {
            safeLogger.info('Adding last_message_id column...');
            await db.execute(sql`
        ALTER TABLE conversations 
        ADD COLUMN last_message_id UUID;
      `);
            safeLogger.info('✅ Added last_message_id column');
        } else {
            safeLogger.info('✅ last_message_id column already exists');
        }

        // Add archived_by if it doesn't exist
        if (!columnNames.includes('archived_by')) {
            safeLogger.info('Adding archived_by column...');
            await db.execute(sql`
        ALTER TABLE conversations 
        ADD COLUMN archived_by JSONB DEFAULT '[]'::jsonb;
      `);
            safeLogger.info('✅ Added archived_by column');
        } else {
            safeLogger.info('✅ archived_by column already exists');
        }

        // Add title if it doesn't exist (as an alias/alternative to subject)
        if (!columnNames.includes('title')) {
            safeLogger.info('Adding title column...');
            await db.execute(sql`
        ALTER TABLE conversations 
        ADD COLUMN title VARCHAR(255);
      `);
            safeLogger.info('✅ Added title column');
        } else {
            safeLogger.info('✅ title column already exists');
        }

        // Verify the additions
        const verifyColumns: any = await db.execute(checkColumnQuery);
        const updatedColumnNames = Object.values(verifyColumns).map((row: any) => row.column_name);
        safeLogger.info('Updated columns:', updatedColumnNames);

        safeLogger.info('✅ Successfully added missing columns to conversations table');
        process.exit(0);
    } catch (error) {
        safeLogger.error('❌ Error adding columns to conversations table:', error);
        process.exit(1);
    }
}

// Run the script
addConversationsColumns();
