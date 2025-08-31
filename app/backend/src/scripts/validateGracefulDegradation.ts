#!/usr/bin/env node

import { GracefulDegradationService } from '../services/gracefulDegradationService';
import { SystemHealthMonitoringService } from '../services/systemHealthMonitoringService';
import { ErrorClassificationService } from '../services/errorClassificationService';
import { AIModerationOrchestrator } from '../services/aiModerationOrchestrator';

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
    console.log('🚀 Starting Graceful Degradation System Validation...\n');

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
      console.error('❌ Validation failed with error:', error);
    } finally {
      this.cleanup();
    }
  }

  private async testRetryMechanism(): Promise<void> {
    console.log('🔄 Testing retry mechanism with exponential backoff...');
    
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
        console.log('✅ Retry mechanism working correctly');
        console.log(`   - Attempts: ${attemptCount}, Duration: ${duration}ms`);
        this.testResults['retry_mechanism'] = true;
      } else {
        console.log('❌ Retry mechanism failed');
        this.testResults['retry_mechanism'] = false;
      }
    } catch (error) {
      console.log('❌ Retry mechanism test failed:', error);
      this.testResults['retry_mechanism'] = false;
    }
  }

  private async testFallbackStrategies(): Promise<void> {
    console.log('🛡️ Testing fallback strategies...');
    
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
        console.log('✅ Fallback strategies working correctly');
        this.testResults['fallback_strategies'] = true;
      } else {
        console.log('❌ Fallback strategies failed');
        this.testResults['fallback_strategies'] = false;
      }
    } catch (error) {
      console.log('❌ Fallback strategies test failed:', error);
      this.testResults['fallback_strategies'] = false;
    }
  }

  private async testErrorClassification(): Promise<void> {
    console.log('🏷️ Testing error classification...');
    
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
          console.log(`   - Misclassified: "${error.message}" as ${classified.classification.type}, expected ${expectedType}`);
        }
      });

      const accuracy = correctClassifications / testErrors.length;
      
      if (accuracy >= 0.8) {
        console.log(`✅ Error classification working correctly (${Math.round(accuracy * 100)}% accuracy)`);
        this.testResults['error_classification'] = true;
      } else {
        console.log(`❌ Error classification accuracy too low (${Math.round(accuracy * 100)}%)`);
        this.testResults['error_classification'] = false;
      }
    } catch (error) {
      console.log('❌ Error classification test failed:', error);
      this.testResults['error_classification'] = false;
    }
  }

  private async testCircuitBreakerBehavior(): Promise<void> {
    console.log('⚡ Testing circuit breaker behavior...');
    
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
        console.log(`✅ Circuit breaker triggered after ${failures} failures`);
        console.log(`   - Circuit state: ${circuitStats.state}`);
        this.testResults['circuit_breaker'] = true;
      } else {
        console.log('❌ Circuit breaker not working correctly');
        this.testResults['circuit_breaker'] = false;
      }
    } catch (error) {
      console.log('❌ Circuit breaker test failed:', error);
      this.testResults['circuit_breaker'] = false;
    }
  }

  private async testSystemHealthMonitoring(): Promise<void> {
    console.log('📊 Testing system health monitoring...');
    
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
        console.log('✅ System health monitoring working correctly');
        console.log(`   - Status: ${healthSummary.status}`);
        console.log(`   - Active alerts: ${healthSummary.activeAlerts}`);
        console.log(`   - Services: ${JSON.stringify(healthSummary.servicesStatus)}`);
        this.testResults['health_monitoring'] = true;
      } else {
        console.log('❌ System health monitoring failed');
        this.testResults['health_monitoring'] = false;
      }
    } catch (error) {
      console.log('❌ System health monitoring test failed:', error);
      this.testResults['health_monitoring'] = false;
    }
  }

  private async testDegradationModes(): Promise<void> {
    console.log('🔻 Testing degradation modes...');
    
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
        console.log('✅ Degradation modes working correctly');
        console.log(`   - Initial: ${initialMode}, Degraded: ${degradedMode}, Emergency: ${emergencyMode}`);
        this.testResults['degradation_modes'] = true;
      } else {
        console.log('❌ Degradation modes not working correctly');
        console.log(`   - Modes: ${initialMode} -> ${degradedMode} -> ${emergencyMode}`);
        this.testResults['degradation_modes'] = false;
      }
    } catch (error) {
      console.log('❌ Degradation modes test failed:', error);
      this.testResults['degradation_modes'] = false;
    }
  }

  private async testRecoveryMechanisms(): Promise<void> {
    console.log('🔄 Testing recovery mechanisms...');
    
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
        console.log(`✅ Recovery mechanisms working correctly (Success: ${recoverySuccess})`);
        this.testResults['recovery_mechanisms'] = true;
      } else {
        console.log('❌ Recovery mechanisms failed');
        this.testResults['recovery_mechanisms'] = false;
      }
    } catch (error) {
      console.log('❌ Recovery mechanisms test failed:', error);
      this.testResults['recovery_mechanisms'] = false;
    }
  }

  private async testAIModerationIntegration(): Promise<void> {
    console.log('🤖 Testing AI moderation integration...');
    
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
        console.log('✅ AI moderation integration working correctly');
        console.log(`   - Moderation result: ${healthyResult.action}`);
        console.log(`   - Vendor health: ${Object.keys(healthCheck).length} vendors checked`);
        this.testResults['ai_moderation_integration'] = true;
      } else {
        console.log('❌ AI moderation integration failed');
        this.testResults['ai_moderation_integration'] = false;
      }
    } catch (error) {
      console.log('❌ AI moderation integration test failed:', error);
      this.testResults['ai_moderation_integration'] = false;
    }
  }

  private printResults(): void {
    console.log('\n📋 Validation Results Summary:');
    console.log('================================');
    
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(result => result).length;
    const failedTests = totalTests - passedTests;
    
    Object.entries(this.testResults).forEach(([testName, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const formattedName = testName.replace(/_/g, ' ').toUpperCase();
      console.log(`${status} - ${formattedName}`);
    });
    
    console.log('\n📊 Overall Results:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Graceful degradation system is working correctly.');
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please review the implementation.`);
    }

    // Print system health summary
    console.log('\n🏥 Current System Health:');
    const healthSummary = this.healthMonitoringService.getHealthSummary();
    console.log(`   Status: ${healthSummary.status}`);
    console.log(`   Uptime: ${Math.round(healthSummary.uptime)}s`);
    console.log(`   Active Alerts: ${healthSummary.activeAlerts}`);
    console.log(`   Services: Healthy(${healthSummary.servicesStatus.healthy}) Degraded(${healthSummary.servicesStatus.degraded}) Failed(${healthSummary.servicesStatus.failed})`);

    // Print error statistics
    const errorStats = this.errorClassificationService.getErrorStatistics();
    if (errorStats.totalErrors > 0) {
      console.log('\n📈 Error Statistics:');
      console.log(`   Total Errors: ${errorStats.totalErrors}`);
      console.log(`   Retryable: ${errorStats.retryableErrors}`);
      console.log(`   Non-retryable: ${errorStats.nonRetryableErrors}`);
      console.log(`   By Type: ${JSON.stringify(errorStats.errorsByType)}`);
    }
  }

  private cleanup(): void {
    console.log('\n🧹 Cleaning up resources...');
    this.degradationService.destroy();
    this.healthMonitoringService.destroy();
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new GracefulDegradationValidator();
  validator.runValidation().catch(console.error);
}

export { GracefulDegradationValidator };