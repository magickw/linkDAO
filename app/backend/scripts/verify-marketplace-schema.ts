
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verify() {
    console.log('🔍 Verifying database schema...');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not defined');
        process.exit(1);
    }

    const sql = postgres(connectionString, { ssl: 'require', max: 1 });

    try {
        const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'marketplace_users';
    `;

        if (result.length > 0) {
            console.log('✅ marketplace_users table exists');

            // Also check if it has the correct columns
            const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'marketplace_users';
      `;

            console.log(`📊 Found ${columns.length} columns in marketplace_users`);
        } else {
            console.error('❌ marketplace_users table is MISSING');
            console.log('💡 You may need to run migrations: npm run migrate');
            process.exit(1);
        }

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('Error verifying schema:', error);
        await sql.end();
        process.exit(1);
    }
}

verify();
