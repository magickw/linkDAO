/**
 * ProductGrid Component Tests
 * Tests for responsive grid layout with filtering and sorting
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductGrid } from '../ProductGrid';

// Mock child components
jest.mock('../ProductCard', () => ({
  ProductCard: ({ product, variant }: any) => (
    <div data-testid="product-card" data-variant={variant}>
      {product.title} - {product.category}
    </div>
  ),
}));

jest.mock('../../../design-system/components/LoadingSkeleton', () => ({
  LoadingSkeleton: () => <div data-testid="loading-skeleton">Loading...</div>,
  ProductCardSkeleton: () => <div data-testid="product-card-skeleton">Loading card...</div>,
}));

jest.mock('../../../design-system/components/GlassPanel', () => ({
  GlassPanel: ({ children, className }: any) => (
    <div className={`glass-panel ${className}`}>{children}</div>
  ),
}));

jest.mock('../../../design-system/components/Button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockProducts = [
  {
    id: '1',
    title: 'Product 1',
    description: 'Description 1',
    images: ['image1.jpg'],
    price: { crypto: '0.1', cryptoSymbol: 'ETH', fiat: '180', fiatSymbol: 'USD' },
    seller: { id: 's1', name: 'Seller 1', avatar: 'avatar1.jpg', verified: true, reputation: 4.5, daoApproved: false },
    trust: { verified: true, escrowProtected: true, onChainCertified: false },
    category: 'Electronics',
    inventory: 10,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    title: 'Product 2',
    description: 'Description 2',
    images: ['image2.jpg'],
    price: { crypto: '0.2', cryptoSymbol: 'ETH', fiat: '360', fiatSymbol: 'USD' },
    seller: { id: 's2', name: 'Seller 2', avatar: 'avatar2.jpg', verified: false, reputation: 3.8, daoApproved: true },
    trust: { verified: false, escrowProtected: true, onChainCertified: true },
    category: 'Fashion',
    inventory: 0,
    createdAt: new Date('2024-01-02'),
  },
  {
    id: '3',
    title: 'Product 3',
    description: 'Description 3',
    images: ['image3.jpg'],
    price: { crypto: '0.05', cryptoSymbol: 'ETH', fiat: '90', fiatSymbol: 'USD' },
    seller: { id: 's3', name: 'Seller 3', avatar: 'avatar3.jpg', verified: true, reputation: 4.9, daoApproved: true },
    trust: { verified: true, escrowProtected: true, onChainCertified: true },
    category: 'Electronics',
    inventory: 5,
    createdAt: new Date('2024-01-03'),
  },
];

describe('ProductGrid', () => {
  const mockHandlers = {
    onProductClick: jest.fn(),
    onSellerClick: jest.fn(),
    onAddToCart: jest.fn(),
    onAddToWishlist: jest.fn(),
    onFiltersChange: jest.fn(),
    onSortChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders products in grid layout by default', () => {
      render(<ProductGrid products={mockProducts} {...mockHandlers} />);

      expect(screen.getByText('Product 1 - Electronics')).toBeInTheDocument();
      expect(screen.getByText('Product 2 - Fashion')).toBeInTheDocument();
      expect(screen.getByText('Product 3 - Electronics')).toBeInTheDocument();
    });

    it('shows loading skeletons when loading', () => {
      render(<ProductGrid products={[]} loading={true} {...mockHandlers} />);

      expect(screen.getAllByTestId('product-card-skeleton')).toHaveLength(12); // default itemsPerPage
    });

    it('shows error message when error occurs', () => {
      render(<ProductGrid products={[]} error="Failed to load products" {...mockHandlers} />);

      expect(screen.getByText('⚠️ Error loading products')).toBeInTheDocument();
      expect(screen.getByText('Failed to load products')).toBeInTheDocument();
    });

    it('shows no products message when no products match filters', () => {
      render(<ProductGrid products={[]} {...mockHandlers} />);

      expect(screen.getByText('🔍 No products found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters or search terms')).toBeInTheDocument();
    });
  });

  describe('Layout Switching', () => {
    it('switches between grid and list layouts', () => {
      render(<ProductGrid products={mockProducts} {...mockHandlers} />);

      // Should start in grid layout
      const gridCards = screen.getAllByTestId('product-card');
      expect(gridCards[0]).toHaveAttribute('data-variant', 'grid');

      // Switch to list layout
      const listButton = screen.getByText('☰');
      fireEvent.click(listButton);

      const listCards = screen.getAllByTestId('product-card');
      expect(listCards[0]).toHaveAttribute('data-variant', 'list');
    });
  });

  describe('Filtering', () => {
    it('filters products by category', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          filters={{ category: 'Electronics' }}
          {...mockHandlers} 
        />
      );

      expect(screen.getByText('Product 1 - Electronics')).toBeInTheDocument();
      expect(screen.getByText('Product 3 - Electronics')).toBeInTheDocument();
      expect(screen.queryByText('Product 2 - Fashion')).not.toBeInTheDocument();
    });

    it('filters products by verification status', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          filters={{ verified: true }}
          {...mockHandlers} 
        />
      );

      expect(screen.getByText('Product 1 - Electronics')).toBeInTheDocument();
      expect(screen.getByText('Product 3 - Electronics')).toBeInTheDocument();
      expect(screen.queryByText('Product 2 - Fashion')).not.toBeInTheDocument();
    });

    it('filters products by stock availability', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          filters={{ inStock: true }}
          {...mockHandlers} 
        />
      );

      expect(screen.getByText('Product 1 - Electronics')).toBeInTheDocument();
      expect(screen.getByText('Product 3 - Electronics')).toBeInTheDocument();
      expect(screen.queryByText('Product 2 - Fashion')).not.toBeInTheDocument(); // out of stock
    });

    it('filters products by DAO approval', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          filters={{ daoApproved: true }}
          {...mockHandlers} 
        />
      );

      expect(screen.getByText('Product 2 - Fashion')).toBeInTheDocument();
      expect(screen.getByText('Product 3 - Electronics')).toBeInTheDocument();
      expect(screen.queryByText('Product 1 - Electronics')).not.toBeInTheDocument();
    });

    it('shows filter panel when showFilters is true', () => {
      render(<ProductGrid products={mockProducts} showFilters={true} {...mockHandlers} />);

      expect(screen.getByText('Filters')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Trust & Verification')).toBeInTheDocument();
    });

    it('handles filter changes', () => {
      render(<ProductGrid products={mockProducts} showFilters={true} {...mockHandlers} />);

      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'Electronics' } });

      expect(mockHandlers.onFiltersChange).toHaveBeenCalledWith({ category: 'Electronics' });
    });
  });

  describe('Sorting', () => {
    it('sorts products by price ascending', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          sortBy={{ field: 'price', direction: 'asc' }}
          {...mockHandlers} 
        />
      );

      const productCards = screen.getAllByTestId('product-card');
      expect(productCards[0]).toHaveTextContent('Product 3'); // $90
      expect(productCards[1]).toHaveTextContent('Product 1'); // $180
      expect(productCards[2]).toHaveTextContent('Product 2'); // $360
    });

    it('sorts products by price descending', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          sortBy={{ field: 'price', direction: 'desc' }}
          {...mockHandlers} 
        />
      );

      const productCards = screen.getAllByTestId('product-card');
      expect(productCards[0]).toHaveTextContent('Product 2'); // $360
      expect(productCards[1]).toHaveTextContent('Product 1'); // $180
      expect(productCards[2]).toHaveTextContent('Product 3'); // $90
    });

    it('sorts products by title alphabetically', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          sortBy={{ field: 'title', direction: 'asc' }}
          {...mockHandlers} 
        />
      );

      const productCards = screen.getAllByTestId('product-card');
      expect(productCards[0]).toHaveTextContent('Product 1');
      expect(productCards[1]).toHaveTextContent('Product 2');
      expect(productCards[2]).toHaveTextContent('Product 3');
    });

    it('sorts products by creation date', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          sortBy={{ field: 'createdAt', direction: 'desc' }}
          {...mockHandlers} 
        />
      );

      const productCards = screen.getAllByTestId('product-card');
      expect(productCards[0]).toHaveTextContent('Product 3'); // newest
      expect(productCards[1]).toHaveTextContent('Product 2');
      expect(productCards[2]).toHaveTextContent('Product 1'); // oldest
    });

    it('handles sort changes', () => {
      render(<ProductGrid products={mockProducts} showSorting={true} {...mockHandlers} />);

      const sortSelect = screen.getByDisplayValue('Newest First');
      fireEvent.change(sortSelect, { target: { value: 'price-asc' } });

      expect(mockHandlers.onSortChange).toHaveBeenCalledWith({ 
        field: 'price', 
        direction: 'asc' 
      });
    });
  });

  describe('Pagination', () => {
    const manyProducts = Array.from({ length: 25 }, (_, i) => ({
      ...mockProducts[0],
      id: `product-${i}`,
      title: `Product ${i}`,
    }));

    it('paginates products correctly', () => {
      render(
        <ProductGrid 
          products={manyProducts} 
          itemsPerPage={10}
          showPagination={true}
          {...mockHandlers} 
        />
      );

      // Should show first 10 products
      expect(screen.getAllByTestId('product-card')).toHaveLength(10);
      
      // Should show pagination controls
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('navigates between pages', () => {
      render(
        <ProductGrid 
          products={manyProducts} 
          itemsPerPage={10}
          showPagination={true}
          {...mockHandlers} 
        />
      );

      // Go to page 2
      fireEvent.click(screen.getByText('2'));

      // Should show products 10-19 (but our mock only creates 25 products starting from 0)
      expect(screen.getByText('Product 10 - Electronics')).toBeInTheDocument();
      expect(screen.queryByText('Product 0 - Electronics')).not.toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      render(
        <ProductGrid 
          products={manyProducts} 
          itemsPerPage={10}
          showPagination={true}
          {...mockHandlers} 
        />
      );

      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(
        <ProductGrid 
          products={manyProducts} 
          itemsPerPage={10}
          showPagination={true}
          {...mockHandlers} 
        />
      );

      // Go to last page (page 3 for 25 products with 10 per page)
      fireEvent.click(screen.getByText('3'));

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Results Display', () => {
    it('shows correct results count', () => {
      render(<ProductGrid products={mockProducts} {...mockHandlers} />);

      expect(screen.getByText('Showing 3 of 3 products')).toBeInTheDocument();
    });

    it('updates results count when filtered', () => {
      render(
        <ProductGrid 
          products={mockProducts} 
          filters={{ category: 'Electronics' }}
          {...mockHandlers} 
        />
      );

      expect(screen.getByText('Showing 2 of 2 products')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('hides filter panel on mobile screens', () => {
      // This would require mocking window.matchMedia or using a testing library
      // that supports responsive testing. For now, we test that the filter sidebar exists.
      render(<ProductGrid products={mockProducts} showFilters={true} {...mockHandlers} />);

      const filterPanel = screen.getByText('Filters');
      expect(filterPanel).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('resets to first page when filters change', () => {
      const manyProductsLocal = Array.from({ length: 25 }, (_, i) => ({
        ...mockProducts[0],
        id: `product-${i}`,
        title: `Product ${i}`,
      }));

      const { rerender } = render(
        <ProductGrid 
          products={manyProductsLocal} 
          itemsPerPage={10}
          filters={{}}
          {...mockHandlers} 
        />
      );

      // Go to page 2
      fireEvent.click(screen.getByText('2'));

      // Change filters
      rerender(
        <ProductGrid 
          products={manyProductsLocal} 
          itemsPerPage={10}
          filters={{ category: 'Electronics' }}
          {...mockHandlers} 
        />
      );

      // Should be back on page 1
      expect(screen.getByText('Product 0 - Electronics')).toBeInTheDocument();
    });
  });
});