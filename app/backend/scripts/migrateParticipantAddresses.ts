/**
 * Migration Script: Normalize Participant Addresses to Lowercase
 * 
 * This script fixes the case-sensitivity issue in conversation participants
 * by normalizing all wallet addresses in the participants JSONB column to lowercase.
 * 
 * Issue: Legacy data may have mixed-case addresses (e.g., "0xAbC123...") which
 * causes access denied errors when querying with normalized lowercase addresses.
 * 
 * Solution: Update all participant addresses to lowercase format.
 */

import { db } from '../src/db';
import { conversations } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function migrateParticipantAddresses() {
  console.log('🔄 Starting migration: Normalize participant addresses to lowercase...\n');

  try {
    // Step 1: Check current state
    console.log('📊 Checking current state of conversations...');
    
    const allConversations = await db
      .select({
        id: conversations.id,
        participants: conversations.participants
      })
      .from(conversations);

    console.log(`   Found ${allConversations.length} conversations\n`);

    // Step 2: Identify conversations with mixed-case addresses
    const conversationsWithMixedCase: Array<{
      id: string;
      participants: string[];
      hasMixedCase: boolean;
      mixedCaseAddresses: string[];
    }> = [];

    for (const convo of allConversations) {
      const participants = convo.participants as string[];
      const mixedCaseAddresses = participants.filter(addr => 
        addr !== addr.toLowerCase()
      );

      if (mixedCaseAddresses.length > 0) {
        conversationsWithMixedCase.push({
          id: convo.id,
          participants,
          hasMixedCase: true,
          mixedCaseAddresses
        });
      }
    }

    if (conversationsWithMixedCase.length === 0) {
      console.log('✅ No conversations with mixed-case addresses found. Migration not needed.\n');
      return;
    }

    console.log(`⚠️  Found ${conversationsWithMixedCase.length} conversations with mixed-case addresses:\n`);

    // Display sample of affected conversations
    conversationsWithMixedCase.slice(0, 5).forEach(convo => {
      console.log(`   Conversation ID: ${convo.id}`);
      console.log(`   Mixed-case addresses: ${convo.mixedCaseAddresses.join(', ')}`);
      console.log('');
    });

    if (conversationsWithMixedCase.length > 5) {
      console.log(`   ... and ${conversationsWithMixedCase.length - 5} more\n`);
    }

    // Step 3: Update conversations with normalized addresses
    console.log('🔧 Updating conversations with normalized addresses...\n');

    let updatedCount = 0;

    for (const convo of conversationsWithMixedCase) {
      try {
        const normalizedParticipants = convo.participants.map(addr => addr.toLowerCase());

        await db
          .update(conversations)
          .set({
            participants: normalizedParticipants as any
          })
          .where(sql`${conversations.id} = ${convo.id}`);

        updatedCount++;
        console.log(`   ✅ Updated conversation ${convo.id}`);
        
        if (updatedCount % 10 === 0) {
          console.log(`   Progress: ${updatedCount}/${conversationsWithMixedCase.length}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to update conversation ${convo.id}:`, error);
      }
    }

    console.log(`\n✨ Migration completed!`);
    console.log(`   - Total conversations checked: ${allConversations.length}`);
    console.log(`   - Conversations with mixed-case addresses: ${conversationsWithMixedCase.length}`);
    console.log(`   - Successfully updated: ${updatedCount}`);
    console.log(`   - Failed: ${conversationsWithMixedCase.length - updatedCount}\n`);

    // Step 4: Verify the migration
    console.log('🔍 Verifying migration...\n');

    const remainingMixedCase = await db
      .select({
        id: conversations.id,
        participants: conversations.participants
      })
      .from(conversations)
      .where(sql`EXISTS (
        SELECT 1 
        FROM jsonb_array_elements_text(${conversations.participants}) 
        WHERE value != LOWER(value)
      )`);

    if (remainingMixedCase.length === 0) {
      console.log('✅ Verification passed! All participant addresses are now lowercase.\n');
    } else {
      console.log(`⚠️  Verification warning: ${remainingMixedCase.length} conversations still have mixed-case addresses.\n`);
      remainingMixedCase.forEach(convo => {
        console.log(`   - ${convo.id}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Migration: Normalize Participant Addresses to Lowercase');
console.log('═══════════════════════════════════════════════════════════════\n');

migrateParticipantAddresses()
  .then(() => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✅ Migration completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n═══════════════════════════════════════════════════════════════');
    console.error('  ❌ Migration failed!');
    console.error('═══════════════════════════════════════════════════════════════\n');
    process.exit(1);
  });