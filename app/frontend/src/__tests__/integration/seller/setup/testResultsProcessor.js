const fs = require('fs');
const path = require('path');

class SellerTestResultsProcessor {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
  }

  onRunComplete(contexts, results) {
    const {
      numTotalTests,
      numPassedTests,
      numFailedTests,
      numPendingTests,
      testResults,
      startTime,
      success,
    } = results;

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Process test results
    const processedResults = {
      summary: {
        total: numTotalTests,
        passed: numPassedTests,
        failed: numFailedTests,
        pending: numPendingTests,
        success,
        duration,
        timestamp: new Date().toISOString(),
      },
      suites: this.processSuites(testResults),
      performance: this.extractPerformanceMetrics(testResults),
      coverage: this.processCoverage(results.coverageMap),
      recommendations: this.generateRecommendations(testResults),
    };

    // Save results to file
    this.saveResults(processedResults);

    // Generate HTML report
    this.generateHTMLReport(processedResults);

    // Log summary to console
    this.logSummary(processedResults);

    return results;
  }

  processSuites(testResults) {
    return testResults.map(suite => {
      const {
        testFilePath,
        numPassingTests,
        numFailingTests,
        numPendingTests,
        perfStats,
        testResults: tests,
        failureMessage,
      } = suite;

      return {
        name: this.extractSuiteName(testFilePath),
        path: testFilePath,
        passed: numPassingTests,
        failed: numFailingTests,
        pending: numPendingTests,
        duration: perfStats?.end - perfStats?.start || 0,
        tests: tests.map(test => ({
          title: test.title,
          status: test.status,
          duration: test.duration || 0,
          failureMessages: test.failureMessages,
        })),
        failureMessage,
      };
    });
  }

  extractSuiteName(filePath) {
    const fileName = path.basename(filePath, '.test.tsx');
    return fileName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  extractPerformanceMetrics(testResults) {
    const metrics = {
      averageTestDuration: 0,
      slowestTests: [],
      fastestTests: [],
      memoryUsage: this.getMemoryUsage(),
    };

    const allTests = testResults.flatMap(suite => 
      suite.testResults.map(test => ({
        ...test,
        suiteName: this.extractSuiteName(suite.testFilePath),
      }))
    );

    if (allTests.length > 0) {
      const totalDuration = allTests.reduce((sum, test) => sum + (test.duration || 0), 0);
      metrics.averageTestDuration = totalDuration / allTests.length;

      // Sort by duration
      const sortedTests = allTests
        .filter(test => test.duration > 0)
        .sort((a, b) => b.duration - a.duration);

      metrics.slowestTests = sortedTests.slice(0, 5).map(test => ({
        name: `${test.suiteName}: ${test.title}`,
        duration: test.duration,
      }));

      metrics.fastestTests = sortedTests.slice(-5).reverse().map(test => ({
        name: `${test.suiteName}: ${test.title}`,
        duration: test.duration,
      }));
    }

    return metrics;
  }

  processCoverage(coverageMap) {
    if (!coverageMap) return null;

    const summary = coverageMap.getCoverageSummary();
    return {
      lines: {
        total: summary.lines.total,
        covered: summary.lines.covered,
        percentage: summary.lines.pct,
      },
      functions: {
        total: summary.functions.total,
        covered: summary.functions.covered,
        percentage: summary.functions.pct,
      },
      branches: {
        total: summary.branches.total,
        covered: summary.branches.covered,
        percentage: summary.branches.pct,
      },
      statements: {
        total: summary.statements.total,
        covered: summary.statements.covered,
        percentage: summary.statements.pct,
      },
    };
  }

  generateRecommendations(testResults) {
    const recommendations = [];
    const failedSuites = testResults.filter(suite => suite.numFailingTests > 0);
    const slowSuites = testResults.filter(suite => {
      const duration = suite.perfStats?.end - suite.perfStats?.start || 0;
      return duration > 30000; // 30 seconds
    });

    if (failedSuites.length > 0) {
      recommendations.push({
        type: 'error',
        title: 'Failed Tests',
        description: `${failedSuites.length} test suite(s) have failing tests that need attention.`,
        action: 'Review and fix failing tests before deployment.',
      });
    }

    if (slowSuites.length > 0) {
      recommendations.push({
        type: 'performance',
        title: 'Slow Test Suites',
        description: `${slowSuites.length} test suite(s) are running slower than 30 seconds.`,
        action: 'Consider optimizing slow tests or breaking them into smaller units.',
      });
    }

    // Memory usage recommendations
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage.heapUsed > 512 * 1024 * 1024) { // 512MB
      recommendations.push({
        type: 'memory',
        title: 'High Memory Usage',
        description: `Test suite is using ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB of memory.`,
        action: 'Consider optimizing memory usage in tests and components.',
      });
    }

    return recommendations;
  }

  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return {
      rss: 0,
      heapTotal: 0,
      heapUsed: 0,
      external: 0,
      arrayBuffers: 0,
    };
  }

  saveResults(results) {
    const reportsDir = path.join(process.cwd(), 'test-reports');
    
    // Ensure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Save JSON results
    const jsonPath = path.join(reportsDir, `seller-integration-results-${Date.now()}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

    console.log(`📊 Test results saved to: ${jsonPath}`);
  }

  generateHTMLReport(results) {
    const htmlContent = this.generateHTMLContent(results);
    const reportsDir = path.join(process.cwd(), 'test-reports');
    const htmlPath = path.join(reportsDir, `seller-integration-report-${Date.now()}.html`);
    
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`📄 HTML report generated: ${htmlPath}`);
  }

  generateHTMLContent(results) {
    const { summary, suites, performance, coverage, recommendations } = results;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Seller Integration Test Report</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { margin: 0; font-size: 2.5em; font-weight: 300; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .summary { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            padding: 30px; 
            background: #f8f9fa; 
        }
        .metric { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
        .metric h3 { margin: 0 0 10px; color: #495057; font-size: 0.9em; text-transform: uppercase; }
        .metric .value { font-size: 2em; font-weight: bold; margin: 0; }
        .metric.passed .value { color: #28a745; }
        .metric.failed .value { color: #dc3545; }
        .metric.pending .value { color: #ffc107; }
        .section { padding: 30px; border-bottom: 1px solid #e9ecef; }
        .section h2 { margin: 0 0 20px; color: #343a40; }
        .suite { 
            background: #f8f9fa; 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 20px; 
            border-left: 4px solid #28a745; 
        }
        .suite.failed { border-left-color: #dc3545; }
        .suite-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .suite-name { font-weight: bold; font-size: 1.1em; }
        .suite-stats { font-size: 0.9em; color: #6c757d; }
        .test { 
            padding: 8px 0; 
            border-bottom: 1px solid #e9ecef; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .test:last-child { border-bottom: none; }
        .test-name { flex: 1; }
        .test-duration { font-size: 0.8em; color: #6c757d; }
        .test.passed { color: #28a745; }
        .test.failed { color: #dc3545; }
        .test.pending { color: #ffc107; }
        .recommendations { background: #fff3cd; border-radius: 8px; padding: 20px; }
        .recommendation { 
            padding: 15px; 
            margin-bottom: 15px; 
            border-radius: 6px; 
            border-left: 4px solid #ffc107; 
        }
        .recommendation.error { border-left-color: #dc3545; background: #f8d7da; }
        .recommendation.performance { border-left-color: #17a2b8; background: #d1ecf1; }
        .recommendation.memory { border-left-color: #fd7e14; background: #ffeaa7; }
        .recommendation h4 { margin: 0 0 8px; }
        .recommendation p { margin: 0; font-size: 0.9em; }
        .coverage-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 15px; 
        }
        .coverage-item { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 6px; 
            text-align: center; 
        }
        .coverage-percentage { 
            font-size: 1.5em; 
            font-weight: bold; 
            margin-bottom: 5px; 
        }
        .coverage-percentage.good { color: #28a745; }
        .coverage-percentage.warning { color: #ffc107; }
        .coverage-percentage.poor { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Seller Integration Test Report</h1>
            <p>Generated on ${new Date(summary.timestamp).toLocaleString()}</p>
            <p>Duration: ${Math.round(summary.duration / 1000)}s</p>
        </div>

        <div class="summary">
            <div class="metric passed">
                <h3>Passed</h3>
                <p class="value">${summary.passed}</p>
            </div>
            <div class="metric failed">
                <h3>Failed</h3>
                <p class="value">${summary.failed}</p>
            </div>
            <div class="metric pending">
                <h3>Pending</h3>
                <p class="value">${summary.pending}</p>
            </div>
            <div class="metric">
                <h3>Total</h3>
                <p class="value">${summary.total}</p>
            </div>
        </div>

        ${coverage ? `
        <div class="section">
            <h2>Coverage Report</h2>
            <div class="coverage-grid">
                <div class="coverage-item">
                    <div class="coverage-percentage ${this.getCoverageClass(coverage.lines.percentage)}">
                        ${coverage.lines.percentage.toFixed(1)}%
                    </div>
                    <div>Lines (${coverage.lines.covered}/${coverage.lines.total})</div>
                </div>
                <div class="coverage-item">
                    <div class="coverage-percentage ${this.getCoverageClass(coverage.functions.percentage)}">
                        ${coverage.functions.percentage.toFixed(1)}%
                    </div>
                    <div>Functions (${coverage.functions.covered}/${coverage.functions.total})</div>
                </div>
                <div class="coverage-item">
                    <div class="coverage-percentage ${this.getCoverageClass(coverage.branches.percentage)}">
                        ${coverage.branches.percentage.toFixed(1)}%
                    </div>
                    <div>Branches (${coverage.branches.covered}/${coverage.branches.total})</div>
                </div>
                <div class="coverage-item">
                    <div class="coverage-percentage ${this.getCoverageClass(coverage.statements.percentage)}">
                        ${coverage.statements.percentage.toFixed(1)}%
                    </div>
                    <div>Statements (${coverage.statements.covered}/${coverage.statements.total})</div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>Test Suites</h2>
            ${suites.map(suite => `
                <div class="suite ${suite.failed > 0 ? 'failed' : ''}">
                    <div class="suite-header">
                        <div class="suite-name">${suite.name}</div>
                        <div class="suite-stats">
                            ${suite.passed} passed, ${suite.failed} failed, ${suite.pending} pending
                            (${Math.round(suite.duration)}ms)
                        </div>
                    </div>
                    ${suite.tests.map(test => `
                        <div class="test ${test.status}">
                            <div class="test-name">${test.title}</div>
                            <div class="test-duration">${test.duration || 0}ms</div>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>

        ${performance ? `
        <div class="section">
            <h2>Performance Metrics</h2>
            <p><strong>Average Test Duration:</strong> ${Math.round(performance.averageTestDuration)}ms</p>
            <p><strong>Memory Usage:</strong> ${Math.round(performance.memoryUsage.heapUsed / 1024 / 1024)}MB</p>
            
            ${performance.slowestTests.length > 0 ? `
                <h3>Slowest Tests</h3>
                <ul>
                    ${performance.slowestTests.map(test => 
                        `<li>${test.name}: ${test.duration}ms</li>`
                    ).join('')}
                </ul>
            ` : ''}
        </div>
        ` : ''}

        ${recommendations.length > 0 ? `
        <div class="section">
            <h2>Recommendations</h2>
            <div class="recommendations">
                ${recommendations.map(rec => `
                    <div class="recommendation ${rec.type}">
                        <h4>${rec.title}</h4>
                        <p><strong>Issue:</strong> ${rec.description}</p>
                        <p><strong>Action:</strong> ${rec.action}</p>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }

  getCoverageClass(percentage) {
    if (percentage >= 80) return 'good';
    if (percentage >= 60) return 'warning';
    return 'poor';
  }

  logSummary(results) {
    const { summary, recommendations } = results;
    
    console.log('\n📊 Seller Integration Test Summary:');
    console.log('=====================================');
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️  Pending: ${summary.pending}`);
    console.log(`📊 Total: ${summary.total}`);
    console.log(`⏱️  Duration: ${Math.round(summary.duration / 1000)}s`);
    
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach(rec => {
        const icon = rec.type === 'error' ? '❌' : rec.type === 'performance' ? '⚡' : '💾';
        console.log(`   ${icon} ${rec.title}: ${rec.description}`);
      });
    }
    
    console.log(`\n${summary.success ? '🎉 All tests passed!' : '⚠️  Some tests failed.'}`);
  }
}

module.exports = SellerTestResultsProcessor;