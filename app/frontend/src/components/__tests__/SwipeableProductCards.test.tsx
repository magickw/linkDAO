import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SwipeableProductCards from '../SwipeableProductCards';
import { useResponsive } from '@/design-system/hooks/useResponsive';

// Mock dependencies
jest.mock('@/design-system/hooks/useResponsive');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onDragEnd, ...props }: any) => (
      <div 
        {...props} 
        onTouchEnd={(e: any) => onDragEnd?.(e, { offset: { x: 0 }, velocity: { x: 0 } })}
      >
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockResponsive = {
  isMobile: true,
  isTouch: true,
  breakpoint: 'sm' as const,
  width: 375,
  height: 667,
  isTablet: false,
  isDesktop: false,
  orientation: 'portrait' as const,
};

const mockProducts = [
  {
    id: '1',
    title: 'iPhone 15 Pro',
    price: {
      crypto: '0.5 ETH',
      fiat: '$1,200',
      currency: 'ETH',
    },
    images: ['https://example.com/iphone.jpg'],
    seller: {
      name: 'TechStore',
      verified: true,
      reputation: 4.8,
    },
    trustIndicators: {
      verified: true,
      escrowProtected: true,
      onChainCertified: true,
    },
    category: 'Electronics',
    isNFT: false,
  },
  {
    id: '2',
    title: 'Digital Art NFT',
    price: {
      crypto: '0.1 ETH',
      fiat: '$240',
      currency: 'ETH',
    },
    images: ['https://example.com/nft.jpg'],
    seller: {
      name: 'ArtistDAO',
      verified: true,
      reputation: 4.9,
    },
    trustIndicators: {
      verified: true,
      escrowProtected: false,
      onChainCertified: true,
    },
    category: 'Digital Art',
    isNFT: true,
  },
  {
    id: '3',
    title: 'Gaming Laptop',
    price: {
      crypto: '1.2 ETH',
      fiat: '$2,880',
      currency: 'ETH',
    },
    images: ['https://example.com/laptop.jpg'],
    seller: {
      name: 'GamerHub',
      verified: false,
      reputation: 4.2,
    },
    trustIndicators: {
      verified: false,
      escrowProtected: true,
      onChainCertified: false,
    },
    category: 'Electronics',
    isNFT: false,
  },
];

const defaultProps = {
  products: mockProducts,
  onProductSelect: jest.fn(),
  onProductFavorite: jest.fn(),
  onProductShare: jest.fn(),
};

describe('SwipeableProductCards', () => {
  beforeEach(() => {
    (useResponsive as jest.Mock).mockReturnValue(mockResponsive);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders product cards', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
      expect(screen.getByText('0.5 ETH')).toBeInTheDocument();
      expect(screen.getByText('≈ $1,200')).toBeInTheDocument();
    });

    it('shows NFT badge for NFT products', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      // Navigate to NFT card
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      expect(screen.getByText('NFT')).toBeInTheDocument();
    });

    it('displays trust indicators', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      expect(screen.getByText('✅ Verified')).toBeInTheDocument();
      expect(screen.getByText('🔒 Escrow')).toBeInTheDocument();
      expect(screen.getByText('⛓️ On-Chain')).toBeInTheDocument();
    });

    it('shows seller information', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      expect(screen.getByText('TechStore')).toBeInTheDocument();
      // Verified seller should have checkmark
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    it('displays navigation dots', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      const dots = screen.getAllByRole('button');
      const navigationDots = dots.filter(button => 
        button.className.includes('w-2 h-2')
      );
      expect(navigationDots).toHaveLength(mockProducts.length);
    });

    it('shows product counter', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    it('handles empty product list', () => {
      render(<SwipeableProductCards {...defaultProps} products={[]} />);
      
      expect(screen.getByText('No products available')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('navigates to next product with arrow button', async () => {
      const user = userEvent.setup();
      render(<SwipeableProductCards {...defaultProps} />);
      
      // Should show first product initially
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
      
      // Navigate to next
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      expect(screen.getByText('Digital Art NFT')).toBeInTheDocument();
    });

    it('navigates to previous product with arrow button', async () => {
      const user = userEvent.setup();
      render(<SwipeableProductCards {...defaultProps} />);
      
      // Navigate to second product first
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      
      // Then navigate back
      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);
      
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });

    it('navigates with dot indicators', async () => {
      const user = userEvent.setup();
      render(<SwipeableProductCards {...defaultProps} />);
      
      const dots = screen.getAllByRole('button');
      const thirdDot = dots[2]; // Third navigation dot
      
      await user.click(thirdDot);
      
      expect(screen.getByText('Gaming Laptop')).toBeInTheDocument();
      expect(screen.getByText('3 of 3')).toBeInTheDocument();
    });

    it('disables navigation at boundaries', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      // Previous button should be disabled at start
      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
      
      // Navigate to end
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);
      
      // Next button should be disabled at end
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Swipe Gestures', () => {
    it('handles swipe left to next product', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      const cardContainer = screen.getByText('iPhone 15 Pro').closest('div');
      
      // Simulate swipe left
      fireEvent.touchStart(cardContainer!, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(cardContainer!, { touches: [{ clientX: 50 }] });
      fireEvent.touchEnd(cardContainer!);
      
      expect(screen.getByText('Digital Art NFT')).toBeInTheDocument();
    });

    it('handles swipe right to previous product', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      // Navigate to second product first
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      
      const cardContainer = screen.getByText('Digital Art NFT').closest('div');
      
      // Simulate swipe right
      fireEvent.touchStart(cardContainer!, { touches: [{ clientX: 50 }] });
      fireEvent.touchMove(cardContainer!, { touches: [{ clientX: 200 }] });
      fireEvent.touchEnd(cardContainer!);
      
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });

    it('shows swipe hint on mobile', () => {
      render(<SwipeableProductCards {...defaultProps} showSwipeHint={true} />);
      
      expect(screen.getByText('Swipe to browse')).toBeInTheDocument();
    });

    it('hides swipe hint after interaction', async () => {
      const user = userEvent.setup();
      render(<SwipeableProductCards {...defaultProps} showSwipeHint={true} />);
      
      expect(screen.getByText('Swipe to browse')).toBeInTheDocument();
      
      // Interact with card
      const cardContainer = screen.getByText('iPhone 15 Pro').closest('div');
      fireEvent.touchStart(cardContainer!);
      fireEvent.touchEnd(cardContainer!);
      
      await waitFor(() => {
        expect(screen.queryByText('Swipe to browse')).not.toBeInTheDocument();
      });
    });

    it('requires minimum swipe distance', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      const cardContainer = screen.getByText('iPhone 15 Pro').closest('div');
      
      // Small swipe should not trigger navigation
      fireEvent.touchStart(cardContainer!, { touches: [{ clientX: 200 }] });
      fireEvent.touchMove(cardContainer!, { touches: [{ clientX: 180 }] });
      fireEvent.touchEnd(cardContainer!);
      
      // Should still be on first product
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });
  });

  describe('Product Interactions', () => {
    it('calls onProductSelect when View Details is clicked', async () => {
      const user = userEvent.setup();
      render(<SwipeableProductCards {...defaultProps} />);
      
      const viewButton = screen.getByText('View Details');
      await user.click(viewButton);
      
      expect(defaultProps.onProductSelect).toHaveBeenCalledWith(mockProducts[0]);
    });

    it('calls onProductFavorite when favorite button is clicked', async () => {
      const user = userEvent.setup();
      render(<SwipeableProductCards {...defaultProps} />);
      
      const favoriteButton = screen.getByRole('button', { name: /favorite/i });
      await user.click(favoriteButton);
      
      expect(defaultProps.onProductFavorite).toHaveBeenCalledWith('1');
    });

    it('calls onProductShare when share button is clicked', async () => {
      const user = userEvent.setup();
      render(<SwipeableProductCards {...defaultProps} />);
      
      const shareButton = screen.getByRole('button', { name: /share/i });
      await user.click(shareButton);
      
      expect(defaultProps.onProductShare).toHaveBeenCalledWith('1');
    });

    it('does not show action buttons when callbacks not provided', () => {
      render(
        <SwipeableProductCards 
          products={mockProducts}
          onProductSelect={jest.fn()}
        />
      );
      
      expect(screen.queryByRole('button', { name: /favorite/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('shows navigation arrows on desktop', () => {
      (useResponsive as jest.Mock).mockReturnValue({
        ...mockResponsive,
        isMobile: false,
        isDesktop: true,
      });

      render(<SwipeableProductCards {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('hides navigation arrows on mobile', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });

    it('adapts to different screen orientations', () => {
      (useResponsive as jest.Mock).mockReturnValue({
        ...mockResponsive,
        orientation: 'landscape',
        width: 667,
        height: 375,
      });

      render(<SwipeableProductCards {...defaultProps} />);
      
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    });
  });

  describe('Card Variants', () => {
    it('renders compact variant', () => {
      render(
        <SwipeableProductCards 
          {...defaultProps} 
          cardVariant="compact"
        />
      );
      
      // Compact variant should still show essential info
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
      expect(screen.getByText('0.5 ETH')).toBeInTheDocument();
    });

    it('renders detailed variant', () => {
      render(
        <SwipeableProductCards 
          {...defaultProps} 
          cardVariant="detailed"
        />
      );
      
      // Detailed variant should show more information
      expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
      expect(screen.getByText('TechStore')).toBeInTheDocument();
      expect(screen.getByText('✅ Verified')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<SwipeableProductCards {...defaultProps} />);
      
      // Tab to navigation elements
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();
      
      // Arrow keys should work for navigation
      await user.keyboard('{ArrowRight}');
      expect(screen.getByText('Digital Art NFT')).toBeInTheDocument();
    });

    it('has proper ARIA labels', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      const viewButton = screen.getByText('View Details');
      expect(viewButton).toHaveAttribute('role', 'button');
    });

    it('announces current position to screen readers', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      const counter = screen.getByText('1 of 3');
      expect(counter).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Performance', () => {
    it('handles large product lists efficiently', () => {
      const largeProductList = Array.from({ length: 100 }, (_, i) => ({
        ...mockProducts[0],
        id: `product-${i}`,
        title: `Product ${i}`,
      }));

      render(
        <SwipeableProductCards 
          {...defaultProps} 
          products={largeProductList}
        />
      );
      
      expect(screen.getByText('Product 0')).toBeInTheDocument();
      expect(screen.getByText('1 of 100')).toBeInTheDocument();
    });

    it('lazy loads images', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('loading', 'lazy');
    });

    it('optimizes animations for performance', () => {
      render(<SwipeableProductCards {...defaultProps} />);
      
      const cardContainer = screen.getByText('iPhone 15 Pro').closest('div');
      expect(cardContainer).toHaveStyle({ willChange: 'transform' });
    });
  });
});