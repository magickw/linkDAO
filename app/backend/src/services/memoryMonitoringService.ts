import { safeLogger } from '../utils/safeLogger';

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
}

interface MemoryThresholds {
  warning: number; // MB
  critical: number; // MB
  gc: number; // MB
}

export class MemoryMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private thresholds: MemoryThresholds;
  private isResourceConstrained: boolean;
  private lastGcTime: number = 0;
  private gcCooldown: number = 30000; // 30 seconds between GC calls

  constructor(
    thresholds: MemoryThresholds,
    isResourceConstrained: boolean = false
  ) {
    this.thresholds = thresholds;
    this.isResourceConstrained = isResourceConstrained;
    
    // Adjust GC cooldown for resource-constrained environments
    if (isResourceConstrained) {
      this.gcCooldown = 15000; // 15 seconds for constrained environments
    }
  }

  /**
   * Start memory monitoring with specified interval
   */
  public startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    safeLogger.info(`🔍 Starting memory monitoring (interval: ${intervalMs}ms)`);
    safeLogger.info(`📊 Thresholds - Warning: ${this.thresholds.warning}MB, Critical: ${this.thresholds.critical}MB, GC: ${this.thresholds.gc}MB`);

    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, intervalMs);

    // Initial check
    this.checkMemoryUsage();
  }

  /**
   * Stop memory monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      safeLogger.info('🔍 Memory monitoring stopped');
    }
  }

  /**
   * Get current memory statistics
   */
  public getMemoryStats(): MemoryStats & { thresholds: MemoryThresholds } {
    const memUsage = process.memoryUsage();
    
    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100,
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024 * 100) / 100,
      thresholds: this.thresholds
    };
  }

  /**
   * Force garbage collection if available and not in cooldown
   */
  public forceGarbageCollection(): boolean {
    const now = Date.now();
    
    if (!global.gc) {
      safeLogger.warn('⚠️ Garbage collection not available (run with --expose-gc)');
      return false;
    }

    if (now - this.lastGcTime < this.gcCooldown) {
      safeLogger.debug(`🔄 GC cooldown active (${Math.round((this.gcCooldown - (now - this.lastGcTime)) / 1000)}s remaining)`);
      return false;
    }

    const beforeStats = this.getMemoryStats();
    
    try {
      global.gc();
      this.lastGcTime = now;
      
      // Wait a moment for GC to complete, then log results
      setTimeout(() => {
        const afterStats = this.getMemoryStats();
        const freed = beforeStats.heapUsed - afterStats.heapUsed;
        
        safeLogger.info(`🗑️ Garbage collection completed - freed ${freed.toFixed(2)}MB`);
        safeLogger.debug(`📊 Memory: ${afterStats.heapUsed}MB heap / ${afterStats.rss}MB RSS`);
      }, 100);
      
      return true;
    } catch (error) {
      safeLogger.error('❌ Error during garbage collection:', error);
      return false;
    }
  }

  /**
   * Perform emergency cleanup procedures
   */
  public performEmergencyCleanup(): void {
    safeLogger.warn('🚨 Performing emergency memory cleanup');

    // Force multiple GC passes for aggressive cleanup
    if (global.gc) {
      global.gc();
      setTimeout(() => global.gc && global.gc(), 500);
      setTimeout(() => global.gc && global.gc(), 1000);
    }

    // Clear any Node.js internal caches
    if (require.cache) {
      // Don't clear core modules, just user modules
      Object.keys(require.cache).forEach(key => {
        if (key.includes('node_modules') && !key.includes('core-js')) {
          try {
            delete require.cache[key];
          } catch (error) {
            // Ignore errors when clearing cache
          }
        }
      });
    }

    safeLogger.info('✅ Emergency cleanup completed');
  }

  /**
   * Check current memory usage and take action if needed
   */
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    const { heapUsed, rss, external } = stats;

    // Log detailed stats if above 80% of warning threshold
    if (heapUsed > this.thresholds.warning * 0.8) {
      safeLogger.debug(`📊 Memory usage: ${heapUsed}MB heap / ${rss}MB RSS / ${external}MB external`);
    }

    // Warning threshold
    if (heapUsed > this.thresholds.warning) {
      safeLogger.warn(`⚠️ High memory usage: ${heapUsed}MB heap / ${rss}MB total`);
    }

    // Critical threshold - trigger garbage collection
    if (heapUsed > this.thresholds.critical) {
      safeLogger.error(`🚨 Critical memory usage: ${heapUsed}MB heap / ${rss}MB total`);
      
      if (this.isResourceConstrained) {
        this.performEmergencyCleanup();
      } else {
        this.forceGarbageCollection();
      }
    }

    // GC threshold - regular garbage collection
    if (heapUsed > this.thresholds.gc) {
      this.forceGarbageCollection();
    }

    // Process memory limit check
    if (process.env.MEMORY_LIMIT) {
      const memoryLimitMB = parseInt(process.env.MEMORY_LIMIT);
      if (rss > memoryLimitMB * 0.9) {
        safeLogger.error(`🚨 Approaching process memory limit: ${rss}MB / ${memoryLimitMB}MB`);
        
        if (this.isResourceConstrained) {
          this.performEmergencyCleanup();
        }
      }
    }
  }
}

// Factory function to create memory monitoring service based on environment
export function createMemoryMonitoringService(): MemoryMonitoringService {
  const isRenderFree = process.env.RENDER && !process.env.RENDER_PRO;
  const isRenderPro = process.env.RENDER && process.env.RENDER_PRO;
  const isRenderStandard = process.env.RENDER && process.env.RENDER_SERVICE_TYPE === 'standard';
  const isResourceConstrained = isRenderFree || (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024);

  // Set thresholds based on environment
  const thresholds: MemoryThresholds = {
    warning: isRenderFree ? 400 : 
             (isRenderStandard ? 1200 : 
             (isRenderPro ? 800 : 1200)),
    critical: isRenderFree ? 450 : 
              (isRenderStandard ? 1400 : 
              (isRenderPro ? 900 : 1400)),
    gc: isRenderFree ? 350 : 
        (isRenderStandard ? 1000 : 
        (isRenderPro ? 700 : 1000))
  };

  return new MemoryMonitoringService(thresholds, isResourceConstrained);
}

// Export singleton instance
export const memoryMonitoringService = createMemoryMonitoringService();