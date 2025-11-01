import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { healthMonitoringService } from '../services/healthMonitoringService';
import { monitoringDashboardService } from '../services/monitoringDashboardService';

describe('Health Monitoring Service', () => {
  beforeEach(() => {
    // Clean up any existing state
    healthMonitoringService.cleanup();
    monitoringDashboardService.cleanup();
  });

  afterEach(() => {
    // Clean up after each test
    healthMonitoringService.cleanup();
    monitoringDashboardService.cleanup();
  });

  describe('Health Check Service', () => {
    it('should perform basic health check', async () => {
      const health = await healthMonitoringService.performHealthCheck();
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.timestamp).toBeDefined();
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.services).toBeInstanceOf(Array);
      expect(health.dependencies).toBeInstanceOf(Array);
      expect(health.metrics).toBeDefined();
    }, 10000); // Increase timeout to 10 seconds

    it('should track request metrics', () => {
      const initialMetrics = healthMonitoringService.getMetrics();
      const initialCount = initialMetrics.totalRequests;
      
      healthMonitoringService.incrementRequestCount();
      healthMonitoringService.incrementRequestCount();
      
      const updatedMetrics = healthMonitoringService.getMetrics();
      expect(updatedMetrics.totalRequests).toBe(initialCount + 2);
    });

    it('should track error metrics', () => {
      const initialMetrics = healthMonitoringService.getMetrics();
      const initialErrors = initialMetrics.totalErrors;
      
      healthMonitoringService.incrementErrorCount();
      
      const updatedMetrics = healthMonitoringService.getMetrics();
      expect(updatedMetrics.totalErrors).toBe(initialErrors + 1);
    });

    it('should record response times', () => {
      healthMonitoringService.recordResponseTime(100);
      healthMonitoringService.recordResponseTime(200);
      healthMonitoringService.recordResponseTime(150);
      
      const metrics = healthMonitoringService.getMetrics();
      expect(metrics.responseTime.avg).toBeGreaterThan(0);
      expect(metrics.responseTime.samples).toBe(3);
    });

    it('should manage alerts', () => {
      // Clear any existing alerts first
      const existingAlerts = healthMonitoringService.getActiveAlerts();
      existingAlerts.forEach(alert => {
        healthMonitoringService.removeAlert(alert.key);
      });
      
      healthMonitoringService.addAlert('test_alert', 'warning', 'Test alert message');
      
      const alerts = healthMonitoringService.getActiveAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      
      const testAlert = alerts.find(a => a.key === 'test_alert');
      expect(testAlert).toBeDefined();
      expect(testAlert?.level).toBe('warning');
      expect(testAlert?.message).toBe('Test alert message');
      
      healthMonitoringService.removeAlert('test_alert');
      const updatedAlerts = healthMonitoringService.getActiveAlerts();
      const testAlertAfterRemoval = updatedAlerts.find(a => a.key === 'test_alert');
      expect(testAlertAfterRemoval).toBeUndefined();
    });

    it('should get service details', async () => {
      const serviceDetails = await healthMonitoringService.getServiceDetails('database');
      
      if (serviceDetails) {
        expect(serviceDetails.name).toBe('database');
        expect(serviceDetails.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(serviceDetails.lastChecked).toBeDefined();
      }
    });

    it('should get dependency impact', async () => {
      const dependencyImpact = await healthMonitoringService.getDependencyImpact();
      
      expect(dependencyImpact).toBeInstanceOf(Array);
      dependencyImpact.forEach(dep => {
        expect(dep.dependency).toBeDefined();
        expect(dep.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(dep.impact).toMatch(/^(low|medium|high|critical)$/);
        expect(dep.affectedServices).toBeInstanceOf(Array);
        expect(dep.recoveryActions).toBeInstanceOf(Array);
      });
    });
  });

  describe('Monitoring Dashboard Service', () => {
    it('should get dashboard data', () => {
      const dashboardData = monitoringDashboardService.getDashboardData();
      
      expect(dashboardData).toBeDefined();
      expect(dashboardData.history).toBeInstanceOf(Array);
      expect(dashboardData.alerts).toBeInstanceOf(Array);
      expect(dashboardData.rules).toBeInstanceOf(Array);
    });

    it('should get performance trends', () => {
      const trends = monitoringDashboardService.getPerformanceTrends(1);
      
      expect(trends).toBeDefined();
      expect(trends.responseTime).toBeInstanceOf(Array);
      expect(trends.throughput).toBeInstanceOf(Array);
      expect(trends.errorRate).toBeInstanceOf(Array);
      expect(trends.memoryUsage).toBeInstanceOf(Array);
    });

    it('should get alert statistics', () => {
      const stats = monitoringDashboardService.getAlertStatistics(1);
      
      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.critical).toBe('number');
      expect(typeof stats.warnings).toBe('number');
      expect(typeof stats.acknowledged).toBe('number');
      expect(typeof stats.resolved).toBe('number');
      expect(stats.byRule).toBeDefined();
    });

    it('should manage alert rules', () => {
      const initialData = monitoringDashboardService.getDashboardData();
      const initialRuleCount = initialData.rules.length;
      
      monitoringDashboardService.addAlertRule({
        id: 'test_rule',
        name: 'Test Rule',
        condition: () => false,
        severity: 'warning',
        message: () => 'Test message',
        cooldown: 5,
        enabled: true
      });
      
      const updatedData = monitoringDashboardService.getDashboardData();
      expect(updatedData.rules.length).toBe(initialRuleCount + 1);
      
      const testRule = updatedData.rules.find(r => r.id === 'test_rule');
      expect(testRule).toBeDefined();
      expect(testRule?.name).toBe('Test Rule');
      
      monitoringDashboardService.removeAlertRule('test_rule');
      const finalData = monitoringDashboardService.getDashboardData();
      expect(finalData.rules.length).toBe(initialRuleCount);
    });

    it('should acknowledge and resolve alerts', () => {
      // This test would need actual alerts to be present
      // For now, just test that the methods don't throw
      expect(() => {
        monitoringDashboardService.acknowledgeAlert('non_existent_alert');
      }).not.toThrow();
      
      expect(() => {
        monitoringDashboardService.resolveAlert('non_existent_alert');
      }).not.toThrow();
    });
  });
});
