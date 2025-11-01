#!/usr/bin/env node

/**
 * Script to apply performance optimizations to the database
 * Run this script after deploying to create indexes and optimize settings
 */

import { databaseOptimizationService } from '../services/databaseOptimizationService';
import { dbPool } from '../db/connectionPool';
import { logger } from '../utils/logger';

async function applyPerformanceOptimizations() {
  try {
    logger.info('Starting performance optimization application...');

    // 1. Check database connection
    const healthCheck = await dbPool.healthCheck();
    if (!healthCheck.healthy) {
      throw new Error(`Database connection failed: ${healthCheck.error}`);
    }
    logger.info('Database connection verified');

    // 2. Create optimization indexes
    logger.info('Creating performance indexes...');
    await databaseOptimizationService.createOptimizationIndexes();
    logger.info('Performance indexes created successfully');

    // 3. Optimize connection settings
    logger.info('Optimizing database connection settings...');
    await databaseOptimizationService.optimizeConnectionSettings();
    logger.info('Database connection settings optimized');

    // 4. Analyze current performance
    logger.info('Analyzing current database performance...');
    const analysis = await databaseOptimizationService.analyzeQueryPerformance();
    
    logger.info('Performance analysis results:', {
      slowQueries: analysis.slowQueries.length,
      averageExecutionTime: analysis.performanceStats.averageExecutionTime,
      totalQueries: analysis.performanceStats.totalQueries,
      indexRecommendations: analysis.indexRecommendations.length
    });

    // 5. Display recommendations
    if (analysis.indexRecommendations.length > 0) {
      logger.info('Index recommendations:');
      analysis.indexRecommendations.forEach((rec, index) => {
        logger.info(`${index + 1}. ${rec.table}.${rec.columns.join(', ')}: ${rec.reason} (Impact: ${rec.estimatedImpact})`);
      });
    }

    // 6. Get database statistics
    const dbStats = await databaseOptimizationService.getDatabaseStats();
    logger.info('Database statistics:', dbStats);

    logger.info('Performance optimizations applied successfully!');
    
  } catch (error) {
    logger.error('Failed to apply performance optimizations:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await dbPool.close();
  }
}

// Run the script if called directly
if (require.main === module) {
  applyPerformanceOptimizations()
    .then(() => {
      logger.info('Performance optimization script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Performance optimization script failed:', error);
      process.exit(1);
    });
}

export { applyPerformanceOptimizations };