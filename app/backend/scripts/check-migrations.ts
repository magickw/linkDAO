
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkMigrations() {
    console.log('🔍 Checking applied migrations...');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not defined');
        process.exit(1);
    }

    const sql = postgres(connectionString, { ssl: 'require', max: 1 });

    try {
        // Check if __drizzle_migrations table exists
        const tableExists = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'drizzle' 
      AND table_name = '__drizzle_migrations';
    `;

        if (tableExists.length === 0) {
            console.log('❌ __drizzle_migrations table does not exist.');
        } else {
            const migrations = await sql`
        SELECT id, hash, created_at 
        FROM drizzle.__drizzle_migrations 
        ORDER BY created_at DESC;
      `;

            console.log(`✅ Found ${migrations.length} applied migrations.`);
            migrations.forEach(m => {
                console.log(`- ${m.id} (Hash: ${m.hash})`);
            });
        }

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('Error checking migrations:', error);
        await sql.end();
        process.exit(1);
    }
}

checkMigrations();
