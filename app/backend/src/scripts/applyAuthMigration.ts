import { drizzle } from 'drizzle-orm/postgres-js';
import { safeLogger } from '../utils/safeLogger';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL!;

async function applyAuthMigration() {
  const sql = postgres(connectionString, { ssl: 'require' });
  const db = drizzle(sql);

  try {
    safeLogger.info('Applying authentication system migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../drizzle/0037_authentication_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        safeLogger.info(`Executing: ${statement.substring(0, 50)}...`);
        await sql.unsafe(statement);
      }
    }
    
    safeLogger.info('Authentication system migration applied successfully!');
  } catch (error) {
    safeLogger.error('Error applying migration:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  applyAuthMigration().catch(safeLogger.error);
}

export { applyAuthMigration };
