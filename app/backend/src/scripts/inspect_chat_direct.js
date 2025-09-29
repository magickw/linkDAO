const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const postgres = require('postgres');
(async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) { console.error('No DATABASE_URL'); process.exit(1); }
  const sql = postgres(connectionString, { prepare: false });
  try {
    const tables = ['chat_messages','conversation_messages','messages','conversations'];
    for (const t of tables) {
      console.log('\n--- TABLE:', t, '---');
      try {
        const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=${t} ORDER BY ordinal_position`;
        if (!cols || cols.length === 0) { console.log('  (no columns / table may not exist)'); }
        else { cols.forEach(c => console.log('  ', c.column_name, c.data_type)); }
      } catch (err) {
        console.log('  (error reading columns)', err && err.message ? err.message : err);
      }
      try {
        const count = await sql.unsafe(`SELECT count(*)::int AS cnt FROM public."${t}"`);
        console.log('  COUNT:', count[0] && count[0].cnt);
      } catch (err) {
        console.log('  (count error)', err && err.message ? err.message : err);
      }
      try {
        const sample = await sql.unsafe(`SELECT * FROM public."${t}" ORDER BY created_at DESC NULLS LAST LIMIT 5`);
        console.log('  SAMPLE ROWS:', sample.length);
        if (sample.length > 0) console.log('  first sample keys:', Object.keys(sample[0]));
      } catch (err) {
        console.log('  (sample error)', err && err.message ? err.message : err);
      }
    }
    await sql.end();
  } catch (e) { console.error('ERROR:', e); try { await sql.end(); } catch (er) {} process.exit(2); }
})();
