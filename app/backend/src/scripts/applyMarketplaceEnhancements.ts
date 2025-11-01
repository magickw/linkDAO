import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function applyMarketplaceEnhancements() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    safeLogger.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const client = postgres(connectionString, { prepare: false });
  
  try {
    safeLogger.info("Applying marketplace enhancements schema...");
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, "../../drizzle/0030_marketplace_enhancements_schema.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    
    // Execute the migration
    await client.unsafe(migrationSQL);
    
    safeLogger.info("✅ Marketplace enhancements schema applied successfully!");
    
    // Verify the changes by checking if new tables exist
    const imageStorageCheck = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'image_storage'
      );
    `;
    
    const ensVerificationsCheck = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ens_verifications'
      );
    `;
    
    safeLogger.info("Verification results:");
    safeLogger.info(`- image_storage table exists: ${imageStorageCheck[0].exists}`);
    safeLogger.info(`- ens_verifications table exists: ${ensVerificationsCheck[0].exists}`);
    
    // Check if new columns were added to sellers table
    const sellersColumns = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'sellers'
      AND column_name IN ('ens_handle', 'profile_image_ipfs', 'cover_image_ipfs');
    `;
    
    safeLogger.info(`- New sellers columns added: ${sellersColumns.length}/3`);
    sellersColumns.forEach(col => safeLogger.info(`  ✓ ${col.column_name}`));
    
    // Check if new columns were added to products table
    const productsColumns = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'products'
      AND column_name IN ('listing_status', 'published_at', 'image_ipfs_hashes');
    `;
    
    safeLogger.info(`- New products columns added: ${productsColumns.length}/3`);
    productsColumns.forEach(col => safeLogger.info(`  ✓ ${col.column_name}`));
    
    // Check if new columns were added to orders table
    const ordersColumns = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'orders'
      AND column_name IN ('checkout_session_id', 'payment_method', 'shipping_address');
    `;
    
    safeLogger.info(`- New orders columns added: ${ordersColumns.length}/3`);
    ordersColumns.forEach(col => safeLogger.info(`  ✓ ${col.column_name}`));
    
  } catch (error) {
    safeLogger.error("Error applying marketplace enhancements:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMarketplaceEnhancements();
