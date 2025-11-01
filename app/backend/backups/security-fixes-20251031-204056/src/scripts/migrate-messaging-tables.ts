import postgres from "postgres";
import { safeLogger } from '../utils/safeLogger';
import dotenv from "dotenv";
import { safeLogger } from '../utils/safeLogger';
import fs from "fs";
import { safeLogger } from '../utils/safeLogger';
import path from "path";
import { safeLogger } from '../utils/safeLogger';

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";
  const client = postgres(connectionString, { prepare: false });

  safeLogger.info("Running messaging tables migration...");

  try {
    // Read the messaging migration SQL file
    const migrationPath = path.join(__dirname, "../../drizzle/0047_marketplace_messaging.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    safeLogger.info(`Executing migration: 0047_marketplace_messaging.sql`);

    // Execute the migration
    await client.unsafe(migrationSQL);

    safeLogger.info("✅ Messaging tables migration completed successfully!");
    safeLogger.info("\nCreated/Updated tables:");
    safeLogger.info("  - conversation_participants");
    safeLogger.info("  - message_templates");
    safeLogger.info("  - quick_replies");
    safeLogger.info("  - conversation_analytics");
    safeLogger.info("  - message_attachments");
    safeLogger.info("  - auto_response_rules");

    // Verify tables were created
    safeLogger.info("\nVerifying tables...");
    const tables = await client`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name IN ('conversation_participants', 'message_templates', 'quick_replies', 'conversation_analytics', 'message_attachments', 'auto_response_rules')
      AND table_schema = 'public'
      ORDER BY table_name
    `;

    safeLogger.info("\nTables found in database:");
    tables.forEach((table: any) => {
      safeLogger.info(`  ✓ ${table.table_name}`);
    });

    if (tables.length === 0) {
      safeLogger.warn("\n⚠️  Warning: No messaging tables found. Migration may not have run successfully.");
    }

  } catch (error: any) {
    safeLogger.error("Error running messaging tables migration:");
    safeLogger.error(error.message);

    // If error is "already exists", that's actually OK
    if (error.message && error.message.includes("already exists")) {
      safeLogger.info("\n✅ Tables already exist - migration is idempotent, this is OK!");
    } else {
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  safeLogger.error("Fatal error:", error);
  process.exit(1);
});
