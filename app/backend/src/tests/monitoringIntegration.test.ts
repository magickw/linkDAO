import { dataOperationMonitoringService } from '../services/dataOperationMonitoringService';
import { dataIssueAlertingService } from '../services/dataIssueAlertingService';
import { userExperienceMetricsService } from '../services/userExperienceMetricsService';

describe('Monitoring Integration Tests', () => {
  beforeEach(() => {
    // Reset all services
    dataOperationMonitoringService.resetMetrics();
    userExperienceMetricsService.resetMetrics();
    dataIssueAlertingService.stop();
  });

  afterEach(() => {
    // Clean up
    dataIssueAlertingService.stop();
  });

  describe('Data Operation Monitoring Integration', () => {
    it('should track database operations and generate alerts', () => {
      // Record some database operations
      dataOperationMonitoringService.recordDatabaseQuery(
        'user_lookup',
        'SELECT',
        150,
        'users'
      );

      dataOperationMonitoringService.recordDatabaseQuery(
        'slow_query',
        'SELECT',
        2500, // Slow query
        'products'
      );

      // Check metrics
      const metrics = dataOperationMonitoringService.getDatabaseMetrics();
      expect(metrics.overall.queryCount).toBe(2);
      expect(metrics.overall.slowQueryCount).toBe(1);
      expect(metrics.overall.averageQueryTime).toBe(1325); // (150 + 2500) / 2

      // Check alerts were generated
      const alerts = dataOperationMonitoringService.getRecentAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const slowQueryAlert = alerts.find(a => a.type === 'database_slow_query');
      expect(slowQueryAlert).toBeDefined();
    });

    it('should track API operations and detect issues', () => {
      // Record API operations
      dataOperationMonitoringService.recordAPIRequest('GET', '/api/users', 200, 200);
      dataOperationMonitoringService.recordAPIRequest('GET', '/api/users', 250, 200);
      dataOperationMonitoringService.recordAPIRequest('GET', '/api/users', 300, 500); // Error

      // Check metrics
      const apiMetrics = dataOperationMonitoringService.getAPIMetrics();
      expect(apiMetrics.endpoints.length).toBe(1);
      
      const endpoint = apiMetrics.endpoints[0];
      expect(endpoint.requestCount).toBe(3);
      expect(endpoint.errorCount).toBe(1);
      expect(endpoint.errorRate).toBeCloseTo(0.33, 2);
    });

    it('should provide health status based on metrics', () => {
      // Record normal operations
      dataOperationMonitoringService.recordDatabaseQuery('normal', 'SELECT', 100, 'users');
      dataOperationMonitoringService.recordAPIRequest('GET', '/api/test', 200, 200);

      let health = dataOperationMonitoringService.getHealthStatus();
      expect(health.status).toBe('healthy');

      // Record problematic operations
      dataOperationMonitoringService.recordDatabaseQuery('error', 'INSERT', 100, 'orders', new Error('DB Error'));
      
      health = dataOperationMonitoringService.getHealthStatus();
      expect(health.status).toBe('degraded');
    });
  });

  describe('User Experience Metrics Integration', () => {
    it('should track user sessions and page loads', () => {
      const sessionId = 'test-session-123';
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      // Start session
      userExperienceMetricsService.startSession(sessionId, userAgent);

      // Record page loads
      userExperienceMetricsService.recordPageLoad({
        sessionId,
        page: '/home',
        loadTime: 1200,
        timeToFirstByte: 200,
        domContentLoaded: 800,
        firstContentfulPaint: 900,
        largestContentfulPaint: 1100,
        cumulativeLayoutShift: 0.05,
        firstInputDelay: 50
      });

      userExperienceMetricsService.recordPageLoad({
        sessionId,
        page: '/products',
        loadTime: 4000, // Slow load
        timeToFirstByte: 500,
        domContentLoaded: 2000,
        firstContentfulPaint: 2500,
        largestContentfulPaint: 3500,
        cumulativeLayoutShift: 0.15,
        firstInputDelay: 120
      });

      // Check metrics
      const activeSessions = userExperienceMetricsService.getActiveSessions();
      expect(activeSessions.length).toBe(1);
      expect(activeSessions[0].sessionId).toBe(sessionId);
      expect(activeSessions[0].pageViews).toBe(2);
      expect(activeSessions[0].slowLoads).toBe(1);

      const pageLoads = userExperienceMetricsService.getRecentPageLoads();
      expect(pageLoads.length).toBe(2);

      // Check UX health
      const uxHealth = userExperienceMetricsService.calculateUXHealth();
      expect(uxHealth.averagePageLoadTime).toBe(2600); // (1200 + 4000) / 2
      expect(uxHealth.userSatisfactionScore).toBeLessThan(100); // Should be reduced due to slow load

      // End session
      userExperienceMetricsService.endSession(sessionId);
      
      const sessionsAfterEnd = userExperienceMetricsService.getActiveSessions();
      expect(sessionsAfterEnd.length).toBe(0);
    });

    it('should detect and alert on UX issues', () => {
      const sessionId = 'test-session-456';
      const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';

      userExperienceMetricsService.startSession(sessionId, userAgent);

      // Record error
      userExperienceMetricsService.recordError({
        sessionId,
        type: 'javascript',
        message: 'TypeError: Cannot read property of undefined',
        page: '/checkout',
        severity: 'high'
      });

      // Record very slow page load
      userExperienceMetricsService.recordPageLoad({
        sessionId,
        page: '/checkout',
        loadTime: 8000, // Very slow
        timeToFirstByte: 2000,
        domContentLoaded: 5000,
        firstContentfulPaint: 6000,
        largestContentfulPaint: 7500,
        cumulativeLayoutShift: 0.25,
        firstInputDelay: 200
      });

      // Check that alerts were generated
      const uxAlerts = userExperienceMetricsService.getUXAlerts();
      expect(uxAlerts.length).toBeGreaterThan(0);

      const slowLoadAlert = uxAlerts.find(a => a.type === 'slow_page_loads');
      expect(slowLoadAlert).toBeDefined();
      expect(slowLoadAlert!.severity).toBe('high');

      const coreWebVitalsAlert = uxAlerts.find(a => a.type === 'poor_core_web_vitals');
      expect(coreWebVitalsAlert).toBeDefined();
    });
  });

  describe('Alert Configuration Integration', () => {
    it('should have properly configured alert rules', () => {
      const alertConfigs = dataIssueAlertingService.getAlertConfigs();
      
      expect(alertConfigs.length).toBeGreaterThan(0);

      // Check that we have different severity levels
      const severities = alertConfigs.map(c => c.severity);
      expect(severities).toContain('critical');
      expect(severities).toContain('high');
      expect(severities).toContain('medium');

      // Check that critical alerts have shorter cooldowns
      const criticalAlerts = alertConfigs.filter(c => c.severity === 'critical');
      const mediumAlerts = alertConfigs.filter(c => c.severity === 'medium');
      
      if (criticalAlerts.length > 0 && mediumAlerts.length > 0) {
        const avgCriticalCooldown = criticalAlerts.reduce((sum, a) => sum + a.cooldownMinutes, 0) / criticalAlerts.length;
        const avgMediumCooldown = mediumAlerts.reduce((sum, a) => sum + a.cooldownMinutes, 0) / mediumAlerts.length;
        
        expect(avgCriticalCooldown).toBeLessThanOrEqual(avgMediumCooldown);
      }
    });

    it('should have data consistency checks configured', () => {
      const consistencyChecks = dataIssueAlertingService.getConsistencyChecks();
      
      expect(consistencyChecks.length).toBeGreaterThan(0);

      // Check that all checks have required properties
      consistencyChecks.forEach(check => {
        expect(check.id).toBeDefined();
        expect(check.name).toBeDefined();
        expect(check.query).toBeDefined();
        expect(check.expectedResult).toBeDefined();
        expect(check.intervalMinutes).toBeGreaterThan(0);
      });
    });
  });

  describe('Comprehensive Monitoring Report', () => {
    it('should generate comprehensive monitoring report', () => {
      // Add some test data
      dataOperationMonitoringService.recordDatabaseQuery('test1', 'SELECT', 150, 'users');
      dataOperationMonitoringService.recordDatabaseQuery('test2', 'INSERT', 200, 'orders');
      dataOperationMonitoringService.recordAPIRequest('GET', '/api/users', 250, 200);
      dataOperationMonitoringService.recordAPIRequest('POST', '/api/orders', 300, 201);

      userExperienceMetricsService.startSession('session1', 'Mozilla/5.0 Test');
      userExperienceMetricsService.recordPageLoad({
        sessionId: 'session1',
        page: '/home',
        loadTime: 1200,
        timeToFirstByte: 200,
        domContentLoaded: 800,
        firstContentfulPaint: 900,
        largestContentfulPaint: 1100,
        cumulativeLayoutShift: 0.05,
        firstInputDelay: 50
      });

      // Generate reports
      const dataReport = dataOperationMonitoringService.generateReport();
      const uxReport = userExperienceMetricsService.generateUXReport();

      // Verify data operation report
      expect(dataReport.summary.database.queryCount).toBe(2);
      expect(dataReport.summary.totalAPIEndpoints).toBe(2);
      expect(dataReport.database.slowestQueries).toBeDefined();
      expect(dataReport.api.mostUsedEndpoints).toBeDefined();

      // Verify UX report
      expect(uxReport.health).toBeDefined();
      expect(uxReport.summary.activeSessions).toBe(1);
      expect(uxReport.summary.totalPageViews).toBe(1);
      expect(uxReport.topPages.length).toBeGreaterThan(0);
      expect(uxReport.deviceBreakdown).toBeDefined();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large volumes of data without memory issues', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Generate a large number of operations
      for (let i = 0; i < 1000; i++) {
        dataOperationMonitoringService.recordDatabaseQuery(`query_${i}`, 'SELECT', 100 + i, 'test_table');
        dataOperationMonitoringService.recordAPIRequest('GET', `/api/test/${i}`, 200 + i, 200);
      }

      const afterOperationsMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = afterOperationsMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB for 1000 operations)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // Verify data is still accessible
      const metrics = dataOperationMonitoringService.getDatabaseMetrics();
      expect(metrics.overall.queryCount).toBe(1000);

      const apiMetrics = dataOperationMonitoringService.getAPIMetrics();
      expect(apiMetrics.endpoints.length).toBeLessThanOrEqual(1000); // Some may be grouped
    });
  });
});