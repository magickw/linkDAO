import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SellerErrorBoundary } from '../SellerErrorBoundary';
import { SellerError, SellerErrorType } from '../../../../types/sellerError';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; error?: Error }> = ({ 
  shouldThrow = false, 
  error = new SellerError(SellerErrorType.API_ERROR, 'Test error') 
}) => {
  if (shouldThrow) {
    throw error;
  }
  return <div>No error</div>;
};

describe('SellerErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <SellerErrorBoundary>
        <ThrowError shouldThrow={false} />
      </SellerErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error fallback when child component throws SellerError', () => {
    const testError = new SellerError(
      SellerErrorType.API_ERROR,
      'Test API error',
      'TEST_ERROR'
    );

    render(
      <SellerErrorBoundary>
        <ThrowError shouldThrow={true} error={testError} />
      </SellerErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're having trouble loading your seller information/)).toBeInTheDocument();
  });

  it('renders error fallback when child component throws regular Error', () => {
    const testError = new Error('Regular error');

    render(
      <SellerErrorBoundary>
        <ThrowError shouldThrow={true} error={testError} />
      </SellerErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows retry button when recovery is enabled', () => {
    const testError = new SellerError(
      SellerErrorType.NETWORK_ERROR,
      'Network error'
    );

    render(
      <SellerErrorBoundary enableRecovery={true}>
        <ThrowError shouldThrow={true} error={testError} />
      </SellerErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('calls custom error handler when provided', () => {
    const onError = jest.fn();
    const testError = new SellerError(
      SellerErrorType.VALIDATION_ERROR,
      'Validation error'
    );

    render(
      <SellerErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} error={testError} />
      </SellerErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(SellerError),
      expect.any(Object)
    );
  });

  it('uses custom fallback component when provided', () => {
    const CustomFallback = ({ error }: { error?: SellerError }) => (
      <div>Custom error: {error?.message}</div>
    );

    const testError = new SellerError(
      SellerErrorType.CACHE_ERROR,
      'Cache error'
    );

    render(
      <SellerErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} error={testError} />
      </SellerErrorBoundary>
    );

    expect(screen.getByText('Custom error: Cache error')).toBeInTheDocument();
  });

  it('includes context in error boundary', () => {
    const testError = new SellerError(
      SellerErrorType.PERMISSION_ERROR,
      'Permission denied'
    );

    render(
      <SellerErrorBoundary context="TestComponent">
        <ThrowError shouldThrow={true} error={testError} />
      </SellerErrorBoundary>
    );

    // Error boundary should render fallback
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const testError = new SellerError(
      SellerErrorType.API_ERROR,
      'Development error'
    );

    render(
      <SellerErrorBoundary>
        <ThrowError shouldThrow={true} error={testError} />
      </SellerErrorBoundary>
    );

    expect(screen.getByText('Hide Error Details')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});