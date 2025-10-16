/**
 * Test Runner for Web3 Native Community Enhancements Integration Tests
 * Orchestrates and manages the execution of all integration and performance tests
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

interface TestSuite {
  name: string;
  path: string;
  timeout: number;
  retries: number;
  parallel: boolean;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  error?: string;
  coverage?: number;
}

interface TestRunnerConfig {
  suites: TestSuite[];
  globalTimeout: number;
  maxParallelSuites: number;
  coverageThreshold: number;
  reportPath: string;
}

class Web3IntegrationTestRunner {
  private config: TestRunnerConfig;
  private results: TestResult[] = [];

  constructor(config: TestRunnerConfig) {
    this.config = config;
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Web3 Native Community Enhancements Integration Tests');
    console.log(`Running ${this.config.suites.length} test suites...`);

    const startTime = performance.now();

    try {
      // Run test suites based on parallel configuration
      const parallelSuites = this.config.suites.filter(suite => suite.parallel);
      const sequentialSuites = this.config.suites.filter(suite => !suite.parallel);

      // Run parallel suites
      if (parallelSuites.length > 0) {
        console.log(`\n📦 Running ${parallelSuites.length} parallel test suites...`);
        await this.runParallelSuites(parallelSuites);
      }

      // Run sequential suites
      if (sequentialSuites.length > 0) {
        console.log(`\n🔄 Running ${sequentialSuites.length} sequential test suites...`);
        await this.runSequentialSuites(sequentialSuites);
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Generate test report
      await this.generateTestReport(totalDuration);

      return this.results;
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      throw error;
    }
  }

  private async runParallelSuites(suites: TestSuite[]): Promise<void> {
    const chunks = this.chunkArray(suites, this.config.maxParallelSuites);

    for (const chunk of chunks) {
      const promises = chunk.map(suite => this.runTestSuite(suite));
      await Promise.all(promises);
    }
  }

  private async runSequentialSuites(suites: TestSuite[]): Promise<void> {
    for (const suite of suites) {
      await this.runTestSuite(suite);
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`\n🧪 Running test suite: ${suite.name}`);
    
    const startTime = performance.now();
    let attempt = 0;
    let lastError: string | undefined;

    while (attempt <= suite.retries) {
      try {
        if (attempt > 0) {
          console.log(`   🔄 Retry attempt ${attempt}/${suite.retries}`);
        }

        const result = await this.executeTestSuite(suite);
        const endTime = performance.now();
        const duration = endTime - startTime;

        const testResult: TestResult = {
          suite: suite.name,
          passed: true,
          duration,
          coverage: result.coverage,
        };

        this.results.push(testResult);
        console.log(`   ✅ ${suite.name} passed in ${duration.toFixed(2)}ms`);
        
        return testResult;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.log(`   ❌ ${suite.name} failed: ${lastError}`);
        attempt++;
      }
    }

    // All retries failed
    const endTime = performance.now();
    const duration = endTime - startTime;

    const testResult: TestResult = {
      suite: suite.name,
      passed: false,
      duration,
      error: lastError,
    };

    this.results.push(testResult);
    return testResult;
  }

  private async executeTestSuite(suite: TestSuite): Promise<{ coverage?: number }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Test suite ${suite.name} timed out after ${suite.timeout}ms`));
      }, suite.timeout);

      try {
        // Execute Jest test suite
        const command = `npx jest ${suite.path} --coverage --coverageReporters=json --silent`;
        const output = execSync(command, { 
          encoding: 'utf8',
          timeout: suite.timeout,
        });

        clearTimeout(timeout);

        // Parse coverage information
        const coverage = this.parseCoverageFromOutput(output);
        
        resolve({ coverage });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private parseCoverageFromOutput(output: string): number | undefined {
    try {
      // Extract coverage percentage from Jest output
      const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
      return coverageMatch ? parseFloat(coverageMatch[1]) : undefined;
    } catch {
      return undefined;
    }
  }

  private async generateTestReport(totalDuration: number): Promise<void> {
    const passedTests = this.results.filter(r => r.passed);
    const failedTests = this.results.filter(r => !r.passed);
    const totalTests = this.results.length;
    const passRate = (passedTests.length / totalTests) * 100;
    const averageCoverage = this.calculateAverageCoverage();

    const report = {
      summary: {
        totalSuites: totalTests,
        passed: passedTests.length,
        failed: failedTests.length,
        passRate: passRate.toFixed(2),
        totalDuration: totalDuration.toFixed(2),
        averageCoverage: averageCoverage?.toFixed(2),
        timestamp: new Date().toISOString(),
      },
      results: this.results,
      failedSuites: failedTests.map(test => ({
        suite: test.suite,
        error: test.error,
        duration: test.duration,
      })),
      performance: {
        fastestSuite: this.getFastestSuite(),
        slowestSuite: this.getSlowestSuite(),
        averageDuration: this.getAverageDuration(),
      },
      coverage: {
        average: averageCoverage,
        threshold: this.config.coverageThreshold,
        meetsThreshold: averageCoverage ? averageCoverage >= this.config.coverageThreshold : false,
      },
    };

    // Write report to file
    const fs = await import('fs/promises');
    await fs.writeFile(this.config.reportPath, JSON.stringify(report, null, 2));

    // Print summary to console
    this.printTestSummary(report);
  }

  private calculateAverageCoverage(): number | undefined {
    const coverageResults = this.results
      .map(r => r.coverage)
      .filter((c): c is number => c !== undefined);

    if (coverageResults.length === 0) return undefined;

    return coverageResults.reduce((sum, coverage) => sum + coverage, 0) / coverageResults.length;
  }

  private getFastestSuite(): { name: string; duration: number } | undefined {
    if (this.results.length === 0) return undefined;
    
    const fastest = this.results.reduce((min, current) => 
      current.duration < min.duration ? current : min
    );
    
    return { name: fastest.suite, duration: fastest.duration };
  }

  private getSlowestSuite(): { name: string; duration: number } | undefined {
    if (this.results.length === 0) return undefined;
    
    const slowest = this.results.reduce((max, current) => 
      current.duration > max.duration ? current : max
    );
    
    return { name: slowest.suite, duration: slowest.duration };
  }

  private getAverageDuration(): number {
    if (this.results.length === 0) return 0;
    
    const totalDuration = this.results.reduce((sum, result) => sum + result.duration, 0);
    return totalDuration / this.results.length;
  }

  private printTestSummary(report: any): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 WEB3 NATIVE COMMUNITY ENHANCEMENTS TEST REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📈 SUMMARY:`);
    console.log(`   Total Suites: ${report.summary.totalSuites}`);
    console.log(`   Passed: ${report.summary.passed} ✅`);
    console.log(`   Failed: ${report.summary.failed} ${report.summary.failed > 0 ? '❌' : '✅'}`);
    console.log(`   Pass Rate: ${report.summary.passRate}%`);
    console.log(`   Total Duration: ${report.summary.totalDuration}ms`);
    
    if (report.summary.averageCoverage) {
      console.log(`   Average Coverage: ${report.summary.averageCoverage}%`);
    }

    console.log(`\n⚡ PERFORMANCE:`);
    if (report.performance.fastestSuite) {
      console.log(`   Fastest Suite: ${report.performance.fastestSuite.name} (${report.performance.fastestSuite.duration.toFixed(2)}ms)`);
    }
    if (report.performance.slowestSuite) {
      console.log(`   Slowest Suite: ${report.performance.slowestSuite.name} (${report.performance.slowestSuite.duration.toFixed(2)}ms)`);
    }
    console.log(`   Average Duration: ${report.performance.averageDuration.toFixed(2)}ms`);

    if (report.coverage.average) {
      console.log(`\n📋 COVERAGE:`);
      console.log(`   Average Coverage: ${report.coverage.average.toFixed(2)}%`);
      console.log(`   Threshold: ${report.coverage.threshold}%`);
      console.log(`   Meets Threshold: ${report.coverage.meetsThreshold ? '✅' : '❌'}`);
    }

    if (report.failedSuites.length > 0) {
      console.log(`\n❌ FAILED SUITES:`);
      report.failedSuites.forEach((failed: any) => {
        console.log(`   ${failed.suite}: ${failed.error}`);
      });
    }

    console.log(`\n📄 Full report saved to: ${this.config.reportPath}`);
    console.log('='.repeat(80));
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Default test configuration
const defaultConfig: TestRunnerConfig = {
  suites: [
    {
      name: 'Web3 Workflow E2E Tests',
      path: 'src/__tests__/web3-integration/Web3WorkflowTests.e2e.test.tsx',
      timeout: 60000, // 1 minute
      retries: 2,
      parallel: true,
    },
    {
      name: 'Blockchain Integration Tests',
      path: 'src/__tests__/web3-integration/BlockchainIntegrationTests.test.tsx',
      timeout: 120000, // 2 minutes
      retries: 3,
      parallel: false, // Sequential due to blockchain state
    },
    {
      name: 'Performance Tests',
      path: 'src/__tests__/web3-integration/PerformanceTests.test.tsx',
      timeout: 180000, // 3 minutes
      retries: 1,
      parallel: true,
    },
    {
      name: 'Web3 Component Integration',
      path: 'src/__tests__/integration/Web3ComponentsIntegration.test.tsx',
      timeout: 90000, // 1.5 minutes
      retries: 2,
      parallel: true,
    },
    {
      name: 'Web3 Accessibility Tests',
      path: 'src/__tests__/accessibility/Web3AccessibilityTests.test.tsx',
      timeout: 60000, // 1 minute
      retries: 1,
      parallel: true,
    },
    {
      name: 'Web3 Performance Tests',
      path: 'src/__tests__/performance/Web3PerformanceTests.test.tsx',
      timeout: 120000, // 2 minutes
      retries: 1,
      parallel: true,
    },
  ],
  globalTimeout: 600000, // 10 minutes total
  maxParallelSuites: 3,
  coverageThreshold: 80,
  reportPath: 'test-reports/web3-integration-report.json',
};

// Export for use in scripts
export { Web3IntegrationTestRunner, defaultConfig };

// Simple test to make Jest happy
describe('Web3 Integration Test Runner', () => {
  test('should be properly configured', () => {
    expect(defaultConfig).toBeDefined();
    expect(defaultConfig.suites).toHaveLength(6);
    expect(Web3IntegrationTestRunner).toBeDefined();
  });
});

// CLI execution
if (require.main === module) {
  const runner = new Web3IntegrationTestRunner(defaultConfig);
  
  runner.runAllTests()
    .then((results) => {
      const failedTests = results.filter(r => !r.passed);
      
      if (failedTests.length > 0) {
        console.error(`\n❌ ${failedTests.length} test suite(s) failed`);
        process.exit(1);
      } else {
        console.log('\n✅ All test suites passed!');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('\n💥 Test runner crashed:', error);
      process.exit(1);
    });
}