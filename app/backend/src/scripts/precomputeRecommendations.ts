#!/usr/bin/env node
/**
 * Script to precompute recommendations for active users
 * This script should be run periodically (e.g., daily) to keep recommendations fresh
 */

import { DatabaseService } from '../services/databaseService';
import { safeLogger } from '../utils/safeLogger';
import { RecommendationService } from '../services/recommendationService';
import { users, communityMembers } from '../db/schema';
import { gt } from 'drizzle-orm';

async function precomputeRecommendations() {
  safeLogger.info('Starting recommendation precomputation...');
  
  try {
    const databaseService = new DatabaseService();
    const recommendationService = new RecommendationService();
    const db = databaseService.getDatabase();
    
    // Get active users (users who have been active in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsers = await db
      .select({
        id: users.id,
        walletAddress: users.walletAddress,
      })
      .from(users)
      .where(gt(users.createdAt, thirtyDaysAgo));
    
    safeLogger.info(`Found ${activeUsers.length} active users`);
    
    // Precompute recommendations for each active user
    let processedCount = 0;
    const errors: string[] = [];
    
    for (const user of activeUsers) {
      try {
        safeLogger.info(`Precomputing recommendations for user ${user.walletAddress}...`);
        
        // Precompute both community and user recommendations
        await Promise.all([
          recommendationService.precomputeCommunityRecommendations(user.id),
          recommendationService.precomputeUserRecommendations(user.id)
        ]);
        
        processedCount++;
        
        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        safeLogger.error(`Error precomputing recommendations for user ${user.walletAddress}:`, error);
        errors.push(`User ${user.walletAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    safeLogger.info(`Successfully precomputed recommendations for ${processedCount} users`);
    
    if (errors.length > 0) {
      safeLogger.info(`Errors encountered: ${errors.length}`);
      errors.forEach(error => safeLogger.error(error));
    }
    
    safeLogger.info('Recommendation precomputation completed');
    process.exit(0);
  } catch (error) {
    safeLogger.error('Fatal error during recommendation precomputation:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  precomputeRecommendations();
}

export default precomputeRecommendations;
