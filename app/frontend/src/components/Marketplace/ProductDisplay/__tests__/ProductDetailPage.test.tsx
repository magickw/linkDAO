/**
 * ProductDetailPage Component Tests
 * Tests for comprehensive product detail view with media viewer
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductDetailPage from '../ProductDetailPage';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock design system components
jest.mock('@/design-system/components/DualPricing', () => ({
  DualPricing: ({ cryptoPrice, fiatPrice, showToggle }: any) => (
    <div data-testid="dual-pricing">
      {cryptoPrice} ≈ {fiatPrice}
      {showToggle && <button>Toggle</button>}
    </div>
  ),
}));

jest.mock('@/design-system/components/TrustIndicators', () => ({
  TrustIndicators: ({ verified, escrowProtected, onChainCertified }: any) => (
    <div data-testid="trust-indicators">
      {verified && <span>✅</span>}
      {escrowProtected && <span>🔒</span>}
      {onChainCertified && <span>⛓️</span>}
    </div>
  ),
}));

jest.mock('@/design-system/components/LoadingSkeleton', () => ({
  LoadingSkeleton: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

jest.mock('@/design-system/components/GlassPanel', () => ({
  GlassPanel: ({ children, className }: any) => (
    <div className={`glass-panel ${className}`}>{children}</div>
  ),
}));

jest.mock('@/design-system/components/Button', () => ({
  Button: ({ children, onClick, variant, size, disabled }: any) => (
    <button 
      onClick={onClick} 
      data-variant={variant} 
      data-size={size}
      disabled={disabled}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

const mockProduct = {
  id: 'product-1',
  title: 'Test Product Detail',
  description: 'Short description',
  longDescription: 'This is a comprehensive description of the test product with all the details.',
  media: [
    { type: 'image' as const, url: 'https://example.com/image1.jpg', alt: 'Product image 1' },
    { type: 'video' as const, url: 'https://example.com/video1.mp4', thumbnail: 'https://example.com/thumb1.jpg' },
    { type: '3d' as const, url: 'https://example.com/model.glb' },
  ],
  price: {
    crypto: '0.25',
    cryptoSymbol: 'ETH',
    fiat: '450.00',
    fiatSymbol: 'USD',
  },
  seller: {
    id: 'seller-1',
    name: 'Premium Seller',
    avatar: 'https://example.com/avatar.jpg',
    verified: true,
    reputation: 4.8,
    daoApproved: true,
    totalSales: 1250,
    memberSince: 'Jan 2023',
    responseTime: '< 1 hour',
  },
  trust: {
    verified: true,
    escrowProtected: true,
    onChainCertified: true,
    authenticityNFT: '0x123...abc',
  },
  specifications: {
    'Brand': 'Test Brand',
    'Model': 'TB-2024',
    'Weight': '1.2 kg',
    'Dimensions': '30 x 20 x 10 cm',
  },
  category: 'Electronics',
  tags: ['premium', 'verified', 'fast-shipping'],
  isNFT: false,
  inventory: 5,
  shipping: {
    freeShipping: true,
    estimatedDays: '2-3 days',
  },
  reviews: {
    average: 4.7,
    count: 89,
  },
};

describe('ProductDetailPage', () => {
  const mockHandlers = {
    onAddToCart: jest.fn(),
    onBuyNow: jest.fn(),
    onAddToWishlist: jest.fn(),
    onContactSeller: jest.fn(),
    onViewSellerProfile: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Product Information Display', () => {
    it('renders product title and description', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      expect(screen.getByText('Test Product Detail')).toBeInTheDocument();
      expect(screen.getByText('This is a comprehensive description of the test product with all the details.')).toBeInTheDocument();
    });

    it('displays category and tags', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('#premium')).toBeInTheDocument();
      expect(screen.getByText('#verified')).toBeInTheDocument();
      expect(screen.getByText('#fast-shipping')).toBeInTheDocument();
    });

    it('shows review information', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      expect(screen.getByText('4.7/5.0')).toBeInTheDocument();
      expect(screen.getByText('(89 reviews)')).toBeInTheDocument();
    });
  });

  describe('Media Viewer', () => {
    it('displays media navigation when multiple media items exist', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      expect(screen.getByText('IMAGE 1/3')).toBeInTheDocument();
      expect(screen.getByText('←')).toBeInTheDocument();
      expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('handles media navigation', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      const nextButton = screen.getByText('→');
      fireEvent.click(nextButton);

      // Should show video indicator
      expect(screen.getByText('VIDEO 2/3')).toBeInTheDocument();
    });

    it('shows 3D model placeholder', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      // Navigate to 3D model
      const nextButton = screen.getByText('→');
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      expect(screen.getByText('3D Model Viewer')).toBeInTheDocument();
      expect(screen.getByText('Interactive 3D model would load here')).toBeInTheDocument();
    });
  });

  describe('Pricing and Actions', () => {
    it('displays dual pricing with toggle', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      const pricing = screen.getByTestId('dual-pricing');
      expect(pricing).toHaveTextContent('0.25');
      expect(pricing).toHaveTextContent('450.00');
      expect(screen.getByText('Toggle')).toBeInTheDocument();
    });

    it('shows shipping information', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      expect(screen.getByText('Free shipping')).toBeInTheDocument();
      expect(screen.getByText(/Estimated delivery.*2-3 days/)).toBeInTheDocument();
    });

    it('handles quantity changes', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      const increaseButton = screen.getByText('+');
      const decreaseButton = screen.getByText('-');

      fireEvent.click(increaseButton);
      expect(screen.getByText('2')).toBeInTheDocument();

      fireEvent.click(decreaseButton);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('handles buy now action', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      fireEvent.click(screen.getByText('Buy Now'));
      expect(mockHandlers.onBuyNow).toHaveBeenCalledWith('product-1', 1);
    });

    it('handles add to cart action', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      fireEvent.click(screen.getByText('Add to Cart'));
      expect(mockHandlers.onAddToCart).toHaveBeenCalledWith('product-1', 1);
    });
  });

  describe('Seller Information', () => {
    it('displays seller details', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      expect(screen.getByText('Premium Seller')).toBeInTheDocument();
      expect(screen.getByText('4.8/5.0')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('Jan 2023')).toBeInTheDocument();
      expect(screen.getByText('< 1 hour')).toBeInTheDocument();
    });

    it('shows DAO approval badge', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      expect(screen.getByText('DAO Approved')).toBeInTheDocument();
    });

    it('handles seller actions', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      fireEvent.click(screen.getByText('Contact Seller'));
      expect(mockHandlers.onContactSeller).toHaveBeenCalledWith('seller-1');

      fireEvent.click(screen.getByText('View Profile'));
      expect(mockHandlers.onViewSellerProfile).toHaveBeenCalledWith('seller-1');
    });
  });

  describe('Product Details Tabs', () => {
    it('switches between tabs correctly', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      // Default tab should be description
      expect(screen.getByText('This is a comprehensive description of the test product with all the details.')).toBeInTheDocument();

      // Switch to specifications
      fireEvent.click(screen.getByText('specifications'));
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
      expect(screen.getByText('TB-2024')).toBeInTheDocument();

      // Switch to reviews
      fireEvent.click(screen.getByText('reviews'));
      expect(screen.getByText('Reviews component would be implemented here')).toBeInTheDocument();
    });
  });

  describe('Trust Indicators', () => {
    it('displays all trust indicators', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      const trustIndicators = screen.getByTestId('trust-indicators');
      expect(trustIndicators).toHaveTextContent('✅'); // verified
      expect(trustIndicators).toHaveTextContent('🔒'); // escrow protected
      expect(trustIndicators).toHaveTextContent('⛓️'); // on-chain certified
    });
  });

  describe('Inventory Management', () => {
    it('shows available inventory', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      expect(screen.getByText('5 available')).toBeInTheDocument();
    });

    it('limits quantity to available inventory', () => {
      render(<ProductDetailPage product={mockProduct} {...mockHandlers} />);

      const increaseButton = screen.getByText('+');
      
      // Click increase button multiple times
      for (let i = 0; i < 10; i++) {
        fireEvent.click(increaseButton);
      }

      // Should not exceed inventory
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});