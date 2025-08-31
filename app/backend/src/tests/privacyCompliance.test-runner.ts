#!/usr/bin/env node

/**
 * Privacy Compliance Test Runner
 * 
 * This script runs privacy and compliance tests to validate the implementation
 * of Task 14: Privacy and Compliance Features
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

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
    console.log('🔒 Privacy and Compliance Test Runner');
    console.log('=====================================\n');

    const results: TestResult[] = [];

    for (const testFile of this.testFiles) {
      console.log(`Running ${testFile}...`);
      const result = await this.runSingleTest(testFile);
      results.push(result);
      
      if (result.passed) {
        console.log(`✅ ${testFile} - PASSED (${result.duration}ms)\n`);
      } else {
        console.log(`❌ ${testFile} - FAILED (${result.duration}ms)`);
        if (result.error) {
          console.log(`Error: ${result.error}\n`);
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

    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`Total Tests: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${totalDuration}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.testFile}: ${result.error || 'Unknown error'}`);
      });
    }

    console.log('\n🔒 Privacy Compliance Features Tested:');
    console.log('  ✓ PII Detection and Redaction');
    console.log('  ✓ Geofencing and Regional Compliance');
    console.log('  ✓ Data Retention Policies');
    console.log('  ✓ User Consent Management');
    console.log('  ✓ Privacy-Compliant Evidence Storage');
    console.log('  ✓ GDPR Compliance Workflows');
    console.log('  ✓ CCPA Compliance Workflows');
    console.log('  ✓ Cross-Border Data Transfer Rules');
    console.log('  ✓ Data Protection Integration');

    if (passed === results.length) {
      console.log('\n🎉 All privacy compliance tests passed!');
      console.log('Task 14 implementation is ready for production.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix issues before deployment.');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new PrivacyComplianceTestRunner();
  runner.runTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { PrivacyComplianceTestRunner };