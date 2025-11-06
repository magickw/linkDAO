/**
 * Comprehensive Circuit Breaker Functionality Tests
 * Tests circuit breaker patterns, state transitions, and graceful degradation
 */

import { CircuitBreaker, apiCircuitBreaker, communityCircuitBreaker, feedCircuitBreaker, marketplaceCircuitBreaker } from '../circuitBreaker';

describe('Circuit Breaker Functionality Tests', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoringPeriod: 10000,
      halfOpenMaxCalls: 3,
      halfOpenSuccessThreshold: 2,
    });
  });

  describe('Basic Circuit Breaker Operations', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.isClosed()).toBe(true);
      expect(circuitBreaker.isOpen()).toBe(false);
      expect(circuitBreaker.isHalfOpen()).toBe(false);
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should track failure count correctly', async () => {
      expect(circuitBreaker.getFailureCount()).toBe(0);

      // Simulate failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Service error')));
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getFailureCount()).toBe(3);
      expect(circuitBreaker.isClosed()).toBe(true); // Still closed, below threshold
    });

    it('should open circuit after reaching failure threshold', async () => {
      // Cause 5 failures to reach threshold
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Service error')));
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.isOpen()).toBe(true);
      expect(circuitBreaker.getFailureCount()).toBe(5);
    });

    it('should reset failure count on successful requests in CLOSED state', async () => {
      // Cause some failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Service error')));
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getFailureCount()).toBe(3);

      // Successful request should reduce failure count
      await circuitBreaker.execute(() => Promise.resolve('success'));
      expect(circuitBreaker.getFailureCount()).toBe(2);
    });
  });

  describe('State Transitions', () => {
    it('should transition from CLOSED to OPEN after threshold failures', async () => {
      const stateChanges: string[] = [];
      const unsubscribe = circuitBreaker.subscribe((state) => {
        stateChanges.push(state);
      });

      // Cause failures to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Service error')));
        } catch (error) {
          // Expected to fail
        }
      }

      expect(stateChanges).toContain('OPEN');
      expect(circuitBreaker.isOpen()).toBe(true);

      unsubscribe();
    });

    it('should transition from OPEN to HALF_OPEN after recovery timeout', async () => {
      const shortTimeoutBreaker = new CircuitBreaker({
        failureThreshold: 3,
        recoveryTimeout: 100, // Short timeout for testing
        halfOpenMaxCalls: 2,
      });

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await shortTimeoutBreaker.execute(() => Promise.reject(new Error('Fail')));
        } catch (error) {
          // Expected
        }
      }

      expect(shortTimeoutBreaker.isOpen()).toBe(true);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next request should transition to HALF_OPEN
      try {
        await shortTimeoutBreaker.execute(() => Promise.reject(new Error('Still failing')));
      } catch (error) {
        // Expected, but should be in HALF_OPEN now
      }

      expect(shortTimeoutBreaker.isHalfOpen()).toBe(true);
    });

    it('should transition from HALF_OPEN to CLOSED after successful requests', async () => {
      const shortTimeoutBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 100,
        halfOpenMaxCalls: 3,
        halfOpenSuccessThreshold: 2,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await shortTimeoutBreaker.execute(() => Promise.reject(new Error('Fail')));
        } catch (error) {
          // Expected
        }
      }

      expect(shortTimeoutBreaker.isOpen()).toBe(true);

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Make successful requests to close circuit
      await shortTimeoutBreaker.execute(() => Promise.resolve('success1'));
      expect(shortTimeoutBreaker.isHalfOpen()).toBe(true);

      await shortTimeoutBreaker.execute(() => Promise.resolve('success2'));
      expect(shortTimeoutBreaker.isClosed()).toBe(true);
    });

    it('should transition from HALF_OPEN back to OPEN on failure', async () => {
      const shortTimeoutBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 100,
        halfOpenMaxCalls: 3,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await shortTimeoutBreaker.execute(() => Promise.reject(new Error('Fail')));
        } catch (error) {
          // Expected
        }
      }

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // First request transitions to HALF_OPEN
      try {
        await shortTimeoutBreaker.execute(() => Promise.reject(new Error('Still failing')));
      } catch (error) {
        // Expected
      }

      expect(shortTimeoutBreaker.isOpen()).toBe(true); // Should reopen on failure
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should use fallback function when circuit is open', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Service error')));
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.isOpen()).toBe(true);

      // Request with fallback should return fallback data
      const result = await circuitBreaker.execute(
        () => Promise.reject(new Error('Service still down')),
        () => 'fallback data'
      );

      expect(result).toBe('fallback data');
    });

    it('should use fallback for async fallback functions', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Service error')));
        } catch (error) {
          // Expected to fail
        }
      }

      const result = await circuitBreaker.execute(
        () => Promise.reject(new Error('Service still down')),
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { fallback: true, data: 'async fallback' };
        }
      );

      expect(result).toEqual({ fallback: true, data: 'async fallback' });
    });

    it('should throw error when no fallback is provided and circuit is open', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Service error')));
        } catch (error) {
          // Expected to fail
        }
      }

      await expect(
        circuitBreaker.execute(() => Promise.reject(new Error('Service still down')))
      ).rejects.toThrow('Service temporarily unavailable');
    });
  });

  describe('Service Failure Detection', () => {
    it('should detect 5xx server errors as service failures', async () => {
      const error500 = new Error('Internal Server Error');
      (error500 as any).status = 500;

      const error503 = new Error('Service Unavailable');
      (error503 as any).status = 503;

      const error502 = new Error('Bad Gateway');
      (error502 as any).status = 502;

      // These should all count as service failures
      for (const error of [error500, error503, error502]) {
        try {
          await circuitBreaker.execute(() => Promise.reject(error));
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getFailureCount()).toBe(3);
    });

    it('should detect network errors as service failures', async () => {
      const networkErrors = [
        new Error('fetch failed'),
        new Error('network timeout'),
        Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' }),
        Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' }),
        Object.assign(new Error('Network error'), { code: 'NETWORK_ERROR' }),
      ];

      for (const error of networkErrors) {
        try {
          await circuitBreaker.execute(() => Promise.reject(error));
        } catch (e) {
          // Expected
        }
      }

      expect(circuitBreaker.getFailureCount()).toBe(5);
      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should not count 4xx client errors as service failures (except specific ones)', async () => {
      const clientErrors = [
        Object.assign(new Error('Bad Request'), { status: 400 }),
        Object.assign(new Error('Unauthorized'), { status: 401 }), // Should count
        Object.assign(new Error('Forbidden'), { status: 403 }),
        Object.assign(new Error('Not Found'), { status: 404 }),
        Object.assign(new Error('Timeout'), { status: 408 }), // Should count
        Object.assign(new Error('Too Many Requests'), { status: 429 }), // Should count
      ];

      for (const error of clientErrors) {
        try {
          await circuitBreaker.execute(() => Promise.reject(error));
        } catch (e) {
          // Expected
        }
      }

      // Only 401, 408, and 429 should count as service failures
      expect(circuitBreaker.getFailureCount()).toBe(3);
    });
  });

  describe('Half-Open State Behavior', () => {
    it('should limit calls in HALF_OPEN state', async () => {
      const limitedBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 100,
        halfOpenMaxCalls: 2,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await limitedBreaker.execute(() => Promise.reject(new Error('Fail')));
        } catch (error) {
          // Expected
        }
      }

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 150));

      // Make max calls in HALF_OPEN
      await limitedBreaker.execute(() => Promise.resolve('success1'));
      await limitedBreaker.execute(() => Promise.resolve('success2'));

      // Third call should use fallback if provided
      const result = await limitedBreaker.execute(
        () => Promise.resolve('should not reach'),
        () => 'fallback for limit exceeded'
      );

      expect(result).toBe('fallback for limit exceeded');
    });

    it('should require multiple successes to close circuit from HALF_OPEN', async () => {
      const strictBreaker = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeout: 100,
        halfOpenMaxCalls: 5,
        halfOpenSuccessThreshold: 3, // Require 3 successes
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await strictBreaker.execute(() => Promise.reject(new Error('Fail')));
        } catch (error) {
          // Expected
        }
      }

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 150));

      // Make 2 successful calls (not enough to close)
      await strictBreaker.execute(() => Promise.resolve('success1'));
      await strictBreaker.execute(() => Promise.resolve('success2'));
      expect(strictBreaker.isHalfOpen()).toBe(true);

      // Third success should close the circuit
      await strictBreaker.execute(() => Promise.resolve('success3'));
      expect(strictBreaker.isClosed()).toBe(true);
    });
  });

  describe('Metrics and Monitoring', () => {
    it('should track comprehensive metrics', async () => {
      // Make some successful requests
      await circuitBreaker.execute(() => Promise.resolve('success1'));
      await circuitBreaker.execute(() => Promise.resolve('success2'));

      // Make some failed requests
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Fail')));
        } catch (error) {
          // Expected
        }
      }

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(3);
      expect(metrics.lastSuccessTime).toBeGreaterThan(0);
      expect(metrics.lastFailureTime).toBeGreaterThan(0);
    });

    it('should track state changes', async () => {
      let stateChangeCount = 0;
      const unsubscribe = circuitBreaker.subscribe(() => {
        stateChangeCount++;
      });

      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Fail')));
        } catch (error) {
          // Expected
        }
      }

      expect(stateChangeCount).toBeGreaterThan(0);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.stateChanges).toBeGreaterThan(0);

      unsubscribe();
    });

    it('should handle listener errors gracefully', async () => {
      const faultyListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      const unsubscribe = circuitBreaker.subscribe(faultyListener);

      // This should not throw despite the faulty listener
      await expect(
        circuitBreaker.execute(() => Promise.resolve('success'))
      ).resolves.toBe('success');

      expect(faultyListener).toHaveBeenCalled();

      unsubscribe();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset circuit breaker to initial state', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(() => Promise.reject(new Error('Fail')));
        } catch (error) {
          // Expected
        }
      }

      expect(circuitBreaker.isOpen()).toBe(true);
      expect(circuitBreaker.getFailureCount()).toBe(5);

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.isClosed()).toBe(true);
      expect(circuitBreaker.getFailureCount()).toBe(0);

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successfulRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
    });
  });

  describe('Predefined Circuit Breakers', () => {
    it('should have properly configured API circuit breaker', () => {
      expect(apiCircuitBreaker).toBeDefined();
      expect(apiCircuitBreaker.isClosed()).toBe(true);
    });

    it('should have properly configured community circuit breaker', () => {
      expect(communityCircuitBreaker).toBeDefined();
      expect(communityCircuitBreaker.isClosed()).toBe(true);
    });

    it('should have properly configured feed circuit breaker', () => {
      expect(feedCircuitBreaker).toBeDefined();
      expect(feedCircuitBreaker.isClosed()).toBe(true);
    });

    it('should have properly configured marketplace circuit breaker', () => {
      expect(marketplaceCircuitBreaker).toBeDefined();
      expect(marketplaceCircuitBreaker.isClosed()).toBe(true);
    });

    it('should have consistent configuration across circuit breakers', () => {
      const breakers = [apiCircuitBreaker, communityCircuitBreaker, feedCircuitBreaker, marketplaceCircuitBreaker];
      
      breakers.forEach(breaker => {
        // All should start closed
        expect(breaker.isClosed()).toBe(true);
        expect(breaker.getFailureCount()).toBe(0);
      });
    });
  });
});