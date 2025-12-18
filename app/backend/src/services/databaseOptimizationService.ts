import { db } from '../db';
import { logger } from '../utils/logger';
import { sql } from 'drizzle-orm';
import * as schema from '../db/schema';

/**
 * Database Performance Optimization Service
 * 
 * Provides comprehensive database optimization including:
 * - Query analysis and optimization
 * - Index management and optimization
 * - Connection pool optimization
 * - Query performance monitoring
 */

export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  indexUsage: string[];
  recommendations: string[];
  timestamp: Date;
}

export interface IndexAnalysisResult {
  tableName: string;
  currentIndexes: Array<{
    name: string;
    columns: string[];
    usageCount: number;
    size: string;
    efficiency: number;
  }>;
  suggestedIndexes: Array<{
    name: string;
    columns: string[];
    reason: string;
    estimatedImprovement: number;
  }>;
  unusedIndexes: Array<{
    name: string;
    size: string;
    lastUsed: Date | null;
  }>;
}

export interface ConnectionPoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  averageConnectionTime: number;
  maxConnectionTime: number;
  connectionErrors: number;
}

export class DatabaseOptimizationService {
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private readonly METRICS_RETENTION_COUNT = 1000;
  private readonly SLOW_QUERY_THRESHOLD = 1000; // ms

  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  private initializeMonitoring(): void {
    // Set up periodic analysis
    setInterval(() => {
      this.analyzeIndexUsage();
      this.checkConnectionPoolHealth();
    }, 5 * 60 * 1000); // Every 5 minutes

    logger.info('Database optimization service initialized');
  }

  /**
   * Analyze and optimize slow queries
   */
  async analyzeSlowQueries(): Promise<QueryPerformanceMetrics[]> {
    try {
      // Get slow query statistics from PostgreSQL
      const slowQueriesResult = await db.execute(sql`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements 
        WHERE mean_time > ${this.SLOW_QUERY_THRESHOLD}
        ORDER BY mean_time DESC 
        LIMIT 10
      `);

      const slowQueries: QueryPerformanceMetrics[] = [];

      for (const row of slowQueriesResult) {
        const queryPlan = await this.getQueryPlan(row.query);
        const recommendations = this.generateQueryRecommendations(row, queryPlan);

        slowQueries.push({
          query: row.query,
          executionTime: row.mean_time,
          rowsAffected: (row as any).rows || 0,
          indexUsage: this.extractIndexUsage(queryPlan),
          recommendations,
          timestamp: new Date()
        });
      }

      // Store metrics for analysis
      this.queryMetrics.push(...slowQueries);
      this.trimMetricsHistory();

      logger.info(`Analyzed ${slowQueries.length} slow queries`);
      return slowQueries;
    } catch (error) {
      logger.error('Failed to analyze slow queries:', error);
      return [];
    }
  }

  /**
   * Get query execution plan
   */
  private async getQueryPlan(query: string): Promise<any> {
    try {
      const result = await db.execute(sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
      const resultArray = Array.isArray(result) ? result : [];
      return resultArray[0]?.['QUERY PLAN'];
    } catch (error) {
      logger.warn('Failed to get query plan:', error);
      return null;
    }
  }

  /**
   * Extract index usage from query plan
   */
  private extractIndexUsage(queryPlan: any): string[] {
    const indexes: string[] = [];
    
    if (!queryPlan) return indexes;

    const extractIndexes = (node: any) => {
      if (node['Index Name']) {
        indexes.push(node['Index Name']);
      }
      if (node['Plans']) {
        node['Plans'].forEach(extractIndexes);
      }
    };

    extractIndexes(queryPlan);
    return [...new Set(indexes)];
  }

  /**
   * Generate query optimization recommendations
   */
  private generateQueryRecommendations(queryStats: any, queryPlan: any): string[] {
    const recommendations: string[] = [];

    // Check for sequential scans
    if (this.hasSequentialScan(queryPlan)) {
      recommendations.push('Consider adding indexes to avoid sequential scans');
    }

    // Check for high buffer usage
    if (queryStats.hit_percent < 90) {
      recommendations.push('Low buffer hit ratio - consider query optimization or caching');
    }

    // Check for sort operations
    if (this.hasSortOperation(queryPlan)) {
      recommendations.push('Consider adding indexes to support ORDER BY clauses');
    }

    // Check for hash joins
    if (this.hasHashJoin(queryPlan)) {
      recommendations.push('Consider enabling work_mem for better hash join performance');
    }

    return recommendations;
  }

  /**
   * Check if query plan contains sequential scans
   */
  private hasSequentialScan(queryPlan: any): boolean {
    if (!queryPlan) return false;
    
    const checkNode = (node: any): boolean => {
      if (node['Node Type'] === 'Seq Scan') return true;
      if (node['Plans']) {
        return node['Plans'].some(checkNode);
      }
      return false;
    };

    return checkNode(queryPlan);
  }

  /**
   * Check if query plan contains sort operations
   */
  private hasSortOperation(queryPlan: any): boolean {
    if (!queryPlan) return false;
    
    const checkNode = (node: any): boolean => {
      if (node['Node Type'] === 'Sort') return true;
      if (node['Plans']) {
        return node['Plans'].some(checkNode);
      }
      return false;
    };

    return checkNode(queryPlan);
  }

  /**
   * Check if query plan contains hash joins
   */
  private hasHashJoin(queryPlan: any): boolean {
    if (!queryPlan) return false;
    
    const checkNode = (node: any): boolean => {
      if (node['Node Type']?.includes('Hash Join')) return true;
      if (node['Plans']) {
        return node['Plans'].some(checkNode);
      }
      return false;
    };

    return checkNode(queryPlan);
  }

  /**
   * Analyze index usage and suggest optimizations
   */
  async analyzeIndexUsage(): Promise<IndexAnalysisResult[]> {
    try {
      const tables = await this.getTablesWithIndexes();
      const results: IndexAnalysisResult[] = [];

      for (const table of tables) {
        const analysis = await this.analyzeTableIndexes(table);
        results.push(analysis);
      }

      return results;
    } catch (error) {
      logger.error('Failed to analyze index usage:', error);
      return [];
    }
  }

  /**
   * Get list of tables with indexes
   */
  private async getTablesWithIndexes(): Promise<string[]> {
    const result = await db.execute(sql`
      SELECT DISTINCT schemaname || '.' || tablename 
      FROM pg_indexes 
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
    `);

    const resultArray = Array.isArray(result) ? result : [];
    return resultArray.map(row => row['?column?']);
  }

  /**
   * Analyze indexes for a specific table
   */
  private async analyzeTableIndexes(tableName: string): Promise<IndexAnalysisResult> {
    // Get current indexes
    const indexesResult = await db.execute(sql`
      SELECT 
        indexname,
        indexdef,
        schemaname,
        tablename
      FROM pg_indexes 
      WHERE schemaname || '.' || tablename = ${tableName}
    `);

    // Get index usage statistics
    const usageResult = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_size_pretty(pg_relation_size(indexrelid::regclass)) AS index_size
      FROM pg_stat_user_indexes 
      WHERE schemaname || '.' || tablename = ${tableName}
    `);

    // Get table statistics for optimization suggestions
    const tableStats = await db.execute(sql`
      SELECT 
        n_tup_ins,
        n_tup_upd,
        n_tup_del,
        n_live_tup,
        n_dead_tup
      FROM pg_stat_user_tables 
      WHERE schemaname || '.' || tablename = ${tableName}
    `);

    const indexesArray = Array.isArray(indexesResult) ? indexesResult : [];
    const usageArray = Array.isArray(usageResult) ? usageResult : [];
    const tableStatsArray = Array.isArray(tableStats) ? tableStats : [];
    
    const currentIndexes = indexesArray.map(index => {
      const usage = usageArray.find(u => u.indexname === index.indexname);
      return {
        name: index.indexname,
        columns: this.extractIndexColumns(index.indexdef),
        usageCount: usage?.idx_scan || 0,
        size: usage?.index_size || '0 bytes',
        efficiency: this.calculateIndexEfficiency(usage, tableStatsArray[0])
      };
    });

    const suggestedIndexes = this.suggestMissingIndexes(tableName, currentIndexes);
    const unusedIndexes = this.identifyUnusedIndexes(currentIndexes);

    return {
      tableName,
      currentIndexes,
      suggestedIndexes,
      unusedIndexes
    };
  }

  /**
   * Extract column names from index definition
   */
  private extractIndexColumns(indexDef: string): string[] {
    const match = indexDef.match(/\(([^)]+)\)/);
    if (!match) return [];
    
    return match[1].split(',').map(col => col.trim().replace(/"/g, ''));
  }

  /**
   * Calculate index efficiency score
   */
  private calculateIndexEfficiency(usage: any, tableStats: any): number {
    if (!usage || !tableStats) return 0;

    const scanRatio = usage.idx_scan / Math.max(1, usage.idx_tup_read);
    const fetchRatio = usage.idx_tup_fetch / Math.max(1, usage.idx_tup_read);
    
    return Math.round((scanRatio * 0.6 + fetchRatio * 0.4) * 100);
  }

  /**
   * Suggest missing indexes based on query patterns
   */
  private suggestMissingIndexes(tableName: string, currentIndexes: any[]): Array<{
    name: string;
    columns: string[];
    reason: string;
    estimatedImprovement: number;
  }> {
    const suggestions: Array<{
      name: string;
      columns: string[];
      reason: string;
      estimatedImprovement: number;
    }> = [];

    // Common patterns for missing indexes
    const existingColumnCombinations = new Set(
      currentIndexes.map(idx => idx.columns.sort().join(','))
    );

    // Suggest indexes based on common query patterns
    if (tableName.includes('posts') && !this.hasIndexOn(currentIndexes, ['communityId'])) {
      suggestions.push({
        name: `idx_${tableName}_community_id`,
        columns: ['communityId'],
        reason: 'Frequent filtering by community',
        estimatedImprovement: 85
      });
    }

    if (tableName.includes('posts') && !this.hasIndexOn(currentIndexes, ['authorId'])) {
      suggestions.push({
        name: `idx_${tableName}_author_id`,
        columns: ['authorId'],
        reason: 'Frequent filtering by author',
        estimatedImprovement: 80
      });
    }

    if (tableName.includes('posts') && !this.hasIndexOn(currentIndexes, ['createdAt'])) {
      suggestions.push({
        name: `idx_${tableName}_created_at`,
        columns: ['createdAt'],
        reason: 'Time-based queries and sorting',
        estimatedImprovement: 75
      });
    }

    if (tableName.includes('users') && !this.hasIndexOn(currentIndexes, ['walletAddress'])) {
      suggestions.push({
        name: `idx_${tableName}_wallet_address`,
        columns: ['walletAddress'],
        reason: 'Primary lookup field',
        estimatedImprovement: 95
      });
    }

    return suggestions;
  }

  /**
   * Check if index exists on specific columns
   */
  private hasIndexOn(indexes: any[], columns: string[]): boolean {
    return indexes.some(idx => 
      columns.every(col => idx.columns.includes(col))
    );
  }

  /**
   * Identify unused indexes
   */
  private identifyUnusedIndexes(currentIndexes: any[]): Array<{
    name: string;
    size: string;
    lastUsed: Date | null;
  }> {
    return currentIndexes
      .filter(idx => idx.usageCount === 0)
      .map(idx => ({
        name: idx.name,
        size: idx.size,
        lastUsed: null
      }));
  }

  /**
   * Create recommended indexes
   */
  async createRecommendedIndexes(suggestions: Array<{
    tableName: string;
    name: string;
    columns: string[];
  }>): Promise<void> {
    try {
      for (const suggestion of suggestions) {
        await db.execute(sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS ${suggestion.name}
          ON ${suggestion.tableName} (${suggestion.columns.join(', ')})
        `);
        
        logger.info(`Created index: ${suggestion.name} on ${suggestion.tableName}`);
      }
    } catch (error) {
      logger.error('Failed to create recommended indexes:', error);
    }
  }

  /**
   * Drop unused indexes
   */
  async dropUnusedIndexes(indexes: string[]): Promise<void> {
    try {
      for (const indexName of indexes) {
        await db.execute(sql`DROP INDEX CONCURRENTLY IF EXISTS ${indexName}`);
        logger.info(`Dropped unused index: ${indexName}`);
      }
    } catch (error) {
      logger.error('Failed to drop unused indexes:', error);
    }
  }

  /**
   * Optimize database connection pool
   */
  async optimizeConnectionPool(): Promise<void> {
    try {
      // Update PostgreSQL configuration for better performance
      await db.execute(sql`
        -- Increase work_mem for better sort and hash operations
        ALTER SYSTEM SET work_mem = '256MB';
        
        -- Increase maintenance_work_mem for index creation
        ALTER SYSTEM SET maintenance_work_mem = '1GB';
        
        -- Enable parallel query processing
        ALTER SYSTEM SET max_parallel_workers_per_gather = 4;
        
        -- Optimize checkpoint settings
        ALTER SYSTEM SET checkpoint_completion_target = 0.9;
        
        -- Optimize WAL settings
        ALTER SYSTEM SET wal_buffers = '64MB';
        ALTER SYSTEM SET wal_writer_delay = '200ms';
        
        -- Enable statement timeout to prevent long-running queries
        ALTER SYSTEM SET statement_timeout = '30s';
      `);

      logger.info('Database connection pool optimized');
    } catch (error) {
      logger.error('Failed to optimize connection pool:', error);
    }
  }

  /**
   * Get connection pool metrics
   */
  async getConnectionPoolMetrics(): Promise<ConnectionPoolMetrics> {
    try {
      const result = await db.execute(sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE wait_event_type IS NOT NULL) as waiting_connections
        FROM pg_stat_activity
      `);

      const resultArray = Array.isArray(result) ? result : [];
      const row = resultArray[0];
      
      if (!row) {
        throw new Error('No connection stats available');
      }
      
      return {
        totalConnections: parseInt(row.total_connections),
        activeConnections: parseInt(row.active_connections),
        idleConnections: parseInt(row.idle_connections),
        waitingConnections: parseInt(row.waiting_connections),
        averageConnectionTime: 0, // Would need additional monitoring
        maxConnectionTime: 0,
        connectionErrors: 0
      };
    } catch (error) {
      logger.error('Failed to get connection pool metrics:', error);
      throw error;
    }
  }

  /**
   * Check connection pool health
   */
  private async checkConnectionPoolHealth(): Promise<void> {
    try {
      const metrics = await this.getConnectionPoolMetrics();
      
      // Alert on potential issues
      if (metrics.waitingConnections > 5) {
        logger.warn('High number of waiting connections detected', metrics);
      }
      
      if (metrics.totalConnections > 80) {
        logger.warn('Connection pool approaching limit', metrics);
      }
      
      if (metrics.activeConnections > metrics.totalConnections * 0.8) {
        logger.warn('High connection utilization detected', metrics);
      }
    } catch (error) {
      logger.error('Failed to check connection pool health:', error);
    }
  }

  /**
   * Analyze table statistics and recommend optimizations
   */
  async analyzeTableStatistics(): Promise<void> {
    try {
      // Get table statistics
      const result = await db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          n_live_tup,
          n_dead_tup,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          vacuum_count,
          autovacuum_count
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);

      const resultArray = Array.isArray(result) ? result : [];
      for (const row of resultArray) {
        const deadTupleRatio = row.n_dead_tup / Math.max(1, row.n_live_tup);
        
        // Recommend VACUUM if too many dead tuples
        if (deadTupleRatio > 0.1) {
          logger.warn(`Table ${row.tablename} has ${(deadTupleRatio * 100).toFixed(1)}% dead tuples`, {
            schema: row.schemaname,
            table: row.tablename,
            deadTupleRatio,
            lastVacuum: row.last_vacuum
          });
        }
        
        // Recommend ANALYZE if statistics are stale
        const daysSinceAnalyze = row.last_analyze 
          ? (Date.now() - new Date(row.last_analyze).getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;
        
        if (daysSinceAnalyze > 7) {
          logger.warn(`Table ${row.tablename} statistics are ${daysSinceAnalyze.toFixed(0)} days old`, {
            schema: row.schemaname,
            table: row.tablename,
            lastAnalyze: row.last_analyze
          });
        }
      }
    } catch (error) {
      logger.error('Failed to analyze table statistics:', error);
    }
  }

  /**
   * Perform database maintenance operations
   */
  async performMaintenance(): Promise<void> {
    try {
      logger.info('Starting database maintenance');
      
      // Update table statistics
      await db.execute(sql`ANALYZE`);
      
      // Clean up dead tuples
      await db.execute(sql`VACUUM ANALYZE`);
      
      logger.info('Database maintenance completed');
    } catch (error) {
      logger.error('Database maintenance failed:', error);
    }
  }

  /**
   * Trim metrics history to prevent memory issues
   */
  private trimMetricsHistory(): void {
    if (this.queryMetrics.length > this.METRICS_RETENTION_COUNT) {
      this.queryMetrics = this.queryMetrics.slice(-this.METRICS_RETENTION_COUNT);
    }
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(): Promise<{
    slowQueries: QueryPerformanceMetrics[];
    indexAnalysis: IndexAnalysisResult[];
    connectionMetrics: ConnectionPoolMetrics;
    recommendations: string[];
  }> {
    const [slowQueries, indexAnalysis, connectionMetrics] = await Promise.all([
      this.analyzeSlowQueries(),
      this.analyzeIndexUsage(),
      this.getConnectionPoolMetrics()
    ]);

    const recommendations = this.generateOverallRecommendations(
      slowQueries,
      indexAnalysis,
      connectionMetrics
    );

    return {
      slowQueries,
      indexAnalysis,
      connectionMetrics,
      recommendations
    };
  }

  /**
   * Generate overall optimization recommendations
   */
  private generateOverallRecommendations(
    slowQueries: QueryPerformanceMetrics[],
    indexAnalysis: IndexAnalysisResult[],
    connectionMetrics: ConnectionPoolMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Query performance recommendations
    if (slowQueries.length > 0) {
      recommendations.push(`${slowQueries.length} slow queries detected - review and optimize`);
    }

    // Index recommendations
    const totalSuggestedIndexes = indexAnalysis.reduce(
      (sum, analysis) => sum + analysis.suggestedIndexes.length, 0
    );
    
    if (totalSuggestedIndexes > 0) {
      recommendations.push(`${totalSuggestedIndexes} recommended indexes could improve performance`);
    }

    // Unused index recommendations
    const totalUnusedIndexes = indexAnalysis.reduce(
      (sum, analysis) => sum + analysis.unusedIndexes.length, 0
    );
    
    if (totalUnusedIndexes > 0) {
      recommendations.push(`${totalUnusedIndexes} unused indexes could be removed`);
    }

    // Connection pool recommendations
    if (connectionMetrics.waitingConnections > 0) {
      recommendations.push('Connection pool optimization needed - consider increasing pool size');
    }

    return recommendations;
  }
}

export const databaseOptimizationService = new DatabaseOptimizationService();