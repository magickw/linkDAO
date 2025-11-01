#!/usr/bin/env ts-node

/**
 * Marketplace Enhancements Test Runner
 * Comprehensive test suite for all marketplace enhancement features
 */

import { execSync } from 'child_process';
import { safeLogger } from '../utils/safeLogger';
import { existsSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  description: string;
  testFiles: string[];
  category: 'unit' | 'integration' | 'e2e';
  timeout?: number;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

class MarketplaceTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'ENS Validation Unit Tests',
      description: 'Test ENS validation and integration functions',
      testFiles: ['ensValidation.unit.test.ts'],
      category: 'unit',
      timeout: 30000,
    },
    {
      name: 'Image Processing Unit Tests',
      description: 'Test image upload and processing pipeline',
      testFiles: ['imageProcessing.unit.test.ts'],
      category: 'unit',
      timeout: 45000,
    },
    {
      name: 'Payment Validation Unit Tests',
      description: 'Test payment validation and processing logic',
      testFiles: ['paymentValidation.unit.test.ts'],
      category: 'unit',
      timeout: 30000,
    },
    {
      name: 'Order Management Unit Tests',
      description: 'Test order creation and management functions',
      testFiles: ['orderManagement.unit.test.ts'],
      category: 'unit',
      timeout: 30000,
    },
    {
      name: 'Profile Editing Workflow Integration Tests',
      description: 'Test complete profile editing workflow',
      testFiles: ['profileEditingWorkflow.integration.test.ts'],
      category: 'integration',
      timeout: 60000,
    },
    {
      name: 'Listing Creation Workflow Integration Tests',
      description: 'Test end-to-end listing creation with images',
      testFiles: ['listingCreationWorkflow.integration.test.ts'],
      category: 'integration',
      timeout: 60000,
    },
    {
      name: 'Checkout Process Integration Tests',
      description: 'Test full checkout process for all payment methods',
      testFiles: ['checkoutProcess.integration.test.ts'],
      category: 'integration',
      timeout: 90000,
    },
    {
      name: 'User Acceptance Tests',
      description: 'Test complete user workflows and error scenarios',
      testFiles: ['userAcceptance.integration.test.ts'],
      category: 'e2e',
      timeout: 120000,
    },
  ];

  private results: TestResult[] = [];

  constructor() {
    safeLogger.info('🚀 Marketplace Enhancements Test Runner');
    safeLogger.info('=========================================\n');
  }

  async runAllTests(): Promise<void> {
    safeLogger.info(`Running ${this.testSuites.length} test suites...\n`);

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    this.printSummary();
  }

  async runTestSuite(suite: TestSuite): Promise<void> {
    safeLogger.info(`📋 ${suite.name}`);
    safeLogger.info(`   ${suite.description}`);
    safeLogger.info(`   Category: ${suite.category.toUpperCase()}`);

    const startTime = Date.now();
    let passed = false;
    let output = '';
    let error: string | undefined;

    try {
      // Check if test files exist
      const missingFiles = suite.testFiles.filter(file => {
        const filePath = path.join(__dirname, file);
        return !existsSync(filePath);
      });

      if (missingFiles.length > 0) {
        throw new Error(`Missing test files: ${missingFiles.join(', ')}`);
      }

      // Run the test suite
      const testPattern = suite.testFiles.map(file => 
        path.join(__dirname, file)
      ).join(' ');

      const command = `npx jest ${testPattern} --verbose --detectOpenHandles --forceExit`;
      
      if (suite.timeout) {
        process.env.JEST_TIMEOUT = suite.timeout.toString();
      }

      output = execSync(command, {
        cwd: path.join(__dirname, '../../../..'),
        encoding: 'utf8',
        timeout: suite.timeout || 60000,
      });

      passed = true;
      safeLogger.info(`   ✅ PASSED (${Date.now() - startTime}ms)\n`);

    } catch (err: any) {
      error = err.message;
      output = err.stdout || err.message;
      safeLogger.info(`   ❌ FAILED (${Date.now() - startTime}ms)`);
      safeLogger.info(`   Error: ${error}\n`);
    }

    this.results.push({
      suite: suite.name,
      passed,
      duration: Date.now() - startTime,
      output,
      error,
    });
  }

  async runSpecificCategory(category: 'unit' | 'integration' | 'e2e'): Promise<void> {
    const suitesToRun = this.testSuites.filter(suite => suite.category === category);
    
    safeLogger.info(`Running ${suitesToRun.length} ${category.toUpperCase()} test suites...\n`);

    for (const suite of suitesToRun) {
      await this.runTestSuite(suite);
    }

    this.printSummary();
  }

  async runSpecificSuite(suiteName: string): Promise<void> {
    const suite = this.testSuites.find(s => 
      s.name.toLowerCase().includes(suiteName.toLowerCase())
    );

    if (!suite) {
      safeLogger.info(`❌ Test suite "${suiteName}" not found`);
      safeLogger.info('\nAvailable test suites:');
      this.testSuites.forEach(s => safeLogger.info(`  - ${s.name}`));
      return;
    }

    await this.runTestSuite(suite);
    this.printSummary();
  }

  private printSummary(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    safeLogger.info('\n📊 TEST SUMMARY');
    safeLogger.info('================');
    safeLogger.info(`Total Suites: ${totalTests}`);
    safeLogger.info(`Passed: ${passedTests} ✅`);
    safeLogger.info(`Failed: ${failedTests} ❌`);
    safeLogger.info(`Total Duration: ${totalDuration}ms`);
    safeLogger.info(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      safeLogger.info('\n❌ FAILED SUITES:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          safeLogger.info(`  - ${r.suite}: ${r.error}`);
        });
    }

    safeLogger.info('\n📋 DETAILED RESULTS:');
    this.results.forEach(r => {
      const status = r.passed ? '✅' : '❌';
      safeLogger.info(`  ${status} ${r.suite} (${r.duration}ms)`);
    });

    // Generate test report
    this.generateTestReport();
  }

  private generateTestReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        duration: this.results.reduce((sum, r) => sum + r.duration, 0),
      },
      results: this.results.map(r => ({
        suite: r.suite,
        passed: r.passed,
        duration: r.duration,
        error: r.error,
      })),
    };

    const reportPath = path.join(__dirname, 'test-report.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    safeLogger.info(`\n📄 Test report saved to: ${reportPath}`);
  }

  async validateTestEnvironment(): Promise<boolean> {
    safeLogger.info('🔍 Validating test environment...\n');

    const checks = [
      {
        name: 'Node.js version',
        check: () => {
          const version = process.version;
          const major = parseInt(version.slice(1).split('.')[0]);
          return major >= 18;
        },
        message: 'Node.js 18+ required',
      },
      {
        name: 'Jest installation',
        check: () => {
          try {
            execSync('npx jest --version', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        },
        message: 'Jest is required for running tests',
      },
      {
        name: 'TypeScript compilation',
        check: () => {
          try {
            execSync('npx tsc --noEmit', { 
              cwd: path.join(__dirname, '../../../..'),
              stdio: 'pipe' 
            });
            return true;
          } catch {
            return false;
          }
        },
        message: 'TypeScript compilation must pass',
      },
      {
        name: 'Test files exist',
        check: () => {
          return this.testSuites.every(suite =>
            suite.testFiles.every(file =>
              existsSync(path.join(__dirname, file))
            )
          );
        },
        message: 'All test files must exist',
      },
    ];

    let allPassed = true;

    for (const check of checks) {
      const passed = check.check();
      const status = passed ? '✅' : '❌';
      safeLogger.info(`  ${status} ${check.name}`);
      
      if (!passed) {
        safeLogger.info(`      ${check.message}`);
        allPassed = false;
      }
    }

    safeLogger.info(`\n${allPassed ? '✅' : '❌'} Environment validation ${allPassed ? 'passed' : 'failed'}\n`);
    return allPassed;
  }

  listTestSuites(): void {
    safeLogger.info('📋 Available Test Suites:');
    safeLogger.info('=========================\n');

    const categories = ['unit', 'integration', 'e2e'] as const;
    
    categories.forEach(category => {
      const suites = this.testSuites.filter(s => s.category === category);
      if (suites.length > 0) {
        safeLogger.info(`${category.toUpperCase()} TESTS:`);
        suites.forEach(suite => {
          safeLogger.info(`  - ${suite.name}`);
          safeLogger.info(`    ${suite.description}`);
          safeLogger.info(`    Files: ${suite.testFiles.join(', ')}`);
          safeLogger.info('');
        });
      }
    });
  }
}

// CLI Interface
async function main() {
  const runner = new MarketplaceTestRunner();
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    safeLogger.info(`
Marketplace Enhancements Test Runner

Usage:
  npm run test:marketplace [options]

Options:
  --help, -h          Show this help message
  --list, -l          List all available test suites
  --validate, -v      Validate test environment
  --unit              Run only unit tests
  --integration       Run only integration tests
  --e2e               Run only end-to-end tests
  --suite <name>      Run specific test suite
  --all               Run all tests (default)

Examples:
  npm run test:marketplace --unit
  npm run test:marketplace --suite "ENS Validation"
  npm run test:marketplace --validate
`);
    return;
  }

  if (args.includes('--list') || args.includes('-l')) {
    runner.listTestSuites();
    return;
  }

  if (args.includes('--validate') || args.includes('-v')) {
    const isValid = await runner.validateTestEnvironment();
    process.exit(isValid ? 0 : 1);
  }

  if (args.includes('--unit')) {
    await runner.runSpecificCategory('unit');
  } else if (args.includes('--integration')) {
    await runner.runSpecificCategory('integration');
  } else if (args.includes('--e2e')) {
    await runner.runSpecificCategory('e2e');
  } else if (args.includes('--suite')) {
    const suiteIndex = args.indexOf('--suite');
    const suiteName = args[suiteIndex + 1];
    if (!suiteName) {
      safeLogger.info('❌ Please specify a suite name after --suite');
      return;
    }
    await runner.runSpecificSuite(suiteName);
  } else {
    // Run all tests by default
    const isValid = await runner.validateTestEnvironment();
    if (!isValid) {
      safeLogger.info('❌ Environment validation failed. Please fix the issues above.');
      process.exit(1);
    }
    await runner.runAllTests();
  }
}

if (require.main === module) {
  main().catch(safeLogger.error);
}

export { MarketplaceTestRunner };
