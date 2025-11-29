
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function applyFix() {
    console.log('🛠️ Applying marketplace tables fix...');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not defined');
        process.exit(1);
    }

    const sql = postgres(connectionString, { ssl: 'require', max: 1 });

    try {
        const sqlFilePath = path.resolve(__dirname, '../drizzle/0070_create_missing_marketplace_tables.sql');

        if (!fs.existsSync(sqlFilePath)) {
            console.error(`❌ SQL file not found at: ${sqlFilePath}`);
            process.exit(1);
        }

        console.log(`Reading SQL from: ${sqlFilePath}`);

        // Read the file content
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Execute the SQL
        // We use unsafe because we are running raw SQL from a file
        await sql.unsafe(sqlContent);

        console.log('✅ Successfully applied marketplace tables fix!');

        await sql.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error applying fix:', error);
        await sql.end();
        process.exit(1);
    }
}

applyFix();
