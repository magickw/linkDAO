#!/usr/bin/env node

/**
 * Test Report Generator
 * 
 * Generates comprehensive test reports from various test outputs
 */

const fs = require('fs/promises');
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.reportData = {
      timestamp: new Date().toISOString(),
      summary: {},
      coverage: {},
      testResults: {},
      performance: {},
      security: {},
      quality: {}
    };
  }

  async generateReport() {
    console.log('📊 Generating comprehensive test report...');
    
    try {
      await this.collectCoverageData();
      await this.collectTestResults();
      await this.collectPerformanceData();
      await this.collectSecurityData();
      await this.calculateQualityMetrics();
      await this.generateHTMLReport();
      await this.generateJSONReport();
      await this.generateMarkdownReport();
      
      console.log('✅ Test report generation completed');
    } catch (error) {
      console.error('❌ Test report generation failed:', error);
      throw error;
    }
  }

  async collectCoverageData() {
    console.log('📈 Collecting coverage data...');
    
    try {
      // Collect backend coverage
      const backendCoveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (await this.fileExists(backendCoveragePath)) {
        const backendCoverage = JSON.parse(await fs.readFile(backendCoveragePath, 'utf8'));
        this.reportData.coverage.backend = {
          lines: backendCoverage.total.lines.pct,
          functions: backendCoverage.total.functions.pct,
          branches: backendCoverage.total.branches.pct,
          statements: backendCoverage.total.statements.pct
        };
      }
      
      // Collect frontend coverage
      const frontendCoveragePath = path.join(process.cwd(), '..', 'frontend', 'coverage', 'coverage-summary.json');
      if (await this.fileExists(frontendCoveragePath)) {
        const frontendCoverage = JSON.parse(await fs.readFile(frontendCoveragePath, 'utf8'));
        this.reportData.coverage.frontend = {
          lines: frontendCoverage.total.lines.pct,
          functions: frontendCoverage.total.functions.pct,
          branches: frontendCoverage.total.branches.pct,
          statements: frontendCoverage.total.statements.pct
        };
      }
      
      // Collect smart contract coverage
      const contractCoveragePath = path.join(process.cwd(), '..', 'contracts', 'coverage', 'coverage-summary.json');
      if (await this.fileExists(contractCoveragePath)) {
        const contractCoverage = JSON.parse(await fs.readFile(contractCoveragePath, 'utf8'));
        this.reportData.coverage.contracts = {
          lines: contractCoverage.total.lines.pct,
          functions: contractCoverage.total.functions.pct,
          branches: contractCoverage.total.branches.pct,
          statements: contractCoverage.total.statements.pct
        };
      }
      
      // Calculate overall coverage
      const coverageTypes = Object.values(this.reportData.coverage);
      if (coverageTypes.length > 0) {
        const avgLines = coverageTypes.reduce((sum, c) => sum + (c.lines || 0), 0) / coverageTypes.length;
        const avgFunctions = coverageTypes.reduce((sum, c) => sum + (c.functions || 0), 0) / coverageTypes.length;
        const avgBranches = coverageTypes.reduce((sum, c) => sum + (c.branches || 0), 0) / coverageTypes.length;
        const avgStatements = coverageTypes.reduce((sum, c) => sum + (c.statements || 0), 0) / coverageTypes.length;
        
        this.reportData.coverage.overall = {
          lines: Math.round(avgLines * 100) / 100,
          functions: Math.round(avgFunctions * 100) / 100,
          branches: Math.round(avgBranches * 100) / 100,
          statements: Math.round(avgStatements * 100) / 100
        };
      }
      
      console.log('  ✅ Coverage data collected');
    } catch (error) {
      console.error('  ❌ Failed to collect coverage data:', error);
    }
  }

  async collectTestResults() {
    console.log('🧪 Collecting test results...');
    
    try {
      // Collect Jest test results
      const jestResultsPath = path.join(process.cwd(), 'test-results', 'jest-results.json');
      if (await this.fileExists(jestResultsPath)) {
        const jestResults = JSON.parse(await fs.readFile(jestResultsPath, 'utf8'));
        this.reportData.testResults.jest = {
          numTotalTests: jestResults.numTotalTests,
          numPassedTests: jestResults.numPassedTests,
          numFailedTests: jestResults.numFailedTests,
          numPendingTests: jestResults.numPendingTests,
          testSuites: jestResults.testResults.map(suite => ({
            name: suite.name,
            status: suite.status,
            duration: suite.perfStats?.runtime || 0,
            tests: suite.assertionResults?.length || 0
          }))
        };
      }
      
      // Collect comprehensive test results
      const comprehensiveResultsDir = path.join(process.cwd(), 'test-reports');
      if (await this.directoryExists(comprehensiveResultsDir)) {
        const files = await fs.readdir(comprehensiveResultsDir);
        const latestReport = files
          .filter(f => f.startsWith('execution-report-'))
          .sort()
          .pop();
        
        if (latestReport) {
          const reportPath = path.join(comprehensiveResultsDir, latestReport);
          const comprehensiveResults = JSON.parse(await fs.readFile(reportPath, 'utf8'));
          this.reportData.testResults.comprehensive = comprehensiveResults;
        }
      }
      
      console.log('  ✅ Test results collected');
    } catch (error) {
      console.error('  ❌ Failed to collect test results:', error);
    }
  }

  async collectPerformanceData() {
    console.log('⚡ Collecting performance data...');
    
    try {
      // Collect performance test results
      const perfResultsPath = path.join(process.cwd(), 'test-reports', 'performance-report.json');
      if (await this.fileExists(perfResultsPath)) {
        const perfResults = JSON.parse(await fs.readFile(perfResultsPath, 'utf8'));
        this.reportData.performance = perfResults;
      }
      
      // Collect load test results
      const loadTestPath = path.join(process.cwd(), 'load-tests', 'results.json');
      if (await this.fileExists(loadTestPath)) {
        const loadResults = JSON.parse(await fs.readFile(loadTestPath, 'utf8'));
        this.reportData.performance.loadTest = loadResults;
      }
      
      console.log('  ✅ Performance data collected');
    } catch (error) {
      console.error('  ❌ Failed to collect performance data:', error);
    }
  }

  async collectSecurityData() {
    console.log('🔒 Collecting security data...');
    
    try {
      // Collect security test results
      const securityResultsPath = path.join(process.cwd(), 'test-reports', 'security-report.json');
      if (await this.fileExists(securityResultsPath)) {
        const securityResults = JSON.parse(await fs.readFile(securityResultsPath, 'utf8'));
        this.reportData.security = securityResults;
      }
      
      // Collect audit results
      const auditResultsPath = path.join(process.cwd(), 'audit-results.json');
      if (await this.fileExists(auditResultsPath)) {
        const auditResults = JSON.parse(await fs.readFile(auditResultsPath, 'utf8'));
        this.reportData.security.audit = auditResults;
      }
      
      console.log('  ✅ Security data collected');
    } catch (error) {
      console.error('  ❌ Failed to collect security data:', error);
    }
  }

  async calculateQualityMetrics() {
    console.log('📏 Calculating quality metrics...');
    
    try {
      const quality = this.reportData.quality;
      
      // Calculate test pass rate
      if (this.reportData.testResults.jest) {
        const jest = this.reportData.testResults.jest;
        quality.testPassRate = jest.numTotalTests > 0 
          ? Math.round((jest.numPassedTests / jest.numTotalTests) * 100 * 100) / 100
          : 0;
      }
      
      // Calculate coverage score
      if (this.reportData.coverage.overall) {
        const coverage = this.reportData.coverage.overall;
        quality.coverageScore = Math.round(
          (coverage.lines + coverage.functions + coverage.branches + coverage.statements) / 4 * 100
        ) / 100;
      }
      
      // Calculate security score
      if (this.reportData.security.securityScore) {
        quality.securityScore = this.reportData.security.securityScore;
      }
      
      // Calculate performance score
      if (this.reportData.performance.highLoad) {
        const perf = this.reportData.performance.highLoad;
        let perfScore = 100;
        
        if (perf.responseTime > 3000) perfScore -= 20;
        if (perf.errorRate > 0.01) perfScore -= 30;
        if (perf.concurrentUsers < 500) perfScore -= 10;
        
        quality.performanceScore = Math.max(0, perfScore);
      }
      
      // Calculate overall quality score
      const scores = [
        quality.testPassRate || 0,
        quality.coverageScore || 0,
        quality.securityScore || 0,
        quality.performanceScore || 0
      ].filter(score => score > 0);
      
      if (scores.length > 0) {
        quality.overallScore = Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length * 100
        ) / 100;
      }
      
      // Determine quality grade
      if (quality.overallScore >= 90) quality.grade = 'A';
      else if (quality.overallScore >= 80) quality.grade = 'B';
      else if (quality.overallScore >= 70) quality.grade = 'C';
      else if (quality.overallScore >= 60) quality.grade = 'D';
      else quality.grade = 'F';
      
      console.log('  ✅ Quality metrics calculated');
    } catch (error) {
      console.error('  ❌ Failed to calculate quality metrics:', error);
    }
  }

  async generateHTMLReport() {
    console.log('🌐 Generating HTML report...');
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web3 Marketplace - Comprehensive Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        .section {
            margin-bottom: 40px;
        }
        .section h2 {
            color: #333;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .coverage-bar {
            background: #e9ecef;
            border-radius: 10px;
            height: 20px;
            margin: 10px 0;
            overflow: hidden;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s ease;
        }
        .test-suite {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
            border-left: 4px solid #28a745;
        }
        .test-suite.failed {
            border-left-color: #dc3545;
        }
        .grade {
            display: inline-block;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            color: white;
            font-size: 1.5em;
            font-weight: bold;
            line-height: 60px;
            text-align: center;
            margin: 0 10px;
        }
        .grade-A { background: #28a745; }
        .grade-B { background: #17a2b8; }
        .grade-C { background: #ffc107; color: #333; }
        .grade-D { background: #fd7e14; }
        .grade-F { background: #dc3545; }
        .recommendations {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .recommendations h3 {
            color: #856404;
            margin-top: 0;
        }
        .recommendations ul {
            margin-bottom: 0;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #dee2e6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Web3 Marketplace</h1>
            <p>Comprehensive Test Report - ${new Date(this.reportData.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="content">
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${this.reportData.quality.overallScore || 'N/A'}</div>
                    <div class="metric-label">Overall Quality Score</div>
                    <div class="grade grade-${this.reportData.quality.grade || 'F'}">${this.reportData.quality.grade || 'F'}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.reportData.coverage.overall?.lines || 'N/A'}%</div>
                    <div class="metric-label">Code Coverage</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.reportData.quality.testPassRate || 'N/A'}%</div>
                    <div class="metric-label">Test Pass Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.reportData.quality.securityScore || 'N/A'}</div>
                    <div class="metric-label">Security Score</div>
                </div>
            </div>
            
            <div class="section">
                <h2>📊 Coverage Report</h2>
                ${this.generateCoverageHTML()}
            </div>
            
            <div class="section">
                <h2>🧪 Test Results</h2>
                ${this.generateTestResultsHTML()}
            </div>
            
            <div class="section">
                <h2>⚡ Performance Metrics</h2>
                ${this.generatePerformanceHTML()}
            </div>
            
            <div class="section">
                <h2>🔒 Security Analysis</h2>
                ${this.generateSecurityHTML()}
            </div>
            
            ${this.generateRecommendationsHTML()}
        </div>
        
        <div class="footer">
            <p>Generated by Web3 Marketplace Test Suite</p>
        </div>
    </div>
</body>
</html>
    `;
    
    const reportPath = path.join(process.cwd(), 'test-reports', 'comprehensive-report.html');
    await fs.writeFile(reportPath, html);
    console.log(`  ✅ HTML report saved to: ${reportPath}`);
  }

  generateCoverageHTML() {
    if (!this.reportData.coverage.overall) {
      return '<p>No coverage data available</p>';
    }
    
    const coverage = this.reportData.coverage;
    return `
      <div class="coverage-section">
        <h3>Overall Coverage: ${coverage.overall.lines}%</h3>
        <div class="coverage-bar">
          <div class="coverage-fill" style="width: ${coverage.overall.lines}%"></div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
          ${Object.entries(coverage).filter(([key]) => key !== 'overall').map(([type, data]) => `
            <div>
              <h4>${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
              <p>Lines: ${data.lines}%</p>
              <p>Functions: ${data.functions}%</p>
              <p>Branches: ${data.branches}%</p>
              <p>Statements: ${data.statements}%</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  generateTestResultsHTML() {
    if (!this.reportData.testResults.jest) {
      return '<p>No test results available</p>';
    }
    
    const jest = this.reportData.testResults.jest;
    return `
      <div class="test-results">
        <p><strong>Total Tests:</strong> ${jest.numTotalTests}</p>
        <p><strong>Passed:</strong> ${jest.numPassedTests}</p>
        <p><strong>Failed:</strong> ${jest.numFailedTests}</p>
        <p><strong>Pending:</strong> ${jest.numPendingTests}</p>
        
        <h3>Test Suites</h3>
        ${jest.testSuites.map(suite => `
          <div class="test-suite ${suite.status === 'failed' ? 'failed' : ''}">
            <strong>${path.basename(suite.name)}</strong>
            <span style="float: right;">${suite.status} (${suite.duration}ms)</span>
            <br>
            <small>${suite.tests} tests</small>
          </div>
        `).join('')}
      </div>
    `;
  }

  generatePerformanceHTML() {
    if (!this.reportData.performance.highLoad) {
      return '<p>No performance data available</p>';
    }
    
    const perf = this.reportData.performance.highLoad;
    return `
      <div class="performance-metrics">
        <p><strong>Concurrent Users:</strong> ${perf.concurrentUsers}</p>
        <p><strong>Response Time:</strong> ${perf.responseTime}ms</p>
        <p><strong>Error Rate:</strong> ${(perf.errorRate * 100).toFixed(2)}%</p>
        <p><strong>Throughput:</strong> ${perf.throughputMbps} Mbps</p>
      </div>
    `;
  }

  generateSecurityHTML() {
    if (!this.reportData.security.securityScore) {
      return '<p>No security data available</p>';
    }
    
    return `
      <div class="security-analysis">
        <p><strong>Security Score:</strong> ${this.reportData.security.securityScore}</p>
        <p><strong>Vulnerabilities Found:</strong> ${this.reportData.security.vulnerabilitiesFound || 0}</p>
        <p><strong>Critical Issues:</strong> ${this.reportData.security.criticalIssues || 0}</p>
      </div>
    `;
  }

  generateRecommendationsHTML() {
    const recommendations = this.reportData.testResults.comprehensive?.recommendations || [];
    
    if (recommendations.length === 0) {
      return '';
    }
    
    return `
      <div class="recommendations">
        <h3>💡 Recommendations</h3>
        <ul>
          ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  async generateJSONReport() {
    console.log('📄 Generating JSON report...');
    
    const reportPath = path.join(process.cwd(), 'test-reports', 'comprehensive-report.json');
    await fs.writeFile(reportPath, JSON.stringify(this.reportData, null, 2));
    console.log(`  ✅ JSON report saved to: ${reportPath}`);
  }

  async generateMarkdownReport() {
    console.log('📝 Generating Markdown report...');
    
    const markdown = `# Web3 Marketplace - Test Report

Generated: ${new Date(this.reportData.timestamp).toLocaleString()}

## Summary

- **Overall Quality Score:** ${this.reportData.quality.overallScore || 'N/A'} (Grade: ${this.reportData.quality.grade || 'F'})
- **Code Coverage:** ${this.reportData.coverage.overall?.lines || 'N/A'}%
- **Test Pass Rate:** ${this.reportData.quality.testPassRate || 'N/A'}%
- **Security Score:** ${this.reportData.quality.securityScore || 'N/A'}

## Coverage Report

${this.reportData.coverage.overall ? `
| Component | Lines | Functions | Branches | Statements |
|-----------|-------|-----------|----------|------------|
| Overall | ${this.reportData.coverage.overall.lines}% | ${this.reportData.coverage.overall.functions}% | ${this.reportData.coverage.overall.branches}% | ${this.reportData.coverage.overall.statements}% |
${Object.entries(this.reportData.coverage).filter(([key]) => key !== 'overall').map(([type, data]) => 
  `| ${type.charAt(0).toUpperCase() + type.slice(1)} | ${data.lines}% | ${data.functions}% | ${data.branches}% | ${data.statements}% |`
).join('\n')}
` : 'No coverage data available'}

## Test Results

${this.reportData.testResults.jest ? `
- **Total Tests:** ${this.reportData.testResults.jest.numTotalTests}
- **Passed:** ${this.reportData.testResults.jest.numPassedTests}
- **Failed:** ${this.reportData.testResults.jest.numFailedTests}
- **Pending:** ${this.reportData.testResults.jest.numPendingTests}
` : 'No test results available'}

## Performance Metrics

${this.reportData.performance.highLoad ? `
- **Concurrent Users:** ${this.reportData.performance.highLoad.concurrentUsers}
- **Response Time:** ${this.reportData.performance.highLoad.responseTime}ms
- **Error Rate:** ${(this.reportData.performance.highLoad.errorRate * 100).toFixed(2)}%
- **Throughput:** ${this.reportData.performance.highLoad.throughputMbps} Mbps
` : 'No performance data available'}

## Security Analysis

${this.reportData.security.securityScore ? `
- **Security Score:** ${this.reportData.security.securityScore}
- **Vulnerabilities Found:** ${this.reportData.security.vulnerabilitiesFound || 0}
- **Critical Issues:** ${this.reportData.security.criticalIssues || 0}
` : 'No security data available'}

## Recommendations

${(this.reportData.testResults.comprehensive?.recommendations || []).map(rec => `- ${rec}`).join('\n') || 'No recommendations available'}

---
*Report generated by Web3 Marketplace Test Suite*
`;
    
    const reportPath = path.join(process.cwd(), 'test-reports', 'comprehensive-report.md');
    await fs.writeFile(reportPath, markdown);
    console.log(`  ✅ Markdown report saved to: ${reportPath}`);
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}

// Run report generation if called directly
if (require.main === module) {
  const generator = new TestReportGenerator();
  
  generator.generateReport()
    .then(() => {
      console.log('✅ Test report generation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test report generation failed:', error);
      process.exit(1);
    });
}

module.exports = TestReportGenerator;