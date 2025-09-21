/**
 * Error Boundary Tests
 * Tests for error boundary components and fallback UI
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ErrorBoundary,
  ContentCreationErrorBoundary,
  WalletErrorBoundary,
  FeedErrorBoundary
} from '../../components/ErrorHandling/ErrorBoundary';

// Component that throws errors for testing
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean; message?: string }> = ({ 
  shouldThrow, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Component working normally</div>;
};

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Error Boundary', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component working normally')).toBeInTheDocument();
    });

    it('should render error fallback when error occurs', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} message="Network error" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow={true} message="Test error" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should handle retry functionality', () => {
      const { rerender } = render(
        <ErrorBoundary enableRetry={true}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Click retry button
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Component should try to render again
      rerender(
        <ErrorBoundary enableRetry={true}>
          <ErrorThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Component working normally')).toBeInTheDocument();
    });

    it('should limit retry attempts', () => {
      render(
        <ErrorBoundary enableRetry={true}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      // Click retry button multiple times
      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton);
      fireEvent.click(retryButton); // Should exceed max retries

      // Button should be disabled or not present after max retries
      expect(retryButton).toBeDisabled();
    });
  });

  describe('Specialized Error Boundaries', () => {
    it('should render ContentCreationErrorBoundary with appropriate fallback', () => {
      render(
        <ContentCreationErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ContentCreationErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should render WalletErrorBoundary with appropriate fallback', () => {
      render(
        <WalletErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </WalletErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('should render FeedErrorBoundary with custom fallback', () => {
      render(
        <FeedErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </FeedErrorBoundary>
      );

      expect(screen.getByText(/feed temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });
  });

  describe('Error Context Handling', () => {
    it('should categorize errors based on boundary type', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary category="wallet" onError={onError}>
          <ErrorThrowingComponent shouldThrow={true} message="Wallet connection failed" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Wallet connection failed'
        }),
        expect.any(Object)
      );
    });

    it('should include component stack in error info', () => {
      const onError = jest.fn();

      render(
        <ErrorBoundary onError={onError}>
          <div>
            <ErrorThrowingComponent shouldThrow={true} />
          </div>
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.stringContaining('ErrorThrowingComponent')
        })
      );
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state on successful retry', () => {
      let shouldThrow = true;

      const TestComponent = () => (
        <ErrorBoundary enableRetry={true}>
          <ErrorThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );

      const { rerender } = render(<TestComponent />);

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Fix the error condition
      shouldThrow = false;

      // Click retry
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Rerender with fixed condition
      rerender(<TestComponent />);

      expect(screen.getByText('Component working normally')).toBeInTheDocument();
    });

    it('should maintain error state when retry fails', () => {
      render(
        <ErrorBoundary enableRetry={true}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // Click retry (error still occurs)
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Should still show error
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe('Development Mode Features', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should show debug information in development mode', () => {
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} message="Debug test error" />
        </ErrorBoundary>
      );

      // Look for debug information (details element)
      expect(screen.getByText('Debug Information')).toBeInTheDocument();
    });

    it('should not show debug information in production mode', () => {
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} message="Production test error" />
        </ErrorBoundary>
      );

      // Debug information should not be present
      expect(screen.queryByText('Debug Information')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveAttribute('type', 'button');
    });

    it('should be keyboard accessible', () => {
      render(
        <ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      
      // Should be focusable
      retryButton.focus();
      expect(retryButton).toHaveFocus();

      // Should respond to Enter key
      fireEvent.keyDown(retryButton, { key: 'Enter', code: 'Enter' });
      // Note: In a real scenario, this would trigger the retry
    });
  });
});