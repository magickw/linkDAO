import { Request, Response, NextFunction } from 'express';
import { dataOperationMonitoringService } from '../services/dataOperationMonitoringService';
import { logger } from '../utils/logger';

// Extend Request interface to include tracking data
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
      operationId?: string;
    }
  }
}

// Middleware to track API operations
export function trackAPIOperations(req: Request, res: Response, next: NextFunction): void {
  // Generate unique operation ID
  req.operationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any, cb?: any) {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    // Record API request metrics
    dataOperationMonitoringService.recordAPIRequest(
      req.method,
      req.route?.path || req.path,
      responseTime,
      res.statusCode,
      res.locals.error
    );

    // Log request completion
    logger.info(`API Request Completed: ${req.method} ${req.path}`, {
      operationId: req.operationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      error: res.locals.error ? {
        message: res.locals.error.message,
        stack: res.locals.error.stack
      } : undefined
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding, cb);
  };

  // Log request start
  logger.info(`API Request Started: ${req.method} ${req.path}`, {
    operationId: req.operationId,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  next();
}

// Database query tracking wrapper
export class DatabaseQueryTracker {
  private static instance: DatabaseQueryTracker;

  static getInstance(): DatabaseQueryTracker {
    if (!DatabaseQueryTracker.instance) {
      DatabaseQueryTracker.instance = new DatabaseQueryTracker();
    }
    return DatabaseQueryTracker.instance;
  }

  // Wrap database query execution
  async trackQuery<T>(
    queryType: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION',
    queryFn: () => Promise<T>,
    table?: string,
    connectionInfo?: { total: number; active: number }
  ): Promise<T> {
    const startTime = Date.now();
    let error: any = null;
    let result: T;

    try {
      result = await queryFn();
      return result;
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const executionTime = Date.now() - startTime;
      
      // Record the query metrics
      dataOperationMonitoringService.recordDatabaseQuery(
        queryType,
        operation,
        executionTime,
        table,
        error,
        connectionInfo
      );
    }
  }

  // Track Drizzle ORM queries
  wrapDrizzleQuery<T>(
    db: any,
    queryBuilder: any,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    table?: string
  ): Promise<T> {
    const queryType = this.extractQueryType(queryBuilder);
    
    return this.trackQuery(
      queryType,
      operation,
      () => queryBuilder.execute ? queryBuilder.execute() : queryBuilder,
      table
    );
  }

  // Extract query type from query builder (simplified)
  private extractQueryType(queryBuilder: any): string {
    if (queryBuilder.toSQL) {
      const sql = queryBuilder.toSQL();
      return this.parseQueryType(sql.sql);
    }
    return 'unknown';
  }

  // Parse SQL to determine query type
  private parseQueryType(sql: string): string {
    const normalizedSql = sql.trim().toLowerCase();
    
    if (normalizedSql.startsWith('select')) {
      if (normalizedSql.includes('join')) return 'SELECT_JOIN';
      if (normalizedSql.includes('where')) return 'SELECT_WHERE';
      if (normalizedSql.includes('order by')) return 'SELECT_ORDER';
      if (normalizedSql.includes('group by')) return 'SELECT_GROUP';
      return 'SELECT_SIMPLE';
    }
    
    if (normalizedSql.startsWith('insert')) {
      if (normalizedSql.includes('on conflict') || normalizedSql.includes('on duplicate')) {
        return 'INSERT_UPSERT';
      }
      return 'INSERT';
    }
    
    if (normalizedSql.startsWith('update')) {
      if (normalizedSql.includes('join')) return 'UPDATE_JOIN';
      return 'UPDATE';
    }
    
    if (normalizedSql.startsWith('delete')) {
      if (normalizedSql.includes('join')) return 'DELETE_JOIN';
      return 'DELETE';
    }
    
    if (normalizedSql.startsWith('begin') || normalizedSql.startsWith('commit') || normalizedSql.startsWith('rollback')) {
      return 'TRANSACTION';
    }
    
    return 'OTHER';
  }
}

// Export singleton instance
export const databaseQueryTracker = DatabaseQueryTracker.getInstance();

// Utility function to track custom database operations
export async function trackDatabaseOperation<T>(
  operationName: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION',
  operationFn: () => Promise<T>,
  table?: string
): Promise<T> {
  return databaseQueryTracker.trackQuery(
    operationName,
    operation,
    operationFn,
    table
  );
}

// Error tracking middleware
export function trackErrors(err: any, req: Request, res: Response, next: NextFunction): void {
  // Store error in res.locals for the API tracking middleware
  res.locals.error = err;

  // Log the error with operation context
  logger.error(`API Error: ${req.method} ${req.path}`, {
    operationId: req.operationId,
    error: {
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode || 500
    },
    request: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type')
      }
    }
  });

  next(err);
}

// Middleware to track slow operations
export function trackSlowOperations(thresholdMs: number = 5000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      logger.warn(`Slow operation detected: ${req.method} ${req.path}`, {
        operationId: req.operationId,
        method: req.method,
        path: req.path,
        duration: Date.now() - (req.startTime || Date.now()),
        threshold: thresholdMs
      });
    }, thresholdMs);

    // Clear timeout when response ends
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, cb?: any) {
      clearTimeout(timeout);
      return originalEnd.call(this, chunk, encoding, cb);
    };

    next();
  };
}

// Connection pool monitoring (for use with database connections)
export class ConnectionPoolMonitor {
  private poolStats: Map<string, { total: number; active: number; idle: number }> = new Map();

  updatePoolStats(poolName: string, stats: { total: number; active: number; idle: number }): void {
    this.poolStats.set(poolName, stats);
    
    // Check for connection pool alerts
    const usage = (stats.active / stats.total) * 100;
    
    if (usage > 90) {
      logger.warn(`High connection pool usage: ${poolName}`, {
        poolName,
        usage: `${usage.toFixed(1)}%`,
        active: stats.active,
        total: stats.total,
        idle: stats.idle
      });
    }
  }

  getPoolStats(poolName?: string): Map<string, { total: number; active: number; idle: number }> | { total: number; active: number; idle: number } | undefined {
    if (poolName) {
      return this.poolStats.get(poolName);
    }
    return this.poolStats;
  }

  // Get connection info for database tracking
  getConnectionInfo(poolName: string = 'default'): { total: number; active: number } | undefined {
    const stats = this.poolStats.get(poolName);
    if (stats) {
      return {
        total: stats.total,
        active: stats.active
      };
    }
    return undefined;
  }
}

// Export singleton instance
export const connectionPoolMonitor = new ConnectionPoolMonitor();

// Utility to create a comprehensive tracking middleware stack
export function createDataOperationTrackingStack() {
  return [
    trackAPIOperations,
    trackSlowOperations(5000), // 5 second threshold
    trackErrors
  ];
}