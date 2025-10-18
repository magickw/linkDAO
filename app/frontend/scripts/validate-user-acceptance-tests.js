#!/usr/bin/env node

/**
 * User Acceptance Test Validation Script
 * Validates that all user acceptance tests are properly implemented and comprehensive
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEST_DIR = path.join(__dirname, '../src/__tests__/user-acceptance');
const REPORTS_DIR = path.join(__dirname, '../test-reports/user-acceptance');

// Required test files and their expected test cases
const REQUIRED_TESTS = {
  'Web3UserJourneyTests.test.tsx': {
    description: 'Tests complete Web3 user workflows with real wallets and test tokens',
    requiredTestCases: [
      'should complete full Web3 user journey from discovery to governance voting',
      'should handle community creation workflow with token requirements',
      'should handle MetaMask connection and network switching',
      'should handle transaction signing for staking',
      'should handle gas fee estimation and display',
      'should handle network errors gracefully',
      'should be keyboard navigable',
      'should have proper ARIA labels and roles'
    ],
    minTestCount: 15
  },
  'MobileCompatibilityTests.test.tsx': {
    description: 'Tests mobile device compatibility across different screen sizes',
    requiredTestCases: [
      'should render correctly on different mobile devices',
      'should handle touch interactions on Web3 action buttons',
      'should handle swipe gestures for post interactions',
      'should navigate between sections using bottom navigation',
      'should handle mobile wallet connection flow',
      'should handle mobile token amount input with haptic feedback',
      'should handle mobile governance voting interface',
      'should render efficiently on mobile devices',
      'should be accessible with screen readers on mobile',
      'should have proper touch target sizes'
    ],
    minTestCount: 20
  },
  'CrossBrowserCompatibilityTests.test.tsx': {
    description: 'Tests compatibility across different browsers and Web3 providers',
    requiredTestCases: [
      'should work correctly in different browsers',
      'should work with different Web3 providers',
      'should handle all Web3 features in Chrome',
      'should handle Web3 features in Firefox',
      'should handle Web3 features in Safari',
      'should handle Web3 features in Edge',
      'should handle Web3 features on mobile Safari',
      'should handle Web3 features on mobile Chrome',
      'should maintain good performance across browsers',
      'should provide appropriate fallbacks for unsupported features'
    ],
    minTestCount: 15
  },
  'PerformanceOptimizationTests.test.tsx': {
    description: 'Tests performance metrics and optimization strategies',
    requiredTestCases: [
      'should render large community lists efficiently with virtual scrolling',
      'should handle infinite scroll efficiently',
      'should optimize component re-renders with memoization',
      'should cache Web3 data efficiently',
      'should maintain reasonable memory usage with large datasets',
      'should maintain 60fps during animations',
      'should minimize network requests with intelligent caching',
      'should handle peak usage scenarios efficiently',
      'should display accurate performance metrics'
    ],
    minTestCount: 12
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateTestFile(filePath, requirements) {
  const fileName = path.basename(filePath);
  const result = {
    file: fileName,
    exists: false,
    hasValidStructure: false,
    testCount: 0,
    requiredTestsCovered: 0,
    missingTests: [],
    issues: [],
    recommendations: []
  };

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      result.issues.push(`Test file ${fileName} does not exist`);
      result.recommendations.push(`Create ${fileName} with comprehensive test cases`);
      return result;
    }

    result.exists = true;
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Check for basic Jest structure
    if (!fileContent.includes('describe(') || !fileContent.includes('test(') && !fileContent.includes('it(')) {
      result.issues.push('File does not contain proper Jest test structure');
      result.recommendations.push('Add proper describe() and test() blocks');
      return result;
    }

    result.hasValidStructure = true;

    // Count total tests
    const testMatches = fileContent.match(/(?:test|it)\s*\(/g);
    result.testCount = testMatches ? testMatches.length : 0;

    // Check for required imports
    const requiredImports = [
      '@testing-library/react',
      '@testing-library/user-event'
    ];

    requiredImports.forEach(importName => {
      if (!fileContent.includes(importName)) {
        result.issues.push(`Missing import: ${importName}`);
        result.recommendations.push(`Add import for ${importName}`);
      }
    });

    // Check coverage of required test cases
    requirements.requiredTestCases.forEach(testCase => {
      const testKeywords = testCase.toLowerCase().split(' ').filter(word => word.length > 3);
      const hasTestCase = testKeywords.some(keyword => 
        fileContent.toLowerCase().includes(keyword)
      );

      if (hasTestCase) {
        result.requiredTestsCovered++;
      } else {
        result.missingTests.push(testCase);
      }
    });

    // Check minimum test count
    if (result.testCount < requirements.minTestCount) {
      result.issues.push(`Insufficient test count: ${result.testCount}/${requirements.minTestCount}`);
      result.recommendations.push(`Add more test cases to reach minimum of ${requirements.minTestCount}`);
    }

    // Check for Web3 specific requirements
    if (fileName.includes('Web3') || fileName.includes('Mobile') || fileName.includes('CrossBrowser')) {
      const web3Keywords = ['ethereum', 'wallet', 'transaction', 'gas', 'token'];
      const web3Coverage = web3Keywords.filter(keyword => 
        fileContent.toLowerCase().includes(keyword)
      ).length;

      if (web3Coverage < 3) {
        result.issues.push('Insufficient Web3 test coverage');
        result.recommendations.push('Add more Web3-specific test cases');
      }
    }

    // Check for accessibility requirements
    const accessibilityKeywords = ['aria', 'keyboard', 'screen reader', 'accessible'];
    const accessibilityTests = accessibilityKeywords.filter(keyword =>
      fileContent.toLowerCase().includes(keyword.toLowerCase())
    ).length;

    if (accessibilityTests < 2) {
      result.issues.push('Insufficient accessibility test coverage');
      result.recommendations.push('Add comprehensive accessibility tests');
    }

    // Check for performance requirements (for relevant files)
    if (fileName.includes('Performance') || fileName.includes('Mobile')) {
      const performanceKeywords = ['performance', 'render time', 'memory', 'fps'];
      const performanceTests = performanceKeywords.filter(keyword =>
        fileContent.toLowerCase().includes(keyword.toLowerCase())
      ).length;

      if (performanceTests < 2) {
        result.issues.push('Insufficient performance test coverage');
        result.recommendations.push('Add comprehensive performance tests');
      }
    }

  } catch (error) {
    result.issues.push(`Error reading test file: ${error.message}`);
    result.recommendations.push('Fix file reading errors and ensure proper file format');
  }

  return result;
}

function generateValidationReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: results.length,
      validFiles: results.filter(r => r.exists && r.hasValidStructure && r.issues.length === 0).length,
      totalTests: results.reduce((sum, r) => sum + r.testCount, 0),
      totalCoverage: results.reduce((sum, r) => sum + r.requiredTestsCovered, 0),
      totalRequired: Object.values(REQUIRED_TESTS).reduce((sum, req) => sum + req.requiredTestCases.length, 0)
    },
    results: results,
    overallValid: false
  };

  report.summary.coveragePercentage = (report.summary.totalCoverage / report.summary.totalRequired) * 100;
  report.overallValid = report.summary.validFiles === report.summary.totalFiles && 
                       report.summary.coveragePercentage >= 80;

  return report;
}

function printValidationResults(report) {
  log('\n' + '='.repeat(80), 'cyan');
  log('🔍 USER ACCEPTANCE TEST VALIDATION REPORT', 'cyan');
  log('='.repeat(80), 'cyan');

  log(`\n📊 Validation Summary:`, 'blue');
  log(`   Total Test Files: ${report.summary.totalFiles}`, 'white');
  log(`   Valid Test Files: ${report.summary.validFiles}`, report.summary.validFiles === report.summary.totalFiles ? 'green' : 'red');
  log(`   Total Tests: ${report.summary.totalTests}`, 'white');
  log(`   Coverage: ${report.summary.coveragePercentage.toFixed(1)}%`, report.summary.coveragePercentage >= 80 ? 'green' : 'red');
  log(`   Overall Status: ${report.overallValid ? '✅ VALID' : '❌ INVALID'}`, report.overallValid ? 'green' : 'red');

  log(`\n📋 Test File Details:`, 'blue');
  report.results.forEach(result => {
    const status = result.exists && result.hasValidStructure && result.issues.length === 0 ? '✅' : '❌';
    const statusColor = result.exists && result.hasValidStructure && result.issues.length === 0 ? 'green' : 'red';
    
    log(`   ${status} ${result.file}`, statusColor);
    log(`      Tests: ${result.testCount} | Coverage: ${result.requiredTestsCovered}/${REQUIRED_TESTS[result.file]?.requiredTestCases.length || 0}`, 'white');
    
    if (result.issues.length > 0) {
      log(`      Issues: ${result.issues.slice(0, 2).join(', ')}${result.issues.length > 2 ? '...' : ''}`, 'yellow');
    }
  });

  // Show critical issues
  const allIssues = report.results.flatMap(r => r.issues);
  if (allIssues.length > 0) {
    log(`\n⚠️  Critical Issues:`, 'yellow');
    allIssues.slice(0, 10).forEach(issue => {
      log(`   • ${issue}`, 'yellow');
    });
  }

  // Show recommendations
  const allRecommendations = [...new Set(report.results.flatMap(r => r.recommendations))];
  if (allRecommendations.length > 0) {
    log(`\n💡 Recommendations:`, 'magenta');
    allRecommendations.slice(0, 10).forEach(rec => {
      log(`   • ${rec}`, 'magenta');
    });
  }

  if (report.overallValid) {
    log(`\n🎉 All user acceptance tests are properly implemented and comprehensive!`, 'green');
    log(`✅ Ready for production deployment.`, 'green');
  } else {
    log(`\n⚠️  Test implementation needs improvement.`, 'yellow');
    log(`❌ Please address the issues above before deployment.`, 'red');
  }

  log('\n' + '='.repeat(80), 'cyan');
}

function saveReport(report) {
  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Save JSON report
  const reportPath = path.join(REPORTS_DIR, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Save HTML report
  const htmlReport = generateHtmlReport(report);
  const htmlPath = path.join(REPORTS_DIR, 'validation-report.html');
  fs.writeFileSync(htmlPath, htmlReport);

  log(`\n📄 Reports saved:`, 'blue');
  log(`   JSON: ${reportPath}`, 'white');
  log(`   HTML: ${htmlPath}`, 'white');
}

function generateHtmlReport(report) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Acceptance Test Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }
        .metric { text-align: center; padding: 20px; border-radius: 8px; }
        .metric.success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .metric.warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; }
        .metric.error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        .metric h3 { margin: 0; font-size: 2em; }
        .test-files { padding: 0 30px 30px 30px; }
        .test-file { margin-bottom: 20px; border: 1px solid #e9ecef; border-radius: 8px; overflow: hidden; }
        .test-file-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #e9ecef; }
        .test-file-body { padding: 15px; }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 500; }
        .status.valid { background: #d4edda; color: #155724; }
        .status.invalid { background: #f8d7da; color: #721c24; }
        .issues { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 10px; margin-top: 10px; }
        .recommendations { background: #e2e3ff; border: 1px solid #c3c4ff; border-radius: 4px; padding: 10px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 User Acceptance Test Validation</h1>
            <p>Web3 Native Community Enhancements - Test Implementation Report</p>
        </div>
        
        <div class="summary">
            <div class="metric ${report.summary.validFiles === report.summary.totalFiles ? 'success' : 'error'}">
                <h3>${report.summary.totalFiles}</h3>
                <p>Test Files</p>
            </div>
            <div class="metric ${report.summary.validFiles === report.summary.totalFiles ? 'success' : 'error'}">
                <h3>${report.summary.validFiles}</h3>
                <p>Valid Files</p>
            </div>
            <div class="metric success">
                <h3>${report.summary.totalTests}</h3>
                <p>Total Tests</p>
            </div>
            <div class="metric ${report.summary.coveragePercentage >= 80 ? 'success' : 'warning'}">
                <h3>${report.summary.coveragePercentage.toFixed(1)}%</h3>
                <p>Coverage</p>
            </div>
        </div>
        
        <div class="test-files">
            ${report.results.map(result => `
                <div class="test-file">
                    <div class="test-file-header">
                        <h3>${result.file} <span class="status ${result.exists && result.hasValidStructure && result.issues.length === 0 ? 'valid' : 'invalid'}">${result.exists && result.hasValidStructure && result.issues.length === 0 ? 'Valid' : 'Invalid'}</span></h3>
                        <p>Tests: ${result.testCount} | Coverage: ${result.requiredTestsCovered}/${REQUIRED_TESTS[result.file]?.requiredTestCases.length || 0}</p>
                    </div>
                    <div class="test-file-body">
                        ${result.issues.length > 0 ? `
                            <div class="issues">
                                <strong>Issues:</strong>
                                <ul>${result.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
                            </div>
                        ` : ''}
                        ${result.recommendations.length > 0 ? `
                            <div class="recommendations">
                                <strong>Recommendations:</strong>
                                <ul>${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6c757d; border-top: 1px solid #e9ecef;">
            Generated on ${new Date(report.timestamp).toLocaleString()}
        </div>
    </div>
</body>
</html>
  `;
}

function main() {
  log('🚀 Starting User Acceptance Test Validation...', 'blue');

  const results = [];

  // Validate each required test file
  Object.entries(REQUIRED_TESTS).forEach(([fileName, requirements]) => {
    const filePath = path.join(TEST_DIR, fileName);
    log(`\n🔍 Validating ${fileName}...`, 'yellow');
    
    const result = validateTestFile(filePath, requirements);
    results.push(result);
    
    const status = result.exists && result.hasValidStructure && result.issues.length === 0 ? '✅' : '❌';
    log(`${status} ${fileName}: ${result.testCount} tests, ${result.requiredTestsCovered} coverage`, 
        result.exists && result.hasValidStructure && result.issues.length === 0 ? 'green' : 'red');
  });

  // Generate and display report
  const report = generateValidationReport(results);
  printValidationResults(report);
  saveReport(report);

  // Exit with appropriate code
  process.exit(report.overallValid ? 0 : 1);
}

// Run validation
if (require.main === module) {
  main();
}

module.exports = {
  validateTestFile,
  generateValidationReport,
  REQUIRED_TESTS
};