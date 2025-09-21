import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

interface TestSuite {
  name: string;
  pattern: string;
  timeout?: number;
  coverage?: boolean;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  errors?: string[];
}

class ComprehensiveTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests - Enhanced Post Composer',
      pattern: '__tests__/unit/EnhancedPostComposer.test.tsx',
      timeout: 30000,
      coverage: true,
    },
    {
      name: 'Unit Tests - Token Reaction System',
      pattern: '__tests__/unit/TokenReactionSystem.test.tsx',
      timeout: 30000,
      coverage: true,
    },
    {
      name: 'Unit Tests - Reputation System',
      pattern: '__tests__/unit/ReputationSystem.test.tsx',
      timeout: 30000,
      coverage: true,
    },
    {
      name: 'Integration Tests - Token Reaction Flow',
      pattern: '__tests__/integration/TokenReactionFlow.integration.test.tsx',
      timeout: 60000,
      coverage: true,
    },
    {
      name: 'Integration Tests - Content Creation Workflow',
      pattern: '__tests__/integration/ContentCreationWorkflow.integration.test.tsx',
      timeout: 60000,
      coverage: true,
    },
    {
      name: 'E2E Tests - Social Dashboard Journey',
      pattern: '__tests__/e2e/SocialDashboardJourney.e2e.test.tsx',
      timeout: 120000,
      coverage: false,
    },
    {
      name: 'Performance Tests - Virtual Scrolling',
      pattern: '__tests__/performance/PerformanceOptimization.test.tsx',
      timeout: 90000,
      coverage: false,
    },
    {
      name: 'Accessibility Tests - WCAG Compliance',
      pattern: '__tests__/accessibility/AccessibilityCompliance.test.tsx',
      timeout: 60000,
      coverage: true,
    },
    {
      name: 'Real-time Tests - Live Features',
      pattern: '__tests__/realtime/RealTimeFeatures.test.tsx',
      timeout: 60000,
      coverage: true,
    },
  ];

  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite for Social Dashboard Advanced Enhancements\n');
    
    const startTime = performance.now();
    
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }
    
    const totalTime = performance.now() - startTime;
    this.generateReport(totalTime);
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running: ${suite.name}`);
    console.log(`   Pattern: ${suite.pattern}`);
    
    const startTime = performance.now();
    
    try {
      const command = this.buildJestCommand(suite);
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: suite.timeout || 30000,
        stdio: 'pipe',
      });
      
      const duration = performance.now() - startTime;
      const coverage = this.extractCoverage(output);
      
      this.results.push({
        suite: suite.name,
        passed: true,
        duration,
        coverage,
      });
      
      console.log(`   ✅ PASSED (${Math.round(duration)}ms)`);
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
        errors,
      });
      
      console.log(`   ❌ FAILED (${Math.round(duration)}ms)`);
      console.log(`   🔍 Errors: ${errors.length} found`);
    }
    
    console.log('');
  }

  private buildJestCommand(suite: TestSuite): string {
    let command = `npx jest ${suite.pattern}`;
    
    if (suite.coverage) {
      command += ' --coverage --coverageReporters=text-summary';
    }
    
    command += ' --verbose --no-cache';
    
    if (suite.timeout) {
      command += ` --testTimeout=${suite.timeout}`;
    }
    
    return command;
  }

  private extractCoverage(output: string): number | undefined {
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)/);
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
    const consoleErrors = output.match(/console\.error[^\n]+/g);
    if (consoleErrors) {
      errors.push(...consoleErrors);
    }
    
    return errors;
  }

  private generateReport(totalTime: number): void {
    console.log('📊 TEST SUITE SUMMARY');
    console.log('='.repeat(50));
    
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalTests = this.results.length;
    
    console.log(`Total Test Suites: ${totalTests}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${Math.round((passed / totalTests) * 100)}%`);
    console.log(`Total Time: ${Math.round(totalTime / 1000)}s`);
    console.log('');
    
    // Coverage summary
    const coverageResults = this.results.filter(r => r.coverage !== undefined);
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length;
      console.log(`Average Coverage: ${Math.round(avgCoverage)}%`);
      console.log('');
    }
    
    // Detailed results
    console.log('📋 DETAILED RESULTS');
    console.log('-'.repeat(50));
    
    this.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const duration = Math.round(result.duration);
      const coverage = result.coverage ? ` (${Math.round(result.coverage)}% coverage)` : '';
      
      console.log(`${index + 1}. ${status} ${result.suite} - ${duration}ms${coverage}`);
      
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
    this.generatePerformanceInsights();
    
    // Quality metrics
    this.generateQualityMetrics();
    
    // Recommendations
    this.generateRecommendations();
  }

  private generatePerformanceInsights(): void {
    console.log('⚡ PERFORMANCE INSIGHTS');
    console.log('-'.repeat(30));
    
    const slowTests = this.results
      .filter(r => r.duration > 30000)
      .sort((a, b) => b.duration - a.duration);
    
    if (slowTests.length > 0) {
      console.log('Slow test suites (>30s):');
      slowTests.forEach(test => {
        console.log(`  • ${test.suite}: ${Math.round(test.duration / 1000)}s`);
      });
    } else {
      console.log('✅ All test suites completed in reasonable time');
    }
    
    console.log('');
  }

  private generateQualityMetrics(): void {
    console.log('📈 QUALITY METRICS');
    console.log('-'.repeat(30));
    
    const coverageResults = this.results.filter(r => r.coverage !== undefined);
    
    if (coverageResults.length > 0) {
      const highCoverage = coverageResults.filter(r => (r.coverage || 0) >= 80).length;
      const mediumCoverage = coverageResults.filter(r => (r.coverage || 0) >= 60 && (r.coverage || 0) < 80).length;
      const lowCoverage = coverageResults.filter(r => (r.coverage || 0) < 60).length;
      
      console.log(`High Coverage (≥80%): ${highCoverage} suites`);
      console.log(`Medium Coverage (60-79%): ${mediumCoverage} suites`);
      console.log(`Low Coverage (<60%): ${lowCoverage} suites`);
      
      if (lowCoverage > 0) {
        console.log('\n⚠️  Low coverage suites need attention:');
        coverageResults
          .filter(r => (r.coverage || 0) < 60)
          .forEach(r => {
            console.log(`  • ${r.suite}: ${Math.round(r.coverage || 0)}%`);
          });
      }
    }
    
    console.log('');
  }

  private generateRecommendations(): void {
    console.log('💡 RECOMMENDATIONS');
    console.log('-'.repeat(30));
    
    const failedTests = this.results.filter(r => !r.passed);
    const lowCoverageTests = this.results.filter(r => r.coverage && r.coverage < 80);
    const slowTests = this.results.filter(r => r.duration > 60000);
    
    if (failedTests.length > 0) {
      console.log('🔧 Fix failing tests:');
      failedTests.forEach(test => {
        console.log(`  • ${test.suite}`);
      });
      console.log('');
    }
    
    if (lowCoverageTests.length > 0) {
      console.log('📊 Improve test coverage:');
      lowCoverageTests.forEach(test => {
        console.log(`  • ${test.suite}: Add tests to reach 80%+ coverage`);
      });
      console.log('');
    }
    
    if (slowTests.length > 0) {
      console.log('⚡ Optimize slow tests:');
      slowTests.forEach(test => {
        console.log(`  • ${test.suite}: Consider mocking or reducing test scope`);
      });
      console.log('');
    }
    
    if (failedTests.length === 0 && lowCoverageTests.length === 0) {
      console.log('🎉 Excellent! All tests are passing with good coverage.');
      console.log('Consider adding more edge case tests and performance benchmarks.');
    }
    
    console.log('');
  }

  async runSpecificSuite(suiteName: string): Promise<void> {
    const suite = this.testSuites.find(s => s.name.toLowerCase().includes(suiteName.toLowerCase()));
    
    if (!suite) {
      console.log(`❌ Test suite "${suiteName}" not found.`);
      console.log('Available suites:');
      this.testSuites.forEach(s => console.log(`  • ${s.name}`));
      return;
    }
    
    console.log(`🎯 Running specific test suite: ${suite.name}\n`);
    await this.runTestSuite(suite);
    
    const result = this.results[this.results.length - 1];
    if (result.passed) {
      console.log('🎉 Test suite completed successfully!');
    } else {
      console.log('❌ Test suite failed. Check the errors above.');
    }
  }
}

// CLI interface
const args = process.argv.slice(2);
const runner = new ComprehensiveTestRunner();

if (args.length > 0) {
  const command = args[0];
  
  if (command === '--suite' && args[1]) {
    runner.runSpecificSuite(args[1]);
  } else if (command === '--help') {
    console.log('Comprehensive Test Runner for Social Dashboard Advanced Enhancements');
    console.log('');
    console.log('Usage:');
    console.log('  npm run test:comprehensive              # Run all test suites');
    console.log('  npm run test:comprehensive -- --suite unit    # Run specific suite');
    console.log('  npm run test:comprehensive -- --help          # Show this help');
    console.log('');
    console.log('Available test suites:');
    console.log('  • unit - Unit tests');
    console.log('  • integration - Integration tests');
    console.log('  • e2e - End-to-end tests');
    console.log('  • performance - Performance tests');
    console.log('  • accessibility - Accessibility tests');
    console.log('  • realtime - Real-time feature tests');
  } else {
    console.log('❌ Unknown command. Use --help for usage information.');
  }
} else {
  runner.runAllTests();
}

export default ComprehensiveTestRunner;