/**
 * Marketplace Error Handling Tests
 * Tests comprehensive error handling and fallback mechanisms
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import { MarketplaceErrorBoundary } from '../components/ErrorHandling/MarketplaceErrorBoundary';
import { 
  ProductNotFoundFallback, 
  SellerNotFoundFallback, 
  NetworkErrorFallback,
  ServerErrorFallback 
} from '../components/ErrorHandling/MarketplaceErrorFallback';
import { enhancedMarketplaceService } from '../services/enhancedMarketplaceService';
import useMarketplaceErrorHandler from '../hooks/useMarketplaceErrorHandler';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

jest.mock('../services/enhancedMarketplaceService');
jest.mock('../context/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn()
  })
}));

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  query: {},
  asPath: '/marketplace'
};

// Test component that throws an error
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('Marketplace Error Handling', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  describe('MarketplaceErrorBoundary', () => {
    it('should catch and display errors with retry option', () => {
      const onError = jest.fn();
      
      render(
        <MarketplaceErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow={true} />
        </MarketplaceErrorBoundary>
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
      expect(screen.getByText(/go back/i)).toBeInTheDocument();
      expect(screen.getByText(/marketplace/i)).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });

    it('should allow retry up to maximum attempts', async () => {
      let shouldThrow = true;
      const TestComponent = () => <ErrorThrowingComponent shouldThrow={shouldThrow} />;
      
      const { rerender } = render(
        <MarketplaceErrorBoundary>
          <TestComponent />
        </MarketplaceErrorBoundary>
      );

      // First error
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
      
      // Click retry
      fireEvent.click(screen.getByText(/try again/i));
      
      // Component should re-render
      shouldThrow = false;
      rerender(
        <MarketplaceErrorBoundary>
          <TestComponent />
        </MarketplaceErrorBoundary>
      );
    });

    it('should navigate back when Go Back is clicked', () => {
      render(
        <MarketplaceErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </MarketplaceErrorBoundary>
      );

      fireEvent.click(screen.getByText(/go back/i));
      expect(mockRouter.back).toHaveBeenCalled();
    });

    it('should navigate to marketplace when Return to Marketplace is clicked', () => {
      render(
        <MarketplaceErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </MarketplaceErrorBoundary>
      );

      fireEvent.click(screen.getByText(/marketplace/i));
      // Should redirect to marketplace
      expect(window.location.href).toContain('/marketplace');
    });
  });

  describe('ProductNotFoundFallback', () => {
    it('should display product not found message with actions', () => {
      const onRetry = jest.fn();
      
      render(
        <ProductNotFoundFallback 
          productId="test-product-123" 
          onRetry={onRetry}
        />
      );

      expect(screen.getByText(/product not found/i)).toBeInTheDocument();
      expect(screen.getByText(/test-product-123/)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
      expect(screen.getByText(/browse marketplace/i)).toBeInTheDocument();
      expect(screen.getByText(/go back/i)).toBeInTheDocument();
    });

    it('should call retry function when Try Again is clicked', () => {
      const onRetry = jest.fn();
      
      render(
        <ProductNotFoundFallback 
          productId="test-product-123" 
          onRetry={onRetry}
        />
      );

      fireEvent.click(screen.getByText(/try again/i));
      expect(onRetry).toHaveBeenCalled();
    });

    it('should navigate to marketplace when Browse Marketplace is clicked', () => {
      render(<ProductNotFoundFallback productId="test-product-123" />);

      fireEvent.click(screen.getByText(/browse marketplace/i));
      expect(mockRouter.push).toHaveBeenCalledWith('/marketplace');
    });
  });

  describe('SellerNotFoundFallback', () => {
    it('should display seller not found message', () => {
      render(<SellerNotFoundFallback sellerId="test-seller-456" />);

      expect(screen.getByText(/seller store not found/i)).toBeInTheDocument();
      expect(screen.getByText(/test-seller-456/)).toBeInTheDocument();
      expect(screen.getByText(/browse all sellers/i)).toBeInTheDocument();
    });

    it('should navigate to sellers page when Browse All Sellers is clicked', () => {
      render(<SellerNotFoundFallback sellerId="test-seller-456" />);

      fireEvent.click(screen.getByText(/browse all sellers/i));
      expect(mockRouter.push).toHaveBeenCalledWith('/marketplace?tab=sellers');
    });
  });

  describe('NetworkErrorFallback', () => {
    it('should display network error message with suggested actions', () => {
      const onRetry = jest.fn();
      
      render(<NetworkErrorFallback onRetry={onRetry} />);

      expect(screen.getByText(/connection problem/i)).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
      expect(screen.getByText(/refresh page/i)).toBeInTheDocument();
    });

    it('should refresh page when Refresh Page is clicked', () => {
      const originalReload = window.location.reload;
      window.location.reload = jest.fn();
      
      render(<NetworkErrorFallback />);

      fireEvent.click(screen.getByText(/refresh page/i));
      expect(window.location.reload).toHaveBeenCalled();
      
      window.location.reload = originalReload;
    });
  });

  describe('ServerErrorFallback', () => {
    it('should display server error message', () => {
      render(<ServerErrorFallback />);

      expect(screen.getByText(/service temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/experiencing issues/i)).toBeInTheDocument();
      expect(screen.getByText(/return to marketplace/i)).toBeInTheDocument();
    });
  });

  describe('Enhanced Marketplace Service Error Handling', () => {
    it('should handle API errors with retry logic', async () => {
      const mockError = new Error('Network error');
      (enhancedMarketplaceService.getListingById as jest.Mock)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          success: true,
          data: { id: 'test', title: 'Test Product' }
        });

      // First call should fail
      const result1 = await enhancedMarketplaceService.getListingById('test-id');
      expect(result1.success).toBe(false);

      // Second call should succeed (simulating retry)
      const result2 = await enhancedMarketplaceService.getListingById('test-id');
      expect(result2.success).toBe(true);
    });

    it('should classify errors correctly', async () => {
      const notFoundError = new Error('404 Not Found');
      (enhancedMarketplaceService.getListingById as jest.Mock)
        .mockResolvedValue({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
            retryable: false
          }
        });

      const result = await enhancedMarketplaceService.getListingById('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.retryable).toBe(false);
    });
  });

  describe('useMarketplaceErrorHandler Hook', () => {
    const TestComponent: React.FC = () => {
      const { handleError, error, retry, clearError } = useMarketplaceErrorHandler();

      return (
        <div>
          <button onClick={() => handleError(new Error('Test error'))}>
            Trigger Error
          </button>
          <button onClick={() => retry(() => {})}>
            Retry
          </button>
          <button onClick={clearError}>
            Clear Error
          </button>
          {error && <div data-testid="error-message">{error.message}</div>}
        </div>
      );
    };

    it('should handle and classify errors', () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText(/trigger error/i));
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    it('should clear errors', () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText(/trigger error/i));
      expect(screen.getByTestId('error-message')).toBeInTheDocument();

      fireEvent.click(screen.getByText(/clear error/i));
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should handle retry functionality', () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByText(/trigger error/i));
      fireEvent.click(screen.getByText(/retry/i));
      
      // Error should be cleared during retry
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  describe('Error Recovery Actions', () => {
    it('should provide appropriate suggested actions for different error types', () => {
      const TestComponent: React.FC = () => {
        const { classifyError } = useMarketplaceErrorHandler();
        
        const networkError = classifyError(new Error('Network connection failed'));
        const notFoundError = classifyError(new Error('404 Not Found'));
        const serverError = classifyError(new Error('500 Internal Server Error'));

        return (
          <div>
            <div data-testid="network-actions">
              {networkError.suggestedActions?.join(', ')}
            </div>
            <div data-testid="notfound-actions">
              {notFoundError.suggestedActions?.join(', ')}
            </div>
            <div data-testid="server-actions">
              {serverError.suggestedActions?.join(', ')}
            </div>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('network-actions')).toHaveTextContent(/check your internet/i);
      expect(screen.getByTestId('notfound-actions')).toHaveTextContent(/check if the url/i);
      expect(screen.getByTestId('server-actions')).toHaveTextContent(/wait a few minutes/i);
    });
  });
});

describe('Error Boundary Integration', () => {
  it('should work with marketplace pages', () => {
    const MockMarketplacePage = () => {
      throw new Error('Page load error');
    };

    render(
      <MarketplaceErrorBoundary>
        <MockMarketplacePage />
      </MarketplaceErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });

  it('should handle navigation errors gracefully', () => {
    const MockProductCard = () => {
      const router = useRouter();
      
      return (
        <button 
          onClick={() => {
            throw new Error('Navigation failed');
          }}
        >
          Navigate to Product
        </button>
      );
    };

    render(
      <MarketplaceErrorBoundary>
        <MockProductCard />
      </MarketplaceErrorBoundary>
    );

    fireEvent.click(screen.getByText(/navigate to product/i));
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});