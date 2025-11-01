import postgres from 'postgres';
import { safeLogger } from '../utils/safeLogger';
import dotenv from 'dotenv';
import { safeLogger } from '../utils/safeLogger';

dotenv.config({ path: __dirname + '/../../.env' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    safeLogger.error('Please set DATABASE_URL to your Postgres instance, e.g. postgresql://postgres:postgres@localhost:5432/linkdao');
    process.exit(1);
  }

  const sql = postgres(connectionString, { prepare: false });

  try {
    safeLogger.info('Connected to DB. Running queries...');

    // Try several table name variants to be robust across schema versions
    const tablesToCheck = ['conversations', 'chat_messages', 'messages', 'conversation_messages'];

    for (const table of tablesToCheck) {
      try {
        // Use unsafe with a quoted identifier so we can handle dynamic table names
        const count = await sql.unsafe(`SELECT count(*)::int AS cnt FROM public."${table}"`);
        const cnt = count && count[0] ? count[0].cnt : 0;
        safeLogger.info(`\n=== ${table} (${cnt} rows) ===`);

        if (cnt > 0) {
          // Try ordering by common timestamp columns if present, otherwise just limit
          let sampleRows: any[] = [];
          try {
            sampleRows = await sql.unsafe(`SELECT * FROM public."${table}" ORDER BY created_at DESC NULLS LAST LIMIT 50`);
          } catch (e) {
            try {
              sampleRows = await sql.unsafe(`SELECT * FROM public."${table}" ORDER BY timestamp DESC NULLS LAST LIMIT 50`);
            } catch (e2) {
              sampleRows = await sql.unsafe(`SELECT * FROM public."${table}" LIMIT 50`);
            }
          }
          safeLogger.info(JSON.stringify(sampleRows, null, 2));
        }
      } catch (err: any) {
        // Table might not exist; show a friendly message
        const msg = String(err || '');
        if (/does not exist/.test(msg) || /relation ".+" does not exist/.test(msg)) {
          safeLogger.info(`\n=== ${table} - table not found (skipping) ===`);
        } else {
          safeLogger.info(`\n=== ${table} - query error: ${msg} ===`);
        }
      }
    }

    // Also attempt a basic join if both conversations and chat_messages exist
    try {
      const hasConv = (await sql.unsafe("SELECT to_regclass('public.conversations') IS NOT NULL AS exists"))[0].exists;
      const hasChat = (await sql.unsafe("SELECT to_regclass('public.chat_messages') IS NOT NULL AS exists"))[0].exists;
      if (hasConv && hasChat) {
        // left join and select a few fields
        const joined = await sql.unsafe(
          `SELECT c.id AS conversation_id, c.participants, c.unread_count, m.id AS message_id, m.content, m.timestamp AS message_timestamp
           FROM public.conversations c
           LEFT JOIN public.chat_messages m ON CAST(m.conversation_id AS text) = CAST(c.id AS text)
           ORDER BY c.created_at DESC NULLS LAST
           LIMIT 50`
        );
        safeLogger.info('\n=== conversation -> chat_messages join (up to 50 rows) ===');
        safeLogger.info(JSON.stringify(joined, null, 2));
      } else {
        safeLogger.info('\n=== conversation/chat_messages join skipped (one or both tables missing) ===');
      }
    } catch (err: any) {
      safeLogger.info('\n=== join query failed (maybe tables not present or different names) ===');
    }

    await sql.end({ timeout: 5 });
    safeLogger.info('\nDone.');
  } catch (err) {
    safeLogger.error('Error while verifying DB:', err);
    try { await sql.end({ timeout: 5 }); } catch (e) {}
    process.exit(2);
  }
}

main();
