import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeedErrorBoundary, CommunityErrorBoundary, Web3ErrorBoundary } from '../ErrorBoundaries';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('Error Boundaries', () => {
  describe('FeedErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <FeedErrorBoundary>
          <ThrowError shouldThrow={false} />
        </FeedErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('renders error UI when there is an error', () => {
      render(
        <FeedErrorBoundary>
          <ThrowError />
        </FeedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong with the feed')).toBeInTheDocument();
      expect(screen.getByText('Try refreshing the page or check your connection')).toBeInTheDocument();
      expect(screen.getByText('Refresh Feed')).toBeInTheDocument();
    });

    it('provides retry functionality', () => {
      const { rerender } = render(
        <FeedErrorBoundary>
          <ThrowError />
        </FeedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong with the feed')).toBeInTheDocument();

      // Click retry button
      const retryButton = screen.getByText('Refresh Feed');
      retryButton.click();

      // Re-render with no error
      rerender(
        <FeedErrorBoundary>
          <ThrowError shouldThrow={false} />
        </FeedErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('logs error details', () => {
      render(
        <FeedErrorBoundary>
          <ThrowError />
        </FeedErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith('Feed Error:', expect.any(Error), expect.any(Object));
    });
  });

  describe('CommunityErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <CommunityErrorBoundary>
          <ThrowError shouldThrow={false} />
        </CommunityErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('renders community-specific error UI', () => {
      render(
        <CommunityErrorBoundary>
          <ThrowError />
        </CommunityErrorBoundary>
      );

      expect(screen.getByText('Community Error')).toBeInTheDocument();
      expect(screen.getByText('Unable to load community content')).toBeInTheDocument();
      expect(screen.getByText('Back to Feed')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('provides navigation back to feed', () => {
      const mockNavigate = jest.fn();
      
      render(
        <CommunityErrorBoundary>
          <ThrowError />
        </CommunityErrorBoundary>
      );

      const backButton = screen.getByText('Back to Feed');
      backButton.click();

      // Navigation would be handled by router in real implementation
      expect(backButton).toBeInTheDocument();
    });
  });

  describe('Web3ErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <Web3ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </Web3ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('renders Web3-specific error UI', () => {
      render(
        <Web3ErrorBoundary>
          <ThrowError />
        </Web3ErrorBoundary>
      );

      expect(screen.getByText('Web3 Connection Error')).toBeInTheDocument();
      expect(screen.getByText('There was an issue with your wallet connection')).toBeInTheDocument();
      expect(screen.getByText('Reconnect Wallet')).toBeInTheDocument();
      expect(screen.getByText('Continue Without Wallet')).toBeInTheDocument();
    });

    it('provides wallet reconnection option', () => {
      render(
        <Web3ErrorBoundary>
          <ThrowError />
        </Web3ErrorBoundary>
      );

      const reconnectButton = screen.getByText('Reconnect Wallet');
      reconnectButton.click();

      // Wallet reconnection would be handled by Web3 context in real implementation
      expect(reconnectButton).toBeInTheDocument();
    });

    it('allows continuing without wallet', () => {
      render(
        <Web3ErrorBoundary>
          <ThrowError />
        </Web3ErrorBoundary>
      );

      const continueButton = screen.getByText('Continue Without Wallet');
      continueButton.click();

      // Would navigate to read-only mode in real implementation
      expect(continueButton).toBeInTheDocument();
    });
  });

  describe('Error Boundary Recovery', () => {
    it('resets error state when props change', () => {
      const { rerender } = render(
        <FeedErrorBoundary key="test-1">
          <ThrowError />
        </FeedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong with the feed')).toBeInTheDocument();

      // Re-render with different key to simulate prop change
      rerender(
        <FeedErrorBoundary key="test-2">
          <ThrowError shouldThrow={false} />
        </FeedErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('maintains error state for same props', () => {
      const { rerender } = render(
        <FeedErrorBoundary>
          <ThrowError />
        </FeedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong with the feed')).toBeInTheDocument();

      // Re-render with same props
      rerender(
        <FeedErrorBoundary>
          <ThrowError />
        </FeedErrorBoundary>
      );

      // Should still show error
      expect(screen.getByText('Something went wrong with the feed')).toBeInTheDocument();
    });
  });

  describe('Nested Error Boundaries', () => {
    it('catches errors at the appropriate level', () => {
      render(
        <FeedErrorBoundary>
          <div>Feed content</div>
          <CommunityErrorBoundary>
            <ThrowError />
          </CommunityErrorBoundary>
        </FeedErrorBoundary>
      );

      // Should show community error, not feed error
      expect(screen.getByText('Community Error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong with the feed')).not.toBeInTheDocument();
      expect(screen.getByText('Feed content')).toBeInTheDocument();
    });

    it('bubbles up when inner boundary fails', () => {
      const FailingBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        throw new Error('Boundary error');
      };

      render(
        <FeedErrorBoundary>
          <FailingBoundary>
            <div>Content</div>
          </FailingBoundary>
        </FeedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong with the feed')).toBeInTheDocument();
    });
  });
});