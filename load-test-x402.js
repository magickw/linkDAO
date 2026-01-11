#!/usr/bin/env node

/**
 * Load Testing Script for X402 Payment System
 * Tests concurrent payment processing with 100+ simultaneous requests
 */

const { performance } = require('perf_hooks');
const http = require('http');
const https = require('https');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

class LoadTestRunner {
  constructor() {
    this.baseUrl = process.env.TEST_API_URL || 'http://localhost:10000';
    this.concurrentUsers = parseInt(process.env.CONCURRENT_USERS) || 100;
    this.testDuration = parseInt(process.env.TEST_DURATION) || 30; // seconds
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errors: {}
    };
  }

  async runLoadTest() {
    console.log(`🚀 Starting Load Test with ${this.concurrentUsers} concurrent users`);
    console.log(`⏱️  Test duration: ${this.testDuration} seconds`);
    console.log(`🌐 Target API: ${this.baseUrl}\n`);

    const startTime = performance.now();
    const workers = [];
    const requestsPerWorker = Math.ceil(this.concurrentUsers / 4); // Use 4 workers

    // Create worker threads
    for (let i = 0; i < 4; i++) {
      const worker = new Worker(__filename, {
        workerData: {
          workerId: i,
          requests: requestsPerWorker,
          baseUrl: this.baseUrl,
          duration: this.testDuration * 1000
        }
      });

      workers.push(worker);
    }

    // Collect results from workers
    const workerResults = await Promise.all(
      workers.map(worker => 
        new Promise((resolve, reject) => {
          worker.on('message', resolve);
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
          });
        })
      )
    );

    // Aggregate results
    this.aggregateResults(workerResults);
    
    const endTime = performance.now();
    const totalDuration = (endTime - startTime) / 1000;

    this.results.requestsPerSecond = this.results.totalRequests / totalDuration;
    this.generateReport(totalDuration);

    // Cleanup workers
    workers.forEach(worker => worker.terminate());
  }

  aggregateResults(workerResults) {
    workerResults.forEach(result => {
      this.results.totalRequests += result.totalRequests;
      this.results.successfulRequests += result.successfulRequests;
      this.results.failedRequests += result.failedRequests;
      this.results.minResponseTime = Math.min(this.results.minResponseTime, result.minResponseTime);
      this.results.maxResponseTime = Math.max(this.results.maxResponseTime, result.maxResponseTime);
      
      // Aggregate average response time
      this.results.averageResponseTime += result.averageResponseTime;
      
      // Aggregate errors
      Object.keys(result.errors).forEach(errorType => {
        this.results.errors[errorType] = (this.results.errors[errorType] || 0) + result.errors[errorType];
      });
    });

    // Calculate final average response time
    this.results.averageResponseTime = this.results.averageResponseTime / workerResults.length;
  }

  generateReport(duration) {
    const report = {
      timestamp: new Date().toISOString(),
      testConfiguration: {
        concurrentUsers: this.concurrentUsers,
        duration: duration,
        baseUrl: this.baseUrl
      },
      results: this.results,
      successRate: (this.results.successfulRequests / this.results.totalRequests * 100).toFixed(2),
      recommendations: this.generateRecommendations()
    };

    const reportPath = `load-test-report-${Date.now()}.json`;
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Load Test Results:');
    console.log(`   Total Requests: ${this.results.totalRequests}`);
    console.log(`   Successful: ${this.results.successfulRequests}`);
    console.log(`   Failed: ${this.results.failedRequests}`);
    console.log(`   Success Rate: ${report.successRate}%`);
    console.log(`   Average Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`   Min Response Time: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`   Max Response Time: ${this.results.maxResponseTime.toFixed(2)}ms`);
    console.log(`   Requests/Second: ${this.results.requestsPerSecond.toFixed(2)}`);

    if (Object.keys(this.results.errors).length > 0) {
      console.log('\n❌ Errors:');
      Object.entries(this.results.errors).forEach(([error, count]) => {
        console.log(`   ${error}: ${count}`);
      });
    }

    console.log('\n📋 Recommendations:');
    report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  generateRecommendations() {
    const recommendations = [];
    const successRate = this.results.successfulRequests / this.results.totalRequests;

    if (successRate < 0.95) {
      recommendations.push('Success rate below 95%. Investigate server capacity and error handling.');
    }

    if (this.results.averageResponseTime > 5000) {
      recommendations.push('Average response time above 5s. Consider optimizing API endpoints.');
    }

    if (this.results.requestsPerSecond < 50) {
      recommendations.push('Low throughput. Consider scaling backend infrastructure.');
    }

    if (this.results.maxResponseTime > 10000) {
      recommendations.push('Very slow responses detected. Check for database bottlenecks.');
    }

    const commonErrors = Object.entries(this.results.errors)
      .filter(([_, count]) => count > this.results.totalRequests * 0.1)
      .map(([error, _]) => error);

    if (commonErrors.length > 0) {
      recommendations.push(`High error rates for: ${commonErrors.join(', ')}`);
    }

    if (recommendations.length === 0) {
      recommendations.push('System performs well under load. Ready for production.');
    }

    return recommendations;
  }
}

// Worker thread function
async function runWorker(workerData) {
  const { workerId, requests, baseUrl, duration } = workerData;
  const startTime = performance.now();
  const endTime = startTime + duration;
  
  const results = {
    workerId,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    responseTimes: [],
    errors: {}
  };

  const testPayment = {
    orderId: `load-test-${workerId}-${Date.now()}`,
    amount: '100.00',
    currency: 'USD',
    buyerAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
    sellerAddress: '0x1234567890123456789012345678901234567890',
    listingId: 'load-test-listing'
  };

  while (performance.now() < endTime && results.totalRequests < requests) {
    const requestStartTime = performance.now();
    
    try {
      const response = await makeHttpRequest(`${baseUrl}/api/x402-payments/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(testPayment)
      });

      const responseTime = performance.now() - requestStartTime;
      results.responseTimes.push(responseTime);
      results.totalRequests++;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
        const errorKey = `HTTP_${response.statusCode}`;
        results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
      }

      results.minResponseTime = Math.min(results.minResponseTime, responseTime);
      results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);

    } catch (error) {
      results.totalRequests++;
      results.failedRequests++;
      const errorKey = error.code || 'NETWORK_ERROR';
      results.errors[errorKey] = (results.errors[errorKey] || 0) + 1;
    }

    // Small delay to prevent overwhelming
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }

  // Calculate average response time
  if (results.responseTimes.length > 0) {
    results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
  }

  parentPort.postMessage(results);
}

function makeHttpRequest(url, options) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Main execution
if (isMainThread) {
  const runner = new LoadTestRunner();
  runner.runLoadTest().catch(console.error);
} else {
  runWorker(workerData).catch(console.error);
}