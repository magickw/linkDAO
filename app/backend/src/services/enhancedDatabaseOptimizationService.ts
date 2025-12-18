/**
 * Enhanced Database Optimization Service
 * Advanced query optimization, intelligent indexing, and query result caching
 * Implements task 14.1: Optimize database queries
 */

import { Pool, PoolClient } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { cacheService } from './cacheService';
import { DatabaseOptimizationService } from './databaseOptimizationService';

interface QueryCacheConfig {
  enabled: boolean;
  defaultTTL: number;
  maxCacheSize: number;
  cacheKeyPrefix: string;
  cachableQueryTypes: string[];
  excludePatterns: string[];
}

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

interface QueryOptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  estimatedImprovement: number;
  optimizationTechniques: string[];
  cacheRecommendation?: {
    shouldCache: boolean;
    ttl: number;
    cacheKey: string;
  };
}

interface IndexOptimizationPlan {
  table: string;
  currentIndexes: Array<{
    name: string;
    columns: string[];
    type: string;
    size: string;
    usage: number;
  }>;
  recommendedIndexes: Array<{
    name: string;
    columns: string[];
    type: string;
    reason: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedBenefit: number;
    createStatement: string;
  }>;
  redundantIndexes: Array<{
    name: string;
    reason: string;
    dropStatement: string;
  }>;
}

interface QueryPerformanceProfile {
  queryHash: string;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  lastExecuted: Date;
  cacheHitRate?: number;
  optimizationApplied: boolean;
}

/**
 * Enhanced Database Optimization Service
 * Extends the base optimization service with advanced features
 */
export class EnhancedDatabaseOptimizationService {
  private pool: Pool;
  private baseOptimizer: DatabaseOptimizationService;
  private queryCacheConfig: QueryCacheConfig;
  private queryProfiles: Map<string, QueryPerformanceProfile> = new Map();
  private optimizationCache: Map<string, QueryOptimizationResult> = new Map();
  private indexOptimizationPlans: Map<string, IndexOptimizationPlan> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.baseOptimizer = new DatabaseOptimizationService();
    this.queryCacheConfig = this.initializeQueryCacheConfig();
    this.startAdvancedMonitoring();
  }

  /**
   * Initialize query cache configuration
   */
  private initializeQueryCacheConfig(): QueryCacheConfig {
    return {
      enabled: process.env.QUERY_CACHE_ENABLED !== 'false',
      defaultTTL: parseInt(process.env.QUERY_CACHE_TTL || '300'), // 5 minutes
      maxCacheSize: parseInt(process.env.QUERY_CACHE_MAX_SIZE || '1000'),
      cacheKeyPrefix: 'query_result:',
      cachableQueryTypes: ['SELECT'],
      excludePatterns: [
        'NOW()',
        'CURRENT_TIMESTAMP',
        'RANDOM()',
        'pg_stat_',
        'pg_locks',
        'information_schema'
      ]
    };
  }

  /**
   * Start advanced monitoring for query patterns and performance
   */
  private startAdvancedMonitoring(): void {
    // Monitor query patterns every 60 seconds
    setInterval(async () => {
      try {
        await this.analyzeQueryPatterns();
        await this.updateIndexOptimizationPlans();
        await this.cleanupQueryProfiles();
      } catch (error) {
        safeLogger.error('Advanced monitoring error:', error);
      }
    }, 60000);

    // Generate optimization reports every 5 minutes
    setInterval(async () => {
      try {
        await this.generateOptimizationReport();
      } catch (error) {
        safeLogger.error('Optimization report generation error:', error);
      }
    }, 300000);
  }

  /**
   * Execute query with advanced optimization and caching
   */
  async executeOptimizedQuery<T = any>(
    query: string,
    params: any[] = [],
    options: {
      enableCache?: boolean;
      cacheTTL?: number;
      forceOptimization?: boolean;
      explain?: boolean;
      analyze?: boolean;
    } = {}
  ): Promise<{
    rows: T[];
    fromCache: boolean;
    executionTime: number;
    optimizationApplied: boolean;
    cacheKey?: string;
    optimizationDetails?: QueryOptimizationResult;
  }> {
    const queryStartTime = performance.now();
    const queryHash = this.generateQueryHash(query, params);
    
    // Update query profile
    this.updateQueryProfile(queryHash, query);

    // Check cache first if enabled
    if (this.shouldCacheQuery(query) && options.enableCache !== false) {
      const cacheKey = this.generateCacheKey(query, params);
      const cachedResult = await cacheService.get<T[]>(cacheKey);
      
      if (cachedResult) {
        const endTime = performance.now();
        this.updateQueryProfile(queryHash, query, endTime - queryStartTime, true);
        
        return {
          rows: cachedResult,
          fromCache: true,
          executionTime: endTime - queryStartTime,
          optimizationApplied: false,
          cacheKey
        };
      }
    }

    // Apply query optimization
    let optimizedQuery = query;
    let optimizationDetails: QueryOptimizationResult | undefined;
    
    if (options.forceOptimization || this.shouldOptimizeQuery(query, queryHash)) {
      const optimization = await this.optimizeQuery(query, params);
      if (optimization.estimatedImprovement > 0.1) { // 10% improvement threshold
        optimizedQuery = optimization.optimizedQuery;
        optimizationDetails = optimization;
      }
    }

    // Execute the query directly since base optimizer doesn't have executeQuery
    const startTime = performance.now();
    const result = await this.pool.query(optimizedQuery, params);
    const executionTime = performance.now() - startTime;
    
    // Update query profile with execution metrics
    this.updateQueryProfile(queryHash, query, executionTime, false);

    // Cache the result if appropriate
    let cacheKey: string | undefined;
    if (this.shouldCacheQuery(query) && options.enableCache !== false) {
      cacheKey = this.generateCacheKey(query, params);
      const ttl = options.cacheTTL || this.queryCacheConfig.defaultTTL;
      await cacheService.set(cacheKey, result.rows, ttl);
    }

    return {
      rows: result.rows,
      fromCache: false,
      executionTime,
      optimizationApplied: optimizedQuery !== query,
      cacheKey,
      optimizationDetails
    };
  }

  /**
   * Optimize a query using various techniques
   */
  private async optimizeQuery(query: string, params: any[]): Promise<QueryOptimizationResult> {
    const queryHash = this.generateQueryHash(query, params);
    
    // Check optimization cache
    if (this.optimizationCache.has(queryHash)) {
      return this.optimizationCache.get(queryHash)!;
    }

    const techniques: string[] = [];
    let optimizedQuery = query;
    let estimatedImprovement = 0;

    // Apply various optimization techniques
    
    // 1. Add LIMIT if missing for potentially large result sets
    if (this.isSelectQuery(query) && !this.hasLimit(query) && this.mightReturnLargeResultSet(query)) {
      optimizedQuery = this.addDefaultLimit(optimizedQuery);
      techniques.push('Added default LIMIT');
      estimatedImprovement += 0.3;
    }

    // 2. Optimize WHERE clause ordering
    if (this.hasWhereClause(query)) {
      const reorderedQuery = this.optimizeWhereClause(optimizedQuery);
      if (reorderedQuery !== optimizedQuery) {
        optimizedQuery = reorderedQuery;
        techniques.push('Optimized WHERE clause ordering');
        estimatedImprovement += 0.15;
      }
    }

    // 3. Suggest index hints for complex queries
    if (this.isComplexQuery(query)) {
      const withHints = await this.addIndexHints(optimizedQuery);
      if (withHints !== optimizedQuery) {
        optimizedQuery = withHints;
        techniques.push('Added index hints');
        estimatedImprovement += 0.25;
      }
    }

    // 4. Optimize JOIN order
    if (this.hasJoins(query)) {
      const optimizedJoins = this.optimizeJoinOrder(optimizedQuery);
      if (optimizedJoins !== optimizedQuery) {
        optimizedQuery = optimizedJoins;
        techniques.push('Optimized JOIN order');
        estimatedImprovement += 0.2;
      }
    }

    // 5. Convert subqueries to JOINs where beneficial
    if (this.hasSubqueries(query)) {
      const withJoins = this.convertSubqueriesToJoins(optimizedQuery);
      if (withJoins !== optimizedQuery) {
        optimizedQuery = withJoins;
        techniques.push('Converted subqueries to JOINs');
        estimatedImprovement += 0.35;
      }
    }

    // Generate cache recommendation
    const cacheRecommendation = this.generateCacheRecommendation(query, estimatedImprovement);

    const result: QueryOptimizationResult = {
      originalQuery: query,
      optimizedQuery,
      estimatedImprovement,
      optimizationTechniques: techniques,
      cacheRecommendation
    };

    // Cache the optimization result
    this.optimizationCache.set(queryHash, result);
    
    // Limit cache size
    if (this.optimizationCache.size > 500) {
      const firstKey = this.optimizationCache.keys().next().value;
      this.optimizationCache.delete(firstKey);
    }

    return result;
  }

  /**
   * Generate comprehensive index optimization plan for a table
   */
  async generateIndexOptimizationPlan(tableName: string): Promise<IndexOptimizationPlan> {
    if (this.indexOptimizationPlans.has(tableName)) {
      return this.indexOptimizationPlans.get(tableName)!;
    }

    const client = await this.pool.connect();
    
    try {
      // Get current indexes
      const currentIndexes = await this.getCurrentIndexes(client, tableName);
      
      // Analyze query patterns for this table
      const queryPatterns = await this.analyzeTableQueryPatterns(tableName);
      
      // Generate index recommendations
      const recommendedIndexes = await this.generateTableIndexRecommendations(tableName, queryPatterns);
      
      // Identify redundant indexes
      const redundantIndexes = await this.identifyRedundantIndexes(currentIndexes);

      const plan: IndexOptimizationPlan = {
        table: tableName,
        currentIndexes,
        recommendedIndexes,
        redundantIndexes
      };

      this.indexOptimizationPlans.set(tableName, plan);
      return plan;

    } finally {
      client.release();
    }
  }

  /**
   * Get current indexes for a table
   */
  private async getCurrentIndexes(client: PoolClient, tableName: string): Promise<any[]> {
    const result = await client.query(`
      SELECT 
        i.indexname as name,
        array_agg(a.attname ORDER BY a.attnum) as columns,
        am.amname as type,
        pg_size_pretty(pg_relation_size(i.indexrelid)) as size,
        COALESCE(s.idx_scan, 0) as usage
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.indexname
      JOIN pg_am am ON am.oid = c.relam
      LEFT JOIN pg_stat_user_indexes s ON s.indexrelname = i.indexname
      LEFT JOIN pg_index idx ON idx.indexrelid = c.oid
      LEFT JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = ANY(idx.indkey)
      WHERE i.tablename = $1 AND i.schemaname = 'public'
      GROUP BY i.indexname, am.amname, c.oid, s.idx_scan
      ORDER BY usage DESC
    `, [tableName]);

    return result.rows;
  }

  /**
   * Analyze query patterns for a specific table
   */
  private async analyzeTableQueryPatterns(tableName: string): Promise<any[]> {
    const patterns: any[] = [];
    
    // Analyze recent query metrics for patterns involving this table
    const recentMetrics = this.getQueryMetrics(500);
    
    for (const metric of recentMetrics) {
      if (metric.query.toLowerCase().includes(tableName.toLowerCase())) {
        // Extract WHERE conditions
        const whereConditions = this.extractWhereConditions(metric.query);
        
        // Extract ORDER BY clauses
        const orderByColumns = this.extractOrderByColumns(metric.query);
        
        // Extract JOIN conditions
        const joinConditions = this.extractJoinConditions(metric.query);

        patterns.push({
          query: metric.query,
          executionTime: metric.executionTime,
          frequency: 1, // Would be calculated based on query similarity
          whereConditions,
          orderByColumns,
          joinConditions
        });
      }
    }

    return patterns;
  }

  /**
   * Generate index recommendations based on query patterns
   */
  private async generateTableIndexRecommendations(tableName: string, patterns: any[]): Promise<any[]> {
    const recommendations: any[] = [];
    const columnUsage = new Map<string, { count: number, avgExecutionTime: number }>();

    // Analyze column usage patterns
    patterns.forEach(pattern => {
      // Count WHERE clause column usage
      pattern.whereConditions.forEach((col: string) => {
        const usage = columnUsage.get(col) || { count: 0, avgExecutionTime: 0 };
        usage.count++;
        usage.avgExecutionTime = (usage.avgExecutionTime + pattern.executionTime) / 2;
        columnUsage.set(col, usage);
      });

      // Count ORDER BY column usage
      pattern.orderByColumns.forEach((col: string) => {
        const usage = columnUsage.get(col) || { count: 0, avgExecutionTime: 0 };
        usage.count++;
        usage.avgExecutionTime = (usage.avgExecutionTime + pattern.executionTime) / 2;
        columnUsage.set(col, usage);
      });
    });

    // Generate recommendations based on usage
    for (const [column, usage] of columnUsage.entries()) {
      if (usage.count >= 3 && usage.avgExecutionTime > 100) { // Frequently used and slow
        const priority = usage.avgExecutionTime > 1000 ? 'critical' : 
                        usage.avgExecutionTime > 500 ? 'high' : 'medium';
        
        recommendations.push({
          name: `idx_${tableName}_${column}`,
          columns: [column],
          type: 'btree',
          reason: `Column '${column}' used in ${usage.count} queries with avg execution time ${usage.avgExecutionTime.toFixed(2)}ms`,
          priority,
          estimatedBenefit: Math.min(0.8, usage.avgExecutionTime / 1000),
          createStatement: `CREATE INDEX CONCURRENTLY idx_${tableName}_${column} ON ${tableName} (${column});`
        });
      }
    }

    // Generate composite index recommendations
    const compositeOpportunities = this.findCompositeIndexOpportunities(patterns);
    compositeOpportunities.forEach(opportunity => {
      recommendations.push({
        name: `idx_${tableName}_${opportunity.columns.join('_')}`,
        columns: opportunity.columns,
        type: 'btree',
        reason: opportunity.reason,
        priority: opportunity.priority,
        estimatedBenefit: opportunity.estimatedBenefit,
        createStatement: `CREATE INDEX CONCURRENTLY idx_${tableName}_${opportunity.columns.join('_')} ON ${tableName} (${opportunity.columns.join(', ')});`
      });
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Find opportunities for composite indexes
   */
  private findCompositeIndexOpportunities(patterns: any[]): any[] {
    const opportunities: any[] = [];
    const columnCombinations = new Map<string, { count: number, avgExecutionTime: number }>();

    patterns.forEach(pattern => {
      if (pattern.whereConditions.length > 1) {
        const combination = pattern.whereConditions.sort().join(',');
        const usage = columnCombinations.get(combination) || { count: 0, avgExecutionTime: 0 };
        usage.count++;
        usage.avgExecutionTime = (usage.avgExecutionTime + pattern.executionTime) / 2;
        columnCombinations.set(combination, usage);
      }
    });

    for (const [combination, usage] of columnCombinations.entries()) {
      if (usage.count >= 2 && usage.avgExecutionTime > 200) {
        const columns = combination.split(',');
        opportunities.push({
          columns,
          reason: `Composite index for columns frequently used together (${usage.count} queries, avg ${usage.avgExecutionTime.toFixed(2)}ms)`,
          priority: usage.avgExecutionTime > 1000 ? 'high' : 'medium',
          estimatedBenefit: Math.min(0.6, usage.avgExecutionTime / 1500)
        });
      }
    }

    return opportunities;
  }

  /**
   * Identify redundant indexes
   */
  private async identifyRedundantIndexes(currentIndexes: any[]): Promise<any[]> {
    const redundant: any[] = [];

    // Find unused indexes
    currentIndexes.forEach(index => {
      if (index.usage === 0 && !index.name.includes('_pkey') && !index.name.includes('_unique')) {
        redundant.push({
          name: index.name,
          reason: 'Index is never used',
          dropStatement: `DROP INDEX CONCURRENTLY ${index.name};`
        });
      }
    });

    // Find duplicate indexes (same columns, different names)
    const columnSignatures = new Map<string, string[]>();
    currentIndexes.forEach(index => {
      const signature = index.columns.sort().join(',');
      if (!columnSignatures.has(signature)) {
        columnSignatures.set(signature, []);
      }
      columnSignatures.get(signature)!.push(index.name);
    });

    columnSignatures.forEach((indexNames, signature) => {
      if (indexNames.length > 1) {
        // Keep the most used one, mark others as redundant
        const indexUsage = indexNames.map(name => {
          const index = currentIndexes.find(idx => idx.name === name);
          return { name, usage: index?.usage || 0 };
        }).sort((a, b) => b.usage - a.usage);

        indexUsage.slice(1).forEach(index => {
          redundant.push({
            name: index.name,
            reason: `Duplicate index with same columns as ${indexUsage[0].name}`,
            dropStatement: `DROP INDEX CONCURRENTLY ${index.name};`
          });
        });
      }
    });

    return redundant;
  }

  /**
   * Update query performance profile
   */
  private updateQueryProfile(queryHash: string, query: string, executionTime?: number, fromCache: boolean = false): void {
    let profile = this.queryProfiles.get(queryHash);
    
    if (!profile) {
      profile = {
        queryHash,
        executionCount: 0,
        totalExecutionTime: 0,
        averageExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        lastExecuted: new Date(),
        cacheHitRate: 0,
        optimizationApplied: false
      };
      this.queryProfiles.set(queryHash, profile);
    }

    profile.executionCount++;
    profile.lastExecuted = new Date();

    if (executionTime !== undefined) {
      profile.totalExecutionTime += executionTime;
      profile.averageExecutionTime = profile.totalExecutionTime / profile.executionCount;
      profile.minExecutionTime = Math.min(profile.minExecutionTime, executionTime);
      profile.maxExecutionTime = Math.max(profile.maxExecutionTime, executionTime);
    }

    if (fromCache) {
      const cacheHits = (profile.cacheHitRate || 0) * (profile.executionCount - 1) + 1;
      profile.cacheHitRate = cacheHits / profile.executionCount;
    }
  }

  /**
   * Generate cache recommendation for a query
   */
  private generateCacheRecommendation(query: string, estimatedImprovement: number): any {
    if (!this.shouldCacheQuery(query)) {
      return { shouldCache: false, ttl: 0, cacheKey: '' };
    }

    // Determine TTL based on query characteristics
    let ttl = this.queryCacheConfig.defaultTTL;
    
    if (query.toLowerCase().includes('order by created_at desc')) {
      ttl = 60; // Short TTL for time-sensitive data
    } else if (query.toLowerCase().includes('categories') || query.toLowerCase().includes('static')) {
      ttl = 3600; // Longer TTL for relatively static data
    }

    return {
      shouldCache: true,
      ttl,
      cacheKey: this.generateCacheKey(query, [])
    };
  }

  /**
   * Analyze query patterns for optimization opportunities
   */
  private async analyzeQueryPatterns(): Promise<void> {
    const patterns = new Map<string, number>();
    
    // Group similar queries
    this.queryProfiles.forEach(profile => {
      const normalizedQuery = this.normalizeQueryForPatternAnalysis(profile.queryHash);
      patterns.set(normalizedQuery, (patterns.get(normalizedQuery) || 0) + profile.executionCount);
    });

    // Identify frequently executed patterns that might benefit from optimization
    patterns.forEach((frequency, pattern) => {
      if (frequency >= 10) { // Executed at least 10 times
        // This pattern is frequently used, consider creating a materialized view or optimizing
        safeLogger.info(`Frequent query pattern detected: ${pattern} (${frequency} executions)`);
      }
    });
  }

  /**
   * Update index optimization plans for all tables
   */
  private async updateIndexOptimizationPlans(): Promise<void> {
    const tables = ['users', 'posts', 'products', 'communities', 'orders', 'sellers'];
    
    for (const table of tables) {
      try {
        await this.generateIndexOptimizationPlan(table);
      } catch (error) {
        safeLogger.error(`Failed to update optimization plan for table ${table}:`, error);
      }
    }
  }

  /**
   * Clean up old query profiles
   */
  private cleanupQueryProfiles(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [hash, profile] of this.queryProfiles.entries()) {
      if (profile.lastExecuted < cutoffTime) {
        this.queryProfiles.delete(hash);
      }
    }
  }

  /**
   * Generate optimization report
   */
  private async generateOptimizationReport(): Promise<void> {
    const report = {
      timestamp: new Date(),
      totalQueries: this.queryProfiles.size,
      slowQueries: Array.from(this.queryProfiles.values()).filter(p => p.averageExecutionTime > 500).length,
      cacheHitRate: this.calculateOverallCacheHitRate(),
      topSlowQueries: this.getTopSlowQueries(5),
      indexRecommendations: this.getAllIndexRecommendations(),
      optimizationOpportunities: this.getOptimizationOpportunities()
    };

    // Log the report (in production, this might be sent to a monitoring service)
    safeLogger.info('Database Optimization Report:', JSON.stringify(report, null, 2));
  }

  /**
   * Calculate overall cache hit rate
   */
  private calculateOverallCacheHitRate(): number {
    let totalQueries = 0;
    let totalCacheHits = 0;

    this.queryProfiles.forEach(profile => {
      totalQueries += profile.executionCount;
      totalCacheHits += (profile.cacheHitRate || 0) * profile.executionCount;
    });

    return totalQueries > 0 ? totalCacheHits / totalQueries : 0;
  }

  /**
   * Get top slow queries
   */
  private getTopSlowQueries(limit: number): any[] {
    return Array.from(this.queryProfiles.values())
      .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime)
      .slice(0, limit)
      .map(profile => ({
        queryHash: profile.queryHash,
        averageExecutionTime: profile.averageExecutionTime,
        executionCount: profile.executionCount,
        cacheHitRate: profile.cacheHitRate
      }));
  }

  /**
   * Get all index recommendations
   */
  private getAllIndexRecommendations(): any[] {
    const recommendations: any[] = [];
    
    this.indexOptimizationPlans.forEach(plan => {
      recommendations.push(...plan.recommendedIndexes);
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get optimization opportunities
   */
  private getOptimizationOpportunities(): any[] {
    const opportunities: any[] = [];
    
    this.optimizationCache.forEach(optimization => {
      if (optimization.estimatedImprovement > 0.2) { // 20% improvement
        opportunities.push({
          originalQuery: optimization.originalQuery.substring(0, 100) + '...',
          estimatedImprovement: optimization.estimatedImprovement,
          techniques: optimization.optimizationTechniques
        });
      }
    });

    return opportunities;
  }

  // Utility methods for query analysis
  private generateQueryHash(query: string, params: any[]): string {
    const crypto = require('crypto');
    const normalized = this.normalizeQueryString(query);
    return crypto.createHash('md5').update(normalized + JSON.stringify(params)).digest('hex');
  }

  private generateCacheKey(query: string, params: any[]): string {
    return this.queryCacheConfig.cacheKeyPrefix + this.generateQueryHash(query, params);
  }

  private shouldCacheQuery(query: string): boolean {
    if (!this.queryCacheConfig.enabled) return false;
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Only cache SELECT queries
    if (!this.queryCacheConfig.cachableQueryTypes.some(type => 
      normalizedQuery.startsWith(type.toLowerCase())
    )) {
      return false;
    }

    // Exclude queries with non-cacheable patterns
    return !this.queryCacheConfig.excludePatterns.some(pattern => 
      normalizedQuery.includes(pattern.toLowerCase())
    );
  }

  private shouldOptimizeQuery(query: string, queryHash: string): boolean {
    const profile = this.queryProfiles.get(queryHash);
    
    // Optimize if query is slow or frequently executed
    return !profile?.optimizationApplied && (
      (profile?.averageExecutionTime || 0) > 500 || // Slow queries
      (profile?.executionCount || 0) > 5 // Frequently executed queries
    );
  }

  private normalizeQueryForPatternAnalysis(queryHash: string): string {
    // This would normalize queries to identify patterns
    // For now, return the hash as-is
    return queryHash;
  }

  /**
   * Override the base class normalizeQuery method to make it accessible
   */
  protected normalizeQueryString(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?')
      .replace(/\d+/g, 'N')
      .replace(/'[^']*'/g, "'?'")
      .trim()
      .toLowerCase();
  }

  // Query optimization helper methods
  private isSelectQuery(query: string): boolean {
    return query.toLowerCase().trim().startsWith('select');
  }

  private hasLimit(query: string): boolean {
    return query.toLowerCase().includes('limit');
  }

  private mightReturnLargeResultSet(query: string): boolean {
    const normalizedQuery = query.toLowerCase();
    return normalizedQuery.includes('posts') || 
           normalizedQuery.includes('users') || 
           normalizedQuery.includes('products') ||
           normalizedQuery.includes('communities');
  }

  private addDefaultLimit(query: string): string {
    if (query.toLowerCase().includes('count(')) return query;
    return query.trim().replace(/;?\s*$/, ' LIMIT 1000;');
  }

  private hasWhereClause(query: string): boolean {
    return query.toLowerCase().includes('where');
  }

  private optimizeWhereClause(query: string): string {
    // This would reorder WHERE conditions for optimal index usage
    // For now, return the query as-is
    return query;
  }

  private isComplexQuery(query: string): boolean {
    const normalizedQuery = query.toLowerCase();
    return normalizedQuery.includes('join') || 
           normalizedQuery.includes('subquery') ||
           normalizedQuery.includes('union') ||
           (normalizedQuery.match(/select/g) || []).length > 1;
  }

  private async addIndexHints(query: string): Promise<string> {
    // PostgreSQL doesn't support index hints like MySQL
    // This would analyze the query and suggest restructuring
    return query;
  }

  private hasJoins(query: string): boolean {
    return query.toLowerCase().includes('join');
  }

  private optimizeJoinOrder(query: string): string {
    // This would analyze and optimize JOIN order
    // For now, return the query as-is
    return query;
  }

  private hasSubqueries(query: string): boolean {
    const normalizedQuery = query.toLowerCase();
    return normalizedQuery.includes('exists') || 
           normalizedQuery.includes('in (select') ||
           (normalizedQuery.match(/select/g) || []).length > 1;
  }

  private convertSubqueriesToJoins(query: string): string {
    // This would convert appropriate subqueries to JOINs
    // For now, return the query as-is
    return query;
  }

  private extractWhereConditions(query: string): string[] {
    const conditions: string[] = [];
    const whereMatch = query.toLowerCase().match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|$)/);
    
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const columnMatches = whereClause.match(/(\w+)\s*[=<>!]/g);
      
      if (columnMatches) {
        columnMatches.forEach(match => {
          const column = match.replace(/\s*[=<>!].*/, '').trim();
          if (!conditions.includes(column)) {
            conditions.push(column);
          }
        });
      }
    }

    return conditions;
  }

  private extractOrderByColumns(query: string): string[] {
    const columns: string[] = [];
    const orderByMatch = query.toLowerCase().match(/order\s+by\s+(.+?)(?:\s+limit|$)/);
    
    if (orderByMatch) {
      const orderByClause = orderByMatch[1];
      const columnMatches = orderByClause.split(',');
      
      columnMatches.forEach(match => {
        const column = match.trim().replace(/\s+(asc|desc)$/i, '').trim();
        if (!columns.includes(column)) {
          columns.push(column);
        }
      });
    }

    return columns;
  }

  private extractJoinConditions(query: string): string[] {
    const conditions: string[] = [];
    const joinMatches = query.toLowerCase().match(/join\s+\w+\s+on\s+(.+?)(?:\s+join|\s+where|\s+order|\s+group|$)/g);
    
    if (joinMatches) {
      joinMatches.forEach(joinMatch => {
        const onMatch = joinMatch.match(/on\s+(.+)$/);
        if (onMatch) {
          conditions.push(onMatch[1].trim());
        }
      });
    }

    return conditions;
  }

  /**
   * Get query performance profiles
   */
  getQueryProfiles(): QueryPerformanceProfile[] {
    return Array.from(this.queryProfiles.values());
  }

  /**
   * Get index optimization plans
   */
  getIndexOptimizationPlans(): IndexOptimizationPlan[] {
    return Array.from(this.indexOptimizationPlans.values());
  }

  /**
   * Execute all recommended index optimizations for a table
   */
  async executeIndexOptimizations(tableName: string): Promise<{
    created: number;
    dropped: number;
    errors: string[];
  }> {
    const plan = await this.generateIndexOptimizationPlan(tableName);
    const results = { created: 0, dropped: 0, errors: [] };

    // Create recommended indexes
    for (const recommendation of plan.recommendedIndexes) {
      try {
        const indexRec: IndexRecommendation = {
          table: tableName,
          columns: recommendation.columns,
          type: recommendation.type as 'btree' | 'hash' | 'gin' | 'gist',
          reason: recommendation.reason,
          estimatedImprovement: recommendation.estimatedBenefit,
          priority: recommendation.priority as 'high' | 'medium' | 'low',
          createStatement: recommendation.createStatement
        };
        // Execute index creation directly since base optimizer doesn't have createIndex
        const client = await this.pool.connect();
        try {
          await client.query(recommendation.createStatement);
          results.created++;
        } finally {
          client.release();
        }
      } catch (error) {
        results.errors.push(`Failed to create index ${recommendation.name}: ${error}`);
      }
    }

    // Drop redundant indexes
    for (const redundant of plan.redundantIndexes) {
      try {
        const client = await this.pool.connect();
        await client.query(redundant.dropStatement);
        client.release();
        results.dropped++;
      } catch (error) {
        results.errors.push(`Failed to drop index ${redundant.name}: ${error}`);
      }
    }

    return results;
  }
  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    // TODO: Call base optimizer stopMonitoring when method is added
    // this.baseOptimizer.stopMonitoring();
  }

  /**
   * Delegate methods to base optimizer (stubbed - methods don't exist on base)
   */
  async getDatabaseStats() {
    // TODO: Implement when base optimizer has this method
    return {};
  }

  getQueryMetrics(limit?: number): QueryPerformanceMetrics[] {
    // TODO: Implement when base optimizer has this method
    return [];
  }

  getIndexRecommendations(): IndexRecommendation[] {
    // TODO: Implement when base optimizer has this method
    return [];
  }

  getSlowQueries(threshold?: number, limit?: number): QueryPerformanceMetrics[] {
    // TODO: Implement when base optimizer has this method
    return [];
  }
}

export default EnhancedDatabaseOptimizationService;
