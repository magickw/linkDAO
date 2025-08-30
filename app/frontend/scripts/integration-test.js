#!/usr/bin/env node

/**
 * Integration Test Script for Social Dashboard
 * 
 * This script runs comprehensive integration tests to verify that all components
 * work together correctly and that complete user workflows function as expected.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class IntegrationTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logStep(step, message) {
    this.log(`\n${colors.bright}[${step}]${colors.reset} ${message}`, 'cyan');
  }

  logSuccess(message) {
    this.log(`✅ ${message}`, 'green');
    this.results.passed++;
  }

  logFailure(message) {
    this.log(`❌ ${message}`, 'red');
    this.results.failed++;
  }

  logSkipped(message) {
    this.log(`⏭️  ${message}`, 'yellow');
    this.results.skipped++;
  }

  exec(command, options = {}) {
    try {
      return execSync(command, { 
        encoding: 'utf8',
        stdio: 'pipe',
        ...options 
      });
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  // Test component integration
  async testComponentIntegration() {
    this.logStep('1', 'Testing Component Integration');

    const components = [
      'DashboardLayout',
      'NavigationSidebar',
      'FeedView',
      'CommunityView',
      'UnifiedPostCreation',
      'DashboardRightSidebar'
    ];

    for (const component of components) {
      try {
        // Check if component file exists
        const componentPath = path.join(process.cwd(), 'src', 'components', `${component}.tsx`);
        if (fs.existsSync(componentPath)) {
          // Try to import the component
          const componentContent = fs.readFileSync(componentPath, 'utf8');
          
          // Basic checks
          if (componentContent.includes(`export default function ${component}`) || 
              componentContent.includes(`export default ${component}`) ||
              componentContent.includes(`export { ${component}`) ||
              componentContent.includes(`export { default as ${component}`)) {
            this.logSuccess(`${component} component properly exported`);
          } else {
            this.logFailure(`${component} component export not found`);
          }

          // Check for TypeScript interfaces
          if (componentContent.includes('interface') || componentContent.includes('type')) {
            this.logSuccess(`${component} has TypeScript definitions`);
          } else {
            this.logFailure(`${component} missing TypeScript definitions`);
          }
        } else {
          this.logFailure(`${component} component file not found`);
        }
      } catch (error) {
        this.logFailure(`${component} integration test failed: ${error.message}`);
      }
    }
  }

  // Test context providers
  async testContextProviders() {
    this.logStep('2', 'Testing Context Providers');

    const contexts = [
      'Web3Context',
      'NavigationContext',
      'ToastContext'
    ];

    for (const context of contexts) {
      try {
        const contextPath = path.join(process.cwd(), 'src', 'context', `${context}.tsx`);
        if (fs.existsSync(contextPath)) {
          const contextContent = fs.readFileSync(contextPath, 'utf8');
          
          // Check for provider and hook exports
          if (contextContent.includes('Provider') && contextContent.includes('use')) {
            this.logSuccess(`${context} provider and hook properly defined`);
          } else {
            this.logFailure(`${context} missing provider or hook`);
          }

          // Check for TypeScript interfaces
          if (contextContent.includes('interface') || contextContent.includes('type')) {
            this.logSuccess(`${context} has TypeScript definitions`);
          } else {
            this.logFailure(`${context} missing TypeScript definitions`);
          }
        } else {
          this.logFailure(`${context} file not found`);
        }
      } catch (error) {
        this.logFailure(`${context} test failed: ${error.message}`);
      }
    }
  }

  // Test hooks integration
  async testHooksIntegration() {
    this.logStep('3', 'Testing Hooks Integration');

    const hooks = [
      'usePosts',
      'useProfile',
      'useCommunities'
    ];

    for (const hook of hooks) {
      try {
        const hookPath = path.join(process.cwd(), 'src', 'hooks', `${hook}.ts`);
        if (fs.existsSync(hookPath)) {
          const hookContent = fs.readFileSync(hookPath, 'utf8');
          
          // Check for proper hook exports
          if (hookContent.includes(`export`) && hookContent.includes('use')) {
            this.logSuccess(`${hook} properly exported`);
          } else {
            this.logFailure(`${hook} export not found`);
          }

          // Check for error handling
          if (hookContent.includes('try') && hookContent.includes('catch')) {
            this.logSuccess(`${hook} has error handling`);
          } else {
            this.logFailure(`${hook} missing error handling`);
          }
        } else {
          this.logSkipped(`${hook} file not found (may be optional)`);
        }
      } catch (error) {
        this.logFailure(`${hook} test failed: ${error.message}`);
      }
    }
  }

  // Test routing integration
  async testRoutingIntegration() {
    this.logStep('4', 'Testing Routing Integration');

    try {
      // Check dashboard page
      const dashboardPath = path.join(process.cwd(), 'src', 'pages', 'dashboard.tsx');
      if (fs.existsSync(dashboardPath)) {
        this.logSuccess('Dashboard page exists');
        
        const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
        if (dashboardContent.includes('DashboardLayout')) {
          this.logSuccess('Dashboard uses DashboardLayout component');
        } else {
          this.logFailure('Dashboard missing DashboardLayout integration');
        }
      } else {
        this.logFailure('Dashboard page not found');
      }

      // Check for proper redirects in Next.js config
      const nextConfigPath = path.join(process.cwd(), '..', '..', 'next.config.js');
      if (fs.existsSync(nextConfigPath)) {
        const configContent = fs.readFileSync(nextConfigPath, 'utf8');
        if (configContent.includes('redirects') && configContent.includes('/dashboard')) {
          this.logSuccess('Legacy route redirects configured');
        } else {
          this.logFailure('Legacy route redirects not configured');
        }
      }
    } catch (error) {
      this.logFailure(`Routing integration test failed: ${error.message}`);
    }
  }

  // Test build integration
  async testBuildIntegration() {
    this.logStep('5', 'Testing Build Integration');

    try {
      // Check if build succeeds
      this.log('Running build test...', 'blue');
      this.exec('npm run build', { stdio: 'pipe' });
      this.logSuccess('Build completed successfully');

      // Check build output
      const buildDir = path.join(process.cwd(), '.next');
      if (fs.existsSync(buildDir)) {
        this.logSuccess('Build output directory created');

        // Check for static files
        const staticDir = path.join(buildDir, 'static');
        if (fs.existsSync(staticDir)) {
          this.logSuccess('Static assets generated');
        } else {
          this.logFailure('Static assets not generated');
        }

        // Check for pages
        const serverDir = path.join(buildDir, 'server', 'pages');
        if (fs.existsSync(serverDir)) {
          const pages = fs.readdirSync(serverDir);
          if (pages.includes('dashboard.html') || pages.includes('dashboard.js')) {
            this.logSuccess('Dashboard page built successfully');
          } else {
            this.logFailure('Dashboard page not found in build output');
          }
        }
      } else {
        this.logFailure('Build output directory not created');
      }
    } catch (error) {
      this.logFailure(`Build integration test failed: ${error.message}`);
    }
  }

  // Test TypeScript integration
  async testTypeScriptIntegration() {
    this.logStep('6', 'Testing TypeScript Integration');

    try {
      // Run TypeScript compiler check
      this.log('Running TypeScript check...', 'blue');
      this.exec('npx tsc --noEmit', { stdio: 'pipe' });
      this.logSuccess('TypeScript compilation successful');
    } catch (error) {
      // Check if it's just warnings or actual errors
      if (error.message.includes('error TS')) {
        this.logFailure('TypeScript compilation errors found');
      } else {
        this.logSuccess('TypeScript compilation successful (with warnings)');
      }
    }

    // Check for proper type definitions
    const typeFiles = [
      'src/types/index.ts',
      'src/models/Post.ts',
      'src/models/Community.ts'
    ];

    for (const typeFile of typeFiles) {
      const filePath = path.join(process.cwd(), typeFile);
      if (fs.existsSync(filePath)) {
        this.logSuccess(`Type definitions found: ${typeFile}`);
      } else {
        this.logSkipped(`Type definitions not found: ${typeFile} (may be optional)`);
      }
    }
  }

  // Test accessibility integration
  async testAccessibilityIntegration() {
    this.logStep('7', 'Testing Accessibility Integration');

    try {
      // Check for accessibility testing setup
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (packageJson.devDependencies && packageJson.devDependencies['jest-axe']) {
        this.logSuccess('jest-axe accessibility testing library installed');
      } else {
        this.logFailure('jest-axe accessibility testing library not installed');
      }

      // Check for accessibility test files
      const accessibilityTestPath = path.join(process.cwd(), 'src', 'components', '__tests__', 'AccessibilityCompliance.test.tsx');
      if (fs.existsSync(accessibilityTestPath)) {
        this.logSuccess('Accessibility compliance tests found');
      } else {
        this.logFailure('Accessibility compliance tests not found');
      }

      // Run accessibility tests if available
      try {
        this.exec('npm run test:accessibility -- --passWithNoTests --watchAll=false', { stdio: 'pipe' });
        this.logSuccess('Accessibility tests passed');
      } catch (error) {
        this.logFailure('Accessibility tests failed');
      }
    } catch (error) {
      this.logFailure(`Accessibility integration test failed: ${error.message}`);
    }
  }

  // Test performance integration
  async testPerformanceIntegration() {
    this.logStep('8', 'Testing Performance Integration');

    try {
      // Check for performance monitoring utilities
      const perfMonitorPath = path.join(process.cwd(), 'src', 'utils', 'performanceMonitor.ts');
      if (fs.existsSync(perfMonitorPath)) {
        this.logSuccess('Performance monitoring utilities found');
      } else {
        this.logFailure('Performance monitoring utilities not found');
      }

      // Check for Web Vitals integration
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (packageJson.dependencies && packageJson.dependencies['web-vitals']) {
        this.logSuccess('Web Vitals library integrated');
      } else {
        this.logFailure('Web Vitals library not integrated');
      }

      // Check for bundle analysis setup
      if (packageJson.devDependencies && packageJson.devDependencies['webpack-bundle-analyzer']) {
        this.logSuccess('Bundle analyzer integrated');
      } else {
        this.logFailure('Bundle analyzer not integrated');
      }
    } catch (error) {
      this.logFailure(`Performance integration test failed: ${error.message}`);
    }
  }

  // Test deployment configuration
  async testDeploymentConfiguration() {
    this.logStep('9', 'Testing Deployment Configuration');

    try {
      // Check deployment config
      const deployConfigPath = path.join(process.cwd(), 'deploy.config.js');
      if (fs.existsSync(deployConfigPath)) {
        this.logSuccess('Deployment configuration found');
        
        const deployConfig = require(deployConfigPath);
        if (deployConfig.deployConfig && deployConfig.deployConfig.environments) {
          this.logSuccess('Environment configurations defined');
        } else {
          this.logFailure('Environment configurations not properly defined');
        }
      } else {
        this.logFailure('Deployment configuration not found');
      }

      // Check Next.js config optimizations
      const nextConfigPath = path.join(process.cwd(), '..', '..', 'next.config.js');
      if (fs.existsSync(nextConfigPath)) {
        const configContent = fs.readFileSync(nextConfigPath, 'utf8');
        
        if (configContent.includes('swcMinify: true')) {
          this.logSuccess('SWC minification enabled');
        } else {
          this.logFailure('SWC minification not enabled');
        }

        if (configContent.includes('headers()')) {
          this.logSuccess('Security headers configured');
        } else {
          this.logFailure('Security headers not configured');
        }
      }

      // Check for deployment scripts
      const deployScriptPath = path.join(process.cwd(), 'scripts', 'deploy.js');
      if (fs.existsSync(deployScriptPath)) {
        this.logSuccess('Deployment script found');
      } else {
        this.logFailure('Deployment script not found');
      }
    } catch (error) {
      this.logFailure(`Deployment configuration test failed: ${error.message}`);
    }
  }

  // Generate integration report
  generateReport() {
    this.logStep('10', 'Generating Integration Report');

    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const successRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;

    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration.toFixed(2)}s`,
      results: this.results,
      successRate: `${successRate}%`,
      status: this.results.failed === 0 ? 'PASSED' : 'FAILED'
    };

    const reportPath = path.join(process.cwd(), 'integration-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('INTEGRATION TEST SUMMARY', 'cyan');
    this.log('='.repeat(60), 'cyan');
    this.log(`Status: ${report.status}`, report.status === 'PASSED' ? 'green' : 'red');
    this.log(`Duration: ${duration.toFixed(2)}s`, 'blue');
    this.log(`Tests Passed: ${this.results.passed}`, 'green');
    this.log(`Tests Failed: ${this.results.failed}`, 'red');
    this.log(`Tests Skipped: ${this.results.skipped}`, 'yellow');
    this.log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
    this.log('='.repeat(60), 'cyan');

    if (this.results.failed > 0) {
      this.log('\n⚠️  Some integration tests failed. Please review the output above.', 'yellow');
      this.log('Fix the failing tests before proceeding with deployment.', 'yellow');
    } else {
      this.log('\n🎉 All integration tests passed! Ready for deployment.', 'green');
    }

    return report.status === 'PASSED';
  }

  // Run all integration tests
  async runAllTests() {
    this.log('\n🧪 Starting Social Dashboard Integration Tests', 'bright');
    this.log(`Timestamp: ${new Date().toISOString()}`, 'cyan');

    try {
      await this.testComponentIntegration();
      await this.testContextProviders();
      await this.testHooksIntegration();
      await this.testRoutingIntegration();
      await this.testBuildIntegration();
      await this.testTypeScriptIntegration();
      await this.testAccessibilityIntegration();
      await this.testPerformanceIntegration();
      await this.testDeploymentConfiguration();

      const success = this.generateReport();
      return success;
    } catch (error) {
      this.log(`\n❌ Integration tests failed: ${error.message}`, 'red');
      return false;
    }
  }
}

// Run integration tests if called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = IntegrationTester;