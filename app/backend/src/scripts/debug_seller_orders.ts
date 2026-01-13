
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";
import { users, orders } from "../db/schema";
import { eq, isNotNull } from "drizzle-orm";

dotenv.config();

async function main() {
    const connectionString = process.env.DATABASE_URL || "postgresql://username:password@localhost:5432/linkdao";
    const client = postgres(connectionString);
    const db = drizzle(client);

    try {
        console.log("Searching for orders with seller_id...");

        // Find an order with a seller_id
        const sampleOrders = await db.select().from(orders).where(isNotNull(orders.sellerId)).limit(5);

        if (sampleOrders.length === 0) {
            console.log("No orders found with seller_id populated.");

            // Check if there are ANY orders
            const allOrders = await db.select().from(orders).limit(5);
            console.log(`Total orders checked: ${allOrders.length}`);
            if (allOrders.length > 0) {
                console.log("Sample order:", allOrders[0]);
            }
        } else {
            console.log(`Found ${sampleOrders.length} sample orders.`);
            const sellerId = sampleOrders[0].sellerId;
            console.log(`Testing with sellerId: ${sellerId}`);

            // Test query
            const sellerOrders = await db.select().from(orders).where(eq(orders.sellerId, sellerId!));
            console.log(`Query by sellerId returning ${sellerOrders.length} orders.`);

            // Fetch user
            const sellerUser = await db.select().from(users).where(eq(users.id, sellerId!));
            if (sellerUser.length > 0) {
                console.log(`Seller user found: ${sellerUser[0].email} / ${sellerUser[0].walletAddress}`);
            } else {
                console.log("Seller user NOT found in users table.");
            }
        }

    } catch (error) {
        console.error("Error debugging orders:", error);
    } finally {
        await client.end();
    }
}

main();
