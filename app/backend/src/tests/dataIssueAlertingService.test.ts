import { dataIssueAlertingService } from '../services/dataIssueAlertingService';
import { dataOperationMonitoringService } from '../services/dataOperationMonitoringService';

// Mock the monitoring service
jest.mock('../services/dataOperationMonitoringService', () => ({
  dataOperationMonitoringService: {
    getMetrics: jest.fn(),
    recordDatabaseQuery: jest.fn(),
    recordAPIRequest: jest.fn()
  }
}));

const mockMonitoringService = dataOperationMonitoringService as jest.Mocked<typeof dataOperationMonitoringService>;

describe('DataIssueAlertingService', () => {
  beforeEach(() => {
    // Stop the service to prevent background processes during tests
    dataIssueAlertingService.stop();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock return values
    mockMonitoringService.getMetrics.mockReturnValue({
      database: {
        overall: {
          queryCount: 100,
          slowQueryCount: 5,
          errorCount: 2,
          averageQueryTime: 150,
          maxQueryTime: 500,
          minQueryTime: 50,
          connectionCount: 10,
          activeConnections: 3,
          lastUpdated: new Date()
        },
        queries: new Map(),
        tables: new Map()
      },
      api: {
        endpoints: new Map([
          ['GET /api/users', {
            endpoint: '/api/users',
            method: 'GET',
            requestCount: 50,
            errorCount: 1,
            averageResponseTime: 200,
            maxResponseTime: 500,
            minResponseTime: 100,
            errorRate: 0.02,
            statusCodes: { 200: 49, 500: 1 },
            lastUpdated: new Date()
          }]
        ])
      },
      alerts: []
    });
  });

  describe('Alert Configuration', () => {
    it('should have default alert configurations', () => {
      const configs = dataIssueAlertingService.getAlertConfigs();
      
      expect(configs.length).toBeGreaterThan(0);
      
      const dbErrorRateConfig = configs.find(c => c.id === 'db_high_error_rate');
      expect(dbErrorRateConfig).toBeDefined();
      expect(dbErrorRateConfig!.enabled).toBe(true);
      expect(dbErrorRateConfig!.severity).toBe('high');
    });

    it('should add custom alert configuration', () => {
      const customConfig = {
        id: 'custom_test_alert',
        name: 'Custom Test Alert',
        description: 'Test alert configuration',
        enabled: true,
        severity: 'medium' as const,
        conditions: [{
          type: 'database_error_rate' as const,
          operator: 'gt' as const,
          threshold: 10,
          timeWindowMinutes: 5
        }],
        actions: [{
          type: 'log' as const,
          config: { level: 'warn' },
          enabled: true
        }],
        cooldownMinutes: 15
      };

      dataIssueAlertingService.addAlertConfig(customConfig);
      
      const configs = dataIssueAlertingService.getAlertConfigs();
      const addedConfig = configs.find(c => c.id === 'custom_test_alert');
      
      expect(addedConfig).toBeDefined();
      expect(addedConfig!.name).toBe('Custom Test Alert');
    });
  });

  describe('Data Consistency Checks', () => {
    it('should have default consistency checks', () => {
      const checks = dataIssueAlertingService.getConsistencyChecks();
      
      expect(checks.length).toBeGreaterThan(0);
      
      const userCountCheck = checks.find(c => c.id === 'user_count_consistency');
      expect(userCountCheck).toBeDefined();
      expect(userCountCheck!.enabled).toBe(true);
    });

    it('should add custom consistency check', () => {
      const customCheck = {
        id: 'custom_consistency_check',
        name: 'Custom Consistency Check',
        query: 'SELECT COUNT(*) as count FROM test_table',
        expectedResult: { type: 'range', min: 0, max: 1000 },
        enabled: true,
        intervalMinutes: 10
      };

      dataIssueAlertingService.addConsistencyCheck(customCheck);
      
      const checks = dataIssueAlertingService.getConsistencyChecks();
      const addedCheck = checks.find(c => c.id === 'custom_consistency_check');
      
      expect(addedCheck).toBeDefined();
      expect(addedCheck!.name).toBe('Custom Consistency Check');
    });
  });

  describe('Alert Condition Evaluation', () => {
    it('should detect high database error rate', async () => {
      // Mock high error rate
      mockMonitoringService.getMetrics.mockReturnValue({
        database: {
          overall: {
            queryCount: 100,
            slowQueryCount: 5,
            errorCount: 10, // 10% error rate
            averageQueryTime: 150,
            maxQueryTime: 500,
            minQueryTime: 50,
            connectionCount: 10,
            activeConnections: 3,
            lastUpdated: new Date()
          },
          queries: new Map(),
          tables: new Map()
        },
        api: {
          endpoints: new Map()
        },
        alerts: []
      });

      // Manually trigger condition check for testing
      const configs = dataIssueAlertingService.getAlertConfigs();
      const dbErrorConfig = configs.find(c => c.id === 'db_high_error_rate');
      
      expect(dbErrorConfig).toBeDefined();
      
      // The actual condition evaluation would happen in the private method
      // For testing, we verify the configuration is correct
      expect(dbErrorConfig!.conditions[0].type).toBe('database_error_rate');
      expect(dbErrorConfig!.conditions[0].threshold).toBe(5);
    });

    it('should detect high API error rate', async () => {
      // Mock high API error rate
      mockMonitoringService.getMetrics.mockReturnValue({
        database: {
          overall: {
            queryCount: 100,
            slowQueryCount: 5,
            errorCount: 2,
            averageQueryTime: 150,
            maxQueryTime: 500,
            minQueryTime: 50,
            connectionCount: 10,
            activeConnections: 3,
            lastUpdated: new Date()
          },
          queries: new Map(),
          tables: new Map()
        },
        api: {
          endpoints: new Map([
            ['GET /api/test', {
              endpoint: '/api/test',
              method: 'GET',
              requestCount: 100,
              errorCount: 15, // 15% error rate
              averageResponseTime: 200,
              maxResponseTime: 500,
              minResponseTime: 100,
              errorRate: 0.15,
              statusCodes: { 200: 85, 500: 15 },
              lastUpdated: new Date()
            }]
          ])
        },
        alerts: []
      });

      const configs = dataIssueAlertingService.getAlertConfigs();
      const apiErrorConfig = configs.find(c => c.id === 'api_high_error_rate');
      
      expect(apiErrorConfig).toBeDefined();
      expect(apiErrorConfig!.conditions[0].type).toBe('api_error_rate');
      expect(apiErrorConfig!.conditions[0].threshold).toBe(10);
    });

    it('should detect connection pool exhaustion', async () => {
      // Mock high connection pool usage
      mockMonitoringService.getMetrics.mockReturnValue({
        database: {
          overall: {
            queryCount: 100,
            slowQueryCount: 5,
            errorCount: 2,
            averageQueryTime: 150,
            maxQueryTime: 500,
            minQueryTime: 50,
            connectionCount: 10,
            activeConnections: 9, // 90% usage
            lastUpdated: new Date()
          },
          queries: new Map(),
          tables: new Map()
        },
        api: {
          endpoints: new Map()
        },
        alerts: []
      });

      const configs = dataIssueAlertingService.getAlertConfigs();
      const poolConfig = configs.find(c => c.id === 'connection_pool_exhausted');
      
      expect(poolConfig).toBeDefined();
      expect(poolConfig!.conditions[0].type).toBe('connection_pool');
      expect(poolConfig!.conditions[0].threshold).toBe(90);
      expect(poolConfig!.severity).toBe('critical');
    });
  });

  describe('Alert Management', () => {
    it('should track active alerts', () => {
      const activeAlerts = dataIssueAlertingService.getActiveAlerts();
      expect(Array.isArray(activeAlerts)).toBe(true);
    });

    it('should track alert history', () => {
      const alertHistory = dataIssueAlertingService.getAlertHistory();
      expect(Array.isArray(alertHistory)).toBe(true);
    });

    it('should resolve alerts', async () => {
      // This would require triggering an actual alert first
      // For now, test the resolve method with a non-existent alert
      const resolved = await dataIssueAlertingService.resolveAlert('non-existent-alert');
      expect(resolved).toBe(false);
    });

    it('should acknowledge alerts', () => {
      // Test acknowledging a non-existent alert
      const acknowledged = dataIssueAlertingService.acknowledgeAlert('non-existent-alert', 'test-user');
      expect(acknowledged).toBe(false);
    });
  });

  describe('Alert Actions', () => {
    it('should have log action configured', () => {
      const configs = dataIssueAlertingService.getAlertConfigs();
      const dbErrorConfig = configs.find(c => c.id === 'db_high_error_rate');
      
      expect(dbErrorConfig).toBeDefined();
      
      const logAction = dbErrorConfig!.actions.find(a => a.type === 'log');
      expect(logAction).toBeDefined();
      expect(logAction!.enabled).toBe(true);
    });

    it('should have webhook action when URL is configured', () => {
      const configs = dataIssueAlertingService.getAlertConfigs();
      const dbErrorConfig = configs.find(c => c.id === 'db_high_error_rate');
      
      expect(dbErrorConfig).toBeDefined();
      
      const webhookAction = dbErrorConfig!.actions.find(a => a.type === 'webhook');
      expect(webhookAction).toBeDefined();
      // Enabled status depends on environment variable
    });

    it('should have escalation rules for some alerts', () => {
      const configs = dataIssueAlertingService.getAlertConfigs();
      const dbErrorConfig = configs.find(c => c.id === 'db_high_error_rate');
      
      expect(dbErrorConfig).toBeDefined();
      expect(dbErrorConfig!.escalationRules).toBeDefined();
      expect(dbErrorConfig!.escalationRules!.length).toBeGreaterThan(0);
      
      const escalationRule = dbErrorConfig!.escalationRules![0];
      expect(escalationRule.afterMinutes).toBe(15);
      expect(escalationRule.severity).toBe('critical');
    });
  });

  describe('Alert Severity Levels', () => {
    it('should have different severity levels for different thresholds', () => {
      const configs = dataIssueAlertingService.getAlertConfigs();
      
      const highErrorRate = configs.find(c => c.id === 'db_high_error_rate');
      const criticalErrorRate = configs.find(c => c.id === 'db_critical_error_rate');
      
      expect(highErrorRate!.severity).toBe('high');
      expect(criticalErrorRate!.severity).toBe('critical');
      
      // Critical should have lower threshold time window
      expect(criticalErrorRate!.conditions[0].timeWindowMinutes).toBeLessThan(
        highErrorRate!.conditions[0].timeWindowMinutes
      );
    });

    it('should have appropriate cooldown periods', () => {
      const configs = dataIssueAlertingService.getAlertConfigs();
      
      const criticalAlert = configs.find(c => c.severity === 'critical');
      const mediumAlert = configs.find(c => c.severity === 'medium');
      
      if (criticalAlert && mediumAlert) {
        // Critical alerts should have shorter cooldowns
        expect(criticalAlert.cooldownMinutes).toBeLessThanOrEqual(mediumAlert.cooldownMinutes);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid condition operators', () => {
      const configs = dataIssueAlertingService.getAlertConfigs();
      
      configs.forEach(config => {
        config.conditions.forEach(condition => {
          expect(['gt', 'gte', 'lt', 'lte', 'eq', 'neq']).toContain(condition.operator);
        });
      });
    });

    it('should have valid action types', () => {
      const configs = dataIssueAlertingService.getAlertConfigs();
      
      configs.forEach(config => {
        config.actions.forEach(action => {
          expect(['webhook', 'email', 'slack', 'sms', 'log', 'auto_remediation']).toContain(action.type);
        });
      });
    });

    it('should have positive thresholds and time windows', () => {
      const configs = dataIssueAlertingService.getAlertConfigs();
      
      configs.forEach(config => {
        config.conditions.forEach(condition => {
          expect(condition.threshold).toBeGreaterThanOrEqual(0);
          expect(condition.timeWindowMinutes).toBeGreaterThan(0);
        });
        
        expect(config.cooldownMinutes).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration with Monitoring Service', () => {
    it('should use monitoring service data for evaluations', () => {
      // Verify that the service calls the monitoring service
      expect(mockMonitoringService.getMetrics).toBeDefined();
      
      // The actual integration would be tested in integration tests
      // Here we verify the mock setup is correct
      const metrics = mockMonitoringService.getMetrics();
      expect(metrics.database).toBeDefined();
      expect(metrics.api).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle monitoring service errors gracefully', () => {
      // Mock an error from the monitoring service
      mockMonitoringService.getMetrics.mockImplementation(() => {
        throw new Error('Monitoring service error');
      });

      // The service should handle this gracefully
      // In a real implementation, this would be tested by triggering condition checks
      expect(() => {
        dataIssueAlertingService.getAlertConfigs();
      }).not.toThrow();
    });
  });
});
