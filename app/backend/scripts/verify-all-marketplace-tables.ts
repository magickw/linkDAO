
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
        const tablesToCheck = [
            'marketplace_users',
            'marketplace_products',
            'marketplace_orders',
            'marketplace_disputes',
            'dispute_judges',
            'marketplace_verifications',
            'seller_verifications',
            'marketplace_reviews',
            'review_helpfulness',
            'review_reports',
            'marketplace_analytics',
            'marketplace_config',
            'marketplace_rewards',
            'earning_challenges',
            'user_challenge_progress'
        ];

        for (const table of tablesToCheck) {
            const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${table};
      `;

            if (result.length > 0) {
                console.log(`✅ ${table} exists`);
            } else {
                console.error(`❌ ${table} is MISSING`);
            }
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
