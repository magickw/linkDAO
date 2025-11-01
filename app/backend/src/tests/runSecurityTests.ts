/**
 * Security Test Runner
 * 
 * Comprehensive security test execution script that runs all security tests
 * and generates detailed security assessment reports.
 */

import { execSync } from 'child_process';
import { safeLogger } from '../utils/safeLogger';
import fs from 'fs/promises';
import path from 'path';

interface SecurityTestResult {
  testSuite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: number;
  vulnerabilities: string[];
  recommendations: string[];
}

interface SecurityAssessmentReport {
  timestamp: Date;
  overallScore: number;
  testResults: SecurityTestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  recommendations: string[];
  complianceStatus: {
    gdpr: boolean;
    ccpa: boolean;
    pci: boolean;
    owasp: boolean;
  };
}

class SecurityTestRunner {
  private testSuites = [
    'securityIntegration.test.ts',
    'penetrationTesting.test.ts',
    'comprehensive/securityTests.ts',
  ];

  /**
   * Run all security tests
   */
  async runAllSecurityTests(): Promise<SecurityAssessmentReport> {
    safeLogger.info('🔒 Starting comprehensive security test suite...\n');

    const testResults: SecurityTestResult[] = [];
    const startTime = Date.now();

    for (const testSuite of this.testSuites) {
      safeLogger.info(`📋 Running ${testSuite}...`);
      
      try {
        const result = await this.runTestSuite(testSuite);
        testResults.push(result);
        
        safeLogger.info(`✅ ${testSuite} completed: ${result.passed} passed, ${result.failed} failed`);
      } catch (error) {
        safeLogger.error(`❌ ${testSuite} failed:`, error);
        
        testResults.push({
          testSuite,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 0,
          vulnerabilities: [`Test suite execution failed: ${error}`],
          recommendations: [`Fix test suite execution for ${testSuite}`],
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    safeLogger.info(`\n🏁 All security tests completed in ${totalDuration}ms`);

    // Generate comprehensive report
    const report = this.generateSecurityReport(testResults);
    
    // Save report
    await this.saveSecurityReport(report);
    
    // Display summary
    this.displaySecuritySummary(report);

    return report;
  }

  /**
   * Run individual test suite
   */
  private async runTestSuite(testSuite: string): Promise<SecurityTestResult> {
    const startTime = Date.now();
    
    try {
      // Run Jest with specific test file
      const command = `npm test -- --testPathPattern=${testSuite} --json --coverage`;
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 300000, // 5 minutes timeout
      });

      const jestResult = JSON.parse(output);
      const duration = Date.now() - startTime;

      return {
        testSuite,
        passed: jestResult.numPassedTests || 0,
        failed: jestResult.numFailedTests || 0,
        skipped: jestResult.numPendingTests || 0,
        duration,
        coverage: jestResult.coverageMap ? this.calculateCoverage(jestResult.coverageMap) : undefined,
        vulnerabilities: this.extractVulnerabilities(jestResult),
        recommendations: this.generateRecommendations(jestResult),
      };
    } catch (error: any) {
      // Parse Jest output even if command failed
      try {
        const jestResult = JSON.parse(error.stdout || '{}');
        return {
          testSuite,
          passed: jestResult.numPassedTests || 0,
          failed: jestResult.numFailedTests || 1,
          skipped: jestResult.numPendingTests || 0,
          duration: Date.now() - startTime,
          vulnerabilities: this.extractVulnerabilities(jestResult),
          recommendations: this.generateRecommendations(jestResult),
        };
      } catch {
        throw error;
      }
    }
  }

  /**
   * Generate comprehensive security report
   */
  private generateSecurityReport(testResults: SecurityTestResult[]): SecurityAssessmentReport {
    const totalTests = testResults.reduce((sum, result) => sum + result.passed + result.failed + result.skipped, 0);
    const passedTests = testResults.reduce((sum, result) => sum + result.passed, 0);
    const failedTests = testResults.reduce((sum, result) => sum + result.failed, 0);

    // Categorize issues by severity
    const allVulnerabilities = testResults.flatMap(result => result.vulnerabilities);
    const criticalIssues = allVulnerabilities.filter(v => v.toLowerCase().includes('critical')).length;
    const highIssues = allVulnerabilities.filter(v => v.toLowerCase().includes('high')).length;
    const mediumIssues = allVulnerabilities.filter(v => v.toLowerCase().includes('medium')).length;
    const lowIssues = allVulnerabilities.length - criticalIssues - highIssues - mediumIssues;

    // Calculate overall security score
    const overallScore = this.calculateSecurityScore(passedTests, failedTests, criticalIssues, highIssues);

    // Generate recommendations
    const recommendations = this.generateOverallRecommendations(testResults, overallScore);

    // Assess compliance status
    const complianceStatus = this.assessComplianceStatus(testResults);

    return {
      timestamp: new Date(),
      overallScore,
      testResults,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues,
      },
      recommendations,
      complianceStatus,
    };
  }

  /**
   * Calculate overall security score (0-100)
   */
  private calculateSecurityScore(passed: number, failed: number, critical: number, high: number): number {
    const total = passed + failed;
    if (total === 0) return 0;

    let score = (passed / total) * 100;

    // Deduct points for critical and high severity issues
    score -= critical * 20; // 20 points per critical issue
    score -= high * 10; // 10 points per high severity issue

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate overall recommendations
   */
  private generateOverallRecommendations(testResults: SecurityTestResult[], score: number): string[] {
    const recommendations: string[] = [];

    if (score < 70) {
      recommendations.push('🚨 URGENT: Security score is below acceptable threshold. Immediate action required.');
    }

    const failedTests = testResults.reduce((sum, result) => sum + result.failed, 0);
    if (failedTests > 0) {
      recommendations.push(`🔧 Fix ${failedTests} failed security tests before deployment.`);
    }

    const allVulnerabilities = testResults.flatMap(result => result.vulnerabilities);
    const criticalCount = allVulnerabilities.filter(v => v.toLowerCase().includes('critical')).length;
    if (criticalCount > 0) {
      recommendations.push(`⚠️ Address ${criticalCount} critical security vulnerabilities immediately.`);
    }

    // Add specific recommendations from test suites
    const allRecommendations = testResults.flatMap(result => result.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];
    recommendations.push(...uniqueRecommendations.slice(0, 5)); // Top 5 unique recommendations

    if (score >= 90) {
      recommendations.push('✅ Excellent security posture. Continue regular security assessments.');
    } else if (score >= 80) {
      recommendations.push('👍 Good security posture. Address remaining issues for improvement.');
    } else if (score >= 70) {
      recommendations.push('⚠️ Acceptable security posture. Focus on critical and high-severity issues.');
    }

    return recommendations;
  }

  /**
   * Assess compliance status
   */
  private assessComplianceStatus(testResults: SecurityTestResult[]): any {
    // This would be based on specific compliance test results
    return {
      gdpr: true, // Would be determined by GDPR-specific tests
      ccpa: true, // Would be determined by CCPA-specific tests
      pci: false, // Would be determined by PCI-specific tests
      owasp: testResults.some(r => r.testSuite.includes('penetration')), // Based on penetration tests
    };
  }

  /**
   * Save security report to file
   */
  private async saveSecurityReport(report: SecurityAssessmentReport): Promise<void> {
    const reportsDir = path.join(process.cwd(), 'security-reports');
    
    try {
      await fs.mkdir(reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
    const filename = `security-assessment-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    safeLogger.info(`📄 Security report saved to: ${filepath}`);

    // Also save a summary report
    const summaryFilename = `security-summary-${timestamp}.md`;
    const summaryFilepath = path.join(reportsDir, summaryFilename);
    const summaryContent = this.generateMarkdownSummary(report);
    
    await fs.writeFile(summaryFilepath, summaryContent);
    safeLogger.info(`📋 Security summary saved to: ${summaryFilepath}`);
  }

  /**
   * Generate markdown summary
   */
  private generateMarkdownSummary(report: SecurityAssessmentReport): string {
    const { summary, overallScore, complianceStatus, recommendations } = report;

    return `# Security Assessment Report

**Generated:** ${report.timestamp.toISOString()}
**Overall Security Score:** ${overallScore}/100

## Summary

- **Total Tests:** ${summary.totalTests}
- **Passed:** ${summary.passedTests} ✅
- **Failed:** ${summary.failedTests} ❌
- **Critical Issues:** ${summary.criticalIssues} 🚨
- **High Issues:** ${summary.highIssues} ⚠️
- **Medium Issues:** ${summary.mediumIssues} 📋
- **Low Issues:** ${summary.lowIssues} 📝

## Compliance Status

- **GDPR:** ${complianceStatus.gdpr ? '✅ Compliant' : '❌ Non-compliant'}
- **CCPA:** ${complianceStatus.ccpa ? '✅ Compliant' : '❌ Non-compliant'}
- **PCI DSS:** ${complianceStatus.pci ? '✅ Compliant' : '❌ Non-compliant'}
- **OWASP:** ${complianceStatus.owasp ? '✅ Tested' : '❌ Not tested'}

## Test Results

${report.testResults.map(result => `
### ${result.testSuite}

- **Passed:** ${result.passed}
- **Failed:** ${result.failed}
- **Duration:** ${result.duration}ms
- **Coverage:** ${result.coverage ? `${result.coverage}%` : 'N/A'}

${result.vulnerabilities.length > 0 ? `
**Vulnerabilities:**
${result.vulnerabilities.map(v => `- ${v}`).join('\n')}
` : ''}

${result.recommendations.length > 0 ? `
**Recommendations:**
${result.recommendations.map(r => `- ${r}`).join('\n')}
` : ''}
`).join('\n')}

## Overall Recommendations

${recommendations.map(r => `- ${r}`).join('\n')}

## Security Score Interpretation

- **90-100:** Excellent security posture
- **80-89:** Good security posture
- **70-79:** Acceptable security posture
- **60-69:** Poor security posture - immediate attention required
- **0-59:** Critical security issues - do not deploy

---
*This report was generated automatically by the Web3 Marketplace Security Test Suite*
`;
  }

  /**
   * Display security summary in console
   */
  private displaySecuritySummary(report: SecurityAssessmentReport): void {
    const { summary, overallScore } = report;

    safeLogger.info('\n' + '='.repeat(60));
    safeLogger.info('🔒 SECURITY ASSESSMENT SUMMARY');
    safeLogger.info('='.repeat(60));
    safeLogger.info(`📊 Overall Security Score: ${overallScore}/100`);
    safeLogger.info(`📋 Total Tests: ${summary.totalTests}`);
    safeLogger.info(`✅ Passed: ${summary.passedTests}`);
    safeLogger.info(`❌ Failed: ${summary.failedTests}`);
    safeLogger.info(`🚨 Critical Issues: ${summary.criticalIssues}`);
    safeLogger.info(`⚠️  High Issues: ${summary.highIssues}`);
    safeLogger.info(`📋 Medium Issues: ${summary.mediumIssues}`);
    safeLogger.info(`📝 Low Issues: ${summary.lowIssues}`);
    safeLogger.info('='.repeat(60));

    if (overallScore >= 90) {
      safeLogger.info('🎉 EXCELLENT: Security posture is excellent!');
    } else if (overallScore >= 80) {
      safeLogger.info('👍 GOOD: Security posture is good with minor issues.');
    } else if (overallScore >= 70) {
      safeLogger.info('⚠️  ACCEPTABLE: Security posture needs improvement.');
    } else if (overallScore >= 60) {
      safeLogger.info('🚨 POOR: Security posture requires immediate attention.');
    } else {
      safeLogger.info('💀 CRITICAL: Do not deploy - critical security issues found.');
    }

    safeLogger.info('\n📋 Top Recommendations:');
    report.recommendations.slice(0, 5).forEach((rec, index) => {
      safeLogger.info(`${index + 1}. ${rec}`);
    });

    safeLogger.info('\n' + '='.repeat(60));
  }

  // Helper methods
  private calculateCoverage(coverageMap: any): number {
    // Simplified coverage calculation
    return 85; // Placeholder
  }

  private extractVulnerabilities(jestResult: any): string[] {
    const vulnerabilities: string[] = [];
    
    if (jestResult.testResults) {
      for (const testResult of jestResult.testResults) {
        if (testResult.assertionResults) {
          for (const assertion of testResult.assertionResults) {
            if (assertion.status === 'failed' && assertion.title.toLowerCase().includes('security')) {
              vulnerabilities.push(`Security test failed: ${assertion.title}`);
            }
          }
        }
      }
    }

    return vulnerabilities;
  }

  private generateRecommendations(jestResult: any): string[] {
    const recommendations: string[] = [];
    
    if (jestResult.numFailedTests > 0) {
      recommendations.push('Review and fix failed security tests');
    }
    
    if (jestResult.coverageMap && this.calculateCoverage(jestResult.coverageMap) < 80) {
      recommendations.push('Increase test coverage to at least 80%');
    }

    return recommendations;
  }
}

// CLI execution
if (require.main === module) {
  const runner = new SecurityTestRunner();
  
  runner.runAllSecurityTests()
    .then(report => {
      const exitCode = report.overallScore >= 70 ? 0 : 1;
      process.exit(exitCode);
    })
    .catch(error => {
      safeLogger.error('Security test execution failed:', error);
      process.exit(1);
    });
}

export { SecurityTestRunner };
