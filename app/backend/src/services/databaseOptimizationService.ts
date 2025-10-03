import { Pool, PoolClient } from 'pg';
import { dbPool } from '../db/connectionPool';
import { cacheService } from './cacheService';
import { logger } from '../utils/logger';

interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: Date;
}

interface IndexRecommendation {
  table: string;
  columns: string[];
  reason: string;
  estimatedImpact: 'high' | 'medium' | 'low';
}

export class DatabaseOptimizationService {
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second
  private readReplicas: Pool[] = [];

  constructor() {
    this.initializeReadReplicas();
    this.startQueryMonitoring();
  }

  /**
   * Initialize read replica connections for heavy read operations
   */
  private initializeReadReplicas(): void {
    const readReplicaUrls = process.env.READ_REPLICA_URLS?.split(',') || [];
    
    readReplicaUrls.forEach((url, index) => {
      try {
        const replica = new Pool({
          connectionString: url.trim(),
          max: 10, // Smaller pool for read replicas
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
        
        this.readReplicas.push(replica);
        logger.info(`Read replica ${index + 1} initialized`);
      } catch (error) {
        logger.error(`Failed to initialize read replica ${index + 1}:`, error);
      }
    });
  }

  /**
   * Get a read replica connection for heavy read operations
   */
  public getReadConnection(): Pool {
    if (this.readReplicas.length === 0) {
      // Fallback to main connection if no read replicas
      return dbPool.getConnection() as any;
    }
    
    // Simple round-robin selection
    const index = Math.floor(Math.random() * this.readReplicas.length);
    return this.readReplicas[index];
  }

  /**
   * Execute optimized query with performance monitoring
   */
  public async executeOptimizedQuery<T>(
    query: string,
    params: any[] = [],
    useReadReplica: boolean = false
  ): Promise<T[]> {
    const startTime = Date.now();
    const connection = useReadReplica ? this.getReadConnection() : dbPool.getConnection();
    
    try {
      const result = await (connection as any).unsafe(query, params);
      const executionTime = Date.now() - startTime;
      
      // Track query performance
      this.trackQueryPerformance({
        query: this.sanitizeQuery(query),
        executionTime,
        rowsReturned: Array.isArray(result) ? result.length : 0,
        timestamp: new Date()
      });
      
      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn('Slow query detected', {
          query: this.sanitizeQuery(query),
          executionTime,
          params: params.length
        });
      }
      
      return result;
    } catch (error) {
      logger.error('Query execution failed', {
        query: this.sanitizeQuery(query),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Create database indexes for frequently queried fields
   */
  public async createOptimizationIndexes(): Promise<void> {
    const indexes = [
      // Seller profile indexes
      {
        name: 'idx_sellers_wallet_address_btree',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_wallet_address_btree ON sellers USING btree(wallet_address)',
        table: 'sellers'
      },
      {
        name: 'idx_sellers_created_at_desc',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_created_at_desc ON sellers(created_at DESC)',
        table: 'sellers'
      },
      {
        name: 'idx_sellers_onboarding_completed',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_onboarding_completed ON sellers(onboarding_completed) WHERE onboarding_completed = true',
        table: 'sellers'
      },
      
      // Marketplace listings indexes
      {
        name: 'idx_marketplace_listings_seller_address',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_seller_address ON marketplace_listings(seller_address)',
        table: 'marketplace_listings'
      },
      {
        name: 'idx_marketplace_listings_created_at_desc',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_created_at_desc ON marketplace_listings(created_at DESC)',
        table: 'marketplace_listings'
      },
      {
        name: 'idx_marketplace_listings_status_created_at',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_status_created_at ON marketplace_listings(status, created_at DESC)',
        table: 'marketplace_listings'
      },
      {
        name: 'idx_marketplace_listings_price_range',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_listings_price_range ON marketplace_listings(price) WHERE status = \'active\'',
        table: 'marketplace_listings'
      },
      
      // Authentication sessions indexes
      {
        name: 'idx_auth_sessions_wallet_address',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_wallet_address ON auth_sessions(wallet_address)',
        table: 'auth_sessions'
      },
      {
        name: 'idx_auth_sessions_expires_at',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at) WHERE expires_at > NOW()',
        table: 'auth_sessions'
      },
      {
        name: 'idx_auth_sessions_session_token_hash',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auth_sessions_session_token_hash ON auth_sessions USING hash(session_token)',
        table: 'auth_sessions'
      },
      
      // User reputation indexes
      {
        name: 'idx_user_reputation_wallet_address',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_reputation_wallet_address ON user_reputation(wallet_address)',
        table: 'user_reputation'
      },
      {
        name: 'idx_user_reputation_score_desc',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_reputation_score_desc ON user_reputation(reputation_score DESC)',
        table: 'user_reputation'
      },
      {
        name: 'idx_user_reputation_last_calculated',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_reputation_last_calculated ON user_reputation(last_calculated DESC)',
        table: 'user_reputation'
      },
      
      // Products table optimization indexes
      {
        name: 'idx_products_seller_status_created',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_seller_status_created ON products(seller_id, status, created_at DESC)',
        table: 'products'
      },
      {
        name: 'idx_products_category_price',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_price ON products(category_id, price_amount) WHERE status = \'active\'',
        table: 'products'
      },
      {
        name: 'idx_products_search_vector',
        query: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_search_vector ON products USING gin(to_tsvector(\'english\', title || \' \' || description))',
        table: 'products'
      }
    ];

    for (const index of indexes) {
      try {
        await this.executeOptimizedQuery(index.query);
        logger.info(`Created index ${index.name} on table ${index.table}`);
      } catch (error) {
        // Index might already exist, log but don't fail
        logger.warn(`Failed to create index ${index.name}:`, error);
      }
    }
  }

  /**
   * Analyze query performance and provide optimization recommendations
   */
  public async analyzeQueryPerformance(): Promise<{
    slowQueries: QueryPerformanceMetrics[];
    indexRecommendations: IndexRecommendation[];
    performanceStats: {
      averageExecutionTime: number;
      slowQueryCount: number;
      totalQueries: number;
    };
  }> {
    const slowQueries = this.queryMetrics.filter(
      metric => metric.executionTime > this.slowQueryThreshold
    );

    const indexRecommendations = await this.generateIndexRecommendations();

    const totalQueries = this.queryMetrics.length;
    const averageExecutionTime = totalQueries > 0 
      ? this.queryMetrics.reduce((sum, metric) => sum + metric.executionTime, 0) / totalQueries
      : 0;

    return {
      slowQueries: slowQueries.slice(-10), // Last 10 slow queries
      indexRecommendations,
      performanceStats: {
        averageExecutionTime,
        slowQueryCount: slowQueries.length,
        totalQueries
      }
    };
  }

  /**
   * Generate index recommendations based on query patterns
   */
  private async generateIndexRecommendations(): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    try {
      // Analyze missing indexes from PostgreSQL stats
      const missingIndexes = await this.executeOptimizedQuery(`
        SELECT 
          schemaname,
          tablename,
          attname as column_name,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public' 
        AND tablename IN ('sellers', 'marketplace_listings', 'auth_sessions', 'user_reputation')
        AND n_distinct > 100
        ORDER BY n_distinct DESC
      `);

      for (const stat of missingIndexes as any[]) {
        if (stat.n_distinct > 1000) {
          recommendations.push({
            table: stat.tablename,
            columns: [stat.column_name],
            reason: `High cardinality column (${stat.n_distinct} distinct values) frequently used in WHERE clauses`,
            estimatedImpact: 'high'
          });
        }
      }

      // Add specific recommendations based on common query patterns
      recommendations.push(
        {
          table: 'marketplace_listings',
          columns: ['seller_address', 'created_at'],
          reason: 'Composite index for seller listing queries with date sorting',
          estimatedImpact: 'high'
        },
        {
          table: 'auth_sessions',
          columns: ['wallet_address', 'expires_at'],
          reason: 'Composite index for active session lookups',
          estimatedImpact: 'medium'
        },
        {
          table: 'user_reputation',
          columns: ['reputation_score'],
          reason: 'Index for reputation-based sorting and filtering',
          estimatedImpact: 'medium'
        }
      );

    } catch (error) {
      logger.error('Failed to generate index recommendations:', error);
    }

    return recommendations;
  }

  /**
   * Optimize database connection settings
   */
  public async optimizeConnectionSettings(): Promise<void> {
    const optimizationQueries = [
      // Increase work memory for complex queries
      "SET work_mem = '256MB'",
      
      // Optimize for read-heavy workloads
      "SET random_page_cost = 1.1",
      
      // Increase effective cache size
      "SET effective_cache_size = '2GB'",
      
      // Optimize checkpoint settings
      "SET checkpoint_completion_target = 0.9",
      
      // Enable query plan caching
      "SET plan_cache_mode = 'auto'"
    ];

    for (const query of optimizationQueries) {
      try {
        await this.executeOptimizedQuery(query);
      } catch (error) {
        logger.warn(`Failed to apply optimization setting: ${query}`, error);
      }
    }
  }

  /**
   * Clean up old query metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.queryMetrics = this.queryMetrics.filter(
      metric => metric.timestamp > oneHourAgo
    );
  }

  /**
   * Track query performance metrics
   */
  private trackQueryPerformance(metrics: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only recent metrics to prevent memory issues
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-500);
    }
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/\$\d+/g, '?') // Replace parameter placeholders
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Start monitoring query performance
   */
  private startQueryMonitoring(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    logger.info('Database optimization service initialized');
  }

  /**
   * Get database performance statistics
   */
  public async getDatabaseStats(): Promise<{
    connectionStats: any;
    queryStats: any;
    indexUsage: any[];
    tableStats: any[];
  }> {
    try {
      const [connectionStats, queryStats, indexUsage, tableStats] = await Promise.all([
        this.getConnectionStats(),
        this.getQueryStats(),
        this.getIndexUsageStats(),
        this.getTableStats()
      ]);

      return {
        connectionStats,
        queryStats,
        indexUsage,
        tableStats
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  private async getConnectionStats(): Promise<any> {
    const result = await this.executeOptimizedQuery(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);
    return result[0];
  }

  private async getQueryStats(): Promise<any> {
    const result = await this.executeOptimizedQuery(`
      SELECT 
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      ORDER BY total_time DESC 
      LIMIT 1
    `);
    return result[0] || {};
  }

  private async getIndexUsageStats(): Promise<any[]> {
    return this.executeOptimizedQuery(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      ORDER BY idx_tup_read DESC 
      LIMIT 10
    `);
  }

  private async getTableStats(): Promise<any[]> {
    return this.executeOptimizedQuery(`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public'
      ORDER BY seq_scan DESC 
      LIMIT 10
    `);
  }
}

export const databaseOptimizationService = new DatabaseOptimizationService();