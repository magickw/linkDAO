import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

interface ConnectionPoolConfig {
  max?: number;
  idle_timeout?: number;
  connect_timeout?: number;
  prepare?: boolean;
  debug?: boolean;
}

export class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool;
  private sql: postgres.Sql;
  private config: ConnectionPoolConfig = {};

  private constructor() {
    const connectionString = process.env.DATABASE_URL;

    // If no database URL is provided, create a mock connection
    if (!connectionString) {
      console.warn('No DATABASE_URL provided. Database operations will be disabled.');
      this.sql = this.createMockConnection();
      return;
    }

    this.config = {
      max: parseInt(process.env.DB_POOL_MAX || '25'), // Increased maximum connections
      idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || '60'), // Increased idle timeout
      connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '15'), // Increased connect timeout
      prepare: false, // Disable prepared statements for better compatibility
      debug: process.env.NODE_ENV === 'development',
      // Performance optimizations
      max_lifetime: parseInt(process.env.DB_MAX_LIFETIME || '3600'), // 1 hour connection lifetime
      transform: {
        undefined: null,
        column: {
          from: (column: any) => column,
          to: (column: any) => column
        }
      },
      // Connection pool optimizations
      connection: {
        application_name: 'marketplace-api',
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'), // 30 seconds
        idle_in_transaction_session_timeout: parseInt(process.env.DB_IDLE_TRANSACTION_TIMEOUT || '10000'), // 10 seconds
      }
    };

    try {
      this.sql = postgres(connectionString, {
        ...this.config,
        onnotice: this.config.debug ? console.log : undefined,
        transform: {
          undefined: null
        }
      });

      // Handle connection events
      this.sql.listen('*', (row) => {
        if (this.config.debug) {
          console.log('Database notification:', row);
        }
      }).catch((error) => {
        console.warn('Database listen failed:', error.message);
      });
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      this.sql = this.createMockConnection();
    }
  }

  private createMockConnection(): postgres.Sql {
    const mockSql = (() => {
      throw new Error('Database not available. Please configure DATABASE_URL environment variable.');
    }) as any;
    
    // Add common methods that might be called
    mockSql.begin = () => Promise.reject(new Error('Database not available'));
    mockSql.end = () => Promise.resolve();
    mockSql.listen = () => Promise.reject(new Error('Database not available'));
    
    return mockSql;
  }

  public static getInstance(): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      DatabaseConnectionPool.instance = new DatabaseConnectionPool();
    }
    return DatabaseConnectionPool.instance;
  }

  public getConnection(): postgres.Sql {
    return this.sql;
  }

  // Connection health check
  public async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.sql`SELECT 1 as health_check`;
      const latency = Date.now() - start;
      
      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get connection pool statistics
  public async getPoolStats(): Promise<{
    totalConnections: number;
    idleConnections: number;
    activeConnections: number;
  }> {
    try {
      // Query PostgreSQL system tables for connection info
      const stats = await this.sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      return {
        totalConnections: parseInt(stats[0]?.total_connections || '0'),
        idleConnections: parseInt(stats[0]?.idle_connections || '0'),
        activeConnections: parseInt(stats[0]?.active_connections || '0')
      };
    } catch (error) {
      console.error('Error getting pool stats:', error);
      return {
        totalConnections: 0,
        idleConnections: 0,
        activeConnections: 0
      };
    }
  }

  // Transaction wrapper with automatic retry
  public async withTransaction<T>(
    callback: (sql: postgres.Sql) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sql.begin(callback);
        return result as T;
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (this.isRetryableError(error) && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError!;
  }

  // Check if an error is retryable
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const retryableCodes = [
      '40001', // serialization_failure
      '40P01', // deadlock_detected
      '53300', // too_many_connections
      '08006', // connection_failure
      '08001', // sqlclient_unable_to_establish_sqlconnection
      '08004', // sqlserver_rejected_establishment_of_sqlconnection
    ];
    
    return retryableCodes.includes((error as any).code) || 
           error.message?.includes('connection') ||
           error.message?.includes('timeout');
  }

  // Graceful shutdown
  public async close(): Promise<void> {
    try {
      await this.sql.end();
      console.log('Database connection pool closed gracefully');
    } catch (error) {
      console.error('Error closing database connection pool:', error);
    }
  }

  // Query optimization helpers
  public async explainQuery(query: string, params?: any[]): Promise<any[]> {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Query explanation only available in development mode');
    }
    
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await this.sql.unsafe(explainQuery, params);
      return result;
    } catch (error) {
      console.error('Error explaining query:', error);
      throw error;
    }
  }

  // Connection monitoring
  public startMonitoring(intervalMs: number = 30000): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        const health = await this.healthCheck();
        const stats = await this.getPoolStats();
        
        if (this.config.debug) {
          console.log('DB Pool Status:', {
            healthy: health.healthy,
            latency: health.latency,
            ...stats,
            timestamp: new Date().toISOString()
          });
        }
        
        // Alert if unhealthy or too many connections
        if (!health.healthy) {
          console.error('Database health check failed:', health.error);
        }
        
        if (stats.totalConnections > (this.config.max || 20) * 0.8) {
          console.warn('High connection usage detected:', stats);
        }
      } catch (error) {
        console.error('Error during connection monitoring:', error);
      }
    }, intervalMs);
  }
}

// Export singleton instance
export const dbPool = DatabaseConnectionPool.getInstance();