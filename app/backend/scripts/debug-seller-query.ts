#!/usr/bin/env ts-node

import { db } from '../src/db/connection';
import { sellers } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function debugSellerQuery() {
  console.log('Debugging seller query...\n');
  
  try {
    // Check all sellers
    const allSellers = await db.select().from(sellers);
    console.log(`Total sellers in database: ${allSellers.length}`);
    
    // Check sellers with onboarding completed
    const completedSellers = await db
      .select({ walletAddress: sellers.walletAddress })
      .from(sellers)
      .where(eq(sellers.onboardingCompleted, true));
    
    console.log(`Sellers with completed onboarding: ${completedSellers.length}`);
    completedSellers.forEach(s => {
      console.log(`  - ${s.walletAddress}`);
    });
    
    // Try to get the first 5
    const limitedSellers = await db
      .select({ walletAddress: sellers.walletAddress })
      .from(sellers)
      .where(eq(sellers.onboardingCompleted, true))
      .limit(5);
    
    console.log(`\nFirst 5 sellers (limited):`);
    limitedSellers.forEach(s => {
      console.log(`  - ${s.walletAddress}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

debugSellerQuery();