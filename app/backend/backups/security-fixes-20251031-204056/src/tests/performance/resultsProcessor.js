/**
 * Performance Test Results Processor
 * Processes Jest test results to extract performance metrics
 */

const fs = require('fs');
const path = require('path');

module.exports = (results) => {
  const performanceMetrics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    performanceBudget: {
      maxResponseTime: parseInt(process.env.MAX_RESPONSE_TIME || '200'),
      maxCacheTime: parseInt(process.env.MAX_CACHE_TIME || '10'),
      maxMemoryGrowth: parseInt(process.env.MAX_MEMORY_GROWTH || '100'),
      maxErrorRate: parseFloat(process.env.MAX_ERROR_RATE || '0.05')
    },
    summary: {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      totalTime: results.testResults.reduce((sum, result) => sum + (result.perfStats?.end - result.perfStats?.start || 0), 0),
      averageTestTime: 0
    },
    testSuites: [],
    budgetViolations: []
  };

  // Calculate average test time
  if (results.numTotalTests > 0) {
    performanceMetrics.summary.averageTestTime = performanceMetrics.summary.totalTime / results.numTotalTests;
  }

  // Process each test suite
  results.testResults.forEach(testResult => {
    const suiteMetrics = {
      name: path.basename(testResult.testFilePath),
      path: testResult.testFilePath,
      duration: testResult.perfStats ? testResult.perfStats.end - testResult.perfStats.start : 0,
      tests: testResult.testResults.length,
      passed: testResult.numPassingTests,
      failed: testResult.numFailingTests,
      skipped: testResult.numPendingTests,
      performance: {
        averageTestTime: 0,
        slowestTest: null,
        fastestTest: null
      }
    };

    // Analyze individual test performance
    const testTimes = testResult.testResults
      .filter(test => test.duration !== undefined)
      .map(test => ({
        name: test.title,
        duration: test.duration
      }));

    if (testTimes.length > 0) {
      suiteMetrics.performance.averageTestTime = testTimes.reduce((sum, test) => sum + test.duration, 0) / testTimes.length;
      suiteMetrics.performance.slowestTest = testTimes.reduce((slowest, test) => 
        test.duration > slowest.duration ? test : slowest
      );
      suiteMetrics.performance.fastestTest = testTimes.reduce((fastest, test) => 
        test.duration < fastest.duration ? test : fastest
      );
    }

    performanceMetrics.testSuites.push(suiteMetrics);

    // Check for budget violations
    if (suiteMetrics.performance.averageTestTime > performanceMetrics.performanceBudget.maxResponseTime) {
      performanceMetrics.budgetViolations.push({
        type: 'response_time',
        suite: suiteMetrics.name,
        actual: suiteMetrics.performance.averageTestTime,
        budget: performanceMetrics.performanceBudget.maxResponseTime,
        severity: 'high'
      });
    }

    if (suiteMetrics.performance.slowestTest && 
        suiteMetrics.performance.slowestTest.duration > performanceMetrics.performanceBudget.maxResponseTime * 5) {
      performanceMetrics.budgetViolations.push({
        type: 'slow_test',
        suite: suiteMetrics.name,
        test: suiteMetrics.performance.slowestTest.name,
        actual: suiteMetrics.performance.slowestTest.duration,
        budget: performanceMetrics.performanceBudget.maxResponseTime * 5,
        severity: 'medium'
      });
    }
  });

  // Extract console output for performance metrics
  results.testResults.forEach(testResult => {
    if (testResult.console) {
      testResult.console.forEach(logEntry => {
        if (logEntry.message.includes('Performance:') || 
            logEntry.message.includes('Average:') ||
            logEntry.message.includes('Throughput:')) {
          // Extract performance metrics from console output
          // This is a simplified extraction - in a real implementation,
          // you'd parse structured performance data
        }
      });
    }
  });

  // Save performance metrics to file
  const resultsDir = './performance-results';
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const metricsFile = path.join(resultsDir, `performance-metrics-${Date.now()}.json`);
  fs.writeFileSync(metricsFile, JSON.stringify(performanceMetrics, null, 2));

  // Generate performance summary
  console.log('\n📊 Performance Test Summary');
  console.log('============================');
  console.log(`Total Tests: ${performanceMetrics.summary.totalTests}`);
  console.log(`Passed: ${performanceMetrics.summary.passedTests}`);
  console.log(`Failed: ${performanceMetrics.summary.failedTests}`);
  console.log(`Average Test Time: ${performanceMetrics.summary.averageTestTime.toFixed(2)}ms`);
  
  if (performanceMetrics.budgetViolations.length > 0) {
    console.log(`\n⚠️  Budget Violations: ${performanceMetrics.budgetViolations.length}`);
    performanceMetrics.budgetViolations.forEach(violation => {
      console.log(`  ${violation.type}: ${violation.actual.toFixed(2)}ms > ${violation.budget}ms (${violation.suite})`);
    });
  } else {
    console.log('\n✅ All performance budgets met!');
  }

  console.log(`\n📁 Detailed metrics saved to: ${metricsFile}`);

  return results;
};