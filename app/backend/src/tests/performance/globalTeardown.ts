/**
 * Global Teardown for Performance Tests
 */

import { performance } from 'perf_hooks';

export default async function globalTeardown() {
  console.log('🧹 Starting global performance test cleanup...');
  
  performance.mark('global-teardown-start');
  
  // Force garbage collection if available
  if (global.gc) {
    console.log('🗑️  Running garbage collection...');
    global.gc();
  }
  
  // Log final memory usage
  const finalMemory = process.memoryUsage();
  console.log(`📊 Final memory usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  
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
    console.log('📈 Performance Summary:');
    performanceEntries.forEach(entry => {
      console.log(`  ${entry.name}: ${entry.duration.toFixed(2)}ms`);
    });
  }
  
  performance.mark('global-teardown-end');
  performance.measure('global-teardown-duration', 'global-teardown-start', 'global-teardown-end');
  
  const teardownDuration = performance.getEntriesByName('global-teardown-duration')[0].duration;
  console.log(`✅ Global teardown completed in ${teardownDuration.toFixed(2)}ms`);
}