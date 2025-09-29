import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });
  try {
    console.log('Checking for chat_messages table...');
    const tbl = await sql`SELECT to_regclass('public.chat_messages') as tbl`;
    if (!tbl[0].tbl) {
      console.log('chat_messages table not found, nothing to fix.');
      return;
    }

    console.log('Found chat_messages, checking column types...');
    const cols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'chat_messages'
    `;

    const colMap: Record<string,string> = {};
    for (const r of cols) colMap[r.column_name] = r.data_type;

    // If conversation_id is uuid, alter it to varchar
    if (colMap['conversation_id'] === 'uuid') {
      console.log('Dropping FK constraints referencing conversation_id if any...');
      // find FK constraint name
      const fk = await sql`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'chat_messages' AND tc.constraint_type = 'FOREIGN KEY'
      `;
      for (const row of fk) {
        try {
          console.log('Dropping constraint', row.constraint_name);
          await sql.unsafe(`ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS ${row.constraint_name}`);
        } catch (e) {
          console.warn('Failed to drop constraint', row.constraint_name, e.message || e);
        }
      }

      console.log('Altering conversation_id to varchar(255)...');
      await sql.unsafe("ALTER TABLE chat_messages ALTER COLUMN conversation_id TYPE varchar(255) USING conversation_id::varchar");
    }

    if (colMap['id'] === 'uuid') {
      console.log('Altering id column to varchar(255)...');
      await sql.unsafe("ALTER TABLE chat_messages ALTER COLUMN id TYPE varchar(255) USING id::varchar");
    }

    console.log('Ensuring index on (conversation_id, timestamp)');
    await sql.unsafe('CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id_timestamp ON chat_messages(conversation_id, timestamp DESC)');

    console.log('Schema fix applied.');
  } catch (err) {
    console.error('Schema fix failed:', err);
  } finally {
    await sql.end({ timeout: 5 }).catch(()=>{});
  }
}

main();
