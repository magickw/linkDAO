import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';

// Import mobile-optimized seller components
import { MobileSellerDashboard } from '../../../components/Seller/Mobile/MobileSellerDashboard';
import { TouchOptimizedButton } from '../../../components/Seller/Mobile/TouchOptimizedButton';
import { MobileOptimizedForm } from '../../../components/Seller/Mobile/MobileOptimizedForm';
import { SwipeableSellerCard } from '../../../components/Seller/Mobile/SwipeableSellerCard';

// Import hooks
import { useMobileOptimization } from '../../../hooks/useMobileOptimization';

// Mock fetch
global.fetch = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock touch events
const createTouchEvent = (type: string, touches: Array<{ clientX: number; clientY: number }>) => {
  return new TouchEvent(type, {
    touches: touches.map(touch => ({
      ...touch,
      identifier: 0,
      target: document.body,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    })) as any,
    bubbles: true,
    cancelable: true,
  });
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Seller Mobile Optimization Tests', () => {
  const testWalletAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });

    // Mock matchMedia for responsive design
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  describe('Mobile Responsive Design Tests', () => {
    it('should render mobile-optimized seller dashboard on small screens', async () => {
      const mockDashboardData = {
        profile: { walletAddress: testWalletAddress, displayName: 'Mobile Seller' },
        stats: { totalSales: 100, pendingOrders: 5 },
        listings: [{ id: '1', title: 'Mobile Product' }],
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockDashboardData }),
      });

      render(
        <TestWrapper>
          <MobileSellerDashboard walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile-seller-dashboard')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-dashboard-header')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-stats-cards')).toBeInTheDocument();
      });

      // Check mobile-specific styling
      const dashboard = screen.getByTestId('mobile-seller-dashboard');
      expect(dashboard).toHaveClass('mobile-dashboard');
      
      const statsCards = screen.getByTestId('mobile-stats-cards');
      expect(statsCards).toHaveStyle('display: flex');
      expect(statsCards).toHaveStyle('flex-direction: column');
    });

    it('should adapt layout for different mobile orientations', async () => {
      const mockData = {
        profile: { walletAddress: testWalletAddress, displayName: 'Orientation Test' },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockData }),
      });

      const { rerender } = render(
        <TestWrapper>
          <MobileSellerDashboard walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      // Portrait mode
      expect(screen.getByTestId('mobile-seller-dashboard')).toHaveClass('portrait-layout');

      // Switch to landscape
      Object.defineProperty(window, 'innerWidth', { value: 667 });
      Object.defineProperty(window, 'innerHeight', { value: 375 });
      
      fireEvent(window, new Event('orientationchange'));

      rerender(
        <TestWrapper>
          <MobileSellerDashboard walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile-seller-dashboard')).toHaveClass('landscape-layout');
      });
    });

    it('should implement proper mobile navigation patterns', async () => {
      render(
        <TestWrapper>
          <MobileSellerDashboard walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should have mobile navigation elements
        expect(screen.getByTestId('mobile-nav-tabs')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-hamburger-menu')).toBeInTheDocument();
      });

      // Test tab navigation
      const profileTab = screen.getByTestId('mobile-tab-profile');
      const listingsTab = screen.getByTestId('mobile-tab-listings');

      fireEvent.click(listingsTab);

      await waitFor(() => {
        expect(listingsTab).toHaveClass('active');
        expect(screen.getByTestId('mobile-listings-view')).toBeInTheDocument();
      });

      fireEvent.click(profileTab);

      await waitFor(() => {
        expect(profileTab).toHaveClass('active');
        expect(screen.getByTestId('mobile-profile-view')).toBeInTheDocument();
      });
    });
  });

  describe('Touch Interaction Tests', () => {
    it('should implement touch-optimized buttons with proper sizing', () => {
      render(
        <TestWrapper>
          <TouchOptimizedButton onClick={jest.fn()}>
            Test Button
          </TouchOptimizedButton>
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'Test Button' });
      
      // iOS touch target minimum requirements
      expect(button).toHaveStyle('min-height: 44px');
      expect(button).toHaveStyle('min-width: 44px');
      expect(button).toHaveStyle('padding: 12px 16px');
      
      // Prevent zoom on iOS
      expect(button).toHaveStyle('font-size: 16px');
    });

    it('should handle touch events properly', () => {
      const mockOnClick = jest.fn();
      
      render(
        <TestWrapper>
          <TouchOptimizedButton onClick={mockOnClick}>
            Touch Test
          </TouchOptimizedButton>
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'Touch Test' });

      // Test touch events
      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should implement swipe gestures for seller cards', async () => {
      const mockListing = {
        id: '1',
        title: 'Swipeable Product',
        price: 100,
        currency: 'USD',
      };

      const mockOnSwipe = jest.fn();

      render(
        <TestWrapper>
          <SwipeableSellerCard 
            listing={mockListing} 
            onSwipeLeft={mockOnSwipe}
            onSwipeRight={mockOnSwipe}
          />
        </TestWrapper>
      );

      const card = screen.getByTestId('swipeable-seller-card');

      // Simulate swipe left
      fireEvent.touchStart(card, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      
      fireEvent.touchMove(card, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      
      fireEvent.touchEnd(card);

      await waitFor(() => {
        expect(mockOnSwipe).toHaveBeenCalledWith('left', mockListing);
      });

      // Simulate swipe right
      fireEvent.touchStart(card, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      
      fireEvent.touchMove(card, {
        touches: [{ clientX: 200, clientY: 100 }],
      });
      
      fireEvent.touchEnd(card);

      await waitFor(() => {
        expect(mockOnSwipe).toHaveBeenCalledWith('right', mockListing);
      });
    });

    it('should provide haptic feedback for touch interactions', () => {
      // Mock vibration API
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: jest.fn(),
      });

      const mockOnClick = jest.fn();

      render(
        <TestWrapper>
          <TouchOptimizedButton 
            onClick={mockOnClick}
            hapticFeedback={true}
          >
            Haptic Button
          </TouchOptimizedButton>
        </TestWrapper>
      );

      const button = screen.getByRole('button', { name: 'Haptic Button' });
      fireEvent.click(button);

      expect(navigator.vibrate).toHaveBeenCalledWith(10); // Short vibration
    });
  });

  describe('Mobile Form Optimization Tests', () => {
    it('should optimize form inputs for mobile devices', () => {
      render(
        <TestWrapper>
          <MobileOptimizedForm walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      const form = screen.getByTestId('mobile-optimized-form');
      expect(form).toBeInTheDocument();

      // Check input optimizations
      const textInputs = screen.getAllByRole('textbox');
      textInputs.forEach(input => {
        // Prevent zoom on iOS
        expect(input).toHaveStyle('font-size: 16px');
        
        // Proper spacing for touch
        expect(input).toHaveStyle('padding: 12px');
        expect(input).toHaveStyle('margin-bottom: 16px');
      });

      // Check for mobile-specific input types
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('inputmode', 'email');

      const phoneInput = screen.getByLabelText(/phone/i);
      expect(phoneInput).toHaveAttribute('type', 'tel');
      expect(phoneInput).toHaveAttribute('inputmode', 'tel');

      const urlInput = screen.getByLabelText(/website/i);
      expect(urlInput).toHaveAttribute('type', 'url');
      expect(urlInput).toHaveAttribute('inputmode', 'url');
    });

    it('should implement mobile-friendly validation', async () => {
      render(
        <TestWrapper>
          <MobileOptimizedForm walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      const displayNameInput = screen.getByLabelText(/display name/i);

      // Submit empty form
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should show mobile-optimized error messages
        const errorMessage = screen.getByTestId('mobile-error-message');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('mobile-error');
      });

      // Fill in required field
      fireEvent.change(displayNameInput, { target: { value: 'Test Seller' } });
      
      await waitFor(() => {
        // Error should be cleared
        expect(screen.queryByTestId('mobile-error-message')).not.toBeInTheDocument();
      });
    });

    it('should handle virtual keyboard properly', async () => {
      render(
        <TestWrapper>
          <MobileOptimizedForm walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      const input = screen.getByLabelText(/display name/i);
      
      // Focus input (simulates virtual keyboard opening)
      fireEvent.focus(input);

      await waitFor(() => {
        const form = screen.getByTestId('mobile-optimized-form');
        // Form should adjust for virtual keyboard
        expect(form).toHaveClass('keyboard-open');
      });

      // Blur input (simulates virtual keyboard closing)
      fireEvent.blur(input);

      await waitFor(() => {
        const form = screen.getByTestId('mobile-optimized-form');
        expect(form).not.toHaveClass('keyboard-open');
      });
    });
  });

  describe('Mobile Performance Tests', () => {
    it('should implement lazy loading for mobile components', async () => {
      const mockListings = Array.from({ length: 50 }, (_, i) => ({
        id: `listing-${i}`,
        title: `Product ${i}`,
        price: Math.random() * 1000,
      }));

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockListings }),
      });

      render(
        <TestWrapper>
          <MobileSellerDashboard walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      // Initially should only render visible items
      await waitFor(() => {
        const visibleItems = screen.getAllByTestId(/listing-card-/);
        expect(visibleItems.length).toBeLessThan(50);
        expect(visibleItems.length).toBeGreaterThan(0);
      });

      // Scroll to load more items
      const scrollContainer = screen.getByTestId('mobile-listings-scroll');
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } });

      await waitFor(() => {
        const visibleItems = screen.getAllByTestId(/listing-card-/);
        expect(visibleItems.length).toBeGreaterThan(10);
      });
    });

    it('should optimize images for mobile devices', async () => {
      const mockListing = {
        id: '1',
        title: 'Image Test Product',
        images: ['https://example.com/image.jpg'],
      };

      render(
        <TestWrapper>
          <SwipeableSellerCard listing={mockListing} />
        </TestWrapper>
      );

      await waitFor(() => {
        const image = screen.getByRole('img');
        
        // Should use responsive image attributes
        expect(image).toHaveAttribute('loading', 'lazy');
        expect(image).toHaveAttribute('decoding', 'async');
        
        // Should have mobile-optimized srcset
        const srcset = image.getAttribute('srcset');
        expect(srcset).toContain('w=375'); // Mobile width
        expect(srcset).toContain('w=750'); // 2x mobile width
      });
    });

    it('should implement efficient touch event handling', () => {
      const mockOnSwipe = jest.fn();
      
      render(
        <TestWrapper>
          <SwipeableSellerCard 
            listing={{ id: '1', title: 'Touch Performance Test' }}
            onSwipeLeft={mockOnSwipe}
          />
        </TestWrapper>
      );

      const card = screen.getByTestId('swipeable-seller-card');

      // Rapid touch events should be throttled
      for (let i = 0; i < 10; i++) {
        fireEvent.touchStart(card, {
          touches: [{ clientX: 200 - i * 10, clientY: 100 }],
        });
        fireEvent.touchMove(card, {
          touches: [{ clientX: 100 - i * 10, clientY: 100 }],
        });
        fireEvent.touchEnd(card);
      }

      // Should not trigger excessive callbacks
      expect(mockOnSwipe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mobile Accessibility Tests', () => {
    it('should implement proper ARIA labels for mobile interfaces', () => {
      render(
        <TestWrapper>
          <MobileSellerDashboard walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      // Check ARIA labels for mobile navigation
      const navTabs = screen.getByTestId('mobile-nav-tabs');
      expect(navTabs).toHaveAttribute('role', 'tablist');
      expect(navTabs).toHaveAttribute('aria-label', 'Seller dashboard navigation');

      const profileTab = screen.getByTestId('mobile-tab-profile');
      expect(profileTab).toHaveAttribute('role', 'tab');
      expect(profileTab).toHaveAttribute('aria-label', 'Profile tab');

      // Check touch target accessibility
      const touchButtons = screen.getAllByRole('button');
      touchButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should support screen readers on mobile devices', async () => {
      render(
        <TestWrapper>
          <MobileSellerDashboard walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      // Check for screen reader announcements
      const liveRegion = screen.getByTestId('mobile-live-region');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');

      // Simulate navigation change
      const listingsTab = screen.getByTestId('mobile-tab-listings');
      fireEvent.click(listingsTab);

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Listings view loaded');
      });
    });

    it('should handle focus management for mobile interfaces', () => {
      render(
        <TestWrapper>
          <MobileSellerDashboard walletAddress={testWalletAddress} />
        </TestWrapper>
      );

      const hamburgerMenu = screen.getByTestId('mobile-hamburger-menu');
      fireEvent.click(hamburgerMenu);

      // Focus should move to first menu item
      const firstMenuItem = screen.getByTestId('mobile-menu-item-0');
      expect(firstMenuItem).toHaveFocus();

      // Test keyboard navigation
      fireEvent.keyDown(firstMenuItem, { key: 'ArrowDown' });
      
      const secondMenuItem = screen.getByTestId('mobile-menu-item-1');
      expect(secondMenuItem).toHaveFocus();
    });
  });

  describe('Mobile Hook Tests', () => {
    it('should detect mobile device correctly', () => {
      const TestComponent = () => {
        const { isMobile, orientation } = useMobileOptimization();
        return (
          <div>
            <span data-testid="is-mobile">{isMobile.toString()}</span>
            <span data-testid="orientation">{orientation}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
      expect(screen.getByTestId('orientation')).toHaveTextContent('portrait');
    });

    it('should respond to orientation changes', () => {
      const TestComponent = () => {
        const { orientation } = useMobileOptimization();
        return <span data-testid="orientation">{orientation}</span>;
      };

      render(<TestComponent />);

      expect(screen.getByTestId('orientation')).toHaveTextContent('portrait');

      // Change to landscape
      Object.defineProperty(window, 'innerWidth', { value: 667 });
      Object.defineProperty(window, 'innerHeight', { value: 375 });
      
      fireEvent(window, new Event('orientationchange'));

      expect(screen.getByTestId('orientation')).toHaveTextContent('landscape');
    });

    it('should handle viewport size changes', () => {
      const TestComponent = () => {
        const { isMobile, viewportSize } = useMobileOptimization();
        return (
          <div>
            <span data-testid="is-mobile">{isMobile.toString()}</span>
            <span data-testid="viewport-width">{viewportSize.width}</span>
            <span data-testid="viewport-height">{viewportSize.height}</span>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('viewport-width')).toHaveTextContent('375');
      expect(screen.getByTestId('viewport-height')).toHaveTextContent('667');

      // Resize to tablet
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });
      
      fireEvent(window, new Event('resize'));

      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('viewport-width')).toHaveTextContent('768');
      expect(screen.getByTestId('viewport-height')).toHaveTextContent('1024');
    });
  });
});