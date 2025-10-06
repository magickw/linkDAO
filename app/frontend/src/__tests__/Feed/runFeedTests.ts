#!/usr/bin/env node

/**
 * Feed System Test Runner
 * 
 * Comprehensive test suite for the Feed System including:
 * - Unit tests for individual components
 * - Integration tests for workflows
 * - Performance tests for optimization
 * - Caching tests for intelligent caching
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

interface TestSuite {
  name: string;
  pattern: string;
  timeout: number;
  description: string;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  errors?: string[];
}

class FeedTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  private testSuites: TestSuite[] = [
    {
      name: 'Feed Unit Tests',
      pattern: 'src/__tests__/unit/Feed/**/*.test.tsx',
      timeout: 30000,
      description: 'Unit tests for FeedPage, EnhancedPostCard, and PostComposer components'
    },
    {
      name: 'Feed Integration Tests',
      pattern: 'src/__tests__/integration/Feed/**/*.test.tsx',
      timeout: 60000,
      description: 'Integration tests for complete feed workflows and interactions'
    },
    {
      name: 'Feed Performance Tests',
      pattern: 'src/__tests__/performance/Feed/**/*.test.tsx',
      timeout: 120000,
      description: 'Performance tests for rendering, scrolling, and caching optimization'
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Feed System Test Suite...\n');
    this.startTime = performance.now();

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    this.printSummary();
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running ${suite.name}...`);
    console.log(`   ${suite.description}`);
    
    const startTime = performance.now();
    
    try {
      const command = this.buildJestCommand(suite);
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: suite.timeout,
        stdio: 'pipe'
      });
      
      const duration = performance.now() - startTime;
      const coverage = this.extractCoverage(output);
      
      this.results.push({
        suite: suite.name,
        passed: true,
        duration,
        coverage
      });
      
      console.log(`   ✅ Passed in ${Math.round(duration)}ms`);
      if (coverage) {
        console.log(`   📊 Coverage: ${coverage}%`);
      }
      
    } catch (error: any) {
      const duration = performance.now() - startTime;
      const errors = this.extractErrors(error.stdout || error.message);
      
      this.results.push({
        suite: suite.name,
        passed: false,
        duration,
        errors
      });
      
      console.log(`   ❌ Failed in ${Math.round(duration)}ms`);
      console.log(`   🔍 Errors: ${errors.length} found`);
    }
    
    console.log('');
  }

  private buildJestCommand(suite: TestSuite): string {
    const baseCommand = 'npx jest';
    const options = [
      `--testPathPattern="${suite.pattern}"`,
      '--coverage',
      '--coverageReporters=text-summary',
      '--verbose',
      '--detectOpenHandles',
      '--forceExit',
      `--testTimeout=${suite.timeout}`
    ];
    
    return `${baseCommand} ${options.join(' ')}`;
  }

  private extractCoverage(output: string): number | undefined {
    const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+\.?\d*)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : undefined;
  }

  private extractErrors(output: string): string[] {
    const errors: string[] = [];
    
    // Extract Jest test failures
    const failureMatches = output.match(/● .+/g);
    if (failureMatches) {
      errors.push(...failureMatches);
    }
    
    // Extract console errors
    const consoleErrorMatches = output.match(/console\.error[^\n]*/g);
    if (consoleErrorMatches) {
      errors.push(...consoleErrorMatches);
    }
    
    return errors;
  }

  private printSummary(): void {
    const totalDuration = performance.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const totalTests = this.results.length;
    
    console.log('📊 Feed System Test Summary');
    console.log('=' .repeat(50));
    console.log(`Total Duration: ${Math.round(totalDuration)}ms`);
    console.log(`Total Suites: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log('');
    
    // Detailed results
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const duration = Math.round(result.duration);
      const coverage = result.coverage ? ` (${result.coverage}% coverage)` : '';
      
      console.log(`${status} ${result.suite}: ${duration}ms${coverage}`);
      
      if (result.errors && result.errors.length > 0) {
        result.errors.slice(0, 3).forEach(error => {
          console.log(`   🔍 ${error.substring(0, 100)}...`);
        });
        if (result.errors.length > 3) {
          console.log(`   ... and ${result.errors.length - 3} more errors`);
        }
      }
    });
    
    console.log('');
    
    // Performance insights
    this.printPerformanceInsights();
    
    // Coverage summary
    this.printCoverageSummary();
    
    // Recommendations
    this.printRecommendations();
    
    // Exit with appropriate code
    process.exit(failedTests > 0 ? 1 : 0);
  }

  private printPerformanceInsights(): void {
    console.log('⚡ Performance Insights');
    console.log('-'.repeat(30));
    
    const performanceResult = this.results.find(r => r.suite.includes('Performance'));
    if (performanceResult) {
      if (performanceResult.passed) {
        console.log('✅ All performance benchmarks passed');
        console.log('   - Initial render < 200ms');
        console.log('   - Scroll performance < 16ms');
        console.log('   - Memory usage optimized');
      } else {
        console.log('⚠️  Performance issues detected');
        console.log('   - Check render times and memory usage');
        console.log('   - Consider virtualization optimizations');
      }
    }
    console.log('');
  }

  private printCoverageSummary(): void {
    console.log('📈 Coverage Summary');
    console.log('-'.repeat(30));
    
    const coverageResults = this.results.filter(r => r.coverage !== undefined);
    if (coverageResults.length > 0) {
      const averageCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length;
      
      console.log(`Average Coverage: ${Math.round(averageCoverage)}%`);
      
      coverageResults.forEach(result => {
        const coverage = result.coverage || 0;
        const status = coverage >= 80 ? '✅' : coverage >= 60 ? '⚠️' : '❌';
        console.log(`${status} ${result.suite}: ${coverage}%`);
      });
      
      if (averageCoverage < 80) {
        console.log('⚠️  Consider adding more tests to improve coverage');
      }
    } else {
      console.log('No coverage data available');
    }
    console.log('');
  }

  private printRecommendations(): void {
    console.log('💡 Recommendations');
    console.log('-'.repeat(30));
    
    const failedSuites = this.results.filter(r => !r.passed);
    
    if (failedSuites.length === 0) {
      console.log('🎉 All tests passed! Consider:');
      console.log('   - Adding more edge case tests');
      console.log('   - Testing with different data sizes');
      console.log('   - Adding accessibility tests');
      console.log('   - Performance regression tests');
    } else {
      console.log('🔧 Fix the following issues:');
      
      failedSuites.forEach(suite => {
        console.log(`   - ${suite.suite}: Review test failures`);
        
        if (suite.suite.includes('Performance')) {
          console.log('     * Check component optimization');
          console.log('     * Review virtualization implementation');
          console.log('     * Optimize caching strategies');
        }
        
        if (suite.suite.includes('Integration')) {
          console.log('     * Verify component interactions');
          console.log('     * Check async operation handling');
          console.log('     * Review error boundaries');
        }
        
        if (suite.suite.includes('Unit')) {
          console.log('     * Fix component logic issues');
          console.log('     * Update mock implementations');
          console.log('     * Review prop handling');
        }
      });
    }
    
    console.log('');
    console.log('📚 Additional Testing Resources:');
    console.log('   - React Testing Library: https://testing-library.com/docs/react-testing-library/intro/');
    console.log('   - Jest Performance: https://jestjs.io/docs/performance');
    console.log('   - Accessibility Testing: https://github.com/nickcolley/jest-axe');
  }
}

// CLI interface
if (require.main === module) {
  const runner = new FeedTestRunner();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Feed System Test Runner');
    console.log('');
    console.log('Usage: npm run test:feed [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --unit         Run only unit tests');
    console.log('  --integration  Run only integration tests');
    console.log('  --performance  Run only performance tests');
    console.log('');
    console.log('Examples:');
    console.log('  npm run test:feed                 # Run all feed tests');
    console.log('  npm run test:feed --unit          # Run only unit tests');
    console.log('  npm run test:feed --performance   # Run only performance tests');
    process.exit(0);
  }
  
  // Filter test suites based on arguments
  if (args.includes('--unit')) {
    runner['testSuites'] = runner['testSuites'].filter(s => s.name.includes('Unit'));
  } else if (args.includes('--integration')) {
    runner['testSuites'] = runner['testSuites'].filter(s => s.name.includes('Integration'));
  } else if (args.includes('--performance')) {
    runner['testSuites'] = runner['testSuites'].filter(s => s.name.includes('Performance'));
  }
  
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export default FeedTestRunner;