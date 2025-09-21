import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  path: string;
  description: string;
  category: 'unit' | 'integration' | 'e2e' | 'accessibility' | 'performance' | 'cross-browser';
}

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  errors: string[];
}

interface TestReport {
  timestamp: string;
  totalSuites: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage: number;
  results: TestResult[];
  summary: {
    unit: TestResult[];
    integration: TestResult[];
    e2e: TestResult[];
    accessibility: TestResult[];
    performance: TestResult[];
    crossBrowser: TestResult[];
  };
}

export class RedditStyleTestRunner {
  private testSuites: TestSuite[] = [
    // Unit Tests
    {
      name: 'RedditStylePostCard',
      path: 'src/components/RedditStylePostCard/__tests__/RedditStylePostCard.test.tsx',
      description: 'Reddit-style post card component unit tests',
      category: 'unit'
    },
    {
      name: 'PostSortingTabs',
      path: 'src/components/Community/__tests__/PostSortingTabs.test.tsx',
      description: 'Post sorting tabs component unit tests',
      category: 'unit'
    },
    {
      name: 'FilterPanel',
      path: 'src/components/Community/__tests__/FilterPanel.test.tsx',
      description: 'Advanced filtering panel unit tests',
      category: 'unit'
    },
    {
      name: 'AboutCommunityWidget',
      path: 'src/components/Community/__tests__/AboutCommunityWidget.test.tsx',
      description: 'About community widget unit tests',
      category: 'unit'
    },
    {
      name: 'CommunityStatsWidget',
      path: 'src/components/Community/__tests__/CommunityStatsWidget.test.tsx',
      description: 'Community statistics widget unit tests',
      category: 'unit'
    },
    {
      name: 'ModeratorListWidget',
      path: 'src/components/Community/__tests__/ModeratorListWidget.test.tsx',
      description: 'Moderator list widget unit tests',
      category: 'unit'
    },
    {
      name: 'GovernanceWidget',
      path: 'src/components/Community/__tests__/GovernanceWidget.test.tsx',
      description: 'Governance widget unit tests',
      category: 'unit'
    },
    {
      name: 'RelatedCommunitiesWidget',
      path: 'src/components/Community/__tests__/RelatedCommunitiesWidget.test.tsx',
      description: 'Related communities widget unit tests',
      category: 'unit'
    },
    {
      name: 'ViewModeToggle',
      path: 'src/components/Community/__tests__/ViewModeToggle.test.tsx',
      description: 'View mode toggle unit tests',
      category: 'unit'
    },
    {
      name: 'CommentPreviewSystem',
      path: 'src/components/Community/__tests__/CommentPreviewSystem.test.tsx',
      description: 'Comment preview system unit tests',
      category: 'unit'
    },
    {
      name: 'SwipeablePostCard',
      path: 'src/components/RedditStylePostCard/__tests__/SwipeablePostCard.test.tsx',
      description: 'Swipeable post card unit tests',
      category: 'unit'
    },
    {
      name: 'MobileSidebarManager',
      path: 'src/components/Mobile/__tests__/MobileSidebarManager.test.tsx',
      description: 'Mobile sidebar manager unit tests',
      category: 'unit'
    },

    // Integration Tests
    {
      name: 'RedditStyleCommunityIntegration',
      path: 'src/__tests__/integration/RedditStyleCommunityIntegration.test.tsx',
      description: 'Complete Reddit-style community integration tests',
      category: 'integration'
    },
    {
      name: 'PostInteractionWorkflow',
      path: 'src/__tests__/integration/PostInteractionWorkflow.test.tsx',
      description: 'Post interaction workflow integration tests',
      category: 'integration'
    },
    {
      name: 'FilteringSortingIntegration',
      path: 'src/__tests__/integration/FilteringSortingIntegration.test.tsx',
      description: 'Filtering and sorting integration tests',
      category: 'integration'
    },
    {
      name: 'GovernanceIntegration',
      path: 'src/__tests__/integration/GovernanceIntegration.test.tsx',
      description: 'Governance system integration tests',
      category: 'integration'
    },
    {
      name: 'MobileIntegration',
      path: 'src/__tests__/integration/MobileIntegration.test.tsx',
      description: 'Mobile experience integration tests',
      category: 'integration'
    },

    // E2E Tests
    {
      name: 'RedditStyleE2E',
      path: 'src/__tests__/e2e/RedditStyleE2E.test.tsx',
      description: 'End-to-end Reddit-style community tests',
      category: 'e2e'
    },
    {
      name: 'UserJourneyE2E',
      path: 'src/__tests__/e2e/UserJourneyE2E.test.tsx',
      description: 'Complete user journey end-to-end tests',
      category: 'e2e'
    },
    {
      name: 'MobileE2E',
      path: 'src/__tests__/e2e/MobileE2E.test.tsx',
      description: 'Mobile user experience end-to-end tests',
      category: 'e2e'
    },

    // Accessibility Tests
    {
      name: 'RedditStyleAccessibility',
      path: 'src/__tests__/accessibility/RedditStyleAccessibility.test.tsx',
      description: 'Reddit-style components accessibility tests',
      category: 'accessibility'
    },
    {
      name: 'KeyboardNavigation',
      path: 'src/__tests__/accessibility/KeyboardNavigation.test.tsx',
      description: 'Keyboard navigation accessibility tests',
      category: 'accessibility'
    },
    {
      name: 'ScreenReaderSupport',
      path: 'src/__tests__/accessibility/ScreenReaderSupport.test.tsx',
      description: 'Screen reader support accessibility tests',
      category: 'accessibility'
    },

    // Performance Tests
    {
      name: 'VirtualScrollingPerformance',
      path: 'src/__tests__/performance/VirtualScrollingPerformance.test.tsx',
      description: 'Virtual scrolling performance tests',
      category: 'performance'
    },
    {
      name: 'LazyLoadingPerformance',
      path: 'src/__tests__/performance/LazyLoadingPerformance.test.tsx',
      description: 'Lazy loading performance tests',
      category: 'performance'
    },
    {
      name: 'AnimationPerformance',
      path: 'src/__tests__/performance/AnimationPerformance.test.tsx',
      description: 'Animation performance tests',
      category: 'performance'
    },

    // Cross-Browser Tests
    {
      name: 'CrossBrowserCompatibility',
      path: 'src/__tests__/crossBrowser/CrossBrowserCompatibility.test.tsx',
      description: 'Cross-browser compatibility tests',
      category: 'cross-browser'
    },
    {
      name: 'ResponsiveDesign',
      path: 'src/__tests__/crossBrowser/ResponsiveDesign.test.tsx',
      description: 'Responsive design cross-browser tests',
      category: 'cross-browser'
    }
  ];

  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor(private options: {
    coverage?: boolean;
    verbose?: boolean;
    parallel?: boolean;
    categories?: string[];
    outputPath?: string;
  } = {}) {}

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Reddit-Style Community Test Suite');
    console.log('================================================');
    
    this.startTime = Date.now();
    const filteredSuites = this.filterSuites();
    
    if (this.options.parallel) {
      await this.runTestsInParallel(filteredSuites);
    } else {
      await this.runTestsSequentially(filteredSuites);
    }

    const report = this.generateReport();
    await this.saveReport(report);
    this.printSummary(report);
    
    return report;
  }

  private filterSuites(): TestSuite[] {
    if (!this.options.categories || this.options.categories.length === 0) {
      return this.testSuites;
    }

    return this.testSuites.filter(suite => 
      this.options.categories!.includes(suite.category)
    );
  }

  private async runTestsSequentially(suites: TestSuite[]): Promise<void> {
    for (const suite of suites) {
      console.log(`\n📋 Running ${suite.name}...`);
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      this.printTestResult(result);
    }
  }

  private async runTestsInParallel(suites: TestSuite[]): Promise<void> {
    console.log(`\n🔄 Running ${suites.length} test suites in parallel...`);
    
    const promises = suites.map(suite => this.runTestSuite(suite));
    const results = await Promise.all(promises);
    
    this.results = results;
    results.forEach(result => this.printTestResult(result));
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const jestCommand = this.buildJestCommand(suite);
      const output = execSync(jestCommand, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 300000 // 5 minutes timeout
      });

      const result = this.parseJestOutput(output, suite.name);
      result.duration = Date.now() - startTime;
      
      return result;
    } catch (error: any) {
      return {
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: Date.now() - startTime,
        errors: [error.message || 'Unknown error']
      };
    }
  }

  private buildJestCommand(suite: TestSuite): string {
    const baseCommand = 'npx jest';
    const testPath = suite.path;
    const options = [];

    if (this.options.coverage) {
      options.push('--coverage');
      options.push('--coverageReporters=json-summary');
    }

    if (this.options.verbose) {
      options.push('--verbose');
    }

    options.push('--json');
    options.push('--testPathPattern=' + testPath);

    return `${baseCommand} ${options.join(' ')}`;
  }

  private parseJestOutput(output: string, suiteName: string): TestResult {
    try {
      const jsonOutput = JSON.parse(output);
      
      return {
        suite: suiteName,
        passed: jsonOutput.numPassedTests || 0,
        failed: jsonOutput.numFailedTests || 0,
        skipped: jsonOutput.numPendingTests || 0,
        duration: jsonOutput.testResults?.[0]?.perfStats?.runtime || 0,
        coverage: this.extractCoverage(jsonOutput),
        errors: this.extractErrors(jsonOutput)
      };
    } catch (error) {
      return {
        suite: suiteName,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        errors: ['Failed to parse Jest output']
      };
    }
  }

  private extractCoverage(jsonOutput: any): number | undefined {
    if (!jsonOutput.coverageMap) return undefined;
    
    const coverage = jsonOutput.coverageMap;
    let totalStatements = 0;
    let coveredStatements = 0;

    Object.values(coverage).forEach((file: any) => {
      if (file.s) {
        totalStatements += Object.keys(file.s).length;
        coveredStatements += Object.values(file.s).filter((count: any) => count > 0).length;
      }
    });

    return totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0;
  }

  private extractErrors(jsonOutput: any): string[] {
    const errors: string[] = [];
    
    if (jsonOutput.testResults) {
      jsonOutput.testResults.forEach((testResult: any) => {
        if (testResult.message) {
          errors.push(testResult.message);
        }
      });
    }

    return errors;
  }

  private generateReport(): TestReport {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.results.reduce((sum, result) => 
      sum + result.passed + result.failed + result.skipped, 0
    );
    const totalPassed = this.results.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = this.results.reduce((sum, result) => sum + result.failed, 0);
    const totalSkipped = this.results.reduce((sum, result) => sum + result.skipped, 0);
    
    const coverageResults = this.results.filter(r => r.coverage !== undefined);
    const averageCoverage = coverageResults.length > 0 
      ? coverageResults.reduce((sum, result) => sum + (result.coverage || 0), 0) / coverageResults.length
      : 0;

    return {
      timestamp: new Date().toISOString(),
      totalSuites: this.results.length,
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration: totalDuration,
      coverage: averageCoverage,
      results: this.results,
      summary: {
        unit: this.results.filter(r => this.getSuiteCategory(r.suite) === 'unit'),
        integration: this.results.filter(r => this.getSuiteCategory(r.suite) === 'integration'),
        e2e: this.results.filter(r => this.getSuiteCategory(r.suite) === 'e2e'),
        accessibility: this.results.filter(r => this.getSuiteCategory(r.suite) === 'accessibility'),
        performance: this.results.filter(r => this.getSuiteCategory(r.suite) === 'performance'),
        crossBrowser: this.results.filter(r => this.getSuiteCategory(r.suite) === 'cross-browser')
      }
    };
  }

  private getSuiteCategory(suiteName: string): string {
    const suite = this.testSuites.find(s => s.name === suiteName);
    return suite?.category || 'unknown';
  }

  private async saveReport(report: TestReport): Promise<void> {
    const outputPath = this.options.outputPath || 'test-reports/reddit-style-test-report.json';
    const outputDir = path.dirname(outputPath);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    
    // Also save HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = outputPath.replace('.json', '.html');
    fs.writeFileSync(htmlPath, htmlReport);
    
    console.log(`\n📊 Test report saved to: ${outputPath}`);
    console.log(`📊 HTML report saved to: ${htmlPath}`);
  }

  private generateHtmlReport(report: TestReport): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reddit-Style Community Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #ff4500; margin: 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .coverage { color: #17a2b8; }
        .category-section { margin-bottom: 30px; }
        .category-section h2 { color: #333; border-bottom: 2px solid #ff4500; padding-bottom: 10px; }
        .test-result { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; }
        .test-result.failed { border-left-color: #dc3545; }
        .test-result h4 { margin: 0 0 10px 0; }
        .test-stats { display: flex; gap: 20px; font-size: 0.9em; }
        .error-list { background: #f8d7da; padding: 10px; border-radius: 4px; margin-top: 10px; }
        .error-list pre { margin: 0; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Reddit-Style Community Test Report</h1>
            <p>Generated on ${new Date(report.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${report.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="value passed">${report.passed}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="value failed">${report.failed}</div>
            </div>
            <div class="summary-card">
                <h3>Coverage</h3>
                <div class="value coverage">${report.coverage.toFixed(1)}%</div>
            </div>
        </div>

        ${Object.entries(report.summary).map(([category, results]) => `
            <div class="category-section">
                <h2>${category.charAt(0).toUpperCase() + category.slice(1)} Tests</h2>
                ${results.map(result => `
                    <div class="test-result ${result.failed > 0 ? 'failed' : ''}">
                        <h4>${result.suite}</h4>
                        <div class="test-stats">
                            <span class="passed">✅ ${result.passed} passed</span>
                            <span class="failed">❌ ${result.failed} failed</span>
                            <span class="skipped">⏭️ ${result.skipped} skipped</span>
                            <span>⏱️ ${result.duration}ms</span>
                            ${result.coverage ? `<span class="coverage">📊 ${result.coverage.toFixed(1)}% coverage</span>` : ''}
                        </div>
                        ${result.errors.length > 0 ? `
                            <div class="error-list">
                                <strong>Errors:</strong>
                                <pre>${result.errors.join('\n')}</pre>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  private printTestResult(result: TestResult): void {
    const status = result.failed > 0 ? '❌' : '✅';
    const coverage = result.coverage ? ` (${result.coverage.toFixed(1)}% coverage)` : '';
    
    console.log(`${status} ${result.suite}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped${coverage}`);
    
    if (result.errors.length > 0 && this.options.verbose) {
      console.log('   Errors:');
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
  }

  private printSummary(report: TestReport): void {
    console.log('\n🎯 Test Summary');
    console.log('================');
    console.log(`Total Suites: ${report.totalSuites}`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.passed}`);
    console.log(`❌ Failed: ${report.failed}`);
    console.log(`⏭️ Skipped: ${report.skipped}`);
    console.log(`📊 Coverage: ${report.coverage.toFixed(1)}%`);
    console.log(`⏱️ Duration: ${(report.duration / 1000).toFixed(2)}s`);
    
    if (report.failed > 0) {
      console.log('\n❌ Failed Tests:');
      report.results
        .filter(r => r.failed > 0)
        .forEach(r => console.log(`   - ${r.suite}`));
    }
    
    console.log('\n📋 Category Breakdown:');
    Object.entries(report.summary).forEach(([category, results]) => {
      const totalTests = results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
      const passedTests = results.reduce((sum, r) => sum + r.passed, 0);
      const failedTests = results.reduce((sum, r) => sum + r.failed, 0);
      
      if (totalTests > 0) {
        console.log(`   ${category}: ${passedTests}/${totalTests} passed (${failedTests} failed)`);
      }
    });
    
    const successRate = report.totalTests > 0 ? (report.passed / report.totalTests) * 100 : 0;
    console.log(`\n🎯 Overall Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 95) {
      console.log('🎉 Excellent! All Reddit-style features are working great!');
    } else if (successRate >= 80) {
      console.log('👍 Good! Most features are working, but some need attention.');
    } else {
      console.log('⚠️ Warning! Several features need fixes before deployment.');
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options: any = {};
  
  if (args.includes('--coverage')) options.coverage = true;
  if (args.includes('--verbose')) options.verbose = true;
  if (args.includes('--parallel')) options.parallel = true;
  
  const categoryIndex = args.indexOf('--categories');
  if (categoryIndex !== -1 && args[categoryIndex + 1]) {
    options.categories = args[categoryIndex + 1].split(',');
  }
  
  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputPath = args[outputIndex + 1];
  }
  
  const runner = new RedditStyleTestRunner(options);
  
  runner.runAllTests()
    .then(report => {
      process.exit(report.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}