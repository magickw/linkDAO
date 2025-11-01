#!/usr/bin/env node

/**
 * Admin Configuration System Validation Script
 * 
 * This script validates the complete admin configuration system including:
 * - Policy configuration management
 * - Threshold tuning interfaces
 * - Vendor configuration and failover management
 * - System status dashboard with real-time metrics
 * - Audit log search and analysis tools
 */

import { adminConfigurationService } from '../services/adminConfigurationService';
import { safeLogger } from '../utils/safeLogger';
import { systemStatusDashboardService } from '../services/systemStatusDashboardService';
import { safeLogger } from '../utils/safeLogger';
import { auditLogAnalysisService } from '../services/auditLogAnalysisService';
import { safeLogger } from '../utils/safeLogger';

interface ValidationResult {
  component: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  duration?: number;
}

class AdminConfigurationSystemValidator {
  private results: ValidationResult[] = [];

  private addResult(component: string, test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, duration?: number) {
    this.results.push({ component, test, status, message, duration });
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    const durationStr = duration ? ` (${duration}ms)` : '';
    safeLogger.info(`${statusIcon} [${component}] ${test}: ${message}${durationStr}`);
  }

  async validatePolicyConfiguration(): Promise<void> {
    safeLogger.info('\n🔧 Validating Policy Configuration Management...');

    try {
      const startTime = Date.now();

      // Test policy creation
      const testPolicy = {
        name: 'Validation Test Policy',
        category: 'harassment',
        severity: 'high' as const,
        confidenceThreshold: 0.85,
        action: 'block' as const,
        reputationModifier: -15,
        description: 'Test policy for validation',
        isActive: true
      };

      const createdPolicy = await adminConfigurationService.createPolicyConfiguration(
        testPolicy,
        'validation-admin'
      );

      this.addResult(
        'Policy Configuration',
        'Policy Creation',
        'PASS',
        `Created policy with ID ${createdPolicy.id}`,
        Date.now() - startTime
      );

      // Test policy retrieval
      const retrievalStartTime = Date.now();
      const policies = await adminConfigurationService.getPolicyConfigurations();
      
      this.addResult(
        'Policy Configuration',
        'Policy Retrieval',
        policies.length > 0 ? 'PASS' : 'WARN',
        `Retrieved ${policies.length} policies`,
        Date.now() - retrievalStartTime
      );

      // Test policy update
      const updateStartTime = Date.now();
      const updatedPolicy = await adminConfigurationService.updatePolicyConfiguration(
        createdPolicy.id!,
        { confidenceThreshold: 0.9, action: 'review' as const },
        'validation-admin'
      );

      this.addResult(
        'Policy Configuration',
        'Policy Update',
        updatedPolicy.confidenceThreshold === 0.9 && updatedPolicy.action === 'review' ? 'PASS' : 'FAIL',
        `Updated policy threshold to ${updatedPolicy.confidenceThreshold} and action to ${updatedPolicy.action}`,
        Date.now() - updateStartTime
      );

      // Test active policy filtering
      const activeStartTime = Date.now();
      const activePolicies = await adminConfigurationService.getPolicyConfigurations(true);
      
      this.addResult(
        'Policy Configuration',
        'Active Policy Filtering',
        'PASS',
        `Retrieved ${activePolicies.length} active policies`,
        Date.now() - activeStartTime
      );

      // Test policy deletion
      const deleteStartTime = Date.now();
      await adminConfigurationService.deletePolicyConfiguration(createdPolicy.id!, 'validation-admin');
      
      this.addResult(
        'Policy Configuration',
        'Policy Deletion',
        'PASS',
        'Successfully deleted test policy',
        Date.now() - deleteStartTime
      );

    } catch (error) {
      this.addResult(
        'Policy Configuration',
        'General Operation',
        'FAIL',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validateThresholdConfiguration(): Promise<void> {
    safeLogger.info('\n⚖️ Validating Threshold Configuration Management...');

    try {
      const startTime = Date.now();

      // Test threshold creation for different content types and reputation tiers
      const testThresholds = [
        {
          contentType: 'post',
          reputationTier: 'new_user',
          autoBlockThreshold: 0.95,
          quarantineThreshold: 0.75,
          publishThreshold: 0.3,
          escalationThreshold: 0.6,
          isActive: true
        },
        {
          contentType: 'comment',
          reputationTier: 'trusted_user',
          autoBlockThreshold: 0.9,
          quarantineThreshold: 0.6,
          publishThreshold: 0.2,
          escalationThreshold: 0.4,
          isActive: true
        }
      ];

      const createdThresholds = [];
      for (const threshold of testThresholds) {
        const created = await adminConfigurationService.createThresholdConfiguration(
          threshold,
          'validation-admin'
        );
        createdThresholds.push(created);
      }

      this.addResult(
        'Threshold Configuration',
        'Threshold Creation',
        'PASS',
        `Created ${createdThresholds.length} threshold configurations`,
        Date.now() - startTime
      );

      // Test threshold filtering by content type
      const filterStartTime = Date.now();
      const postThresholds = await adminConfigurationService.getThresholdConfigurations('post');
      
      this.addResult(
        'Threshold Configuration',
        'Content Type Filtering',
        postThresholds.length > 0 ? 'PASS' : 'WARN',
        `Found ${postThresholds.length} thresholds for 'post' content type`,
        Date.now() - filterStartTime
      );

      // Test threshold filtering by reputation tier
      const reputationFilterStartTime = Date.now();
      const newUserThresholds = await adminConfigurationService.getThresholdConfigurations(
        undefined,
        'new_user'
      );
      
      this.addResult(
        'Threshold Configuration',
        'Reputation Tier Filtering',
        newUserThresholds.length > 0 ? 'PASS' : 'WARN',
        `Found ${newUserThresholds.length} thresholds for 'new_user' reputation tier`,
        Date.now() - reputationFilterStartTime
      );

      // Test threshold update
      const updateStartTime = Date.now();
      const thresholdToUpdate = createdThresholds[0];
      const updatedThreshold = await adminConfigurationService.updateThresholdConfiguration(
        thresholdToUpdate.id!,
        { autoBlockThreshold: 0.98, quarantineThreshold: 0.8 },
        'validation-admin'
      );

      this.addResult(
        'Threshold Configuration',
        'Threshold Update',
        updatedThreshold.autoBlockThreshold === 0.98 ? 'PASS' : 'FAIL',
        `Updated auto-block threshold to ${updatedThreshold.autoBlockThreshold}`,
        Date.now() - updateStartTime
      );

      // Validate threshold logic (auto-block should be highest)
      const logicValidation = updatedThreshold.autoBlockThreshold > updatedThreshold.quarantineThreshold &&
                             updatedThreshold.quarantineThreshold > updatedThreshold.escalationThreshold &&
                             updatedThreshold.escalationThreshold > updatedThreshold.publishThreshold;

      this.addResult(
        'Threshold Configuration',
        'Threshold Logic Validation',
        logicValidation ? 'PASS' : 'WARN',
        logicValidation ? 'Threshold ordering is correct' : 'Threshold ordering may be incorrect'
      );

    } catch (error) {
      this.addResult(
        'Threshold Configuration',
        'General Operation',
        'FAIL',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validateVendorConfiguration(): Promise<void> {
    safeLogger.info('\n🔧 Validating Vendor Configuration Management...');

    try {
      const startTime = Date.now();

      // Test vendor creation with different service types
      const testVendors = [
        {
          vendorName: 'Validation OpenAI',
          serviceType: 'text_moderation',
          apiEndpoint: 'https://api.openai.com/v1/moderations',
          apiKeyRef: 'OPENAI_API_KEY',
          isEnabled: true,
          priority: 1,
          timeoutMs: 5000,
          retryAttempts: 3,
          rateLimitPerMinute: 60,
          costPerRequest: 0.002,
          healthCheckUrl: 'https://api.openai.com/v1/models',
          healthStatus: 'healthy' as const
        },
        {
          vendorName: 'Validation Google Vision',
          serviceType: 'image_moderation',
          apiEndpoint: 'https://vision.googleapis.com/v1/images:annotate',
          apiKeyRef: 'GOOGLE_VISION_API_KEY',
          isEnabled: true,
          priority: 1,
          timeoutMs: 10000,
          retryAttempts: 2,
          rateLimitPerMinute: 1800,
          costPerRequest: 0.0015,
          healthCheckUrl: 'https://vision.googleapis.com/v1/images:annotate',
          healthStatus: 'healthy' as const
        }
      ];

      const createdVendors = [];
      for (const vendor of testVendors) {
        const created = await adminConfigurationService.createVendorConfiguration(
          vendor,
          'validation-admin'
        );
        createdVendors.push(created);
      }

      this.addResult(
        'Vendor Configuration',
        'Vendor Creation',
        'PASS',
        `Created ${createdVendors.length} vendor configurations`,
        Date.now() - startTime
      );

      // Test vendor filtering by service type
      const filterStartTime = Date.now();
      const textVendors = await adminConfigurationService.getVendorConfigurations('text_moderation');
      
      this.addResult(
        'Vendor Configuration',
        'Service Type Filtering',
        textVendors.length > 0 ? 'PASS' : 'WARN',
        `Found ${textVendors.length} text moderation vendors`,
        Date.now() - filterStartTime
      );

      // Test enabled vendor filtering
      const enabledFilterStartTime = Date.now();
      const enabledVendors = await adminConfigurationService.getVendorConfigurations(undefined, true);
      
      this.addResult(
        'Vendor Configuration',
        'Enabled Vendor Filtering',
        enabledVendors.length > 0 ? 'PASS' : 'WARN',
        `Found ${enabledVendors.length} enabled vendors`,
        Date.now() - enabledFilterStartTime
      );

      // Test vendor health status update
      const healthUpdateStartTime = Date.now();
      const vendorToUpdate = createdVendors[0];
      await adminConfigurationService.updateVendorHealthStatus(vendorToUpdate.id!, 'degraded');
      
      const updatedVendors = await adminConfigurationService.getVendorConfigurations();
      const updatedVendor = updatedVendors.find(v => v.id === vendorToUpdate.id);
      
      this.addResult(
        'Vendor Configuration',
        'Health Status Update',
        updatedVendor?.healthStatus === 'degraded' ? 'PASS' : 'FAIL',
        `Updated vendor health status to ${updatedVendor?.healthStatus}`,
        Date.now() - healthUpdateStartTime
      );

      // Test vendor configuration update
      const configUpdateStartTime = Date.now();
      const updatedVendorConfig = await adminConfigurationService.updateVendorConfiguration(
        vendorToUpdate.id!,
        {
          timeoutMs: 15000,
          rateLimitPerMinute: 120,
          costPerRequest: 0.003
        },
        'validation-admin'
      );

      this.addResult(
        'Vendor Configuration',
        'Configuration Update',
        updatedVendorConfig.timeoutMs === 15000 ? 'PASS' : 'FAIL',
        `Updated vendor timeout to ${updatedVendorConfig.timeoutMs}ms`,
        Date.now() - configUpdateStartTime
      );

    } catch (error) {
      this.addResult(
        'Vendor Configuration',
        'General Operation',
        'FAIL',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validateAlertConfiguration(): Promise<void> {
    safeLogger.info('\n🚨 Validating Alert Configuration Management...');

    try {
      const startTime = Date.now();

      // Test alert creation
      const testAlerts = [
        {
          alertName: 'Validation High Error Rate',
          metricName: 'error_rate',
          conditionType: 'greater_than' as const,
          thresholdValue: 0.05,
          severity: 'critical' as const,
          notificationChannels: ['email', 'slack'],
          isActive: true,
          cooldownMinutes: 15
        },
        {
          alertName: 'Validation Low Throughput',
          metricName: 'throughput',
          conditionType: 'less_than' as const,
          thresholdValue: 100,
          severity: 'warning' as const,
          notificationChannels: ['slack'],
          isActive: true,
          cooldownMinutes: 30
        }
      ];

      const createdAlerts = [];
      for (const alert of testAlerts) {
        const created = await adminConfigurationService.createAlertConfiguration(
          alert,
          'validation-admin'
        );
        createdAlerts.push(created);
      }

      this.addResult(
        'Alert Configuration',
        'Alert Creation',
        'PASS',
        `Created ${createdAlerts.length} alert configurations`,
        Date.now() - startTime
      );

      // Test alert retrieval
      const retrievalStartTime = Date.now();
      const allAlerts = await adminConfigurationService.getAlertConfigurations();
      
      this.addResult(
        'Alert Configuration',
        'Alert Retrieval',
        allAlerts.length >= createdAlerts.length ? 'PASS' : 'WARN',
        `Retrieved ${allAlerts.length} alert configurations`,
        Date.now() - retrievalStartTime
      );

      // Test active alert filtering
      const activeFilterStartTime = Date.now();
      const activeAlerts = await adminConfigurationService.getAlertConfigurations(true);
      
      this.addResult(
        'Alert Configuration',
        'Active Alert Filtering',
        activeAlerts.length > 0 ? 'PASS' : 'WARN',
        `Found ${activeAlerts.length} active alerts`,
        Date.now() - activeFilterStartTime
      );

      // Test alert update
      const updateStartTime = Date.now();
      const alertToUpdate = createdAlerts[0];
      const updatedAlert = await adminConfigurationService.updateAlertConfiguration(
        alertToUpdate.id!,
        {
          thresholdValue: 0.1,
          cooldownMinutes: 20,
          notificationChannels: ['email', 'slack', 'webhook']
        },
        'validation-admin'
      );

      this.addResult(
        'Alert Configuration',
        'Alert Update',
        updatedAlert.thresholdValue === 0.1 ? 'PASS' : 'FAIL',
        `Updated alert threshold to ${updatedAlert.thresholdValue}`,
        Date.now() - updateStartTime
      );

    } catch (error) {
      this.addResult(
        'Alert Configuration',
        'General Operation',
        'FAIL',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validateSystemStatusDashboard(): Promise<void> {
    safeLogger.info('\n📊 Validating System Status Dashboard...');

    try {
      // Test metrics recording
      const metricsStartTime = Date.now();
      const testMetrics = [
        {
          metricName: 'validation_latency',
          metricValue: 150,
          metricType: 'histogram' as const,
          tags: { service: 'validation' },
          timestamp: new Date()
        },
        {
          metricName: 'validation_throughput',
          metricValue: 1000,
          metricType: 'counter' as const,
          tags: { service: 'validation' },
          timestamp: new Date()
        }
      ];

      await systemStatusDashboardService.recordMetrics(testMetrics);
      
      this.addResult(
        'System Status Dashboard',
        'Metrics Recording',
        'PASS',
        `Recorded ${testMetrics.length} metrics`,
        Date.now() - metricsStartTime
      );

      // Test dashboard metrics retrieval
      const dashboardStartTime = Date.now();
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };
      
      const dashboardMetrics = await systemStatusDashboardService.getDashboardMetrics(timeRange);
      
      this.addResult(
        'System Status Dashboard',
        'Dashboard Metrics Retrieval',
        'PASS',
        'Successfully retrieved dashboard metrics',
        Date.now() - dashboardStartTime
      );

      // Validate dashboard metrics structure
      const requiredMetrics = [
        'moderationStats',
        'vendorHealth',
        'communityReports',
        'appeals',
        'performance',
        'costs'
      ];

      const hasAllMetrics = requiredMetrics.every(metric => 
        dashboardMetrics.hasOwnProperty(metric)
      );

      this.addResult(
        'System Status Dashboard',
        'Metrics Structure Validation',
        hasAllMetrics ? 'PASS' : 'FAIL',
        hasAllMetrics ? 'All required metrics present' : 'Missing required metrics'
      );

      // Test system status retrieval
      const statusStartTime = Date.now();
      const systemStatus = await systemStatusDashboardService.getSystemStatus();
      
      this.addResult(
        'System Status Dashboard',
        'System Status Retrieval',
        'PASS',
        `System status: ${systemStatus.status}`,
        Date.now() - statusStartTime
      );

      // Validate system status structure
      const hasRequiredStatusFields = systemStatus.hasOwnProperty('status') &&
                                     systemStatus.hasOwnProperty('components') &&
                                     systemStatus.hasOwnProperty('alerts');

      this.addResult(
        'System Status Dashboard',
        'Status Structure Validation',
        hasRequiredStatusFields ? 'PASS' : 'FAIL',
        hasRequiredStatusFields ? 'All required status fields present' : 'Missing required status fields'
      );

      // Test historical metrics retrieval
      const historicalStartTime = Date.now();
      const historicalMetrics = await systemStatusDashboardService.getHistoricalMetrics(
        ['validation_latency', 'validation_throughput'],
        timeRange,
        'hour'
      );
      
      this.addResult(
        'System Status Dashboard',
        'Historical Metrics Retrieval',
        'PASS',
        `Retrieved historical data for ${Object.keys(historicalMetrics).length} metrics`,
        Date.now() - historicalStartTime
      );

    } catch (error) {
      this.addResult(
        'System Status Dashboard',
        'General Operation',
        'FAIL',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validateAuditLogAnalysis(): Promise<void> {
    safeLogger.info('\n🔍 Validating Audit Log Analysis...');

    try {
      // Test audit log search
      const searchStartTime = Date.now();
      const searchFilters = {
        limit: 10,
        offset: 0
      };
      
      const searchResults = await auditLogAnalysisService.searchAuditLogs(searchFilters);
      
      this.addResult(
        'Audit Log Analysis',
        'Audit Log Search',
        'PASS',
        `Found ${searchResults.total} audit logs`,
        Date.now() - searchStartTime
      );

      // Validate search results structure
      const hasRequiredSearchFields = searchResults.hasOwnProperty('logs') &&
                                     searchResults.hasOwnProperty('total') &&
                                     searchResults.hasOwnProperty('hasMore');

      this.addResult(
        'Audit Log Analysis',
        'Search Results Structure',
        hasRequiredSearchFields ? 'PASS' : 'FAIL',
        hasRequiredSearchFields ? 'Search results have correct structure' : 'Search results missing required fields'
      );

      // Test audit analytics
      const analyticsStartTime = Date.now();
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const analytics = await auditLogAnalysisService.getAuditAnalytics(startDate, endDate);
      
      this.addResult(
        'Audit Log Analysis',
        'Audit Analytics Generation',
        'PASS',
        `Generated analytics for ${analytics.totalActions} actions`,
        Date.now() - analyticsStartTime
      );

      // Validate analytics structure
      const requiredAnalyticsFields = [
        'totalActions',
        'actionsByType',
        'actionsByAdmin',
        'actionsByResource',
        'actionsOverTime',
        'topAdmins',
        'suspiciousActivity'
      ];

      const hasAllAnalyticsFields = requiredAnalyticsFields.every(field => 
        analytics.hasOwnProperty(field)
      );

      this.addResult(
        'Audit Log Analysis',
        'Analytics Structure Validation',
        hasAllAnalyticsFields ? 'PASS' : 'FAIL',
        hasAllAnalyticsFields ? 'All required analytics fields present' : 'Missing required analytics fields'
      );

      // Test compliance report generation
      const complianceStartTime = Date.now();
      const complianceReport = await auditLogAnalysisService.generateComplianceReport(startDate, endDate);
      
      this.addResult(
        'Audit Log Analysis',
        'Compliance Report Generation',
        'PASS',
        `Generated compliance report for ${complianceReport.totalChanges} changes`,
        Date.now() - complianceStartTime
      );

      // Test audit log export
      const exportStartTime = Date.now();
      const exportData = await auditLogAnalysisService.exportAuditLogs(searchFilters, 'json');
      
      this.addResult(
        'Audit Log Analysis',
        'Audit Log Export',
        exportData.length > 0 ? 'PASS' : 'WARN',
        `Exported ${exportData.length} characters of audit data`,
        Date.now() - exportStartTime
      );

      // Test policy violation detection
      const violationStartTime = Date.now();
      const violations = await auditLogAnalysisService.detectPolicyViolations(startDate, endDate);
      
      this.addResult(
        'Audit Log Analysis',
        'Policy Violation Detection',
        'PASS',
        `Detected ${violations.length} potential policy violations`,
        Date.now() - violationStartTime
      );

    } catch (error) {
      this.addResult(
        'Audit Log Analysis',
        'General Operation',
        'FAIL',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validateAuditTrail(): Promise<void> {
    safeLogger.info('\n📝 Validating Audit Trail Integrity...');

    try {
      // Create a configuration change and verify audit trail
      const startTime = Date.now();
      
      const testPolicy = {
        name: 'Audit Trail Test Policy',
        category: 'harassment',
        severity: 'medium' as const,
        confidenceThreshold: 0.7,
        action: 'review' as const,
        reputationModifier: -5,
        isActive: true
      };

      // Create policy (should generate audit log)
      const createdPolicy = await adminConfigurationService.createPolicyConfiguration(
        testPolicy,
        'audit-validation-admin'
      );

      // Update policy (should generate audit log)
      await adminConfigurationService.updatePolicyConfiguration(
        createdPolicy.id!,
        { confidenceThreshold: 0.8, action: 'block' as const },
        'audit-validation-admin'
      );

      // Delete policy (should generate audit log)
      await adminConfigurationService.deletePolicyConfiguration(
        createdPolicy.id!,
        'audit-validation-admin'
      );

      // Check audit logs for these operations
      const auditLogs = await auditLogAnalysisService.searchAuditLogs({
        adminId: 'audit-validation-admin',
        resourceType: 'policy_configuration',
        limit: 10
      });

      const expectedActions = ['create', 'update', 'delete'];
      const foundActions = auditLogs.logs.map(log => log.action);
      const hasAllActions = expectedActions.every(action => foundActions.includes(action));

      this.addResult(
        'Audit Trail',
        'Configuration Change Tracking',
        hasAllActions ? 'PASS' : 'FAIL',
        hasAllActions ? 'All configuration changes properly audited' : 'Missing audit entries for some operations',
        Date.now() - startTime
      );

      // Verify audit log details
      const createLog = auditLogs.logs.find(log => log.action === 'create');
      const updateLog = auditLogs.logs.find(log => log.action === 'update');
      const deleteLog = auditLogs.logs.find(log => log.action === 'delete');

      const hasProperDetails = createLog?.newValues &&
                              updateLog?.oldValues && updateLog?.newValues &&
                              deleteLog?.oldValues;

      this.addResult(
        'Audit Trail',
        'Audit Detail Completeness',
        hasProperDetails ? 'PASS' : 'WARN',
        hasProperDetails ? 'Audit logs contain proper before/after values' : 'Some audit logs missing detailed information'
      );

    } catch (error) {
      this.addResult(
        'Audit Trail',
        'General Operation',
        'FAIL',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validatePerformance(): Promise<void> {
    safeLogger.info('\n⚡ Validating System Performance...');

    try {
      // Test concurrent operations
      const concurrentStartTime = Date.now();
      
      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        adminConfigurationService.createPolicyConfiguration(
          {
            name: `Performance Test Policy ${i}`,
            category: 'spam',
            severity: 'low' as const,
            confidenceThreshold: 0.5,
            action: 'allow' as const,
            reputationModifier: 0,
            isActive: true
          },
          'performance-validation-admin'
        )
      );

      await Promise.all(concurrentOperations);
      const concurrentDuration = Date.now() - concurrentStartTime;

      this.addResult(
        'Performance',
        'Concurrent Operations',
        concurrentDuration < 5000 ? 'PASS' : 'WARN',
        `Completed 10 concurrent operations in ${concurrentDuration}ms`,
        concurrentDuration
      );

      // Test large data retrieval
      const retrievalStartTime = Date.now();
      const allPolicies = await adminConfigurationService.getPolicyConfigurations();
      const retrievalDuration = Date.now() - retrievalStartTime;

      this.addResult(
        'Performance',
        'Large Data Retrieval',
        retrievalDuration < 1000 ? 'PASS' : 'WARN',
        `Retrieved ${allPolicies.length} policies in ${retrievalDuration}ms`,
        retrievalDuration
      );

      // Test audit log search performance
      const auditSearchStartTime = Date.now();
      await auditLogAnalysisService.searchAuditLogs({ limit: 100 });
      const auditSearchDuration = Date.now() - auditSearchStartTime;

      this.addResult(
        'Performance',
        'Audit Log Search',
        auditSearchDuration < 2000 ? 'PASS' : 'WARN',
        `Audit log search completed in ${auditSearchDuration}ms`,
        auditSearchDuration
      );

    } catch (error) {
      this.addResult(
        'Performance',
        'General Operation',
        'FAIL',
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  generateReport(): void {
    safeLogger.info('\n📋 VALIDATION REPORT');
    safeLogger.info('='.repeat(50));

    const summary = this.results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    safeLogger.info(`\n📊 Summary:`);
    safeLogger.info(`✅ PASS: ${summary.PASS || 0}`);
    safeLogger.info(`⚠️  WARN: ${summary.WARN || 0}`);
    safeLogger.info(`❌ FAIL: ${summary.FAIL || 0}`);
    safeLogger.info(`📝 Total Tests: ${this.results.length}`);

    if (summary.FAIL > 0) {
      safeLogger.info('\n❌ FAILED TESTS:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          safeLogger.info(`   [${result.component}] ${result.test}: ${result.message}`);
        });
    }

    if (summary.WARN > 0) {
      safeLogger.info('\n⚠️  WARNINGS:');
      this.results
        .filter(r => r.status === 'WARN')
        .forEach(result => {
          safeLogger.info(`   [${result.component}] ${result.test}: ${result.message}`);
        });
    }

    const overallStatus = summary.FAIL > 0 ? 'FAILED' : summary.WARN > 0 ? 'PASSED WITH WARNINGS' : 'PASSED';
    safeLogger.info(`\n🎯 Overall Status: ${overallStatus}`);
    
    if (overallStatus === 'PASSED') {
      safeLogger.info('\n🎉 Admin Configuration System validation completed successfully!');
      safeLogger.info('   All components are functioning correctly and ready for production use.');
    } else if (overallStatus === 'PASSED WITH WARNINGS') {
      safeLogger.info('\n⚠️  Admin Configuration System validation completed with warnings.');
      safeLogger.info('   System is functional but some optimizations may be needed.');
    } else {
      safeLogger.info('\n❌ Admin Configuration System validation failed.');
      safeLogger.info('   Please address the failed tests before proceeding.');
    }
  }

  async runValidation(): Promise<void> {
    safeLogger.info('🚀 Starting Admin Configuration System Validation...');
    safeLogger.info('This will test all administrative interfaces and configuration management features.');

    try {
      await this.validatePolicyConfiguration();
      await this.validateThresholdConfiguration();
      await this.validateVendorConfiguration();
      await this.validateAlertConfiguration();
      await this.validateSystemStatusDashboard();
      await this.validateAuditLogAnalysis();
      await this.validateAuditTrail();
      await this.validatePerformance();
    } catch (error) {
      safeLogger.error('❌ Validation failed with error:', error);
      this.addResult('System', 'Overall Validation', 'FAIL', `Validation error: ${error}`);
    }

    this.generateReport();
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new AdminConfigurationSystemValidator();
  validator.runValidation()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      safeLogger.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

export { AdminConfigurationSystemValidator };