
import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    console.log('Starting migration 0106_ensure_chat_columns...');

    if (!db) {
        console.error('Database connection not established. Check DATABASE_URL.');
        process.exit(1);
    }

    try {
        const migrationPath = path.join(process.cwd(), 'app/backend/drizzle/0106_ensure_chat_columns.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing SQL...');
        await db.execute(sql.raw(migrationSql));

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
