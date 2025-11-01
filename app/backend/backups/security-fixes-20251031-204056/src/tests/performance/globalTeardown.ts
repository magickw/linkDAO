/**
 * Global Teardown for Performance Tests
 */

import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';

export default async function globalTeardown() {
  safeLogger.info('🧹 Starting global performance test cleanup...');
  
  performance.mark('global-teardown-start');
  
  // Force garbage collection if available
  if (global.gc) {
    safeLogger.info('🗑️  Running garbage collection...');
    global.gc();
  }
  
  // Log final memory usage
  const finalMemory = process.memoryUsage();
  safeLogger.info(`📊 Final memory usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  
  // Clear performance marks and measures
  try {
    performance.clearMarks();
    performance.clearMeasures();
  } catch (error) {
    // Ignore errors if performance API doesn't support clearing
  }
  
  // Log performance summary
  const performanceEntries = performance.getEntriesByType('measure');
  if (performanceEntries.length > 0) {
    safeLogger.info('📈 Performance Summary:');
    performanceEntries.forEach(entry => {
      safeLogger.info(`  ${entry.name}: ${entry.duration.toFixed(2)}ms`);
    });
  }
  
  performance.mark('global-teardown-end');
  performance.measure('global-teardown-duration', 'global-teardown-start', 'global-teardown-end');
  
  const teardownDuration = performance.getEntriesByName('global-teardown-duration')[0].duration;
  safeLogger.info(`✅ Global teardown completed in ${teardownDuration.toFixed(2)}ms`);
}