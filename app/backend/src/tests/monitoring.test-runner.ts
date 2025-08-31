#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Monitoring System
 * 
 * This script runs all monitoring-related tests and generates a comprehensive report
 * covering performance, functionality, integration, and stress testing.
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

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
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  overallCoverage: number;
  suites: TestResult[];
  summary: {
    functionalTests: TestResult[];
    performanceTests: TestResult[];
    integrationTests: TestResult[];
    stressTests: TestResult[];
  };
  recommendations: string[];
}

class MonitoringTestRunner {
  private testSuites = [
    {
      name: 'Core Monitoring System',
      file: 'moderationMonitoring.test.ts',
      category: 'functional',
      description: 'Tests core monitoring functionality including metrics, logging, dashboard, alerting, and canary deployments'
    },
    {
      name: 'Performance Benchmarks',
      file: 'moderationMetrics.performance.test.ts',
      category: 'performance',
      description: 'Tests system performance under various load conditions and resource constraints'
    },
    {
      name: 'Alerting Integration',
      file: 'moderationAlerting.integration.test.ts',
      category: 'integration',
      description: 'Tests alert system integration with external services and notification channels'
    },
    {
      name: 'Advanced Canary Deployment',
      file: 'canaryDeployment.advanced.test.ts',
      category: 'integration',
      description: 'Tests advanced deployment strategies including A/B testing and rollback mechanisms'
    }
  ];

  private results: TestResult[] = [];

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Comprehensive Monitoring System Tests...\n');

    const startTime = Date.now();

    for (const suite of this.testSuites) {
      console.log(`📋 Running ${suite.name}...`);
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (result.failed > 0) {
        console.log(`❌ ${suite.name}: ${result.failed} failed tests`);
        result.errors.forEach(error => console.log(`   - ${error}`));
      } else {
        console.log(`✅ ${suite.name}: All ${result.passed} tests passed`);
      }
      console.log(`   Duration: ${result.duration}ms\n`);
    }

    const endTime = Date.now();
    const report = this.generateReport(endTime - startTime);
    
    await this.generateReportFile(report);
    this.printSummary(report);

    return report;
  }

  private async runTestSuite(suite: any): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const command = `npx vitest run ${suite.file} --reporter=json`;
      const output = execSync(command, { 
        cwd: join(__dirname),
        encoding: 'utf8',
        stdio: 'pipe'
      });

      const result = JSON.parse(output);
      const endTime = Date.now();

      return {
        suite: suite.name,
        passed: result.numPassedTests || 0,
        failed: result.numFailedTests || 0,
        skipped: result.numPendingTests || 0,
        duration: endTime - startTime,
        coverage: this.extractCoverage(output),
        errors: this.extractErrors(result)
      };

    } catch (error: any) {
      const endTime = Date.now();
      
      return {
        suite: suite.name,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: endTime - startTime,
        errors: [error.message || 'Unknown error occurred']
      };
    }
  }

  private extractCoverage(output: string): number {
    // Extract coverage percentage from test output
    const coverageMatch = output.match(/All files\s+\|\s+(\d+\.?\d*)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  }

  private extractErrors(result: any): string[] {
    const errors: string[] = [];
    
    if (result.testResults) {
      result.testResults.forEach((testFile: any) => {
        if (testFile.assertionResults) {
          testFile.assertionResults.forEach((test: any) => {
            if (test.status === 'failed') {
              errors.push(`${test.title}: ${test.failureMessages?.[0] || 'Unknown error'}`);
            }
          });
        }
      });
    }

    return errors;
  }

  private generateReport(totalDuration: number): TestReport {
    const totalTests = this.results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = this.results.reduce((sum, r) => sum + r.skipped, 0);
    
    const coverageValues = this.results.filter(r => r.coverage).map(r => r.coverage!);
    const overallCoverage = coverageValues.length > 0 
      ? coverageValues.reduce((sum, c) => sum + c, 0) / coverageValues.length 
      : 0;

    const functionalTests = this.results.filter((_, i) => 
      this.testSuites[i].category === 'functional'
    );
    const performanceTests = this.results.filter((_, i) => 
      this.testSuites[i].category === 'performance'
    );
    const integrationTests = this.results.filter((_, i) => 
      this.testSuites[i].category === 'integration'
    );
    const stressTests = this.results.filter((_, i) => 
      this.testSuites[i].category === 'stress'
    );

    return {
      timestamp: new Date().toISOString(),
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      overallCoverage,
      suites: this.results,
      summary: {
        functionalTests,
        performanceTests,
        integrationTests,
        stressTests
      },
      recommendations: this.generateRecommendations()
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const failedTests = this.results.filter(r => r.failed > 0);
    if (failedTests.length > 0) {
      recommendations.push('Address failing tests before deploying to production');
      recommendations.push('Review error logs for failed test suites');
    }

    const slowTests = this.results.filter(r => r.duration > 10000);
    if (slowTests.length > 0) {
      recommendations.push('Optimize slow-running test suites for better CI/CD performance');
    }

    const lowCoverageTests = this.results.filter(r => r.coverage && r.coverage < 80);
    if (lowCoverageTests.length > 0) {
      recommendations.push('Increase test coverage for better code quality assurance');
    }

    if (this.results.every(r => r.failed === 0)) {
      recommendations.push('All tests passing - monitoring system is ready for deployment');
      recommendations.push('Consider running load tests in staging environment');
    }

    return recommendations;
  }

  private async generateReportFile(report: TestReport): Promise<void> {
    const reportPath = join(__dirname, '..', '..', 'MONITORING_TEST_REPORT.md');
    
    const markdown = `# Monitoring System Test Report

Generated: ${report.timestamp}

## Summary

- **Total Tests**: ${report.totalTests}
- **Passed**: ${report.totalPassed} ✅
- **Failed**: ${report.totalFailed} ❌
- **Skipped**: ${report.totalSkipped} ⏭️
- **Duration**: ${(report.totalDuration / 1000).toFixed(2)}s
- **Coverage**: ${report.overallCoverage.toFixed(1)}%

## Test Suites

${report.suites.map(suite => `
### ${suite.suite}

- **Passed**: ${suite.passed}
- **Failed**: ${suite.failed}
- **Skipped**: ${suite.skipped}
- **Duration**: ${(suite.duration / 1000).toFixed(2)}s
- **Coverage**: ${suite.coverage ? suite.coverage.toFixed(1) + '%' : 'N/A'}

${suite.errors.length > 0 ? `
**Errors:**
${suite.errors.map(error => `- ${error}`).join('\n')}
` : ''}
`).join('')}

## Category Breakdown

### Functional Tests
${report.summary.functionalTests.map(test => 
  `- ${test.suite}: ${test.passed}/${test.passed + test.failed + test.skipped} passed`
).join('\n')}

### Performance Tests
${report.summary.performanceTests.map(test => 
  `- ${test.suite}: ${test.passed}/${test.passed + test.failed + test.skipped} passed`
).join('\n')}

### Integration Tests
${report.summary.integrationTests.map(test => 
  `- ${test.suite}: ${test.passed}/${test.passed + test.failed + test.skipped} passed`
).join('\n')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Test Coverage Details

The monitoring system tests cover:

1. **Metrics Collection**: System health, performance, business, and cost metrics
2. **Logging and Audit**: Structured logging, audit trails, and log analysis
3. **Dashboard Services**: Data aggregation, analytics, and visualization support
4. **Alerting System**: Rule management, threshold monitoring, and notifications
5. **Canary Deployments**: A/B testing, gradual rollouts, and automatic rollbacks
6. **Performance Monitoring**: Load testing, memory usage, and latency benchmarks
7. **Integration Testing**: End-to-end workflows and external service integration
8. **Error Handling**: Graceful degradation and recovery mechanisms

## Next Steps

1. Review any failing tests and address underlying issues
2. Ensure all monitoring services are properly configured
3. Validate alert thresholds and notification channels
4. Test canary deployment workflows in staging environment
5. Monitor system performance under production load
6. Set up continuous monitoring and alerting for the monitoring system itself

---

*This report was generated automatically by the monitoring system test runner.*
`;

    writeFileSync(reportPath, markdown);
    console.log(`📄 Test report generated: ${reportPath}`);
  }

  private printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MONITORING SYSTEM TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Results:`);
    console.log(`   Total Tests: ${report.totalTests}`);
    console.log(`   Passed: ${report.totalPassed} ✅`);
    console.log(`   Failed: ${report.totalFailed} ${report.totalFailed > 0 ? '❌' : '✅'}`);
    console.log(`   Skipped: ${report.totalSkipped} ⏭️`);
    console.log(`   Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Coverage: ${report.overallCoverage.toFixed(1)}%`);

    if (report.totalFailed === 0) {
      console.log('\n🎉 All tests passed! Monitoring system is ready for deployment.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix before deployment.');
    }

    console.log('\n🔍 Key Areas Tested:');
    console.log('   • Metrics collection and aggregation');
    console.log('   • Structured logging and audit trails');
    console.log('   • Dashboard data services');
    console.log('   • Alert rule management and notifications');
    console.log('   • Canary deployment workflows');
    console.log('   • Performance under load');
    console.log('   • Integration with external services');
    console.log('   • Error handling and recovery');

    console.log('\n📋 Recommendations:');
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    console.log('\n' + '='.repeat(60));
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new MonitoringTestRunner();
  runner.runAllTests()
    .then(report => {
      process.exit(report.totalFailed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export { MonitoringTestRunner };