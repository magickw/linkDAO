
import dotenv from 'dotenv';
import postgres from 'postgres';
import { safeLogger } from '../utils/safeLogger';

dotenv.config();

async function main() {
    const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";
    const sql = postgres(connectionString);

    try {
        safeLogger.info("Applying digital delivery columns...");

        await sql`
            ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "digital_delivery_completed_at" timestamp;
        `;
        await sql`
            ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_notes" text;
        `;

        // Also add the service columns from 0103 just in case
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_status" varchar(32)`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_scheduled" boolean DEFAULT false`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_date" varchar(50)`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_time" varchar(50)`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "scheduled_timezone" varchar(50)`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_notes" text`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_deliverables" text`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_completed_at" timestamp`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "buyer_confirmed_at" timestamp`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_started" boolean DEFAULT false`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "service_started_at" timestamp`;
        await sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "is_service_order" boolean DEFAULT false`;

        await sql`CREATE INDEX IF NOT EXISTS "idx_orders_service_status" ON "orders" ("service_status")`;
        await sql`CREATE INDEX IF NOT EXISTS "idx_orders_is_service_order" ON "orders" ("is_service_order")`;

        safeLogger.info("Columns applied successfully!");
    } catch (error) {
        safeLogger.error("Error applying columns:", error);
    } finally {
        await sql.end();
    }
}

main();
