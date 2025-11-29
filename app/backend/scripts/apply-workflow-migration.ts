import { config } from 'dotenv';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

config();

const sql = postgres(process.env.DATABASE_URL || '');

async function applyWorkflowMigration() {
    try {
        console.log('🔄 Applying workflow schema migration...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../drizzle/0068_previous_eternity.sql');
        let migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS
        migrationSQL = migrationSQL.replace(/CREATE TABLE "/g, 'CREATE TABLE IF NOT EXISTS "');

        // Replace CREATE INDEX with CREATE INDEX IF NOT EXISTS
        migrationSQL = migrationSQL.replace(/CREATE INDEX "/g, 'CREATE INDEX IF NOT EXISTS "');

        // Execute the modified SQL
        await sql.unsafe(migrationSQL);

        console.log('✅ Workflow schema migration applied successfully!');

        // Verify tables were created
        const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'workflow%'
      ORDER BY table_name;
    `;

        console.log('\n📊 Workflow tables in database:');
        tables.forEach(t => console.log(`  - ${t.table_name}`));

    } catch (error) {
        console.error('❌ Error applying workflow migration:', error);
        throw error;
    } finally {
        await sql.end();
    }
}

applyWorkflowMigration();
