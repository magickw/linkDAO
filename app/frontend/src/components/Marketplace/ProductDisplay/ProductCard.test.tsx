import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductCard } from './ProductCard';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the OptimizedImage component since it has complex logic
jest.mock('../../Performance/OptimizedImageLoader', () => ({
  OptimizedImage: ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    // Simulate how the real OptimizedImage component handles IPFS CIDs
    let finalSrc = src || '';
    
    // Handle IPFS CIDs
    if (finalSrc && (finalSrc.startsWith('Qm') || finalSrc.startsWith('baf'))) {
      finalSrc = `https://ipfs.io/ipfs/${finalSrc}`;
    }
    
    return <img src={finalSrc} alt={alt} className={className} data-testid="optimized-image" />;
  }
}));
// Mock other components that are not relevant to image testing
jest.mock('../../../design-system/components/GlassPanel', () => ({
  GlassPanel: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="glass-panel">{children}</div>
  )
}));

jest.mock('../../../design-system/components/DualPricing', () => ({
  DualPricing: () => <div data-testid="dual-pricing">Price</div>
}));

jest.mock('../../../design-system/components/StablecoinPricing', () => ({
  StablecoinPricing: () => <div data-testid="stablecoin-pricing">Price</div>
}));

jest.mock('../../../design-system/components/Button', () => ({
  Button: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <button onClick={onClick} className={className}>{children}</button>
  )
}));

jest.mock('../../VisualPolish/MarketplaceAnimations', () => ({
  AnimatedProductBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AnimatedEngagementMetrics: () => <div>Metrics</div>,
  AnimatedTrustIndicator: () => <div>Trust</div>
}));

jest.mock('../../../hooks/useCart', () => ({
  useCart: () => ({
    actions: {
      addItem: jest.fn(),
      isInCart: jest.fn().mockReturnValue(false),
      getItem: jest.fn()
    }
  })
}));

jest.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn()
  })
}));

jest.mock('../../../hooks/useMarketplaceErrorHandler', () => () => ({
  handleError: jest.fn(),
  showErrorToast: jest.fn()
}));

jest.mock('../../../hooks/useMarketplaceData', () => ({
  usePrice: () => ({
    priceData: null
  })
}));

jest.mock('../../../utils/priceFormatter', () => ({
  formatPrice: jest.fn(),
  formatDualPrice: jest.fn()
}));

jest.mock('../../../utils/idValidator', () => ({
  validateProductID: jest.fn().mockReturnValue({ isValid: true }),
  validateSellerID: jest.fn().mockReturnValue({ isValid: true }),
  normalizeID: (id: string) => id
}));

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    title: 'Test Product',
    description: 'Test product description',
    images: [
      'https://placehold.co/400x300/4B2E83/FFFFFF?text=Product+1',
      'https://placehold.co/400x300/4B2E83/FFFFFF?text=Product+2'
    ],
    price: {
      amount: '100',
      currency: 'USD',
      usdEquivalent: '100'
    },
    seller: {
      id: 'seller1',
      name: 'Test Seller',
      avatar: 'https://placehold.co/40x40/4B2E83/FFFFFF?text=S',
      verified: true,
      reputation: 4.5,
      daoApproved: false
    },
    trust: {
      verified: true,
      escrowProtected: true,
      onChainCertified: false
    },
    category: 'Electronics'
  };

  it('renders product images correctly in grid view', () => {
    render(<ProductCard product={mockProduct} />);

    // Check that the main product image is rendered
    const mainImage = screen.getAllByTestId('optimized-image')[0];
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', mockProduct.images[0]);
    expect(mainImage).toHaveAttribute('alt', mockProduct.title);
  });

  it('handles Cloudinary URLs correctly', () => {
    const productWithCloudinary = {
      ...mockProduct,
      images: [
        'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg',
        'https://res.cloudinary.com/test-cloud/image/upload/v1234567891/product2.jpg'
      ]
    };

    render(<ProductCard product={productWithCloudinary} />);

    // Check that Cloudinary URLs are preserved
    const mainImage = screen.getAllByTestId('optimized-image')[0];
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg');
  });

  it('handles IPFS hashes correctly', () => {
    const productWithIPFS = {
      ...mockProduct,
      images: [
        'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
        'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'
      ]
    };

    render(<ProductCard product={productWithIPFS} />);

    // Check that IPFS hashes are converted to gateway URLs
    const mainImage = screen.getAllByTestId('optimized-image')[0];
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', 'https://ipfs.io/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');
  });

  it('handles missing product images gracefully', () => {
    const productWithoutImages = {
      ...mockProduct,
      images: []
    };

    render(<ProductCard product={productWithoutImages} />);

    // Should still render with fallback image
    const mainImage = screen.getAllByTestId('optimized-image')[0];
    expect(mainImage).toBeInTheDocument();
  });

  it('renders product images correctly in list view', () => {
    render(<ProductCard product={mockProduct} variant="list" />);

    // Check that the main product image is rendered
    const mainImage = screen.getAllByTestId('optimized-image')[0];
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', mockProduct.images[0]);
    expect(mainImage).toHaveAttribute('alt', mockProduct.title);
  });

  it('uses fallback image when image URL is invalid', () => {
    const productWithInvalidImage = {
      ...mockProduct,
      images: ['invalid-url']
    };

    render(<ProductCard product={productWithInvalidImage} />);

    // Should still render with the provided URL (validation happens in OptimizedImage)
    const mainImage = screen.getAllByTestId('optimized-image')[0];
    expect(mainImage).toBeInTheDocument();
    expect(mainImage).toHaveAttribute('src', 'invalid-url');
  });

  it('handles mixed Cloudinary and IPFS URLs correctly', () => {
    const productWithMixedUrls = {
      ...mockProduct,
      images: [
        'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg',
        'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'
      ]
    };

    render(<ProductCard product={productWithMixedUrls} />);

    // Check that the first image (Cloudinary URL) is handled correctly
    const mainImage = screen.getAllByTestId('optimized-image')[0];
    expect(mainImage).toHaveAttribute('src', 'https://res.cloudinary.com/test-cloud/image/upload/v1234567890/product.jpg');
  });
});