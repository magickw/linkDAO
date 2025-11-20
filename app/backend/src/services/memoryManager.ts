export class MemoryManager {
  private memoryThreshold = 0.75; // 75% threshold (more conservative with 2GB)
  private criticalThreshold = 0.90; // 90% critical (safer margin)
  private checkInterval = 5000; // 5 seconds
  private isMonitoring = false;
  private memoryHistory: number[] = [];
  private maxHistorySize = 20;
  private isMemoryCritical: boolean; // New field

  constructor() {
    // Check if we're in a memory-critical environment
    this.isMemoryCritical = process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512;
    
    // Adjust thresholds for memory-critical environments
    if (this.isMemoryCritical) {
      this.memoryThreshold = 0.60; // 60% for critical environments
      this.criticalThreshold = 0.75; // 75% for critical environments
      this.checkInterval = 3000; // Check more frequently
    }
    
    this.startMonitoring();
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Memory monitoring started', {
      memoryThreshold: `${(this.memoryThreshold * 100).toFixed(1)}%`,
      criticalThreshold: `${(this.criticalThreshold * 100).toFixed(1)}%`,
      checkInterval: `${this.checkInterval}ms`,
      isMemoryCritical: this.isMemoryCritical
    });

    setInterval(() => {
      this.checkMemoryUsage();
    }, this.checkInterval);
  }

  private checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const rssMB = memUsage.rss / 1024 / 1024;
    const externalMB = memUsage.external / 1024 / 1024;
    
    const memoryPercent = heapUsedMB / heapTotalMB;
    
    // Track memory history
    this.memoryHistory.push(memoryPercent);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Log memory stats every minute
    if (Date.now() % 60000 < this.checkInterval) {
      console.log(`Memory: ${heapUsedMB.toFixed(1)}MB/${heapTotalMB.toFixed(1)}MB (${(memoryPercent * 100).toFixed(1)}%) RSS: ${rssMB.toFixed(1)}MB`);
    }

    // Critical memory usage
    if (memoryPercent > this.criticalThreshold) {
      console.error(`🚨 CRITICAL MEMORY: ${(memoryPercent * 100).toFixed(1)}%`);
      this.emergencyMemoryCleanup();
    }
    // High memory usage
    else if (memoryPercent > this.memoryThreshold) {
      console.warn(`⚠️ HIGH MEMORY: ${(memoryPercent * 100).toFixed(1)}%`);
      this.performMemoryCleanup();
    }
  }

  private performMemoryCleanup() {
    console.log('🧹 Performing memory cleanup...');
    
    // Force garbage collection if available
    if (global.gc) {
      const beforeGC = process.memoryUsage().heapUsed / 1024 / 1024;
      global.gc();
      const afterGC = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`GC freed ${(beforeGC - afterGC).toFixed(1)}MB`);
    }

    // Clear require cache for non-essential modules
    this.clearRequireCache();
    
    // Suggest cache clearing to other services
    process.emit('memory:cleanup' as any);
  }

  private emergencyMemoryCleanup() {
    console.log('🚨 EMERGENCY MEMORY CLEANUP...');
    
    // Aggressive garbage collection
    if (global.gc) {
      for (let i = 0; i < 3; i++) {
        global.gc();
      }
    }

    // Clear all possible caches
    this.clearRequireCache(true);
    
    // Emit emergency cleanup signal
    process.emit('memory:emergency' as any);
    
    // If still critical, suggest process restart
    setTimeout(() => {
      const currentUsage = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
      if (currentUsage > this.criticalThreshold) {
        console.error('🚨 MEMORY STILL CRITICAL - PROCESS RESTART RECOMMENDED');
        process.emit('memory:restart_needed' as any);
      }
    }, 10000);
  }  
  
  private clearRequireCache(aggressive = false) {
    const beforeCount = Object.keys(require.cache).length;
    
    // Clear non-essential modules from require cache
    for (const id in require.cache) {
      // Skip core modules and essential dependencies
      if (this.shouldClearModule(id, aggressive)) {
        delete require.cache[id];
      }
    }
    
    const afterCount = Object.keys(require.cache).length;
    const cleared = beforeCount - afterCount;
    
    if (cleared > 0) {
      console.log(`Cleared ${cleared} modules from require cache`);
    }
  }

  private shouldClearModule(moduleId: string, aggressive: boolean): boolean {
    // Never clear core modules
    const coreModules = [
      'express', 'pg', 'redis', 'ioredis', 'dotenv',
      'cors', 'helmet', 'compression', 'cookie-parser'
    ];
    
    if (coreModules.some(core => moduleId.includes(core))) {
      return false;
    }

    // In aggressive mode, clear more modules
    if (aggressive) {
      const essentialPaths = ['/middleware/', '/routes/', '/controllers/'];
      return !essentialPaths.some(path => moduleId.includes(path));
    }

    // Normal mode - only clear test and development modules
    const clearablePaths = ['/tests/', '/__tests__/', '/test/', '/dev/', '/node_modules/.cache/'];
    return clearablePaths.some(path => moduleId.includes(path));
  }

  // Get memory statistics
  getMemoryStats() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const memoryPercent = heapUsedMB / heapTotalMB;
    
    // Calculate trend
    const recentHistory = this.memoryHistory.slice(-5);
    const trend = recentHistory.length > 1 
      ? recentHistory[recentHistory.length - 1] - recentHistory[0]
      : 0;

    return {
      heapUsedMB: Math.round(heapUsedMB * 100) / 100,
      heapTotalMB: Math.round(heapTotalMB * 100) / 100,
      rssMB: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
      externalMB: Math.round((memUsage.external / 1024 / 1024) * 100) / 100,
      memoryPercent: Math.round(memoryPercent * 10000) / 100,
      trend: Math.round(trend * 10000) / 100,
      status: this.getMemoryStatus(memoryPercent),
      history: [...this.memoryHistory],
      isMemoryCritical: this.isMemoryCritical
    };
  }

  private getMemoryStatus(memoryPercent: number): string {
    if (memoryPercent > this.criticalThreshold) return 'critical';
    if (memoryPercent > this.memoryThreshold) return 'high';
    if (memoryPercent > 0.7) return 'moderate';
    return 'normal';
  }

  // Force memory cleanup
  forceCleanup() {
    console.log('🧹 Forcing memory cleanup...');
    this.performMemoryCleanup();
    return this.getMemoryStats();
  }

  // Set memory thresholds
  setThresholds(normal: number, critical: number) {
    this.memoryThreshold = Math.max(0.5, Math.min(0.95, normal));
    this.criticalThreshold = Math.max(this.memoryThreshold + 0.05, Math.min(0.98, critical));
    console.log(`Memory thresholds updated: ${this.memoryThreshold * 100}% / ${this.criticalThreshold * 100}%`);
  }

  // Stop monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Memory monitoring stopped');
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();