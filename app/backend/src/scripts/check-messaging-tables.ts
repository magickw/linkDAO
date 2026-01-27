import postgres from "postgres";
import { safeLogger } from '../utils/safeLogger';
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";
  const client = postgres(connectionString, { prepare: false });

  safeLogger.info("Checking messaging tables status...\n");

  try {
    // Check what type chat_messages.id actually is
    const idTypeCheck = await client`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'chat_messages'
      AND column_name IN ('id', 'parent_message_id')
      ORDER BY column_name
    `;

    safeLogger.info("Current chat_messages column types:");
    idTypeCheck.forEach((col: any) => {
      safeLogger.info(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

    // Check if messaging tables exist
    const tables = await client`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name IN ('conversation_participants', 'message_templates', 'quick_replies', 'conversation_analytics', 'message_attachments', 'auto_response_rules')
      AND table_schema = 'public'
      ORDER BY table_name
    `;

    safeLogger.info("\nMessaging tables status:");
    const requiredTables = ['conversation_participants', 'message_templates', 'quick_replies', 'conversation_analytics'];
    const existingTables = tables.map((t: any) => t.table_name);

    requiredTables.forEach((tableName) => {
      if (existingTables.includes(tableName)) {
        safeLogger.info(`  ✓ ${tableName} - EXISTS`);
      } else {
        safeLogger.info(`  ✗ ${tableName} - MISSING`);
      }
    });

    // Check if all required tables exist
    const allTablesExist = requiredTables.every((t) => existingTables.includes(t));

    if (allTablesExist) {
      safeLogger.info("\n✅ All required messaging tables already exist!");
      safeLogger.info("\nNo migration needed. The messaging system is ready to use.");
      return;
    }

    // If tables don't exist, run the migration
    safeLogger.info("\n⚠️  Some tables are missing. Running migration...\n");

    // Read the messaging migration SQL file
    const migrationPath = path.join(__dirname, "../../drizzle/0047_marketplace_messaging.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    safeLogger.info(`Executing migration: 0047_marketplace_messaging.sql`);

    // Execute the migration
    await client.unsafe(migrationSQL);

    safeLogger.info("\n✅ Messaging tables migration completed successfully!");

  } catch (error: any) {
    safeLogger.error("\n❌ Error during migration:");
    safeLogger.error(error.message);

    // If error is about type incompatibility, provide more context
    if (error.message && error.message.includes("incompatible types")) {
      safeLogger.info("\n⚠️  Column type mismatch detected.");
      safeLogger.info("The migration expects chat_messages.id to be UUID type.");
      safeLogger.info("Please check the actual column type in your database.");
      safeLogger.info("\nThis usually means the database schema doesn't match the migration files.");
      safeLogger.info("You may need to:");
      safeLogger.info("  1. Check what type chat_messages.id actually is");
      safeLogger.info("  2. Update the migration to match your actual schema");
      safeLogger.info("  3. Or alter the column type if needed (with care)");
    }

    // If error is "already exists", that's actually OK for some things
    if (error.message && error.message.includes("already exists")) {
      safeLogger.info("\n✅ Tables/columns already exist - this is OK!");
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
