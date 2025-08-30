/**
 * ProductCard Component Tests
 * Tests for glassmorphic product card with lazy loading and trust indicators
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock design system components
jest.mock('../../../design-system/components/DualPricing', () => ({
  DualPricing: ({ cryptoPrice, fiatPrice }: any) => (
    <div data-testid="dual-pricing">
      {cryptoPrice} ≈ {fiatPrice}
    </div>
  ),
}));

jest.mock('../../../design-system/components/TrustIndicators', () => ({
  TrustIndicators: ({ verified, escrowProtected, onChainCertified }: any) => (
    <div data-testid="trust-indicators">
      {verified && <span>✅</span>}
      {escrowProtected && <span>🔒</span>}
      {onChainCertified && <span>⛓️</span>}
    </div>
  ),
}));

jest.mock('../../../design-system/components/LoadingSkeleton', () => ({
  LoadingSkeleton: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

jest.mock('../../../design-system/components/GlassPanel', () => ({
  GlassPanel: ({ children, className }: any) => (
    <div className={`glass-panel ${className}`}>{children}</div>
  ),
}));

jest.mock('../../../design-system/components/Button', () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button 
      onClick={onClick} 
      data-variant={variant} 
      data-size={size}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

const mockProduct = {
  id: 'product-1',
  title: 'Test Product',
  description: 'This is a test product description',
  images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
  price: {
    crypto: '0.15',
    cryptoSymbol: 'ETH',
    fiat: '260.00',
    fiatSymbol: 'USD',
  },
  seller: {
    id: 'seller-1',
    name: 'Test Seller',
    avatar: 'https://example.com/avatar.jpg',
    verified: true,
    reputation: 4.5,
    daoApproved: true,
  },
  trust: {
    verified: true,
    escrowProtected: true,
    onChainCertified: false,
  },
  category: 'Electronics',
  isNFT: false,
  inventory: 10,
};

describe('ProductCard', () => {
  const mockHandlers = {
    onProductClick: jest.fn(),
    onSellerClick: jest.fn(),
    onAddToCart: jest.fn(),
    onAddToWishlist: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Grid Variant', () => {
    it('renders product information correctly', () => {
      render(
        <ProductCard 
          product={mockProduct} 
          variant="grid"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('This is a test product description')).toBeInTheDocument();
      expect(screen.getByText('Test Seller')).toBeInTheDocument();
      expect(screen.getByTestId('dual-pricing')).toBeInTheDocument();
      expect(screen.getByTestId('trust-indicators')).toBeInTheDocument();
    });

    it('displays trust indicators correctly', () => {
      render(<ProductCard product={mockProduct} variant="grid" />);
      
      const trustIndicators = screen.getByTestId('trust-indicators');
      expect(trustIndicators).toHaveTextContent('✅'); // verified
      expect(trustIndicators).toHaveTextContent('🔒'); // escrow protected
      expect(trustIndicators).not.toHaveTextContent('⛓️'); // not on-chain certified
    });

    it('shows NFT badge when product is NFT', () => {
      const nftProduct = { ...mockProduct, isNFT: true };
      render(<ProductCard product={nftProduct} variant="grid" />);
      
      expect(screen.getByText('NFT')).toBeInTheDocument();
    });

    it('shows low stock indicator when inventory is low', () => {
      const lowStockProduct = { ...mockProduct, inventory: 3 };
      render(<ProductCard product={lowStockProduct} variant="grid" />);
      
      expect(screen.getByText('Only 3 left')).toBeInTheDocument();
    });

    it('shows DAO approval badge', () => {
      render(<ProductCard product={mockProduct} variant="grid" />);
      
      expect(screen.getByText('DAO')).toBeInTheDocument();
    });

    it('handles product click', () => {
      render(
        <ProductCard 
          product={mockProduct} 
          variant="grid"
          onProductClick={mockHandlers.onProductClick}
        />
      );

      fireEvent.click(screen.getByText('Test Product'));
      expect(mockHandlers.onProductClick).toHaveBeenCalledWith('product-1');
    });

    it('handles seller click', () => {
      render(
        <ProductCard 
          product={mockProduct} 
          variant="grid"
          onSellerClick={mockHandlers.onSellerClick}
        />
      );

      fireEvent.click(screen.getByText('Test Seller'));
      expect(mockHandlers.onSellerClick).toHaveBeenCalledWith('seller-1');
    });

    it('handles add to cart', () => {
      render(
        <ProductCard 
          product={mockProduct} 
          variant="grid"
          onAddToCart={mockHandlers.onAddToCart}
        />
      );

      fireEvent.click(screen.getByText('Buy Now'));
      expect(mockHandlers.onAddToCart).toHaveBeenCalledWith('product-1');
    });

    it('handles wishlist toggle', () => {
      render(
        <ProductCard 
          product={mockProduct} 
          variant="grid"
          onAddToWishlist={mockHandlers.onAddToWishlist}
        />
      );

      const wishlistButton = screen.getByText('🤍');
      fireEvent.click(wishlistButton);
      expect(mockHandlers.onAddToWishlist).toHaveBeenCalledWith('product-1');
    });
  });

  describe('List Variant', () => {
    it('renders in list layout', () => {
      render(
        <ProductCard 
          product={mockProduct} 
          variant="list"
          {...mockHandlers}
        />
      );

      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('Add to Cart')).toBeInTheDocument();
    });

    it('shows compact trust indicators in list view', () => {
      render(<ProductCard product={mockProduct} variant="list" />);
      
      const trustIndicators = screen.getByTestId('trust-indicators');
      expect(trustIndicators).toBeInTheDocument();
    });
  });

  describe('Image Loading', () => {
    it('shows loading skeleton while image loads', () => {
      render(<ProductCard product={mockProduct} variant="grid" />);
      
      // Initially shows skeleton (there are multiple skeletons for product and seller images)
      expect(screen.getAllByTestId('loading-skeleton').length).toBeGreaterThan(0);
    });

    it('handles image load error gracefully', async () => {
      render(<ProductCard product={mockProduct} variant="grid" />);
      
      const images = screen.getAllByRole('img');
      const productImage = images.find(img => img.getAttribute('alt') === 'Test Product');
      fireEvent.error(productImage!);
      
      await waitFor(() => {
        expect(screen.getByText('Image not available')).toBeInTheDocument();
      });
    });
  });

  describe('Trust Indicators Toggle', () => {
    it('hides trust indicators when showTrustIndicators is false', () => {
      render(
        <ProductCard 
          product={mockProduct} 
          variant="grid"
          showTrustIndicators={false}
        />
      );

      expect(screen.queryByTestId('trust-indicators')).not.toBeInTheDocument();
    });
  });

  describe('Pricing Display', () => {
    it('displays dual pricing with crypto and fiat', () => {
      render(<ProductCard product={mockProduct} variant="grid" />);
      
      const pricing = screen.getByTestId('dual-pricing');
      expect(pricing).toHaveTextContent('0.15');
      expect(pricing).toHaveTextContent('260.00');
    });
  });

  describe('Accessibility', () => {
    it('has proper alt text for images', () => {
      render(<ProductCard product={mockProduct} variant="grid" />);
      
      const images = screen.getAllByRole('img');
      const productImage = images.find(img => img.getAttribute('alt') === 'Test Product');
      expect(productImage).toHaveAttribute('alt', 'Test Product');
    });

    it('has clickable elements with proper roles', () => {
      render(
        <ProductCard 
          product={mockProduct} 
          variant="grid"
          {...mockHandlers}
        />
      );

      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button).toHaveAttribute('data-variant');
        expect(button).toHaveAttribute('data-size');
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('applies correct CSS classes for grid layout', () => {
      const { container } = render(
        <ProductCard product={mockProduct} variant="grid" />
      );
      
      expect(container.firstChild).toHaveClass('cursor-pointer');
    });

    it('applies correct CSS classes for list layout', () => {
      const { container } = render(
        <ProductCard product={mockProduct} variant="list" />
      );
      
      expect(container.firstChild).toHaveClass('cursor-pointer');
    });
  });
});