import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import dotenv from "dotenv";
import { eq, ilike } from "drizzle-orm";

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
    
    // Try different variations of the address
    const addresses = [
      "0xEe034b53D4cCb101b2a4faec27708be507197350",
      "0xee034b53d4ccb101b2a4faec27708be507197350",
      "0xEE034B53D4CCB101B2A4FAEC27708BE507197350"
    ];
    
    for (const address of addresses) {
      console.log(`🔍 Querying user with address: ${address}`);
      
      // Try exact match first
      let result = await db.select().from(schema.users).where(eq(schema.users.walletAddress, address)).limit(1);
      
      if (result.length === 0) {
        // Try case-insensitive match
        console.log(`  ❌ Exact match failed, trying case-insensitive match...`);
        result = await db.select().from(schema.users).where(ilike(schema.users.walletAddress, address)).limit(1);
      }
      
      if (result.length > 0) {
        const user = result[0];
        console.log("✅ User found with address:", user.walletAddress);
        console.log("ID:", user.id);
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
        break;
      } else {
        console.log(`  ❌ User not found with address: ${address}`);
      }
    }
    
    if (addresses.every(address => {
      // This is just for the loop, we've already checked above
      return true;
    })) {
      // Try to list all users to see what's in the database
      console.log("🔍 Listing all users to see what's in the database...");
      const allUsers = await db.select().from(schema.users).limit(10);
      console.log(`Found ${allUsers.length} users:`);
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.walletAddress} - ${user.handle || 'No handle'}`);
      });
    }
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error debugging user profile:", error);
    process.exit(1);
  }
}

debugUserProfile();