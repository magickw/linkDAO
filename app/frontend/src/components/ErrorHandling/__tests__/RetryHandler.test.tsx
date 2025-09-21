import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RetryHandler from '../RetryHandler';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('RetryHandler', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    navigator.onLine = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when no error and not loading', () => {
    render(
      <RetryHandler onRetry={mockOnRetry} error={null}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <RetryHandler onRetry={mockOnRetry} error={null} isLoading={true}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows retrying state', async () => {
    const slowRetry = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <RetryHandler onRetry={slowRetry} error={new Error('Test error')}>
        <div>Content</div>
      </RetryHandler>
    );

    fireEvent.click(screen.getByText(/Retry/));
    
    expect(screen.getByText('Retrying...')).toBeInTheDocument();
  });

  it('displays network error correctly', () => {
    const networkError = new Error('Network request failed');
    
    render(
      <RetryHandler onRetry={mockOnRetry} error={networkError}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText(/Network connection issue/)).toBeInTheDocument();
  });

  it('displays server error correctly', () => {
    const serverError = new Error('Server returned 500');
    
    render(
      <RetryHandler onRetry={mockOnRetry} error={serverError}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Loading Error')).toBeInTheDocument();
    expect(screen.getByText(/Server is temporarily unavailable/)).toBeInTheDocument();
  });

  it('displays client error correctly', () => {
    const clientError = new Error('Request returned 400');
    
    render(
      <RetryHandler onRetry={mockOnRetry} error={clientError}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Loading Error')).toBeInTheDocument();
    expect(screen.getByText(/There was an issue with your request/)).toBeInTheDocument();
  });

  it('shows offline status when offline', () => {
    navigator.onLine = false;
    const networkError = new Error('Network error');
    
    render(
      <RetryHandler onRetry={mockOnRetry} error={networkError}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText(/You appear to be offline/)).toBeInTheDocument();
  });

  it('shows online status when online', () => {
    const networkError = new Error('Network error');
    
    render(
      <RetryHandler onRetry={mockOnRetry} error={networkError}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    render(
      <RetryHandler onRetry={mockOnRetry} error={new Error('Test error')}>
        <div>Content</div>
      </RetryHandler>
    );

    fireEvent.click(screen.getByText(/Retry \(3 left\)/));
    
    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  it('decreases retry count on each attempt', () => {
    const { rerender } = render(
      <RetryHandler onRetry={mockOnRetry} error={new Error('Test error')}>
        <div>Content</div>
      </RetryHandler>
    );

    fireEvent.click(screen.getByText(/Retry \(3 left\)/));
    
    rerender(
      <RetryHandler onRetry={mockOnRetry} error={new Error('Test error')}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText(/Retry \(2 left\)/)).toBeInTheDocument();
  });

  it('hides retry button after max retries', () => {
    const { rerender } = render(
      <RetryHandler onRetry={mockOnRetry} error={new Error('Test error')} maxRetries={1}>
        <div>Content</div>
      </RetryHandler>
    );

    fireEvent.click(screen.getByText(/Retry \(1 left\)/));
    
    rerender(
      <RetryHandler onRetry={mockOnRetry} error={new Error('Test error')} maxRetries={1}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
  });

  it('disables retry button when offline for network errors', () => {
    navigator.onLine = false;
    const networkError = new Error('Network error');
    
    render(
      <RetryHandler onRetry={mockOnRetry} error={networkError}>
        <div>Content</div>
      </RetryHandler>
    );

    const retryButton = screen.getByText(/Retry/);
    expect(retryButton).toBeDisabled();
  });

  it('shows reload page button', () => {
    render(
      <RetryHandler onRetry={mockOnRetry} error={new Error('Test error')}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('handles reload page functionality', () => {
    const mockReload = jest.fn();
    Object.defineProperty(window.location, 'reload', {
      value: mockReload,
      writable: true,
    });

    render(
      <RetryHandler onRetry={mockOnRetry} error={new Error('Test error')}>
        <div>Content</div>
      </RetryHandler>
    );

    fireEvent.click(screen.getByText('Reload Page'));
    expect(mockReload).toHaveBeenCalled();
  });

  it('shows retry count information', () => {
    const { rerender } = render(
      <RetryHandler onRetry={mockOnRetry} error={new Error('Test error')}>
        <div>Content</div>
      </RetryHandler>
    );

    fireEvent.click(screen.getByText(/Retry/));
    
    rerender(
      <RetryHandler onRetry={mockOnRetry} error={new Error('Test error')}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Attempted 1 of 3 retries')).toBeInTheDocument();
  });

  it('applies retry delay', async () => {
    const delayedRetry = jest.fn(() => Promise.resolve());
    
    render(
      <RetryHandler onRetry={delayedRetry} error={new Error('Test error')} retryDelay={100}>
        <div>Content</div>
      </RetryHandler>
    );

    const startTime = Date.now();
    fireEvent.click(screen.getByText(/Retry/));
    
    await waitFor(() => {
      expect(delayedRetry).toHaveBeenCalled();
    });
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });

  it('resets retry count on successful retry', async () => {
    let shouldFail = true;
    const conditionalRetry = jest.fn(() => {
      if (shouldFail) {
        shouldFail = false;
        throw new Error('Retry failed');
      }
      return Promise.resolve();
    });

    const { rerender } = render(
      <RetryHandler onRetry={conditionalRetry} error={new Error('Test error')}>
        <div>Content</div>
      </RetryHandler>
    );

    // First retry fails
    fireEvent.click(screen.getByText(/Retry/));
    
    await waitFor(() => {
      expect(conditionalRetry).toHaveBeenCalled();
    });

    // Second retry succeeds
    rerender(
      <RetryHandler onRetry={conditionalRetry} error={null}>
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('hides network status when showNetworkStatus is false', () => {
    render(
      <RetryHandler 
        onRetry={mockOnRetry} 
        error={new Error('Network error')} 
        showNetworkStatus={false}
      >
        <div>Content</div>
      </RetryHandler>
    );

    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
  });
});