import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MobileNavigation from '../MobileNavigation';
import FilterDrawer from '../FilterDrawer';
import SwipeableProductCards from '../SwipeableProductCards';
import ResponsiveGrid from '../ResponsiveGrid';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(() => '/')
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ set: jest.fn() }),
  useTransform: () => 1,
  PanInfo: {} as any
}));

// Mock Heroicons
jest.mock('@heroicons/react/24/outline', () => ({
  HomeIcon: () => <div data-testid="home-icon" />,
  MagnifyingGlassIcon: () => <div data-testid="search-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />,
  UserIcon: () => <div data-testid="user-icon" />,
  ShoppingBagIcon: () => <div data-testid="shopping-bag-icon" />,
  XMarkIcon: () => <div data-testid="x-mark-icon" />,
  AdjustmentsHorizontalIcon: () => <div data-testid="adjustments-icon" />,
  ChevronDownIcon: () => <div data-testid="chevron-down-icon" />,
  HeartIcon: () => <div data-testid="heart-icon" />,
  ShareIcon: () => <div data-testid="share-icon" />,
  ShoppingCartIcon: () => <div data-testid="cart-icon" />,
  EyeIcon: () => <div data-testid="eye-icon" />
}));

jest.mock('@heroicons/react/24/solid', () => ({
  HomeIcon: () => <div data-testid="home-icon-solid" />,
  HeartIcon: () => <div data-testid="heart-icon-solid" />
}));

// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe(target: Element) {
    this.callback([{
      target,
      contentRect: { width: 375, height: 800 } as DOMRectReadOnly,
      borderBoxSize: [] as any,
      contentBoxSize: [] as any,
      devicePixelContentBoxSize: [] as any
    }], this);
  }
  
  unobserve() {}
  disconnect() {}
};

const mockProducts = [
  {
    id: '1',
    title: 'iPhone 14 Pro',
    price: { crypto: '0.5 ETH', fiat: '$850', currency: 'ETH' },
    image: '/images/iphone.jpg',
    seller: {
      name: 'TechStore',
      avatar: '/avatars/techstore.jpg',
      verified: true,
      reputation: 5
    },
    likes: 42,
    isLiked: false,
    category: 'Electronics',
    tags: ['smartphone', 'apple']
  }
];

const mockFilters = [
  {
    id: 'category',
    title: 'Category',
    type: 'checkbox' as const,
    expanded: true,
    options: [
      { id: 'electronics', label: 'Electronics', value: 'electronics', count: 150 }
    ],
    value: []
  }
];

describe('Mobile Responsive Integration', () => {
  beforeEach(() => {
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: jest.fn(),
      writable: true
    });
  });

  it('renders mobile navigation correctly', () => {
    render(<MobileNavigation />);
    
    expect(screen.getByLabelText('Home')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Sell')).toBeInTheDocument();
  });

  it('renders filter drawer when open', () => {
    render(
      <FilterDrawer
        isOpen={true}
        onClose={jest.fn()}
        filters={mockFilters}
        onFiltersChange={jest.fn()}
        onApplyFilters={jest.fn()}
        onClearFilters={jest.fn()}
      />
    );
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
  });

  it('renders swipeable product cards', () => {
    render(
      <SwipeableProductCards
        products={mockProducts}
        onProductPress={jest.fn()}
        onLike={jest.fn()}
        onShare={jest.fn()}
        onAddToCart={jest.fn()}
        onQuickView={jest.fn()}
      />
    );
    
    expect(screen.getByText('iPhone 14 Pro')).toBeInTheDocument();
    expect(screen.getByText('0.5 ETH')).toBeInTheDocument();
  });

  it('renders responsive grid with mobile layout', () => {
    const children = [
      <div key="1">Item 1</div>,
      <div key="2">Item 2</div>
    ];
    
    render(<ResponsiveGrid minItemWidth={280}>{children}</ResponsiveGrid>);
    
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('handles touch interactions across components', async () => {
    const mockOnLike = jest.fn();
    
    render(
      <div>
        <MobileNavigation />
        <SwipeableProductCards
          products={mockProducts}
          onLike={mockOnLike}
          onProductPress={jest.fn()}
          onShare={jest.fn()}
          onAddToCart={jest.fn()}
          onQuickView={jest.fn()}
        />
      </div>
    );
    
    // Test navigation touch
    const homeButton = screen.getByLabelText('Home');
    fireEvent.click(homeButton);
    
    // Test product card interaction
    const heartButton = screen.getByTestId('heart-icon').closest('button');
    if (heartButton) {
      fireEvent.click(heartButton);
      expect(mockOnLike).toHaveBeenCalledWith('1');
    }
  });

  it('maintains responsive behavior across screen sizes', async () => {
    const children = Array.from({ length: 6 }, (_, i) => (
      <div key={i}>Item {i + 1}</div>
    ));
    
    render(<ResponsiveGrid>{children}</ResponsiveGrid>);
    
    // Should render all items
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 6')).toBeInTheDocument();
  });

  it('integrates filter drawer with product display', async () => {
    const mockOnFiltersChange = jest.fn();
    
    render(
      <div>
        <FilterDrawer
          isOpen={true}
          onClose={jest.fn()}
          filters={mockFilters}
          onFiltersChange={mockOnFiltersChange}
          onApplyFilters={jest.fn()}
          onClearFilters={jest.fn()}
        />
        <SwipeableProductCards
          products={mockProducts}
          onProductPress={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
          onAddToCart={jest.fn()}
          onQuickView={jest.fn()}
        />
      </div>
    );
    
    // Interact with filter
    const electronicsCheckbox = screen.getByLabelText('Electronics');
    fireEvent.click(electronicsCheckbox);
    
    // Apply filters
    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);
    
    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('handles mobile navigation state changes', () => {
    const mockOnItemPress = jest.fn();
    
    render(<MobileNavigation onItemPress={mockOnItemPress} />);
    
    const searchButton = screen.getByLabelText('Search');
    fireEvent.click(searchButton);
    
    expect(mockOnItemPress).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'search',
        path: '/search'
      })
    );
  });

  it('provides consistent touch feedback across components', () => {
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true
    });
    
    render(
      <div>
        <MobileNavigation />
        <SwipeableProductCards
          products={mockProducts}
          onProductPress={jest.fn()}
          onLike={jest.fn()}
          onShare={jest.fn()}
          onAddToCart={jest.fn()}
          onQuickView={jest.fn()}
        />
      </div>
    );
    
    // Test navigation haptic feedback
    const homeButton = screen.getByLabelText('Home');
    fireEvent.click(homeButton);
    
    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  it('maintains accessibility across mobile components', () => {
    render(
      <div>
        <MobileNavigation />
        <FilterDrawer
          isOpen={true}
          onClose={jest.fn()}
          filters={mockFilters}
          onFiltersChange={jest.fn()}
          onApplyFilters={jest.fn()}
          onClearFilters={jest.fn()}
        />
      </div>
    );
    
    // Check navigation accessibility
    const navigation = screen.getByRole('tablist');
    expect(navigation).toHaveAttribute('aria-label', 'Main navigation');
    
    // Check filter accessibility
    const closeButton = screen.getByLabelText('Close filters');
    expect(closeButton).toBeInTheDocument();
  });
});