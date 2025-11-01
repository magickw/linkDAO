import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { Pool } from 'pg';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';

interface QueryOptimizationOptions {
  enableQueryLogging?: boolean;
  slowQueryThreshold?: number;
  enableIndexHints?: boolean;
  enableQueryPlan?: boolean;
  cacheQueryPlans?: boolean;
}

interface DatabaseMetrics {
  totalQueries: number;
  slowQueries: number;
  averageQueryTime: number;
  connectionPoolUtilization: number;
  cacheHitRatio: number;
}

/**
 * Database Optimization Middleware
 * Implements task 9.2: Add database query optimization with proper indexing
 */
export class DatabaseOptimizationMiddleware {
  private pool: Pool;
  private options: QueryOptimizationOptions;
  private metrics: DatabaseMetrics;
  private queryTimes: number[] = [];
  private queryPlansCache: Map<string, any> = new Map();

  constructor(pool: Pool, options: QueryOptimizationOptions = {}) {
    this.pool = pool;
    this.options = {
      enableQueryLogging: options.enableQueryLogging ?? true,
      slowQueryThreshold: options.slowQueryThreshold ?? 1000, // 1 second
      enableIndexHints: options.enableIndexHints ?? true,
      enableQueryPlan: options.enableQueryPlan ?? false,
      cacheQueryPlans: options.cacheQueryPlans ?? true,
      ...options
    };

    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      connectionPoolUtilization: 0,
      cacheHitRatio: 0
    };
  }

  /**
   * Main database optimization middleware
   */
  optimize() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add optimized database query method to request
      req.db = {
        query: this.createOptimizedQuery(req),
        transaction: this.createOptimizedTransaction(req),
        getMetrics: () => this.getMetrics(),
        analyzeQuery: this.analyzeQuery.bind(this)
      };

      // Update connection pool metrics
      this.updatePoolMetrics();

      next();
    };
  }

  /**
   * Create optimized query function
   */
  private createOptimizedQuery(req: Request) {
    return async <T = any>(
      query: string, 
      params: any[] = [], 
      options: {
        cache?: boolean;
        cacheKey?: string;
        cacheTTL?: number;
        explain?: boolean;
        timeout?: number;
      } = {}
    ): Promise<{ rows: T[]; metrics: any }> => {
      const startTime = performance.now();
      const client = await this.pool.connect();

      try {
        // Apply query optimizations
        const optimizedQuery = this.optimizeQuery(query);
        
        // Set query timeout if specified
        if (options.timeout) {
          await client.query(`SET statement_timeout = ${options.timeout}`);
        }

        // Execute query with optional EXPLAIN
        let result;
        let queryPlan;

        if (options.explain || this.options.enableQueryPlan) {
          // Get query plan first
          try {
            const explainResult = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${optimizedQuery}`, params);
            queryPlan = explainResult.rows[0]['QUERY PLAN'][0];
          } catch (error) {
            // If EXPLAIN fails, continue without it
            safeLogger.warn('Failed to get query plan:', error);
          }
        }

        // Execute the actual query
        result = await client.query(optimizedQuery, params);

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        // Update metrics
        this.updateQueryMetrics(executionTime, query);

        // Log slow queries
        if (executionTime > this.options.slowQueryThreshold!) {
          this.logSlowQuery(query, params, executionTime, queryPlan);
        }

        // Cache query plan if enabled
        if (queryPlan && this.options.cacheQueryPlans) {
          const queryHash = this.hashQuery(query);
          this.queryPlansCache.set(queryHash, queryPlan);
        }

        return {
          rows: result.rows,
          metrics: {
            executionTime,
            rowCount: result.rowCount,
            queryPlan,
            connectionId: (client as any).processID
          }
        };

      } finally {
        client.release();
      }
    };
  }

  /**
   * Create optimized transaction function
   */
  private createOptimizedTransaction(req: Request) {
    return async <T>(
      callback: (client: any) => Promise<T>,
      options: {
        isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
        timeout?: number;
      } = {}
    ): Promise<T> => {
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Set isolation level if specified
        if (options.isolationLevel) {
          await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
        }

        // Set transaction timeout if specified
        if (options.timeout) {
          await client.query(`SET statement_timeout = ${options.timeout}`);
        }

        // Create optimized query function for transaction
        const transactionQuery = async (query: string, params: any[] = []) => {
          const startTime = performance.now();
          const optimizedQuery = this.optimizeQuery(query);
          const result = await client.query(optimizedQuery, params);
          const endTime = performance.now();
          
          this.updateQueryMetrics(endTime - startTime, query);
          return result;
        };

        const result = await callback({ query: transactionQuery });
        await client.query('COMMIT');
        
        return result;

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    };
  }

  /**
   * Optimize query with various techniques
   */
  private optimizeQuery(query: string): string {
    let optimizedQuery = query;

    if (!this.options.enableIndexHints) {
      return optimizedQuery;
    }

    // Add query optimizations based on patterns
    optimizedQuery = this.addIndexHints(optimizedQuery);
    optimizedQuery = this.optimizeJoins(optimizedQuery);
    optimizedQuery = this.optimizeWhereClause(optimizedQuery);

    return optimizedQuery;
  }

  /**
   * Add index hints to queries
   */
  private addIndexHints(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Common index hints for marketplace queries
    const indexHints = [
      {
        pattern: /select.*from\s+products\s+where\s+category\s*=/i,
        hint: '/*+ INDEX(products idx_products_category) */'
      },
      {
        pattern: /select.*from\s+products\s+where\s+seller_id\s*=/i,
        hint: '/*+ INDEX(products idx_products_seller_id) */'
      },
      {
        pattern: /select.*from\s+orders\s+where\s+user_id\s*=/i,
        hint: '/*+ INDEX(orders idx_orders_user_id) */'
      },
      {
        pattern: /select.*from\s+users\s+where\s+wallet_address\s*=/i,
        hint: '/*+ INDEX(users idx_users_wallet_address) */'
      }
    ];

    for (const { pattern, hint } of indexHints) {
      if (pattern.test(query)) {
        return query.replace(/select/i, `SELECT ${hint}`);
      }
    }

    return query;
  }

  /**
   * Optimize JOIN operations
   */
  private optimizeJoins(query: string): string {
    // Convert implicit joins to explicit joins where possible
    let optimizedQuery = query;

    // Example: Convert WHERE table1.id = table2.id to INNER JOIN
    const implicitJoinPattern = /FROM\s+(\w+)\s*,\s*(\w+)\s+WHERE\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/gi;
    
    optimizedQuery = optimizedQuery.replace(implicitJoinPattern, (match, table1, table2, t1, col1, t2, col2) => {
      return `FROM ${table1} INNER JOIN ${table2} ON ${t1}.${col1} = ${t2}.${col2} WHERE`;
    });

    return optimizedQuery;
  }

  /**
   * Optimize WHERE clause
   */
  private optimizeWhereClause(query: string): string {
    let optimizedQuery = query;

    // Move most selective conditions first
    // This is a simplified example - in practice, you'd need query statistics
    const selectiveColumns = ['id', 'wallet_address', 'email', 'product_id', 'order_id'];
    
    // Reorder WHERE conditions to put selective ones first
    const whereMatch = optimizedQuery.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+GROUP|\s+LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const conditions = whereClause.split(/\s+AND\s+/i);
      
      // Sort conditions by selectivity (simplified heuristic)
      conditions.sort((a, b) => {
        const aSelective = selectiveColumns.some(col => a.toLowerCase().includes(col));
        const bSelective = selectiveColumns.some(col => b.toLowerCase().includes(col));
        
        if (aSelective && !bSelective) return -1;
        if (!aSelective && bSelective) return 1;
        return 0;
      });

      const optimizedWhere = conditions.join(' AND ');
      optimizedQuery = optimizedQuery.replace(whereMatch[0], `WHERE ${optimizedWhere}`);
    }

    return optimizedQuery;
  }

  /**
   * Analyze query performance
   */
  private async analyzeQuery(query: string, params: any[] = []): Promise<{
    plan: any;
    recommendations: string[];
    estimatedCost: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get detailed query plan
      const explainResult = await client.query(
        `EXPLAIN (ANALYZE, BUFFERS, COSTS, VERBOSE, FORMAT JSON) ${query}`, 
        params
      );
      
      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      const recommendations = this.generateQueryRecommendations(plan);
      const estimatedCost = plan['Total Cost'] || 0;

      return {
        plan,
        recommendations,
        estimatedCost
      };

    } finally {
      client.release();
    }
  }

  /**
   * Generate query optimization recommendations
   */
  private generateQueryRecommendations(plan: any): string[] {
    const recommendations: string[] = [];

    // Analyze plan for common issues
    const planText = JSON.stringify(plan).toLowerCase();

    if (planText.includes('seq scan')) {
      recommendations.push('Consider adding indexes to avoid sequential scans');
    }

    if (planText.includes('sort') && !planText.includes('index')) {
      recommendations.push('Consider adding indexes for ORDER BY clauses');
    }

    if (planText.includes('hash join') && plan['Total Cost'] > 1000) {
      recommendations.push('Consider optimizing JOIN conditions or adding indexes');
    }

    if (planText.includes('nested loop') && plan['Actual Rows'] > 1000) {
      recommendations.push('Nested loop with many rows - consider different JOIN strategy');
    }

    if (plan['Actual Time'] && plan['Actual Time'] > 1000) {
      recommendations.push('Query execution time is high - consider query optimization');
    }

    return recommendations;
  }

  /**
   * Update query metrics
   */
  private updateQueryMetrics(executionTime: number, query: string): void {
    this.metrics.totalQueries++;
    this.queryTimes.push(executionTime);

    // Keep only recent query times
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }

    // Update average query time
    const sum = this.queryTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageQueryTime = sum / this.queryTimes.length;

    // Count slow queries
    if (executionTime > this.options.slowQueryThreshold!) {
      this.metrics.slowQueries++;
    }
  }

  /**
   * Update connection pool metrics
   */
  private updatePoolMetrics(): void {
    const totalConnections = this.pool.totalCount;
    const idleConnections = this.pool.idleCount;
    const activeConnections = totalConnections - idleConnections;

    this.metrics.connectionPoolUtilization = totalConnections > 0 
      ? (activeConnections / totalConnections) * 100 
      : 0;
  }

  /**
   * Log slow query
   */
  private logSlowQuery(query: string, params: any[], executionTime: number, queryPlan?: any): void {
    if (!this.options.enableQueryLogging) return;

    safeLogger.warn('Slow Query Detected:', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      params: params.length > 0 ? params : undefined,
      executionTime: `${executionTime.toFixed(2)}ms`,
      queryPlan: queryPlan ? {
        totalCost: queryPlan['Total Cost'],
        actualTime: queryPlan['Actual Time'],
        planRows: queryPlan['Plan Rows'],
        actualRows: queryPlan['Actual Rows']
      } : undefined
    });
  }

  /**
   * Hash query for caching
   */
  private hashQuery(query: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
  }

  /**
   * Get database metrics
   */
  getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  /**
   * Get slow queries report
   */
  getSlowQueriesReport(): {
    totalSlowQueries: number;
    slowQueryRate: number;
    averageSlowQueryTime: number;
    recommendations: string[];
  } {
    const slowQueryTimes = this.queryTimes.filter(time => time > this.options.slowQueryThreshold!);
    const slowQueryRate = this.metrics.totalQueries > 0 
      ? this.metrics.slowQueries / this.metrics.totalQueries 
      : 0;

    const averageSlowQueryTime = slowQueryTimes.length > 0
      ? slowQueryTimes.reduce((a, b) => a + b, 0) / slowQueryTimes.length
      : 0;

    const recommendations: string[] = [];

    if (slowQueryRate > 0.1) { // More than 10% slow queries
      recommendations.push('High percentage of slow queries detected - review query optimization');
    }

    if (averageSlowQueryTime > 5000) { // Average slow query > 5 seconds
      recommendations.push('Very slow queries detected - consider database schema optimization');
    }

    if (this.metrics.connectionPoolUtilization > 90) {
      recommendations.push('High connection pool utilization - consider increasing pool size');
    }

    return {
      totalSlowQueries: this.metrics.slowQueries,
      slowQueryRate,
      averageSlowQueryTime,
      recommendations
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      connectionPoolUtilization: 0,
      cacheHitRatio: 0
    };
    this.queryTimes = [];
  }
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      db?: {
        query: <T = any>(
          query: string, 
          params?: any[], 
          options?: {
            cache?: boolean;
            cacheKey?: string;
            cacheTTL?: number;
            explain?: boolean;
            timeout?: number;
          }
        ) => Promise<{ rows: T[]; metrics: any }>;
        transaction: <T>(
          callback: (client: any) => Promise<T>,
          options?: {
            isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
            timeout?: number;
          }
        ) => Promise<T>;
        getMetrics: () => DatabaseMetrics;
        analyzeQuery: (query: string, params?: any[]) => Promise<{
          plan: any;
          recommendations: string[];
          estimatedCost: number;
        }>;
      };
    }
  }
}

export default DatabaseOptimizationMiddleware;