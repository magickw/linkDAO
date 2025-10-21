import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DefaultSellerErrorFallback } from '../DefaultSellerErrorFallback';
import { SellerError, SellerErrorType } from '../../../../types/sellerError';

// Mock the error recovery service
jest.mock('../../../../services/sellerErrorRecoveryService', () => ({
  sellerErrorRecoveryService: {
    handleError: jest.fn().mockResolvedValue({
      canRecover: true,
      recoveryActions: [
        {
          type: 'retry',
          description: 'Retry the request',
          priority: 1,
          action: jest.fn().mockResolvedValue(undefined),
        },
        {
          type: 'fallback',
          description: 'Use cached data',
          priority: 2,
          action: jest.fn().mockResolvedValue(undefined),
        },
      ],
      userMessage: 'Test error message',
    }),
  },
}));

describe('DefaultSellerErrorFallback', () => {
  it('renders basic error message when no error is provided', () => {
    render(<DefaultSellerErrorFallback />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're having trouble loading your seller information/)).toBeInTheDocument();
  });

  it('renders specific error message for different error types', async () => {
    const networkError = new SellerError(
      SellerErrorType.NETWORK_ERROR,
      'Network connection failed'
    );

    render(<DefaultSellerErrorFallback error={networkError} />);

    await waitFor(() => {
      expect(screen.getByText('🌐')).toBeInTheDocument(); // Network error icon
    });
  });

  it('shows recovery actions when available', async () => {
    const apiError = new SellerError(
      SellerErrorType.API_ERROR,
      'API request failed'
    );

    render(<DefaultSellerErrorFallback error={apiError} />);

    await waitFor(() => {
      expect(screen.getByText('Retry the request')).toBeInTheDocument();
      expect(screen.getByText('Use cached data')).toBeInTheDocument();
    });
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();

    render(<DefaultSellerErrorFallback onRetry={onRetry} />);

    fireEvent.click(screen.getByText('Try Again'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('calls onReset when recovery action succeeds', async () => {
    const onReset = jest.fn();
    const apiError = new SellerError(
      SellerErrorType.API_ERROR,
      'API request failed'
    );

    render(<DefaultSellerErrorFallback error={apiError} onReset={onReset} />);

    await waitFor(() => {
      expect(screen.getByText('Retry the request')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry the request'));

    // Wait for the recovery action to complete
    await waitFor(() => {
      expect(onReset).toHaveBeenCalled();
    });
  });

  it('shows error details when showDetails is true', () => {
    const testError = new SellerError(
      SellerErrorType.VALIDATION_ERROR,
      'Validation failed',
      'VALIDATION_001'
    );

    render(<DefaultSellerErrorFallback error={testError} showDetails={true} />);

    expect(screen.getByText('Hide Error Details')).toBeInTheDocument();
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
  });

  it('toggles error details visibility', () => {
    const testError = new SellerError(
      SellerErrorType.CACHE_ERROR,
      'Cache error'
    );

    render(<DefaultSellerErrorFallback error={testError} />);

    // Initially hidden
    expect(screen.getByText('Show Error Details')).toBeInTheDocument();

    // Click to show
    fireEvent.click(screen.getByText('Show Error Details'));
    expect(screen.getByText('Hide Error Details')).toBeInTheDocument();
    expect(screen.getByText('Technical Details')).toBeInTheDocument();

    // Click to hide
    fireEvent.click(screen.getByText('Hide Error Details'));
    expect(screen.getByText('Show Error Details')).toBeInTheDocument();
  });

  it('displays correct error icon for different error types', async () => {
    const errorTypes = [
      { type: SellerErrorType.NETWORK_ERROR, icon: '🌐' },
      { type: SellerErrorType.API_ERROR, icon: '🔌' },
      { type: SellerErrorType.CACHE_ERROR, icon: '💾' },
      { type: SellerErrorType.VALIDATION_ERROR, icon: '✏️' },
      { type: SellerErrorType.PERMISSION_ERROR, icon: '🔒' },
      { type: SellerErrorType.IMAGE_UPLOAD_ERROR, icon: '🖼️' },
      { type: SellerErrorType.TIER_VALIDATION_ERROR, icon: '⭐' },
    ];

    for (const { type, icon } of errorTypes) {
      const error = new SellerError(type, 'Test error');
      const { rerender } = render(<DefaultSellerErrorFallback error={error} />);
      
      expect(screen.getByText(icon)).toBeInTheDocument();
      
      // Clean up for next iteration
      rerender(<div />);
    }
  });

  it('shows loading state during recovery action', async () => {
    const apiError = new SellerError(
      SellerErrorType.API_ERROR,
      'API request failed'
    );

    render(<DefaultSellerErrorFallback error={apiError} />);

    await waitFor(() => {
      expect(screen.getByText('Retry the request')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry the request'));

    // Should show loading state
    expect(screen.getByText('Working...')).toBeInTheDocument();
  });

  it('includes help link', () => {
    render(<DefaultSellerErrorFallback />);

    const helpLink = screen.getByText('Contact Support');
    expect(helpLink).toBeInTheDocument();
    expect(helpLink.closest('a')).toHaveAttribute('href', '/support');
  });
});