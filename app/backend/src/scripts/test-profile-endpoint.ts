import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config();

async function testProfileEndpoint() {
  const connectionString = process.env.DATABASE_URL || "";
  
  if (!connectionString) {
    console.error("❌ No DATABASE_URL provided");
    process.exit(1);
  }

  try {
    console.log("🔍 Testing profile endpoint logic...");
    
    // Create a connection
    const client = postgres(connectionString, { prepare: false });
    const db = drizzle(client, { schema });
    
    // Test the same query as in the profile endpoint
    const address = "0xEe034b53D4cCb101b2a4faec27708be507197350";
    const normalizedAddress = address.toLowerCase();
    
    console.log('Querying database for address:', normalizedAddress);
    // Query the database (case-insensitive)
    const result = await db.select().from(schema.users).where(sql`LOWER(${schema.users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
    console.log('Database query result:', result);
    
    if (result.length === 0) {
      console.log("❌ User not found");
      await client.end();
      process.exit(1);
    }
    
    // Transform the user data to match the frontend UserProfile interface
    const user = result[0];
    console.log("User data:", user);
    
    let profileData: any = {};
    
    try {
      if (user.profileCid) {
        profileData = JSON.parse(user.profileCid);
        console.log("Parsed profile data:", profileData);
      } else {
        console.log("No profile data to parse");
      }
    } catch (e) {
      console.log('Failed to parse profile data for user:', user.walletAddress);
      console.log('Error:', e);
    }
    
    const profile = {
      id: user.id,
      walletAddress: user.walletAddress,
      handle: user.handle || '',
      ens: profileData.ens || '',
      avatarCid: profileData.avatarCid || profileData.profilePicture || '',
      bioCid: profileData.bioCid || profileData.bio || '',
      email: profileData.email || '',
      billingFirstName: profileData.billingFirstName || '',
      billingLastName: profileData.billingLastName || '',
      billingCompany: profileData.billingCompany || '',
      billingAddress1: profileData.billingAddress1 || '',
      billingAddress2: profileData.billingAddress2 || '',
      billingCity: profileData.billingCity || '',
      billingState: profileData.billingState || '',
      billingZipCode: profileData.billingZipCode || '',
      billingCountry: profileData.billingCountry || '',
      billingPhone: profileData.billingPhone || '',
      shippingFirstName: profileData.shippingFirstName || '',
      shippingLastName: profileData.shippingLastName || '',
      shippingCompany: profileData.shippingCompany || '',
      shippingAddress1: profileData.shippingAddress1 || '',
      shippingAddress2: profileData.shippingAddress2 || '',
      shippingCity: profileData.shippingCity || '',
      shippingState: profileData.shippingState || '',
      shippingZipCode: profileData.shippingZipCode || '',
      shippingCountry: profileData.shippingCountry || '',
      shippingPhone: profileData.shippingPhone || '',
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt) : (user.createdAt ? new Date(user.createdAt) : new Date())
    };
    
    console.log("✅ Profile data transformed successfully:");
    console.log(profile);
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error testing profile endpoint logic:", error);
    process.exit(1);
  }
}

testProfileEndpoint();