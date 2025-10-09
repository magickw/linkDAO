#!/usr/bin/env node

/**
 * User Experience Validation Script
 * Comprehensive validation of user experience after mock data removal
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bold}=== ${title} ===${colors.reset}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

class UserExperienceValidator {
  constructor() {
    this.results = {
      mockDataRemoval: { passed: 0, failed: 0, warnings: 0 },
      loadingStates: { passed: 0, failed: 0, warnings: 0 },
      errorHandling: { passed: 0, failed: 0, warnings: 0 },
      performance: { passed: 0, failed: 0, warnings: 0 },
      dataConsistency: { passed: 0, failed: 0, warnings: 0 },
      accessibility: { passed: 0, failed: 0, warnings: 0 }
    };
  }

  async validateMockDataRemoval() {
    logSection('Mock Data Removal Validation');

    try {
      // Check for remaining mock data files
      const mockDataFiles = [
        'src/mocks/communityMockData.ts',
        'src/data/mockProducts.ts',
        'src/mocks/mockUsers.ts',
        'src/data/mockFeed.ts'
      ];

      for (const file of mockDataFiles) {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          logError(`Mock data file still exists: ${file}`);
          this.results.mockDataRemoval.failed++;
        } else {
          logSuccess(`Mock data file removed: ${file}`);
          this.results.mockDataRemoval.passed++;
        }
      }

      // Check for mock data imports in components
      const componentFiles = this.findFiles('src/components', '.tsx');
      const mockImportPattern = /import.*from.*['"].*mock.*['"];?/gi;

      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const mockImports = content.match(mockImportPattern);
        
        if (mockImports) {
          logError(`Mock imports found in ${file}: ${mockImports.join(', ')}`);
          this.results.mockDataRemoval.failed++;
        } else {
          this.results.mockDataRemoval.passed++;
        }
      }

      // Check for hardcoded mock arrays
      const hardcodedMockPattern = /(const|let|var)\s+\w*(mock|Mock)\w*\s*=\s*\[/g;
      
      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const hardcodedMocks = content.match(hardcodedMockPattern);
        
        if (hardcodedMocks) {
          logWarning(`Potential hardcoded mock data in ${file}`);
          this.results.mockDataRemoval.warnings++;
        }
      }

      logSuccess('Mock data removal validation completed');
    } catch (error) {
      logError(`Mock data removal validation failed: ${error.message}`);
      this.results.mockDataRemoval.failed++;
    }
  }

  async validateLoadingStates() {
    logSection('Loading States Validation');

    try {
      // Run loading states tests
      const testResult = execSync(
        'npm test -- --testPathPattern=userExperienceValidation --testNamePattern="Loading States"',
        { encoding: 'utf8', stdio: 'pipe' }
      );

      if (testResult.includes('PASS')) {
        logSuccess('Loading states tests passed');
        this.results.loadingStates.passed++;
      } else {
        logError('Loading states tests failed');
        this.results.loadingStates.failed++;
      }

      // Check for loading skeleton components
      const skeletonFiles = this.findFiles('src/components', 'Skeleton.tsx');
      if (skeletonFiles.length > 0) {
        logSuccess(`Found ${skeletonFiles.length} skeleton loading components`);
        this.results.loadingStates.passed++;
      } else {
        logWarning('No skeleton loading components found');
        this.results.loadingStates.warnings++;
      }

      // Check for loading states in key components
      const keyComponents = [
        'src/components/DashboardRightSidebar.tsx',
        'src/components/Feed/FeedPage.tsx',
        'src/components/Community/CommunityPage.tsx'
      ];

      for (const component of keyComponents) {
        const filePath = path.join(process.cwd(), component);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('loading') || content.includes('Loading') || content.includes('isLoading')) {
            logSuccess(`Loading states implemented in ${component}`);
            this.results.loadingStates.passed++;
          } else {
            logWarning(`No loading states found in ${component}`);
            this.results.loadingStates.warnings++;
          }
        }
      }

    } catch (error) {
      logError(`Loading states validation failed: ${error.message}`);
      this.results.loadingStates.failed++;
    }
  }

  async validateErrorHandling() {
    logSection('Error Handling Validation');

    try {
      // Run error handling tests
      const testResult = execSync(
        'npm test -- --testPathPattern=userExperienceValidation --testNamePattern="Error Handling"',
        { encoding: 'utf8', stdio: 'pipe' }
      );

      if (testResult.includes('PASS')) {
        logSuccess('Error handling tests passed');
        this.results.errorHandling.passed++;
      } else {
        logError('Error handling tests failed');
        this.results.errorHandling.failed++;
      }

      // Check for error boundary components
      const errorBoundaryFiles = this.findFiles('src/components', 'ErrorBoundary.tsx');
      if (errorBoundaryFiles.length > 0) {
        logSuccess(`Found ${errorBoundaryFiles.length} error boundary components`);
        this.results.errorHandling.passed++;
      } else {
        logWarning('No error boundary components found');
        this.results.errorHandling.warnings++;
      }

      // Check for retry mechanisms
      const componentFiles = this.findFiles('src/components', '.tsx');
      let retryImplementations = 0;

      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('retry') || content.includes('Retry')) {
          retryImplementations++;
        }
      }

      if (retryImplementations > 0) {
        logSuccess(`Found retry mechanisms in ${retryImplementations} components`);
        this.results.errorHandling.passed++;
      } else {
        logWarning('No retry mechanisms found');
        this.results.errorHandling.warnings++;
      }

    } catch (error) {
      logError(`Error handling validation failed: ${error.message}`);
      this.results.errorHandling.failed++;
    }
  }

  async validatePerformance() {
    logSection('Performance Validation');

    try {
      // Run performance benchmark tests
      const testResult = execSync(
        'npm test -- --testPathPattern=performanceBenchmarks',
        { encoding: 'utf8', stdio: 'pipe' }
      );

      if (testResult.includes('PASS')) {
        logSuccess('Performance benchmark tests passed');
        this.results.performance.passed++;
      } else {
        logError('Performance benchmark tests failed');
        this.results.performance.failed++;
      }

      // Check for performance optimizations
      const optimizationChecks = [
        { pattern: /React\.memo|memo\(/g, name: 'React.memo usage' },
        { pattern: /useMemo|useCallback/g, name: 'React hooks optimization' },
        { pattern: /lazy\(|Suspense/g, name: 'Code splitting' },
        { pattern: /IntersectionObserver/g, name: 'Intersection Observer' }
      ];

      const componentFiles = this.findFiles('src/components', '.tsx');
      
      for (const check of optimizationChecks) {
        let found = false;
        for (const file of componentFiles) {
          const content = fs.readFileSync(file, 'utf8');
          if (check.pattern.test(content)) {
            found = true;
            break;
          }
        }
        
        if (found) {
          logSuccess(`${check.name} implemented`);
          this.results.performance.passed++;
        } else {
          logWarning(`${check.name} not found`);
          this.results.performance.warnings++;
        }
      }

      // Check bundle size (if webpack-bundle-analyzer is available)
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        if (packageJson.scripts && packageJson.scripts['analyze']) {
          logSuccess('Bundle analysis script available');
          this.results.performance.passed++;
        } else {
          logWarning('No bundle analysis script found');
          this.results.performance.warnings++;
        }
      } catch (error) {
        logWarning('Could not check bundle analysis setup');
        this.results.performance.warnings++;
      }

    } catch (error) {
      logError(`Performance validation failed: ${error.message}`);
      this.results.performance.failed++;
    }
  }

  async validateDataConsistency() {
    logSection('Data Consistency Validation');

    try {
      // Run data consistency tests (backend)
      const testResult = execSync(
        'cd ../backend && npm test -- --testPathPattern=dataConsistencyValidation',
        { encoding: 'utf8', stdio: 'pipe' }
      );

      if (testResult.includes('PASS')) {
        logSuccess('Data consistency tests passed');
        this.results.dataConsistency.passed++;
      } else {
        logError('Data consistency tests failed');
        this.results.dataConsistency.failed++;
      }

      // Check for proper service implementations
      const serviceFiles = this.findFiles('src/services', '.ts');
      
      for (const file of serviceFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for proper error handling in services
        if (content.includes('try') && content.includes('catch')) {
          this.results.dataConsistency.passed++;
        } else {
          logWarning(`No error handling found in ${file}`);
          this.results.dataConsistency.warnings++;
        }
        
        // Check for proper typing
        if (content.includes('interface') || content.includes('type')) {
          this.results.dataConsistency.passed++;
        } else {
          logWarning(`No type definitions found in ${file}`);
          this.results.dataConsistency.warnings++;
        }
      }

      logSuccess('Data consistency validation completed');
    } catch (error) {
      logError(`Data consistency validation failed: ${error.message}`);
      this.results.dataConsistency.failed++;
    }
  }

  async validateAccessibility() {
    logSection('Accessibility Validation');

    try {
      // Check for accessibility attributes
      const componentFiles = this.findFiles('src/components', '.tsx');
      let accessibilityFeatures = 0;

      const accessibilityPatterns = [
        /aria-label/g,
        /aria-describedby/g,
        /role=/g,
        /tabIndex/g,
        /alt=/g
      ];

      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const pattern of accessibilityPatterns) {
          if (pattern.test(content)) {
            accessibilityFeatures++;
            break;
          }
        }
      }

      if (accessibilityFeatures > componentFiles.length * 0.5) {
        logSuccess(`Accessibility features found in ${accessibilityFeatures} components`);
        this.results.accessibility.passed++;
      } else {
        logWarning(`Limited accessibility features found (${accessibilityFeatures} components)`);
        this.results.accessibility.warnings++;
      }

      // Check for semantic HTML
      let semanticHtmlUsage = 0;
      const semanticTags = ['<main', '<nav', '<section', '<article', '<aside', '<header', '<footer'];

      for (const file of componentFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const tag of semanticTags) {
          if (content.includes(tag)) {
            semanticHtmlUsage++;
            break;
          }
        }
      }

      if (semanticHtmlUsage > 0) {
        logSuccess(`Semantic HTML used in ${semanticHtmlUsage} components`);
        this.results.accessibility.passed++;
      } else {
        logWarning('Limited semantic HTML usage found');
        this.results.accessibility.warnings++;
      }

    } catch (error) {
      logError(`Accessibility validation failed: ${error.message}`);
      this.results.accessibility.failed++;
    }
  }

  findFiles(dir, extension) {
    const files = [];
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (stat.isFile() && item.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    }
    
    const fullDir = path.join(process.cwd(), dir);
    if (fs.existsSync(fullDir)) {
      traverse(fullDir);
    }
    
    return files;
  }

  generateReport() {
    logSection('Validation Report');

    const categories = Object.keys(this.results);
    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    for (const category of categories) {
      const result = this.results[category];
      totalPassed += result.passed;
      totalFailed += result.failed;
      totalWarnings += result.warnings;

      const total = result.passed + result.failed + result.warnings;
      const passRate = total > 0 ? ((result.passed / total) * 100).toFixed(1) : '0.0';

      log(`\n${category}:`);
      log(`  ✅ Passed: ${result.passed}`, 'green');
      log(`  ❌ Failed: ${result.failed}`, 'red');
      log(`  ⚠️  Warnings: ${result.warnings}`, 'yellow');
      log(`  📊 Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');
    }

    const overallTotal = totalPassed + totalFailed + totalWarnings;
    const overallPassRate = overallTotal > 0 ? ((totalPassed / overallTotal) * 100).toFixed(1) : '0.0';

    log(`\n${colors.bold}Overall Results:${colors.reset}`);
    log(`✅ Total Passed: ${totalPassed}`, 'green');
    log(`❌ Total Failed: ${totalFailed}`, 'red');
    log(`⚠️  Total Warnings: ${totalWarnings}`, 'yellow');
    log(`📊 Overall Pass Rate: ${overallPassRate}%`, overallPassRate >= 80 ? 'green' : overallPassRate >= 60 ? 'yellow' : 'red');

    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalPassed,
        totalFailed,
        totalWarnings,
        overallPassRate: parseFloat(overallPassRate)
      }
    };

    fs.writeFileSync('user-experience-validation-report.json', JSON.stringify(reportData, null, 2));
    logSuccess('Report saved to user-experience-validation-report.json');

    return totalFailed === 0;
  }

  async run() {
    log(`${colors.bold}User Experience Validation${colors.reset}`, 'blue');
    log('Validating user experience after mock data removal...\n');

    await this.validateMockDataRemoval();
    await this.validateLoadingStates();
    await this.validateErrorHandling();
    await this.validatePerformance();
    await this.validateDataConsistency();
    await this.validateAccessibility();

    const success = this.generateReport();

    if (success) {
      log(`\n${colors.bold}🎉 User Experience Validation Completed Successfully!${colors.reset}`, 'green');
      process.exit(0);
    } else {
      log(`\n${colors.bold}❌ User Experience Validation Failed${colors.reset}`, 'red');
      log('Please address the failed validations before proceeding.', 'red');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new UserExperienceValidator();
  validator.run().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = UserExperienceValidator;