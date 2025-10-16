/**
 * User Acceptance Test Runner for Web3 Native Community Enhancements
 * Orchestrates and executes comprehensive user acceptance testing
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
  testSuite: string;
  passed: number;
  failed: number;
  duration: number;
  coverage?: number;
  errors: string[];
}

interface TestReport {
  timestamp: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
  overallCoverage: number;
  results: TestResult[];
  summary: {
    web3UserJourneys: TestResult;
    mobileCompatibility: TestResult;
    crossBrowserCompatibility: TestResult;
    performanceOptimization: TestResult;
  };
}

class UserAcceptanceTestRunner {
  private testSuites = [
    {
      name: 'Web3 User Journey Tests',
      command: 'npm run test:user-acceptance:web3',
      file: 'Web3UserJourneyTests.test.tsx',
      description: 'Tests complete Web3 user workflows with real wallets and test tokens'
    },
    {
      name: 'Mobile Compatibility Tests',
      command: 'npm run test:user-acceptance:mobile',
      file: 'MobileCompatibilityTests.test.tsx',
      description: 'Tests mobile device compatibility across different screen sizes'
    },
    {
      name: 'Cross-Browser Compatibility Tests',
      command: 'npm run test:user-acceptance:browser',
      file: 'CrossBrowserCompatibilityTests.test.tsx',
      description: 'Tests compatibility across different browsers and Web3 providers'
    },
    {
      name: 'Performance Optimization Tests',
      command: 'npm run test:user-acceptance:performance',
      file: 'PerformanceOptimizationTests.test.tsx',
      description: 'Tests performance metrics and optimization strategies'
    }
  ];

  private reportPath = path.join(__dirname, '../../../test-reports/user-acceptance');

  constructor() {
    this.ensureReportDirectory();
  }

  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true });
    }
  }

  private async runTestSuite(testSuite: any): Promise<TestResult> {
    console.log(`\n🧪 Running ${testSuite.name}...`);
    console.log(`📝 ${testSuite.description}`);
    
    const startTime = Date.now();
    let result: TestResult = {
      testSuite: testSuite.name,
      passed: 0,
      failed: 0,
      duration: 0,
      errors: []
    };

    try {
      // Run the test suite
      const output = execSync(testSuite.command, {
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 300000, // 5 minutes timeout
      });

      // Parse Jest output
      const lines = output.split('\n');
      const testResults = this.parseJestOutput(lines);
      
      result.passed = testResults.passed;
      result.failed = testResults.failed;
      result.coverage = testResults.coverage;
      
      console.log(`✅ ${testSuite.name} completed: ${result.passed} passed, ${result.failed} failed`);
      
    } catch (error: any) {
      console.log(`❌ ${testSuite.name} failed with error:`);
      console.log(error.message);
      
      result.failed = 1;
      result.errors.push(error.message);
      
      // Try to parse partial results from error output
      if (error.stdout) {
        const partialResults = this.parseJestOutput(error.stdout.split('\n'));
        result.passed = partialResults.passed;
        result.failed = partialResults.failed || 1;
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private parseJestOutput(lines: string[]): { passed: number; failed: number; coverage?: number } {
    let passed = 0;
    let failed = 0;
    let coverage = 0;

    for (const line of lines) {
      // Parse test results
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed/);
        if (match) passed = parseInt(match[1]);
        
        const failMatch = line.match(/(\d+) failed/);
        if (failMatch) failed = parseInt(failMatch[1]);
      }
      
      // Parse coverage
      if (line.includes('All files') && line.includes('%')) {
        const coverageMatch = line.match(/(\d+\.?\d*)%/);
        if (coverageMatch) coverage = parseFloat(coverageMatch[1]);
      }
    }

    return { passed, failed, coverage };
  }

  private generateReport(results: TestResult[]): TestReport {
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const overallCoverage = results.reduce((sum, r) => sum + (r.coverage || 0), 0) / results.length;

    return {
      timestamp: new Date().toISOString(),
      totalTests: totalPassed + totalFailed,
      totalPassed,
      totalFailed,
      totalDuration,
      overallCoverage,
      results,
      summary: {
        web3UserJourneys: results[0],
        mobileCompatibility: results[1],
        crossBrowserCompatibility: results[2],
        performanceOptimization: results[3],
      }
    };
  }

  private saveReport(report: TestReport): void {
    const reportFile = path.join(this.reportPath, `user-acceptance-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Also save as latest report
    const latestReportFile = path.join(this.reportPath, 'latest-user-acceptance-report.json');
    fs.writeFileSync(latestReportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Report saved to: ${reportFile}`);
  }

  private generateHtmlReport(report: TestReport): void {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web3 Community Enhancements - User Acceptance Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .metric { text-align: center; padding: 20px; border-radius: 8px; }
        .metric.success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .metric.warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .metric.error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .metric h3 { margin: 0; font-size: 2em; }
        .metric p { margin: 5px 0 0 0; font-weight: 500; }
        .test-suites { padding: 0 30px 30px 30px; }
        .test-suite { margin-bottom: 30px; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; }
        .test-suite-header { background: #f8f9fa; padding: 20px; border-bottom: 1px solid #e9ecef; }
        .test-suite-header h3 { margin: 0; color: #495057; }
        .test-suite-header p { margin: 5px 0 0 0; color: #6c757d; }
        .test-suite-body { padding: 20px; }
        .test-result { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f3f4; }
        .test-result:last-child { border-bottom: none; }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 500; }
        .status.passed { background: #d4edda; color: #155724; }
        .status.failed { background: #f8d7da; color: #721c24; }
        .progress-bar { width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
        .errors { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 15px; margin-top: 15px; }
        .errors h4 { margin: 0 0 10px 0; color: #721c24; }
        .errors pre { margin: 0; color: #721c24; font-size: 0.9em; white-space: pre-wrap; }
        .timestamp { text-align: center; padding: 20px; color: #6c757d; border-top: 1px solid #e9ecef; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 User Acceptance Test Report</h1>
            <p>Web3 Native Community Enhancements - Comprehensive Testing Results</p>
        </div>
        
        <div class="summary">
            <div class="metric ${report.totalFailed === 0 ? 'success' : 'warning'}">
                <h3>${report.totalTests}</h3>
                <p>Total Tests</p>
            </div>
            <div class="metric success">
                <h3>${report.totalPassed}</h3>
                <p>Tests Passed</p>
            </div>
            <div class="metric ${report.totalFailed === 0 ? 'success' : 'error'}">
                <h3>${report.totalFailed}</h3>
                <p>Tests Failed</p>
            </div>
            <div class="metric ${report.overallCoverage >= 80 ? 'success' : 'warning'}">
                <h3>${report.overallCoverage.toFixed(1)}%</h3>
                <p>Coverage</p>
            </div>
            <div class="metric success">
                <h3>${(report.totalDuration / 1000).toFixed(1)}s</h3>
                <p>Total Duration</p>
            </div>
        </div>
        
        <div class="test-suites">
            ${report.results.map(result => `
                <div class="test-suite">
                    <div class="test-suite-header">
                        <h3>${result.testSuite}</h3>
                        <p>Duration: ${(result.duration / 1000).toFixed(1)}s | Coverage: ${(result.coverage || 0).toFixed(1)}%</p>
                    </div>
                    <div class="test-suite-body">
                        <div class="test-result">
                            <span>Tests Passed</span>
                            <span class="status passed">${result.passed}</span>
                        </div>
                        <div class="test-result">
                            <span>Tests Failed</span>
                            <span class="status ${result.failed === 0 ? 'passed' : 'failed'}">${result.failed}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${result.passed + result.failed > 0 ? (result.passed / (result.passed + result.failed)) * 100 : 0}%"></div>
                        </div>
                        ${result.errors.length > 0 ? `
                            <div class="errors">
                                <h4>Errors:</h4>
                                <pre>${result.errors.join('\n\n')}</pre>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="timestamp">
            Generated on ${new Date(report.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>
    `;

    const htmlReportFile = path.join(this.reportPath, 'user-acceptance-report.html');
    fs.writeFileSync(htmlReportFile, htmlContent);
    
    console.log(`📊 HTML report saved to: ${htmlReportFile}`);
  }

  private printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 USER ACCEPTANCE TEST SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Tests: ${report.totalTests}`);
    console.log(`   ✅ Passed: ${report.totalPassed}`);
    console.log(`   ❌ Failed: ${report.totalFailed}`);
    console.log(`   📈 Coverage: ${report.overallCoverage.toFixed(1)}%`);
    console.log(`   ⏱️  Duration: ${(report.totalDuration / 1000).toFixed(1)}s`);
    
    console.log(`\n📋 Test Suite Breakdown:`);
    report.results.forEach(result => {
      const status = result.failed === 0 ? '✅' : '❌';
      console.log(`   ${status} ${result.testSuite}: ${result.passed}/${result.passed + result.failed} passed`);
    });
    
    if (report.totalFailed === 0) {
      console.log(`\n🎉 All user acceptance tests passed! The Web3 Community Enhancements are ready for production.`);
    } else {
      console.log(`\n⚠️  ${report.totalFailed} test(s) failed. Please review the errors and fix before deployment.`);
    }
    
    console.log('\n' + '='.repeat(80));
  }

  public async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting User Acceptance Testing for Web3 Native Community Enhancements');
    console.log('=' .repeat(80));
    
    const results: TestResult[] = [];
    
    for (const testSuite of this.testSuites) {
      const result = await this.runTestSuite(testSuite);
      results.push(result);
    }
    
    const report = this.generateReport(results);
    
    this.saveReport(report);
    this.generateHtmlReport(report);
    this.printSummary(report);
    
    return report;
  }

  public async runSpecificTest(testName: string): Promise<TestResult> {
    const testSuite = this.testSuites.find(suite => 
      suite.name.toLowerCase().includes(testName.toLowerCase()) ||
      suite.file.toLowerCase().includes(testName.toLowerCase())
    );
    
    if (!testSuite) {
      throw new Error(`Test suite not found: ${testName}`);
    }
    
    console.log(`🎯 Running specific test: ${testSuite.name}`);
    return await this.runTestSuite(testSuite);
  }
}

export default UserAcceptanceTestRunner;

// CLI interface
if (require.main === module) {
  const runner = new UserAcceptanceTestRunner();
  const testName = process.argv[2];
  
  if (testName) {
    runner.runSpecificTest(testName)
      .then(result => {
        console.log(`\n✅ Test completed: ${result.passed} passed, ${result.failed} failed`);
        process.exit(result.failed > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error(`❌ Test failed: ${error.message}`);
        process.exit(1);
      });
  } else {
    runner.runAllTests()
      .then(report => {
        process.exit(report.totalFailed > 0 ? 1 : 0);
      })
      .catch(error => {
        console.error(`❌ Test suite failed: ${error.message}`);
        process.exit(1);
      });
  }
}