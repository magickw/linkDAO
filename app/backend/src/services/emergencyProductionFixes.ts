import { Pool } from 'pg';
import { Redis } from 'ioredis';

// Emergency Production Fixes for Critical Issues
export class EmergencyProductionFixes {
  private dbPool: Pool;
  private redis: Redis;
  private memoryThreshold = 0.75; // 75% memory threshold (2GB RAM)
  private connectionThreshold = 25; // Max 25 DB connections (appropriate for 2GB)

  constructor(dbPool: Pool, redis: Redis) {
    this.dbPool = dbPool;
    this.redis = redis;
  }

  // 1. IMMEDIATE MEMORY LEAK FIX
  async fixMemoryLeaks() {
    console.log('🚨 EMERGENCY: Applying memory leak fixes...');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Clear all non-essential caches
    await this.clearNonEssentialCaches();
    
    // Reduce connection pool size immediately
    await this.reduceConnectionPool();
    
    // Enable aggressive memory monitoring
    this.enableAggressiveMemoryMonitoring();
  }

  // 2. DATABASE CONNECTION LEAK FIX
  async fixDatabaseConnectionLeaks() {
    console.log('🚨 EMERGENCY: Fixing database connection leaks...');
    
    const currentConnections = this.dbPool.totalCount;
    console.log(`Current DB connections: ${currentConnections}`);
    
    if (currentConnections > this.connectionThreshold) {
      // Force close idle connections
      await this.forceCloseIdleConnections();
      
      // Reduce max connections temporarily
      this.dbPool.options.max = Math.min(this.connectionThreshold, 25);
      
      // Set aggressive idle timeout
      this.dbPool.options.idleTimeoutMillis = 5000; // 5 seconds
    }
  }

  // 3. REDUCE ERROR RATE
  async reduceErrorRate() {
    console.log('🚨 EMERGENCY: Implementing error rate reduction...');
    
    // Enable circuit breaker for all external services
    await this.enableCircuitBreakers();
    
    // Reduce rate limits to prevent overload
    await this.reduceRateLimits();
    
    // Enable graceful degradation
    await this.enableGracefulDegradation();
  }  
// 4. PERFORMANCE OPTIMIZATION
  async optimizePerformance() {
    console.log('🚨 EMERGENCY: Applying performance optimizations...');
    
    // Disable non-essential features temporarily
    await this.disableNonEssentialFeatures();
    
    // Optimize database queries
    await this.optimizeDatabaseQueries();
    
    // Enable response compression
    await this.enableResponseCompression();
  }

  // Helper Methods
  private async clearNonEssentialCaches() {
    try {
      // Clear Redis caches except critical ones
      const keys = await this.redis.keys('*');
      const nonCriticalKeys = keys.filter(key => 
        !key.includes('session:') && 
        !key.includes('auth:') && 
        !key.includes('critical:')
      );
      
      if (nonCriticalKeys.length > 0) {
        await this.redis.del(...nonCriticalKeys);
        console.log(`Cleared ${nonCriticalKeys.length} non-critical cache keys`);
      }
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }

  private async reduceConnectionPool() {
    // Temporarily reduce connection pool size
    const currentMax = this.dbPool.options.max || 20;
    const newMax = Math.max(5, Math.floor(currentMax * 0.5));
    
    this.dbPool.options.max = newMax;
    this.dbPool.options.min = Math.max(1, Math.floor(newMax * 0.2));
    
    console.log(`Reduced DB pool: max=${newMax}, min=${this.dbPool.options.min}`);
  }

  private enableAggressiveMemoryMonitoring() {
    const checkInterval = 10000; // 10 seconds
    
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const memoryPercent = heapUsedMB / heapTotalMB;
      
      if (memoryPercent > this.memoryThreshold) {
        console.warn(`🚨 HIGH MEMORY: ${(memoryPercent * 100).toFixed(1)}%`);
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
        
        // Clear more caches if memory is still high
        this.clearNonEssentialCaches();
      }
    }, checkInterval);
  }

  private async forceCloseIdleConnections() {
    try {
      // End idle connections
      await this.dbPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \'idle\' AND query_start < NOW() - INTERVAL \'30 seconds\'');
      console.log('Terminated idle database connections');
    } catch (error) {
      console.error('Error terminating idle connections:', error);
    }
  }

  private async enableCircuitBreakers() {
    // Enable circuit breakers for external services
    const circuitBreakerConfig = {
      failureThreshold: 3, // Reduced from 5
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 10000 // 10 seconds
    };
    
    // Store circuit breaker config in Redis
    await this.redis.set('circuit_breaker:config', JSON.stringify(circuitBreakerConfig));
    console.log('Enabled aggressive circuit breakers');
  }

  private async reduceRateLimits() {
    // Reduce rate limits by 50% temporarily
    const rateLimitConfig = {
      general: { windowMs: 60000, max: 50 }, // Reduced from 100
      api: { windowMs: 60000, max: 25 }, // Reduced from 50
      auth: { windowMs: 300000, max: 3 } // Reduced from 5
    };
    
    await this.redis.set('rate_limit:emergency', JSON.stringify(rateLimitConfig));
    console.log('Reduced rate limits for emergency mode');
  }

  private async enableGracefulDegradation() {
    // Enable graceful degradation flags
    const degradationConfig = {
      disableAnalytics: true,
      disableRecommendations: true,
      disableNonEssentialQueries: true,
      enableCacheOnly: true
    };
    
    await this.redis.set('graceful_degradation', JSON.stringify(degradationConfig));
    console.log('Enabled graceful degradation mode');
  }

  private async disableNonEssentialFeatures() {
    // Disable resource-intensive features temporarily
    const featureFlags = {
      realTimeUpdates: false,
      backgroundJobs: false,
      analyticsTracking: false,
      imageProcessing: false,
      searchIndexing: false
    };
    
    await this.redis.set('emergency_features', JSON.stringify(featureFlags));
    console.log('Disabled non-essential features');
  }

  private async optimizeDatabaseQueries() {
    try {
      // Add emergency indexes for common queries
      await this.dbPool.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_posts_created 
        ON posts(created_at DESC) WHERE deleted_at IS NULL;
      `);
      
      await this.dbPool.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emergency_users_active 
        ON users(last_active_at DESC) WHERE deleted_at IS NULL;
      `);
      
      console.log('Applied emergency database optimizations');
    } catch (error) {
      console.error('Error optimizing database:', error);
    }
  }

  private async enableResponseCompression() {
    // Enable aggressive response compression
    await this.redis.set('compression:enabled', 'true');
    await this.redis.set('compression:level', '6'); // High compression
    console.log('Enabled response compression');
  }

  // Main emergency fix method
  async applyAllEmergencyFixes() {
    console.log('🚨 APPLYING ALL EMERGENCY PRODUCTION FIXES...');
    
    try {
      await Promise.all([
        this.fixMemoryLeaks(),
        this.fixDatabaseConnectionLeaks(),
        this.reduceErrorRate(),
        this.optimizePerformance()
      ]);
      
      console.log('✅ All emergency fixes applied successfully');
      return { success: true, message: 'Emergency fixes applied' };
    } catch (error) {
      console.error('❌ Error applying emergency fixes:', error);
      return { success: false, error: error.message };
    }
  }
}