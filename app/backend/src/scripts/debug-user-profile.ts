import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config();

async function debugUserProfile() {
  const connectionString = process.env.DATABASE_URL || "";
  
  if (!connectionString) {
    console.error("❌ No DATABASE_URL provided");
    process.exit(1);
  }

  try {
    console.log("🔍 Debugging user profile...");
    
    // Create a connection
    const client = postgres(connectionString, { prepare: false });
    const db = drizzle(client, { schema });
    
    // Query the specific user
    const address = "0xEe034b53D4cCb101b2a4faec27708be507197350";
    console.log(`🔍 Querying user with address: ${address}`);
    
    const result = await db.select().from(schema.users).where(eq(schema.users.walletAddress, address)).limit(1);
    
    if (result.length === 0) {
      console.log("❌ User not found");
      await client.end();
      process.exit(1);
    }
    
    const user = result[0];
    console.log("✅ User found:");
    console.log("ID:", user.id);
    console.log("Wallet Address:", user.walletAddress);
    console.log("Handle:", user.handle);
    console.log("Profile CID:", user.profileCid);
    console.log("Created At:", user.createdAt);
    console.log("Updated At:", user.updatedAt);
    
    // Try to parse profile data
    if (user.profileCid) {
      try {
        const profileData = JSON.parse(user.profileCid);
        console.log("✅ Profile data parsed successfully:");
        console.log(profileData);
      } catch (parseError) {
        console.log("❌ Failed to parse profile data:");
        console.log("Profile CID:", user.profileCid);
        console.log("Error:", parseError);
      }
    } else {
      console.log("ℹ️ No profile data found");
    }
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error debugging user profile:", error);
    process.exit(1);
  }
}

debugUserProfile();