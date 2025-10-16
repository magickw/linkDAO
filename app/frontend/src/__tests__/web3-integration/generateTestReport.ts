/**
 * Test Report Generator for Web3 Native Community Enhancements
 * Generates comprehensive reports for integration and performance tests
 */

import { performance } from 'perf_hooks';

interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  coverage?: number;
}

interface PerformanceMetrics {
  averageRenderTime: number;
  memoryUsage: number;
  cacheHitRatio: number;
  networkLatency: number;
}

interface Web3Metrics {
  blockchainConnections: number;
  transactionSuccess: number;
  gasEstimationAccuracy: number;
  walletConnections: number;
}

interface TestReport {
  timestamp: string;
  environment: {
    nodeVersion: string;
    testFramework: string;
    web3Provider: string;
  };
  summary: TestMetrics;
  performance: PerformanceMetrics;
  web3: Web3Metrics;
  suites: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    tests: TestMetrics;
    errors?: string[];
  }>;
  recommendations: string[];
}

export class Web3TestReportGenerator {
  private startTime: number;
  private testResults: any[] = [];
  
  constructor() {
    this.startTime = performance.now();
  }

  addTestResult(suiteName: string, result: any): void {
    this.testResults.push({
      suite: suiteName,
      ...result,
      timestamp: new Date().toISOString(),
    });
  }

  generateReport(): TestReport {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;

    const summary = this.calculateSummaryMetrics();
    const performance = this.calculatePerformanceMetrics();
    const web3 = this.calculateWeb3Metrics();
    const suites = this.generateSuiteReports();
    const recommendations = this.generateRecommendations();

    return {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        testFramework: 'Jest',
        web3Provider: process.env.WEB3_TEST_MOCK_BLOCKCHAIN === 'true' ? 'Mock' : 'Hardhat',
      },
      summary: {
        ...summary,
        duration: totalDuration,
      },
      performance,
      web3,
      suites,
      recommendations,
    };
  }

  private calculateSummaryMetrics(): TestMetrics {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const failedTests = this.testResults.filter(r => r.status === 'failed').length;
    const skippedTests = this.testResults.filter(r => r.status === 'skipped').length;

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      duration: 0, // Will be set by caller
    };
  }

  private calculatePerformanceMetrics(): PerformanceMetrics {
    // Extract performance data from test results
    const performanceTests = this.testResults.filter(r => 
      r.suite.includes('Performance') || r.type === 'performance'
    );

    const renderTimes = performanceTests
      .map(t => t.renderTime)
      .filter(t => t !== undefined);

    const memoryUsages = performanceTests
      .map(t => t.memoryUsage)
      .filter(t => t !== undefined);

    return {
      averageRenderTime: renderTimes.length > 0 
        ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
        : 0,
      memoryUsage: memoryUsages.length > 0
        ? Math.max(...memoryUsages)
        : 0,
      cacheHitRatio: this.calculateCacheHitRatio(),
      networkLatency: this.calculateAverageNetworkLatency(),
    };
  }

  private calculateWeb3Metrics(): Web3Metrics {
    const web3Tests = this.testResults.filter(r => 
      r.suite.includes('Web3') || r.suite.includes('Blockchain')
    );

    const successfulConnections = web3Tests.filter(t => 
      t.blockchainConnection === 'success'
    ).length;

    const successfulTransactions = web3Tests.filter(t => 
      t.transactionStatus === 'success'
    ).length;

    return {
      blockchainConnections: successfulConnections,
      transactionSuccess: successfulTransactions,
      gasEstimationAccuracy: this.calculateGasEstimationAccuracy(),
      walletConnections: this.calculateWalletConnectionSuccess(),
    };
  }

  private generateSuiteReports(): Array<any> {
    const suiteGroups = this.groupTestsBySuite();
    
    return Object.entries(suiteGroups).map(([suiteName, tests]) => {
      const passedTests = tests.filter(t => t.status === 'passed').length;
      const failedTests = tests.filter(t => t.status === 'failed').length;
      const skippedTests = tests.filter(t => t.status === 'skipped').length;
      const totalDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0);
      
      const errors = tests
        .filter(t => t.status === 'failed')
        .map(t => t.error)
        .filter(e => e);

      return {
        name: suiteName,
        status: failedTests > 0 ? 'failed' : passedTests > 0 ? 'passed' : 'skipped',
        duration: totalDuration,
        tests: {
          totalTests: tests.length,
          passedTests,
          failedTests,
          skippedTests,
          duration: totalDuration,
        },
        errors: errors.length > 0 ? errors : undefined,
      };
    });
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.calculateSummaryMetrics();
    const performance = this.calculatePerformanceMetrics();

    // Test coverage recommendations
    if (summary.failedTests > 0) {
      recommendations.push(
        `${summary.failedTests} test(s) failed. Review and fix failing tests before deployment.`
      );
    }

    // Performance recommendations
    if (performance.averageRenderTime > 100) {
      recommendations.push(
        `Average render time (${performance.averageRenderTime.toFixed(2)}ms) exceeds 100ms threshold. Consider optimizing component rendering.`
      );
    }

    if (performance.cacheHitRatio < 0.8) {
      recommendations.push(
        `Cache hit ratio (${(performance.cacheHitRatio * 100).toFixed(1)}%) is below 80%. Improve caching strategy for better performance.`
      );
    }

    // Web3 recommendations
    const web3 = this.calculateWeb3Metrics();
    if (web3.transactionSuccess < web3.blockchainConnections * 0.9) {
      recommendations.push(
        'Transaction success rate is below 90%. Review error handling and retry mechanisms.'
      );
    }

    // General recommendations
    if (summary.totalTests < 50) {
      recommendations.push(
        'Consider adding more comprehensive test coverage for better reliability.'
      );
    }

    return recommendations;
  }

  private groupTestsBySuite(): Record<string, any[]> {
    return this.testResults.reduce((groups, test) => {
      const suite = test.suite || 'Unknown';
      if (!groups[suite]) {
        groups[suite] = [];
      }
      groups[suite].push(test);
      return groups;
    }, {} as Record<string, any[]>);
  }

  private calculateCacheHitRatio(): number {
    const cacheTests = this.testResults.filter(r => r.cacheHits !== undefined);
    if (cacheTests.length === 0) return 0;

    const totalHits = cacheTests.reduce((sum, t) => sum + (t.cacheHits || 0), 0);
    const totalMisses = cacheTests.reduce((sum, t) => sum + (t.cacheMisses || 0), 0);
    
    return totalHits / (totalHits + totalMisses) || 0;
  }

  private calculateAverageNetworkLatency(): number {
    const networkTests = this.testResults.filter(r => r.networkLatency !== undefined);
    if (networkTests.length === 0) return 0;

    const totalLatency = networkTests.reduce((sum, t) => sum + (t.networkLatency || 0), 0);
    return totalLatency / networkTests.length;
  }

  private calculateGasEstimationAccuracy(): number {
    const gasTests = this.testResults.filter(r => r.gasEstimation !== undefined);
    if (gasTests.length === 0) return 0;

    const accurateEstimations = gasTests.filter(t => 
      Math.abs(t.gasEstimation - t.actualGasUsed) / t.actualGasUsed < 0.1
    ).length;

    return accurateEstimations / gasTests.length;
  }

  private calculateWalletConnectionSuccess(): number {
    const walletTests = this.testResults.filter(r => r.walletConnection !== undefined);
    if (walletTests.length === 0) return 0;

    const successfulConnections = walletTests.filter(t => 
      t.walletConnection === 'success'
    ).length;

    return successfulConnections / walletTests.length;
  }

  async saveReport(filePath: string): Promise<void> {
    const report = this.generateReport();
    
    try {
      const fs = await import('fs/promises');
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      console.log(`📄 Test report saved to: ${filePath}`);
    } catch (error) {
      console.error('❌ Failed to save test report:', error);
    }
  }

  printSummary(): void {
    const report = this.generateReport();
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 WEB3 NATIVE COMMUNITY ENHANCEMENTS TEST SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\n📈 OVERALL RESULTS:`);
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.passedTests} ✅`);
    console.log(`   Failed: ${report.summary.failedTests} ${report.summary.failedTests > 0 ? '❌' : '✅'}`);
    console.log(`   Skipped: ${report.summary.skippedTests}`);
    console.log(`   Duration: ${report.summary.duration.toFixed(2)}ms`);
    
    console.log(`\n⚡ PERFORMANCE METRICS:`);
    console.log(`   Average Render Time: ${report.performance.averageRenderTime.toFixed(2)}ms`);
    console.log(`   Cache Hit Ratio: ${(report.performance.cacheHitRatio * 100).toFixed(1)}%`);
    console.log(`   Network Latency: ${report.performance.networkLatency.toFixed(2)}ms`);
    
    console.log(`\n🔗 WEB3 METRICS:`);
    console.log(`   Blockchain Connections: ${report.web3.blockchainConnections}`);
    console.log(`   Transaction Success: ${report.web3.transactionSuccess}`);
    console.log(`   Gas Estimation Accuracy: ${(report.web3.gasEstimationAccuracy * 100).toFixed(1)}%`);
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

// Export for use in tests
export default Web3TestReportGenerator;

// Simple test to make Jest happy
describe('Web3 Test Report Generator', () => {
  test('should create report generator instance', () => {
    const generator = new Web3TestReportGenerator();
    expect(generator).toBeDefined();
  });

  test('should generate empty report', () => {
    const generator = new Web3TestReportGenerator();
    
    // Mock performance.now to avoid initialization issues
    const originalPerformanceNow = performance.now;
    performance.now = jest.fn().mockReturnValue(1000);
    
    const report = generator.generateReport();
    
    expect(report).toBeDefined();
    expect(report.timestamp).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.performance).toBeDefined();
    expect(report.web3).toBeDefined();
    expect(report.suites).toEqual([]);
    expect(report.recommendations).toBeDefined();
    
    // Restore original function
    performance.now = originalPerformanceNow;
  });
});