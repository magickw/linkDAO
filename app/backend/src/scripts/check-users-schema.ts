import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import dotenv from "dotenv";

dotenv.config();

async function checkUsersSchema() {
  const connectionString = process.env.DATABASE_URL || "";
  
  if (!connectionString) {
    console.error("❌ No DATABASE_URL provided");
    process.exit(1);
  }

  try {
    console.log("🔍 Checking users table schema...");
    
    // Create a connection
    const client = postgres(connectionString, { prepare: false });
    const db = drizzle(client, { schema });
    
    // Try to query the users table with the updated_at column
    const result = await db.select({
      id: schema.users.id,
      walletAddress: schema.users.walletAddress,
      createdAt: schema.users.createdAt,
      updatedAt: schema.users.updatedAt
    }).from(schema.users).limit(1);
    
    console.log("✅ Users table schema is correct");
    console.log("Sample row:", result[0]);
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking users table schema:", error);
    process.exit(1);
  }
}

checkUsersSchema();