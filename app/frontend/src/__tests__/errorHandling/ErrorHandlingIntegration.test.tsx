/**
 * Error Handling Integration Tests
 * Tests for complete error handling system integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ErrorBoundary,
  GracefulDegradation,
  FallbackContent,
  OfflineIndicator,
  useErrorHandler,
  useOfflineSupport,
  ErrorCategory
} from '../../components/ErrorHandling';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component that uses error handler
const TestErrorHandlerComponent: React.FC = () => {
  const { error, isLoading, executeWithErrorHandling, retry, clearError } = useErrorHandler({
    category: ErrorCategory.NETWORK
  });

  const handleOperation = async () => {
    await executeWithErrorHandling(async () => {
      if (Math.random() < 0.5) {
        throw new Error('Random network error');
      }
      return { success: true };
    });
  };

  if (error) {
    return (
      <div>
        <div data-testid="error-message">{error.userMessage}</div>
        <button onClick={retry} data-testid="retry-button">Retry</button>
        <button onClick={clearError} data-testid="clear-button">Clear</button>
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={handleOperation} 
        disabled={isLoading}
        data-testid="operation-button"
      >
        {isLoading ? 'Loading...' : 'Execute Operation'}
      </button>
    </div>
  );
};

// Test component that uses offline support
const TestOfflineComponent: React.FC = () => {
  const { isOnline, queueAction, queuedActions, syncNow } = useOfflineSupport();

  const handleOfflineAction = () => {
    queueAction('TEST_ACTION', { data: 'test' }, { priority: 'high' });
  };

  return (
    <div>
      <div data-testid="online-status">{isOnline ? 'Online' : 'Offline'}</div>
      <div data-testid="queue-count">{queuedActions.length}</div>
      <button onClick={handleOfflineAction} data-testid="queue-button">
        Queue Action
      </button>
      <button onClick={syncNow} data-testid="sync-button">
        Sync Now
      </button>
    </div>
  );
};

describe('Error Handling Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  describe('Error Handler Hook Integration', () => {
    it('should handle errors and provide retry functionality', async () => {
      render(<TestErrorHandlerComponent />);

      const operationButton = screen.getByTestId('operation-button');
      
      // Mock Math.random to always fail first
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.3); // < 0.5, will throw error

      fireEvent.click(operationButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-message')).toHaveTextContent(/connection issue/i);
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();

      // Mock success on retry
      Math.random = jest.fn().mockReturnValue(0.7); // > 0.5, will succeed

      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('operation-button')).toBeInTheDocument();
      });

      Math.random = originalRandom;
    });

    it('should clear errors when requested', async () => {
      render(<TestErrorHandlerComponent />);

      const operationButton = screen.getByTestId('operation-button');
      
      // Force error
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.3);

      fireEvent.click(operationButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('clear-button'));

      await waitFor(() => {
        expect(screen.getByTestId('operation-button')).toBeInTheDocument();
      });

      Math.random = originalRandom;
    });
  });

  describe('Offline Support Integration', () => {
    it('should queue actions when offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      render(<TestOfflineComponent />);

      expect(screen.getByTestId('online-status')).toHaveTextContent('Offline');
      expect(screen.getByTestId('queue-count')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('queue-button'));

      await waitFor(() => {
        expect(screen.getByTestId('queue-count')).toHaveTextContent('1');
      });
    });

    it('should sync actions when coming back online', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      // Start offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      render(<TestOfflineComponent />);

      // Queue an action while offline
      fireEvent.click(screen.getByTestId('queue-button'));

      await waitFor(() => {
        expect(screen.getByTestId('queue-count')).toHaveTextContent('1');
      });

      // Come back online
      Object.defineProperty(navigator, 'onLine', { value: true });

      // Trigger sync
      fireEvent.click(screen.getByTestId('sync-button'));

      await waitFor(() => {
        expect(screen.getByTestId('queue-count')).toHaveTextContent('0');
      });

      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('Error Boundary with Graceful Degradation', () => {
    const FailingComponent: React.FC<{ shouldFail: boolean }> = ({ shouldFail }) => {
      if (shouldFail) {
        throw new Error('Component failed');
      }
      return <div data-testid="working-component">Working</div>;
    };

    it('should show fallback when component fails', () => {
      render(
        <ErrorBoundary>
          <GracefulDegradation
            feature="Test Feature"
            fallback={<div data-testid="fallback-content">Fallback Content</div>}
          >
            <FailingComponent shouldFail={true} />
          </GracefulDegradation>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    });

    it('should show working component when no error', () => {
      render(
        <ErrorBoundary>
          <GracefulDegradation
            feature="Test Feature"
            fallback={<div data-testid="fallback-content">Fallback Content</div>}
          >
            <FailingComponent shouldFail={false} />
          </GracefulDegradation>
        </ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Offline Indicator Integration', () => {
    it('should show offline indicator when offline with queued actions', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      const TestApp = () => (
        <div>
          <OfflineIndicator />
          <TestOfflineComponent />
        </div>
      );

      render(<TestApp />);

      // Queue an action
      fireEvent.click(screen.getByTestId('queue-button'));

      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument();
        expect(screen.getByText(/queued/i)).toBeInTheDocument();
      });
    });

    it('should hide offline indicator when online with no queued actions', () => {
      const TestApp = () => (
        <div>
          <OfflineIndicator />
          <TestOfflineComponent />
        </div>
      );

      render(<TestApp />);

      // Should not show indicator when online and no queued actions
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    });
  });

  describe('Fallback Content Integration', () => {
    it('should render appropriate fallback for different content types', () => {
      const { rerender } = render(
        <FallbackContent type="feed" onRetry={() => {}} />
      );

      expect(screen.getByText(/feed unavailable/i)).toBeInTheDocument();

      rerender(<FallbackContent type="wallet" onRetry={() => {}} />);
      expect(screen.getByText(/wallet unavailable/i)).toBeInTheDocument();

      rerender(<FallbackContent type="profile" onRetry={() => {}} />);
      expect(screen.getByText(/profile unavailable/i)).toBeInTheDocument();
    });

    it('should call retry callback when retry button is clicked', () => {
      const onRetry = jest.fn();

      render(<FallbackContent type="feed" onRetry={onRetry} />);

      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complete Error Handling Flow', () => {
    it('should handle complete error flow with recovery', async () => {
      const CompleteTestApp = () => {
        const [hasError, setHasError] = React.useState(false);

        return (
          <div>
            <OfflineIndicator />
            <ErrorBoundary
              onError={() => setHasError(true)}
              enableRetry={true}
            >
              <GracefulDegradation
                feature="Main Feature"
                fallback={
                  <FallbackContent
                    type="generic"
                    onRetry={() => setHasError(false)}
                  />
                }
              >
                {hasError ? (
                  <div>Error occurred</div>
                ) : (
                  <TestErrorHandlerComponent />
                )}
              </GracefulDegradation>
            </ErrorBoundary>
          </div>
        );
      };

      render(<CompleteTestApp />);

      // Should start with working component
      expect(screen.getByTestId('operation-button')).toBeInTheDocument();

      // Simulate error in operation
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.3);

      fireEvent.click(screen.getByTestId('operation-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Clear error and verify recovery
      fireEvent.click(screen.getByTestId('clear-button'));

      await waitFor(() => {
        expect(screen.getByTestId('operation-button')).toBeInTheDocument();
      });

      Math.random = originalRandom;
    });
  });

  describe('Performance and Memory', () => {
    it('should not cause memory leaks with multiple error handlers', () => {
      const TestMultipleHandlers = () => {
        const handler1 = useErrorHandler({ category: ErrorCategory.NETWORK });
        const handler2 = useErrorHandler({ category: ErrorCategory.WALLET });
        const handler3 = useErrorHandler({ category: ErrorCategory.CONTENT });

        return (
          <div>
            <div data-testid="handler-1">{handler1.error ? 'Error 1' : 'OK 1'}</div>
            <div data-testid="handler-2">{handler2.error ? 'Error 2' : 'OK 2'}</div>
            <div data-testid="handler-3">{handler3.error ? 'Error 3' : 'OK 3'}</div>
          </div>
        );
      };

      const { unmount } = render(<TestMultipleHandlers />);

      expect(screen.getByTestId('handler-1')).toHaveTextContent('OK 1');
      expect(screen.getByTestId('handler-2')).toHaveTextContent('OK 2');
      expect(screen.getByTestId('handler-3')).toHaveTextContent('OK 3');

      // Unmount should not cause errors
      unmount();
    });

    it('should handle rapid error occurrences without issues', async () => {
      const RapidErrorComponent = () => {
        const { error, executeWithErrorHandling } = useErrorHandler();
        const [count, setCount] = React.useState(0);

        const handleRapidErrors = async () => {
          for (let i = 0; i < 5; i++) {
            await executeWithErrorHandling(async () => {
              throw new Error(`Error ${i}`);
            });
            setCount(prev => prev + 1);
          }
        };

        return (
          <div>
            <button onClick={handleRapidErrors} data-testid="rapid-error-button">
              Trigger Rapid Errors
            </button>
            <div data-testid="error-count">{count}</div>
            {error && <div data-testid="error-display">{error.message}</div>}
          </div>
        );
      };

      render(<RapidErrorComponent />);

      fireEvent.click(screen.getByTestId('rapid-error-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('5');
      });

      // Should handle rapid errors without crashing
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
    });
  });
});