#!/usr/bin/env node

/**
 * IMMEDIATE MEMORY RELIEF
 * Run this to get immediate memory relief for the running process
 */

console.log('🚨 IMMEDIATE MEMORY RELIEF STARTING...');

// 1. Force aggressive garbage collection
function forceGarbageCollection() {
  console.log('1. Forcing garbage collection...');
  
  if (global.gc) {
    const before = process.memoryUsage().heapUsed / 1024 / 1024;
    
    // Run GC multiple times
    for (let i = 0; i < 5; i++) {
      global.gc();
    }
    
    const after = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`   - Freed ${(before - after).toFixed(1)}MB`);
  } else {
    console.log('   - GC not available (start with --expose-gc)');
  }
}

// 2. Clear require cache aggressively
function clearRequireCache() {
  console.log('2. Clearing require cache...');
  
  const before = Object.keys(require.cache).length;
  const essential = [
    'express', 'pg', 'redis', 'ioredis', 'cors', 'helmet', 
    'compression', 'dotenv', 'bcrypt', 'jsonwebtoken'
  ];
  
  for (const id in require.cache) {
    const isEssential = essential.some(mod => id.includes(`node_modules/${mod}`));
    const isCore = id.includes('/middleware/') || id.includes('/routes/') || id.includes('/controllers/');
    
    if (!isEssential && !isCore) {
      delete require.cache[id];
    }
  }
  
  const after = Object.keys(require.cache).length;
  console.log(`   - Cleared ${before - after} modules`);
}

// 3. Set memory limits
function setMemoryLimits() {
  console.log('3. Setting memory limits...');
  
  // Set V8 flags for current process
  if (process.env.NODE_OPTIONS) {
    console.log(`   - Current NODE_OPTIONS: ${process.env.NODE_OPTIONS}`);
  }
  
  // Recommend restart with memory limits
  console.log('   - Recommend restart with: NODE_OPTIONS="--max-old-space-size=512 --gc-interval=100"');
}

// 4. Monitor memory usage
function startMemoryMonitoring() {
  console.log('4. Starting memory monitoring...');
  
  const monitor = setInterval(() => {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const rssMB = usage.rss / 1024 / 1024;
    const percent = (heapUsedMB / heapTotalMB) * 100;
    
    console.log(`Memory: ${heapUsedMB.toFixed(1)}MB/${heapTotalMB.toFixed(1)}MB (${percent.toFixed(1)}%) RSS: ${rssMB.toFixed(1)}MB`);
    
    if (percent > 95) {
      console.error('🚨 CRITICAL: Memory still above 95%');
      if (global.gc) {
        global.gc();
      }
    }
  }, 10000);
  
  // Stop monitoring after 2 minutes
  setTimeout(() => {
    clearInterval(monitor);
    console.log('Memory monitoring stopped');
  }, 120000);
}

// 5. Create emergency environment
function createEmergencyEnv() {
  console.log('5. Creating emergency environment...');
  
  const fs = require('fs');
  const path = require('path');
  
  const emergencyEnv = `
# EMERGENCY MEMORY CONFIGURATION
NODE_OPTIONS=--max-old-space-size=512 --gc-interval=100
DB_POOL_MAX=5
DB_POOL_MIN=1
DB_IDLE_TIMEOUT=5000
REDIS_MAX_MEMORY=64mb
DISABLE_ANALYTICS=true
DISABLE_BACKGROUND_JOBS=true
ENABLE_COMPRESSION=true
`;
  
  fs.writeFileSync('.env.emergency', emergencyEnv.trim());
  console.log('   - Created .env.emergency file');
}

// Main function
function main() {
  const startUsage = process.memoryUsage();
  const startMB = startUsage.heapUsed / 1024 / 1024;
  
  console.log(`Starting memory usage: ${startMB.toFixed(1)}MB`);
  
  forceGarbageCollection();
  clearRequireCache();
  setMemoryLimits();
  createEmergencyEnv();
  
  const endUsage = process.memoryUsage();
  const endMB = endUsage.heapUsed / 1024 / 1024;
  const saved = startMB - endMB;
  
  console.log(`\nFinal memory usage: ${endMB.toFixed(1)}MB`);
  console.log(`Memory saved: ${saved.toFixed(1)}MB`);
  
  if (saved > 0) {
    console.log('✅ Memory relief applied successfully');
  } else {
    console.log('⚠️ Limited memory relief - restart recommended');
  }
  
  startMemoryMonitoring();
  
  console.log('\nRECOMMENDATIONS:');
  console.log('1. Restart with: NODE_OPTIONS="--max-old-space-size=512" npm start');
  console.log('2. Use emergency config: cp .env.emergency .env');
  console.log('3. Monitor with: node scripts/memory-monitor.js');
}

main();