#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

class DeploymentMonitor {
  constructor(environment = 'production') {
    this.environment = environment;
    this.config = {
      staging: { url: 'https://staging.linkdao.io' },
      production: { url: 'https://linkdao.io' },
    };
    
    this.thresholds = {
      responseTime: 2000, // ms
      errorRate: 5, // %
      uptime: 99.9, // %
      memoryUsage: 80, // %
      cpuUsage: 80, // %
    };
    
    this.metrics = {
      requests: [],
      errors: [],
      performance: [],
      uptime: { total: 0, successful: 0 },
    };
    
    this.isMonitoring = false;
  }

  async startMonitoring(duration = 300000) { // 5 minutes default
    console.log(`📊 Starting deployment monitoring for ${this.environment}`);
    console.log(`⏱️  Duration: ${duration / 1000}s`);
    
    this.isMonitoring = true;
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    // Start monitoring loops
    const healthCheckInterval = setInterval(() => this.performHealthCheck(), 30000); // Every 30s
    const performanceCheckInterval = setInterval(() => this.performPerformanceCheck(), 60000); // Every 1min
    const metricsReportInterval = setInterval(() => this.reportMetrics(), 120000); // Every 2min
    
    // Monitor until duration expires
    while (Date.now() < endTime && this.isMonitoring) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10s
      
      // Check if we should stop monitoring due to critical issues
      if (this.shouldStopMonitoring()) {
        console.log('🚨 Critical issues detected - stopping monitoring');
        break;
      }
    }
    
    // Clean up intervals
    clearInterval(healthCheckInterval);
    clearInterval(performanceCheckInterval);
    clearInterval(metricsReportInterval);
    
    // Generate final report
    await this.generateFinalReport();
    
    this.isMonitoring = false;
  }

  async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      // Use AbortController for proper timeout handling with node-fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${this.config[this.environment].url}/api/health`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LinkDAO-Deployment-Monitor/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.metrics.uptime.total++;
      
      if (response.ok) {
        this.metrics.uptime.successful++;
        
        const healthData = await response.json();
        
        this.metrics.requests.push({
          timestamp: new Date().toISOString(),
          responseTime,
          status: response.status,
          success: true,
        });
        
        // Check response time threshold
        if (responseTime > this.thresholds.responseTime) {
          console.warn(`⚠️  Slow response: ${responseTime}ms (threshold: ${this.thresholds.responseTime}ms)`);
        }
        
        // Log health data
        if (healthData.memory && healthData.memory.usage > this.thresholds.memoryUsage) {
          console.warn(`⚠️  High memory usage: ${healthData.memory.usage}%`);
        }
        
      } else {
        this.recordError(`Health check failed: ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        this.recordError('Health check timed out after 10 seconds');
      } else {
        this.recordError(`Health check error: ${error.message}`);
      }
    }
  }

  async performPerformanceCheck() {
    try {
      // Check multiple endpoints for comprehensive performance monitoring
      const endpoints = [
        '/',
        '/api/health',
        '/api/feature-flags',
      ];
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        try {
          // Use AbortController for proper timeout handling
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
          
          const response = await fetch(`${this.config[this.environment].url}${endpoint}`, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'LinkDAO-Deployment-Monitor/1.0'
            }
          });
          
          clearTimeout(timeoutId);
          
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          this.metrics.performance.push({
            timestamp: new Date().toISOString(),
            endpoint,
            responseTime,
            status: response.status,
            success: response.ok,
          });
          
          if (!response.ok) {
            this.recordError(`Performance check failed for ${endpoint}: ${response.status}`);
          }
          
        } catch (error) {
          if (error.name === 'AbortError') {
            this.recordError(`Performance check timed out for ${endpoint} after 15 seconds`);
          } else {
            this.recordError(`Performance check error for ${endpoint}: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      console.error('Performance check failed:', error.message);
    }
  }

  recordError(message) {
    this.metrics.errors.push({
      timestamp: new Date().toISOString(),
      message,
    });
    
    console.error(`❌ ${message}`);
  }

  shouldStopMonitoring() {
    // Calculate current error rate
    const recentRequests = this.metrics.requests.filter(req => 
      Date.now() - new Date(req.timestamp).getTime() < 300000 // Last 5 minutes
    );
    
    const recentErrors = this.metrics.errors.filter(error => 
      Date.now() - new Date(error.timestamp).getTime() < 300000 // Last 5 minutes
    );
    
    if (recentRequests.length > 0) {
      const errorRate = (recentErrors.length / recentRequests.length) * 100;
      
      if (errorRate > this.thresholds.errorRate) {
        console.log(`🚨 Error rate ${errorRate.toFixed(2)}% exceeds threshold ${this.thresholds.errorRate}%`);
        return true;
      }
    }
    
    // Check uptime
    if (this.metrics.uptime.total > 0) {
      const uptime = (this.metrics.uptime.successful / this.metrics.uptime.total) * 100;
      
      if (uptime < this.thresholds.uptime) {
        console.log(`🚨 Uptime ${uptime.toFixed(2)}% below threshold ${this.thresholds.uptime}%`);
        return true;
      }
    }
    
    return false;
  }

  reportMetrics() {
    console.log('\n📊 Current Metrics:');
    
    // Uptime
    const uptime = this.metrics.uptime.total > 0 
      ? (this.metrics.uptime.successful / this.metrics.uptime.total) * 100 
      : 0;
    console.log(`   Uptime: ${uptime.toFixed(2)}% (${this.metrics.uptime.successful}/${this.metrics.uptime.total})`);
    
    // Response time
    const recentRequests = this.metrics.requests.filter(req => 
      Date.now() - new Date(req.timestamp).getTime() < 300000 // Last 5 minutes
    ).filter(req => req.success);
    
    if (recentRequests.length > 0) {
      const avgResponseTime = recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length;
      console.log(`   Avg Response Time: ${Math.round(avgResponseTime)}ms`);
    }
    
    // Error rate
    const recentErrors = this.metrics.errors.filter(error => 
      Date.now() - new Date(error.timestamp).getTime() < 300000 // Last 5 minutes
    );
    
    const errorRate = recentRequests.length > 0 
      ? (recentErrors.length / (recentRequests.length + recentErrors.length)) * 100 
      : 0;
    console.log(`   Error Rate: ${errorRate.toFixed(2)}%`);
    
    // Recent errors
    if (recentErrors.length > 0) {
      console.log(`   Recent Errors: ${recentErrors.length}`);
      recentErrors.slice(-3).forEach(error => {
        console.log(`     • ${error.message}`);
      });
    }
    
    console.log('');
  }

  async generateFinalReport() {
    console.log('\n📋 Final Deployment Monitoring Report');
    console.log('=====================================');
    
    // Overall statistics
    const totalRequests = this.metrics.requests.length;
    const totalErrors = this.metrics.errors.length;
    const overallUptime = this.metrics.uptime.total > 0 
      ? (this.metrics.uptime.successful / this.metrics.uptime.total) * 100 
      : 0;
    
    console.log(`Environment: ${this.environment}`);
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Overall Uptime: ${overallUptime.toFixed(2)}%`);
    
    // Response time statistics
    if (this.metrics.requests.length > 0) {
      const responseTimes = this.metrics.requests
        .filter(req => req.success)
        .map(req => req.responseTime);
      
      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const minResponseTime = Math.min(...responseTimes);
        const maxResponseTime = Math.max(...responseTimes);
        
        console.log(`\nResponse Time Statistics:`);
        console.log(`  Average: ${Math.round(avgResponseTime)}ms`);
        console.log(`  Minimum: ${minResponseTime}ms`);
        console.log(`  Maximum: ${maxResponseTime}ms`);
      }
    }
    
    // Performance by endpoint
    if (this.metrics.performance.length > 0) {
      console.log(`\nPerformance by Endpoint:`);
      
      const endpointStats = {};
      this.metrics.performance.forEach(perf => {
        if (!endpointStats[perf.endpoint]) {
          endpointStats[perf.endpoint] = {
            requests: 0,
            totalTime: 0,
            errors: 0,
          };
        }
        
        endpointStats[perf.endpoint].requests++;
        endpointStats[perf.endpoint].totalTime += perf.responseTime;
        
        if (!perf.success) {
          endpointStats[perf.endpoint].errors++;
        }
      });
      
      Object.entries(endpointStats).forEach(([endpoint, stats]) => {
        const avgTime = Math.round(stats.totalTime / stats.requests);
        const errorRate = (stats.errors / stats.requests) * 100;
        
        console.log(`  ${endpoint}: ${avgTime}ms avg, ${errorRate.toFixed(1)}% errors`);
      });
    }
    
    // Error summary
    if (this.metrics.errors.length > 0) {
      console.log(`\nError Summary:`);
      
      const errorTypes = {};
      this.metrics.errors.forEach(error => {
        const errorType = error.message.split(':')[0];
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      });
      
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} occurrences`);
      });
    }
    
    // Recommendations
    console.log(`\nRecommendations:`);
    
    if (overallUptime < this.thresholds.uptime) {
      console.log(`  ⚠️  Uptime is below threshold - investigate infrastructure issues`);
    }
    
    if (totalErrors > 0) {
      const errorRate = (totalErrors / (totalRequests + totalErrors)) * 100;
      if (errorRate > this.thresholds.errorRate) {
        console.log(`  ⚠️  Error rate is high - review application logs`);
      }
    }
    
    const avgResponseTime = this.metrics.requests.length > 0
      ? this.metrics.requests.reduce((sum, req) => sum + req.responseTime, 0) / this.metrics.requests.length
      : 0;
    
    if (avgResponseTime > this.thresholds.responseTime) {
      console.log(`  ⚠️  Response time is slow - consider performance optimizations`);
    }
    
    if (overallUptime >= this.thresholds.uptime && totalErrors === 0) {
      console.log(`  ✅ Deployment is healthy and performing well`);
    }
    
    // Save report to file
    await this.saveReportToFile();
    
    console.log('\n=====================================');
  }

  async saveReportToFile() {
    const reportDir = path.join(__dirname, '../.deployments/reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportData = {
      environment: this.environment,
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      thresholds: this.thresholds,
      summary: {
        totalRequests: this.metrics.requests.length,
        totalErrors: this.metrics.errors.length,
        uptime: this.metrics.uptime.total > 0 
          ? (this.metrics.uptime.successful / this.metrics.uptime.total) * 100 
          : 0,
        avgResponseTime: this.metrics.requests.length > 0
          ? this.metrics.requests.reduce((sum, req) => sum + req.responseTime, 0) / this.metrics.requests.length
          : 0,
      },
    };
    
    const reportFile = path.join(reportDir, `monitoring_${this.environment}_${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    
    console.log(`📄 Report saved to: ${reportFile}`);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    console.log('🛑 Monitoring stopped');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';
  const duration = parseInt(args[1]) || 300000; // 5 minutes default
  
  if (!['staging', 'production'].includes(environment)) {
    console.error('❌ Invalid environment. Use: staging or production');
    process.exit(1);
  }
  
  const monitor = new DeploymentMonitor(environment);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal');
    monitor.stopMonitoring();
    process.exit(0);
  });
  
  await monitor.startMonitoring(duration);
}

// Handle CLI execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Monitoring script failed:', error);
    process.exit(1);
  });
}

module.exports = { DeploymentMonitor };