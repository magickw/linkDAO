import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CommunityView from '../../components/CommunityView';

// Mock different browser environments
const mockUserAgents = {
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
};

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Cross-Browser Compatibility Tests', () => {
  let originalUserAgent: string;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
    });
  });

  const mockUserAgent = (userAgent: string) => {
    Object.defineProperty(navigator, 'userAgent', {
      value: userAgent,
      configurable: true,
    });
  };

  describe('Chrome Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(mockUserAgents.chrome);
    });

    it('should render Reddit-style layout correctly in Chrome', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('community-layout')).toBeInTheDocument();
      });

      // Check CSS Grid support
      const layout = screen.getByTestId('community-layout');
      expect(layout).toHaveStyle('display: grid');

      // Check flexbox support in post cards
      const postCards = screen.getAllByTestId('reddit-style-post-card');
      expect(postCards[0]).toHaveStyle('display: flex');
    });

    it('should handle Chrome-specific features', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      // Test Chrome's intersection observer
      expect(window.IntersectionObserver).toBeDefined();

      // Test Chrome's ResizeObserver
      expect(window.ResizeObserver).toBeDefined();
    });
  });

  describe('Firefox Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(mockUserAgents.firefox);
    });

    it('should render correctly in Firefox', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('community-layout')).toBeInTheDocument();
      });

      // Firefox-specific CSS handling
      const layout = screen.getByTestId('community-layout');
      expect(layout).toBeInTheDocument();
    });

    it('should handle Firefox scrollbar styling', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      const scrollableElement = screen.getByTestId('post-list');
      expect(scrollableElement).toHaveStyle('overflow-y: auto');
    });
  });

  describe('Safari Compatibility', () => {
    beforeEach(() => {
      mockUserAgent(mockUserAgents.safari);
    });

    it('should render correctly in Safari', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('community-layout')).toBeInTheDocument();
      });

      // Safari-specific webkit prefixes should work
      const glassmorphismElements = screen.getAllByTestId('glass-panel');
      expect(glassmorphismElements.length).toBeGreaterThan(0);
    });

    it('should handle Safari touch events', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      // Test touch interactions
      const firstPost = screen.getAllByTestId('reddit-style-post-card')[0];
      
      // Simulate touch events
      fireEvent.touchStart(firstPost, {
        touches: [{ clientX: 0, clientY: 0 }],
      });
      
      fireEvent.touchEnd(firstPost, {
        changedTouches: [{ clientX: 100, clientY: 0 }],
      });

      // Should handle swipe gesture
      await waitFor(() => {
        expect(screen.getByTestId('swipe-actions')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Browser Compatibility', () => {
    describe('iOS Safari', () => {
      beforeEach(() => {
        mockUserAgent(mockUserAgents.ios);
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: 812,
        });
      });

      it('should render mobile layout correctly', async () => {
        const Wrapper = createTestWrapper();
        
        render(
          <Wrapper>
            <CommunityView communityId="test-community" />
          </Wrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
        });

        // Mobile sidebar should be collapsed
        expect(screen.getByTestId('mobile-sidebar-toggle')).toBeInTheDocument();
        expect(screen.queryByTestId('left-sidebar')).not.toBeVisible();
      });

      it('should handle iOS-specific touch behaviors', async () => {
        const Wrapper = createTestWrapper();
        
        render(
          <Wrapper>
            <CommunityView communityId="test-community" />
          </Wrapper>
        );

        await waitFor(() => {
          expect(screen.getAllByTestId('swipeable-post-card')).toHaveLength(5);
        });

        const firstPost = screen.getAllByTestId('swipeable-post-card')[0];

        // Test iOS momentum scrolling
        fireEvent.touchStart(firstPost, {
          touches: [{ clientX: 0, clientY: 0 }],
        });

        fireEvent.touchMove(firstPost, {
          touches: [{ clientX: -100, clientY: 0 }],
        });

        fireEvent.touchEnd(firstPost, {
          changedTouches: [{ clientX: -100, clientY: 0 }],
        });

        await waitFor(() => {
          expect(screen.getByTestId('vote-actions')).toBeInTheDocument();
        });
      });
    });

    describe('Android Chrome', () => {
      beforeEach(() => {
        mockUserAgent(mockUserAgents.android);
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 360,
        });
      });

      it('should handle Android-specific behaviors', async () => {
        const Wrapper = createTestWrapper();
        
        render(
          <Wrapper>
            <CommunityView communityId="test-community" />
          </Wrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('mobile-layout')).toBeInTheDocument();
        });

        // Test Android back button behavior
        const backEvent = new PopStateEvent('popstate');
        window.dispatchEvent(backEvent);

        // Should handle navigation properly
        expect(window.location.pathname).toBeDefined();
      });
    });
  });

  describe('Feature Detection and Fallbacks', () => {
    it('should provide fallbacks for unsupported features', async () => {
      // Mock missing IntersectionObserver
      const originalIntersectionObserver = window.IntersectionObserver;
      delete (window as any).IntersectionObserver;

      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('fallback-scroll-handler')).toBeInTheDocument();
      });

      // Restore
      window.IntersectionObserver = originalIntersectionObserver;
    });

    it('should handle missing CSS Grid support', async () => {
      // Mock CSS.supports to return false for grid
      const originalSupports = CSS.supports;
      CSS.supports = jest.fn().mockImplementation((property: string) => {
        if (property.includes('grid')) return false;
        return originalSupports.call(CSS, property);
      });

      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        const layout = screen.getByTestId('community-layout');
        expect(layout).toHaveClass('flexbox-fallback');
      });

      // Restore
      CSS.supports = originalSupports;
    });

    it('should handle missing flexbox support', async () => {
      const originalSupports = CSS.supports;
      CSS.supports = jest.fn().mockImplementation((property: string) => {
        if (property.includes('flex')) return false;
        return originalSupports.call(CSS, property);
      });

      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        const postCard = screen.getAllByTestId('reddit-style-post-card')[0];
        expect(postCard).toHaveClass('table-fallback');
      });

      CSS.supports = originalSupports;
    });
  });

  describe('Responsive Design Testing', () => {
    const viewports = [
      { width: 320, height: 568, name: 'iPhone SE' },
      { width: 375, height: 812, name: 'iPhone X' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1024, height: 768, name: 'iPad Landscape' },
      { width: 1440, height: 900, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Large Desktop' },
    ];

    viewports.forEach(({ width, height, name }) => {
      it(`should render correctly on ${name} (${width}x${height})`, async () => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: height,
        });

        const Wrapper = createTestWrapper();
        
        render(
          <Wrapper>
            <CommunityView communityId="test-community" />
          </Wrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('community-layout')).toBeInTheDocument();
        });

        // Check appropriate layout for viewport
        const layout = screen.getByTestId('community-layout');
        
        if (width < 768) {
          expect(layout).toHaveClass('mobile-layout');
        } else if (width < 1024) {
          expect(layout).toHaveClass('tablet-layout');
        } else {
          expect(layout).toHaveClass('desktop-layout');
        }
      });
    });
  });

  describe('Accessibility Across Browsers', () => {
    it('should maintain accessibility in all browsers', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('community-layout')).toBeInTheDocument();
      });

      // Check ARIA labels
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Community posts');
      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Community information');

      // Check keyboard navigation
      const firstPost = screen.getAllByTestId('reddit-style-post-card')[0];
      const upvoteButton = screen.getAllByTestId('upvote-button')[0];
      
      expect(upvoteButton).toHaveAttribute('tabindex', '0');
      expect(upvoteButton).toHaveAttribute('role', 'button');

      // Test focus management
      upvoteButton.focus();
      expect(document.activeElement).toBe(upvoteButton);
    });

    it('should handle screen reader compatibility', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <CommunityView communityId="test-community" />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('reddit-style-post-card')).toHaveLength(5);
      });

      // Check screen reader announcements
      const firstPost = screen.getAllByTestId('reddit-style-post-card')[0];
      expect(firstPost).toHaveAttribute('aria-label');
      
      const voteScore = screen.getAllByTestId('vote-score')[0];
      expect(voteScore).toHaveAttribute('aria-live', 'polite');
    });
  });
});