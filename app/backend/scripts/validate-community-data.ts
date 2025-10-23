#!/usr/bin/env ts-node
/**
 * Community Data Validation Script
 * Validates that all community data is production-ready and contains no mock data
 */

import { db } from '../src/db';
import { communities, posts, users, communityMembers } from '../src/db/schema';
import { eq, and, isNull, like, or, count } from 'drizzle-orm';

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  stats: {
    totalCommunities: number;
    activeCommunities: number;
    totalMembers: number;
    totalPosts: number;
  };
}

async function validateCommunityData(): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    issues: [],
    warnings: [],
    stats: {
      totalCommunities: 0,
      activeCommunities: 0,
      totalMembers: 0,
      totalPosts: 0
    }
  };

  console.log('🔍 Validating community data for production readiness...');

  try {
    // Check for test/mock data patterns in community names and descriptions
    const testCommunities = await db
      .select()
      .from(communities)
      .where(
        or(
          like(communities.name, '%test%'),
          like(communities.name, '%mock%'),
          like(communities.name, '%sample%'),
          like(communities.name, '%demo%'),
          like(communities.displayName, '%test%'),
          like(communities.displayName, '%mock%'),
          like(communities.displayName, '%sample%'),
          like(communities.displayName, '%demo%'),
          like(communities.description, '%test%'),
          like(communities.description, '%mock%'),
          like(communities.description, '%sample%'),
          like(communities.description, '%demo%'),
          like(communities.description, '%Lorem ipsum%'),
          like(communities.description, '%placeholder%')
        )
      );

    if (testCommunities.length > 0) {
      result.isValid = false;
      result.issues.push(`Found ${testCommunities.length} communities with test/mock data patterns`);
      testCommunities.forEach(community => {
        result.issues.push(`- Community "${community.displayName}" (${community.name}) contains test data patterns`);
      });
    }

    // Check for missing required data
    const incompleteCommunities = await db
      .select()
      .from(communities)
      .where(
        or(
          isNull(communities.name),
          isNull(communities.displayName),
          isNull(communities.description),
          eq(communities.description, ''),
          eq(communities.displayName, '')
        )
      );

    if (incompleteCommunities.length > 0) {
      result.isValid = false;
      result.issues.push(`Found ${incompleteCommunities.length} communities with missing required data`);
      incompleteCommunities.forEach(community => {
        result.issues.push(`- Community ID ${community.id} is missing required fields`);
      });
    }

    // Check for placeholder images
    const placeholderImages = await db
      .select()
      .from(communities)
      .where(
        or(
          like(communities.banner, '%placeholder%'),
          like(communities.banner, '%example.com%'),
          like(communities.banner, '%test%'),
          like(communities.avatar, '%placeholder%'),
          like(communities.avatar, '%example.com%'),
          like(communities.avatar, '%test%')
        )
      );

    if (placeholderImages.length > 0) {
      result.warnings.push(`Found ${placeholderImages.length} communities with placeholder images`);
      placeholderImages.forEach(community => {
        result.warnings.push(`- Community "${community.displayName}" has placeholder images`);
      });
    }

    // Check for suspicious user data patterns
    const testUsers = await db
      .select()
      .from(users)
      .where(
        or(
          like(users.handle, '%test%'),
          like(users.handle, '%mock%'),
          like(users.handle, '%sample%'),
          like(users.ensName, '%test%'),
          like(users.ensName, '%mock%'),
          like(users.ensName, '%sample%')
        )
      );

    if (testUsers.length > 0) {
      result.warnings.push(`Found ${testUsers.length} users with test data patterns`);
    }

    // Check for posts with test content
    const testPosts = await db
      .select()
      .from(posts)
      .where(
        or(
          like(posts.title, '%test%'),
          like(posts.title, '%mock%'),
          like(posts.title, '%sample%'),
          like(posts.contentCid, '%test%'),
          like(posts.contentCid, '%mock%'),
          like(posts.contentCid, '%Lorem ipsum%')
        )
      );

    if (testPosts.length > 0) {
      result.warnings.push(`Found ${testPosts.length} posts with test content patterns`);
    }

    // Gather statistics
    const totalCommunitiesResult = await db.select({ count: count() }).from(communities);
    result.stats.totalCommunities = totalCommunitiesResult[0]?.count || 0;

    const activeCommunitiesResult = await db
      .select({ count: count() })
      .from(communities)
      .where(eq(communities.isPublic, true));
    result.stats.activeCommunities = activeCommunitiesResult[0]?.count || 0;

    const totalMembersResult = await db.select({ count: count() }).from(communityMembers);
    result.stats.totalMembers = totalMembersResult[0]?.count || 0;

    const totalPostsResult = await db.select({ count: count() }).from(posts);
    result.stats.totalPosts = totalPostsResult[0]?.count || 0;

    // Check for communities with no members (suspicious)
    const communitiesWithoutMembers = await db
      .select()
      .from(communities)
      .where(eq(communities.memberCount, 0));

    if (communitiesWithoutMembers.length > 0) {
      result.warnings.push(`Found ${communitiesWithoutMembers.length} communities with no members`);
    }

    // Display results
    console.log('\n📊 Community Data Statistics:');
    console.log(`   Total communities: ${result.stats.totalCommunities}`);
    console.log(`   Active (public) communities: ${result.stats.activeCommunities}`);
    console.log(`   Total community members: ${result.stats.totalMembers}`);
    console.log(`   Total posts: ${result.stats.totalPosts}`);

    if (result.isValid) {
      console.log('\n✅ All community data is production-ready');
    } else {
      console.log('\n❌ Community data validation failed');
      console.log('\n🚨 Critical Issues:');
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (result.isValid && result.warnings.length === 0) {
      console.log('\n🎉 Community data is fully validated and production-ready!');
    }

  } catch (error) {
    console.error('❌ Error during validation:', error);
    result.isValid = false;
    result.issues.push(`Validation error: ${error.message}`);
  }

  return result;
}

// Data cleanup functions
async function cleanupTestData(): Promise<void> {
  console.log('\n🧹 Starting test data cleanup...');

  try {
    // Remove communities with test patterns
    const testCommunities = await db
      .select({ id: communities.id })
      .from(communities)
      .where(
        or(
          like(communities.name, '%test%'),
          like(communities.name, '%mock%'),
          like(communities.name, '%sample%'),
          like(communities.description, '%Lorem ipsum%'),
          like(communities.description, '%placeholder%')
        )
      );

    if (testCommunities.length > 0) {
      console.log(`🗑️  Removing ${testCommunities.length} test communities...`);
      for (const community of testCommunities) {
        // Remove associated posts first (cascade should handle this, but being explicit)
        await db.delete(posts).where(eq(posts.communityId, community.id));
        // Remove community members
        await db.delete(communityMembers).where(eq(communityMembers.communityId, community.id));
        // Remove community
        await db.delete(communities).where(eq(communities.id, community.id));
      }
      console.log('✅ Test communities removed');
    }

    // Update placeholder content
    const communitiesWithPlaceholders = await db
      .select()
      .from(communities)
      .where(
        or(
          like(communities.description, '%placeholder%'),
          like(communities.description, '%Lorem ipsum%')
        )
      );

    if (communitiesWithPlaceholders.length > 0) {
      console.log(`📝 Updating ${communitiesWithPlaceholders.length} communities with placeholder content...`);
      for (const community of communitiesWithPlaceholders) {
        await db
          .update(communities)
          .set({
            description: 'A decentralized community for Web3 enthusiasts and builders.',
            updatedAt: new Date()
          })
          .where(eq(communities.id, community.id));
      }
      console.log('✅ Placeholder content updated');
    }

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes('--cleanup') || args.includes('-c');

  try {
    const result = await validateCommunityData();

    if (shouldCleanup && (!result.isValid || result.warnings.length > 0)) {
      console.log('\n🔧 Cleanup requested...');
      await cleanupTestData();
      
      // Re-validate after cleanup
      console.log('\n🔍 Re-validating after cleanup...');
      const revalidationResult = await validateCommunityData();
      process.exit(revalidationResult.isValid ? 0 : 1);
    } else {
      process.exit(result.isValid ? 0 : 1);
    }
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { validateCommunityData, cleanupTestData };