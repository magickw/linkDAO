import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: __dirname + '/../../.env' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Please set DATABASE_URL to your Postgres instance, e.g. postgresql://postgres:postgres@localhost:5432/linkdao');
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });

  try {
    console.log('Connected to DB. Running queries...');

    // Try several table name variants to be robust across schema versions
    const tablesToCheck = ['conversations', 'chat_messages', 'messages'];

    for (const table of tablesToCheck) {
      try {
        const rows = await sql`SELECT * FROM ${sql(String(table))} ORDER BY created_at DESC LIMIT 50`;
        console.log(`\n=== ${table} (${rows.length} rows) ===`);
        console.log(JSON.stringify(rows, null, 2));
      } catch (err: any) {
        // Table might not exist; show a friendly message
        if (err && /does not exist/.test(String(err))) {
          console.log(`\n=== ${table} - table not found (skipping) ===`);
        } else {
          console.log(`\n=== ${table} - query error: ${String(err)} ===`);
        }
      }
    }

    // Also show a join of conversation -> last message if both exist
    try {
      const joined = await sql`
        SELECT c.id AS conversation_id, c.participants, c.last_message_id, m.id AS message_id, m.content, m.created_at AS message_created_at
        FROM conversations c
        LEFT JOIN chat_messages m ON m.conversation_id = c.id
        ORDER BY c.created_at DESC
        LIMIT 50
      `;
      console.log('\n=== conversation -> chat_messages join (up to 50 rows) ===');
      console.log(JSON.stringify(joined, null, 2));
    } catch (err: any) {
      console.log('\n=== join query failed (maybe tables not present or different names) ===');
    }

    await sql.end({ timeout: 5 });
    console.log('\nDone.');
  } catch (err) {
    console.error('Error while verifying DB:', err);
    try { await sql.end({ timeout: 5 }); } catch (e) {}
    process.exit(2);
  }
}

main();
