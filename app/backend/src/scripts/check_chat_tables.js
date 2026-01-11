
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const url = process.env.DATABASE_URL;

if (!url) {
    console.log('No DATABASE_URL found');
    process.exit(0);
}

const client = postgres(url);
const db = drizzle(client);

async function checkTables() {
    try {
        const result = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversations', 'chat_messages');
    `;
        console.log('Found tables:', result.map(r => r.table_name));

        // Check columns for chat_messages
        if (result.find(r => r.table_name === 'chat_messages')) {
            const columns = await client`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'chat_messages';
        `;
            console.log('chat_messages columns:', columns.map(c => `${c.column_name} (${c.data_type})`));
        }

        // Check columns for conversations
        if (result.find(r => r.table_name === 'conversations')) {
            const columns = await client`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'conversations';
        `;
            console.log('conversations columns:', columns.map(c => `${c.column_name} (${c.data_type})`));
        }

        // Check constraints
        const constraints = await client`
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name IN ('chat_messages', 'conversations');
    `;
        console.log('Constraints:', constraints);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await client.end();
    }
}

checkTables();
