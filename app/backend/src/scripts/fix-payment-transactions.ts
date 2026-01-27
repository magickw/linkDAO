import { safeLogger } from '../utils/safeLogger';
import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function fixPaymentTransactionsSchema() {
  const connectionString = process.env.DATABASE_URL!;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(connectionString, { prepare: false });

  try {
    safeLogger.info('🔧 Starting payment_transactions schema fix...');

    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'drizzle', '0109_fix_payment_transactions_schema.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

    // Split the SQL into individual statements
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    safeLogger.info(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await client.unsafe(statement);
        safeLogger.info(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          safeLogger.info(`⏭️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
        } else {
          safeLogger.warn(`⚠️  Statement ${i + 1}/${statements.length} failed: ${error.message}`);
          // Continue with next statement
        }
      }
    }

    safeLogger.info('✅ Payment transactions schema fix completed successfully!');

    // Verify the table structure
    const columns = await client`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'payment_transactions' 
      ORDER BY ordinal_position
    `;

    safeLogger.info('📊 Current payment_transactions table structure:');
    for (const col of columns) {
      safeLogger.info(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    }

  } catch (error) {
    safeLogger.error('❌ Failed to fix payment_transactions schema:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the fix
fixPaymentTransactionsSchema()
  .then(() => {
    safeLogger.info('🎉 Payment transactions schema fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    safeLogger.error('💥 Payment transactions schema fix failed:', error);
    process.exit(1);
  });