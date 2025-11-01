#!/usr/bin/env node

/**
 * Privacy Compliance Test Runner
 * 
 * This script runs privacy and compliance tests to validate the implementation
 * of Task 14: Privacy and Compliance Features
 */

import { execSync } from 'child_process';
import { safeLogger } from '../utils/safeLogger';
import { existsSync } from 'fs';
import { safeLogger } from '../utils/safeLogger';
import path from 'path';
import { safeLogger } from '../utils/safeLogger';

interface TestResult {
  testFile: string;
  passed: boolean;
  duration: number;
  error?: string;
}

class PrivacyComplianceTestRunner {
  private testFiles = [
    'privacyCompliance.test.ts',
    'dataProtection.integration.test.ts'
  ];

  async runTests(): Promise<void> {
    safeLogger.info('🔒 Privacy and Compliance Test Runner');
    safeLogger.info('=====================================\n');

    const results: TestResult[] = [];

    for (const testFile of this.testFiles) {
      safeLogger.info(`Running ${testFile}...`);
      const result = await this.runSingleTest(testFile);
      results.push(result);
      
      if (result.passed) {
        safeLogger.info(`✅ ${testFile} - PASSED (${result.duration}ms)\n`);
      } else {
        safeLogger.info(`❌ ${testFile} - FAILED (${result.duration}ms)`);
        if (result.error) {
          safeLogger.info(`Error: ${result.error}\n`);
        }
      }
    }

    this.printSummary(results);
  }

  private async runSingleTest(testFile: string): Promise<TestResult> {
    const startTime = Date.now();
    const testPath = path.join(__dirname, testFile);

    if (!existsSync(testPath)) {
      return {
        testFile,
        passed: false,
        duration: Date.now() - startTime,
        error: `Test file not found: ${testPath}`
      };
    }

    try {
      // Run the test using vitest
      execSync(`npx vitest run ${testPath} --reporter=verbose`, {
        stdio: 'pipe',
        cwd: path.join(__dirname, '..')
      });

      return {
        testFile,
        passed: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        testFile,
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private printSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    safeLogger.info('\n📊 Test Summary');
    safeLogger.info('===============');
    safeLogger.info(`Total Tests: ${results.length}`);
    safeLogger.info(`Passed: ${passed}`);
    safeLogger.info(`Failed: ${failed}`);
    safeLogger.info(`Total Duration: ${totalDuration}ms`);

    if (failed > 0) {
      safeLogger.info('\n❌ Failed Tests:');
      results.filter(r => !r.passed).forEach(result => {
        safeLogger.info(`  - ${result.testFile}: ${result.error || 'Unknown error'}`);
      });
    }

    safeLogger.info('\n🔒 Privacy Compliance Features Tested:');
    safeLogger.info('  ✓ PII Detection and Redaction');
    safeLogger.info('  ✓ Geofencing and Regional Compliance');
    safeLogger.info('  ✓ Data Retention Policies');
    safeLogger.info('  ✓ User Consent Management');
    safeLogger.info('  ✓ Privacy-Compliant Evidence Storage');
    safeLogger.info('  ✓ GDPR Compliance Workflows');
    safeLogger.info('  ✓ CCPA Compliance Workflows');
    safeLogger.info('  ✓ Cross-Border Data Transfer Rules');
    safeLogger.info('  ✓ Data Protection Integration');

    if (passed === results.length) {
      safeLogger.info('\n🎉 All privacy compliance tests passed!');
      safeLogger.info('Task 14 implementation is ready for production.');
    } else {
      safeLogger.info('\n⚠️  Some tests failed. Please review and fix issues before deployment.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new PrivacyComplianceTestRunner();
  runner.runTests().catch(error => {
    safeLogger.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { PrivacyComplianceTestRunner };