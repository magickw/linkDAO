#!/usr/bin/env node

/**
 * Security and Compliance Test Runner
 * Orchestrates comprehensive security and compliance testing
 */

import { execSync } from 'child_process';
import { safeLogger } from '../utils/safeLogger';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  coverage?: number;
}

interface SecurityTestReport {
  timestamp: Date;
  environment: string;
  results: TestResult[];
  summary: {
    total_tests: number;
    passed: number;
    failed: number;
    coverage: number;
    duration: number;
  };
  recommendations: string[];
}

class SecurityComplianceTestRunner {
  private testSuites = [
    {
      name: 'Security Monitoring and Alerting',
      file: 'security-monitoring-alerting.test.ts',
      timeout: 60000
    },
    {
      name: 'Compliance Workflow Testing',
      file: 'compliance-workflow-testing.test.ts',
      timeout: 90000
    },
    {
      name: 'Security Integration Tests',
      file: 'security-compliance-integration.test.ts',
      timeout: 120000
    },
    {
      name: 'Penetration Testing',
      file: 'penetration-testing-ldao.test.ts',
      timeout: 180000
    },
    {
      name: 'Vulnerability Assessment',
      file: 'vulnerability-assessment.test.ts',
      timeout: 120000
    }
  ];

  async runAllTests(): Promise<SecurityTestReport> {
    safeLogger.info('🔒 Starting Security and Compliance Test Suite...\n');
    
    const startTime = Date.now();
    const results: TestResult[] = [];
    const environment = process.env.NODE_ENV || 'test';

    for (const suite of this.testSuites) {
      safeLogger.info(`📋 Running ${suite.name}...`);
      
      try {
        const result = await this.runTestSuite(suite);
        results.push(result);
        
        if (result.failed > 0) {
          safeLogger.info(`❌ ${suite.name}: ${result.failed} tests failed`);
        } else {
          safeLogger.info(`✅ ${suite.name}: All ${result.passed} tests passed`);
        }
      } catch (error) {
        safeLogger.error(`💥 ${suite.name}: Test suite failed to run`);
        safeLogger.error(error);
        
        results.push({
          suite: suite.name,
          passed: 0,
          failed: 1,
          duration: 0
        });
      }
      
      safeLogger.info('');
    }

    const totalDuration = Date.now() - startTime;
    const summary = this.calculateSummary(results, totalDuration);
    const recommendations = this.generateRecommendations(results);

    const report: SecurityTestReport = {
      timestamp: new Date(),
      environment,
      results,
      summary,
      recommendations
    };

    await this.generateReport(report);
    this.printSummary(report);

    return report;
  }

  private async runTestSuite(suite: { name: string; file: string; timeout: number }): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Run Jest with specific test file
      const command = `npx jest ${suite.file} --verbose --coverage --testTimeout=${suite.timeout}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      const duration = Date.now() - startTime;
      
      // Parse Jest output to extract test results
      const passed = this.extractTestCount(output, 'passed');
      const failed = this.extractTestCount(output, 'failed');
      const coverage = this.extractCoverage(output);

      return {
        suite: suite.name,
        passed,
        failed,
        duration,
        coverage
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Jest exits with non-zero code on test failures
      if (error.stdout) {
        const passed = this.extractTestCount(error.stdout, 'passed');
        const failed = this.extractTestCount(error.stdout, 'failed');
        const coverage = this.extractCoverage(error.stdout);

        return {
          suite: suite.name,
          passed,
          failed,
          duration,
          coverage
        };
      }
      
      throw error;
    }
  }

  private extractTestCount(output: string, type: 'passed' | 'failed'): number {
    const regex = type === 'passed' 
      ? /(\d+) passed/
      : /(\d+) failed/;
    
    const match = output.match(regex);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractCoverage(output: string): number {
    const coverageRegex = /All files\s+\|\s+([\d.]+)/;
    const match = output.match(coverageRegex);
    return match ? parseFloat(match[1]) : 0;
  }

  private calculateSummary(results: TestResult[], duration: number) {
    const total_tests = results.reduce((sum, r) => sum + r.passed + r.failed, 0);
    const passed = results.reduce((sum, r) => sum + r.passed, 0);
    const failed = results.reduce((sum, r) => sum + r.failed, 0);
    const coverage = results.length > 0 
      ? results.reduce((sum, r) => sum + (r.coverage || 0), 0) / results.length
      : 0;

    return {
      total_tests,
      passed,
      failed,
      coverage,
      duration
    };
  }

  private generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];

    // Check for failed tests
    const failedSuites = results.filter(r => r.failed > 0);
    if (failedSuites.length > 0) {
      recommendations.push(
        `🚨 ${failedSuites.length} test suite(s) have failures that need immediate attention`
      );
    }

    // Check coverage
    const lowCoverageSuites = results.filter(r => (r.coverage || 0) < 80);
    if (lowCoverageSuites.length > 0) {
      recommendations.push(
        `📊 ${lowCoverageSuites.length} test suite(s) have coverage below 80% - consider adding more tests`
      );
    }

    // Check performance
    const slowSuites = results.filter(r => r.duration > 60000);
    if (slowSuites.length > 0) {
      recommendations.push(
        `⏱️ ${slowSuites.length} test suite(s) are running slowly - consider optimization`
      );
    }

    // Security-specific recommendations
    if (results.some(r => r.suite.includes('Penetration') && r.failed > 0)) {
      recommendations.push(
        '🔐 Penetration testing failures detected - review security vulnerabilities immediately'
      );
    }

    if (results.some(r => r.suite.includes('Compliance') && r.failed > 0)) {
      recommendations.push(
        '📋 Compliance testing failures detected - ensure regulatory requirements are met'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✨ All security and compliance tests are passing - excellent work!');
    }

    return recommendations;
  }

  private async generateReport(report: SecurityTestReport): Promise<void> {
    const reportDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `security-compliance-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Also generate a human-readable HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = path.join(reportDir, `security-compliance-${timestamp}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    safeLogger.info(`📄 Reports generated:`);
    safeLogger.info(`   JSON: ${reportPath}`);
    safeLogger.info(`   HTML: ${htmlPath}`);
  }

  private generateHtmlReport(report: SecurityTestReport): string {
    const passRate = (report.summary.passed / report.summary.total_tests * 100).toFixed(1);
    const statusColor = report.summary.failed === 0 ? '#28a745' : '#dc3545';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Security & Compliance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: ${statusColor}; color: white; padding: 20px; border-radius: 5px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0; color: #495057; }
        .metric .value { font-size: 2em; font-weight: bold; color: ${statusColor}; }
        .results { margin: 20px 0; }
        .suite { background: white; border: 1px solid #dee2e6; margin: 10px 0; border-radius: 5px; }
        .suite-header { background: #e9ecef; padding: 15px; font-weight: bold; }
        .suite-details { padding: 15px; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; }
        .recommendations ul { margin: 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Security & Compliance Test Report</h1>
        <p>Generated: ${report.timestamp.toLocaleString()}</p>
        <p>Environment: ${report.environment}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div class="value">${report.summary.total_tests}</div>
        </div>
        <div class="metric">
            <h3>Pass Rate</h3>
            <div class="value">${passRate}%</div>
        </div>
        <div class="metric">
            <h3>Coverage</h3>
            <div class="value">${report.summary.coverage.toFixed(1)}%</div>
        </div>
        <div class="metric">
            <h3>Duration</h3>
            <div class="value">${(report.summary.duration / 1000).toFixed(1)}s</div>
        </div>
    </div>

    <div class="results">
        <h2>Test Results</h2>
        ${report.results.map(result => `
            <div class="suite">
                <div class="suite-header">
                    ${result.failed === 0 ? '✅' : '❌'} ${result.suite}
                </div>
                <div class="suite-details">
                    <p><strong>Passed:</strong> ${result.passed} | <strong>Failed:</strong> ${result.failed}</p>
                    <p><strong>Duration:</strong> ${(result.duration / 1000).toFixed(1)}s</p>
                    ${result.coverage ? `<p><strong>Coverage:</strong> ${result.coverage.toFixed(1)}%</p>` : ''}
                </div>
            </div>
        `).join('')}
    </div>

    <div class="recommendations">
        <h2>📋 Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
</body>
</html>`;
  }

  private printSummary(report: SecurityTestReport): void {
    safeLogger.info('\n' + '='.repeat(60));
    safeLogger.info('🔒 SECURITY & COMPLIANCE TEST SUMMARY');
    safeLogger.info('='.repeat(60));
    
    const { summary } = report;
    const passRate = (summary.passed / summary.total_tests * 100).toFixed(1);
    
    safeLogger.info(`📊 Total Tests: ${summary.total_tests}`);
    safeLogger.info(`✅ Passed: ${summary.passed}`);
    safeLogger.info(`❌ Failed: ${summary.failed}`);
    safeLogger.info(`📈 Pass Rate: ${passRate}%`);
    safeLogger.info(`🎯 Coverage: ${summary.coverage.toFixed(1)}%`);
    safeLogger.info(`⏱️ Duration: ${(summary.duration / 1000).toFixed(1)}s`);
    
    safeLogger.info('\n📋 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      safeLogger.info(`   ${rec}`);
    });
    
    safeLogger.info('\n' + '='.repeat(60));
    
    if (summary.failed === 0) {
      safeLogger.info('🎉 All security and compliance tests passed!');
    } else {
      safeLogger.info('⚠️ Some tests failed - please review and fix issues');
      process.exit(1);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new SecurityComplianceTestRunner();
  runner.runAllTests().catch(error => {
    safeLogger.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

export { SecurityComplianceTestRunner };
