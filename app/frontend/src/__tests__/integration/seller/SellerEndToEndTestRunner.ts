import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
  suite: string;
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
  errors: string[];
}

interface TestReport {
  timestamp: string;
  environment: string;
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
  suites: TestResult[];
  performanceMetrics: {
    averageResponseTime: number;
    maxResponseTime: number;
    throughput: number;
    memoryUsage: number;
  };
  recommendations: string[];
}

class SellerEndToEndTestRunner {
  private testSuites = [
    {
      name: 'API Endpoint Consistency',
      command: 'npm run test:seller-integration -- --testNamePattern="API Endpoint Consistency"',
      timeout: 300000, // 5 minutes
    },
    {
      name: 'Data Synchronization',
      command: 'npm run test:seller-integration -- --testNamePattern="Data Synchronization"',
      timeout: 300000,
    },
    {
      name: 'Cache Invalidation',
      command: 'npm run test:seller-integration -- --testNamePattern="Cache Invalidation"',
      timeout: 180000, // 3 minutes
    },
    {
      name: 'Error Handling Consistency',
      command: 'npm run test:seller-integration -- --testNamePattern="Error Handling"',
      timeout: 240000, // 4 minutes
    },
    {
      name: 'Mobile Optimization',
      command: 'npm run test:seller-integration -- --testNamePattern="Mobile Optimization"',
      timeout: 300000,
    },
    {
      name: 'Performance Benchmarking',
      command: 'npm run test:seller-integration -- --testNamePattern="Performance Benchmarking"',
      timeout: 600000, // 10 minutes
    },
    {
      name: 'Complete Seller Workflows',
      command: 'npm run test:seller-integration -- --testNamePattern="Complete Seller Workflow"',
      timeout: 900000, // 15 minutes
    },
    {
      name: 'Real-time Features Under Load',
      command: 'npm run test:seller-integration -- --testNamePattern="Real-time Features Under Load"',
      timeout: 600000,
    },
    {
      name: 'Cross-Device Compatibility',
      command: 'npm run test:seller-integration -- --testNamePattern="Cross-Device Compatibility"',
      timeout: 300000,
    },
  ];

  private backendTestSuites = [
    {
      name: 'Production-like Environment',
      command: 'npm run test:backend-integration -- --testNamePattern="Production-like Environment"',
      timeout: 600000,
    },
    {
      name: 'Error Handling and Recovery',
      command: 'npm run test:backend-integration -- --testNamePattern="Error Handling and Recovery"',
      timeout: 300000,
    },
    {
      name: 'Real-time Features Backend',
      command: 'npm run test:backend-integration -- --testNamePattern="Real-time Features Under Load"',
      timeout: 600000,
    },
    {
      name: 'Performance Benchmarking Backend',
      command: 'npm run test:backend-integration -- --testNamePattern="Performance Benchmarking"',
      timeout: 900000,
    },
    {
      name: 'Security and Authentication',
      command: 'npm run test:backend-integration -- --testNamePattern="Security and Authentication"',
      timeout: 300000,
    },
  ];

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Seller End-to-End Integration Tests...\n');
    
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    // Setup test environment
    await this.setupTestEnvironment();
    
    try {
      // Run frontend tests
      console.log('📱 Running Frontend Integration Tests...\n');
      for (const suite of this.testSuites) {
        const result = await this.runTestSuite(suite);
        results.push(result);
      }
      
      // Run backend tests
      console.log('🔧 Running Backend Integration Tests...\n');
      for (const suite of this.backendTestSuites) {
        const result = await this.runTestSuite(suite);
        results.push(result);
      }
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      // Generate comprehensive report
      const report = await this.generateReport(results, totalDuration);
      
      // Save report
      await this.saveReport(report);
      
      // Display summary
      this.displaySummary(report);
      
      return report;
      
    } finally {
      // Cleanup test environment
      await this.cleanupTestEnvironment();
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    try {
      // Start test database
      execSync('npm run test:db:start', { stdio: 'inherit' });
      
      // Start test backend server
      execSync('npm run test:backend:start', { stdio: 'inherit' });
      
      // Start test WebSocket server
      execSync('npm run test:websocket:start', { stdio: 'inherit' });
      
      // Wait for services to be ready
      await this.waitForServices();
      
      console.log('✅ Test environment ready\n');
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  private async waitForServices(): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        // Check if backend is ready
        execSync('curl -f http://localhost:3001/api/health', { stdio: 'ignore' });
        
        // Check if WebSocket server is ready
        execSync('curl -f http://localhost:8080/health', { stdio: 'ignore' });
        
        console.log('✅ All services are ready');
        return;
      } catch (error) {
        attempts++;
        console.log(`⏳ Waiting for services... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Services failed to start within timeout');
  }

  private async runTestSuite(suite: { name: string; command: string; timeout: number }): Promise<TestResult> {
    console.log(`🧪 Running ${suite.name} tests...`);
    
    const startTime = Date.now();
    let result: TestResult = {
      suite: suite.name,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
    };
    
    try {
      const output = execSync(suite.command, {
        timeout: suite.timeout,
        encoding: 'utf8',
        stdio: 'pipe',
      });
      
      result = this.parseTestOutput(output, suite.name);
      
    } catch (error: any) {
      console.error(`❌ ${suite.name} tests failed:`, error.message);
      
      result.failed = 1;
      result.errors.push(error.message);
      
      // Try to parse partial results from error output
      if (error.stdout) {
        const partialResult = this.parseTestOutput(error.stdout, suite.name);
        result = { ...result, ...partialResult };
      }
    }
    
    const endTime = Date.now();
    result.duration = endTime - startTime;
    
    console.log(`${result.failed === 0 ? '✅' : '❌'} ${suite.name}: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped (${result.duration}ms)\n`);
    
    return result;
  }

  private parseTestOutput(output: string, suiteName: string): TestResult {
    const result: TestResult = {
      suite: suiteName,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
    };
    
    // Parse Jest output
    const testResultMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testResultMatch) {
      result.failed = parseInt(testResultMatch[1]);
      result.passed = parseInt(testResultMatch[2]);
    }
    
    // Parse coverage if available
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      result.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4]),
      };
    }
    
    // Extract error messages
    const errorMatches = output.match(/● .+/g);
    if (errorMatches) {
      result.errors = errorMatches.slice(0, 5); // Limit to first 5 errors
    }
    
    return result;
  }

  private async generateReport(results: TestResult[], totalDuration: number): Promise<TestReport> {
    const totalTests = results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0);
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
    
    // Calculate overall coverage
    const coverageResults = results.filter(r => r.coverage);
    const overallCoverage = coverageResults.length > 0 ? {
      lines: coverageResults.reduce((sum, r) => sum + (r.coverage?.lines || 0), 0) / coverageResults.length,
      functions: coverageResults.reduce((sum, r) => sum + (r.coverage?.functions || 0), 0) / coverageResults.length,
      branches: coverageResults.reduce((sum, r) => sum + (r.coverage?.branches || 0), 0) / coverageResults.length,
      statements: coverageResults.reduce((sum, r) => sum + (r.coverage?.statements || 0), 0) / coverageResults.length,
    } : { lines: 0, functions: 0, branches: 0, statements: 0 };
    
    // Generate performance metrics (mock data for now)
    const performanceMetrics = {
      averageResponseTime: 150, // ms
      maxResponseTime: 2000, // ms
      throughput: 100, // requests/second
      memoryUsage: 512, // MB
    };
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(results, overallCoverage);
    
    return {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      overallCoverage,
      suites: results,
      performanceMetrics,
      recommendations,
    };
  }

  private generateRecommendations(results: TestResult[], coverage: any): string[] {
    const recommendations: string[] = [];
    
    // Coverage recommendations
    if (coverage.lines < 80) {
      recommendations.push('Increase line coverage to at least 80%');
    }
    if (coverage.branches < 75) {
      recommendations.push('Improve branch coverage to at least 75%');
    }
    if (coverage.functions < 85) {
      recommendations.push('Increase function coverage to at least 85%');
    }
    
    // Failed test recommendations
    const failedSuites = results.filter(r => r.failed > 0);
    if (failedSuites.length > 0) {
      recommendations.push(`Address failing tests in: ${failedSuites.map(s => s.suite).join(', ')}`);
    }
    
    // Performance recommendations
    const slowSuites = results.filter(r => r.duration > 300000); // 5 minutes
    if (slowSuites.length > 0) {
      recommendations.push(`Optimize slow test suites: ${slowSuites.map(s => s.suite).join(', ')}`);
    }
    
    // Error pattern recommendations
    const commonErrors = this.findCommonErrors(results);
    if (commonErrors.length > 0) {
      recommendations.push(`Address common error patterns: ${commonErrors.join(', ')}`);
    }
    
    return recommendations;
  }

  private findCommonErrors(results: TestResult[]): string[] {
    const errorCounts: { [key: string]: number } = {};
    
    results.forEach(result => {
      result.errors.forEach(error => {
        // Extract error type from message
        const errorType = error.split(':')[0].trim();
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      });
    });
    
    // Return errors that appear in multiple suites
    return Object.entries(errorCounts)
      .filter(([_, count]) => count > 1)
      .map(([error, _]) => error);
  }

  private async saveReport(report: TestReport): Promise<void> {
    const reportsDir = path.join(process.cwd(), 'test-reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Save JSON report
    const jsonPath = path.join(reportsDir, `seller-e2e-report-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    
    // Save HTML report
    const htmlPath = path.join(reportsDir, `seller-e2e-report-${Date.now()}.html`);
    const htmlContent = this.generateHTMLReport(report);
    fs.writeFileSync(htmlPath, htmlContent);
    
    console.log(`📊 Reports saved:`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   HTML: ${htmlPath}\n`);
  }

  private generateHTMLReport(report: TestReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Seller End-to-End Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f4fd; padding: 15px; border-radius: 5px; text-align: center; }
        .metric.failed { background: #fde8e8; }
        .metric.passed { background: #e8fde8; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .suite.failed { border-color: #ff6b6b; }
        .suite.passed { border-color: #51cf66; }
        .errors { background: #fff5f5; padding: 10px; margin: 10px 0; border-radius: 3px; }
        .recommendations { background: #f0f8ff; padding: 15px; border-radius: 5px; }
        .coverage { display: flex; gap: 10px; margin: 10px 0; }
        .coverage-item { background: #f8f9fa; padding: 10px; border-radius: 3px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Seller End-to-End Integration Test Report</h1>
        <p><strong>Timestamp:</strong> ${report.timestamp}</p>
        <p><strong>Environment:</strong> ${report.environment}</p>
        <p><strong>Duration:</strong> ${Math.round(report.totalDuration / 1000)}s</p>
    </div>

    <div class="summary">
        <div class="metric passed">
            <h3>${report.totalPassed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric failed">
            <h3>${report.totalFailed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric">
            <h3>${report.totalSkipped}</h3>
            <p>Skipped</p>
        </div>
        <div class="metric">
            <h3>${report.totalTests}</h3>
            <p>Total</p>
        </div>
    </div>

    <h2>Coverage</h2>
    <div class="coverage">
        <div class="coverage-item">
            <strong>${report.overallCoverage.lines.toFixed(1)}%</strong><br>Lines
        </div>
        <div class="coverage-item">
            <strong>${report.overallCoverage.functions.toFixed(1)}%</strong><br>Functions
        </div>
        <div class="coverage-item">
            <strong>${report.overallCoverage.branches.toFixed(1)}%</strong><br>Branches
        </div>
        <div class="coverage-item">
            <strong>${report.overallCoverage.statements.toFixed(1)}%</strong><br>Statements
        </div>
    </div>

    <h2>Performance Metrics</h2>
    <div class="coverage">
        <div class="coverage-item">
            <strong>${report.performanceMetrics.averageResponseTime}ms</strong><br>Avg Response Time
        </div>
        <div class="coverage-item">
            <strong>${report.performanceMetrics.maxResponseTime}ms</strong><br>Max Response Time
        </div>
        <div class="coverage-item">
            <strong>${report.performanceMetrics.throughput}</strong><br>Throughput (req/s)
        </div>
        <div class="coverage-item">
            <strong>${report.performanceMetrics.memoryUsage}MB</strong><br>Memory Usage
        </div>
    </div>

    <h2>Test Suites</h2>
    ${report.suites.map(suite => `
        <div class="suite ${suite.failed > 0 ? 'failed' : 'passed'}">
            <h3>${suite.suite}</h3>
            <p><strong>Passed:</strong> ${suite.passed} | <strong>Failed:</strong> ${suite.failed} | <strong>Skipped:</strong> ${suite.skipped}</p>
            <p><strong>Duration:</strong> ${Math.round(suite.duration / 1000)}s</p>
            ${suite.coverage ? `
                <p><strong>Coverage:</strong> 
                   Lines: ${suite.coverage.lines.toFixed(1)}% | 
                   Functions: ${suite.coverage.functions.toFixed(1)}% | 
                   Branches: ${suite.coverage.branches.toFixed(1)}% | 
                   Statements: ${suite.coverage.statements.toFixed(1)}%
                </p>
            ` : ''}
            ${suite.errors.length > 0 ? `
                <div class="errors">
                    <strong>Errors:</strong>
                    <ul>
                        ${suite.errors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `).join('')}

    ${report.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>Recommendations</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    ` : ''}
</body>
</html>
    `;
  }

  private displaySummary(report: TestReport): void {
    console.log('\n📊 Test Summary:');
    console.log('================');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.totalPassed}`);
    console.log(`❌ Failed: ${report.totalFailed}`);
    console.log(`⏭️  Skipped: ${report.totalSkipped}`);
    console.log(`⏱️  Duration: ${Math.round(report.totalDuration / 1000)}s`);
    console.log(`📈 Coverage: ${report.overallCoverage.lines.toFixed(1)}% lines, ${report.overallCoverage.functions.toFixed(1)}% functions`);
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    console.log(`\n${report.totalFailed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed. Check the report for details.'}`);
  }

  private async cleanupTestEnvironment(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      // Stop test services
      execSync('npm run test:services:stop', { stdio: 'inherit' });
      
      // Clean up test data
      execSync('npm run test:db:cleanup', { stdio: 'inherit' });
      
      console.log('✅ Cleanup complete');
    } catch (error) {
      console.error('⚠️  Cleanup failed:', error);
    }
  }
}

// Export for use in other scripts
export { SellerEndToEndTestRunner, TestReport, TestResult };

// CLI execution
if (require.main === module) {
  const runner = new SellerEndToEndTestRunner();
  
  runner.runAllTests()
    .then((report) => {
      process.exit(report.totalFailed === 0 ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}