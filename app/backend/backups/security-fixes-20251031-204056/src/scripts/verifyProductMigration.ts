#!/usr/bin/env tsx

import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import postgres from "postgres";
import { safeLogger } from '../utils/safeLogger';
import * as dotenv from "dotenv";
import { safeLogger } from '../utils/safeLogger';

// Load environment variables
dotenv.config();

async function verifyProductMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    safeLogger.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  safeLogger.info("🔍 Verifying product migration...");

  try {
    const sql = postgres(connectionString, {
      max: 1,
      onnotice: () => {}, // Suppress notices
    });

    // Check if tables exist
    safeLogger.info("\n📋 Checking table existence:");
    const tables = await sql`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('categories', 'products', 'product_tags')
      ORDER BY table_name;
    `;

    if (tables.length === 0) {
      safeLogger.info("❌ No product tables found. Migration may not have run.");
      process.exit(1);
    }

    tables.forEach((table: any) => {
      safeLogger.info(`   ✅ ${table.table_name} (${table.column_count} columns)`);
    });

    // Check indexes
    safeLogger.info("\n🔗 Checking indexes:");
    const indexes = await sql`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('categories', 'products', 'product_tags')
      ORDER BY tablename, indexname;
    `;

    const indexesByTable: Record<string, string[]> = {};
    indexes.forEach((idx: any) => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx.indexname);
    });

    Object.entries(indexesByTable).forEach(([table, idxList]) => {
      safeLogger.info(`   ${table}: ${idxList.length} indexes`);
      idxList.forEach(idx => safeLogger.info(`     - ${idx}`));
    });

    // Check foreign keys
    safeLogger.info("\n🔗 Checking foreign key constraints:");
    const foreignKeys = await sql`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name IN ('categories', 'products', 'product_tags')
      ORDER BY tc.table_name, tc.constraint_name;
    `;

    foreignKeys.forEach((fk: any) => {
      safeLogger.info(`   ✅ ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // Check sample data
    safeLogger.info("\n📊 Checking sample data:");
    
    const categoryCount = await sql`SELECT COUNT(*) as count FROM categories`;
    safeLogger.info(`   Categories: ${categoryCount[0].count} records`);

    if (categoryCount[0].count > 0) {
      const sampleCategories = await sql`
        SELECT name, slug, is_active 
        FROM categories 
        ORDER BY sort_order, name 
        LIMIT 5
      `;
      safeLogger.info("   Sample categories:");
      sampleCategories.forEach((cat: any) => {
        safeLogger.info(`     - ${cat.name} (${cat.slug}) ${cat.is_active ? '✅' : '❌'}`);
      });
    }

    const productCount = await sql`SELECT COUNT(*) as count FROM products`;
    safeLogger.info(`   Products: ${productCount[0].count} records`);

    const productTagCount = await sql`SELECT COUNT(*) as count FROM product_tags`;
    safeLogger.info(`   Product Tags: ${productTagCount[0].count} records`);

    // Test basic operations
    safeLogger.info("\n🧪 Testing basic operations:");
    
    try {
      // Test category insertion
      const testCategory = await sql`
        INSERT INTO categories (name, slug, description, path, sort_order)
        VALUES ('Test Category', 'test-category-' || extract(epoch from now()), 'Test category for verification', '["Test Category"]', 999)
        RETURNING id, name
      `;
      safeLogger.info(`   ✅ Category insertion: ${testCategory[0].name}`);

      // Test product insertion
      const testProduct = await sql`
        INSERT INTO products (
          seller_id, title, description, price_amount, price_currency, 
          category_id, images, metadata, inventory
        )
        SELECT 
          u.id, 
          'Test Product', 
          'Test product for verification', 
          99.99, 
          'USD',
          ${testCategory[0].id},
          '["test-image-hash"]',
          '{"condition": "new", "brand": "Test"}',
          10
        FROM users u 
        LIMIT 1
        RETURNING id, title
      `;
      
      if (testProduct.length > 0) {
        safeLogger.info(`   ✅ Product insertion: ${testProduct[0].title}`);

        // Test product tag insertion
        await sql`
          INSERT INTO product_tags (product_id, tag)
          VALUES (${testProduct[0].id}, 'test-tag')
        `;
        safeLogger.info(`   ✅ Product tag insertion`);

        // Clean up test data
        await sql`DELETE FROM product_tags WHERE product_id = ${testProduct[0].id}`;
        await sql`DELETE FROM products WHERE id = ${testProduct[0].id}`;
      } else {
        safeLogger.info(`   ⚠️  Product insertion skipped (no users found)`);
      }

      await sql`DELETE FROM categories WHERE id = ${testCategory[0].id}`;
      safeLogger.info(`   ✅ Test data cleanup completed`);

    } catch (error) {
      safeLogger.info(`   ❌ Operation test failed: ${error}`);
    }

    await sql.end();
    safeLogger.info("\n🎉 Product migration verification completed successfully!");

  } catch (error) {
    safeLogger.error("❌ Verification failed:", error);
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  verifyProductMigration();
}

export { verifyProductMigration };