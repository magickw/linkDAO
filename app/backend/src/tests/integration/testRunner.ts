#!/usr/bin/env ts-node

/**
 * Integration Test Runner
 * 
 * Comprehensive test runner for all backend API integration tests
 * including setup, teardown, and reporting functionality.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  timeout?: number;
  critical?: boolean;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  error?: string;
  coverage?: number;
}

interface TestReport {
  timestamp: string;
  environment: string;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalDuration: number;
  overallCoverage: number;
  results: TestResult[];
}

const testSuites: TestSuite[] = [
  {
    name: 'Backend API Integration',
    file: 'backendApiIntegration.test.ts',
    description: 'Comprehensive API endpoint integration tests',
    timeout: 60000,
    critical: true
  },
  {
    name: 'Authentication Flows',
    file: 'authenticationFlows.test.ts',
    description: 'Authentication and authorization workflow tests',
    timeout: 45000,
    critical: true
  },
  {
    name: 'Marketplace API Endpoints',
    file: '../marketplace-api-endpoints/marketplaceListingsRoutes.integration.test.ts',
    description: 'Marketplace-specific endpoint tests',
    timeout: 30000,
    critical: false
  },
  {
    name: 'Real Data Operations',
    file: 'realDataOperations.test.ts',
    description: 'Tests with real database operations',
    timeout: 45000,
    critical: false
  },
  {
    name: 'WebSocket Real-time Updates',
    file: 'webSocketRealTimeUpdates.integration.test.ts',
    description: 'Real-time communication tests',
    timeout: 30000,
    critical: false
  }
];

class IntegrationTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private testDir: string;

  constructor() {
    this.testDir = path.join(__dirname);
  }

  async runAllTests(options: {
    verbose?: boolean;
    coverage?: boolean;
    suite?: string;
    parallel?: boolean;
    bail?: boolean;
  } = {}): Promise<TestReport> {
    console.log('🚀 Backend API Integration Test Suite');
    console.log('═'.repeat(60));
    
    this.startTime = Date.now();
    
    // Filter test suites if specific suite requested
    const suitesToRun = options.suite 
      ? testSuites.filter(suite => 
          suite.name.toLowerCase().includes(options.suite!.toLowerCase()) ||
          suite.file.toLowerCase().includes(options.suite!.toLowerCase())
        )
      : testSuites;

    if (suitesToRun.length === 0) {
      throw new Error(`No test suites found matching: ${options.suite}`);
    }

    // Setup test environment
    await this.setupTestEnvironment();

    try {
      if (options.parallel && suitesToRun.length > 1) {
        await this.runTestsInParallel(suitesToRun, options);
      } else {
        await this.runTestsSequentially(suitesToRun, options);
      }
    } finally {
      // Cleanup test environment
      await this.cleanupTestEnvironment();
    }

    return this.generateReport();
  }

  private async runTestsSequentially(
    suites: TestSuite[], 
    options: { verbose?: boolean; coverage?: boolean; bail?: boolean }
  ): Promise<void> {
    for (const suite of suites) {
      console.log(`\n🧪 Running ${suite.name}...`);
      console.log(`📝 ${suite.description}`);
      console.log('─'.repeat(60));

      const result = await this.runSingleTest(suite, options);
      this.results.push(result);

      if (!result.passed) {
        console.error(`❌ ${suite.name} failed`);
        if (options.verbose && result.error) {
          console.error(result.error);
        }
        
        if (options.bail && suite.critical) {
          console.error('💥 Critical test failed, stopping execution');
          break;
        }
      } else {
        console.log(`✅ ${suite.name} passed (${result.duration}ms)`);
      }
    }
  }

  private async runTestsInParallel(
    suites: TestSuite[], 
    options: { verbose?: boolean; coverage?: boolean }
  ): Promise<void> {
    console.log(`\n🔄 Running ${suites.length} test suites in parallel...`);
    
    const promises = suites.map(suite => this.runSingleTest(suite, options));
    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.results.push(result.value);
      } else {
        this.results.push({
          suite: suites[index].name,
          passed: false,
          duration: 0,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
  }

  private async runSingleTest(
    suite: TestSuite, 
    options: { verbose?: boolean; coverage?: boolean }
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const testFile = path.join(this.testDir, suite.file);
      
      if (!fs.existsSync(testFile)) {
        throw new Error(`Test file not found: ${testFile}`);
      }

      const jestCommand = this.buildJestCommand(testFile, suite, options);
      
      execSync(jestCommand, { 
        stdio: options.verbose ? 'inherit' : 'pipe',
        cwd: path.join(__dirname, '../../../..'), // Go to backend root
        timeout: suite.timeout || 30000
      });

      const duration = Date.now() - startTime;
      
      return {
        suite: suite.name,
        passed: true,
        duration,
        coverage: options.coverage ? await this.getCoverageForSuite(suite) : undefined
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return {
        suite: suite.name,
        passed: false,
        duration,
        error: error.message || 'Unknown error'
      };
    }
  }

  private buildJestCommand(testFile: string, suite: TestSuite, options: any): string {
    const commands = [
      'npx jest',
      `"${testFile}"`,
      '--verbose',
      '--detectOpenHandles',
      '--forceExit',
      '--maxWorkers=1' // Prevent conflicts between tests
    ];

    if (options.coverage) {
      commands.push('--coverage');
      commands.push('--coverageReporters=json-summary');
    }

    if (!options.verbose) {
      commands.push('--silent');
    }

    if (suite.timeout) {
      commands.push(`--testTimeout=${suite.timeout}`);
    }

    return commands.join(' ');
  }

  private async getCoverageForSuite(suite: TestSuite): Promise<number> {
    try {
      const coveragePath = path.join(__dirname, '../../../coverage/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        return coverage.total?.statements?.pct || 0;
      }
    } catch (error) {
      console.warn('Could not read coverage data:', error);
    }
    return 0;
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    try {
      // Set test environment variables
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'test-secret-key';
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'sqlite::memory:';
      
      // Create test database if needed
      if (process.env.DATABASE_URL?.includes('sqlite')) {
        // SQLite in-memory database doesn't need setup
      } else {
        // Setup for other databases would go here
        execSync('npm run db:test:setup', { stdio: 'pipe' });
      }
      
      console.log('✅ Test environment ready');
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  private async cleanupTestEnvironment(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      // Cleanup test database
      if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes(':memory:')) {
        execSync('npm run db:test:cleanup', { stdio: 'pipe' });
      }
      
      // Clear test cache
      const cacheDir = path.join(__dirname, '../../../.test-cache');
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
      }
      
      console.log('✅ Test environment cleaned up');
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error);
    }
  }

  private generateReport(): TestReport {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    const passedSuites = this.results.filter(r => r.passed).length;
    const failedSuites = this.results.length - passedSuites;
    
    const overallCoverage = this.results
      .filter(r => r.coverage !== undefined)
      .reduce((sum, r) => sum + (r.coverage || 0), 0) / 
      this.results.filter(r => r.coverage !== undefined).length || 0;

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      totalSuites: this.results.length,
      passedSuites,
      failedSuites,
      totalDuration,
      overallCoverage,
      results: this.results
    };

    this.printReport(report);
    this.saveReport(report);

    return report;
  }

  private printReport(report: TestReport): void {
    console.log('\n' + '═'.repeat(60));
    console.log('📊 Integration Test Results Summary');
    console.log('─'.repeat(60));
    console.log(`✅ Passed: ${report.passedSuites}/${report.totalSuites} test suites`);
    console.log(`❌ Failed: ${report.failedSuites}/${report.totalSuites} test suites`);
    console.log(`⏱️  Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    
    if (report.overallCoverage > 0) {
      console.log(`📈 Overall Coverage: ${report.overallCoverage.toFixed(1)}%`);
    }

    if (report.failedSuites > 0) {
      console.log('\n❌ Failed Test Suites:');
      report.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`  • ${result.suite}: ${result.error}`);
        });
    }

    console.log('\n📋 Detailed Results:');
    report.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      const coverage = result.coverage ? ` (${result.coverage.toFixed(1)}% coverage)` : '';
      console.log(`  ${status} ${result.suite} - ${duration}${coverage}`);
    });

    if (report.passedSuites === report.totalSuites) {
      console.log('\n🎉 All integration tests passed!');
    } else {
      console.log('\n💥 Some integration tests failed!');
    }
  }

  private saveReport(report: TestReport): void {
    try {
      const reportsDir = path.join(__dirname, '../../../test-reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const reportFile = path.join(reportsDir, `integration-test-report-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      console.log(`\n📄 Test report saved: ${reportFile}`);
    } catch (error) {
      console.warn('⚠️  Could not save test report:', error);
    }
  }
}

// CLI interface
function parseArgs(): {
  verbose: boolean;
  coverage: boolean;
  suite?: string;
  parallel: boolean;
  bail: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  
  return {
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverage: args.includes('--coverage') || args.includes('-c'),
    parallel: args.includes('--parallel') || args.includes('-p'),
    bail: args.includes('--bail') || args.includes('-b'),
    help: args.includes('--help') || args.includes('-h'),
    suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1] ||
           args[args.indexOf('--suite') + 1]
  };
}

function showHelp(): void {
  console.log(`
🧪 Backend API Integration Test Runner

Usage:
  npm run test:integration                    # Run all integration tests
  npm run test:integration -- --verbose      # Run with verbose output
  npm run test:integration -- --coverage     # Run with coverage reporting
  npm run test:integration -- --parallel     # Run tests in parallel
  npm run test:integration -- --bail         # Stop on first critical failure
  npm run test:integration -- --suite=auth   # Run specific test suite
  npm run test:integration -- --help         # Show this help

Available Test Suites:
${testSuites.map(suite => `  • ${suite.name}: ${suite.description}`).join('\n')}

Options:
  -v, --verbose     Show detailed test output
  -c, --coverage    Generate coverage reports
  -p, --parallel    Run tests in parallel (faster but less isolated)
  -b, --bail        Stop execution on first critical test failure
  --suite=<name>    Run only tests matching the suite name
  -h, --help        Show this help message

Examples:
  npm run test:integration -- --verbose --coverage
  npm run test:integration -- --suite=auth --verbose
  npm run test:integration -- --parallel --bail
`);
}

// Main execution
async function main(): Promise<void> {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const runner = new IntegrationTestRunner();
  
  try {
    const report = await runner.runAllTests(options);
    
    // Exit with appropriate code
    process.exit(report.failedSuites > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { IntegrationTestRunner, TestSuite, TestResult, TestReport };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}