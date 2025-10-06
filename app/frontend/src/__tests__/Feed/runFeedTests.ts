#!/usr/bin/env node

/**
 * Comprehensive Feed System Test Runner
 * 
 * This script runs all feed-related tests including:
 * - Unit tests for individual components
 * - Integration tests for workflows
 * - Performance tests for caching and infinite scroll
 * 
 * Usage:
 * npm run test:feed
 * npm run test:feed -- --coverage
 * npm run test:feed -- --performance
 * npm run test:feed -- --integration
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  description: string;
  timeout?: number;
}

interface TestResults {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  coverage?: number;
}

class FeedTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      pattern: 'src/__tests__/unit/Feed/**/*.test.tsx',
      description: 'Individual component unit tests',
      timeout: 30000
    },
    {
      name: 'Integration Tests',
      pattern: 'src/__tests__/integration/Feed/**/*.test.tsx',
      description: 'Cross-component workflow tests',
      timeout: 60000
    },
    {
      name: 'Performance Tests',
      pattern: 'src/__tests__/performance/Feed/**/*.test.tsx',
      description: 'Performance and caching tests',
      timeout: 120000
    }
  ];

  private results: TestResults[] = [];

  async runAllTests(options: {
    coverage?: boolean;
    performance?: boolean;
    integration?: boolean;
    unit?: boolean;
    verbose?: boolean;
  } = {}): Promise<void> {
    console.log('🚀 Starting Feed System Test Suite\n');

    const suitesToRun = this.filterSuites(options);

    for (const suite of suitesToRun) {
      await this.runTestSuite(suite, options);
    }

    this.generateReport();
  }

  private filterSuites(options: any): TestSuite[] {
    if (options.unit) {
      return this.testSuites.filter(s => s.name === 'Unit Tests');
    }
    if (options.integration) {
      return this.testSuites.filter(s => s.name === 'Integration Tests');
    }
    if (options.performance) {
      return this.testSuites.filter(s => s.name === 'Performance Tests');
    }
    return this.testSuites;
  }

  private async runTestSuite(suite: TestSuite, options: any): Promise<void> {
    console.log(`\n📋 Running ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log(`   Pattern: ${suite.pattern}\n`);

    const startTime = Date.now();

    try {
      const jestArgs = this.buildJestArgs(suite, options);
      const command = `npx jest ${jestArgs.join(' ')}`;

      if (options.verbose) {
        console.log(`   Command: ${command}\n`);
      }

      const output = execSync(command, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: suite.timeout || 60000
      });

      const result = this.parseJestOutput(output);
      const duration = Date.now() - startTime;

      this.results.push({
        suite: suite.name,
        passed: result.passed,
        failed: result.failed,
        duration,
        coverage: result.coverage
      });

      console.log(`✅ ${suite.name} completed in ${duration}ms`);
      console.log(`   Passed: ${result.passed}, Failed: ${result.failed}`);
      
      if (result.coverage) {
        console.log(`   Coverage: ${result.coverage}%`);
      }

    } catch (error: any) {
      console.error(`❌ ${suite.name} failed:`);
      console.error(error.message);

      this.results.push({
        suite: suite.name,
        passed: 0,
        failed: 1,
        duration: Date.now() - startTime
      });
    }
  }

  private buildJestArgs(suite: TestSuite, options: any): string[] {
    const args = [
      `--testPathPattern="${suite.pattern}"`,
      '--passWithNoTests',
      '--detectOpenHandles',
      '--forceExit'
    ];

    if (options.coverage) {
      args.push(
        '--coverage',
        '--coverageDirectory=coverage/feed',
        '--coverageReporters=text,lcov,html',
        '--collectCoverageFrom=src/components/Feed/**/*.{ts,tsx}',
        '--collectCoverageFrom=src/services/feedService.ts',
        '--collectCoverageFrom=src/hooks/useFeedPreferences.ts',
        '--collectCoverageFrom=src/hooks/useIntelligentCache.ts'
      );
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    if (suite.name === 'Performance Tests') {
      args.push(
        '--testTimeout=120000',
        '--maxWorkers=1' // Run performance tests sequentially
      );
    }

    return args;
  }

  private parseJestOutput(output: string): {
    passed: number;
    failed: number;
    coverage?: number;
  } {
    const lines = output.split('\n');
    
    let passed = 0;
    let failed = 0;
    let coverage: number | undefined;

    for (const line of lines) {
      // Parse test results
      const testMatch = line.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed/);
      if (testMatch) {
        failed = parseInt(testMatch[1]);
        passed = parseInt(testMatch[2]);
      }

      const passOnlyMatch = line.match(/Tests:\s+(\d+)\s+passed/);
      if (passOnlyMatch && !testMatch) {
        passed = parseInt(passOnlyMatch[1]);
        failed = 0;
      }

      // Parse coverage
      const coverageMatch = line.match(/All files\s+\|\s+([\d.]+)/);
      if (coverageMatch) {
        coverage = parseFloat(coverageMatch[1]);
      }
    }

    return { passed, failed, coverage };
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FEED SYSTEM TEST REPORT');
    console.log('='.repeat(60));

    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\nOverall Results:`);
    console.log(`  Total Tests: ${totalPassed + totalFailed}`);
    console.log(`  Passed: ${totalPassed}`);
    console.log(`  Failed: ${totalFailed}`);
    console.log(`  Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    console.log(`\nSuite Breakdown:`);
    this.results.forEach(result => {
      const successRate = result.passed / (result.passed + result.failed) * 100;
      console.log(`  ${result.suite}:`);
      console.log(`    Passed: ${result.passed}, Failed: ${result.failed}`);
      console.log(`    Success Rate: ${successRate.toFixed(1)}%`);
      console.log(`    Duration: ${(result.duration / 1000).toFixed(2)}s`);
      
      if (result.coverage) {
        console.log(`    Coverage: ${result.coverage}%`);
      }
    });

    // Performance benchmarks
    const performanceResult = this.results.find(r => r.suite === 'Performance Tests');
    if (performanceResult) {
      console.log(`\nPerformance Benchmarks:`);
      console.log(`  Cache Hit Time: < 50ms (target)`);
      console.log(`  Infinite Scroll: < 16ms per frame (target)`);
      console.log(`  Memory Usage: < 100MB for 1000 posts (target)`);
      console.log(`  Initial Render: < 200ms (target)`);
    }

    // Coverage summary
    const coverageResults = this.results.filter(r => r.coverage !== undefined);
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length;
      console.log(`\nCode Coverage:`);
      console.log(`  Average Coverage: ${avgCoverage.toFixed(1)}%`);
      console.log(`  Target Coverage: 80%`);
      
      if (avgCoverage >= 80) {
        console.log(`  ✅ Coverage target met`);
      } else {
        console.log(`  ⚠️  Coverage below target`);
      }
    }

    // Recommendations
    console.log(`\nRecommendations:`);
    
    if (totalFailed > 0) {
      console.log(`  🔧 Fix ${totalFailed} failing test(s)`);
    }

    const slowSuites = this.results.filter(r => r.duration > 30000);
    if (slowSuites.length > 0) {
      console.log(`  ⚡ Optimize slow test suites: ${slowSuites.map(s => s.suite).join(', ')}`);
    }

    const lowCoverage = coverageResults.filter(r => (r.coverage || 0) < 80);
    if (lowCoverage.length > 0) {
      console.log(`  📈 Improve coverage for: ${lowCoverage.map(r => r.suite).join(', ')}`);
    }

    if (totalFailed === 0) {
      console.log(`  🎉 All tests passing! Great work!`);
    }

    console.log('\n' + '='.repeat(60));

    // Exit with appropriate code
    process.exit(totalFailed > 0 ? 1 : 0);
  }

  async generateCoverageReport(): Promise<void> {
    console.log('\n📊 Generating detailed coverage report...');

    try {
      execSync('npx jest --coverage --coverageDirectory=coverage/feed-detailed', {
        stdio: 'inherit'
      });

      console.log('\n✅ Coverage report generated in coverage/feed-detailed/');
      console.log('   Open coverage/feed-detailed/lcov-report/index.html to view');
    } catch (error) {
      console.error('❌ Failed to generate coverage report:', error);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    coverage: args.includes('--coverage'),
    performance: args.includes('--performance'),
    integration: args.includes('--integration'),
    unit: args.includes('--unit'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  const runner = new FeedTestRunner();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Feed System Test Runner

Usage:
  npm run test:feed [options]

Options:
  --unit          Run only unit tests
  --integration   Run only integration tests  
  --performance   Run only performance tests
  --coverage      Generate coverage report
  --verbose       Verbose output
  --help          Show this help

Examples:
  npm run test:feed
  npm run test:feed -- --coverage
  npm run test:feed -- --performance --verbose
  npm run test:feed -- --unit --coverage
    `);
    return;
  }

  try {
    await runner.runAllTests(options);

    if (options.coverage) {
      await runner.generateCoverageReport();
    }
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { FeedTestRunner };