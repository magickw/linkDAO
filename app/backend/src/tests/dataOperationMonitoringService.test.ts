import { dataOperationMonitoringService } from '../services/dataOperationMonitoringService';

describe('DataOperationMonitoringService', () => {
  beforeEach(() => {
    // Reset metrics before each test
    dataOperationMonitoringService.resetMetrics();
  });

  describe('Database Query Monitoring', () => {
    it('should record database query metrics', () => {
      // Record a fast query
      dataOperationMonitoringService.recordDatabaseQuery(
        'user_lookup',
        'SELECT',
        150,
        'users'
      );

      const metrics = dataOperationMonitoringService.getDatabaseMetrics();
      
      expect(metrics.overall.queryCount).toBe(1);
      expect(metrics.overall.averageQueryTime).toBe(150);
      expect(metrics.overall.slowQueryCount).toBe(0);
      expect(metrics.overall.errorCount).toBe(0);
    });

    it('should detect slow queries', () => {
      // Record a slow query (over 1000ms threshold)
      dataOperationMonitoringService.recordDatabaseQuery(
        'complex_join',
        'SELECT',
        2500,
        'users'
      );

      const metrics = dataOperationMonitoringService.getDatabaseMetrics();
      const alerts = dataOperationMonitoringService.getRecentAlerts();
      
      expect(metrics.overall.slowQueryCount).toBe(1);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('database_slow_query');
      expect(alerts[0].severity).toBe('medium');
    });

    it('should detect very slow queries as critical', () => {
      // Record a very slow query (over 5000ms threshold)
      dataOperationMonitoringService.recordDatabaseQuery(
        'timeout_query',
        'SELECT',
        6000,
        'products'
      );

      const alerts = dataOperationMonitoringService.getRecentAlerts();
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('database_slow_query');
      expect(alerts[0].severity).toBe('critical');
    });

    it('should record database errors', () => {
      const error = new Error('Connection timeout');
      
      dataOperationMonitoringService.recordDatabaseQuery(
        'failed_insert',
        'INSERT',
        100,
        'orders',
        error
      );

      const metrics = dataOperationMonitoringService.getDatabaseMetrics();
      const alerts = dataOperationMonitoringService.getRecentAlerts();
      
      expect(metrics.overall.errorCount).toBe(1);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('database_error');
      expect(alerts[0].severity).toBe('high');
    });

    it('should track connection pool usage', () => {
      dataOperationMonitoringService.recordDatabaseQuery(
        'pool_test',
        'SELECT',
        100,
        'users',
        undefined,
        { total: 10, active: 9 } // 90% usage
      );

      const alerts = dataOperationMonitoringService.getRecentAlerts();
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('connection_pool_exhausted');
      expect(alerts[0].severity).toBe('medium');
    });

    it('should track critical connection pool usage', () => {
      dataOperationMonitoringService.recordDatabaseQuery(
        'pool_critical',
        'SELECT',
        100,
        'users',
        undefined,
        { total: 10, active: 10 } // 100% usage
      );

      const alerts = dataOperationMonitoringService.getRecentAlerts();
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('connection_pool_exhausted');
      expect(alerts[0].severity).toBe('critical');
    });

    it('should track table-specific metrics', () => {
      dataOperationMonitoringService.recordDatabaseQuery('user_select', 'SELECT', 100, 'users');
      dataOperationMonitoringService.recordDatabaseQuery('user_update', 'UPDATE', 200, 'users');
      dataOperationMonitoringService.recordDatabaseQuery('product_select', 'SELECT', 150, 'products');

      const metrics = dataOperationMonitoringService.getDatabaseMetrics();
      
      expect(metrics.slowestTables).toHaveLength(2);
      
      const usersTable = metrics.slowestTables.find(t => t.table === 'users');
      expect(usersTable).toBeDefined();
      expect(usersTable!.metrics.queryCount).toBe(2);
      expect(usersTable!.metrics.averageQueryTime).toBe(150); // (100 + 200) / 2
    });
  });

  describe('API Request Monitoring', () => {
    it('should record API request metrics', () => {
      dataOperationMonitoringService.recordAPIRequest(
        'GET',
        '/api/users',
        250,
        200
      );

      const metrics = dataOperationMonitoringService.getAPIMetrics();
      
      expect(metrics.endpoints).toHaveLength(1);
      
      const endpoint = metrics.endpoints[0];
      expect(endpoint.method).toBe('GET');
      expect(endpoint.endpoint).toBe('/api/users');
      expect(endpoint.requestCount).toBe(1);
      expect(endpoint.averageResponseTime).toBe(250);
      expect(endpoint.errorCount).toBe(0);
      expect(endpoint.errorRate).toBe(0);
    });

    it('should detect high API error rates', () => {
      const endpoint = '/api/orders';
      
      // Record multiple requests with high error rate
      for (let i = 0; i < 15; i++) {
        const statusCode = i < 8 ? 500 : 200; // 8/15 = 53% error rate
        dataOperationMonitoringService.recordAPIRequest('POST', endpoint, 200, statusCode);
      }

      const alerts = dataOperationMonitoringService.getRecentAlerts();
      const errorAlerts = alerts.filter(a => a.type === 'api_error_rate');
      
      expect(errorAlerts.length).toBeGreaterThan(0);
      expect(errorAlerts[0].severity).toBe('critical'); // Over 10% threshold
    });

    it('should detect slow API responses', () => {
      dataOperationMonitoringService.recordAPIRequest(
        'GET',
        '/api/slow-endpoint',
        3000, // 3 seconds
        200
      );

      const alerts = dataOperationMonitoringService.getRecentAlerts();
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('api_slow_response');
      expect(alerts[0].severity).toBe('medium');
    });

    it('should detect very slow API responses as critical', () => {
      dataOperationMonitoringService.recordAPIRequest(
        'POST',
        '/api/very-slow-endpoint',
        7000, // 7 seconds
        200
      );

      const alerts = dataOperationMonitoringService.getRecentAlerts();
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('api_slow_response');
      expect(alerts[0].severity).toBe('critical');
    });

    it('should track status code distribution', () => {
      const endpoint = '/api/test';
      
      dataOperationMonitoringService.recordAPIRequest('GET', endpoint, 100, 200);
      dataOperationMonitoringService.recordAPIRequest('GET', endpoint, 150, 200);
      dataOperationMonitoringService.recordAPIRequest('GET', endpoint, 200, 404);
      dataOperationMonitoringService.recordAPIRequest('GET', endpoint, 250, 500);

      const metrics = dataOperationMonitoringService.getAPIMetrics();
      const endpointMetrics = metrics.endpoints.find(e => e.endpoint === endpoint);
      
      expect(endpointMetrics).toBeDefined();
      expect(endpointMetrics!.statusCodes[200]).toBe(2);
      expect(endpointMetrics!.statusCodes[404]).toBe(1);
      expect(endpointMetrics!.statusCodes[500]).toBe(1);
      expect(endpointMetrics!.errorCount).toBe(2); // 404 and 500
      expect(endpointMetrics!.errorRate).toBe(0.5); // 2/4
    });
  });

  describe('Alert Management', () => {
    it('should resolve alerts', () => {
      // Create an alert by recording a slow query
      dataOperationMonitoringService.recordDatabaseQuery(
        'slow_query',
        'SELECT',
        2000,
        'users'
      );

      const alerts = dataOperationMonitoringService.getRecentAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].resolved).toBeUndefined();

      // Resolve the alert
      const resolved = dataOperationMonitoringService.resolveAlert(alerts[0].id);
      expect(resolved).toBe(true);

      const updatedAlerts = dataOperationMonitoringService.getRecentAlerts();
      expect(updatedAlerts[0].resolved).toBeDefined();
    });

    it('should filter alerts by type', () => {
      // Create different types of alerts
      dataOperationMonitoringService.recordDatabaseQuery('slow', 'SELECT', 2000, 'users');
      dataOperationMonitoringService.recordDatabaseQuery('error', 'INSERT', 100, 'orders', new Error('Test'));
      dataOperationMonitoringService.recordAPIRequest('GET', '/slow', 3000, 200);

      const slowQueryAlerts = dataOperationMonitoringService.getAlertsByType('database_slow_query');
      const errorAlerts = dataOperationMonitoringService.getAlertsByType('database_error');
      const apiAlerts = dataOperationMonitoringService.getAlertsByType('api_slow_response');

      expect(slowQueryAlerts).toHaveLength(1);
      expect(errorAlerts).toHaveLength(1);
      expect(apiAlerts).toHaveLength(1);
    });

    it('should filter alerts by severity', () => {
      // Create alerts with different severities
      dataOperationMonitoringService.recordDatabaseQuery('medium_slow', 'SELECT', 2000, 'users'); // medium
      dataOperationMonitoringService.recordDatabaseQuery('critical_slow', 'SELECT', 6000, 'users'); // critical
      dataOperationMonitoringService.recordDatabaseQuery('error', 'INSERT', 100, 'orders', new Error('Test')); // high

      const criticalAlerts = dataOperationMonitoringService.getAlertsBySeverity('critical');
      const highAlerts = dataOperationMonitoringService.getAlertsBySeverity('high');
      const mediumAlerts = dataOperationMonitoringService.getAlertsBySeverity('medium');

      expect(criticalAlerts).toHaveLength(1);
      expect(highAlerts).toHaveLength(1);
      expect(mediumAlerts).toHaveLength(1);
    });
  });

  describe('Health Status', () => {
    it('should report healthy status with no issues', () => {
      // Record some normal operations
      dataOperationMonitoringService.recordDatabaseQuery('normal', 'SELECT', 100, 'users');
      dataOperationMonitoringService.recordAPIRequest('GET', '/api/users', 200, 200);

      const health = dataOperationMonitoringService.getHealthStatus();
      
      expect(health.status).toBe('healthy');
      expect(health.issues).toHaveLength(0);
    });

    it('should report degraded status with minor issues', () => {
      // Record some slow operations
      dataOperationMonitoringService.recordDatabaseQuery('slow', 'SELECT', 1500, 'users');
      
      // Record requests with moderate error rate
      for (let i = 0; i < 20; i++) {
        const statusCode = i < 2 ? 500 : 200; // 10% error rate
        dataOperationMonitoringService.recordAPIRequest('GET', '/api/test', 200, statusCode);
      }

      const health = dataOperationMonitoringService.getHealthStatus();
      
      expect(health.status).toBe('degraded');
      expect(health.issues.length).toBeGreaterThan(0);
    });

    it('should report unhealthy status with critical issues', () => {
      // Record critical slow query
      dataOperationMonitoringService.recordDatabaseQuery('critical', 'SELECT', 6000, 'users');

      const health = dataOperationMonitoringService.getHealthStatus();
      
      expect(health.status).toBe('unhealthy');
      expect(health.issues.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics Aggregation', () => {
    it('should calculate correct averages for multiple queries', () => {
      const queryTimes = [100, 200, 300, 400, 500];
      
      queryTimes.forEach(time => {
        dataOperationMonitoringService.recordDatabaseQuery('test', 'SELECT', time, 'users');
      });

      const metrics = dataOperationMonitoringService.getDatabaseMetrics();
      
      expect(metrics.overall.queryCount).toBe(5);
      expect(metrics.overall.averageQueryTime).toBe(300); // (100+200+300+400+500)/5
      expect(metrics.overall.minQueryTime).toBe(100);
      expect(metrics.overall.maxQueryTime).toBe(500);
    });

    it('should generate comprehensive report', () => {
      // Add some test data
      dataOperationMonitoringService.recordDatabaseQuery('test1', 'SELECT', 150, 'users');
      dataOperationMonitoringService.recordDatabaseQuery('test2', 'INSERT', 200, 'orders');
      dataOperationMonitoringService.recordAPIRequest('GET', '/api/users', 250, 200);
      dataOperationMonitoringService.recordAPIRequest('POST', '/api/orders', 300, 201);

      const report = dataOperationMonitoringService.generateReport();
      
      expect(report.summary.database.queryCount).toBe(2);
      expect(report.summary.totalAPIEndpoints).toBe(2);
      expect(report.database.slowestQueries).toBeDefined();
      expect(report.api.mostUsedEndpoints).toBeDefined();
      expect(report.alerts).toBeDefined();
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle zero query time', () => {
      dataOperationMonitoringService.recordDatabaseQuery('instant', 'SELECT', 0, 'cache');

      const metrics = dataOperationMonitoringService.getDatabaseMetrics();
      
      expect(metrics.overall.queryCount).toBe(1);
      expect(metrics.overall.averageQueryTime).toBe(0);
      expect(metrics.overall.minQueryTime).toBe(0);
    });

    it('should handle very large query times', () => {
      const largeTime = 999999;
      dataOperationMonitoringService.recordDatabaseQuery('huge', 'SELECT', largeTime, 'big_table');

      const metrics = dataOperationMonitoringService.getDatabaseMetrics();
      
      expect(metrics.overall.maxQueryTime).toBe(largeTime);
      expect(metrics.overall.averageQueryTime).toBe(largeTime);
    });

    it('should limit alert history size', () => {
      // Generate more alerts than the limit
      for (let i = 0; i < 600; i++) {
        dataOperationMonitoringService.recordDatabaseQuery(`query_${i}`, 'SELECT', 6000, 'test');
      }

      const alerts = dataOperationMonitoringService.getRecentAlerts(1000);
      
      // Should be limited to MAX_ALERTS (500)
      expect(alerts.length).toBeLessThanOrEqual(500);
    });
  });
});
