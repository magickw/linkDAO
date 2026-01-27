
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config();

async function main() {
    const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";
    const client = postgres(connectionString);
    const db = drizzle(client);

    try {
        const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'chat_messages' 
      AND column_name IN ('delivery_status', 'reply_count', 'original_content', 'encryption_metadata', 'reply_to_id', 'attachments');
    `);

        console.log("Found columns:", result.map((r: any) => r.column_name));

        const required = ['delivery_status', 'reply_count', 'original_content'];
        const found = result.map((r: any) => r.column_name);
        const missing = required.filter(c => !found.includes(c));

        if (missing.length > 0) {
            console.error("Missing columns:", missing);
            process.exit(1);
        } else {
            console.log("All required columns verified.");
        }

    } catch (error) {
        console.error("Error verifying schema:", error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
