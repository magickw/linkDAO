/**
 * Error Manager Tests
 * Tests for the comprehensive error management system
 */

import { ErrorManager, ErrorCategory, ErrorSeverity } from '../../utils/errorHandling/ErrorManager';

describe('ErrorManager', () => {
  let errorManager: ErrorManager;

  beforeEach(() => {
    errorManager = ErrorManager.getInstance();
    errorManager.clearErrorHistory();
  });

  describe('Error Categorization', () => {
    it('should categorize network errors correctly', () => {
      const error = new Error('Network request failed');
      const context = errorManager.handleError(error);
      
      expect(context.category).toBe(ErrorCategory.NETWORK);
      expect(context.severity).toBe(ErrorSeverity.MEDIUM);
      expect(context.retryable).toBe(true);
    });

    it('should categorize wallet errors correctly', () => {
      const error = new Error('Wallet connection failed');
      const context = errorManager.handleError(error);
      
      expect(context.category).toBe(ErrorCategory.WALLET);
      expect(context.severity).toBe(ErrorSeverity.HIGH);
    });

    it('should categorize validation errors correctly', () => {
      const error = new Error('Invalid input provided');
      const context = errorManager.handleError(error);
      
      expect(context.category).toBe(ErrorCategory.VALIDATION);
      expect(context.severity).toBe(ErrorSeverity.LOW);
      expect(context.retryable).toBe(false);
    });

    it('should categorize blockchain errors correctly', () => {
      const error = new Error('Transaction failed on blockchain');
      const context = errorManager.handleError(error);
      
      expect(context.category).toBe(ErrorCategory.BLOCKCHAIN);
      expect(context.severity).toBe(ErrorSeverity.HIGH);
    });
  });

  describe('User Messages', () => {
    it('should generate appropriate user messages for network errors', () => {
      const error = new Error('fetch failed');
      const context = errorManager.handleError(error);
      
      expect(context.userMessage).toContain('Connection issue');
      expect(context.actionableSteps).toContain('Check your internet connection');
    });

    it('should generate appropriate user messages for wallet errors', () => {
      const error = new Error('MetaMask not found');
      const context = errorManager.handleError(error);
      
      expect(context.userMessage).toContain('Wallet connection');
      expect(context.actionableSteps).toContain('Check if your wallet is connected');
    });

    it('should generate appropriate user messages for validation errors', () => {
      const error = new Error('validation failed');
      const context = errorManager.handleError(error);
      
      expect(context.userMessage).toContain('Invalid input');
      expect(context.actionableSteps).toContain('Review your input data');
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry retryable operations', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network timeout');
        }
        return Promise.resolve('success');
      });

      const result = await errorManager.retryOperation(operation);
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry non-retryable operations', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Invalid validation'));
      
      await expect(errorManager.retryOperation(operation)).rejects.toThrow('Invalid validation');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network failed'));
      
      await expect(errorManager.retryOperation(operation, {}, { maxAttempts: 2 }))
        .rejects.toThrow('Network failed');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should implement exponential backoff', async () => {
      const delays: number[] = [];
      const originalDelay = (errorManager as any).delay;
      (errorManager as any).delay = jest.fn().mockImplementation((ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      });

      const operation = jest.fn().mockRejectedValue(new Error('Network timeout'));
      
      await expect(errorManager.retryOperation(operation, {}, { 
        maxAttempts: 3,
        baseDelay: 100,
        backoffMultiplier: 2
      })).rejects.toThrow();

      expect(delays).toEqual([100, 200]);
      
      (errorManager as any).delay = originalDelay;
    });
  });

  describe('Error History', () => {
    it('should maintain error history', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');
      
      errorManager.handleError(error1);
      errorManager.handleError(error2);
      
      const history = errorManager.getErrorHistory();
      expect(history).toHaveLength(2);
      expect(history[0].message).toBe('First error');
      expect(history[1].message).toBe('Second error');
    });

    it('should limit error history size', () => {
      // Add more than 100 errors
      for (let i = 0; i < 150; i++) {
        errorManager.handleError(new Error(`Error ${i}`));
      }
      
      const history = errorManager.getErrorHistory();
      expect(history).toHaveLength(100);
      expect(history[0].message).toBe('Error 50'); // Should keep last 100
    });

    it('should clear error history', () => {
      errorManager.handleError(new Error('Test error'));
      expect(errorManager.getErrorHistory()).toHaveLength(1);
      
      errorManager.clearErrorHistory();
      expect(errorManager.getErrorHistory()).toHaveLength(0);
    });
  });

  describe('Error Context Creation', () => {
    it('should create error context with all required fields', () => {
      const error = new Error('Test error');
      const context = errorManager.handleError(error);
      
      expect(context).toHaveProperty('id');
      expect(context).toHaveProperty('category');
      expect(context).toHaveProperty('severity');
      expect(context).toHaveProperty('message');
      expect(context).toHaveProperty('userMessage');
      expect(context).toHaveProperty('actionableSteps');
      expect(context).toHaveProperty('retryable');
      expect(context).toHaveProperty('fallbackAvailable');
      expect(context).toHaveProperty('timestamp');
      expect(context.timestamp).toBeInstanceOf(Date);
    });

    it('should accept custom context overrides', () => {
      const error = new Error('Test error');
      const context = errorManager.handleError(error, {
        category: ErrorCategory.BLOCKCHAIN,
        severity: ErrorSeverity.CRITICAL,
        userMessage: 'Custom message'
      });
      
      expect(context.category).toBe(ErrorCategory.BLOCKCHAIN);
      expect(context.severity).toBe(ErrorSeverity.CRITICAL);
      expect(context.userMessage).toBe('Custom message');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorManager.getInstance();
      const instance2 = ErrorManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});