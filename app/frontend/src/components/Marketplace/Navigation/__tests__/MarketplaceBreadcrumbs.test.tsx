import React from 'react';
import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/router';
import { MarketplaceBreadcrumbs, generateMarketplaceBreadcrumbs } from '../MarketplaceBreadcrumbs';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('MarketplaceBreadcrumbs', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      pathname: '/marketplace',
      query: {},
      asPath: '/marketplace',
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      reload: jest.fn(),
      route: '/marketplace',
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      isPreview: false,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders breadcrumbs correctly', () => {
      const items = [
        { label: 'Home', href: '/', isActive: false },
        { label: 'Marketplace', isActive: true },
      ];

      render(<MarketplaceBreadcrumbs items={items} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Marketplace')).toBeInTheDocument();
      expect(screen.getByLabelText('Marketplace breadcrumb navigation')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const items = [
        { label: 'Home', href: '/', isActive: false },
        { label: 'Marketplace', isActive: true },
      ];

      const { container } = render(
        <MarketplaceBreadcrumbs items={items} className="custom-class" />
      );

      expect(container.querySelector('.custom-class')).toBeInTheDocument();
    });

    it('does not render when no items provided', () => {
      render(<MarketplaceBreadcrumbs items={[]} />);
      expect(screen.queryByLabelText('Marketplace breadcrumb navigation')).not.toBeInTheDocument();
    });

    it('renders active item without link', () => {
      const items = [
        { label: 'Home', href: '/', isActive: false },
        { label: 'Current Page', isActive: true },
      ];

      render(<MarketplaceBreadcrumbs items={items} />);

      const homeLink = screen.getByRole('link', { name: /home/i });
      expect(homeLink).toHaveAttribute('href', '/');

      const currentPage = screen.getByText('Current Page');
      expect(currentPage.closest('a')).toBeNull();
    });
  });

  describe('generateMarketplaceBreadcrumbs', () => {
    it('generates breadcrumbs for marketplace root', () => {
      const router = {
        pathname: '/marketplace',
        query: {},
        asPath: '/marketplace',
      };

      const breadcrumbs = generateMarketplaceBreadcrumbs(router);

      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0]).toEqual({
        label: 'Home',
        href: '/',
        icon: expect.any(Object),
        isActive: false,
      });
      expect(breadcrumbs[1]).toEqual({
        label: 'Marketplace',
        href: undefined,
        icon: expect.any(Object),
        isActive: true,
      });
    });

    it('generates breadcrumbs for product detail page', () => {
      const router = {
        pathname: '/marketplace/listing/123',
        query: { id: '123', category: 'electronics' },
        asPath: '/marketplace/listing/123?category=electronics',
      };

      const breadcrumbs = generateMarketplaceBreadcrumbs(router);

      expect(breadcrumbs).toHaveLength(4);
      expect(breadcrumbs[0].label).toBe('Home');
      expect(breadcrumbs[1].label).toBe('Marketplace');
      expect(breadcrumbs[2].label).toBe('Electronics');
      expect(breadcrumbs[3].label).toBe('Product Details');
      expect(breadcrumbs[3].isActive).toBe(true);
    });

    it('generates breadcrumbs for seller store page', () => {
      const router = {
        pathname: '/marketplace/seller/store/0x123',
        query: { sellerId: '0x123' },
        asPath: '/marketplace/seller/store/0x123',
      };

      const breadcrumbs = generateMarketplaceBreadcrumbs(router);

      expect(breadcrumbs).toHaveLength(4);
      expect(breadcrumbs[0].label).toBe('Home');
      expect(breadcrumbs[1].label).toBe('Marketplace');
      expect(breadcrumbs[2].label).toBe('Sellers');
      expect(breadcrumbs[3].label).toBe('0x123');
      expect(breadcrumbs[3].isActive).toBe(true);
    });

    it('generates breadcrumbs for category page', () => {
      const router = {
        pathname: '/marketplace/category/electronics',
        query: { category: 'electronics' },
        asPath: '/marketplace/category/electronics',
      };

      const breadcrumbs = generateMarketplaceBreadcrumbs(router);

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0].label).toBe('Home');
      expect(breadcrumbs[1].label).toBe('Marketplace');
      expect(breadcrumbs[2].label).toBe('Electronics');
      expect(breadcrumbs[2].isActive).toBe(true);
    });

    it('generates breadcrumbs for search results', () => {
      const router = {
        pathname: '/marketplace/search',
        query: { q: 'laptop' },
        asPath: '/marketplace/search?q=laptop',
      };

      const breadcrumbs = generateMarketplaceBreadcrumbs(router);

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0].label).toBe('Home');
      expect(breadcrumbs[1].label).toBe('Marketplace');
      expect(breadcrumbs[2].label).toBe('Search: "laptop"');
      expect(breadcrumbs[2].isActive).toBe(true);
    });

    it('preserves filters when enabled', () => {
      const router = {
        pathname: '/marketplace/listing/123',
        query: { id: '123' },
        asPath: '/marketplace/listing/123?category=electronics&sort=price',
      };

      const breadcrumbs = generateMarketplaceBreadcrumbs(router, true);
      const marketplaceBreadcrumb = breadcrumbs.find(b => b.label === 'Marketplace');

      expect(marketplaceBreadcrumb?.href).toContain('category=electronics');
      expect(marketplaceBreadcrumb?.href).toContain('sort=price');
    });

    it('does not preserve filters when disabled', () => {
      const router = {
        pathname: '/marketplace/listing/123',
        query: { id: '123' },
        asPath: '/marketplace/listing/123?category=electronics&sort=price',
      };

      const breadcrumbs = generateMarketplaceBreadcrumbs(router, false);
      const marketplaceBreadcrumb = breadcrumbs.find(b => b.label === 'Marketplace');

      expect(marketplaceBreadcrumb?.href).toBe('/marketplace');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const items = [
        { label: 'Home', href: '/', isActive: false },
        { label: 'Marketplace', isActive: true },
      ];

      render(<MarketplaceBreadcrumbs items={items} />);

      expect(screen.getByLabelText('Marketplace breadcrumb navigation')).toBeInTheDocument();
    });

    it('sets aria-current for active items', () => {
      const items = [
        { label: 'Home', href: '/', isActive: false },
        { label: 'Current Page', isActive: true },
      ];

      render(<MarketplaceBreadcrumbs items={items} />);

      const currentPage = screen.getByText('Current Page').parentElement;
      expect(currentPage).toHaveAttribute('aria-current', 'page');
    });

    it('has proper focus management', () => {
      const items = [
        { label: 'Home', href: '/', isActive: false },
        { label: 'Marketplace', href: '/marketplace', isActive: false },
        { label: 'Current Page', isActive: true },
      ];

      render(<MarketplaceBreadcrumbs items={items} />);

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('focus:outline-none');
        expect(link).toHaveClass('focus:ring-2');
      });
    });
  });

  describe('Text Truncation', () => {
    it('truncates long product titles', () => {
      const items = [
        { label: 'Home', href: '/', isActive: false },
        { label: 'Marketplace', href: '/marketplace', isActive: false },
        { 
          label: 'This is a very long product title that should be truncated for better display', 
          isActive: true 
        },
      ];

      const { container } = render(<MarketplaceBreadcrumbs items={items} />);
      
      const truncatedElement = container.querySelector('.truncate');
      expect(truncatedElement).toBeInTheDocument();
    });
  });
});