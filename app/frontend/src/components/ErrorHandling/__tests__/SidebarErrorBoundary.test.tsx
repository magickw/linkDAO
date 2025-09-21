import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarErrorBoundary } from '../SidebarErrorBoundary';

// Mock component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Sidebar widget error');
  }
  return <div>Widget content</div>;
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

describe('SidebarErrorBoundary', () => {
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
      <SidebarErrorBoundary>
        <ThrowError shouldThrow={false} />
      </SidebarErrorBoundary>
    );

    expect(screen.getByText('Widget content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <SidebarErrorBoundary widgetName="Test Widget">
        <ThrowError />
      </SidebarErrorBoundary>
    );

    expect(screen.getByText('Test Widget Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/This section couldn't load properly/)).toBeInTheDocument();
  });

  it('uses default widget name when not provided', () => {
    render(
      <SidebarErrorBoundary>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    expect(screen.getByText('Widget Unavailable')).toBeInTheDocument();
  });

  it('shows retry button', () => {
    render(
      <SidebarErrorBoundary>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows dismiss button', () => {
    render(
      <SidebarErrorBoundary>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    expect(screen.getByText('Dismiss')).toBeInTheDocument();
  });

  it('handles dismiss functionality', () => {
    const onDismiss = jest.fn();
    
    render(
      <SidebarErrorBoundary onDismiss={onDismiss}>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    fireEvent.click(screen.getByText('Dismiss'));
    
    expect(onDismiss).toHaveBeenCalled();
    expect(screen.queryByText('Widget Unavailable')).not.toBeInTheDocument();
  });

  it('handles X button dismiss', () => {
    render(
      <SidebarErrorBoundary>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    const xButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(xButton);
    
    expect(screen.queryByText('Widget Unavailable')).not.toBeInTheDocument();
  });

  it('handles retry functionality', () => {
    const { rerender } = render(
      <SidebarErrorBoundary>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    fireEvent.click(screen.getByText('Retry'));
    
    rerender(
      <SidebarErrorBoundary>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    // Should still show error after retry (since component still throws)
    expect(screen.getByText('Widget Unavailable')).toBeInTheDocument();
  });

  it('hides retry button after max retries', () => {
    const { rerender } = render(
      <SidebarErrorBoundary>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    // Exhaust all retries (max is 2 for sidebar)
    for (let i = 0; i < 2; i++) {
      const retryButton = screen.queryByText('Retry');
      if (retryButton) {
        fireEvent.click(retryButton);
        rerender(
          <SidebarErrorBoundary>
            <ThrowError />
          </SidebarErrorBoundary>
        );
      }
    }

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    
    render(
      <SidebarErrorBoundary onError={onError}>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom sidebar error</div>;
    
    render(
      <SidebarErrorBoundary fallback={customFallback}>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    expect(screen.getByText('Custom sidebar error')).toBeInTheDocument();
    expect(screen.queryByText('Widget Unavailable')).not.toBeInTheDocument();
  });

  it('logs error to localStorage with widget name', () => {
    render(
      <SidebarErrorBoundary widgetName="Community Stats">
        <ThrowError />
      </SidebarErrorBoundary>
    );

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'sidebar-errors',
      expect.stringContaining('Community Stats')
    );
  });

  it('returns null when dismissed', () => {
    const { container } = render(
      <SidebarErrorBoundary>
        <ThrowError />
      </SidebarErrorBoundary>
    );

    fireEvent.click(screen.getByText('Dismiss'));
    
    expect(container.firstChild).toBeNull();
  });
});