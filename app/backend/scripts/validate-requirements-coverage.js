#!/usr/bin/env node

/**
 * Requirements Coverage Validation Script
 * 
 * This script validates that all requirements from the requirements.md file
 * are covered by the comprehensive integration tests.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  requirementsFile: '.kiro/specs/ldao-token-acquisition/requirements.md',
  testReportsDir: 'test-reports/ldao-acquisition',
  outputFile: 'test-reports/ldao-acquisition/requirements-coverage.html'
};

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  if (config[key]) {
    config[key] = value;
  }
}

/**
 * Parse requirements from markdown file
 */
function parseRequirements(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const requirements = [];
    
    // Extract requirements using regex
    const requirementPattern = /### Requirement (\d+)[\s\S]*?#### Acceptance Criteria\s*([\s\S]*?)(?=###|$)/g;
    let match;
    
    while ((match = requirementPattern.exec(content)) !== null) {
      const requirementNumber = match[1];
      const criteriaText = match[2];
      
      // Extract user story
      const userStoryMatch = criteriaText.match(/\*\*User Story:\*\* (.*?)(?=\n|$)/);
      const userStory = userStoryMatch ? userStoryMatch[1] : '';
      
      // Extract acceptance criteria
      const criteriaMatches = criteriaText.match(/\d+\.\s+(.*?)(?=\n\d+\.|$)/g);
      const acceptanceCriteria = criteriaMatches ? criteriaMatches.map(c => c.replace(/^\d+\.\s+/, '')) : [];
      
      requirements.push({
        id: `Requirement ${requirementNumber}`,
        number: parseInt(requirementNumber),
        userStory,
        acceptanceCriteria,
        covered: false,
        testCases: []
      });
    }
    
    return requirements;
  } catch (error) {
    console.error(`Error parsing requirements file: ${error.message}`);
    return [];
  }
}

/**
 * Parse test results to find requirement coverage
 */
function parseTestResults(testReportsDir) {
  const testResults = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    coverage: {},
    requirementMappings: []
  };
  
  try {
    // Read test result files
    const files = fs.readdirSync(testReportsDir).filter(f => f.endsWith('-results.json'));
    
    for (const file of files) {
      const filePath = path.join(testReportsDir, file);
      const results = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (results.testResults) {
        results.testResults.forEach(testFile => {
          testFile.assertionResults.forEach(test => {
            testResults.totalTests++;
            if (test.status === 'passed') {
              testResults.passedTests++;
            } else {
              testResults.failedTests++;
            }
            
            // Extract requirement references from test names
            const requirementMatches = test.title.match(/[Rr]equirement[s]?\s*(\d+(?:\.\d+)?)/g);
            if (requirementMatches) {
              requirementMatches.forEach(match => {
                const reqNumber = match.match(/(\d+(?:\.\d+)?)/)[1];
                testResults.requirementMappings.push({
                  requirement: `Requirement ${reqNumber}`,
                  testName: test.title,
                  testFile: testFile.name,
                  status: test.status
                });
              });
            }
          });
        });
      }
    }
    
    // Read coverage data if available
    const coverageFile = path.join(testReportsDir, 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coverageFile)) {
      testResults.coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
    }
    
  } catch (error) {
    console.error(`Error parsing test results: ${error.message}`);
  }
  
  return testResults;
}

/**
 * Map test results to requirements
 */
function mapTestsToRequirements(requirements, testResults) {
  const mappedRequirements = requirements.map(req => ({ ...req }));
  
  // Map test cases to requirements
  testResults.requirementMappings.forEach(mapping => {
    const requirement = mappedRequirements.find(r => r.id === mapping.requirement);
    if (requirement) {
      requirement.testCases.push({
        testName: mapping.testName,
        testFile: mapping.testFile,
        status: mapping.status
      });
      
      // Mark as covered if at least one test passes
      if (mapping.status === 'passed') {
        requirement.covered = true;
      }
    }
  });
  
  return mappedRequirements;
}

/**
 * Generate HTML coverage report
 */
function generateHTMLReport(requirements, testResults, outputFile) {
  const totalRequirements = requirements.length;
  const coveredRequirements = requirements.filter(r => r.covered).length;
  const coveragePercentage = totalRequirements > 0 ? (coveredRequirements / totalRequirements * 100).toFixed(1) : 0;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LDAO Token Acquisition System - Requirements Coverage Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #555;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .coverage-bar {
            width: 100%;
            height: 20px;
            background-color: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            transition: width 0.3s ease;
        }
        .requirements-grid {
            display: grid;
            gap: 20px;
        }
        .requirement-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .requirement-header {
            padding: 20px;
            border-left: 5px solid #667eea;
        }
        .requirement-header.covered {
            border-left-color: #4CAF50;
        }
        .requirement-header.not-covered {
            border-left-color: #f44336;
        }
        .requirement-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .user-story {
            font-style: italic;
            color: #666;
            margin-bottom: 15px;
        }
        .acceptance-criteria {
            margin-bottom: 15px;
        }
        .acceptance-criteria h4 {
            margin: 0 0 10px 0;
            color: #555;
        }
        .criteria-list {
            list-style: none;
            padding: 0;
        }
        .criteria-list li {
            padding: 5px 0;
            border-left: 3px solid #e0e0e0;
            padding-left: 15px;
            margin-bottom: 5px;
        }
        .test-cases {
            background: #f9f9f9;
            padding: 20px;
            border-top: 1px solid #e0e0e0;
        }
        .test-case {
            background: white;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
            border-left: 3px solid #4CAF50;
        }
        .test-case.failed {
            border-left-color: #f44336;
        }
        .test-case-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .test-case-file {
            font-size: 0.9em;
            color: #666;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-covered {
            background-color: #4CAF50;
            color: white;
        }
        .status-not-covered {
            background-color: #f44336;
            color: white;
        }
        .status-passed {
            background-color: #4CAF50;
            color: white;
        }
        .status-failed {
            background-color: #f44336;
            color: white;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        @media (max-width: 768px) {
            .summary {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>LDAO Token Acquisition System</h1>
        <h2>Requirements Coverage Report</h2>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>Total Requirements</h3>
            <div class="value">${totalRequirements}</div>
        </div>
        <div class="summary-card">
            <h3>Covered Requirements</h3>
            <div class="value">${coveredRequirements}</div>
        </div>
        <div class="summary-card">
            <h3>Coverage Percentage</h3>
            <div class="value">${coveragePercentage}%</div>
            <div class="coverage-bar">
                <div class="coverage-fill" style="width: ${coveragePercentage}%"></div>
            </div>
        </div>
        <div class="summary-card">
            <h3>Total Tests</h3>
            <div class="value">${testResults.totalTests}</div>
            <div style="font-size: 0.9em; margin-top: 10px;">
                <span style="color: #4CAF50;">${testResults.passedTests} passed</span> | 
                <span style="color: #f44336;">${testResults.failedTests} failed</span>
            </div>
        </div>
    </div>

    <div class="requirements-grid">
        ${requirements.map(req => `
            <div class="requirement-card">
                <div class="requirement-header ${req.covered ? 'covered' : 'not-covered'}">
                    <div class="requirement-title">
                        ${req.id}
                        <span class="status-badge ${req.covered ? 'status-covered' : 'status-not-covered'}">
                            ${req.covered ? 'Covered' : 'Not Covered'}
                        </span>
                    </div>
                    <div class="user-story">${req.userStory}</div>
                    <div class="acceptance-criteria">
                        <h4>Acceptance Criteria:</h4>
                        <ul class="criteria-list">
                            ${req.acceptanceCriteria.map(criteria => `<li>${criteria}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                ${req.testCases.length > 0 ? `
                    <div class="test-cases">
                        <h4>Test Cases (${req.testCases.length}):</h4>
                        ${req.testCases.map(test => `
                            <div class="test-case ${test.status === 'failed' ? 'failed' : ''}">
                                <div class="test-case-name">
                                    ${test.testName}
                                    <span class="status-badge ${test.status === 'passed' ? 'status-passed' : 'status-failed'}">
                                        ${test.status}
                                    </span>
                                </div>
                                <div class="test-case-file">${test.testFile}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>

    <div class="footer">
        <p>This report was generated automatically by the LDAO Token Acquisition System test suite.</p>
        <p>For more details, see the individual test reports in the test-reports directory.</p>
    </div>
</body>
</html>`;

  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, html);
  console.log(`Requirements coverage report generated: ${outputFile}`);
}

/**
 * Generate JSON summary for CI/CD
 */
function generateJSONSummary(requirements, testResults) {
  const summary = {
    timestamp: new Date().toISOString(),
    requirements: {
      total: requirements.length,
      covered: requirements.filter(r => r.covered).length,
      coveragePercentage: requirements.length > 0 ? 
        (requirements.filter(r => r.covered).length / requirements.length * 100) : 0
    },
    tests: {
      total: testResults.totalTests,
      passed: testResults.passedTests,
      failed: testResults.failedTests,
      successRate: testResults.totalTests > 0 ? 
        (testResults.passedTests / testResults.totalTests * 100) : 0
    },
    coverage: testResults.coverage,
    uncoveredRequirements: requirements.filter(r => !r.covered).map(r => ({
      id: r.id,
      userStory: r.userStory,
      acceptanceCriteria: r.acceptanceCriteria
    })),
    requirementDetails: requirements.map(r => ({
      id: r.id,
      covered: r.covered,
      testCaseCount: r.testCases.length,
      passedTests: r.testCases.filter(t => t.status === 'passed').length,
      failedTests: r.testCases.filter(t => t.status === 'failed').length
    }))
  };

  const summaryFile = path.join(config.testReportsDir, 'requirements-coverage-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  return summary;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Validating requirements coverage...');
  console.log(`Requirements file: ${config.requirementsFile}`);
  console.log(`Test reports directory: ${config.testReportsDir}`);
  console.log(`Output file: ${config.outputFile}`);
  console.log('');

  // Parse requirements
  console.log('📋 Parsing requirements...');
  const requirements = parseRequirements(config.requirementsFile);
  console.log(`Found ${requirements.length} requirements`);

  // Parse test results
  console.log('🧪 Parsing test results...');
  const testResults = parseTestResults(config.testReportsDir);
  console.log(`Found ${testResults.totalTests} tests (${testResults.passedTests} passed, ${testResults.failedTests} failed)`);

  // Map tests to requirements
  console.log('🔗 Mapping tests to requirements...');
  const mappedRequirements = mapTestsToRequirements(requirements, testResults);
  
  // Generate reports
  console.log('📊 Generating coverage report...');
  generateHTMLReport(mappedRequirements, testResults, config.outputFile);
  
  const summary = generateJSONSummary(mappedRequirements, testResults);
  
  // Print summary
  console.log('');
  console.log('📈 Coverage Summary:');
  console.log(`  Total Requirements: ${summary.requirements.total}`);
  console.log(`  Covered Requirements: ${summary.requirements.covered}`);
  console.log(`  Coverage Percentage: ${summary.requirements.coveragePercentage.toFixed(1)}%`);
  console.log(`  Total Tests: ${summary.tests.total}`);
  console.log(`  Test Success Rate: ${summary.tests.successRate.toFixed(1)}%`);
  
  if (summary.uncoveredRequirements.length > 0) {
    console.log('');
    console.log('⚠️  Uncovered Requirements:');
    summary.uncoveredRequirements.forEach(req => {
      console.log(`  - ${req.id}: ${req.userStory}`);
    });
  }
  
  // Exit with appropriate code
  const exitCode = summary.requirements.coveragePercentage >= 90 && summary.tests.successRate >= 95 ? 0 : 1;
  
  if (exitCode === 0) {
    console.log('');
    console.log('✅ Requirements coverage validation passed!');
  } else {
    console.log('');
    console.log('❌ Requirements coverage validation failed!');
    console.log('   - Requirements coverage should be >= 90%');
    console.log('   - Test success rate should be >= 95%');
  }
  
  process.exit(exitCode);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  parseRequirements,
  parseTestResults,
  mapTestsToRequirements,
  generateHTMLReport,
  generateJSONSummary
};