import { Pool, PoolClient } from 'pg';

export class OptimizedDatabaseManager {
  private pool: Pool;
  private activeConnections = new Map<string, { client: PoolClient, timestamp: number }>();
  private connectionTimeout = 30000; // 30 seconds
  private maxConnections = 50; // Reduced from 100
  private idleTimeout = 10000; // 10 seconds

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: this.maxConnections,
      min: 2, // Minimum connections
      idleTimeoutMillis: this.idleTimeout,
      connectionTimeoutMillis: 5000, // 5 second connection timeout
      // acquireTimeoutMillis: 10000, // 10 second acquire timeout (not supported in this version)
      
      // Connection lifecycle management
      allowExitOnIdle: true,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
      
      // Statement timeout to prevent long-running queries
      statement_timeout: 30000, // 30 seconds
      query_timeout: 25000, // 25 seconds
      
      // Connection validation
      application_name: 'linkdao_optimized',
      
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    this.setupConnectionMonitoring();
    this.setupPeriodicCleanup();
  }

  // Get connection with automatic cleanup
  async getConnection(): Promise<PoolClient> {
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const client = await this.pool.connect();
      
      // Track connection
      this.activeConnections.set(connectionId, {
        client,
        timestamp: Date.now()
      });

      // Auto-release after timeout
      setTimeout(() => {
        this.releaseConnection(connectionId);
      }, this.connectionTimeout);

      return client;
    } catch (error) {
      console.error('Failed to get database connection:', error);
      throw new Error('Database connection unavailable');
    }
  }

  // Release connection
  releaseConnection(connectionId: string) {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      try {
        connection.client.release();
        this.activeConnections.delete(connectionId);
      } catch (error) {
        console.error('Error releasing connection:', error);
      }
    }
  }

  // Execute query with automatic connection management
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getConnection();
    const connectionId = Array.from(this.activeConnections.entries())
      .find(([_, conn]) => conn.client === client)?.[0];

    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      if (connectionId) {
        this.releaseConnection(connectionId);
      }
    }
  }

  // Set up connection monitoring
  private setupConnectionMonitoring() {
    setInterval(() => {
      const totalConnections = this.pool.totalCount;
      const idleConnections = this.pool.idleCount;
      const waitingCount = this.pool.waitingCount;
      
      console.log(`DB Pool Status: Total=${totalConnections}, Idle=${idleConnections}, Waiting=${waitingCount}`);
      
      // Alert if connections are high
      if (totalConnections > this.maxConnections * 0.8) {
        console.warn(`🚨 High DB connection usage: ${totalConnections}/${this.maxConnections}`);
        this.forceCleanupConnections();
      }
    }, 30000); // Every 30 seconds
  }

  // Periodic cleanup of stale connections
  private setupPeriodicCleanup() {
    setInterval(() => {
      const now = Date.now();
      const staleConnections: string[] = [];

      for (const [id, connection] of this.activeConnections.entries()) {
        if (now - connection.timestamp > this.connectionTimeout) {
          staleConnections.push(id);
        }
      }

      // Clean up stale connections
      staleConnections.forEach(id => {
        console.log(`Cleaning up stale connection: ${id}`);
        this.releaseConnection(id);
      });

      if (staleConnections.length > 0) {
        console.log(`Cleaned up ${staleConnections.length} stale connections`);
      }
    }, 15000); // Every 15 seconds
  }

  // Force cleanup when connections are high
  private async forceCleanupConnections() {
    try {
      // End idle connections in PostgreSQL
      await this.pool.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE state = 'idle' 
        AND query_start < NOW() - INTERVAL '30 seconds'
        AND application_name = 'linkdao_optimized'
      `);

      // Force release all tracked connections older than 15 seconds
      const now = Date.now();
      const connectionsToRelease: string[] = [];

      for (const [id, connection] of this.activeConnections.entries()) {
        if (now - connection.timestamp > 15000) {
          connectionsToRelease.push(id);
        }
      }

      connectionsToRelease.forEach(id => this.releaseConnection(id));
      
      console.log(`Force cleaned ${connectionsToRelease.length} connections`);
    } catch (error) {
      console.error('Error in force cleanup:', error);
    }
  }

  // Get pool statistics
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      activeTracked: this.activeConnections.size,
      maxConnections: this.maxConnections
    };
  }

  // Emergency shutdown
  async emergencyShutdown() {
    console.log('🚨 Emergency database shutdown initiated...');
    
    // Release all tracked connections
    for (const [id] of this.activeConnections.entries()) {
      this.releaseConnection(id);
    }

    // End the pool
    await this.pool.end();
    console.log('✅ Database pool shutdown complete');
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; stats: any; message?: string }> {
    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const responseTime = Date.now() - start;
      
      const stats = this.getPoolStats();
      
      const healthy = stats.totalCount < this.maxConnections * 0.9 && responseTime < 1000;
      
      return {
        healthy,
        stats: {
          ...stats,
          responseTime
        },
        message: healthy ? 'Database healthy' : 'Database under stress'
      };
    } catch (error) {
      return {
        healthy: false,
        stats: this.getPoolStats(),
        message: `Database error: ${error.message}`
      };
    }
  }
}

// Export singleton instance
export const optimizedDb = new OptimizedDatabaseManager();