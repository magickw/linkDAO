require('dotenv').config({path:__dirname + '/../../.env'});
const postgres = require('postgres');
(async()=>{
  const sql = postgres(process.env.DATABASE_URL, {prepare:false});
  try {
    const rows = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name`;
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally { await sql.end({timeout:5}); }
})();
