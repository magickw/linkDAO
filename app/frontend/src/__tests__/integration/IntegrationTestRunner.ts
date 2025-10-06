import { execSync } from 'child_process';
import path from 'path';

/**
 * Integration Test Runner for Cross-Feature Workflows
 * 
 * This runner executes all integration tests for the interconnected social platform
 * and generates comprehensive reports on cross-feature functionality.
 */

interface TestSuite {
  name: string;
  file: string;
  description: string;
  requirements: string[];
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage: number;
}

interface IntegrationTestReport {
  timestamp: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage: {
    overall: number;
    byFeature: Record<string, number>;
  };
  suites: TestResult[];
  requirements: {
    covered: string[];
    missing: string[];
  };
}

export class IntegrationTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Cross-Feature Workflows',
      file: 'CrossFeatureWorkflows.integration.test.tsx',
      description: 'Tests integration between feed, communities, and messaging features',
      requirements: ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7']
    },
    {
      name: 'Notification Delivery',
      file: 'NotificationDelivery.integration.test.tsx',
      description: 'Tests real-time notification delivery and handling across features',
      requirements: ['6.1', '6.2', '6.3', '6.4', '6.5', '6.6']
    },
    {
      name: 'Real-Time Updates',
      file: 'RealTimeUpdates.integration.test.tsx',
      description: 'Tests live updates and WebSocket functionality',
      requirements: ['6.1', '6.2', '6.3', '6.6']
    },
    {
      name: 'Search Functionality',
      file: 'SearchFunctionality.integration.test.tsx',
      description: 'Tests global search and result accuracy across all content types',
      requirements: ['4.1', '4.4', '5.1']
    }
  ];

  private projectRoot: string;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../..');
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<IntegrationTestReport> {
    console.log('🚀 Starting Integration Test Suite for Interconnected Social Platform');
    console.log('=' .repeat(80));

    const startTime = Date.now();
    const results: TestResult[] = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    for (const suite of this.testSuites) {
      console.log(`\n📋 Running ${suite.name}...`);
      console.log(`   Description: ${suite.description}`);
      console.log(`   Requirements: ${suite.requirements.join(', ')}`);

      try {
        const result = await this.runTestSuite(suite);
        results.push(result);
        totalPassed += result.passed;
        totalFailed += result.failed;
        totalTests += result.passed + result.failed + result.skipped;

        console.log(`   ✅ Passed: ${result.passed}`);
        console.log(`   ❌ Failed: ${result.failed}`);
        console.log(`   ⏭️  Skipped: ${result.skipped}`);
        console.log(`   ⏱️  Duration: ${result.duration}ms`);
        console.log(`   📊 Coverage: ${result.coverage}%`);
      } catch (error) {
        console.error(`   💥 Suite failed to run: ${error}`);
        results.push({
          suite: suite.name,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 0,
          coverage: 0
        });
        totalFailed += 1;
        totalTests += 1;
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Generate coverage report
    const coverage = await this.generateCoverageReport();

    // Analyze requirement coverage
    const requirementCoverage = this.analyzeRequirementCoverage(results);

    const report: IntegrationTestReport = {
      timestamp: new Date(),
      totalTests,
      passedTests: totalPassed,
      failedTests: totalFailed,
      coverage,
      suites: results,
      requirements: requirementCoverage
    };

    this.printSummary(report, totalDuration);
    await this.saveReport(report);

    return report;
  }

  /**
   * Run a specific test suite
   */
  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const testFile = path.join(__dirname, suite.file);
    const startTime = Date.now();

    try {
      // Run Jest for specific test file
      const command = `npx jest ${testFile} --json --coverage --testTimeout=30000`;
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const jestResult = JSON.parse(output);
      const endTime = Date.now();

      // Extract test results
      const testResults = jestResult.testResults[0];
      const passed = testResults.numPassingTests || 0;
      const failed = testResults.numFailingTests || 0;
      const skipped = testResults.numPendingTests || 0;

      // Extract coverage information
      const coverage = this.extractCoverage(jestResult.coverageMap);

      return {
        suite: suite.name,
        passed,
        failed,
        skipped,
        duration: endTime - startTime,
        coverage
      };
    } catch (error) {
      const endTime = Date.now();
      
      // Try to parse error output for test results
      try {
        const errorOutput = error.stdout || error.message;
        const jestResult = JSON.parse(errorOutput);
        
        if (jestResult.testResults && jestResult.testResults[0]) {
          const testResults = jestResult.testResults[0];
          return {
            suite: suite.name,
            passed: testResults.numPassingTests || 0,
            failed: testResults.numFailingTests || 0,
            skipped: testResults.numPendingTests || 0,
            duration: endTime - startTime,
            coverage: 0
          };
        }
      } catch (parseError) {
        // Ignore parse errors
      }

      throw error;
    }
  }

  /**
   * Extract coverage percentage from Jest coverage map
   */
  private extractCoverage(coverageMap: any): number {
    if (!coverageMap) return 0;

    let totalStatements = 0;
    let coveredStatements = 0;

    Object.values(coverageMap).forEach((fileCoverage: any) => {
      if (fileCoverage.s) {
        Object.values(fileCoverage.s).forEach((count: any) => {
          totalStatements++;
          if (count > 0) coveredStatements++;
        });
      }
    });

    return totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0;
  }

  /**
   * Generate comprehensive coverage report
   */
  private async generateCoverageReport(): Promise<{ overall: number; byFeature: Record<string, number> }> {
    try {
      // Run coverage for all integration tests
      const command = 'npx jest src/__tests__/integration --coverage --json';
      const output = execSync(command, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const jestResult = JSON.parse(output);
      const overall = this.extractCoverage(jestResult.coverageMap);

      // Calculate coverage by feature
      const byFeature: Record<string, number> = {
        'Feed System': 0,
        'Community System': 0,
        'Messaging System': 0,
        'Notification System': 0,
        'Search System': 0,
        'Cross-Feature Integration': 0
      };

      // Analyze coverage by feature based on file paths
      if (jestResult.coverageMap) {
        Object.entries(jestResult.coverageMap).forEach(([filePath, coverage]: [string, any]) => {
          if (filePath.includes('/Feed/')) {
            byFeature['Feed System'] += this.extractFileCoverage(coverage);
          } else if (filePath.includes('/Community/')) {
            byFeature['Community System'] += this.extractFileCoverage(coverage);
          } else if (filePath.includes('/Messaging/')) {
            byFeature['Messaging System'] += this.extractFileCoverage(coverage);
          } else if (filePath.includes('/Notification')) {
            byFeature['Notification System'] += this.extractFileCoverage(coverage);
          } else if (filePath.includes('/Search/')) {
            byFeature['Search System'] += this.extractFileCoverage(coverage);
          } else if (filePath.includes('/services/')) {
            byFeature['Cross-Feature Integration'] += this.extractFileCoverage(coverage);
          }
        });
      }

      return { overall, byFeature };
    } catch (error) {
      console.warn('Could not generate coverage report:', error.message);
      return {
        overall: 0,
        byFeature: {
          'Feed System': 0,
          'Community System': 0,
          'Messaging System': 0,
          'Notification System': 0,
          'Search System': 0,
          'Cross-Feature Integration': 0
        }
      };
    }
  }

  /**
   * Extract coverage percentage for a single file
   */
  private extractFileCoverage(fileCoverage: any): number {
    if (!fileCoverage.s) return 0;

    let totalStatements = 0;
    let coveredStatements = 0;

    Object.values(fileCoverage.s).forEach((count: any) => {
      totalStatements++;
      if (count > 0) coveredStatements++;
    });

    return totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
  }

  /**
   * Analyze which requirements are covered by tests
   */
  private analyzeRequirementCoverage(results: TestResult[]): { covered: string[]; missing: string[] } {
    const allRequirements = [
      '4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', // Cross-feature integration
      '5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7', // Performance and caching
      '6.1', '6.2', '6.3', '6.4', '6.5', '6.6'         // Real-time updates
    ];

    const coveredRequirements = new Set<string>();

    this.testSuites.forEach(suite => {
      const suiteResult = results.find(r => r.suite === suite.name);
      if (suiteResult && suiteResult.passed > 0) {
        suite.requirements.forEach(req => coveredRequirements.add(req));
      }
    });

    const covered = Array.from(coveredRequirements).sort();
    const missing = allRequirements.filter(req => !coveredRequirements.has(req)).sort();

    return { covered, missing };
  }

  /**
   * Print test summary
   */
  private printSummary(report: IntegrationTestReport, duration: number): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`⏱️  Total Duration: ${duration}ms`);
    console.log(`📋 Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.passedTests}`);
    console.log(`❌ Failed: ${report.failedTests}`);
    console.log(`📊 Overall Coverage: ${report.coverage.overall}%`);
    
    console.log('\n📈 Coverage by Feature:');
    Object.entries(report.coverage.byFeature).forEach(([feature, coverage]) => {
      console.log(`   ${feature}: ${coverage.toFixed(1)}%`);
    });
    
    console.log('\n✅ Requirements Covered:');
    report.requirements.covered.forEach(req => {
      console.log(`   ✓ Requirement ${req}`);
    });
    
    if (report.requirements.missing.length > 0) {
      console.log('\n❌ Requirements Missing Coverage:');
      report.requirements.missing.forEach(req => {
        console.log(`   ✗ Requirement ${req}`);
      });
    }
    
    const successRate = (report.passedTests / report.totalTests) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Excellent! Integration tests are passing with high success rate.');
    } else if (successRate >= 75) {
      console.log('👍 Good! Most integration tests are passing.');
    } else {
      console.log('⚠️  Warning! Integration test success rate is below 75%.');
    }
    
    console.log('='.repeat(80));
  }

  /**
   * Save test report to file
   */
  private async saveReport(report: IntegrationTestReport): Promise<void> {
    const reportPath = path.join(this.projectRoot, 'integration-test-report.json');
    const fs = await import('fs/promises');
    
    try {
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Test report saved to: ${reportPath}`);
    } catch (error) {
      console.warn('Could not save test report:', error.message);
    }
  }

  /**
   * Run specific test suite by name
   */
  async runSpecificSuite(suiteName: string): Promise<TestResult | null> {
    const suite = this.testSuites.find(s => s.name === suiteName);
    if (!suite) {
      console.error(`Test suite "${suiteName}" not found`);
      return null;
    }

    console.log(`🚀 Running ${suite.name}...`);
    try {
      const result = await this.runTestSuite(suite);
      console.log(`✅ Suite completed: ${result.passed} passed, ${result.failed} failed`);
      return result;
    } catch (error) {
      console.error(`❌ Suite failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get list of available test suites
   */
  getAvailableSuites(): TestSuite[] {
    return this.testSuites;
  }
}

// CLI interface
if (require.main === module) {
  const runner = new IntegrationTestRunner();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run all tests
    runner.runAllTests().then(report => {
      process.exit(report.failedTests > 0 ? 1 : 0);
    }).catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
  } else if (args[0] === '--list') {
    // List available suites
    console.log('Available test suites:');
    runner.getAvailableSuites().forEach(suite => {
      console.log(`  ${suite.name}: ${suite.description}`);
    });
  } else {
    // Run specific suite
    const suiteName = args[0];
    runner.runSpecificSuite(suiteName).then(result => {
      process.exit(result && result.failed === 0 ? 0 : 1);
    }).catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
  }
}

export default IntegrationTestRunner;