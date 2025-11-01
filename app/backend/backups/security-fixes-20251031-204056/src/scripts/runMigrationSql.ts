import postgres from 'postgres';
import { safeLogger } from '../utils/safeLogger';
import fs from 'fs';
import { safeLogger } from '../utils/safeLogger';
import path from 'path';
import { safeLogger } from '../utils/safeLogger';
import dotenv from 'dotenv';
import { safeLogger } from '../utils/safeLogger';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    safeLogger.error('DATABASE_URL not set in environment');
    process.exit(1);
  }

  const sqlClient = postgres(connectionString, { prepare: false });

  try {
    const sqlPath = path.resolve(__dirname, '../../drizzle/0034_chat_tables.sql');
  const sqlText = fs.readFileSync(sqlPath, 'utf8');
  safeLogger.info('Applying migration:', sqlPath);
  // Execute raw SQL text
  await sqlClient.unsafe(sqlText);
    safeLogger.info('Migration applied successfully');
  } catch (err) {
    safeLogger.error('Migration failed:', err);
    process.exit(2);
  } finally {
    try { await sqlClient.end({ timeout: 5 }); } catch (e) {}
  }
}

main();
