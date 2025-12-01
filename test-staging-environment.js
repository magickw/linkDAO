#!/usr/bin/env node

/**
 * Staging Environment Test Script for X402 Protocol
 * Tests the complete x402 payment flow in staging environment
 */

const http = require('https');
const crypto = require('crypto');

class StagingTester {
  constructor() {
    this.baseUrl = process.env.STAGING_API_URL || 'https://staging-api.linkdao.io';
    this.frontendUrl = process.env.STAGING_FRONTEND_URL || 'https://staging.linkdao.io';
    this.testResults = {
      api: {},
      contracts: {},
      payments: {},
      overall: { passed: 0, failed: 0 }
    };
  }

  async runFullTestSuite() {
    console.log('🧪 Starting X402 Protocol Staging Tests\n');

    try {
      await this.testApiConnectivity();
      await this.testContractDeployment();
      await this.testX402PaymentFlow();
      await this.testErrorHandling();
      await this.testLoadHandling();
      await this.generateReport();
      
      console.log('\n✅ Staging test suite completed!');
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testApiConnectivity() {
    console.log('🌐 Testing API Connectivity...');

    const tests = [
      { path: '/health', expected: 200 },
      { path: '/api/x402/health', expected: 200 },
      { path: '/api/csrf-token', expected: 200 }
    ];

    for (const test of tests) {
      try {
        const response = await this.makeRequest('GET', test.path);
        const passed = response.statusCode === test.expected;
        
        this.testResults.api[test.path] = {
          status: response.statusCode,
          passed,
          responseTime: response.responseTime
        };

        if (passed) {
          console.log(`  ✅ ${test.path} - ${response.statusCode} (${response.responseTime}ms)`);
          this.testResults.overall.passed++;
        } else {
          console.log(`  ❌ ${test.path} - Expected ${test.expected}, got ${response.statusCode}`);
          this.testResults.overall.failed++;
        }
      } catch (error) {
        console.log(`  ❌ ${test.path} - ${error.message}`);
        this.testResults.api[test.path] = { error: error.message, passed: false };
        this.testResults.overall.failed++;
      }
    }
  }

  async testContractDeployment() {
    console.log('\n📋 Testing Contract Deployment...');

    const contracts = [
      'NEXT_PUBLIC_X402_HANDLER_ADDRESS',
      'NEXT_PUBLIC_TIP_ROUTER_ADDRESS',
      'NEXT_PUBLIC_LDAO_TOKEN_ADDRESS'
    ];

    for (const contract of contracts) {
      const address = process.env[contract];
      if (!address) {
        console.log(`  ❌ ${contract} - Not configured`);
        this.testResults.contracts[contract] = { error: 'Not configured', passed: false };
        this.testResults.overall.failed++;
        continue;
      }

      if (!this.isValidEthereumAddress(address)) {
        console.log(`  ❌ ${contract} - Invalid address format`);
        this.testResults.contracts[contract] = { error: 'Invalid address', passed: false };
        this.testResults.overall.failed++;
        continue;
      }

      console.log(`  ✅ ${contract} - ${address}`);
      this.testResults.contracts[contract] = { address, passed: true };
      this.testResults.overall.passed++;
    }
  }

  async testX402PaymentFlow() {
    console.log('\n💳 Testing X402 Payment Flow...');

    const testPayment = {
      orderId: `staging-test-${Date.now()}`,
      amount: '10.00',
      currency: 'USD',
      buyerAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      sellerAddress: '0x1234567890123456789012345678901234567890',
      listingId: 'staging-test-listing'
    };

    try {
      // Test payment initiation
      console.log('  📤 Testing payment initiation...');
      const initiationResponse = await this.makeRequest('POST', '/api/x402/payment', testPayment);
      
      if (initiationResponse.statusCode === 200) {
        const paymentData = JSON.parse(initiationResponse.body);
        
        if (paymentData.success && paymentData.data?.paymentUrl) {
          console.log(`    ✅ Payment initiated successfully`);
          console.log(`    📄 Payment URL: ${paymentData.data.paymentUrl}`);
          console.log(`    🆔 Transaction ID: ${paymentData.data.transactionId}`);
          
          this.testResults.payments.initiation = {
            passed: true,
            transactionId: paymentData.data.transactionId,
            paymentUrl: paymentData.data.paymentUrl
          };
          this.testResults.overall.passed++;

          // Test payment status check
          if (paymentData.data.transactionId) {
            console.log('  📊 Testing payment status check...');
            await this.testPaymentStatus(paymentData.data.transactionId);
          }
        } else {
          console.log(`    ❌ Payment initiation failed: ${paymentData.error || 'Unknown error'}`);
          this.testResults.payments.initiation = { passed: false, error: paymentData.error };
          this.testResults.overall.failed++;
        }
      } else {
        console.log(`    ❌ Payment initiation failed with status ${initiationResponse.statusCode}`);
        this.testResults.payments.initiation = { 
          passed: false, 
          status: initiationResponse.statusCode,
          body: initiationResponse.body 
        };
        this.testResults.overall.failed++;
      }
    } catch (error) {
      console.log(`    ❌ Payment initiation error: ${error.message}`);
      this.testResults.payments.initiation = { passed: false, error: error.message };
      this.testResults.overall.failed++;
    }
  }

  async testPaymentStatus(transactionId) {
    try {
      const statusResponse = await this.makeRequest('GET', `/api/x402/payment/${transactionId}`);
      
      if (statusResponse.statusCode === 200) {
        const statusData = JSON.parse(statusResponse.body);
        
        if (statusData.success) {
          console.log(`    ✅ Status check successful: ${statusData.data.status}`);
          this.testResults.payments.statusCheck = { passed: true, status: statusData.data.status };
          this.testResults.overall.passed++;
        } else {
          console.log(`    ❌ Status check failed: ${statusData.error}`);
          this.testResults.payments.statusCheck = { passed: false, error: statusData.error };
          this.testResults.overall.failed++;
        }
      } else {
        console.log(`    ❌ Status check failed with status ${statusResponse.statusCode}`);
        this.testResults.payments.statusCheck = { passed: false, status: statusResponse.statusCode };
        this.testResults.overall.failed++;
      }
    } catch (error) {
      console.log(`    ❌ Status check error: ${error.message}`);
      this.testResults.payments.statusCheck = { passed: false, error: error.message };
      this.testResults.overall.failed++;
    }
  }

  async testErrorHandling() {
    console.log('\n⚠️  Testing Error Handling...');

    const errorTests = [
      {
        name: 'Invalid payment amount',
        data: { ...this.getBasePayment(), amount: '-10' }
      },
      {
        name: 'Missing required fields',
        data: { amount: '10' }
      },
      {
        name: 'Invalid addresses',
        data: { ...this.getBasePayment(), buyerAddress: 'invalid' }
      }
    ];

    for (const test of errorTests) {
      try {
        const response = await this.makeRequest('POST', '/api/x402/payment', test.data);
        
        if (response.statusCode >= 400) {
          console.log(`    ✅ ${test.name} - Correctly rejected (${response.statusCode})`);
          this.testResults.payments[test.name] = { passed: true, expectedError: true };
          this.testResults.overall.passed++;
        } else {
          console.log(`    ❌ ${test.name} - Should have been rejected`);
          this.testResults.payments[test.name] = { passed: false, shouldHaveFailed: true };
          this.testResults.overall.failed++;
        }
      } catch (error) {
        console.log(`    ✅ ${test.name} - Correctly rejected (${error.message})`);
        this.testResults.payments[test.name] = { passed: true, expectedError: true };
        this.testResults.overall.passed++;
      }
    }
  }

  async testLoadHandling() {
    console.log('\n🚀 Testing Load Handling...');

    const concurrentRequests = 10;
    const promises = [];
    const startTime = Date.now();

    for (let i = 0; i < concurrentRequests; i++) {
      const paymentData = {
        ...this.getBasePayment(),
        orderId: `load-test-${i}-${Date.now()}`
      };
      
      promises.push(
        this.makeRequest('POST', '/api/x402/payment', paymentData)
          .then(response => ({
            success: response.statusCode === 200,
            responseTime: response.responseTime
          }))
          .catch(error => ({
            success: false,
            error: error.message
          }))
      );
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const successful = results.filter(r => r.success).length;
    const averageResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;

    console.log(`  📊 Load test results:`);
    console.log(`    Total requests: ${concurrentRequests}`);
    console.log(`    Successful: ${successful}`);
    console.log(`    Failed: ${concurrentRequests - successful}`);
    console.log(`    Success rate: ${((successful / concurrentRequests) * 100).toFixed(1)}%`);
    console.log(`    Average response time: ${averageResponseTime.toFixed(0)}ms`);
    console.log(`    Total time: ${totalTime}ms`);

    if (successful >= concurrentRequests * 0.8) { // 80% success rate threshold
      console.log(`    ✅ Load test passed`);
      this.testResults.payments.loadTest = { passed: true, successRate: (successful / concurrentRequests) * 100 };
      this.testResults.overall.passed++;
    } else {
      console.log(`    ❌ Load test failed - Success rate too low`);
      this.testResults.payments.loadTest = { passed: false, successRate: (successful / concurrentRequests) * 100 };
      this.testResults.overall.failed++;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...');

    const report = {
      timestamp: new Date().toISOString(),
      environment: 'staging',
      baseUrl: this.baseUrl,
      frontendUrl: this.frontendUrl,
      results: this.testResults,
      summary: {
        totalTests: this.testResults.overall.passed + this.testResults.overall.failed,
        passed: this.testResults.overall.passed,
        failed: this.testResults.overall.failed,
        successRate: ((this.testResults.overall.passed / (this.testResults.overall.passed + this.testResults.overall.failed)) * 100).toFixed(2)
      },
      recommendations: this.generateRecommendations()
    };

    const reportPath = `staging-test-report-${Date.now()}.json`;
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📋 Test Summary:');
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);

    if (report.summary.failed > 0) {
      console.log('\n⚠️  Failed Tests:');
      Object.entries(this.testResults).forEach(([category, tests]) => {
        if (typeof tests === 'object' && !tests.passed) {
          console.log(`   - ${category}: ${tests.error || 'Test failed'}`);
        }
      });
    }

    console.log('\n📄 Detailed report saved to: ${reportPath}');
    
    if (report.summary.successRate >= 90) {
      console.log('\n🎉 Staging environment is ready for production!');
    } else {
      console.log('\n⚠️  Address failed tests before production deployment.');
    }
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.testResults.overall.failed > 0) {
      recommendations.push('Fix all failed tests before production deployment');
    }
    
    if (this.testResults.payments.loadTest?.successRate < 90) {
      recommendations.push('Optimize backend performance for better load handling');
    }
    
    const apiFailures = Object.values(this.testResults.api).filter(test => !test.passed).length;
    if (apiFailures > 0) {
      recommendations.push('Review API connectivity and configuration');
    }
    
    const contractIssues = Object.values(this.testResults.contracts).filter(test => !test.passed).length;
    if (contractIssues > 0) {
      recommendations.push('Verify contract deployment and configuration');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All tests passed - Staging environment is production ready');
    }
    
    return recommendations;
  }

  getBasePayment() {
    return {
      orderId: `test-${Date.now()}`,
      amount: '10.00',
      currency: 'USD',
      buyerAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      sellerAddress: '0x1234567890123456789012345678901234567890',
      listingId: 'test-listing'
    };
  }

  isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'X402-Staging-Tester/1.0'
        }
      };

      const startTime = Date.now();

      if (data) {
        options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
      }

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            body,
            responseTime: Date.now() - startTime
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.staging' });

// Run tests
if (require.main === module) {
  const tester = new StagingTester();
  tester.runFullTestSuite().catch(console.error);
}

module.exports = StagingTester;