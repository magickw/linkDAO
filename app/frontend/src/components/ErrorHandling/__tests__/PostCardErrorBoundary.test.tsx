import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostCardErrorBoundary } from '../PostCardErrorBoundary';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('PostCardErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('[]');
    console.error = jest.fn(); // Suppress error logs in tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <PostCardErrorBoundary>
        <ThrowError shouldThrow={false} />
      </PostCardErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <PostCardErrorBoundary>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    expect(screen.getByText('Post Loading Error')).toBeInTheDocument();
    expect(screen.getByText(/This post couldn't be displayed properly/)).toBeInTheDocument();
  });

  it('shows retry button with correct retry count', () => {
    render(
      <PostCardErrorBoundary>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    const retryButton = screen.getByText(/Retry \(3 left\)/);
    expect(retryButton).toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    const TestComponent: React.FC = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);
      
      React.useEffect(() => {
        const timer = setTimeout(() => setShouldThrow(false), 100);
        return () => clearTimeout(timer);
      }, []);

      return <ThrowError shouldThrow={shouldThrow} />;
    };

    render(
      <PostCardErrorBoundary>
        <TestComponent />
      </PostCardErrorBoundary>
    );

    // Initially shows error
    expect(screen.getByText('Post Loading Error')).toBeInTheDocument();

    // Click retry
    const retryButton = screen.getByText(/Retry \(3 left\)/);
    fireEvent.click(retryButton);

    // Should eventually show success
    await waitFor(() => {
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  it('decreases retry count on each retry', () => {
    const { rerender } = render(
      <PostCardErrorBoundary>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    // First retry
    fireEvent.click(screen.getByText(/Retry \(3 left\)/));
    
    rerender(
      <PostCardErrorBoundary>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    expect(screen.getByText(/Retry \(2 left\)/)).toBeInTheDocument();
  });

  it('hides retry button after max retries', () => {
    const { rerender } = render(
      <PostCardErrorBoundary>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    // Exhaust all retries
    for (let i = 0; i < 3; i++) {
      const retryButton = screen.queryByText(/Retry/);
      if (retryButton) {
        fireEvent.click(retryButton);
        rerender(
          <PostCardErrorBoundary>
            <ThrowError />
          </PostCardErrorBoundary>
        );
      }
    }

    expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
  });

  it('shows reload page button', () => {
    render(
      <PostCardErrorBoundary>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <PostCardErrorBoundary onError={onError}>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;
    
    render(
      <PostCardErrorBoundary fallback={customFallback}>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Post Loading Error')).not.toBeInTheDocument();
  });

  it('logs error to localStorage', () => {
    render(
      <PostCardErrorBoundary>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'postcard-errors',
      expect.stringContaining('Test error')
    );
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <PostCardErrorBoundary>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('handles window reload', () => {
    const mockReload = jest.fn();
    Object.defineProperty(window.location, 'reload', {
      value: mockReload,
      writable: true,
    });

    render(
      <PostCardErrorBoundary>
        <ThrowError />
      </PostCardErrorBoundary>
    );

    fireEvent.click(screen.getByText('Reload Page'));
    expect(mockReload).toHaveBeenCalled();
  });
});