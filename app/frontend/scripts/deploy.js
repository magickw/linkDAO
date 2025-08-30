#!/usr/bin/env node

/**
 * Deployment Script for Social Dashboard
 * 
 * This script handles the complete deployment process including:
 * - Environment validation
 * - Build optimization
 * - Performance checks
 * - Bundle analysis
 * - Deployment to various platforms
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { deployConfig } = require('../deploy.config.js');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class DeploymentManager {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.deployEnv = process.env.DEPLOY_ENV || this.environment;
    this.config = deployConfig.environments[this.deployEnv] || deployConfig.environments.development;
    this.startTime = Date.now();
  }

  // Log with colors
  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  // Log step with formatting
  logStep(step, message) {
    this.log(`\n${colors.bright}[${step}]${colors.reset} ${message}`, 'cyan');
  }

  // Log success
  logSuccess(message) {
    this.log(`✅ ${message}`, 'green');
  }

  // Log warning
  logWarning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
  }

  // Log error
  logError(message) {
    this.log(`❌ ${message}`, 'red');
  }

  // Execute command with error handling
  exec(command, options = {}) {
    try {
      this.log(`Executing: ${command}`, 'blue');
      const result = execSync(command, { 
        stdio: 'inherit', 
        encoding: 'utf8',
        ...options 
      });
      return result;
    } catch (error) {
      this.logError(`Command failed: ${command}`);
      throw error;
    }
  }

  // Validate environment
  validateEnvironment() {
    this.logStep('1', 'Validating Environment');

    // Check Node.js version
    const nodeVersion = process.version;
    const requiredNodeVersion = '18.0.0';
    if (nodeVersion < `v${requiredNodeVersion}`) {
      throw new Error(`Node.js ${requiredNodeVersion} or higher is required. Current: ${nodeVersion}`);
    }
    this.logSuccess(`Node.js version: ${nodeVersion}`);

    // Check npm version
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      this.logSuccess(`npm version: ${npmVersion}`);
    } catch (error) {
      throw new Error('npm is not installed or not accessible');
    }

    // Check required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_WS_URL',
      'NEXT_PUBLIC_CHAIN_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
    this.logSuccess('All required environment variables are set');

    // Validate configuration
    if (!this.config.apiUrl || !this.config.wsUrl) {
      throw new Error('Invalid deployment configuration');
    }
    this.logSuccess(`Deployment environment: ${this.deployEnv}`);
  }

  // Install dependencies
  installDependencies() {
    this.logStep('2', 'Installing Dependencies');

    // Clean install for production
    if (this.environment === 'production') {
      this.exec('npm ci --only=production');
    } else {
      this.exec('npm install');
    }

    this.logSuccess('Dependencies installed successfully');
  }

  // Run tests
  runTests() {
    this.logStep('3', 'Running Tests');

    try {
      // Run unit tests
      this.exec('npm run test:unit -- --passWithNoTests --watchAll=false');
      this.logSuccess('Unit tests passed');

      // Run integration tests if available
      try {
        this.exec('npm run test:integration -- --passWithNoTests --watchAll=false');
        this.logSuccess('Integration tests passed');
      } catch (error) {
        this.logWarning('Integration tests failed or not available');
      }

      // Run accessibility tests
      try {
        this.exec('npm run test:accessibility -- --passWithNoTests --watchAll=false');
        this.logSuccess('Accessibility tests passed');
      } catch (error) {
        this.logWarning('Accessibility tests failed or not available');
      }
    } catch (error) {
      if (process.env.SKIP_TESTS === 'true') {
        this.logWarning('Tests failed but SKIP_TESTS is enabled');
      } else {
        throw new Error('Tests failed. Set SKIP_TESTS=true to skip tests.');
      }
    }
  }

  // Build application
  buildApplication() {
    this.logStep('4', 'Building Application');

    // Set build environment variables
    process.env.NODE_ENV = 'production';
    process.env.NEXT_TELEMETRY_DISABLED = '1';

    // Build with optimizations
    this.exec('npm run build');
    this.logSuccess('Application built successfully');

    // Check build output
    const buildDir = path.join(process.cwd(), '.next');
    if (!fs.existsSync(buildDir)) {
      throw new Error('Build output directory not found');
    }

    // Get build stats
    const buildStatsPath = path.join(buildDir, 'build-manifest.json');
    if (fs.existsSync(buildStatsPath)) {
      const buildStats = JSON.parse(fs.readFileSync(buildStatsPath, 'utf8'));
      this.logSuccess(`Build manifest created with ${Object.keys(buildStats.pages).length} pages`);
    }
  }

  // Analyze bundle
  analyzeBundle() {
    this.logStep('5', 'Analyzing Bundle');

    try {
      // Run bundle analyzer
      process.env.ANALYZE = 'true';
      this.exec('npm run build');
      
      const reportPath = path.join(process.cwd(), 'bundle-analyzer-report.html');
      if (fs.existsSync(reportPath)) {
        this.logSuccess('Bundle analysis report generated');
        this.log(`Report available at: ${reportPath}`, 'blue');
      }
    } catch (error) {
      this.logWarning('Bundle analysis failed');
    } finally {
      delete process.env.ANALYZE;
    }

    // Check bundle sizes
    this.checkBundleSizes();
  }

  // Check bundle sizes against budgets
  checkBundleSizes() {
    const buildDir = path.join(process.cwd(), '.next');
    const staticDir = path.join(buildDir, 'static');

    if (!fs.existsSync(staticDir)) {
      this.logWarning('Static build directory not found');
      return;
    }

    // Check JavaScript bundles
    const jsDir = path.join(staticDir, 'chunks');
    if (fs.existsSync(jsDir)) {
      const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
      let totalSize = 0;
      let largestFile = { name: '', size: 0 };

      jsFiles.forEach(file => {
        const filePath = path.join(jsDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;

        if (stats.size > largestFile.size) {
          largestFile = { name: file, size: stats.size };
        }
      });

      const budgetSize = deployConfig.buildOptimizations.bundleSizeWarnings.maxAssetSize * 1024;
      
      if (totalSize > budgetSize) {
        this.logWarning(`Total bundle size (${(totalSize / 1024).toFixed(1)}KB) exceeds budget (${budgetSize / 1024}KB)`);
      } else {
        this.logSuccess(`Bundle size within budget: ${(totalSize / 1024).toFixed(1)}KB`);
      }

      if (largestFile.size > budgetSize) {
        this.logWarning(`Largest chunk (${largestFile.name}: ${(largestFile.size / 1024).toFixed(1)}KB) exceeds budget`);
      }
    }
  }

  // Run performance checks
  runPerformanceChecks() {
    this.logStep('6', 'Running Performance Checks');

    try {
      // Start the application for testing
      const server = this.exec('npm start &', { stdio: 'ignore' });
      
      // Wait for server to start
      setTimeout(() => {
        try {
          // Run Lighthouse audit (if available)
          this.exec('npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"');
          this.logSuccess('Lighthouse audit completed');
        } catch (error) {
          this.logWarning('Lighthouse audit failed or not available');
        }

        // Kill the server
        try {
          this.exec('pkill -f "npm start"');
        } catch (error) {
          // Ignore errors when killing the server
        }
      }, 5000);
    } catch (error) {
      this.logWarning('Performance checks failed');
    }
  }

  // Deploy to platform
  deployToPlatform() {
    this.logStep('7', 'Deploying to Platform');

    const platform = process.env.DEPLOY_PLATFORM || 'vercel';

    switch (platform.toLowerCase()) {
      case 'vercel':
        this.deployToVercel();
        break;
      case 'netlify':
        this.deployToNetlify();
        break;
      case 'docker':
        this.deployToDocker();
        break;
      default:
        this.logWarning(`Unknown deployment platform: ${platform}`);
        this.logSuccess('Build completed successfully. Manual deployment required.');
    }
  }

  // Deploy to Vercel
  deployToVercel() {
    try {
      // Check if Vercel CLI is available
      this.exec('vercel --version');

      // Deploy based on environment
      if (this.deployEnv === 'production') {
        this.exec('vercel --prod --yes');
      } else {
        this.exec('vercel --yes');
      }

      this.logSuccess('Deployed to Vercel successfully');
    } catch (error) {
      this.logError('Vercel deployment failed');
      throw error;
    }
  }

  // Deploy to Netlify
  deployToNetlify() {
    try {
      // Check if Netlify CLI is available
      this.exec('netlify --version');

      // Deploy based on environment
      if (this.deployEnv === 'production') {
        this.exec('netlify deploy --prod --dir=.next');
      } else {
        this.exec('netlify deploy --dir=.next');
      }

      this.logSuccess('Deployed to Netlify successfully');
    } catch (error) {
      this.logError('Netlify deployment failed');
      throw error;
    }
  }

  // Deploy to Docker
  deployToDocker() {
    try {
      // Build Docker image
      this.exec('docker build -t social-dashboard .');
      this.logSuccess('Docker image built successfully');

      // Tag and push if registry is configured
      const registry = process.env.DOCKER_REGISTRY;
      if (registry) {
        this.exec(`docker tag social-dashboard ${registry}/social-dashboard:latest`);
        this.exec(`docker push ${registry}/social-dashboard:latest`);
        this.logSuccess('Docker image pushed to registry');
      }
    } catch (error) {
      this.logError('Docker deployment failed');
      throw error;
    }
  }

  // Generate deployment report
  generateReport() {
    this.logStep('8', 'Generating Deployment Report');

    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;

    const report = {
      timestamp: new Date().toISOString(),
      environment: this.deployEnv,
      duration: `${duration.toFixed(2)}s`,
      nodeVersion: process.version,
      buildSuccess: true,
      deploymentUrl: process.env.VERCEL_URL || process.env.NETLIFY_URL || 'localhost:3000'
    };

    const reportPath = path.join(process.cwd(), 'deployment-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.logSuccess(`Deployment completed in ${duration.toFixed(2)}s`);
    this.log(`Report saved to: ${reportPath}`, 'blue');

    // Display summary
    this.log('\n' + '='.repeat(50), 'green');
    this.log('DEPLOYMENT SUMMARY', 'green');
    this.log('='.repeat(50), 'green');
    this.log(`Environment: ${this.deployEnv}`, 'cyan');
    this.log(`Duration: ${duration.toFixed(2)}s`, 'cyan');
    this.log(`URL: ${report.deploymentUrl}`, 'cyan');
    this.log('='.repeat(50), 'green');
  }

  // Main deployment process
  async deploy() {
    try {
      this.log('\n🚀 Starting Social Dashboard Deployment', 'bright');
      this.log(`Environment: ${this.deployEnv}`, 'cyan');
      this.log(`Timestamp: ${new Date().toISOString()}`, 'cyan');

      this.validateEnvironment();
      this.installDependencies();
      
      // Skip tests in CI if specified
      if (process.env.CI !== 'true' || process.env.SKIP_TESTS !== 'true') {
        this.runTests();
      }

      this.buildApplication();
      this.analyzeBundle();
      
      // Skip performance checks in CI
      if (process.env.CI !== 'true') {
        this.runPerformanceChecks();
      }

      this.deployToPlatform();
      this.generateReport();

      this.log('\n🎉 Deployment completed successfully!', 'green');
    } catch (error) {
      this.logError(`Deployment failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run deployment if called directly
if (require.main === module) {
  const deployment = new DeploymentManager();
  deployment.deploy();
}

module.exports = DeploymentManager;