/**
 * Custom Jest matchers for Feed System testing
 */

import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
      toHavePerformantRender(maxTime?: number): R;
      toHandleOfflineGracefully(): R;
      toHaveOptimizedVirtualization(): R;
      toHaveEfficientCaching(): R;
      toSupportInfiniteScroll(): R;
      toHandleRealTimeUpdates(): R;
      toBeResponsive(): R;
      toHaveValidEngagementMetrics(): R;
      toSupportKeyboardNavigation(): R;
    }
  }
}

// Custom matchers implementation
expect.extend({
  // Accessibility matcher
  async toBeAccessible(received: HTMLElement) {
    try {
      const results = await axe(received);
      const pass = results.violations.length === 0;
      
      if (pass) {
        return {
          message: () => `expected element to have accessibility violations`,
          pass: true,
        };
      } else {
        const violations = results.violations.map(violation => 
          `${violation.id}: ${violation.description}`
        ).join('\n');
        
        return {
          message: () => `expected element to be accessible, but found violations:\n${violations}`,
          pass: false,
        };
      }
    } catch (error) {
      return {
        message: () => `accessibility check failed: ${error}`,
        pass: false,
      };
    }
  },

  // Performance matcher
  toHavePerformantRender(received: any, maxTime: number = 100) {
    const renderTime = received.renderTime || 0;
    const pass = renderTime <= maxTime;
    
    if (pass) {
      return {
        message: () => `expected render time ${renderTime}ms to be greater than ${maxTime}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected render time ${renderTime}ms to be less than or equal to ${maxTime}ms`,
        pass: false,
      };
    }
  },

  // Offline support matcher
  toHandleOfflineGracefully(received: any) {
    const hasOfflineSupport = received.offlineSupport === true;
    const hasErrorBoundary = received.errorBoundary === true;
    const hasCaching = received.caching === true;
    
    const pass = hasOfflineSupport && hasErrorBoundary && hasCaching;
    
    if (pass) {
      return {
        message: () => `expected component to not handle offline gracefully`,
        pass: true,
      };
    } else {
      const missing = [];
      if (!hasOfflineSupport) missing.push('offline support');
      if (!hasErrorBoundary) missing.push('error boundary');
      if (!hasCaching) missing.push('caching');
      
      return {
        message: () => `expected component to handle offline gracefully, missing: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },

  // Virtualization matcher
  toHaveOptimizedVirtualization(received: HTMLElement) {
    const virtualizedList = received.querySelector('[data-testid="virtualized-list"]');
    const renderedItems = received.querySelectorAll('[role="article"]');
    const totalItems = parseInt(received.getAttribute('data-total-items') || '0');
    
    const pass = virtualizedList && renderedItems.length < totalItems && renderedItems.length <= 50;
    
    if (pass) {
      return {
        message: () => `expected virtualization to not be optimized`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected optimized virtualization (rendered ${renderedItems.length}/${totalItems} items)`,
        pass: false,
      };
    }
  },

  // Caching matcher
  toHaveEfficientCaching(received: any) {
    const hasCacheStrategy = received.cacheStrategy !== undefined;
    const hasCacheInvalidation = received.cacheInvalidation === true;
    const hasPredictivePreload = received.predictivePreload === true;
    
    const pass = hasCacheStrategy && hasCacheInvalidation && hasPredictivePreload;
    
    if (pass) {
      return {
        message: () => `expected caching to not be efficient`,
        pass: true,
      };
    } else {
      const missing = [];
      if (!hasCacheStrategy) missing.push('cache strategy');
      if (!hasCacheInvalidation) missing.push('cache invalidation');
      if (!hasPredictivePreload) missing.push('predictive preload');
      
      return {
        message: () => `expected efficient caching, missing: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },

  // Infinite scroll matcher
  toSupportInfiniteScroll(received: HTMLElement) {
    const hasScrollContainer = received.querySelector('[data-testid="virtualized-list"]');
    const hasLoadMore = received.querySelector('[data-testid="load-more-trigger"]') || 
                       received.getAttribute('data-has-more') === 'true';
    const hasLoadingIndicator = received.querySelector('[data-testid="loading-indicator"]');
    
    const pass = hasScrollContainer && hasLoadMore;
    
    if (pass) {
      return {
        message: () => `expected infinite scroll to not be supported`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected infinite scroll support (container: ${!!hasScrollContainer}, loadMore: ${!!hasLoadMore})`,
        pass: false,
      };
    }
  },

  // Real-time updates matcher
  toHandleRealTimeUpdates(received: any) {
    const hasWebSocketConnection = received.webSocketConnection === true;
    const hasUpdateHandlers = received.updateHandlers === true;
    const hasOptimisticUpdates = received.optimisticUpdates === true;
    
    const pass = hasWebSocketConnection && hasUpdateHandlers && hasOptimisticUpdates;
    
    if (pass) {
      return {
        message: () => `expected real-time updates to not be handled`,
        pass: true,
      };
    } else {
      const missing = [];
      if (!hasWebSocketConnection) missing.push('WebSocket connection');
      if (!hasUpdateHandlers) missing.push('update handlers');
      if (!hasOptimisticUpdates) missing.push('optimistic updates');
      
      return {
        message: () => `expected real-time update handling, missing: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },

  // Responsive design matcher
  toBeResponsive(received: HTMLElement) {
    const hasResponsiveClasses = received.className.includes('responsive') || 
                                received.className.includes('sm:') || 
                                received.className.includes('md:') || 
                                received.className.includes('lg:');
    
    const hasFlexibleLayout = received.style.display === 'flex' || 
                             received.style.display === 'grid' ||
                             received.className.includes('flex') ||
                             received.className.includes('grid');
    
    const hasViewportMeta = document.querySelector('meta[name="viewport"]');
    
    const pass = hasResponsiveClasses && hasFlexibleLayout;
    
    if (pass) {
      return {
        message: () => `expected element to not be responsive`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected responsive design (classes: ${hasResponsiveClasses}, layout: ${hasFlexibleLayout})`,
        pass: false,
      };
    }
  },

  // Engagement metrics matcher
  toHaveValidEngagementMetrics(received: any) {
    const hasReactions = Array.isArray(received.reactions);
    const hasTips = Array.isArray(received.tips);
    const hasComments = typeof received.comments === 'number';
    const hasShares = typeof received.shares === 'number';
    const hasViews = typeof received.views === 'number';
    const hasEngagementScore = typeof received.engagementScore === 'number';
    
    const pass = hasReactions && hasTips && hasComments && hasShares && hasViews && hasEngagementScore;
    
    if (pass) {
      return {
        message: () => `expected invalid engagement metrics`,
        pass: true,
      };
    } else {
      const missing = [];
      if (!hasReactions) missing.push('reactions');
      if (!hasTips) missing.push('tips');
      if (!hasComments) missing.push('comments');
      if (!hasShares) missing.push('shares');
      if (!hasViews) missing.push('views');
      if (!hasEngagementScore) missing.push('engagement score');
      
      return {
        message: () => `expected valid engagement metrics, missing: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },

  // Keyboard navigation matcher
  toSupportKeyboardNavigation(received: HTMLElement) {
    const focusableElements = received.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const hasTabIndex = Array.from(focusableElements).some(el => 
      el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1'
    );
    
    const hasAriaLabels = Array.from(focusableElements).some(el => 
      el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')
    );
    
    const hasKeyboardEventHandlers = received.getAttribute('data-keyboard-navigation') === 'true';
    
    const pass = focusableElements.length > 0 && (hasTabIndex || hasAriaLabels);
    
    if (pass) {
      return {
        message: () => `expected keyboard navigation to not be supported`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected keyboard navigation support (focusable: ${focusableElements.length}, tabindex: ${hasTabIndex}, aria: ${hasAriaLabels})`,
        pass: false,
      };
    }
  },
});

// Helper functions for test assertions
export const feedTestHelpers = {
  // Wait for virtualized list to render
  waitForVirtualizedList: async (container: HTMLElement, timeout: number = 5000) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const virtualizedList = container.querySelector('[data-testid="virtualized-list"]');
      if (virtualizedList) {
        return virtualizedList;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Virtualized list did not render within timeout');
  },

  // Simulate scroll to trigger infinite scroll
  simulateInfiniteScroll: (container: HTMLElement, scrollTop: number = 5000) => {
    const virtualizedList = container.querySelector('[data-testid="virtualized-list"]');
    if (virtualizedList) {
      const scrollEvent = new Event('scroll', { bubbles: true });
      Object.defineProperty(scrollEvent, 'target', {
        value: { scrollTop },
        enumerable: true,
      });
      virtualizedList.dispatchEvent(scrollEvent);
    }
  },

  // Simulate touch gestures for mobile testing
  simulateTouchGesture: (element: HTMLElement, gesture: 'swipe' | 'pinch' | 'tap') => {
    const touches = [{ clientX: 100, clientY: 100 }];
    
    switch (gesture) {
      case 'swipe':
        element.dispatchEvent(new TouchEvent('touchstart', { touches }));
        element.dispatchEvent(new TouchEvent('touchmove', { 
          touches: [{ clientX: 200, clientY: 100 }] 
        }));
        element.dispatchEvent(new TouchEvent('touchend', { touches: [] }));
        break;
      case 'tap':
        element.dispatchEvent(new TouchEvent('touchstart', { touches }));
        element.dispatchEvent(new TouchEvent('touchend', { touches: [] }));
        break;
      case 'pinch':
        element.dispatchEvent(new TouchEvent('touchstart', { 
          touches: [
            { clientX: 100, clientY: 100 },
            { clientX: 200, clientY: 200 }
          ] 
        }));
        element.dispatchEvent(new TouchEvent('touchmove', { 
          touches: [
            { clientX: 80, clientY: 80 },
            { clientX: 220, clientY: 220 }
          ] 
        }));
        element.dispatchEvent(new TouchEvent('touchend', { touches: [] }));
        break;
    }
  },

  // Check performance metrics
  checkPerformanceMetrics: (component: any) => {
    return {
      renderTime: component.renderTime || 0,
      memoryUsage: component.memoryUsage || 0,
      cacheHitRate: component.cacheHitRate || 0,
      scrollPerformance: component.scrollPerformance || 0,
    };
  },

  // Validate engagement data structure
  validateEngagementData: (data: any) => {
    const requiredFields = ['reactions', 'tips', 'comments', 'shares', 'views', 'engagementScore'];
    const missingFields = requiredFields.filter(field => !(field in data));
    
    return {
      isValid: missingFields.length === 0,
      missingFields,
      data,
    };
  },

  // Create mock intersection observer entry
  createMockIntersectionEntry: (element: HTMLElement, isIntersecting: boolean = true) => {
    return {
      target: element,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRect: isIntersecting ? element.getBoundingClientRect() : { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 },
      rootBounds: { top: 0, left: 0, bottom: 1000, right: 1000, width: 1000, height: 1000 },
      time: Date.now(),
    };
  },
};

export default feedTestHelpers;