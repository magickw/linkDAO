import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

/**
 * Comprehensive test runner for Web3 integration components
 * Runs all Web3 component tests with performance monitoring and reporting
 */

interface TestSuite {
  name: string;
  path: string;
  category: 'unit' | 'integration' | 'accessibility' | 'performance';
  timeout?: number;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  errors?: string[];
}

interface TestReport {
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalDuration: number;
  overallCoverage: number;
  results: TestResult[];
  summary: string;
}

export class Web3ComponentTestRunner {
  private testSuites: TestSuite[] = [
    // Unit Tests
    {
      name: 'Staking Indicator Unit Tests',
      path: 'src/components/Staking/__tests__/StakingIndicator.test.tsx',
      category: 'unit',
      timeout: 30000,
    },
    {
      name: 'Boost Button Unit Tests',
      path: 'src/components/Staking/__tests__/BoostButton.test.tsx',
      category: 'unit',
      timeout: 30000,
    },
    {
      name: 'On-Chain Verification Badge Unit Tests',
      path: 'src/components/OnChainVerification/__tests__/OnChainVerificationBadge.test.tsx',
      category: 'unit',
      timeout: 30000,
    },
    {
      name: 'Governance Voting Button Unit Tests',
      path: 'src/components/SmartContractInteraction/__tests__/GovernanceVotingButton.test.tsx',
      category: 'unit',
      timeout: 30000,
    },
    {
      name: 'Live Token Price Display Unit Tests',
      path: 'src/components/RealTimeUpdates/__tests__/LiveTokenPriceDisplay.test.tsx',
      category: 'unit',
      timeout: 30000,
    },
    {
      name: 'Mobile Web3 Data Display Unit Tests',
      path: 'src/components/Mobile/__tests__/MobileWeb3DataDisplay.test.tsx',
      category: 'unit',
      timeout: 30000,
    },
    
    // Integration Tests
    {
      name: 'Web3 Components Integration Tests',
      path: 'src/__tests__/integration/Web3ComponentsIntegration.test.tsx',
      category: 'integration',
      timeout: 60000,
    },
    
    // Accessibility Tests
    {
      name: 'Web3 Accessibility Tests',
      path: 'src/__tests__/accessibility/Web3AccessibilityTests.test.tsx',
      category: 'accessibility',
      timeout: 45000,
    },
    
    // Performance Tests
    {
      name: 'Web3 Performance Tests',
      path: 'src/__tests__/performance/Web3PerformanceTests.test.tsx',
      category: 'performance',
      timeout: 90000,
    },
  ];

  private results: TestResult[] = [];

  /**
   * Run all Web3 component tests
   */
  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Web3 Component Test Suite...\n');
    
    const startTime = performance.now();
    let passedSuites = 0;
    let failedSuites = 0;

    for (const suite of this.testSuites) {
      console.log(`📋 Running: ${suite.name}`);
      
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (result.passed) {
        passedSuites++;
        console.log(`✅ ${suite.name} - PASSED (${result.duration.toFixed(2)}ms)`);
      } else {
        failedSuites++;
        console.log(`❌ ${suite.name} - FAILED (${result.duration.toFixed(2)}ms)`);
        if (result.errors) {
          result.errors.forEach(error => console.log(`   Error: ${error}`));
        }
      }
      console.log('');
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    const report: TestReport = {
      totalSuites: this.testSuites.length,
      passedSuites,
      failedSuites,
      totalDuration,
      overallCoverage: this.calculateOverallCoverage(),
      results: this.results,
      summary: this.generateSummary(passedSuites, failedSuites, totalDuration),
    };

    this.printReport(report);
    return report;
  }

  /**
   * Run tests by category
   */
  async runTestsByCategory(category: TestSuite['category']): Promise<TestReport> {
    const filteredSuites = this.testSuites.filter(suite => suite.category === category);
    
    console.log(`🎯 Running ${category} tests...\n`);
    
    const startTime = performance.now();
    let passedSuites = 0;
    let failedSuites = 0;
    const results: TestResult[] = [];

    for (const suite of filteredSuites) {
      console.log(`📋 Running: ${suite.name}`);
      
      const result = await this.runTestSuite(suite);
      results.push(result);
      
      if (result.passed) {
        passedSuites++;
        console.log(`✅ ${suite.name} - PASSED (${result.duration.toFixed(2)}ms)`);
      } else {
        failedSuites++;
        console.log(`❌ ${suite.name} - FAILED (${result.duration.toFixed(2)}ms)`);
      }
      console.log('');
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    return {
      totalSuites: filteredSuites.length,
      passedSuites,
      failedSuites,
      totalDuration,
      overallCoverage: this.calculateCategoryCoverage(results),
      results,
      summary: this.generateSummary(passedSuites, failedSuites, totalDuration),
    };
  }

  /**
   * Run a single test suite
   */
  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const command = `npm test -- --testPathPattern="${suite.path}" --coverage --watchAll=false --verbose`;
      
      const output = execSync(command, {
        cwd: process.cwd(),
        timeout: suite.timeout || 30000,
        encoding: 'utf8',
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Parse coverage from output (simplified)
      const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
      const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0;

      return {
        suite: suite.name,
        passed: true,
        duration,
        coverage,
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const errorMessage = error instanceof Error ? error.message : String(error);
      const errors = this.parseTestErrors(errorMessage);

      return {
        suite: suite.name,
        passed: false,
        duration,
        errors,
      };
    }
  }

  /**
   * Parse test errors from Jest output
   */
  private parseTestErrors(output: string): string[] {
    const errors: string[] = [];
    
    // Extract failed test descriptions
    const failedTestMatches = output.match(/● .+/g);
    if (failedTestMatches) {
      errors.push(...failedTestMatches.map(match => match.replace('● ', '')));
    }

    // Extract error messages
    const errorMatches = output.match(/Error: .+/g);
    if (errorMatches) {
      errors.push(...errorMatches);
    }

    return errors.slice(0, 5); // Limit to first 5 errors
  }

  /**
   * Calculate overall test coverage
   */
  private calculateOverallCoverage(): number {
    const coverageResults = this.results
      .filter(result => result.coverage !== undefined)
      .map(result => result.coverage!);
    
    if (coverageResults.length === 0) return 0;
    
    return coverageResults.reduce((sum, coverage) => sum + coverage, 0) / coverageResults.length;
  }

  /**
   * Calculate coverage for specific category
   */
  private calculateCategoryCoverage(results: TestResult[]): number {
    const coverageResults = results
      .filter(result => result.coverage !== undefined)
      .map(result => result.coverage!);
    
    if (coverageResults.length === 0) return 0;
    
    return coverageResults.reduce((sum, coverage) => sum + coverage, 0) / coverageResults.length;
  }

  /**
   * Generate test summary
   */
  private generateSummary(passed: number, failed: number, duration: number): string {
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    
    return `
📊 Test Summary:
   Total Suites: ${total}
   Passed: ${passed}
   Failed: ${failed}
   Pass Rate: ${passRate.toFixed(1)}%
   Duration: ${(duration / 1000).toFixed(2)}s
    `.trim();
  }

  /**
   * Print comprehensive test report
   */
  private printReport(report: TestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 WEB3 COMPONENT TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(report.summary);
    
    if (report.overallCoverage > 0) {
      console.log(`   Coverage: ${report.overallCoverage.toFixed(1)}%`);
    }
    
    console.log('\n📋 Detailed Results:');
    console.log('-'.repeat(60));
    
    // Group results by category
    const categories = ['unit', 'integration', 'accessibility', 'performance'] as const;
    
    categories.forEach(category => {
      const categoryResults = report.results.filter((_, index) => 
        this.testSuites[index]?.category === category
      );
      
      if (categoryResults.length > 0) {
        console.log(`\n${category.toUpperCase()} TESTS:`);
        categoryResults.forEach(result => {
          const status = result.passed ? '✅' : '❌';
          const duration = result.duration.toFixed(2);
          const coverage = result.coverage ? ` (${result.coverage.toFixed(1)}% coverage)` : '';
          
          console.log(`  ${status} ${result.suite} - ${duration}ms${coverage}`);
          
          if (!result.passed && result.errors) {
            result.errors.forEach(error => {
              console.log(`     ⚠️  ${error}`);
            });
          }
        });
      }
    });
    
    console.log('\n' + '='.repeat(60));
    
    if (report.failedSuites === 0) {
      console.log('🎉 All Web3 component tests passed!');
    } else {
      console.log(`⚠️  ${report.failedSuites} test suite(s) failed. Please review the errors above.`);
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Run specific test by name
   */
  async runSpecificTest(testName: string): Promise<TestResult | null> {
    const suite = this.testSuites.find(s => 
      s.name.toLowerCase().includes(testName.toLowerCase())
    );
    
    if (!suite) {
      console.log(`❌ Test suite "${testName}" not found.`);
      return null;
    }
    
    console.log(`🎯 Running specific test: ${suite.name}\n`);
    
    const result = await this.runTestSuite(suite);
    
    if (result.passed) {
      console.log(`✅ ${suite.name} - PASSED (${result.duration.toFixed(2)}ms)`);
    } else {
      console.log(`❌ ${suite.name} - FAILED (${result.duration.toFixed(2)}ms)`);
      if (result.errors) {
        result.errors.forEach(error => console.log(`   Error: ${error}`));
      }
    }
    
    return result;
  }

  /**
   * Generate test coverage report
   */
  async generateCoverageReport(): Promise<void> {
    console.log('📊 Generating Web3 component coverage report...\n');
    
    try {
      const command = 'npm test -- --coverage --watchAll=false --coverageDirectory=coverage/web3-components';
      
      execSync(command, {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
      
      console.log('\n✅ Coverage report generated in coverage/web3-components/');
    } catch (error) {
      console.log('❌ Failed to generate coverage report:', error);
    }
  }

  /**
   * Watch mode for continuous testing during development
   */
  async watchTests(): Promise<void> {
    console.log('👀 Starting Web3 component test watch mode...\n');
    
    try {
      const command = 'npm test -- --watch --testPathPattern="(Staking|OnChain|Governance|RealTime|Mobile).*test"';
      
      execSync(command, {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
    } catch (error) {
      console.log('❌ Watch mode failed:', error);
    }
  }
}

// CLI interface for running tests
if (require.main === module) {
  const runner = new Web3ComponentTestRunner();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    runner.runAllTests();
  } else {
    const command = args[0];
    const param = args[1];
    
    switch (command) {
      case 'category':
        if (param && ['unit', 'integration', 'accessibility', 'performance'].includes(param)) {
          runner.runTestsByCategory(param as any);
        } else {
          console.log('❌ Invalid category. Use: unit, integration, accessibility, or performance');
        }
        break;
        
      case 'specific':
        if (param) {
          runner.runSpecificTest(param);
        } else {
          console.log('❌ Please provide a test name');
        }
        break;
        
      case 'coverage':
        runner.generateCoverageReport();
        break;
        
      case 'watch':
        runner.watchTests();
        break;
        
      default:
        console.log(`
Usage: node Web3ComponentTestRunner.js [command] [param]

Commands:
  (no args)           Run all Web3 component tests
  category <type>     Run tests by category (unit|integration|accessibility|performance)
  specific <name>     Run a specific test by name
  coverage           Generate coverage report
  watch              Start watch mode for continuous testing

Examples:
  node Web3ComponentTestRunner.js
  node Web3ComponentTestRunner.js category unit
  node Web3ComponentTestRunner.js specific staking
  node Web3ComponentTestRunner.js coverage
  node Web3ComponentTestRunner.js watch
        `);
    }
  }
}

export default Web3ComponentTestRunner;