import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

interface TestResult {
  testSuite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  errors?: string[];
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  overallCoverage: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
  testResults: TestResult[];
  performanceMetrics: {
    averageTestDuration: number;
    slowestTest: string;
    fastestTest: string;
    memoryUsage: number;
  };
  requirements: {
    [key: string]: {
      covered: boolean;
      testCount: number;
      requirements: string[];
    };
  };
}

class SellerIntegrationTestRunner {
  private testSuites = [
    {
      name: 'API Endpoint Consistency',
      file: 'SellerIntegrationTestSuite.test.tsx',
      requirements: ['10.1', '10.2'],
      timeout: 30000,
    },
    {
      name: 'Data Synchronization',
      file: 'SellerIntegrationTestSuite.test.tsx',
      requirements: ['10.1', '10.3'],
      timeout: 45000,
    },
    {
      name: 'Cache Invalidation',
      file: 'SellerCacheInvalidationTests.test.tsx',
      requirements: ['10.3', '10.4'],
      timeout: 60000,
    },
    {
      name: 'Error Handling Consistency',
      file: 'SellerIntegrationTestSuite.test.tsx',
      requirements: ['10.4', '10.5'],
      timeout: 30000,
    },
    {
      name: 'Mobile Optimization',
      file: 'SellerMobileOptimizationTests.test.tsx',
      requirements: ['10.5', '10.6'],
      timeout: 45000,
    },
    {
      name: 'Performance Benchmarking',
      file: 'SellerIntegrationTestSuite.test.tsx',
      requirements: ['10.6'],
      timeout: 120000,
    },
  ];

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Seller Integration Test Suite...\n');
    
    const startTime = performance.now();
    const testResults: TestResult[] = [];
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Run each test suite
    for (const suite of this.testSuites) {
      console.log(`📋 Running ${suite.name} tests...`);
      
      try {
        const result = await this.runTestSuite(suite);
        testResults.push(result);
        
        totalTests += result.passed + result.failed + result.skipped;
        totalPassed += result.passed;
        totalFailed += result.failed;
        totalSkipped += result.skipped;
        
        this.logTestResult(result);
      } catch (error) {
        console.error(`❌ Failed to run ${suite.name}:`, error);
        testResults.push({
          testSuite: suite.name,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 0,
          errors: [error instanceof Error ? error.message : String(error)],
        });
        totalFailed += 1;
      }
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Generate coverage report
    const overallCoverage = await this.generateCoverageReport();

    // Calculate performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics(testResults);

    // Map requirements coverage
    const requirements = this.mapRequirementsCoverage(testResults);

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      overallCoverage,
      testResults,
      performanceMetrics,
      requirements,
    };

    this.generateReport(report);
    this.logSummary(report);

    return report;
  }

  private async runTestSuite(suite: { name: string; file: string; timeout: number }): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      // Run Jest with specific test file
      const command = `npx jest src/__tests__/integration/seller/${suite.file} --json --coverage --testTimeout=${suite.timeout}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      const result = JSON.parse(output);
      const endTime = performance.now();

      return {
        testSuite: suite.name,
        passed: result.numPassedTests || 0,
        failed: result.numFailedTests || 0,
        skipped: result.numPendingTests || 0,
        duration: endTime - startTime,
        coverage: result.coverageMap ? this.extractCoverage(result.coverageMap) : undefined,
      };
    } catch (error) {
      const endTime = performance.now();
      
      // Try to parse Jest output even on failure
      try {
        const errorOutput = error instanceof Error && 'stdout' in error ? 
          (error as any).stdout : String(error);
        const result = JSON.parse(errorOutput);
        
        return {
          testSuite: suite.name,
          passed: result.numPassedTests || 0,
          failed: result.numFailedTests || 0,
          skipped: result.numPendingTests || 0,
          duration: endTime - startTime,
          errors: result.testResults?.map((tr: any) => 
            tr.message || tr.failureMessage
          ).filter(Boolean) || [String(error)],
        };
      } catch {
        return {
          testSuite: suite.name,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: endTime - startTime,
          errors: [error instanceof Error ? error.message : String(error)],
        };
      }
    }
  }

  private extractCoverage(coverageMap: any): TestResult['coverage'] {
    const summary = coverageMap.getCoverageSummary?.() || coverageMap;
    
    return {
      lines: summary.lines?.pct || 0,
      functions: summary.functions?.pct || 0,
      branches: summary.branches?.pct || 0,
      statements: summary.statements?.pct || 0,
    };
  }

  private async generateCoverageReport(): Promise<TestReport['overallCoverage']> {
    try {
      // Run coverage report generation
      const command = 'npx jest src/__tests__/integration/seller/ --coverage --coverageReporters=json-summary';
      const output = execSync(command, { encoding: 'utf8' });
      
      // Parse coverage summary
      const coveragePath = './coverage/coverage-summary.json';
      const fs = await import('fs');
      
      if (fs.existsSync(coveragePath)) {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const total = coverageData.total;
        
        return {
          lines: total.lines.pct,
          functions: total.functions.pct,
          branches: total.branches.pct,
          statements: total.statements.pct,
        };
      }
    } catch (error) {
      console.warn('Could not generate coverage report:', error);
    }

    return { lines: 0, functions: 0, branches: 0, statements: 0 };
  }

  private calculatePerformanceMetrics(testResults: TestResult[]): TestReport['performanceMetrics'] {
    const durations = testResults.map(r => r.duration);
    const averageTestDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    const slowestIndex = durations.indexOf(Math.max(...durations));
    const fastestIndex = durations.indexOf(Math.min(...durations));
    
    return {
      averageTestDuration,
      slowestTest: testResults[slowestIndex]?.testSuite || 'Unknown',
      fastestTest: testResults[fastestIndex]?.testSuite || 'Unknown',
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
    };
  }

  private mapRequirementsCoverage(testResults: TestResult[]): TestReport['requirements'] {
    const requirements: TestReport['requirements'] = {};

    this.testSuites.forEach(suite => {
      const result = testResults.find(r => r.testSuite === suite.name);
      const covered = result ? result.failed === 0 : false;
      const testCount = result ? result.passed + result.failed : 0;

      suite.requirements.forEach(req => {
        if (!requirements[req]) {
          requirements[req] = {
            covered: false,
            testCount: 0,
            requirements: [],
          };
        }

        requirements[req].covered = requirements[req].covered || covered;
        requirements[req].testCount += testCount;
        requirements[req].requirements.push(suite.name);
      });
    });

    return requirements;
  }

  private logTestResult(result: TestResult): void {
    const status = result.failed === 0 ? '✅' : '❌';
    const duration = (result.duration / 1000).toFixed(2);
    
    console.log(`${status} ${result.testSuite}`);
    console.log(`   Passed: ${result.passed}, Failed: ${result.failed}, Skipped: ${result.skipped}`);
    console.log(`   Duration: ${duration}s`);
    
    if (result.coverage) {
      console.log(`   Coverage: ${result.coverage.lines}% lines, ${result.coverage.functions}% functions`);
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log(`   Errors:`);
      result.errors.forEach(error => {
        console.log(`     - ${error}`);
      });
    }
    
    console.log('');
  }

  private logSummary(report: TestReport): void {
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.totalPassed} ✅`);
    console.log(`Failed: ${report.totalFailed} ❌`);
    console.log(`Skipped: ${report.totalSkipped} ⏭️`);
    console.log(`Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    console.log(`Success Rate: ${((report.totalPassed / report.totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📈 Coverage Summary');
    console.log('==================');
    console.log(`Lines: ${report.overallCoverage.lines.toFixed(1)}%`);
    console.log(`Functions: ${report.overallCoverage.functions.toFixed(1)}%`);
    console.log(`Branches: ${report.overallCoverage.branches.toFixed(1)}%`);
    console.log(`Statements: ${report.overallCoverage.statements.toFixed(1)}%`);
    
    console.log('\n⚡ Performance Metrics');
    console.log('=====================');
    console.log(`Average Test Duration: ${(report.performanceMetrics.averageTestDuration / 1000).toFixed(2)}s`);
    console.log(`Slowest Test: ${report.performanceMetrics.slowestTest}`);
    console.log(`Fastest Test: ${report.performanceMetrics.fastestTest}`);
    console.log(`Memory Usage: ${report.performanceMetrics.memoryUsage.toFixed(1)}MB`);
    
    console.log('\n📋 Requirements Coverage');
    console.log('========================');
    Object.entries(report.requirements).forEach(([req, data]) => {
      const status = data.covered ? '✅' : '❌';
      console.log(`${status} Requirement ${req}: ${data.testCount} tests`);
      console.log(`   Covered by: ${data.requirements.join(', ')}`);
    });

    // Overall result
    const overallSuccess = report.totalFailed === 0;
    console.log(`\n${overallSuccess ? '🎉' : '💥'} Overall Result: ${overallSuccess ? 'PASSED' : 'FAILED'}`);
    
    if (!overallSuccess) {
      console.log('\n🔧 Failed Test Suites:');
      report.testResults
        .filter(r => r.failed > 0)
        .forEach(r => {
          console.log(`   - ${r.testSuite}: ${r.failed} failed tests`);
        });
    }
  }

  private generateReport(report: TestReport): void {
    const fs = require('fs');
    const path = require('path');
    
    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Generate JSON report
    const jsonReportPath = path.join(reportsDir, 'seller-integration-test-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join(reportsDir, 'seller-integration-test-report.html');
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log(`\n📄 Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  private generateHTMLReport(report: TestReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seller Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; color: #007acc; }
        .test-results { margin-bottom: 30px; }
        .test-suite { background: white; margin-bottom: 15px; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-suite.passed { border-left: 4px solid #28a745; }
        .test-suite.failed { border-left: 4px solid #dc3545; }
        .requirements { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .requirement { margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .requirement.covered { border-left: 4px solid #28a745; }
        .requirement.not-covered { border-left: 4px solid #dc3545; }
        .coverage-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%); }
    </style>
</head>
<body>
    <div class="header">
        <h1>Seller Integration Test Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        <p>Total Duration: ${(report.totalDuration / 1000).toFixed(2)} seconds</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${report.totalTests}</div>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <div class="value" style="color: #28a745;">${report.totalPassed}</div>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <div class="value" style="color: #dc3545;">${report.totalFailed}</div>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <div class="value">${((report.totalPassed / report.totalTests) * 100).toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Line Coverage</h3>
            <div class="value">${report.overallCoverage.lines.toFixed(1)}%</div>
            <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${report.overallCoverage.lines}%"></div>
            </div>
        </div>
    </div>

    <div class="test-results">
        <h2>Test Results</h2>
        ${report.testResults.map(result => `
            <div class="test-suite ${result.failed === 0 ? 'passed' : 'failed'}">
                <h3>${result.testSuite}</h3>
                <p>Passed: ${result.passed} | Failed: ${result.failed} | Skipped: ${result.skipped}</p>
                <p>Duration: ${(result.duration / 1000).toFixed(2)}s</p>
                ${result.coverage ? `
                    <p>Coverage: Lines ${result.coverage.lines}% | Functions ${result.coverage.functions}% | Branches ${result.coverage.branches}%</p>
                ` : ''}
                ${result.errors && result.errors.length > 0 ? `
                    <div style="background: #f8d7da; padding: 10px; border-radius: 4px; margin-top: 10px;">
                        <strong>Errors:</strong>
                        <ul>
                            ${result.errors.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>

    <div class="requirements">
        <h2>Requirements Coverage</h2>
        ${Object.entries(report.requirements).map(([req, data]) => `
            <div class="requirement ${data.covered ? 'covered' : 'not-covered'}">
                <strong>Requirement ${req}</strong> - ${data.testCount} tests
                <br>
                <small>Covered by: ${data.requirements.join(', ')}</small>
            </div>
        `).join('')}
    </div>
</body>
</html>
    `;
  }

  async runSpecificTest(testName: string): Promise<TestResult | null> {
    const suite = this.testSuites.find(s => s.name.toLowerCase().includes(testName.toLowerCase()));
    
    if (!suite) {
      console.error(`Test suite "${testName}" not found`);
      return null;
    }

    console.log(`🎯 Running specific test: ${suite.name}`);
    const result = await this.runTestSuite(suite);
    this.logTestResult(result);
    
    return result;
  }

  listAvailableTests(): void {
    console.log('📋 Available Test Suites:');
    console.log('=========================');
    
    this.testSuites.forEach((suite, index) => {
      console.log(`${index + 1}. ${suite.name}`);
      console.log(`   File: ${suite.file}`);
      console.log(`   Requirements: ${suite.requirements.join(', ')}`);
      console.log(`   Timeout: ${suite.timeout / 1000}s`);
      console.log('');
    });
  }
}

// CLI interface
if (require.main === module) {
  const runner = new SellerIntegrationTestRunner();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    runner.runAllTests().catch(console.error);
  } else if (args[0] === 'list') {
    runner.listAvailableTests();
  } else if (args[0] === 'run' && args[1]) {
    runner.runSpecificTest(args[1]).catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  npm run test:seller-integration           # Run all tests');
    console.log('  npm run test:seller-integration list      # List available tests');
    console.log('  npm run test:seller-integration run <name> # Run specific test');
  }
}

export { SellerIntegrationTestRunner, TestResult, TestReport };