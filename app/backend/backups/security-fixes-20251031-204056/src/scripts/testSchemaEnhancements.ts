import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import { safeLogger } from '../utils/safeLogger';
import dotenv from "dotenv";
import { safeLogger } from '../utils/safeLogger';
import { sellers, products, orders, imageStorage, ensVerifications } from "../db/schema";
import { safeLogger } from '../utils/safeLogger';

dotenv.config();

async function testSchemaEnhancements() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    safeLogger.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client);
  
  try {
    safeLogger.info("Testing marketplace enhancements schema...");
    
    // Test 1: Verify new tables exist and can be queried
    safeLogger.info("\n1. Testing new tables:");
    
    const imageStorageCount = await db.select().from(imageStorage).limit(1);
    safeLogger.info(`✓ image_storage table accessible (${imageStorageCount.length} records found)`);
    
    const ensVerificationsCount = await db.select().from(ensVerifications).limit(1);
    safeLogger.info(`✓ ens_verifications table accessible (${ensVerificationsCount.length} records found)`);
    
    // Test 2: Verify new columns in existing tables
    safeLogger.info("\n2. Testing enhanced table columns:");
    
    // Test sellers table enhancements
    const sellersTest = await db.select({
      id: sellers.id,
      ensHandle: sellers.ensHandle,
      profileImageIpfs: sellers.profileImageIpfs,
      websiteUrl: sellers.websiteUrl
    }).from(sellers).limit(1);
    safeLogger.info(`✓ sellers table enhanced columns accessible`);
    
    // Test products table enhancements
    const productsTest = await db.select({
      id: products.id,
      listingStatus: products.listingStatus,
      publishedAt: products.publishedAt,
      imageIpfsHashes: products.imageIpfsHashes
    }).from(products).limit(1);
    safeLogger.info(`✓ products table enhanced columns accessible`);
    
    // Test orders table enhancements
    const ordersTest = await db.select({
      id: orders.id,
      checkoutSessionId: orders.checkoutSessionId,
      paymentMethod: orders.paymentMethod,
      shippingAddress: orders.shippingAddress
    }).from(orders).limit(1);
    safeLogger.info(`✓ orders table enhanced columns accessible`);
    
    // Test 3: Test data insertion into new tables
    safeLogger.info("\n3. Testing data operations:");
    
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
        
        safeLogger.info(`✓ image_storage insert test successful`);
        
        // Rollback the transaction to avoid leaving test data
        throw new Error("Rollback test transaction");
      });
    } catch (error) {
      if (error.message === "Rollback test transaction") {
        safeLogger.info(`✓ image_storage transaction rollback successful`);
      } else {
        throw error;
      }
    }
    
    safeLogger.info("\n✅ All schema enhancement tests passed!");
    safeLogger.info("\nDatabase Schema Enhancements Summary:");
    safeLogger.info("- ENS support added to sellers table (optional)");
    safeLogger.info("- Image storage infrastructure implemented");
    safeLogger.info("- Enhanced listing management for products");
    safeLogger.info("- Improved order tracking capabilities");
    safeLogger.info("- All tables and columns are accessible and functional");
    
  } catch (error) {
    safeLogger.error("Error testing schema enhancements:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testSchemaEnhancements();