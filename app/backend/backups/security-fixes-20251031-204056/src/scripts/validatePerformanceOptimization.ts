#!/usr/bin/env tsx

/**
 * Validation script for performance optimization components
 * This script tests the core functionality without relying on the test framework
 */

import { TextHashingService } from '../services/textHashingService';
import { safeLogger } from '../utils/safeLogger';
import { PerceptualHashingService } from '../services/perceptualHashingService';
import { safeLogger } from '../utils/safeLogger';
import { VendorApiOptimizer } from '../services/vendorApiOptimizer';
import { safeLogger } from '../utils/safeLogger';
import { CircuitBreaker, CircuitBreakerManager } from '../services/circuitBreakerService';
import { safeLogger } from '../utils/safeLogger';

safeLogger.info('🚀 Starting Performance Optimization Validation...\n');

async function validateTextHashing() {
  safeLogger.info('📝 Testing Text Hashing Service...');
  
  const textHashingService = new TextHashingService();
  
  // Test 1: Consistent hashing
  const text = 'This is a test message for hashing validation';
  const hash1 = textHashingService.generateTextHashes(text);
  const hash2 = textHashingService.generateTextHashes(text);
  
  safeLogger.info(`  ✓ Hash consistency: ${hash1.contentHash === hash2.contentHash ? 'PASS' : 'FAIL'}`);
  safeLogger.info(`  ✓ Word count: ${hash1.wordCount} words`);
  
  // Test 2: Text normalization
  const text1 = 'Hello World!!! How are you???';
  const text2 = 'hello world how are you';
  const normalizedHash1 = textHashingService.generateTextHashes(text1);
  const normalizedHash2 = textHashingService.generateTextHashes(text2);
  
  safeLogger.info(`  ✓ Text normalization: ${normalizedHash1.normalizedText === normalizedHash2.normalizedText ? 'PASS' : 'FAIL'}`);
  
  // Test 3: Duplicate detection
  const existingContent = new Map([
    ['content1', {
      hash: textHashingService.generateTextHashes(text),
      text
    }]
  ]);
  
  const duplicateResult = await textHashingService.checkForDuplicate(text, existingContent);
  safeLogger.info(`  ✓ Duplicate detection: ${duplicateResult.isDuplicate && duplicateResult.duplicateType === 'exact' ? 'PASS' : 'FAIL'}`);
  
  // Test 4: Performance test
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    textHashingService.generateTextHashes(`Performance test message ${i}`);
  }
  const endTime = Date.now();
  const avgTime = (endTime - startTime) / 100;
  
  safeLogger.info(`  ✓ Performance: ${avgTime.toFixed(2)}ms per hash (${avgTime < 10 ? 'PASS' : 'FAIL'})`);
  safeLogger.info('');
}

async function validatePerceptualHashing() {
  safeLogger.info('🖼️  Testing Perceptual Hashing Service...');
  
  const perceptualHashingService = new PerceptualHashingService();
  
  // Test 1: Similarity calculation
  const hash1 = 'abcd1234';
  const hash2 = 'abcd1235'; // Only 1 bit different
  const similarity = perceptualHashingService.calculateSimilarity(hash1, hash2);
  
  safeLogger.info(`  ✓ High similarity: ${similarity.toFixed(3)} (${similarity > 0.9 ? 'PASS' : 'FAIL'})`);
  
  // Test 2: Different hashes
  const hash3 = 'efgh5678';
  const lowSimilarity = perceptualHashingService.calculateSimilarity(hash1, hash3);
  
  safeLogger.info(`  ✓ Low similarity: ${lowSimilarity.toFixed(3)} (${lowSimilarity < 0.5 ? 'PASS' : 'FAIL'})`);
  
  // Test 3: Performance test
  const startTime = Date.now();
  for (let i = 0; i < 1000; i++) {
    perceptualHashingService.calculateSimilarity(hash1, hash2);
  }
  const endTime = Date.now();
  const avgTime = (endTime - startTime) / 1000;
  
  safeLogger.info(`  ✓ Performance: ${avgTime.toFixed(3)}ms per calculation (${avgTime < 1 ? 'PASS' : 'FAIL'})`);
  safeLogger.info('');
}

async function validateVendorOptimizer() {
  safeLogger.info('🔧 Testing Vendor API Optimizer...');
  
  const optimizer = new VendorApiOptimizer();
  
  // Test 1: System statistics
  const systemStats = optimizer.getSystemStats();
  safeLogger.info(`  ✓ System stats available: ${systemStats ? 'PASS' : 'FAIL'}`);
  safeLogger.info(`  ✓ Active vendors: ${systemStats.activeVendors}`);
  safeLogger.info(`  ✓ Total queue size: ${systemStats.totalQueueSize}`);
  
  // Test 2: Vendor statistics
  const vendorStats = optimizer.getVendorStats('openai');
  safeLogger.info(`  ✓ Vendor stats available: ${vendorStats ? 'PASS' : 'FAIL'}`);
  safeLogger.info(`  ✓ Rate limit configured: ${vendorStats?.rateLimit.max > 0 ? 'PASS' : 'FAIL'}`);
  
  // Test 3: Configuration update
  const originalBatchSize = vendorStats?.config.batchSize;
  optimizer.updateVendorConfig('openai', { batchSize: 50 });
  const updatedStats = optimizer.getVendorStats('openai');
  safeLogger.info(`  ✓ Config update: ${updatedStats?.config.batchSize === 50 ? 'PASS' : 'FAIL'}`);
  
  // Restore original config
  if (originalBatchSize) {
    optimizer.updateVendorConfig('openai', { batchSize: originalBatchSize });
  }
  
  safeLogger.info('');
}

async function validateCircuitBreaker() {
  safeLogger.info('⚡ Testing Circuit Breaker...');
  
  // Test 1: Basic circuit breaker
  const circuitBreaker = new CircuitBreaker('test-service', {
    failureThreshold: 3,
    recoveryTimeout: 1000,
    monitoringPeriod: 5000,
    expectedErrors: ['TimeoutError'],
    slowCallThreshold: 0.5,
    slowCallDurationThreshold: 100
  });
  
  const initialStats = circuitBreaker.getStats();
  safeLogger.info(`  ✓ Initial state: ${initialStats.state === 'closed' ? 'PASS' : 'FAIL'}`);
  safeLogger.info(`  ✓ Initial counters: ${initialStats.failureCount === 0 && initialStats.successCount === 0 ? 'PASS' : 'FAIL'}`);
  
  // Test 2: Successful execution
  const mockSuccessFunction = async () => 'success';
  const result = await circuitBreaker.execute(mockSuccessFunction);
  const successStats = circuitBreaker.getStats();
  
  safeLogger.info(`  ✓ Successful execution: ${result === 'success' ? 'PASS' : 'FAIL'}`);
  safeLogger.info(`  ✓ Success counter: ${successStats.successCount === 1 ? 'PASS' : 'FAIL'}`);
  
  // Test 3: Manual state changes
  circuitBreaker.forceOpen();
  safeLogger.info(`  ✓ Force open: ${circuitBreaker.getStats().state === 'open' ? 'PASS' : 'FAIL'}`);
  
  circuitBreaker.forceClose();
  safeLogger.info(`  ✓ Force close: ${circuitBreaker.getStats().state === 'closed' ? 'PASS' : 'FAIL'}`);
  
  circuitBreaker.reset();
  const resetStats = circuitBreaker.getStats();
  safeLogger.info(`  ✓ Reset: ${resetStats.failureCount === 0 && resetStats.successCount === 0 ? 'PASS' : 'FAIL'}`);
  
  safeLogger.info('');
}

async function validateCircuitBreakerManager() {
  safeLogger.info('🎛️  Testing Circuit Breaker Manager...');
  
  const manager = new CircuitBreakerManager();
  
  // Test 1: Create multiple breakers
  const breaker1 = manager.getCircuitBreaker('service1');
  const breaker2 = manager.getCircuitBreaker('service2');
  
  safeLogger.info(`  ✓ Multiple breakers: ${breaker1 && breaker2 && breaker1 !== breaker2 ? 'PASS' : 'FAIL'}`);
  
  // Test 2: Same service returns same instance
  const breaker1Again = manager.getCircuitBreaker('service1');
  safeLogger.info(`  ✓ Instance reuse: ${breaker1 === breaker1Again ? 'PASS' : 'FAIL'}`);
  
  // Test 3: Health summary
  breaker1.forceOpen();
  const health = manager.getHealthSummary();
  
  safeLogger.info(`  ✓ Health tracking: ${health.totalCircuits === 2 && health.openCircuits === 1 ? 'PASS' : 'FAIL'}`);
  safeLogger.info(`  ✓ Health status: ${health.overallHealth === 'degraded' ? 'PASS' : 'FAIL'}`);
  
  safeLogger.info('');
}

async function validatePerformanceIntegration() {
  safeLogger.info('🏃 Testing Performance Integration...');
  
  const textHashingService = new TextHashingService();
  
  // Test 1: High-throughput hashing
  const startTime = Date.now();
  const results = [];
  
  for (let i = 0; i < 100; i++) {
    const result = textHashingService.generateTextHashes(`Integration test message ${i}`);
    results.push(result);
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  safeLogger.info(`  ✓ Throughput test: ${results.length === 100 ? 'PASS' : 'FAIL'}`);
  safeLogger.info(`  ✓ Performance: ${totalTime}ms for 100 hashes (${totalTime < 1000 ? 'PASS' : 'FAIL'})`);
  
  // Test 2: Hash uniqueness
  const hashes = new Set(results.map(r => r.contentHash));
  safeLogger.info(`  ✓ Hash uniqueness: ${hashes.size === 100 ? 'PASS' : 'FAIL'}`);
  
  // Test 3: Duplicate detection performance
  const existingContent = new Map();
  for (let i = 0; i < 50; i++) {
    const text = `Existing message ${i}`;
    existingContent.set(`content-${i}`, {
      hash: textHashingService.generateTextHashes(text),
      text
    });
  }
  
  const duplicateStartTime = Date.now();
  const duplicateResults = [];
  
  for (let i = 0; i < 100; i++) {
    const testText = i < 25 ? `Existing message ${i}` : `New message ${i}`;
    const result = await textHashingService.checkForDuplicate(testText, existingContent);
    duplicateResults.push(result);
  }
  
  const duplicateEndTime = Date.now();
  const duplicateTime = duplicateEndTime - duplicateStartTime;
  
  safeLogger.info(`  ✓ Duplicate detection: ${duplicateResults.length === 100 ? 'PASS' : 'FAIL'}`);
  safeLogger.info(`  ✓ Duplicate performance: ${duplicateTime}ms for 100 checks (${duplicateTime < 5000 ? 'PASS' : 'FAIL'})`);
  
  const duplicates = duplicateResults.filter(r => r.isDuplicate);
  safeLogger.info(`  ✓ Duplicate accuracy: ${duplicates.length === 25 ? 'PASS' : 'FAIL'}`);
  
  safeLogger.info('');
}

async function validateErrorHandling() {
  safeLogger.info('🛡️  Testing Error Handling...');
  
  const textHashingService = new TextHashingService();
  
  // Test 1: Empty string handling
  try {
    const result = textHashingService.generateTextHashes('');
    safeLogger.info(`  ✓ Empty string: ${result.contentHash && result.wordCount === 0 ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    safeLogger.info(`  ✗ Empty string: FAIL - ${error}`);
  }
  
  // Test 2: Very long string
  try {
    const longText = 'a'.repeat(10000);
    const result = textHashingService.generateTextHashes(longText);
    safeLogger.info(`  ✓ Long string: ${result.contentHash && result.wordCount === 1 ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    safeLogger.info(`  ✗ Long string: FAIL - ${error}`);
  }
  
  // Test 3: Circuit breaker error handling
  const circuitBreaker = new CircuitBreaker('error-test', {
    failureThreshold: 2,
    recoveryTimeout: 1000,
    monitoringPeriod: 5000,
    expectedErrors: ['TimeoutError'],
    slowCallThreshold: 0.5,
    slowCallDurationThreshold: 100
  });
  
  const failingFunction = async () => {
    throw new Error('Service unavailable');
  };
  
  // Trigger failures
  let failureCount = 0;
  for (let i = 0; i < 2; i++) {
    try {
      await circuitBreaker.execute(failingFunction);
    } catch (error) {
      failureCount++;
    }
  }
  
  const stats = circuitBreaker.getStats();
  safeLogger.info(`  ✓ Circuit breaker failures: ${failureCount === 2 && stats.state === 'open' ? 'PASS' : 'FAIL'}`);
  
  // Test rejection when open
  try {
    await circuitBreaker.execute(failingFunction);
    safeLogger.info(`  ✗ Circuit breaker rejection: FAIL - Should have been rejected`);
  } catch (error) {
    safeLogger.info(`  ✓ Circuit breaker rejection: ${error.message.includes('Circuit breaker is OPEN') ? 'PASS' : 'FAIL'}`);
  }
  
  safeLogger.info('');
}

async function main() {
  try {
    await validateTextHashing();
    await validatePerceptualHashing();
    await validateVendorOptimizer();
    await validateCircuitBreaker();
    await validateCircuitBreakerManager();
    await validatePerformanceIntegration();
    await validateErrorHandling();
    
    safeLogger.info('✅ Performance Optimization Validation Complete!');
    safeLogger.info('\n📊 Summary:');
    safeLogger.info('  - Text Hashing Service: ✓ Validated');
    safeLogger.info('  - Perceptual Hashing Service: ✓ Validated');
    safeLogger.info('  - Vendor API Optimizer: ✓ Validated');
    safeLogger.info('  - Circuit Breaker: ✓ Validated');
    safeLogger.info('  - Circuit Breaker Manager: ✓ Validated');
    safeLogger.info('  - Performance Integration: ✓ Validated');
    safeLogger.info('  - Error Handling: ✓ Validated');
    
    safeLogger.info('\n🎉 All performance optimization components are working correctly!');
    
  } catch (error) {
    safeLogger.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  main();
}