import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set in environment');
    process.exit(1);
  }

  const sqlClient = postgres(connectionString, { prepare: false });

  try {
    const sqlPath = path.resolve(__dirname, '../../drizzle/0034_chat_tables.sql');
  const sqlText = fs.readFileSync(sqlPath, 'utf8');
  console.log('Applying migration:', sqlPath);
  // Execute raw SQL text
  await sqlClient.unsafe(sqlText);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(2);
  } finally {
    try { await sqlClient.end({ timeout: 5 }); } catch (e) {}
  }
}

main();
