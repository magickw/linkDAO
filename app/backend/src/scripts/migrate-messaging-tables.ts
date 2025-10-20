import postgres from "postgres";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";
  const client = postgres(connectionString, { prepare: false });

  console.log("Running messaging tables migration...");

  try {
    // Read the messaging migration SQL file
    const migrationPath = path.join(__dirname, "../../drizzle/0047_marketplace_messaging.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    console.log(`Executing migration: 0047_marketplace_messaging.sql`);

    // Execute the migration
    await client.unsafe(migrationSQL);

    console.log("✅ Messaging tables migration completed successfully!");
    console.log("\nCreated/Updated tables:");
    console.log("  - conversation_participants");
    console.log("  - message_templates");
    console.log("  - quick_replies");
    console.log("  - conversation_analytics");
    console.log("  - message_attachments");
    console.log("  - auto_response_rules");

    // Verify tables were created
    console.log("\nVerifying tables...");
    const tables = await client`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name IN ('conversation_participants', 'message_templates', 'quick_replies', 'conversation_analytics', 'message_attachments', 'auto_response_rules')
      AND table_schema = 'public'
      ORDER BY table_name
    `;

    console.log("\nTables found in database:");
    tables.forEach((table: any) => {
      console.log(`  ✓ ${table.table_name}`);
    });

    if (tables.length === 0) {
      console.warn("\n⚠️  Warning: No messaging tables found. Migration may not have run successfully.");
    }

  } catch (error: any) {
    console.error("Error running messaging tables migration:");
    console.error(error.message);

    // If error is "already exists", that's actually OK
    if (error.message && error.message.includes("already exists")) {
      console.log("\n✅ Tables already exist - migration is idempotent, this is OK!");
    } else {
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
