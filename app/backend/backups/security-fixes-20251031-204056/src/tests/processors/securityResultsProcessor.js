/**
 * Security Test Results Processor
 * Processes and analyzes security test results for compliance and reporting
 */

const fs = require('fs');
const path = require('path');

class SecurityResultsProcessor {
  constructor() {
    this.securityMetrics = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      securityCoverage: 0,
      criticalFailures: [],
      complianceStatus: {},
      vulnerabilityFindings: [],
      recommendations: []
    };
  }

  process(results) {
    console.log('\n🔒 Processing Security Test Results...\n');
    
    this.analyzeTestResults(results);
    this.assessSecurityCoverage(results);
    this.identifyCriticalFailures(results);
    this.generateComplianceReport(results);
    this.generateRecommendations();
    this.saveSecurityReport();
    
    return results;
  }

  analyzeTestResults(results) {
    this.securityMetrics.totalTests = results.numTotalTests;
    this.securityMetrics.passedTests = results.numPassedTests;
    this.securityMetrics.failedTests = results.numFailedTests;
    this.securityMetrics.skippedTests = results.numPendingTests;
    
    console.log(`📊 Test Summary:`);
    console.log(`   Total: ${this.securityMetrics.totalTests}`);
    console.log(`   Passed: ${this.securityMetrics.passedTests}`);
    console.log(`   Failed: ${this.securityMetrics.failedTests}`);
    console.log(`   Skipped: ${this.securityMetrics.skippedTests}`);
  }

  assessSecurityCoverage(results) {
    // Calculate security-specific coverage
    if (results.coverageMap) {
      const securityFiles = Object.keys(results.coverageMap).filter(file => 
        file.includes('security') || 
        file.includes('kyc') || 
        file.includes('compliance') ||
        file.includes('vulnerability')
      );
      
      if (securityFiles.length > 0) {
        let totalLines = 0;
        let coveredLines = 0;
        
        securityFiles.forEach(file => {
          const coverage = results.coverageMap[file];
          if (coverage && coverage.s) {
            totalLines += Object.keys(coverage.s).length;
            coveredLines += Object.values(coverage.s).filter(count => count > 0).length;
          }
        });
        
        this.securityMetrics.securityCoverage = totalLines > 0 ? 
          Math.round((coveredLines / totalLines) * 100) : 0;
      }
    }
    
    console.log(`🎯 Security Coverage: ${this.securityMetrics.securityCoverage}%`);
  }

  identifyCriticalFailures(results) {
    if (results.testResults) {
      results.testResults.forEach(testFile => {
        if (testFile.assertionResults) {
          testFile.assertionResults.forEach(test => {
            if (test.status === 'failed') {
              const isCritical = this.isCriticalSecurityTest(test.title, test.failureMessages);
              
              if (isCritical) {
                this.securityMetrics.criticalFailures.push({
                  testName: test.title,
                  testFile: testFile.testFilePath,
                  failureMessage: test.failureMessages[0],
                  severity: this.assessFailureSeverity(test.title, test.failureMessages)
                });
              }
            }
          });
        }
      });
    }
    
    if (this.securityMetrics.criticalFailures.length > 0) {
      console.log(`🚨 Critical Security Failures: ${this.securityMetrics.criticalFailures.length}`);
      this.securityMetrics.criticalFailures.forEach(failure => {
        console.log(`   ❌ ${failure.testName} (${failure.severity})`);
      });
    }
  }

  isCriticalSecurityTest(testTitle, failureMessages) {
    const criticalKeywords = [
      'authentication',
      'authorization',
      'encryption',
      'vulnerability',
      'injection',
      'xss',
      'csrf',
      'compliance',
      'kyc',
      'aml',
      'data breach',
      'security incident'
    ];
    
    const testTitleLower = testTitle.toLowerCase();
    const failureText = failureMessages.join(' ').toLowerCase();
    
    return criticalKeywords.some(keyword => 
      testTitleLower.includes(keyword) || failureText.includes(keyword)
    );
  }

  assessFailureSeverity(testTitle, failureMessages) {
    const highSeverityKeywords = ['critical', 'breach', 'compromise', 'exploit'];
    const mediumSeverityKeywords = ['vulnerability', 'exposure', 'weakness'];
    
    const text = (testTitle + ' ' + failureMessages.join(' ')).toLowerCase();
    
    if (highSeverityKeywords.some(keyword => text.includes(keyword))) {
      return 'HIGH';
    } else if (mediumSeverityKeywords.some(keyword => text.includes(keyword))) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  generateComplianceReport(results) {
    // Analyze compliance test results
    const complianceTests = {
      kyc: { passed: 0, failed: 0, total: 0 },
      aml: { passed: 0, failed: 0, total: 0 },
      gdpr: { passed: 0, failed: 0, total: 0 },
      security: { passed: 0, failed: 0, total: 0 }
    };

    if (results.testResults) {
      results.testResults.forEach(testFile => {
        if (testFile.assertionResults) {
          testFile.assertionResults.forEach(test => {
            const testTitle = test.title.toLowerCase();
            
            Object.keys(complianceTests).forEach(category => {
              if (testTitle.includes(category)) {
                complianceTests[category].total++;
                if (test.status === 'passed') {
                  complianceTests[category].passed++;
                } else if (test.status === 'failed') {
                  complianceTests[category].failed++;
                }
              }
            });
          });
        }
      });
    }

    // Calculate compliance percentages
    Object.keys(complianceTests).forEach(category => {
      const tests = complianceTests[category];
      const percentage = tests.total > 0 ? 
        Math.round((tests.passed / tests.total) * 100) : 100;
      
      this.securityMetrics.complianceStatus[category] = {
        ...tests,
        percentage,
        status: percentage >= 95 ? 'COMPLIANT' : 
                percentage >= 80 ? 'PARTIALLY_COMPLIANT' : 'NON_COMPLIANT'
      };
    });

    console.log(`📋 Compliance Status:`);
    Object.entries(this.securityMetrics.complianceStatus).forEach(([category, status]) => {
      const icon = status.status === 'COMPLIANT' ? '✅' : 
                   status.status === 'PARTIALLY_COMPLIANT' ? '⚠️' : '❌';
      console.log(`   ${icon} ${category.toUpperCase()}: ${status.percentage}% (${status.status})`);
    });
  }

  generateRecommendations() {
    const recommendations = [];

    // Coverage recommendations
    if (this.securityMetrics.securityCoverage < 90) {
      recommendations.push({
        type: 'COVERAGE',
        priority: 'HIGH',
        message: `Security test coverage is ${this.securityMetrics.securityCoverage}% - increase to 90%+`
      });
    }

    // Critical failure recommendations
    if (this.securityMetrics.criticalFailures.length > 0) {
      recommendations.push({
        type: 'CRITICAL_FAILURES',
        priority: 'CRITICAL',
        message: `${this.securityMetrics.criticalFailures.length} critical security test failures require immediate attention`
      });
    }

    // Compliance recommendations
    Object.entries(this.securityMetrics.complianceStatus).forEach(([category, status]) => {
      if (status.status !== 'COMPLIANT') {
        recommendations.push({
          type: 'COMPLIANCE',
          priority: status.status === 'NON_COMPLIANT' ? 'HIGH' : 'MEDIUM',
          message: `${category.toUpperCase()} compliance at ${status.percentage}% - review failed tests`
        });
      }
    });

    // General security recommendations
    if (this.securityMetrics.failedTests > 0) {
      recommendations.push({
        type: 'GENERAL',
        priority: 'MEDIUM',
        message: 'Review and fix all failed security tests before deployment'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'SUCCESS',
        priority: 'INFO',
        message: 'All security and compliance tests are passing - excellent work!'
      });
    }

    this.securityMetrics.recommendations = recommendations;

    console.log(`\n💡 Security Recommendations:`);
    recommendations.forEach(rec => {
      const icon = rec.priority === 'CRITICAL' ? '🚨' :
                   rec.priority === 'HIGH' ? '⚠️' :
                   rec.priority === 'MEDIUM' ? '📋' : '✅';
      console.log(`   ${icon} ${rec.message}`);
    });
  }

  saveSecurityReport() {
    const reportDir = path.join(process.cwd(), 'test-reports', 'security');
    
    // Ensure directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `security-metrics-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.securityMetrics,
      summary: {
        overall_status: this.calculateOverallStatus(),
        security_score: this.calculateSecurityScore(),
        compliance_score: this.calculateComplianceScore()
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Security report saved: ${reportPath}`);
    console.log(`🔒 Overall Security Score: ${report.summary.security_score}/100`);
    console.log(`📋 Compliance Score: ${report.summary.compliance_score}/100`);
  }

  calculateOverallStatus() {
    if (this.securityMetrics.criticalFailures.length > 0) {
      return 'CRITICAL_ISSUES';
    }
    
    if (this.securityMetrics.failedTests > 0) {
      return 'ISSUES_FOUND';
    }
    
    if (this.securityMetrics.securityCoverage < 80) {
      return 'INSUFFICIENT_COVERAGE';
    }
    
    return 'SECURE';
  }

  calculateSecurityScore() {
    let score = 100;
    
    // Deduct for failed tests
    score -= (this.securityMetrics.failedTests * 5);
    
    // Deduct for critical failures
    score -= (this.securityMetrics.criticalFailures.length * 15);
    
    // Deduct for low coverage
    if (this.securityMetrics.securityCoverage < 90) {
      score -= (90 - this.securityMetrics.securityCoverage);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  calculateComplianceScore() {
    const complianceScores = Object.values(this.securityMetrics.complianceStatus)
      .map(status => status.percentage);
    
    if (complianceScores.length === 0) return 100;
    
    return Math.round(
      complianceScores.reduce((sum, score) => sum + score, 0) / complianceScores.length
    );
  }
}

// Export the processor function
module.exports = function(results) {
  const processor = new SecurityResultsProcessor();
  return processor.process(results);
};