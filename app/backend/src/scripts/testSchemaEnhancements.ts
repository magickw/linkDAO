import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import dotenv from "dotenv";
import { sellers, products, orders, imageStorage, ensVerifications } from "../db/schema";

dotenv.config();

async function testSchemaEnhancements() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);
  
  try {
    console.log("Testing marketplace enhancements schema...");
    
    // Test 1: Verify new tables exist and can be queried
    console.log("\n1. Testing new tables:");
    
    const imageStorageCount = await db.select().from(imageStorage).limit(1);
    console.log(`✓ image_storage table accessible (${imageStorageCount.length} records found)`);
    
    const ensVerificationsCount = await db.select().from(ensVerifications).limit(1);
    console.log(`✓ ens_verifications table accessible (${ensVerificationsCount.length} records found)`);
    
    // Test 2: Verify new columns in existing tables
    console.log("\n2. Testing enhanced table columns:");
    
    // Test sellers table enhancements
    const sellersTest = await db.select({
      id: sellers.id,
      ensHandle: sellers.ensHandle,
      profileImageIpfs: sellers.profileImageIpfs,
      websiteUrl: sellers.websiteUrl
    }).from(sellers).limit(1);
    console.log(`✓ sellers table enhanced columns accessible`);
    
    // Test products table enhancements
    const productsTest = await db.select({
      id: products.id,
      listingStatus: products.listingStatus,
      publishedAt: products.publishedAt,
      imageIpfsHashes: products.imageIpfsHashes
    }).from(products).limit(1);
    console.log(`✓ products table enhanced columns accessible`);
    
    // Test orders table enhancements
    const ordersTest = await db.select({
      id: orders.id,
      checkoutSessionId: orders.checkoutSessionId,
      paymentMethod: orders.paymentMethod,
      shippingAddress: orders.shippingAddress
    }).from(orders).limit(1);
    console.log(`✓ orders table enhanced columns accessible`);
    
    // Test 3: Test data insertion into new tables
    console.log("\n3. Testing data operations:");
    
    // Test image storage insertion (will rollback)
    try {
      await db.transaction(async (tx) => {
        const testImage = await tx.insert(imageStorage).values({
          ipfsHash: "QmTestHash123456789",
          cdnUrl: "https://cdn.example.com/test.jpg",
          originalFilename: "test.jpg",
          contentType: "image/jpeg",
          fileSize: 1024,
          width: 800,
          height: 600,
          usageType: "profile"
        }).returning();
        
        console.log(`✓ image_storage insert test successful`);
        
        // Rollback the transaction to avoid leaving test data
        throw new Error("Rollback test transaction");
      });
    } catch (error) {
      if (error.message === "Rollback test transaction") {
        console.log(`✓ image_storage transaction rollback successful`);
      } else {
        throw error;
      }
    }
    
    console.log("\n✅ All schema enhancement tests passed!");
    console.log("\nDatabase Schema Enhancements Summary:");
    console.log("- ENS support added to sellers table (optional)");
    console.log("- Image storage infrastructure implemented");
    console.log("- Enhanced listing management for products");
    console.log("- Improved order tracking capabilities");
    console.log("- All tables and columns are accessible and functional");
    
  } catch (error) {
    console.error("Error testing schema enhancements:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testSchemaEnhancements();