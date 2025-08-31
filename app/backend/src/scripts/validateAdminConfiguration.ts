#!/usr/bin/env node

import { adminConfigurationService } from '../services/adminConfigurationService';
import { systemStatusDashboardService } from '../services/systemStatusDashboardService';
import { auditLogAnalysisService } from '../services/auditLogAnalysisService';

interface ValidationResult {
  component: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
  duration?: number;
}

class AdminConfigurationValidator {
  private results: ValidationResult[] = [];

  async runValidation(): Promise<void> {
    console.log('🔧 Starting Admin Configuration System Validation...\n');

    await this.validatePolicyConfiguration();
    await this.validateThresholdConfiguration();
    await this.validateVendorConfiguration();
    await this.validateAlertConfiguration();
    await this.validateSystemStatusDashboard();
    await this.validateAuditLogAnalysis();

    this.printResults();
  }

  private async validatePolicyConfiguration(): Promise<void> {
    console.log('📋 Validating Policy Configuration Management...');

    // Test policy creation
    await this.runTest('Policy Configuration', 'Create Policy', async () => {
      const policy = {
        name: 'Test Validation Policy',
        category: 'harassment',
        severity: 'high' as const,
        confidenceThreshold: 0.85,
        action: 'block' as const,
        reputationModifier: -15,
        description: 'Test policy for validation',
        isActive: true
      };

      const created = await adminConfigurationService.createPolicyConfiguration(
        policy,
        'validator-admin'
      );

      if (!created.id || created.name !== policy.name) {
        throw new Error('Policy creation failed');
      }

      return created;
    });

    // Test policy retrieval
    await this.runTest('Policy Configuration', 'Retrieve Policies', async () => {
      const policies = await adminConfigurationService.getPolicyConfigurations();
      
      if (!Array.isArray(policies)) {
        throw new Error('Policy retrieval failed');
      }

      return policies;
    });

    // Test policy update
    await this.runTest('Policy Configuration', 'Update Policy', async () => {
      const policies = await adminConfigurationService.getPolicyConfigurations();
      if (policies.length === 0) {
        throw new Error('No policies to update');
      }

      const updated = await adminConfigurationService.updatePolicyConfiguration(
        policies[0].id!,
        { confidenceThreshold: 0.9 },
        'validator-admin'
      );

      if (updated.confidenceThreshold !== 0.9) {
        throw new Error('Policy update failed');
      }

      return updated;
    });
  }

  private async validateThresholdConfiguration(): Promise<void> {
    console.log('🎯 Validating Threshold Configuration Management...');

    // Test threshold creation
    await this.runTest('Threshold Configuration', 'Create Threshold', async () => {
      const threshold = {
        contentType: 'post',
        reputationTier: 'new_user',
        autoBlockThreshold: 0.95,
        quarantineThreshold: 0.75,
        publishThreshold: 0.3,
        escalationThreshold: 0.6,
        isActive: true
      };

      const created = await adminConfigurationService.createThresholdConfiguration(
        threshold,
        'validator-admin'
      );

      if (!created.id || created.contentType !== threshold.contentType) {
        throw new Error('Threshold creation failed');
      }

      return created;
    });

    // Test threshold filtering
    await this.runTest('Threshold Configuration', 'Filter Thresholds', async () => {
      const postThresholds = await adminConfigurationService.getThresholdConfigurations('post');
      const newUserThresholds = await adminConfigurationService.getThresholdConfigurations(
        undefined,
        'new_user'
      );

      if (!Array.isArray(postThresholds) || !Array.isArray(newUserThresholds)) {
        throw new Error('Threshold filtering failed');
      }

      return { postThresholds, newUserThresholds };
    });
  }

  private async validateVendorConfiguration(): Promise<void> {
    console.log('🏭 Validating Vendor Configuration Management...');

    // Test vendor creation
    await this.runTest('Vendor Configuration', 'Create Vendor', async () => {
      const vendor = {
        vendorName: 'Test Validator Vendor',
        serviceType: 'text_moderation',
        apiEndpoint: 'https://api.example.com/moderate',
        apiKeyRef: 'TEST_API_KEY',
        isEnabled: true,
        priority: 1,
        timeoutMs: 5000,
        retryAttempts: 3,
        rateLimitPerMinute: 60,
        costPerRequest: 0.001,
        healthCheckUrl: 'https://api.example.com/health',
        healthStatus: 'healthy' as const
      };

      const created = await adminConfigurationService.createVendorConfiguration(
        vendor,
        'validator-admin'
      );

      if (!created.id || created.vendorName !== vendor.vendorName) {
        throw new Error('Vendor creation failed');
      }

      return created;
    });

    // Test vendor health status update
    await this.runTest('Vendor Configuration', 'Update Health Status', async () => {
      const vendors = await adminConfigurationService.getVendorConfigurations();
      if (vendors.length === 0) {
        throw new Error('No vendors to update');
      }

      await adminConfigurationService.updateVendorHealthStatus(vendors[0].id!, 'degraded');

      const updated = await adminConfigurationService.getVendorConfigurations();
      const vendor = updated.find(v => v.id === vendors[0].id);

      if (!vendor || vendor.healthStatus !== 'degraded') {
        throw new Error('Health status update failed');
      }

      return vendor;
    });
  }

  private async validateAlertConfiguration(): Promise<void> {
    console.log('🚨 Validating Alert Configuration Management...');

    // Test alert creation
    await this.runTest('Alert Configuration', 'Create Alert', async () => {
      const alert = {
        alertName: 'Validation Test Alert',
        metricName: 'test_metric',
        conditionType: 'greater_than' as const,
        thresholdValue: 100,
        severity: 'warning' as const,
        notificationChannels: ['email', 'slack'],
        isActive: true,
        cooldownMinutes: 10
      };

      const created = await adminConfigurationService.createAlertConfiguration(
        alert,
        'validator-admin'
      );

      if (!created.id || created.alertName !== alert.alertName) {
        throw new Error('Alert creation failed');
      }

      return created;
    });

    // Test alert filtering
    await this.runTest('Alert Configuration', 'Filter Active Alerts', async () => {
      const allAlerts = await adminConfigurationService.getAlertConfigurations();
      const activeAlerts = await adminConfigurationService.getAlertConfigurations(true);

      if (!Array.isArray(allAlerts) || !Array.isArray(activeAlerts)) {
        throw new Error('Alert filtering failed');
      }

      return { allAlerts, activeAlerts };
    });
  }

  private async validateSystemStatusDashboard(): Promise<void> {
    console.log('📊 Validating System Status Dashboard...');

    // Test metrics recording
    await this.runTest('System Status Dashboard', 'Record Metrics', async () => {
      const metrics = [
        {
          metricName: 'validation_test_metric',
          metricValue: 42,
          metricType: 'gauge' as const,
          tags: { component: 'validator' },
          timestamp: new Date()
        },
        {
          metricName: 'validation_counter',
          metricValue: 1,
          metricType: 'counter' as const,
          tags: { test: 'validation' },
          timestamp: new Date()
        }
      ];

      await systemStatusDashboardService.recordMetrics(metrics);
      return metrics;
    });

    // Test dashboard metrics retrieval
    await this.runTest('System Status Dashboard', 'Get Dashboard Metrics', async () => {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const metrics = await systemStatusDashboardService.getDashboardMetrics(timeRange);

      if (!metrics.moderationStats || !metrics.vendorHealth || !metrics.performance) {
        throw new Error('Dashboard metrics incomplete');
      }

      return metrics;
    });

    // Test system status
    await this.runTest('System Status Dashboard', 'Get System Status', async () => {
      const status = await systemStatusDashboardService.getSystemStatus();

      if (!status.status || !status.components || !Array.isArray(status.alerts)) {
        throw new Error('System status incomplete');
      }

      if (!['healthy', 'degraded', 'unhealthy'].includes(status.status)) {
        throw new Error('Invalid system status');
      }

      return status;
    });
  }

  private async validateAuditLogAnalysis(): Promise<void> {
    console.log('📝 Validating Audit Log Analysis...');

    // Test audit log search
    await this.runTest('Audit Log Analysis', 'Search Audit Logs', async () => {
      const filters = {
        adminId: 'validator-admin',
        limit: 10,
        offset: 0
      };

      const result = await auditLogAnalysisService.searchAuditLogs(filters);

      if (!result.logs || !Array.isArray(result.logs) || typeof result.total !== 'number') {
        throw new Error('Audit log search failed');
      }

      return result;
    });

    // Test audit analytics
    await this.runTest('Audit Log Analysis', 'Get Audit Analytics', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const analytics = await auditLogAnalysisService.getAuditAnalytics(startDate, endDate);

      if (typeof analytics.totalActions !== 'number' || !analytics.actionsByType) {
        throw new Error('Audit analytics incomplete');
      }

      return analytics;
    });

    // Test compliance report
    await this.runTest('Audit Log Analysis', 'Generate Compliance Report', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const report = await auditLogAnalysisService.generateComplianceReport(startDate, endDate);

      if (!report.period || typeof report.totalChanges !== 'number' || !report.adminActivity) {
        throw new Error('Compliance report incomplete');
      }

      return report;
    });

    // Test audit log export
    await this.runTest('Audit Log Analysis', 'Export Audit Logs', async () => {
      const filters = { limit: 10 };

      const jsonExport = await auditLogAnalysisService.exportAuditLogs(filters, 'json');
      const csvExport = await auditLogAnalysisService.exportAuditLogs(filters, 'csv');

      if (typeof jsonExport !== 'string' || typeof csvExport !== 'string') {
        throw new Error('Audit log export failed');
      }

      // Validate JSON format
      JSON.parse(jsonExport);

      // Validate CSV format
      if (!csvExport.includes('ID,Admin ID,Action,Resource Type')) {
        throw new Error('CSV export format invalid');
      }

      return { jsonExport, csvExport };
    });
  }

  private async runTest(
    component: string,
    test: string,
    testFn: () => Promise<any>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        component,
        test,
        status: 'PASS',
        duration
      });
      
      console.log(`  ✅ ${test} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        component,
        test,
        status: 'FAIL',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration
      });
      
      console.log(`  ❌ ${test} (${duration}ms): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private printResults(): void {
    console.log('\n📊 Validation Results Summary:');
    console.log('================================');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  • ${result.component} - ${result.test}: ${result.message}`);
        });
    }

    const totalDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0);
    console.log(`\nTotal Duration: ${totalDuration}ms`);

    if (failed === 0) {
      console.log('\n🎉 All admin configuration tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the implementation.');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new AdminConfigurationValidator();
  validator.runValidation().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

export { AdminConfigurationValidator };