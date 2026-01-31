import postgres from "postgres";
import { readFile } from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const client = postgres(DATABASE_URL, { prepare: false });

  try {
    console.log("Reading migration file...");
    const migrationPath = path.join(
      process.cwd(),
      "drizzle/0117_add_conversation_participants_columns.sql"
    );
    const migrationSql = await readFile(migrationPath, "utf-8");

    console.log("Executing migration...");
    await client.unsafe(migrationSql);

    console.log("✅ Migration executed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
