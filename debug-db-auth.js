
require('dotenv').config({ path: '.env.development' });
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

async function check() {
    console.log('--- Checking Environment ---');
    console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);
    if (process.env.JWT_SECRET) {
        console.log('JWT_SECRET length:', process.env.JWT_SECRET.length);
    }
    console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing!');
        return;
    }

    console.log('--- Checking Database Connection ---');
    try {
        const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
        const db = drizzle(sql);

        const result = await sql`SELECT 1 as connected`;
        console.log('✅ Database connected successfully:', result);

        await sql.end();
    } catch (error) {
        console.error('❌ Database connection failed:', error);
    }
}

check();
