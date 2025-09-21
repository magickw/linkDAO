import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostCardErrorBoundary, SidebarErrorBoundary } from '../index';
import RetryHandler from '../RetryHandler';
import GracefulDegradation from '../GracefulDegradation';
import { PostCardSkeleton, SidebarWidgetSkeleton } from '../../LoadingSkeletons';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock components for testing
const MockPostCard: React.FC<{ shouldError?: boolean }> = ({ shouldError = false }) => {
  if (shouldError) {
    throw new Error('Post loading failed');
  }
  return <div>Post content loaded successfully</div>;
};

const MockSidebarWidget: React.FC<{ shouldError?: boolean }> = ({ shouldError = false }) => {
  if (shouldError) {
    throw new Error('Widget loading failed');
  }
  return <div>Widget content loaded successfully</div>;
};

describe('Error Handling Integration', () => {
  beforeEach(() => {
    console.error = jest.fn(); // Suppress error logs in tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders error boundaries correctly', () => {
    render(
      <div>
        <PostCardErrorBoundary>
          <MockPostCard shouldError={false} />
        </PostCardErrorBoundary>
        <SidebarErrorBoundary widgetName="Test Widget">
          <MockSidebarWidget shouldError={false} />
        </SidebarErrorBoundary>
      </div>
    );
    
    expect(screen.getByText('Post content loaded successfully')).toBeInTheDocument();
    expect(screen.getByText('Widget content loaded successfully')).toBeInTheDocument();
  });

  it('handles post card errors with error boundary', () => {
    render(
      <PostCardErrorBoundary>
        <MockPostCard shouldError={true} />
      </PostCardErrorBoundary>
    );
    
    expect(screen.getByText('Post Loading Error')).toBeInTheDocument();
    expect(screen.getByText(/This post couldn't be displayed properly/)).toBeInTheDocument();
  });

  it('handles sidebar widget errors with error boundary', () => {
    render(
      <SidebarErrorBoundary widgetName="Test Widget">
        <MockSidebarWidget shouldError={true} />
      </SidebarErrorBoundary>
    );
    
    expect(screen.getByText('Test Widget Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/This section couldn't load properly/)).toBeInTheDocument();
  });

  it('shows loading skeletons', () => {
    const { container } = render(
      <div>
        <PostCardSkeleton />
        <SidebarWidgetSkeleton type="about" />
      </div>
    );
    
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(2);
  });

  it('handles retry functionality', () => {
    const mockRetry = jest.fn();
    const error = new Error('Network error');
    
    render(
      <RetryHandler onRetry={mockRetry} error={error}>
        <div>Content</div>
      </RetryHandler>
    );
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText(/Retry/));
    expect(mockRetry).toHaveBeenCalled();
  });

  it('shows graceful degradation for features', () => {
    render(
      <GracefulDegradation feature="web3-features" severity="medium">
        <div>Web3 content</div>
      </GracefulDegradation>
    );
    
    expect(screen.getByText('Web3 Features Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Web3 content')).toBeInTheDocument();
  });

  it('handles different severity levels', () => {
    const { container } = render(
      <div>
        <GracefulDegradation feature="test" severity="high">
          <div>High severity content</div>
        </GracefulDegradation>
        <GracefulDegradation feature="test" severity="medium">
          <div>Medium severity content</div>
        </GracefulDegradation>
        <GracefulDegradation feature="test" severity="low" showFallback={true}>
          <div>Low severity content</div>
        </GracefulDegradation>
      </div>
    );
    
    // Check for different background colors based on severity
    expect(container.querySelector('.bg-red-50')).toBeInTheDocument(); // High
    expect(container.querySelector('.bg-yellow-50')).toBeInTheDocument(); // Medium
    expect(container.querySelector('.bg-gray-50')).toBeInTheDocument(); // Low
  });

  it('isolates errors between components', () => {
    render(
      <div>
        <PostCardErrorBoundary>
          <MockPostCard shouldError={true} />
        </PostCardErrorBoundary>
        <SidebarErrorBoundary widgetName="Working Widget">
          <MockSidebarWidget shouldError={false} />
        </SidebarErrorBoundary>
      </div>
    );
    
    // Post should show error
    expect(screen.getByText('Post Loading Error')).toBeInTheDocument();
    
    // But widget should still work
    expect(screen.getByText('Widget content loaded successfully')).toBeInTheDocument();
  });
});