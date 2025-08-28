import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import dotenv from "dotenv";

dotenv.config();

async function resetDatabase() {
  // Create a postgres client
  const client = postgres(process.env.DATABASE_URL || "", { 
    prepare: false,
    max: 1
  });

  // Create Drizzle ORM instance
  const db = drizzle(client, { schema });

  try {
    console.log("Resetting database...");
    
    // Delete all data from tables in the correct order to avoid foreign key constraints
    await db.delete(schema.bids);
    console.log("Deleted bids");
    
    await db.delete(schema.escrows);
    console.log("Deleted escrows");
    
    await db.delete(schema.listings);
    console.log("Deleted listings");
    
    await db.delete(schema.reputations);
    console.log("Deleted reputations");
    
    await db.delete(schema.embeddings);
    console.log("Deleted embeddings");
    
    await db.delete(schema.follows);
    console.log("Deleted follows");
    
    await db.delete(schema.posts);
    console.log("Deleted posts");
    
    await db.delete(schema.payments);
    console.log("Deleted payments");
    
    await db.delete(schema.proposals);
    console.log("Deleted proposals");
    
    await db.delete(schema.bots);
    console.log("Deleted bots");
    
    await db.delete(schema.users);
    console.log("Deleted users");
    
    console.log("Database reset completed successfully!");
  } catch (error) {
    console.error("Error resetting database:", error);
  } finally {
    await client.end();
  }
}

resetDatabase();