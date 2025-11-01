/**
 * Load Testing Service
 * Comprehensive load testing scenarios for all major features
 */

import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';

interface LoadTestConfig {
  name: string;
  description: string;
  duration: number; // milliseconds
  concurrency: number;
  rampUpTime: number; // milliseconds
  scenarios: LoadTestScenario[];
  thresholds: {
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    throughput: number;
  };
}

interface LoadTestScenario {
  name: string;
  weight: number; // 0-1, percentage of total load
  steps: LoadTestStep[];
}

interface LoadTestStep {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  expectedStatus?: number;
  timeout?: number;
  think_time?: number; // pause after this step
}

interface LoadTestResult {
  testName: string;
  startTime: number;
  endTime: number;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number; // requests per second
  errorRate: number;
  errors: Array<{
    type: string;
    message: string;
    count: number;
  }>;
  scenarioResults: Array<{
    name: string;
    requests: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
  resourceUtilization: {
    cpu: number;
    memory: number;
    network: number;
  };
}

interface VirtualUser {
  id: string;
  scenario: LoadTestScenario;
  currentStep: number;
  startTime: number;
  requests: Array<{
    stepName: string;
    startTime: number;
    endTime: number;
    responseTime: number;
    status: number;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Load Testing Service for performance and scalability testing
 */
export class LoadTestingService extends EventEmitter {
  private activeTests = new Map<string, {
    config: LoadTestConfig;
    virtualUsers: VirtualUser[];
    startTime: number;
    results: LoadTestResult;
    abortController: AbortController;
  }>();

  private testConfigs = new Map<string, LoadTestConfig>();

  constructor() {
    super();
    this.initializeDefaultTestConfigs();
  }

  /**
   * Initialize default test configurations for major features
   */
  private initializeDefaultTestConfigs(): void {
    // Feed System Load Test
    this.testConfigs.set('feed-system', {
      name: 'Feed System Load Test',
      description: 'Test feed loading, posting, and real-time updates',
      duration: 5 * 60 * 1000, // 5 minutes
      concurrency: 50,
      rampUpTime: 30 * 1000, // 30 seconds
      scenarios: [
        {
          name: 'Browse Feed',
          weight: 0.6,
          steps: [
            {
              name: 'Load Hot Feed',
              method: 'GET',
              url: '/api/feed/hot',
              expectedStatus: 200
            },
            {
              name: 'Load New Feed',
              method: 'GET',
              url: '/api/feed/new',
              expectedStatus: 200,
              think_time: 2000
            },
            {
              name: 'Load User Feed',
              method: 'GET',
              url: '/api/feed/user',
              expectedStatus: 200,
              think_time: 3000
            }
          ]
        },
        {
          name: 'Create Posts',
          weight: 0.3,
          steps: [
            {
              name: 'Create Post',
              method: 'POST',
              url: '/api/posts',
              body: {
                content: 'Load test post content',
                tags: ['loadtest'],
                communityId: null
              },
              expectedStatus: 201,
              think_time: 5000
            }
          ]
        },
        {
          name: 'Interact with Posts',
          weight: 0.1,
          steps: [
            {
              name: 'React to Post',
              method: 'POST',
              url: '/api/posts/1/react',
              body: { type: 'like' },
              expectedStatus: 200,
              think_time: 1000
            },
            {
              name: 'Comment on Post',
              method: 'POST',
              url: '/api/posts/1/comments',
              body: { content: 'Load test comment' },
              expectedStatus: 201,
              think_time: 2000
            }
          ]
        }
      ],
      thresholds: {
        averageResponseTime: 500,
        p95ResponseTime: 1000,
        errorRate: 0.01,
        throughput: 100
      }
    });

    // Community System Load Test
    this.testConfigs.set('community-system', {
      name: 'Community System Load Test',
      description: 'Test community browsing, joining, and posting',
      duration: 5 * 60 * 1000,
      concurrency: 30,
      rampUpTime: 20 * 1000,
      scenarios: [
        {
          name: 'Browse Communities',
          weight: 0.5,
          steps: [
            {
              name: 'List Communities',
              method: 'GET',
              url: '/api/communities',
              expectedStatus: 200
            },
            {
              name: 'Get Community Details',
              method: 'GET',
              url: '/api/communities/1',
              expectedStatus: 200,
              think_time: 2000
            },
            {
              name: 'Get Community Posts',
              method: 'GET',
              url: '/api/communities/1/posts',
              expectedStatus: 200,
              think_time: 3000
            }
          ]
        },
        {
          name: 'Community Interactions',
          weight: 0.3,
          steps: [
            {
              name: 'Join Community',
              method: 'POST',
              url: '/api/communities/1/join',
              expectedStatus: 200,
              think_time: 1000
            },
            {
              name: 'Post in Community',
              method: 'POST',
              url: '/api/communities/1/posts',
              body: {
                content: 'Community load test post',
                tags: ['loadtest']
              },
              expectedStatus: 201,
              think_time: 4000
            }
          ]
        },
        {
          name: 'Community Discovery',
          weight: 0.2,
          steps: [
            {
              name: 'Search Communities',
              method: 'GET',
              url: '/api/communities/search?q=test',
              expectedStatus: 200,
              think_time: 2000
            },
            {
              name: 'Get Trending Communities',
              method: 'GET',
              url: '/api/communities/trending',
              expectedStatus: 200,
              think_time: 1000
            }
          ]
        }
      ],
      thresholds: {
        averageResponseTime: 600,
        p95ResponseTime: 1200,
        errorRate: 0.01,
        throughput: 60
      }
    });

    // Messaging System Load Test
    this.testConfigs.set('messaging-system', {
      name: 'Messaging System Load Test',
      description: 'Test direct messaging and real-time communication',
      duration: 3 * 60 * 1000,
      concurrency: 20,
      rampUpTime: 15 * 1000,
      scenarios: [
        {
          name: 'Browse Conversations',
          weight: 0.4,
          steps: [
            {
              name: 'Get Conversations',
              method: 'GET',
              url: '/api/conversations',
              expectedStatus: 200
            },
            {
              name: 'Get Conversation Messages',
              method: 'GET',
              url: '/api/conversations/1/messages',
              expectedStatus: 200,
              think_time: 2000
            }
          ]
        },
        {
          name: 'Send Messages',
          weight: 0.6,
          steps: [
            {
              name: 'Send Message',
              method: 'POST',
              url: '/api/conversations/1/messages',
              body: {
                content: 'Load test message',
                type: 'text'
              },
              expectedStatus: 201,
              think_time: 3000
            },
            {
              name: 'Mark as Read',
              method: 'PUT',
              url: '/api/conversations/1/read',
              expectedStatus: 200,
              think_time: 500
            }
          ]
        }
      ],
      thresholds: {
        averageResponseTime: 300,
        p95ResponseTime: 600,
        errorRate: 0.005,
        throughput: 40
      }
    });

    // Real-time Features Load Test
    this.testConfigs.set('realtime-features', {
      name: 'Real-time Features Load Test',
      description: 'Test WebSocket connections and real-time updates',
      duration: 2 * 60 * 1000,
      concurrency: 100,
      rampUpTime: 10 * 1000,
      scenarios: [
        {
          name: 'WebSocket Connections',
          weight: 1.0,
          steps: [
            {
              name: 'Connect WebSocket',
              method: 'GET',
              url: '/ws/connect',
              expectedStatus: 101,
              timeout: 5000
            },
            {
              name: 'Subscribe to Updates',
              method: 'POST',
              url: '/ws/subscribe',
              body: { channels: ['feed', 'notifications'] },
              expectedStatus: 200,
              think_time: 1000
            }
          ]
        }
      ],
      thresholds: {
        averageResponseTime: 200,
        p95ResponseTime: 500,
        errorRate: 0.02,
        throughput: 200
      }
    });
  }

  /**
   * Run load test
   */
  async runLoadTest(testName: string): Promise<LoadTestResult> {
    const config = this.testConfigs.get(testName);
    if (!config) {
      throw new Error(`Load test configuration not found: ${testName}`);
    }

    if (this.activeTests.has(testName)) {
      throw new Error(`Load test already running: ${testName}`);
    }

    const abortController = new AbortController();
    const startTime = Date.now();
    
    const testExecution = {
      config,
      virtualUsers: [] as VirtualUser[],
      startTime,
      results: this.initializeResults(config, startTime),
      abortController
    };

    this.activeTests.set(testName, testExecution);

    try {
      this.emit('testStarted', { testName, config });
      
      // Create virtual users with ramp-up
      await this.createVirtualUsers(testExecution);
      
      // Wait for test completion
      await this.waitForTestCompletion(testExecution);
      
      // Calculate final results
      const results = this.calculateResults(testExecution);
      
      this.emit('testCompleted', { testName, results });
      
      return results;
    } catch (error) {
      this.emit('testError', { testName, error });
      throw error;
    } finally {
      this.activeTests.delete(testName);
    }
  }

  /**
   * Stop running load test
   */
  stopLoadTest(testName: string): void {
    const testExecution = this.activeTests.get(testName);
    if (testExecution) {
      testExecution.abortController.abort();
      this.emit('testStopped', { testName });
    }
  }

  /**
   * Get running tests
   */
  getRunningTests(): string[] {
    return Array.from(this.activeTests.keys());
  }

  /**
   * Get test configuration
   */
  getTestConfig(testName: string): LoadTestConfig | undefined {
    return this.testConfigs.get(testName);
  }

  /**
   * Add custom test configuration
   */
  addTestConfig(testName: string, config: LoadTestConfig): void {
    this.testConfigs.set(testName, config);
  }

  /**
   * Initialize test results structure
   */
  private initializeResults(config: LoadTestConfig, startTime: number): LoadTestResult {
    return {
      testName: config.name,
      startTime,
      endTime: 0,
      duration: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      errors: [],
      scenarioResults: config.scenarios.map(scenario => ({
        name: scenario.name,
        requests: 0,
        averageResponseTime: 0,
        errorRate: 0
      })),
      resourceUtilization: {
        cpu: 0,
        memory: 0,
        network: 0
      }
    };
  }

  /**
   * Create virtual users with ramp-up
   */
  private async createVirtualUsers(testExecution: any): Promise<void> {
    const { config } = testExecution;
    const rampUpInterval = config.rampUpTime / config.concurrency;

    for (let i = 0; i < config.concurrency; i++) {
      if (testExecution.abortController.signal.aborted) break;

      // Select scenario based on weight
      const scenario = this.selectScenario(config.scenarios);
      
      const virtualUser: VirtualUser = {
        id: `user-${i}`,
        scenario,
        currentStep: 0,
        startTime: Date.now(),
        requests: []
      };

      testExecution.virtualUsers.push(virtualUser);
      
      // Start virtual user execution
      this.executeVirtualUser(virtualUser, testExecution);

      // Ramp-up delay
      if (i < config.concurrency - 1) {
        await this.sleep(rampUpInterval);
      }
    }
  }

  /**
   * Select scenario based on weight
   */
  private selectScenario(scenarios: LoadTestScenario[]): LoadTestScenario {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const scenario of scenarios) {
      cumulativeWeight += scenario.weight;
      if (random <= cumulativeWeight) {
        return scenario;
      }
    }

    return scenarios[0]; // Fallback
  }

  /**
   * Execute virtual user scenario
   */
  private async executeVirtualUser(virtualUser: VirtualUser, testExecution: any): Promise<void> {
    const { config, abortController } = testExecution;
    const endTime = testExecution.startTime + config.duration;

    while (Date.now() < endTime && !abortController.signal.aborted) {
      for (const step of virtualUser.scenario.steps) {
        if (Date.now() >= endTime || abortController.signal.aborted) break;

        try {
          const requestStart = performance.now();
          const response = await this.executeStep(step, abortController.signal);
          const requestEnd = performance.now();
          const responseTime = requestEnd - requestStart;

          const requestResult = {
            stepName: step.name,
            startTime: requestStart,
            endTime: requestEnd,
            responseTime,
            status: response.status,
            success: response.success,
            error: response.error
          };

          virtualUser.requests.push(requestResult);
          
          // Update real-time metrics
          this.updateMetrics(testExecution, requestResult);

          // Think time
          if (step.think_time) {
            await this.sleep(step.think_time);
          }

        } catch (error) {
          const requestResult = {
            stepName: step.name,
            startTime: performance.now(),
            endTime: performance.now(),
            responseTime: 0,
            status: 0,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };

          virtualUser.requests.push(requestResult);
          this.updateMetrics(testExecution, requestResult);
        }
      }
    }
  }

  /**
   * Execute individual test step
   */
  private async executeStep(step: LoadTestStep, signal: AbortSignal): Promise<{
    status: number;
    success: boolean;
    error?: string;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), step.timeout || 10000);

      // Combine abort signals
      signal.addEventListener('abort', () => controller.abort());

      const response = await fetch(step.url, {
        method: step.method,
        headers: {
          'Content-Type': 'application/json',
          ...step.headers
        },
        body: step.body ? JSON.stringify(step.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const success = step.expectedStatus ? 
        response.status === step.expectedStatus : 
        response.status >= 200 && response.status < 300;

      return {
        status: response.status,
        success,
        error: success ? undefined : `Unexpected status: ${response.status}`
      };

    } catch (error) {
      return {
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Request failed'
      };
    }
  }

  /**
   * Update real-time metrics
   */
  private updateMetrics(testExecution: any, requestResult: any): void {
    const { results } = testExecution;
    
    results.totalRequests++;
    
    if (requestResult.success) {
      results.successfulRequests++;
    } else {
      results.failedRequests++;
      
      // Track errors
      const errorType = requestResult.error || 'Unknown error';
      const existingError = results.errors.find(e => e.message === errorType);
      
      if (existingError) {
        existingError.count++;
      } else {
        results.errors.push({
          type: 'request_error',
          message: errorType,
          count: 1
        });
      }
    }

    // Update response time metrics
    if (requestResult.responseTime > 0) {
      results.minResponseTime = Math.min(results.minResponseTime, requestResult.responseTime);
      results.maxResponseTime = Math.max(results.maxResponseTime, requestResult.responseTime);
    }

    // Emit progress update
    this.emit('testProgress', {
      testName: results.testName,
      progress: {
        totalRequests: results.totalRequests,
        successfulRequests: results.successfulRequests,
        failedRequests: results.failedRequests,
        currentThroughput: this.calculateCurrentThroughput(testExecution)
      }
    });
  }

  /**
   * Calculate current throughput
   */
  private calculateCurrentThroughput(testExecution: any): number {
    const elapsed = (Date.now() - testExecution.startTime) / 1000;
    return elapsed > 0 ? testExecution.results.totalRequests / elapsed : 0;
  }

  /**
   * Wait for test completion
   */
  private async waitForTestCompletion(testExecution: any): Promise<void> {
    const { config } = testExecution;
    const endTime = testExecution.startTime + config.duration;

    while (Date.now() < endTime && !testExecution.abortController.signal.aborted) {
      await this.sleep(1000); // Check every second
    }

    // Wait for all virtual users to complete their current requests
    await this.sleep(5000);
  }

  /**
   * Calculate final results
   */
  private calculateResults(testExecution: any): LoadTestResult {
    const { results, virtualUsers, startTime } = testExecution;
    const endTime = Date.now();
    
    // Collect all requests
    const allRequests = virtualUsers.flatMap((user: VirtualUser) => user.requests);
    const successfulRequests = allRequests.filter(req => req.success);
    const responseTimes = successfulRequests.map(req => req.responseTime);

    // Calculate percentiles
    responseTimes.sort((a, b) => a - b);
    const p50Index = Math.floor(responseTimes.length * 0.5);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    // Update final results
    results.endTime = endTime;
    results.duration = endTime - startTime;
    results.totalRequests = allRequests.length;
    results.successfulRequests = successfulRequests.length;
    results.failedRequests = allRequests.length - successfulRequests.length;
    results.averageResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;
    results.p50ResponseTime = responseTimes[p50Index] || 0;
    results.p95ResponseTime = responseTimes[p95Index] || 0;
    results.p99ResponseTime = responseTimes[p99Index] || 0;
    results.minResponseTime = results.minResponseTime === Infinity ? 0 : results.minResponseTime;
    results.throughput = (results.duration / 1000) > 0 ? results.totalRequests / (results.duration / 1000) : 0;
    results.errorRate = results.totalRequests > 0 ? results.failedRequests / results.totalRequests : 0;

    // Calculate scenario-specific results
    results.scenarioResults = testExecution.config.scenarios.map((scenario: LoadTestScenario) => {
      const scenarioRequests = allRequests.filter(req => 
        scenario.steps.some(step => step.name === req.stepName)
      );
      const scenarioSuccessful = scenarioRequests.filter(req => req.success);
      const scenarioResponseTimes = scenarioSuccessful.map(req => req.responseTime);

      return {
        name: scenario.name,
        requests: scenarioRequests.length,
        averageResponseTime: scenarioResponseTimes.length > 0 ?
          scenarioResponseTimes.reduce((sum, time) => sum + time, 0) / scenarioResponseTimes.length : 0,
        errorRate: scenarioRequests.length > 0 ?
          (scenarioRequests.length - scenarioSuccessful.length) / scenarioRequests.length : 0
      };
    });

    // Estimate resource utilization (simplified)
    results.resourceUtilization = {
      cpu: Math.min(100, (results.throughput / 100) * 50), // Rough estimate
      memory: Math.min(100, (virtualUsers.length / 100) * 30),
      network: Math.min(100, (results.throughput / 200) * 60)
    };

    return results;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate load test report
   */
  generateReport(results: LoadTestResult): string {
    const report = `
Load Test Report: ${results.testName}
=====================================

Test Duration: ${(results.duration / 1000).toFixed(2)}s
Total Requests: ${results.totalRequests}
Successful Requests: ${results.successfulRequests}
Failed Requests: ${results.failedRequests}
Error Rate: ${(results.errorRate * 100).toFixed(2)}%

Response Times:
- Average: ${results.averageResponseTime.toFixed(2)}ms
- 50th percentile: ${results.p50ResponseTime.toFixed(2)}ms
- 95th percentile: ${results.p95ResponseTime.toFixed(2)}ms
- 99th percentile: ${results.p99ResponseTime.toFixed(2)}ms
- Min: ${results.minResponseTime.toFixed(2)}ms
- Max: ${results.maxResponseTime.toFixed(2)}ms

Throughput: ${results.throughput.toFixed(2)} requests/second

Scenario Results:
${results.scenarioResults.map(scenario => `
- ${scenario.name}:
  Requests: ${scenario.requests}
  Avg Response Time: ${scenario.averageResponseTime.toFixed(2)}ms
  Error Rate: ${(scenario.errorRate * 100).toFixed(2)}%
`).join('')}

Resource Utilization:
- CPU: ${results.resourceUtilization.cpu.toFixed(1)}%
- Memory: ${results.resourceUtilization.memory.toFixed(1)}%
- Network: ${results.resourceUtilization.network.toFixed(1)}%

${results.errors.length > 0 ? `
Errors:
${results.errors.map(error => `- ${error.message}: ${error.count} occurrences`).join('\n')}
` : 'No errors occurred during the test.'}
`;

    return report;
  }

  /**
   * Get available test configurations
   */
  getAvailableTests(): Array<{ name: string; description: string }> {
    return Array.from(this.testConfigs.entries()).map(([name, config]) => ({
      name,
      description: config.description
    }));
  }
}

// Export singleton instance
export const loadTestingService = new LoadTestingService();
export default LoadTestingService;
