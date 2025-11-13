#!/usr/bin/env ts-node

/**
 * Diagnose cache warming issues after UUID migration
 * This script checks the database state and identifies potential issues
 */

import { db } from '../src/db/connection';
import { sellers, listings, orders, categories } from '../src/db/schema';
import { eq, count, desc } from 'drizzle-orm';

async function diagnoseDatabaseState() {
  console.log('🔍 Diagnosing database state after UUID migration...\n');

  try {
    // 1. Check sellers table
    console.log('📊 Checking sellers table...');
    const sellerCount = await db.select({ count: count() }).from(sellers);
    console.log(`   Total sellers: ${sellerCount[0].count}`);
    
    const completedSellers = await db
      .select({ count: count() })
      .from(sellers)
      .where(eq(sellers.onboardingCompleted, true));
    console.log(`   Completed onboarding: ${completedSellers[0].count}`);
    
    const sampleSellers = await db
      .select({ walletAddress: sellers.walletAddress, storeName: sellers.storeName })
      .from(sellers)
      .limit(5);
    console.log('   Sample seller addresses:');
    sampleSellers.forEach(s => console.log(`     - ${s.walletAddress} (${s.storeName || 'No store name'})`));
    console.log('');

    // 2. Check listings table
    console.log('📊 Checking listings table...');
    const listingCount = await db.select({ count: count() }).from(listings);
    console.log(`   Total listings: ${listingCount[0].count}`);
    
    const sampleListings = await db
      .select({ 
        id: listings.id, 
        sellerId: listings.sellerId,
        createdAt: listings.createdAt 
      })
      .from(listings)
      .limit(5);
    console.log('   Sample listings:');
    sampleListings.forEach(l => console.log(`     - ID: ${l.id} (Seller: ${l.sellerId})`));
    console.log('');

    // 3. Check categories table
    console.log('📊 Checking categories table...');
    const categoryCount = await db.select({ count: count() }).from(categories);
    console.log(`   Total categories: ${categoryCount[0].count}`);
    
    const activeCategories = await db
      .select({ count: count() })
      .from(categories)
      .where(eq(categories.isActive, true));
    console.log(`   Active categories: ${activeCategories[0].count}`);
    
    const sampleCategories = await db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.isActive, true))
      .limit(5);
    console.log('   Sample categories:');
    sampleCategories.forEach(c => console.log(`     - ${c.name} (${c.slug})`));
    console.log('');

    // 4. Check for orphaned orders
    console.log('📊 Checking for orphaned orders...');
    const orphanedOrders = await db
      .select({ count: count() })
      .from(orders)
      .where(sql`listing_id NOT IN (SELECT id FROM listings)`);
    console.log(`   Orphaned orders (listing not found): ${orphanedOrders[0].count}`);
    console.log('');

    // 5. Memory usage recommendations
    console.log('💡 Memory usage recommendations:');
    console.log('   - Cache warming batch size is set to 3 jobs');
    console.log('   - Delay between batches is 200ms');
    console.log('   - Consider reducing cache warming frequency if memory is constrained');
    console.log('');

    // 6. Cache warming recommendations
    console.log('🔥 Cache warming recommendations:');
    if (sellerCount[0].count === 0) {
      console.log('   ⚠️  No sellers found - cache warming will fail for seller profiles');
      console.log('   💡 Run seed script to create sample sellers');
    }
    
    if (categoryCount[0].count === 0) {
      console.log('   ⚠️  No categories found - cache warming will fail for categories');
      console.log('   💡 Run seed script to create sample categories');
    }
    
    if (listingCount[0].count === 0) {
      console.log('   ⚠️  No listings found - cache warming will fail for listings');
      console.log('   💡 Run seed script to create sample listings');
    }
    
    if (sellerCount[0].count > 0 && categoryCount[0].count > 0) {
      console.log('   ✅ Database has data for cache warming');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error diagnosing database:', error);
    process.exit(1);
  }
}

// Import sql for raw queries
import { sql } from 'drizzle-orm';

// Run the diagnosis
diagnoseDatabaseState()
  .then(() => {
    console.log('✅ Database diagnosis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  });