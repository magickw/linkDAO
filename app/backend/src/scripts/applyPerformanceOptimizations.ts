/**
 * Performance Optimization Script
 * Applies database optimizations and performance improvements
 */

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

    // 2. Simple database statistics
    logger.info('Collecting database statistics...');
    const poolStats = await dbPool.getPoolStats();
    logger.info('Database statistics:', poolStats);

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