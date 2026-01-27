import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
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
    safeLogger.info("Resetting database...");
    
    // Delete all data from tables in the correct order to avoid foreign key constraints
    await db.delete(schema.bids);
    safeLogger.info("Deleted bids");
    
    await db.delete(schema.escrows);
    safeLogger.info("Deleted escrows");
    
    await db.delete(schema.listings);
    safeLogger.info("Deleted listings");
    
    await db.delete(schema.reputations);
    safeLogger.info("Deleted reputations");
    
    await db.delete(schema.embeddings);
    safeLogger.info("Deleted embeddings");
    
    await db.delete(schema.follows);
    safeLogger.info("Deleted follows");
    
    await db.delete(schema.posts);
    safeLogger.info("Deleted posts");
    
    await db.delete(schema.payments);
    safeLogger.info("Deleted payments");
    
    await db.delete(schema.proposals);
    safeLogger.info("Deleted proposals");
    
    await db.delete(schema.bots);
    safeLogger.info("Deleted bots");
    
    await db.delete(schema.users);
    safeLogger.info("Deleted users");
    
    safeLogger.info("Database reset completed successfully!");
  } catch (error) {
    safeLogger.error("Error resetting database:", error);
  } finally {
    await client.end();
  }
}

resetDatabase();
