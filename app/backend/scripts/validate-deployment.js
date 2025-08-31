#!/usr/bin/env node

/**
 * Deployment Validation Script for AI Content Moderation System
 * 
 * This script performs comprehensive validation of a deployed system
 * to ensure all components are working correctly.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DeploymentValidator {
  constructor(config) {
    this.config = config;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  async validate() {
    console.log('🚀 Starting deployment validation...\n');
    
    try {
      await this.validateSystemHealth();
      await this.validateDatabaseConnectivity();
      await this.validateRedisConnectivity();
      await this.validateVendorAPIs();
      await this.validateModerationPipeline();
      await this.validateFeatureFlags();
      await this.validateMonitoring();
      await this.validateSecurity();
      await this.validatePerformance();
      
      this.printSummary();
      
      if (this.results.failed > 0) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Validation failed with error:', error.message);
      process.exit(1);
    }
  }

  async validateSystemHealth() {
    console.log('🏥 Validating system health...');
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/health`, {
        timeout: 10000
      });
      
      if (response.status === 200 && response.data.status === 'healthy') {
        this.recordTest('System Health Check', 'passed', 'System is healthy');
        
        // Validate individual component health
        if (response.data.checks) {
          response.data.checks.forEach(check => {
            if (check.status === 'healthy') {
              this.recordTest(`${check.name} Health`, 'passed', `${check.name} is healthy`);
            } else {
              this.recordTest(`${check.name} Health`, 'failed', `${check.name} is unhealthy: ${check.error}`);
            }
          });
        }
      } else {
        this.recordTest('System Health Check', 'failed', `Unexpected health status: ${response.data.status}`);
      }
    } catch (error) {
      this.recordTest('System Health Check', 'failed', `Health check failed: ${error.message}`);
    }
  }

  async validateDatabaseConnectivity() {
    console.log('🗄️  Validating database connectivity...');
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/health/database`, {
        timeout: 5000,
        headers: this.getAuthHeaders()
      });
      
      if (response.status === 200) {
        this.recordTest('Database Connectivity', 'passed', 'Database is accessible');
        
        // Test basic database operations
        await this.testDatabaseOperations();
      } else {
        this.recordTest('Database Connectivity', 'failed', 'Database health check failed');
      }
    } catch (error) {
      this.recordTest('Database Connectivity', 'failed', `Database connection failed: ${error.message}`);
    }
  }

  async testDatabaseOperations() {
    try {
      // Test read operation
      const response = await axios.get(`${this.config.baseUrl}/api/moderation/stats`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.status === 200) {
        this.recordTest('Database Read Operations', 'passed', 'Database reads working');
      } else {
        this.recordTest('Database Read Operations', 'failed', 'Database read test failed');
      }
    } catch (error) {
      this.recordTest('Database Read Operations', 'failed', `Database read error: ${error.message}`);
    }
  }

  async validateRedisConnectivity() {
    console.log('🔴 Validating Redis connectivity...');
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/health/redis`, {
        timeout: 5000,
        headers: this.getAuthHeaders()
      });
      
      if (response.status === 200) {
        this.recordTest('Redis Connectivity', 'passed', 'Redis is accessible');
        
        // Test Redis operations
        await this.testRedisOperations();
      } else {
        this.recordTest('Redis Connectivity', 'failed', 'Redis health check failed');
      }
    } catch (error) {
      this.recordTest('Redis Connectivity', 'failed', `Redis connection failed: ${error.message}`);
    }
  }

  async testRedisOperations() {
    try {
      // Test cache operations through API
      const testKey = `deployment-test-${Date.now()}`;
      const testValue = 'deployment-validation';
      
      // This would typically be done through an admin endpoint
      const response = await axios.post(`${this.config.baseUrl}/api/admin/cache/test`, {
        key: testKey,
        value: testValue
      }, {
        headers: this.getAuthHeaders()
      });
      
      if (response.status === 200) {
        this.recordTest('Redis Operations', 'passed', 'Redis read/write working');
      } else {
        this.recordTest('Redis Operations', 'warning', 'Redis operations test endpoint not available');
      }
    } catch (error) {
      this.recordTest('Redis Operations', 'warning', `Redis operations test failed: ${error.message}`);
    }
  }

  async validateVendorAPIs() {
    console.log('🤖 Validating AI vendor APIs...');
    
    const vendors = ['openai', 'google_vision', 'aws_rekognition', 'perspective'];
    
    for (const vendor of vendors) {
      try {
        const response = await axios.get(`${this.config.baseUrl}/health/vendors/${vendor}`, {
          timeout: 10000,
          headers: this.getAuthHeaders()
        });
        
        if (response.status === 200 && response.data.status === 'healthy') {
          this.recordTest(`${vendor} API`, 'passed', `${vendor} API is accessible`);
        } else {
          this.recordTest(`${vendor} API`, 'failed', `${vendor} API health check failed`);
        }
      } catch (error) {
        this.recordTest(`${vendor} API`, 'failed', `${vendor} API error: ${error.message}`);
      }
    }
  }

  async validateModerationPipeline() {
    console.log('⚖️  Validating moderation pipeline...');
    
    try {
      // Test content submission and processing
      const testContent = {
        type: 'post',
        content: 'This is a test message for deployment validation',
        metadata: { source: 'deployment-test' }
      };
      
      const submission = await axios.post(`${this.config.baseUrl}/api/content`, testContent, {
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      
      if (submission.status === 200 && submission.data.submissionId) {
        this.recordTest('Content Submission', 'passed', 'Content submission working');
        
        // Wait for processing and check status
        await this.validateContentProcessing(submission.data.submissionId);
      } else {
        this.recordTest('Content Submission', 'failed', 'Content submission failed');
      }
    } catch (error) {
      this.recordTest('Content Submission', 'failed', `Content submission error: ${error.message}`);
    }
  }

  async validateContentProcessing(submissionId) {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${this.config.baseUrl}/api/moderation/${submissionId}`, {
          headers: this.getAuthHeaders()
        });
        
        if (response.data.status !== 'pending') {
          if (['allowed', 'quarantined', 'blocked'].includes(response.data.status)) {
            this.recordTest('Content Processing', 'passed', `Content processed with status: ${response.data.status}`);
          } else {
            this.recordTest('Content Processing', 'failed', `Unexpected processing status: ${response.data.status}`);
          }
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        this.recordTest('Content Processing', 'failed', `Content processing check failed: ${error.message}`);
        return;
      }
    }
    
    this.recordTest('Content Processing', 'failed', 'Content processing timed out');
  }

  async validateFeatureFlags() {
    console.log('🚩 Validating feature flags...');
    
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/admin/flags`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.status === 200 && response.data.flags) {
        this.recordTest('Feature Flags System', 'passed', 'Feature flags system accessible');
        
        // Validate critical flags are present
        const criticalFlags = [
          'ai_moderation_enabled',
          'human_review_queue',
          'appeals_system',
          'marketplace_protection'
        ];
        
        criticalFlags.forEach(flagName => {
          const flag = response.data.flags.find(f => f.name === flagName);
          if (flag) {
            this.recordTest(`Feature Flag: ${flagName}`, 'passed', `Flag configured: ${flag.enabled}`);
          } else {
            this.recordTest(`Feature Flag: ${flagName}`, 'warning', 'Flag not found');
          }
        });
      } else {
        this.recordTest('Feature Flags System', 'failed', 'Feature flags system not accessible');
      }
    } catch (error) {
      this.recordTest('Feature Flags System', 'failed', `Feature flags error: ${error.message}`);
    }
  }

  async validateMonitoring() {
    console.log('📊 Validating monitoring and metrics...');
    
    try {
      // Check metrics endpoint
      const metricsResponse = await axios.get(`${this.config.baseUrl}/metrics`, {
        timeout: 5000
      });
      
      if (metricsResponse.status === 200) {
        this.recordTest('Metrics Endpoint', 'passed', 'Metrics endpoint accessible');
        
        // Check for key metrics
        const metricsText = metricsResponse.data;
        const keyMetrics = [
          'moderation_requests_total',
          'moderation_request_duration_seconds',
          'moderation_queue_size'
        ];
        
        keyMetrics.forEach(metric => {
          if (metricsText.includes(metric)) {
            this.recordTest(`Metric: ${metric}`, 'passed', 'Metric available');
          } else {
            this.recordTest(`Metric: ${metric}`, 'warning', 'Metric not found');
          }
        });
      } else {
        this.recordTest('Metrics Endpoint', 'failed', 'Metrics endpoint not accessible');
      }
    } catch (error) {
      this.recordTest('Metrics Endpoint', 'failed', `Metrics error: ${error.message}`);
    }
  }

  async validateSecurity() {
    console.log('🔒 Validating security measures...');
    
    try {
      // Test authentication requirement
      const unauthenticatedResponse = await axios.get(`${this.config.baseUrl}/api/moderation/queue`, {
        validateStatus: () => true // Don't throw on 401
      });
      
      if (unauthenticatedResponse.status === 401) {
        this.recordTest('Authentication Required', 'passed', 'Endpoints properly protected');
      } else {
        this.recordTest('Authentication Required', 'failed', 'Endpoints not properly protected');
      }
      
      // Test rate limiting (if configured)
      await this.testRateLimiting();
      
    } catch (error) {
      this.recordTest('Security Validation', 'failed', `Security test error: ${error.message}`);
    }
  }

  async testRateLimiting() {
    try {
      const requests = [];
      const testCount = 10;
      
      // Make multiple rapid requests
      for (let i = 0; i < testCount; i++) {
        requests.push(
          axios.get(`${this.config.baseUrl}/api/moderation/stats`, {
            headers: this.getAuthHeaders(),
            validateStatus: () => true
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      if (rateLimited.length > 0) {
        this.recordTest('Rate Limiting', 'passed', 'Rate limiting is active');
      } else {
        this.recordTest('Rate Limiting', 'warning', 'Rate limiting not detected (may not be configured)');
      }
    } catch (error) {
      this.recordTest('Rate Limiting', 'warning', `Rate limiting test failed: ${error.message}`);
    }
  }

  async validatePerformance() {
    console.log('⚡ Validating performance...');
    
    try {
      const startTime = Date.now();
      
      const response = await axios.get(`${this.config.baseUrl}/health`, {
        timeout: 5000
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        if (responseTime < 1000) {
          this.recordTest('Response Time', 'passed', `Response time: ${responseTime}ms`);
        } else if (responseTime < 3000) {
          this.recordTest('Response Time', 'warning', `Slow response time: ${responseTime}ms`);
        } else {
          this.recordTest('Response Time', 'failed', `Very slow response time: ${responseTime}ms`);
        }
      }
    } catch (error) {
      this.recordTest('Response Time', 'failed', `Performance test failed: ${error.message}`);
    }
  }

  getAuthHeaders() {
    if (this.config.authToken) {
      return {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json'
      };
    }
    return {
      'Content-Type': 'application/json'
    };
  }

  recordTest(name, status, message) {
    const test = { name, status, message, timestamp: new Date().toISOString() };
    this.results.tests.push(test);
    
    switch (status) {
      case 'passed':
        this.results.passed++;
        console.log(`  ✅ ${name}: ${message}`);
        break;
      case 'failed':
        this.results.failed++;
        console.log(`  ❌ ${name}: ${message}`);
        break;
      case 'warning':
        this.results.warnings++;
        console.log(`  ⚠️  ${name}: ${message}`);
        break;
    }
  }

  printSummary() {
    console.log('\n📋 Validation Summary:');
    console.log(`  ✅ Passed: ${this.results.passed}`);
    console.log(`  ❌ Failed: ${this.results.failed}`);
    console.log(`  ⚠️  Warnings: ${this.results.warnings}`);
    console.log(`  📊 Total: ${this.results.tests.length}`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Deployment validation FAILED');
      console.log('Failed tests:');
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
    } else {
      console.log('\n✅ Deployment validation PASSED');
      if (this.results.warnings > 0) {
        console.log('Warnings to review:');
        this.results.tests
          .filter(t => t.status === 'warning')
          .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
      }
    }
    
    // Save results to file
    const resultsFile = path.join(__dirname, '..', 'logs', `validation-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
  }
}

// Configuration
const config = {
  baseUrl: process.env.VALIDATION_BASE_URL || 'http://localhost:3000',
  authToken: process.env.VALIDATION_AUTH_TOKEN || null,
  environment: process.env.NODE_ENV || 'development'
};

// Run validation
const validator = new DeploymentValidator(config);
validator.validate().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
});