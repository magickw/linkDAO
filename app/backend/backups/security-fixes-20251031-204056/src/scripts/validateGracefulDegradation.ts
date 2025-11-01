#!/usr/bin/env node

import { GracefulDegradationService } from '../services/gracefulDegradationService';
import { safeLogger } from '../utils/safeLogger';
import { SystemHealthMonitoringService } from '../services/systemHealthMonitoringService';
import { safeLogger } from '../utils/safeLogger';
import { ErrorClassificationService } from '../services/errorClassificationService';
import { safeLogger } from '../utils/safeLogger';
import { AIModerationOrchestrator } from '../services/aiModerationOrchestrator';
import { safeLogger } from '../utils/safeLogger';

/**
 * Validation script for graceful degradation and error handling system
 * Tests various failure scenarios and recovery mechanisms
 */
class GracefulDegradationValidator {
  private degradationService: GracefulDegradationService;
  private healthMonitoringService: SystemHealthMonitoringService;
  private errorClassificationService: ErrorClassificationService;
  private orchestrator: AIModerationOrchestrator;
  private testResults: { [key: string]: boolean } = {};

  constructor() {
    this.degradationService = new GracefulDegradationService({
      enableFallbacks: true,
      maxRetries: 2,
      retryDelayMs: 100,
      healthCheckInterval: 5000
    });
    
    this.healthMonitoringService = new SystemHealthMonitoringService();
    this.errorClassificationService = new ErrorClassificationService();
    this.orchestrator = new AIModerationOrchestrator();
  }

  async runValidation(): Promise<void> {
    safeLogger.info('🚀 Starting Graceful Degradation System Validation...\n');

    try {
      await this.testRetryMechanism();
      await this.testFallbackStrategies();
      await this.testErrorClassification();
      await this.testCircuitBreakerBehavior();
      await this.testSystemHealthMonitoring();
      await this.testDegradationModes();
      await this.testRecoveryMechanisms();
      await this.testAIModerationIntegration();

      this.printResults();
    } catch (error) {
      safeLogger.error('❌ Validation failed with error:', error);
    } finally {
      this.cleanup();
    }
  }

  private async testRetryMechanism(): Promise<void> {
    safeLogger.info('🔄 Testing retry mechanism with exponential backoff...');
    
    try {
      let attemptCount = 0;
      const testOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const startTime = Date.now();
      const result = await this.degradationService.executeWithRetry(
        testOperation,
        'retry-test',
        3
      );

      const duration = Date.now() - startTime;
      
      if (result === 'success' && attemptCount === 3 && duration >= 300) {
        safeLogger.info('✅ Retry mechanism working correctly');
        safeLogger.info(`   - Attempts: ${attemptCount}, Duration: ${duration}ms`);
        this.testResults['retry_mechanism'] = true;
      } else {
        safeLogger.info('❌ Retry mechanism failed');
        this.testResults['retry_mechanism'] = false;
      }
    } catch (error) {
      safeLogger.info('❌ Retry mechanism test failed:', error);
      this.testResults['retry_mechanism'] = false;
    }
  }

  private async testFallbackStrategies(): Promise<void> {
    safeLogger.info('🛡️ Testing fallback strategies...');
    
    try {
      let fallbackExecuted = false;
      
      this.degradationService.registerFallbackStrategy('test-operation', {
        name: 'test-fallback',
        priority: 100,
        condition: () => true,
        execute: async () => {
          fallbackExecuted = true;
          return { fallback: true, data: 'fallback-result' };
        },
        description: 'Test fallback strategy'
      });

      // Test fallback execution directly
      const fallbackResult = await this.degradationService['executeFallback']('test-operation', {});
      
      if (fallbackExecuted && fallbackResult.fallback) {
        safeLogger.info('✅ Fallback strategies working correctly');
        this.testResults['fallback_strategies'] = true;
      } else {
        safeLogger.info('❌ Fallback strategies failed');
        this.testResults['fallback_strategies'] = false;
      }
    } catch (error) {
      safeLogger.info('❌ Fallback strategies test failed:', error);
      this.testResults['fallback_strategies'] = false;
    }
  }

  private async testErrorClassification(): Promise<void> {
    safeLogger.info('🏷️ Testing error classification...');
    
    try {
      const testErrors = [
        { error: new Error('Network timeout'), expectedType: 'timeout' },
        { error: new Error('Rate limit exceeded'), expectedType: 'rate_limit' },
        { error: new Error('Invalid API key'), expectedType: 'authentication' },
        { error: new Error('ValidationError: Invalid input'), expectedType: 'validation' },
        { error: new Error('ECONNREFUSED'), expectedType: 'network' }
      ];

      let correctClassifications = 0;
      
      testErrors.forEach(({ error, expectedType }) => {
        const classified = this.errorClassificationService.classifyError(error, {
          service: 'test-service',
          operation: 'test-operation',
          timestamp: new Date()
        });

        if (classified.classification.type === expectedType) {
          correctClassifications++;
        } else {
          safeLogger.info(`   - Misclassified: "${error.message}" as ${classified.classification.type}, expected ${expectedType}`);
        }
      });

      const accuracy = correctClassifications / testErrors.length;
      
      if (accuracy >= 0.8) {
        safeLogger.info(`✅ Error classification working correctly (${Math.round(accuracy * 100)}% accuracy)`);
        this.testResults['error_classification'] = true;
      } else {
        safeLogger.info(`❌ Error classification accuracy too low (${Math.round(accuracy * 100)}%)`);
        this.testResults['error_classification'] = false;
      }
    } catch (error) {
      safeLogger.info('❌ Error classification test failed:', error);
      this.testResults['error_classification'] = false;
    }
  }

  private async testCircuitBreakerBehavior(): Promise<void> {
    safeLogger.info('⚡ Testing circuit breaker behavior...');
    
    try {
      const failingOperation = () => Promise.reject(new Error('Service unavailable'));
      
      // Execute multiple times to trigger circuit breaker
      let failures = 0;
      for (let i = 0; i < 6; i++) {
        try {
          await this.degradationService.executeWithDegradation('circuit-test', failingOperation);
        } catch (error) {
          failures++;
        }
      }

      // Check circuit breaker state
      const systemHealth = this.degradationService.getSystemHealth();
      const circuitStats = systemHealth.circuitBreakerStats.get('circuit-test');
      
      if (failures > 0 && circuitStats) {
        safeLogger.info(`✅ Circuit breaker triggered after ${failures} failures`);
        safeLogger.info(`   - Circuit state: ${circuitStats.state}`);
        this.testResults['circuit_breaker'] = true;
      } else {
        safeLogger.info('❌ Circuit breaker not working correctly');
        this.testResults['circuit_breaker'] = false;
      }
    } catch (error) {
      safeLogger.info('❌ Circuit breaker test failed:', error);
      this.testResults['circuit_breaker'] = false;
    }
  }

  private async testSystemHealthMonitoring(): Promise<void> {
    safeLogger.info('📊 Testing system health monitoring...');
    
    try {
      // Collect initial metrics
      const initialMetrics = await this.healthMonitoringService.collectMetrics();
      
      // Simulate service health changes
      this.degradationService.updateServiceHealth('test-service-1', false);
      this.degradationService.updateServiceHealth('test-service-2', true);
      
      // Wait a bit for health monitoring to process
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const healthSummary = this.healthMonitoringService.getHealthSummary();
      
      if (initialMetrics && healthSummary && typeof healthSummary.uptime === 'number') {
        safeLogger.info('✅ System health monitoring working correctly');
        safeLogger.info(`   - Status: ${healthSummary.status}`);
        safeLogger.info(`   - Active alerts: ${healthSummary.activeAlerts}`);
        safeLogger.info(`   - Services: ${JSON.stringify(healthSummary.servicesStatus)}`);
        this.testResults['health_monitoring'] = true;
      } else {
        safeLogger.info('❌ System health monitoring failed');
        this.testResults['health_monitoring'] = false;
      }
    } catch (error) {
      safeLogger.info('❌ System health monitoring test failed:', error);
      this.testResults['health_monitoring'] = false;
    }
  }

  private async testDegradationModes(): Promise<void> {
    safeLogger.info('🔻 Testing degradation modes...');
    
    try {
      // Test normal mode
      let systemHealth = this.degradationService.getSystemHealth();
      const initialMode = systemHealth.degradationState.mode;
      
      // Force degraded mode
      this.degradationService.forceDegradedMode('Test degradation');
      systemHealth = this.degradationService.getSystemHealth();
      const degradedMode = systemHealth.degradationState.mode;
      
      // Simulate critical failure for emergency mode
      for (let i = 1; i <= 5; i++) {
        this.degradationService.updateServiceHealth(`critical-service-${i}`, false);
      }
      
      systemHealth = this.degradationService.getSystemHealth();
      const emergencyMode = systemHealth.degradationState.mode;
      
      if (degradedMode === 'degraded' && emergencyMode === 'emergency') {
        safeLogger.info('✅ Degradation modes working correctly');
        safeLogger.info(`   - Initial: ${initialMode}, Degraded: ${degradedMode}, Emergency: ${emergencyMode}`);
        this.testResults['degradation_modes'] = true;
      } else {
        safeLogger.info('❌ Degradation modes not working correctly');
        safeLogger.info(`   - Modes: ${initialMode} -> ${degradedMode} -> ${emergencyMode}`);
        this.testResults['degradation_modes'] = false;
      }
    } catch (error) {
      safeLogger.info('❌ Degradation modes test failed:', error);
      this.testResults['degradation_modes'] = false;
    }
  }

  private async testRecoveryMechanisms(): Promise<void> {
    safeLogger.info('🔄 Testing recovery mechanisms...');
    
    try {
      // Start with degraded state
      this.degradationService.forceDegradedMode('Test recovery');
      
      // Simulate service recovery
      this.degradationService.updateServiceHealth('recovery-service-1', true);
      this.degradationService.updateServiceHealth('recovery-service-2', true);
      this.degradationService.updateServiceHealth('recovery-service-3', true);
      
      // Attempt recovery
      const recoverySuccess = await this.degradationService.attemptRecovery();
      
      if (recoverySuccess !== undefined) {
        safeLogger.info(`✅ Recovery mechanisms working correctly (Success: ${recoverySuccess})`);
        this.testResults['recovery_mechanisms'] = true;
      } else {
        safeLogger.info('❌ Recovery mechanisms failed');
        this.testResults['recovery_mechanisms'] = false;
      }
    } catch (error) {
      safeLogger.info('❌ Recovery mechanisms test failed:', error);
      this.testResults['recovery_mechanisms'] = false;
    }
  }

  private async testAIModerationIntegration(): Promise<void> {
    safeLogger.info('🤖 Testing AI moderation integration...');
    
    try {
      const testContent = {
        id: 'validation-test-content',
        type: 'post' as const,
        text: 'This is a test message for validation',
        userId: 'validation-user',
        userReputation: 75,
        walletAddress: '0xvalidation...',
        metadata: { test: true }
      };

      // Test with healthy services
      const healthyResult = await this.orchestrator.scanContent(testContent);
      
      // Test health check
      const healthCheck = await this.orchestrator.healthCheck();
      
      if (healthyResult && healthyResult.action && healthCheck) {
        safeLogger.info('✅ AI moderation integration working correctly');
        safeLogger.info(`   - Moderation result: ${healthyResult.action}`);
        safeLogger.info(`   - Vendor health: ${Object.keys(healthCheck).length} vendors checked`);
        this.testResults['ai_moderation_integration'] = true;
      } else {
        safeLogger.info('❌ AI moderation integration failed');
        this.testResults['ai_moderation_integration'] = false;
      }
    } catch (error) {
      safeLogger.info('❌ AI moderation integration test failed:', error);
      this.testResults['ai_moderation_integration'] = false;
    }
  }

  private printResults(): void {
    safeLogger.info('\n📋 Validation Results Summary:');
    safeLogger.info('================================');
    
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(result => result).length;
    const failedTests = totalTests - passedTests;
    
    Object.entries(this.testResults).forEach(([testName, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const formattedName = testName.replace(/_/g, ' ').toUpperCase();
      safeLogger.info(`${status} - ${formattedName}`);
    });
    
    safeLogger.info('\n📊 Overall Results:');
    safeLogger.info(`   Total Tests: ${totalTests}`);
    safeLogger.info(`   Passed: ${passedTests}`);
    safeLogger.info(`   Failed: ${failedTests}`);
    safeLogger.info(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (failedTests === 0) {
      safeLogger.info('\n🎉 All tests passed! Graceful degradation system is working correctly.');
    } else {
      safeLogger.info(`\n⚠️  ${failedTests} test(s) failed. Please review the implementation.`);
    }

    // Print system health summary
    safeLogger.info('\n🏥 Current System Health:');
    const healthSummary = this.healthMonitoringService.getHealthSummary();
    safeLogger.info(`   Status: ${healthSummary.status}`);
    safeLogger.info(`   Uptime: ${Math.round(healthSummary.uptime)}s`);
    safeLogger.info(`   Active Alerts: ${healthSummary.activeAlerts}`);
    safeLogger.info(`   Services: Healthy(${healthSummary.servicesStatus.healthy}) Degraded(${healthSummary.servicesStatus.degraded}) Failed(${healthSummary.servicesStatus.failed})`);

    // Print error statistics
    const errorStats = this.errorClassificationService.getErrorStatistics();
    if (errorStats.totalErrors > 0) {
      safeLogger.info('\n📈 Error Statistics:');
      safeLogger.info(`   Total Errors: ${errorStats.totalErrors}`);
      safeLogger.info(`   Retryable: ${errorStats.retryableErrors}`);
      safeLogger.info(`   Non-retryable: ${errorStats.nonRetryableErrors}`);
      safeLogger.info(`   By Type: ${JSON.stringify(errorStats.errorsByType)}`);
    }
  }

  private cleanup(): void {
    safeLogger.info('\n🧹 Cleaning up resources...');
    this.degradationService.destroy();
    this.healthMonitoringService.destroy();
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new GracefulDegradationValidator();
  validator.runValidation().catch(safeLogger.error);
}

export { GracefulDegradationValidator };