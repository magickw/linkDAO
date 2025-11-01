/**
 * Database Optimization Service
 * Query optimization, indexing, and performance monitoring for PostgreSQL
 */

import { Pool, PoolClient } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';

interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  rowsReturned: number;
  timestamp: number;
  planningTime?: number;
  executionTime_actual?: number;
  bufferHits?: number;
  bufferReads?: number;
  tempFileSize?: number;
}

interface IndexRecommendation {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: number;
  priority: 'high' | 'medium' | 'low';
  createStatement: string;
}

interface DatabaseStats {
  connectionCount: number;
  activeQueries: number;
  slowQueries: number;
  cacheHitRatio: number;
  indexUsage: number;
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    tableSize: string;
    indexSize: string;
    totalSize: string;
  }>;
  topSlowQueries: QueryPerformanceMetrics[];
}

interface OptimizationRule {
  name: string;
  description: string;
  check: (query: string, metrics: QueryPerformanceMetrics) => boolean;
  recommendation: string;
  severity: 'high' | 'medium' | 'low';
}

/**
 * Database Optimization Service for PostgreSQL performance tuning
 */
export class DatabaseOptimizationService {
  private pool: Pool;
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private indexRecommendations: IndexRecommendation[] = [];
  private optimizationRules: OptimizationRule[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor(pool: Pool) {
    this.pool = pool;
    this.initializeOptimizationRules();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize optimization rules
   */
  private initializeOptimizationRules(): void {
    this.optimizationRules = [
      {
        name: 'Slow Query Detection',
        description: 'Detect queries taking longer than 1 second',
        check: (query, metrics) => metrics.executionTime > 1000,
        recommendation: 'Consider adding indexes or optimizing the query structure',
        severity: 'high'
      },
      {
        name: 'Sequential Scan Detection',
        description: 'Detect queries performing sequential scans on large tables',
        check: (query) => query.toLowerCase().includes('seq scan') && 
                          (query.includes('posts') || query.includes('users') || query.includes('communities')),
        recommendation: 'Add appropriate indexes to avoid sequential scans',
        severity: 'high'
      },
      {
        name: 'Missing WHERE Clause',
        description: 'Detect SELECT queries without WHERE clauses',
        check: (query) => {
          const normalized = query.toLowerCase().trim();
          return normalized.startsWith('select') && 
                 !normalized.includes('where') && 
                 !normalized.includes('limit') &&
                 (normalized.includes('posts') || normalized.includes('users'));
        },
        recommendation: 'Add WHERE clause to limit result set',
        severity: 'medium'
      },
      {
        name: 'N+1 Query Pattern',
        description: 'Detect potential N+1 query patterns',
        check: (query, metrics) => {
          // Simple heuristic: many similar queries in short time
          const recentSimilar = this.queryMetrics.filter(m => 
            m.timestamp > Date.now() - 5000 && // Last 5 seconds
            this.querySimilarity(m.query, query) > 0.8
          );
          return recentSimilar.length > 10;
        },
        recommendation: 'Use JOIN or batch queries to avoid N+1 pattern',
        severity: 'high'
      },
      {
        name: 'Large Result Set',
        description: 'Detect queries returning large result sets',
        check: (query, metrics) => metrics.rowsReturned > 1000,
        recommendation: 'Add pagination or limit result set size',
        severity: 'medium'
      },
      {
        name: 'Inefficient JOIN',
        description: 'Detect potentially inefficient JOIN operations',
        check: (query, metrics) => {
          const hasJoin = query.toLowerCase().includes('join');
          const isSlowWithJoin = hasJoin && metrics.executionTime > 500;
          return isSlowWithJoin;
        },
        recommendation: 'Optimize JOIN conditions and ensure proper indexing',
        severity: 'medium'
      }
    ];
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectDatabaseStats();
        await this.analyzeSlowQueries();
        await this.generateIndexRecommendations();
      } catch (error) {
        safeLogger.error('Database monitoring error:', error);
      }
    }, 30000);
  }

  /**
   * Execute query with performance monitoring
   */
  async executeQuery<T = any>(
    query: string, 
    params: any[] = [], 
    options: { 
      explain?: boolean;
      analyze?: boolean;
      buffers?: boolean;
    } = {}
  ): Promise<{
    rows: T[];
    metrics: QueryPerformanceMetrics;
    plan?: any;
  }> {
    const client = await this.pool.connect();
    const startTime = performance.now();
    
    try {
      let result;
      let plan;

      // Get query plan if requested
      if (options.explain) {
        const explainQuery = `EXPLAIN ${options.analyze ? 'ANALYZE ' : ''}${options.buffers ? 'BUFFERS ' : ''}${query}`;
        const planResult = await client.query(explainQuery, params);
        plan = planResult.rows;
      }

      // Execute the actual query
      result = await client.query(query, params);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Create performance metrics
      const metrics: QueryPerformanceMetrics = {
        query: this.normalizeQuery(query),
        executionTime,
        rowsReturned: result.rowCount || 0,
        timestamp: Date.now()
      };

      // Extract additional metrics from plan if available
      if (plan && options.analyze) {
        this.extractPlanMetrics(plan, metrics);
      }

      // Store metrics
      this.queryMetrics.push(metrics);
      
      // Keep only recent metrics (last 1000)
      if (this.queryMetrics.length > 1000) {
        this.queryMetrics = this.queryMetrics.slice(-1000);
      }

      // Check optimization rules
      this.checkOptimizationRules(query, metrics);

      return {
        rows: result.rows,
        metrics,
        plan
      };

    } finally {
      client.release();
    }
  }

  /**
   * Normalize query for comparison
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?')
      .replace(/\d+/g, 'N')
      .replace(/'[^']*'/g, "'?'")
      .trim()
      .toLowerCase();
  }

  /**
   * Extract metrics from query plan
   */
  private extractPlanMetrics(plan: any[], metrics: QueryPerformanceMetrics): void {
    // This is a simplified extraction - in practice, you'd parse the EXPLAIN output more thoroughly
    const planText = plan.map(row => row['QUERY PLAN']).join('\n');
    
    // Extract planning time
    const planningTimeMatch = planText.match(/Planning Time: ([\d.]+) ms/);
    if (planningTimeMatch) {
      metrics.planningTime = parseFloat(planningTimeMatch[1]);
    }

    // Extract execution time
    const executionTimeMatch = planText.match(/Execution Time: ([\d.]+) ms/);
    if (executionTimeMatch) {
      metrics.executionTime_actual = parseFloat(executionTimeMatch[1]);
    }

    // Extract buffer statistics
    const bufferHitsMatch = planText.match(/shared hit=(\d+)/);
    if (bufferHitsMatch) {
      metrics.bufferHits = parseInt(bufferHitsMatch[1]);
    }

    const bufferReadsMatch = planText.match(/read=(\d+)/);
    if (bufferReadsMatch) {
      metrics.bufferReads = parseInt(bufferReadsMatch[1]);
    }
  }

  /**
   * Check optimization rules against query
   */
  private checkOptimizationRules(query: string, metrics: QueryPerformanceMetrics): void {
    for (const rule of this.optimizationRules) {
      if (rule.check(query, metrics)) {
        safeLogger.warn(`Database Optimization Alert [${rule.severity.toUpperCase()}]: ${rule.name}`);
        safeLogger.warn(`Query: ${query.substring(0, 100)}...`);
        safeLogger.warn(`Recommendation: ${rule.recommendation}`);
        
        // Log event for monitoring systems (could be sent to external monitoring)
        safeLogger.info('Database Optimization Alert:', {
          rule: rule.name,
          severity: rule.severity,
          query: query.substring(0, 200),
          metrics,
          recommendation: rule.recommendation
        });
      }
    }
  }

  /**
   * Calculate query similarity
   */
  private querySimilarity(query1: string, query2: string): number {
    const normalized1 = this.normalizeQuery(query1);
    const normalized2 = this.normalizeQuery(query2);
    
    if (normalized1 === normalized2) return 1.0;
    
    // Simple Levenshtein distance-based similarity
    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(normalized1, normalized2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Collect database statistics
   */
  private async collectDatabaseStats(): Promise<DatabaseStats> {
    const client = await this.pool.connect();
    
    try {
      // Get connection count
      const connectionResult = await client.query(`
        SELECT count(*) as connection_count 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `);

      // Get cache hit ratio
      const cacheResult = await client.query(`
        SELECT 
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
        FROM pg_statio_user_tables
      `);

      // Get table statistics
      const tableStatsResult = await client.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins + n_tup_upd + n_tup_del as total_operations,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY total_operations DESC
        LIMIT 20
      `);

      // Get table sizes
      const tableSizeResult = await client.query(`
        SELECT 
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 20
      `);

      // Get slow queries from current metrics
      const slowQueries = this.queryMetrics
        .filter(m => m.executionTime > 100)
        .sort((a, b) => b.executionTime - a.executionTime)
        .slice(0, 10);

      const stats: DatabaseStats = {
        connectionCount: parseInt(connectionResult.rows[0].connection_count),
        activeQueries: this.queryMetrics.filter(m => Date.now() - m.timestamp < 60000).length,
        slowQueries: slowQueries.length,
        cacheHitRatio: parseFloat(cacheResult.rows[0]?.cache_hit_ratio || '0'),
        indexUsage: 0, // Would need more complex query
        tableStats: tableSizeResult.rows.map(row => ({
          tableName: row.tablename,
          rowCount: 0, // Would need additional query
          tableSize: row.table_size,
          indexSize: row.index_size,
          totalSize: row.total_size
        })),
        topSlowQueries: slowQueries
      };

      return stats;

    } finally {
      client.release();
    }
  }

  /**
   * Analyze slow queries and generate recommendations
   */
  private async analyzeSlowQueries(): Promise<void> {
    const slowQueries = this.queryMetrics
      .filter(m => m.executionTime > 500) // Queries slower than 500ms
      .slice(-50); // Last 50 slow queries

    for (const queryMetric of slowQueries) {
      try {
        // Get query plan for analysis
        const result = await this.executeQuery(
          queryMetric.query, 
          [], 
          { explain: true, analyze: false }
        );

        if (result.plan) {
          this.analyzePlanForOptimizations(queryMetric.query, result.plan);
        }
      } catch (error) {
        // Skip queries that can't be analyzed
        continue;
      }
    }
  }

  /**
   * Analyze query plan for optimization opportunities
   */
  private analyzePlanForOptimizations(query: string, plan: any[]): void {
    const planText = plan.map(row => row['QUERY PLAN']).join('\n').toLowerCase();

    // Check for sequential scans
    if (planText.includes('seq scan')) {
      const tableMatch = planText.match(/seq scan on (\w+)/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        
        // Extract WHERE conditions to suggest indexes
        const whereMatch = query.toLowerCase().match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/);
        if (whereMatch) {
          const whereClause = whereMatch[1];
          const columns = this.extractColumnsFromWhere(whereClause);
          
          if (columns.length > 0) {
            this.addIndexRecommendation({
              table: tableName,
              columns,
              type: 'btree',
              reason: 'Sequential scan detected in WHERE clause',
              estimatedImprovement: 0.7,
              priority: 'high',
              createStatement: `CREATE INDEX idx_${tableName}_${columns.join('_')} ON ${tableName} (${columns.join(', ')});`
            });
          }
        }
      }
    }

    // Check for sort operations without indexes
    if (planText.includes('sort') && planText.includes('sort key:')) {
      const sortMatch = planText.match(/sort key: (.+)/);
      if (sortMatch) {
        const sortColumns = sortMatch[1].split(',').map(col => col.trim().replace(/\w+\./, ''));
        const tableMatch = planText.match(/on (\w+)/);
        
        if (tableMatch && sortColumns.length > 0) {
          this.addIndexRecommendation({
            table: tableMatch[1],
            columns: sortColumns,
            type: 'btree',
            reason: 'Sort operation without index detected',
            estimatedImprovement: 0.5,
            priority: 'medium',
            createStatement: `CREATE INDEX idx_${tableMatch[1]}_sort_${sortColumns.join('_')} ON ${tableMatch[1]} (${sortColumns.join(', ')});`
          });
        }
      }
    }

    // Check for hash joins that could benefit from indexes
    if (planText.includes('hash join')) {
      // This would require more sophisticated plan parsing
      // For now, we'll just note that hash joins are occurring
    }
  }

  /**
   * Extract column names from WHERE clause
   */
  private extractColumnsFromWhere(whereClause: string): string[] {
    const columns: string[] = [];
    
    // Simple regex to extract column names (this could be more sophisticated)
    const columnMatches = whereClause.match(/(\w+)\s*[=<>!]/g);
    
    if (columnMatches) {
      columnMatches.forEach(match => {
        const column = match.replace(/\s*[=<>!].*/, '').trim();
        if (!columns.includes(column) && !['and', 'or', 'not'].includes(column.toLowerCase())) {
          columns.push(column);
        }
      });
    }

    return columns;
  }

  /**
   * Add index recommendation
   */
  private addIndexRecommendation(recommendation: IndexRecommendation): void {
    // Check if similar recommendation already exists
    const existing = this.indexRecommendations.find(rec => 
      rec.table === recommendation.table && 
      JSON.stringify(rec.columns.sort()) === JSON.stringify(recommendation.columns.sort())
    );

    if (!existing) {
      this.indexRecommendations.push(recommendation);
      
      // Keep only recent recommendations (last 100)
      if (this.indexRecommendations.length > 100) {
        this.indexRecommendations = this.indexRecommendations.slice(-100);
      }
    }
  }

  /**
   * Generate index recommendations based on query patterns
   */
  private async generateIndexRecommendations(): Promise<void> {
    // Analyze query patterns for common WHERE clauses
    const queryPatterns = new Map<string, number>();
    
    this.queryMetrics.forEach(metric => {
      const normalized = this.normalizeQuery(metric.query);
      const count = queryPatterns.get(normalized) || 0;
      queryPatterns.set(normalized, count + 1);
    });

    // Find frequently executed queries that might benefit from indexes
    for (const [query, frequency] of queryPatterns.entries()) {
      if (frequency >= 5) { // Query executed at least 5 times
        // This would analyze the query structure and suggest indexes
        // For now, we'll use the existing plan analysis
      }
    }
  }

  /**
   * Get database performance statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    return await this.collectDatabaseStats();
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(limit: number = 100): QueryPerformanceMetrics[] {
    return this.queryMetrics.slice(-limit);
  }

  /**
   * Get index recommendations
   */
  getIndexRecommendations(): IndexRecommendation[] {
    return [...this.indexRecommendations].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold: number = 500, limit: number = 20): QueryPerformanceMetrics[] {
    return this.queryMetrics
      .filter(metric => metric.executionTime > threshold)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Execute index creation
   */
  async createIndex(recommendation: IndexRecommendation): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query(recommendation.createStatement);
      
      // Remove the recommendation since it's been implemented
      this.indexRecommendations = this.indexRecommendations.filter(rec => rec !== recommendation);
      
      safeLogger.info(`Index created: ${recommendation.createStatement}`);
      return true;
    } catch (error) {
      safeLogger.error(`Failed to create index: ${error}`);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Analyze table for optimization opportunities
   */
  async analyzeTable(tableName: string): Promise<{
    rowCount: number;
    tableSize: string;
    indexSize: string;
    unusedIndexes: string[];
    missingIndexes: IndexRecommendation[];
    vacuumNeeded: boolean;
    analyzeNeeded: boolean;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get table statistics
      const statsResult = await client.query(`
        SELECT 
          n_live_tup as row_count,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables 
        WHERE tablename = $1
      `, [tableName]);

      // Get table size
      const sizeResult = await client.query(`
        SELECT 
          pg_size_pretty(pg_total_relation_size($1)) as total_size,
          pg_size_pretty(pg_relation_size($1)) as table_size,
          pg_size_pretty(pg_total_relation_size($1) - pg_relation_size($1)) as index_size
        FROM pg_tables 
        WHERE tablename = $1
      `, [tableName]);

      // Get unused indexes
      const unusedIndexesResult = await client.query(`
        SELECT indexname
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public' 
          AND relname = $1
          AND idx_scan = 0
      `, [tableName]);

      const stats = statsResult.rows[0];
      const sizes = sizeResult.rows[0];
      
      return {
        rowCount: parseInt(stats?.row_count || '0'),
        tableSize: sizes?.table_size || '0 bytes',
        indexSize: sizes?.index_size || '0 bytes',
        unusedIndexes: unusedIndexesResult.rows.map(row => row.indexname),
        missingIndexes: this.indexRecommendations.filter(rec => rec.table === tableName),
        vacuumNeeded: stats ? (parseInt(stats.dead_tuples) > parseInt(stats.row_count) * 0.1) : false,
        analyzeNeeded: stats ? (!stats.last_analyze && !stats.last_autoanalyze) : true
      };

    } finally {
      client.release();
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.queryMetrics.length = 0;
    this.indexRecommendations.length = 0;
  }
}

// Export the service class
export default DatabaseOptimizationService;
