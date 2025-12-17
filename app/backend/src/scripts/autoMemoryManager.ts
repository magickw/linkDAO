#!/usr/bin/env node
/**
 * Automatic Memory Manager
 * 
 * This script monitors memory usage and automatically applies optimizations
 * when memory usage exceeds thresholds.
 */

import { performance } from 'perf_hooks';

// Configuration
const MEMORY_THRESHOLD_WARNING = process.env.MEMORY_THRESHOLD_WARNING ? 
  parseInt(process.env.MEMORY_THRESHOLD_WARNING) : 80; // 80% memory usage
const MEMORY_THRESHOLD_CRITICAL = process.env.MEMORY_THRESHOLD_CRITICAL ? 
  parseInt(process.env.MEMORY_THRESHOLD_CRITICAL) : 90; // 90% memory usage
const CHECK_INTERVAL = process.env.MEMORY_CHECK_INTERVAL ? 
  parseInt(process.env.MEMORY_CHECK_INTERVAL) : 30000; // 30 seconds

console.log('🔍 Automatic Memory Manager Started');
console.log('==================================');
console.log(`Warning Threshold: ${MEMORY_THRESHOLD_WARNING}%`);
console.log(`Critical Threshold: ${MEMORY_THRESHOLD_CRITICAL}%`);
console.log(`Check Interval: ${CHECK_INTERVAL}ms`);

/**
 * Get current memory usage percentage
 */
function getMemoryUsage(): { used: number; total: number; percentage: number } {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const percentage = (heapUsedMB / heapTotalMB) * 100;
  
  return {
    used: Math.round(heapUsedMB * 100) / 100,
    total: Math.round(heapTotalMB * 100) / 100,
    percentage: Math.round(percentage * 100) / 100
  };
}

/**
 * Force garbage collection if available
 */
function forceGarbageCollection(): boolean {
  if (global.gc) {
    console.log('🗑️  Forcing garbage collection...');
    const before = getMemoryUsage();
    global.gc();
    const after = getMemoryUsage();
    
    console.log(`📊 Memory before GC: ${before.percentage}% (${before.used}MB)`);
    console.log(`📊 Memory after GC: ${after.percentage}% (${after.used}MB)`);
    console.log(`📉 Memory freed: ${Math.round((before.used - after.used) * 100) / 100}MB`);
    
    return true;
  } else {
    console.log('⚠️  Garbage collection not available (run with --expose-gc flag)');
    return false;
  }
}

/**
 * Clear Node.js module cache for non-essential modules
 */
function clearModuleCache(): void {
  console.log('🧹 Clearing Node.js module cache...');
  const beforeCount = Object.keys(require.cache).length;
  
  // Clear non-essential modules from require cache
  for (const id in require.cache) {
    // Skip core modules and essential dependencies
    const coreModules = [
      'express', 'pg', 'redis', 'ioredis', 'dotenv',
      'cors', 'helmet', 'compression', 'cookie-parser'
    ];
    
    // Clear test and development modules
    const clearablePaths = [
      '/tests/', '/__tests__/', '/test/', '/dev/', 
      '/node_modules/.cache/', '/.npm/', '/tmp/'
    ];
    
    if (clearablePaths.some(path => id.includes(path)) && 
        !coreModules.some(core => id.includes(core))) {
      try {
        delete require.cache[id];
      } catch (error) {
        // Ignore errors when clearing cache
      }
    }
  }
  
  const afterCount = Object.keys(require.cache).length;
  const cleared = beforeCount - afterCount;
  console.log(`🧹 Cleared ${cleared} modules from require cache`);
}

/**
 * Emit memory optimization events to notify other services
 */
function emitMemoryOptimizationEvent(eventType: string): void {
  console.log(`📡 Emitting memory optimization event: ${eventType}`);
  
  // Emit events that other services can listen to
  process.emit('memory:optimization', { type: eventType, timestamp: Date.now() } as any);
  
  // Specific events for different optimization types
  switch (eventType) {
    case 'warning':
      process.emit('memory:cleanup' as any);
      break;
    case 'critical':
      process.emit('memory:emergency' as any);
      break;
  }
}

/**
 * Apply memory optimization based on usage level
 */
function applyMemoryOptimization(level: 'normal' | 'warning' | 'critical'): void {
  console.log(`🔧 Applying ${level} level memory optimization...`);
  
  switch (level) {
    case 'warning':
      // Moderate optimization
      forceGarbageCollection();
      clearModuleCache();
      emitMemoryOptimizationEvent('warning');
      break;
      
    case 'critical':
      // Aggressive optimization
      // Force multiple GC passes
      for (let i = 0; i < 3; i++) {
        if (global.gc) {
          global.gc();
          // Small delay between GC passes
          const start = performance.now();
          while (performance.now() - start < 100) {
            // Busy wait to allow GC to complete
          }
        }
      }
      
      clearModuleCache();
      
      // Clear global variables that might be holding memory
      const largeGlobals = ['activeConnections', 'successfulRequests', 'cachedData', 'tempStorage'];
      let clearedCount = 0;
      
      for (const globalVar of largeGlobals) {
        // @ts-ignore
        if (global.hasOwnProperty(globalVar) && global[globalVar]) {
          try {
            // @ts-ignore
            delete global[globalVar];
            clearedCount++;
          } catch (error) {
            console.warn(`⚠️  Could not clear global variable ${globalVar}:`, error.message);
          }
        }
      }
      
      console.log(`🧹 Cleared ${clearedCount} global variables`);
      
      emitMemoryOptimizationEvent('critical');
      
      // If still critical, suggest process restart
      setTimeout(() => {
        const currentUsage = getMemoryUsage();
        if (currentUsage.percentage > MEMORY_THRESHOLD_CRITICAL) {
          console.error('🚨 MEMORY STILL CRITICAL - PROCESS RESTART RECOMMENDED');
          process.emit('memory:restart_needed' as any);
        }
      }, 5000);
      break;
      
    default:
      // Normal monitoring - just log
      console.log('✅ Memory usage is normal');
  }
}

/**
 * Check memory usage and apply optimizations if needed
 */
function checkMemoryUsage(): void {
  const memory = getMemoryUsage();
  
  console.log(`📊 Memory Usage: ${memory.percentage}% (${memory.used}MB/${memory.total}MB)`);
  
  if (memory.percentage > MEMORY_THRESHOLD_CRITICAL) {
    console.warn(`🚨 CRITICAL MEMORY USAGE: ${memory.percentage}%`);
    applyMemoryOptimization('critical');
  } else if (memory.percentage > MEMORY_THRESHOLD_WARNING) {
    console.warn(`⚠️  HIGH MEMORY USAGE: ${memory.percentage}%`);
    applyMemoryOptimization('warning');
  } else {
    applyMemoryOptimization('normal');
  }
}

/**
 * Start memory monitoring
 */
function startMonitoring(): void {
  console.log('🚀 Starting automatic memory monitoring...');
  
  // Initial check
  checkMemoryUsage();
  
  // Periodic checks
  setInterval(() => {
    checkMemoryUsage();
  }, CHECK_INTERVAL);
  
  // Also check on low memory events
  process.on('memory:low' as any, () => {
    console.log('📡 Received low memory event, checking memory usage...');
    checkMemoryUsage();
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down memory manager...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down memory manager...');
  process.exit(0);
});

// Start the memory manager
startMonitoring();