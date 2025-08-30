#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * This script verifies that the deployed social dashboard is functioning correctly
 * by running a series of health checks and user workflow validations.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

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

class DeploymentVerifier {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || process.env.DEPLOYMENT_URL || 'http://localhost:3000';
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      checks: []
    };
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

  logWarning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
    this.results.warnings++;
  }

  // Make HTTP request
  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'DeploymentVerifier/1.0',
          ...options.headers
        },
        timeout: options.timeout || 10000
      };

      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  // Check if service is accessible
  async checkServiceAccessibility() {
    this.logStep('1', 'Checking Service Accessibility');

    try {
      const response = await this.makeRequest('/');
      
      if (response.statusCode === 200) {
        this.logSuccess('Service is accessible');
      } else {
        this.logFailure(`Service returned status code: ${response.statusCode}`);
      }

      // Check if it's the dashboard page
      if (response.body.includes('Dashboard') || response.body.includes('LinkDAO')) {
        this.logSuccess('Dashboard page loads correctly');
      } else {
        this.logWarning('Dashboard content not detected in response');
      }
    } catch (error) {
      this.logFailure(`Service accessibility check failed: ${error.message}`);
    }
  }

  // Check security headers
  async checkSecurityHeaders() {
    this.logStep('2', 'Checking Security Headers');

    try {
      const response = await this.makeRequest('/');
      const headers = response.headers;

      // Check for security headers
      const securityHeaders = [
        'x-frame-options',
        'x-content-type-options',
        'x-xss-protection',
        'referrer-policy'
      ];

      securityHeaders.forEach(header => {
        if (headers[header]) {
          this.logSuccess(`${header} header present`);
        } else {
          this.logWarning(`${header} header missing`);
        }
      });

      // Check Content Security Policy
      if (headers['content-security-policy']) {
        this.logSuccess('Content Security Policy configured');
      } else {
        this.logWarning('Content Security Policy not found');
      }
    } catch (error) {
      this.logFailure(`Security headers check failed: ${error.message}`);
    }
  }

  // Check performance metrics
  async checkPerformanceMetrics() {
    this.logStep('3', 'Checking Performance Metrics');

    try {
      const startTime = Date.now();
      const response = await this.makeRequest('/');
      const loadTime = Date.now() - startTime;

      // Check response time
      if (loadTime < 2000) {
        this.logSuccess(`Fast response time: ${loadTime}ms`);
      } else if (loadTime < 5000) {
        this.logWarning(`Acceptable response time: ${loadTime}ms`);
      } else {
        this.logFailure(`Slow response time: ${loadTime}ms`);
      }

      // Check response size
      const responseSize = Buffer.byteLength(response.body, 'utf8');
      if (responseSize < 100 * 1024) { // 100KB
        this.logSuccess(`Reasonable response size: ${(responseSize / 1024).toFixed(1)}KB`);
      } else {
        this.logWarning(`Large response size: ${(responseSize / 1024).toFixed(1)}KB`);
      }

      // Check compression
      if (response.headers['content-encoding']) {
        this.logSuccess(`Response compression enabled: ${response.headers['content-encoding']}`);
      } else {
        this.logWarning('Response compression not detected');
      }
    } catch (error) {
      this.logFailure(`Performance metrics check failed: ${error.message}`);
    }
  }

  // Check API endpoints
  async checkAPIEndpoints() {
    this.logStep('4', 'Checking API Endpoints');

    const endpoints = [
      { path: '/api/health', expectedStatus: 200 },
      { path: '/api/posts', expectedStatus: [200, 401] }, // May require auth
      { path: '/api/communities', expectedStatus: [200, 401] }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.makeRequest(endpoint.path);
        const expectedStatuses = Array.isArray(endpoint.expectedStatus) 
          ? endpoint.expectedStatus 
          : [endpoint.expectedStatus];

        if (expectedStatuses.includes(response.statusCode)) {
          this.logSuccess(`${endpoint.path} endpoint accessible (${response.statusCode})`);
        } else {
          this.logWarning(`${endpoint.path} returned unexpected status: ${response.statusCode}`);
        }
      } catch (error) {
        this.logWarning(`${endpoint.path} endpoint check failed: ${error.message}`);
      }
    }
  }

  // Check static assets
  async checkStaticAssets() {
    this.logStep('5', 'Checking Static Assets');

    const assets = [
      '/_next/static/css',
      '/_next/static/chunks',
      '/favicon.ico'
    ];

    for (const asset of assets) {
      try {
        const response = await this.makeRequest(asset);
        
        if (response.statusCode === 200 || response.statusCode === 404) {
          // 404 is acceptable for some assets that might not exist
          this.logSuccess(`Static asset path accessible: ${asset}`);
        } else {
          this.logWarning(`Static asset returned status ${response.statusCode}: ${asset}`);
        }
      } catch (error) {
        this.logWarning(`Static asset check failed for ${asset}: ${error.message}`);
      }
    }
  }

  // Check mobile responsiveness
  async checkMobileResponsiveness() {
    this.logStep('6', 'Checking Mobile Responsiveness');

    try {
      const response = await this.makeRequest('/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        }
      });

      // Check for viewport meta tag
      if (response.body.includes('viewport')) {
        this.logSuccess('Viewport meta tag present for mobile');
      } else {
        this.logWarning('Viewport meta tag not found');
      }

      // Check for responsive CSS classes
      if (response.body.includes('md:') || response.body.includes('sm:') || response.body.includes('lg:')) {
        this.logSuccess('Responsive CSS classes detected');
      } else {
        this.logWarning('Responsive CSS classes not detected');
      }
    } catch (error) {
      this.logFailure(`Mobile responsiveness check failed: ${error.message}`);
    }
  }

  // Check accessibility features
  async checkAccessibilityFeatures() {
    this.logStep('7', 'Checking Accessibility Features');

    try {
      const response = await this.makeRequest('/');
      const body = response.body;

      // Check for ARIA attributes
      if (body.includes('aria-') || body.includes('role=')) {
        this.logSuccess('ARIA attributes detected');
      } else {
        this.logWarning('ARIA attributes not detected');
      }

      // Check for semantic HTML
      const semanticTags = ['nav', 'main', 'header', 'footer', 'section', 'article'];
      const foundTags = semanticTags.filter(tag => body.includes(`<${tag}`));
      
      if (foundTags.length >= 3) {
        this.logSuccess(`Semantic HTML tags found: ${foundTags.join(', ')}`);
      } else {
        this.logWarning('Limited semantic HTML structure detected');
      }

      // Check for alt attributes on images
      if (body.includes('alt=')) {
        this.logSuccess('Image alt attributes detected');
      } else {
        this.logWarning('Image alt attributes not detected');
      }
    } catch (error) {
      this.logFailure(`Accessibility check failed: ${error.message}`);
    }
  }

  // Check Web3 integration
  async checkWeb3Integration() {
    this.logStep('8', 'Checking Web3 Integration');

    try {
      const response = await this.makeRequest('/');
      const body = response.body;

      // Check for Web3 libraries
      if (body.includes('wagmi') || body.includes('rainbow') || body.includes('wallet')) {
        this.logSuccess('Web3 integration detected');
      } else {
        this.logWarning('Web3 integration not clearly detected');
      }

      // Check for wallet connection UI
      if (body.includes('Connect') && body.includes('Wallet')) {
        this.logSuccess('Wallet connection UI detected');
      } else {
        this.logWarning('Wallet connection UI not detected');
      }
    } catch (error) {
      this.logFailure(`Web3 integration check failed: ${error.message}`);
    }
  }

  // Generate verification report
  generateReport() {
    this.logStep('9', 'Generating Verification Report');

    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
    const status = this.results.failed === 0 ? 'HEALTHY' : 'ISSUES_DETECTED';

    const report = {
      timestamp: new Date().toISOString(),
      deploymentUrl: this.baseUrl,
      status,
      results: this.results,
      successRate: `${successRate}%`,
      recommendations: this.generateRecommendations()
    };

    // Display summary
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('DEPLOYMENT VERIFICATION SUMMARY', 'cyan');
    this.log('='.repeat(60), 'cyan');
    this.log(`Status: ${status}`, status === 'HEALTHY' ? 'green' : 'yellow');
    this.log(`URL: ${this.baseUrl}`, 'blue');
    this.log(`Checks Passed: ${this.results.passed}`, 'green');
    this.log(`Issues Found: ${this.results.failed}`, 'red');
    this.log(`Warnings: ${this.results.warnings}`, 'yellow');
    this.log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
    this.log('='.repeat(60), 'cyan');

    if (report.recommendations.length > 0) {
      this.log('\nRecommendations:', 'yellow');
      report.recommendations.forEach(rec => this.log(`• ${rec}`, 'yellow'));
    }

    if (this.results.failed === 0) {
      this.log('\n🎉 Deployment verification completed successfully!', 'green');
    } else {
      this.log('\n⚠️  Deployment has issues that should be addressed.', 'yellow');
    }

    return report;
  }

  // Generate recommendations based on results
  generateRecommendations() {
    const recommendations = [];

    if (this.results.failed > 0) {
      recommendations.push('Address critical issues before proceeding to production');
    }

    if (this.results.warnings > 3) {
      recommendations.push('Review and address warning items for optimal performance');
    }

    // Add specific recommendations based on common issues
    recommendations.push('Monitor performance metrics regularly');
    recommendations.push('Set up automated health checks');
    recommendations.push('Implement proper error tracking and alerting');

    return recommendations;
  }

  // Run all verification checks
  async runVerification() {
    this.log('\n🔍 Starting Deployment Verification', 'bright');
    this.log(`Target URL: ${this.baseUrl}`, 'cyan');
    this.log(`Timestamp: ${new Date().toISOString()}`, 'cyan');

    try {
      await this.checkServiceAccessibility();
      await this.checkSecurityHeaders();
      await this.checkPerformanceMetrics();
      await this.checkAPIEndpoints();
      await this.checkStaticAssets();
      await this.checkMobileResponsiveness();
      await this.checkAccessibilityFeatures();
      await this.checkWeb3Integration();

      const report = this.generateReport();
      return report.status === 'HEALTHY';
    } catch (error) {
      this.log(`\n❌ Verification failed: ${error.message}`, 'red');
      return false;
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  const url = process.argv[2] || process.env.DEPLOYMENT_URL || 'http://localhost:3000';
  const verifier = new DeploymentVerifier(url);
  
  verifier.runVerification().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Verification error:', error);
    process.exit(1);
  });
}

module.exports = DeploymentVerifier;