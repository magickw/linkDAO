import { logger } from '../../utils/logger';
import { performanceMonitoringService } from '../performanceMonitoringService';

// Database operation metrics
interface DatabaseMetrics {
  queryCount: number;
  slowQueryCount: number;
  errorCount: number;
  averageQueryTime: number;
  maxQueryTime: number;
  minQueryTime: number;
  connectionCount: number;
  activeConnections: number;
  lastUpdated: Date;
}

interface QueryMetrics extends DatabaseMetrics {
  queryType: string;
  table?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION';
}

interface APIEndpointMetrics {
  endpoint: string;
  method: string;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorRate: number;
  statusCodes: Record<number, number>;
  lastUpdated: Date;
}

interface DataOperationAlert {
  id: string;
  type: 'database_slow_query' | 'database_error' | 'api_error_rate' | 'api_slow_response' | 'connection_pool_exhausted';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: any;
  resolved?: Date;
}

interface DataOperationMetrics {
  database: {
    overall: DatabaseMetrics;
    queries: Map<string, QueryMetrics>;
    tables: Map<string, DatabaseMetrics>;
  };
  api: {
    endpoints: Map<string, APIEndpointMetrics>;
  };
  alerts: DataOperationAlert[];
}

class DataOperationMonitoringService {
  private metrics: DataOperationMetrics = {
    database: {
      overall: this.createEmptyDatabaseMetrics(),
      queries: new Map(),
      tables: new Map()
    },
    api: {
      endpoints: new Map()
    },
    alerts: []
  };

  private readonly THRESHOLDS = {
    SLOW_QUERY_MS: 1000,
    VERY_SLOW_QUERY_MS: 5000,
    HIGH_ERROR_RATE: 0.05, // 5%
    CRITICAL_ERROR_RATE: 0.1, // 10%
    SLOW_API_RESPONSE_MS: 2000,
    VERY_SLOW_API_RESPONSE_MS: 5000,
    CONNECTION_POOL_WARNING: 80, // 80% of max connections
    CONNECTION_POOL_CRITICAL: 95, // 95% of max connections
    MAX_ALERTS: 500
  };

  private createEmptyDatabaseMetrics(): DatabaseMetrics {
    return {
      queryCount: 0,
      slowQueryCount: 0,
      errorCount: 0,
      averageQueryTime: 0,
      maxQueryTime: 0,
      minQueryTime: Infinity,
      connectionCount: 0,
      activeConnections: 0,
      lastUpdated: new Date()
    };
  }

  // Record database query performance
  recordDatabaseQuery(
    queryType: string,
    operation: QueryMetrics['operation'],
    executionTime: number,
    table?: string,
    error?: any,
    connectionInfo?: { total: number; active: number }
  ): void {
    const isSlowQuery = executionTime > this.THRESHOLDS.SLOW_QUERY_MS;
    const hasError = !!error;

    // Update overall database metrics
    this.updateDatabaseMetrics(this.metrics.database.overall, executionTime, isSlowQuery, hasError, connectionInfo);

    // Update query-specific metrics
    const queryKey = `${operation}_${queryType}`;
    if (!this.metrics.database.queries.has(queryKey)) {
      this.metrics.database.queries.set(queryKey, {
        ...this.createEmptyDatabaseMetrics(),
        queryType,
        operation
      });
    }

    const queryMetrics = this.metrics.database.queries.get(queryKey)!;
    this.updateDatabaseMetrics(queryMetrics, executionTime, isSlowQuery, hasError, connectionInfo);

    // Update table-specific metrics if table is provided
    if (table) {
      if (!this.metrics.database.tables.has(table)) {
        this.metrics.database.tables.set(table, this.createEmptyDatabaseMetrics());
      }
      const tableMetrics = this.metrics.database.tables.get(table)!;
      this.updateDatabaseMetrics(tableMetrics, executionTime, isSlowQuery, hasError, connectionInfo);
    }

    // Check for database alerts
    this.checkDatabaseAlerts(queryType, operation, executionTime, table, error, connectionInfo);

    // Log database performance
    this.logDatabasePerformance(queryType, operation, executionTime, table, hasError, error);
  }

  private updateDatabaseMetrics(
    metrics: DatabaseMetrics,
    executionTime: number,
    isSlowQuery: boolean,
    hasError: boolean,
    connectionInfo?: { total: number; active: number }
  ): void {
    metrics.queryCount++;
    
    if (isSlowQuery) {
      metrics.slowQueryCount++;
    }
    
    if (hasError) {
      metrics.errorCount++;
    }

    // Update execution time metrics
    metrics.maxQueryTime = Math.max(metrics.maxQueryTime, executionTime);
    metrics.minQueryTime = Math.min(metrics.minQueryTime, executionTime);
    
    // Calculate new average execution time
    const totalTime = (metrics.averageQueryTime * (metrics.queryCount - 1)) + executionTime;
    metrics.averageQueryTime = totalTime / metrics.queryCount;

    // Update connection info if provided
    if (connectionInfo) {
      metrics.connectionCount = connectionInfo.total;
      metrics.activeConnections = connectionInfo.active;
    }

    metrics.lastUpdated = new Date();
  }

  private checkDatabaseAlerts(
    queryType: string,
    operation: QueryMetrics['operation'],
    executionTime: number,
    table?: string,
    error?: any,
    connectionInfo?: { total: number; active: number }
  ): void {
    const alerts: DataOperationAlert[] = [];

    // Check for very slow queries
    if (executionTime > this.THRESHOLDS.VERY_SLOW_QUERY_MS) {
      alerts.push({
        id: `slow_query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'database_slow_query',
        message: `Very slow database query detected: ${operation} ${queryType} took ${executionTime}ms`,
        timestamp: new Date(),
        severity: 'critical',
        metadata: {
          queryType,
          operation,
          executionTime,
          table,
          threshold: this.THRESHOLDS.VERY_SLOW_QUERY_MS
        }
      });
    } else if (executionTime > this.THRESHOLDS.SLOW_QUERY_MS) {
      alerts.push({
        id: `slow_query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'database_slow_query',
        message: `Slow database query detected: ${operation} ${queryType} took ${executionTime}ms`,
        timestamp: new Date(),
        severity: 'medium',
        metadata: {
          queryType,
          operation,
          executionTime,
          table,
          threshold: this.THRESHOLDS.SLOW_QUERY_MS
        }
      });
    }

    // Check for database errors
    if (error) {
      alerts.push({
        id: `db_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'database_error',
        message: `Database error in ${operation} ${queryType}: ${error.message}`,
        timestamp: new Date(),
        severity: 'high',
        metadata: {
          queryType,
          operation,
          table,
          error: {
            message: error.message,
            code: error.code,
            stack: error.stack
          }
        }
      });
    }

    // Check connection pool status
    if (connectionInfo) {
      const connectionUsage = (connectionInfo.active / connectionInfo.total) * 100;
      
      if (connectionUsage > this.THRESHOLDS.CONNECTION_POOL_CRITICAL) {
        alerts.push({
          id: `conn_pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'connection_pool_exhausted',
          message: `Critical connection pool usage: ${connectionUsage.toFixed(1)}% (${connectionInfo.active}/${connectionInfo.total})`,
          timestamp: new Date(),
          severity: 'critical',
          metadata: {
            activeConnections: connectionInfo.active,
            totalConnections: connectionInfo.total,
            usagePercentage: connectionUsage
          }
        });
      } else if (connectionUsage > this.THRESHOLDS.CONNECTION_POOL_WARNING) {
        alerts.push({
          id: `conn_pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'connection_pool_exhausted',
          message: `High connection pool usage: ${connectionUsage.toFixed(1)}% (${connectionInfo.active}/${connectionInfo.total})`,
          timestamp: new Date(),
          severity: 'medium',
          metadata: {
            activeConnections: connectionInfo.active,
            totalConnections: connectionInfo.total,
            usagePercentage: connectionUsage
          }
        });
      }
    }

    // Add alerts
    alerts.forEach(alert => this.addAlert(alert));
  }

  // Record API endpoint performance
  recordAPIRequest(
    method: string,
    endpoint: string,
    responseTime: number,
    statusCode: number,
    error?: any
  ): void {
    const endpointKey = `${method} ${endpoint}`;
    const isError = statusCode >= 400;

    // Get or create endpoint metrics
    if (!this.metrics.api.endpoints.has(endpointKey)) {
      this.metrics.api.endpoints.set(endpointKey, {
        endpoint,
        method,
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        errorRate: 0,
        statusCodes: {},
        lastUpdated: new Date()
      });
    }

    const endpointMetrics = this.metrics.api.endpoints.get(endpointKey)!;
    
    // Update metrics
    endpointMetrics.requestCount++;
    
    if (isError) {
      endpointMetrics.errorCount++;
    }

    // Update response time metrics
    endpointMetrics.maxResponseTime = Math.max(endpointMetrics.maxResponseTime, responseTime);
    endpointMetrics.minResponseTime = Math.min(endpointMetrics.minResponseTime, responseTime);
    
    // Calculate new average response time
    const totalTime = (endpointMetrics.averageResponseTime * (endpointMetrics.requestCount - 1)) + responseTime;
    endpointMetrics.averageResponseTime = totalTime / endpointMetrics.requestCount;

    // Calculate error rate
    endpointMetrics.errorRate = endpointMetrics.errorCount / endpointMetrics.requestCount;

    // Track status codes
    endpointMetrics.statusCodes[statusCode] = (endpointMetrics.statusCodes[statusCode] || 0) + 1;

    endpointMetrics.lastUpdated = new Date();

    // Check for API alerts
    this.checkAPIAlerts(endpointKey, endpointMetrics, responseTime, statusCode, error);

    // Also record in performance monitoring service
    performanceMonitoringService.recordRequest(method, endpoint, responseTime, statusCode, error);
  }

  private checkAPIAlerts(
    endpointKey: string,
    metrics: APIEndpointMetrics,
    responseTime: number,
    statusCode: number,
    error?: any
  ): void {
    const alerts: DataOperationAlert[] = [];

    // Check for high error rates (only after sufficient requests)
    if (metrics.requestCount > 10) {
      if (metrics.errorRate > this.THRESHOLDS.CRITICAL_ERROR_RATE) {
        alerts.push({
          id: `api_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'api_error_rate',
          message: `Critical API error rate for ${endpointKey}: ${(metrics.errorRate * 100).toFixed(2)}%`,
          timestamp: new Date(),
          severity: 'critical',
          metadata: {
            endpoint: endpointKey,
            errorRate: metrics.errorRate,
            errorCount: metrics.errorCount,
            requestCount: metrics.requestCount,
            statusCodes: metrics.statusCodes
          }
        });
      } else if (metrics.errorRate > this.THRESHOLDS.HIGH_ERROR_RATE) {
        alerts.push({
          id: `api_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'api_error_rate',
          message: `High API error rate for ${endpointKey}: ${(metrics.errorRate * 100).toFixed(2)}%`,
          timestamp: new Date(),
          severity: 'high',
          metadata: {
            endpoint: endpointKey,
            errorRate: metrics.errorRate,
            errorCount: metrics.errorCount,
            requestCount: metrics.requestCount,
            statusCodes: metrics.statusCodes
          }
        });
      }
    }

    // Check for slow responses
    if (responseTime > this.THRESHOLDS.VERY_SLOW_API_RESPONSE_MS) {
      alerts.push({
        id: `api_slow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'api_slow_response',
        message: `Very slow API response for ${endpointKey}: ${responseTime}ms`,
        timestamp: new Date(),
        severity: 'critical',
        metadata: {
          endpoint: endpointKey,
          responseTime,
          statusCode,
          error: error ? error.message : undefined
        }
      });
    } else if (responseTime > this.THRESHOLDS.SLOW_API_RESPONSE_MS) {
      alerts.push({
        id: `api_slow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'api_slow_response',
        message: `Slow API response for ${endpointKey}: ${responseTime}ms`,
        timestamp: new Date(),
        severity: 'medium',
        metadata: {
          endpoint: endpointKey,
          responseTime,
          statusCode
        }
      });
    }

    // Add alerts
    alerts.forEach(alert => this.addAlert(alert));
  }

  private addAlert(alert: DataOperationAlert): void {
    this.metrics.alerts.unshift(alert);
    
    // Keep only the most recent alerts
    if (this.metrics.alerts.length > this.THRESHOLDS.MAX_ALERTS) {
      this.metrics.alerts = this.metrics.alerts.slice(0, this.THRESHOLDS.MAX_ALERTS);
    }

    // Log alert
    const logLevel = alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warn' : 'info';
    logger[logLevel](alert.message, {
      alertId: alert.id,
      alertType: alert.type,
      severity: alert.severity,
      metadata: alert.metadata
    });
  }

  private logDatabasePerformance(
    queryType: string,
    operation: QueryMetrics['operation'],
    executionTime: number,
    table?: string,
    hasError?: boolean,
    error?: any
  ): void {
    const logLevel = hasError ? 'error' : executionTime > this.THRESHOLDS.SLOW_QUERY_MS ? 'warn' : 'debug';
    
    logger[logLevel](`Database Query Performance: ${operation} ${queryType}`, {
      database: {
        operation,
        queryType,
        table,
        executionTime,
        hasError,
        error: error ? {
          message: error.message,
          code: error.code
        } : undefined
      },
      performance: {
        executionTime,
        isSlowQuery: executionTime > this.THRESHOLDS.SLOW_QUERY_MS
      }
    });
  }

  // Get all metrics
  getMetrics(): DataOperationMetrics {
    return {
      database: {
        overall: { ...this.metrics.database.overall },
        queries: new Map(this.metrics.database.queries),
        tables: new Map(this.metrics.database.tables)
      },
      api: {
        endpoints: new Map(this.metrics.api.endpoints)
      },
      alerts: [...this.metrics.alerts]
    };
  }

  // Get database metrics summary
  getDatabaseMetrics(): {
    overall: DatabaseMetrics;
    slowestQueries: QueryMetrics[];
    slowestTables: Array<{ table: string; metrics: DatabaseMetrics }>;
    errorProneQueries: QueryMetrics[];
  } {
    const queryArray = Array.from(this.metrics.database.queries.values());
    const tableArray = Array.from(this.metrics.database.tables.entries()).map(([table, metrics]) => ({
      table,
      metrics
    }));

    return {
      overall: { ...this.metrics.database.overall },
      slowestQueries: queryArray
        .sort((a, b) => b.averageQueryTime - a.averageQueryTime)
        .slice(0, 10),
      slowestTables: tableArray
        .sort((a, b) => b.metrics.averageQueryTime - a.metrics.averageQueryTime)
        .slice(0, 10),
      errorProneQueries: queryArray
        .filter(query => query.errorCount > 0)
        .sort((a, b) => (b.errorCount / b.queryCount) - (a.errorCount / a.queryCount))
        .slice(0, 10)
    };
  }

  // Get API metrics summary
  getAPIMetrics(): {
    endpoints: APIEndpointMetrics[];
    slowestEndpoints: APIEndpointMetrics[];
    errorProneEndpoints: APIEndpointMetrics[];
    mostUsedEndpoints: APIEndpointMetrics[];
  } {
    const endpointArray = Array.from(this.metrics.api.endpoints.values());

    return {
      endpoints: endpointArray,
      slowestEndpoints: endpointArray
        .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
        .slice(0, 10),
      errorProneEndpoints: endpointArray
        .filter(endpoint => endpoint.errorCount > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 10),
      mostUsedEndpoints: endpointArray
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10)
    };
  }

  // Get recent alerts
  getRecentAlerts(limit: number = 20): DataOperationAlert[] {
    return this.metrics.alerts.slice(0, limit);
  }

  // Get alerts by type
  getAlertsByType(type: DataOperationAlert['type']): DataOperationAlert[] {
    return this.metrics.alerts.filter(alert => alert.type === type);
  }

  // Get alerts by severity
  getAlertsBySeverity(severity: DataOperationAlert['severity']): DataOperationAlert[] {
    return this.metrics.alerts.filter(alert => alert.severity === severity);
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alert = this.metrics.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = new Date();
      logger.info(`Data operation alert resolved: ${alertId}`, {
        alertType: alert.type,
        resolvedAt: alert.resolved
      });
      return true;
    }
    return false;
  }

  // Get health status
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: {
      database: {
        averageQueryTime: number;
        errorRate: number;
        slowQueryCount: number;
      };
      api: {
        averageErrorRate: number;
        slowEndpointCount: number;
      };
      alerts: {
        total: number;
        critical: number;
        unresolved: number;
      };
    };
  } {
    const recentAlerts = this.metrics.alerts.filter(alert => 
      Date.now() - alert.timestamp.getTime() < 300000 && !alert.resolved // Last 5 minutes, unresolved
    );
    
    const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'critical');
    const issues: string[] = [];
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check for critical issues
    if (criticalAlerts.length > 0) {
      status = 'unhealthy';
      issues.push(`${criticalAlerts.length} critical data operation alerts`);
    }
    
    // Check database health
    const dbMetrics = this.metrics.database.overall;
    const dbErrorRate = dbMetrics.queryCount > 0 ? dbMetrics.errorCount / dbMetrics.queryCount : 0;
    
    if (dbErrorRate > 0.05) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`High database error rate: ${(dbErrorRate * 100).toFixed(2)}%`);
    }
    
    if (dbMetrics.averageQueryTime > this.THRESHOLDS.SLOW_QUERY_MS) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`Slow database queries: ${dbMetrics.averageQueryTime.toFixed(0)}ms average`);
    }
    
    // Check API health
    const apiEndpoints = Array.from(this.metrics.api.endpoints.values());
    const highErrorEndpoints = apiEndpoints.filter(e => e.errorRate > this.THRESHOLDS.HIGH_ERROR_RATE);
    
    if (highErrorEndpoints.length > 0) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`${highErrorEndpoints.length} API endpoints with high error rates`);
    }
    
    const averageApiErrorRate = apiEndpoints.length > 0 
      ? apiEndpoints.reduce((sum, e) => sum + e.errorRate, 0) / apiEndpoints.length 
      : 0;
    
    const slowEndpointCount = apiEndpoints.filter(e => 
      e.averageResponseTime > this.THRESHOLDS.SLOW_API_RESPONSE_MS
    ).length;
    
    return {
      status,
      issues,
      metrics: {
        database: {
          averageQueryTime: dbMetrics.averageQueryTime,
          errorRate: dbErrorRate,
          slowQueryCount: dbMetrics.slowQueryCount
        },
        api: {
          averageErrorRate: averageApiErrorRate,
          slowEndpointCount
        },
        alerts: {
          total: recentAlerts.length,
          critical: criticalAlerts.length,
          unresolved: recentAlerts.length
        }
      }
    };
  }

  // Reset metrics (useful for testing)
  resetMetrics(): void {
    this.metrics = {
      database: {
        overall: this.createEmptyDatabaseMetrics(),
        queries: new Map(),
        tables: new Map()
      },
      api: {
        endpoints: new Map()
      },
      alerts: []
    };
    
    logger.info('Data operation metrics reset');
  }

  // Generate comprehensive report
  generateReport(): {
    summary: {
      database: DatabaseMetrics;
      totalAPIEndpoints: number;
      totalAlerts: number;
      criticalAlerts: number;
    };
    database: {
      slowestQueries: QueryMetrics[];
      errorProneQueries: QueryMetrics[];
      tablePerformance: Array<{ table: string; metrics: DatabaseMetrics }>;
    };
    api: {
      slowestEndpoints: APIEndpointMetrics[];
      errorProneEndpoints: APIEndpointMetrics[];
      mostUsedEndpoints: APIEndpointMetrics[];
    };
    alerts: {
      recent: DataOperationAlert[];
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
    };
  } {
    const dbMetrics = this.getDatabaseMetrics();
    const apiMetrics = this.getAPIMetrics();
    const alerts = this.metrics.alerts;

    // Count alerts by type and severity
    const alertsByType: Record<string, number> = {};
    const alertsBySeverity: Record<string, number> = {};

    alerts.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    });

    return {
      summary: {
        database: dbMetrics.overall,
        totalAPIEndpoints: apiMetrics.endpoints.length,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'critical').length
      },
      database: {
        slowestQueries: dbMetrics.slowestQueries,
        errorProneQueries: dbMetrics.errorProneQueries,
        tablePerformance: dbMetrics.slowestTables
      },
      api: {
        slowestEndpoints: apiMetrics.slowestEndpoints,
        errorProneEndpoints: apiMetrics.errorProneEndpoints,
        mostUsedEndpoints: apiMetrics.mostUsedEndpoints
      },
      alerts: {
        recent: this.getRecentAlerts(50),
        byType: alertsByType,
        bySeverity: alertsBySeverity
      }
    };
  }
}

// Export singleton instance
export const dataOperationMonitoringService = new DataOperationMonitoringService();

// Export types
export type {
  DatabaseMetrics,
  QueryMetrics,
  APIEndpointMetrics,
  DataOperationAlert,
  DataOperationMetrics
};
