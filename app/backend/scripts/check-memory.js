#!/usr/bin/env node

/**
 * Memory Check Script
 * Checks available memory and system resources
 */

function formatBytes(bytes) {
  return Math.round(bytes / 1024 / 1024) + ' MB';
}

function checkMemory() {
  console.log('🔍 Memory Check Report');
  console.log('='.repeat(50));
  
  // Process memory usage
  const memUsage = process.memoryUsage();
  console.log('📊 Process Memory Usage:');
  console.log(`  RSS (Resident Set Size): ${formatBytes(memUsage.rss)}`);
  console.log(`  Heap Used: ${formatBytes(memUsage.heapUsed)}`);
  console.log(`  Heap Total: ${formatBytes(memUsage.heapTotal)}`);
  console.log(`  External: ${formatBytes(memUsage.external)}`);
  console.log(`  Array Buffers: ${formatBytes(memUsage.arrayBuffers)}`);
  
  // System info
  console.log('\n🖥️  System Information:');
  console.log(`  Node.js Version: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Architecture: ${process.arch}`);
  console.log(`  CPU Count: ${require('os').cpus().length}`);
  
  // System memory (if available)
  try {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    console.log(`  Total System Memory: ${formatBytes(totalMem)}`);
    console.log(`  Free System Memory: ${formatBytes(freeMem)}`);
    console.log(`  Used System Memory: ${formatBytes(usedMem)}`);
    console.log(`  Memory Usage: ${Math.round((usedMem / totalMem) * 100)}%`);
  } catch (error) {
    console.log('  System memory info not available');
  }
  
  // Environment variables
  console.log('\n🌍 Environment:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`  PORT: ${process.env.PORT || 'not set'}`);
  console.log(`  Max Old Space Size: ${process.execArgv.find(arg => arg.includes('max-old-space-size')) || 'default'}`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  
  if (heapUsedMB > 800) {
    console.log('  ⚠️  High memory usage detected');
    console.log('  - Consider increasing --max-old-space-size');
    console.log('  - Review code for memory leaks');
    console.log('  - Enable garbage collection monitoring');
  } else if (heapUsedMB > 500) {
    console.log('  ⚡ Moderate memory usage');
    console.log('  - Monitor memory growth over time');
    console.log('  - Consider memory optimization');
  } else {
    console.log('  ✅ Memory usage looks healthy');
  }
  
  console.log('\n' + '='.repeat(50));
}

// Run the check
checkMemory();

// If running as main script, exit
if (require.main === module) {
  process.exit(0);
}

module.exports = { checkMemory, formatBytes };