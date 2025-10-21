import { expect } from '@jest/globals';

// Custom matchers for seller integration tests
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidSellerProfile(): R;
      toHaveSellerCacheInvalidated(walletAddress: string): R;
      toBeWithinPerformanceThreshold(threshold: number): R;
      toHaveMobileOptimizedStyling(): R;
      toHandleSellerErrorGracefully(): R;
    }
  }
}

// Matcher to validate seller profile structure
expect.extend({
  toBeValidSellerProfile(received: any) {
    const requiredFields = ['walletAddress', 'displayName', 'storeName', 'bio'];
    const optionalFields = ['profileImageUrl', 'coverImageUrl', 'tier', 'stats'];
    
    const missingRequired = requiredFields.filter(field => !received || !received[field]);
    
    if (missingRequired.length > 0) {
      return {
        message: () => `Expected seller profile to have required fields: ${missingRequired.join(', ')}`,
        pass: false,
      };
    }
    
    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(received.walletAddress)) {
      return {
        message: () => `Expected valid wallet address, got: ${received.walletAddress}`,
        pass: false,
      };
    }
    
    return {
      message: () => `Expected seller profile to be invalid`,
      pass: true,
    };
  },
});

// Matcher to check if seller cache was invalidated
expect.extend({
  toHaveSellerCacheInvalidated(received: any, walletAddress: string) {
    // Mock implementation - in real tests this would check actual cache state
    const cacheKeys = [
      `seller-profile-${walletAddress}`,
      `seller-listings-${walletAddress}`,
      `seller-dashboard-${walletAddress}`,
      `seller-store-${walletAddress}`,
    ];
    
    // This would check if the cache manager was called with these keys
    const invalidated = cacheKeys.every(key => 
      received.invalidateSellerCache?.mock?.calls?.some((call: any[]) => 
        call.includes(walletAddress)
      )
    );
    
    return {
      message: () => invalidated 
        ? `Expected seller cache NOT to be invalidated for ${walletAddress}`
        : `Expected seller cache to be invalidated for ${walletAddress}`,
      pass: invalidated,
    };
  },
});

// Matcher to check performance thresholds
expect.extend({
  toBeWithinPerformanceThreshold(received: number, threshold: number) {
    const pass = received <= threshold;
    
    return {
      message: () => pass
        ? `Expected ${received}ms to exceed threshold of ${threshold}ms`
        : `Expected ${received}ms to be within threshold of ${threshold}ms`,
      pass,
    };
  },
});

// Matcher to check mobile-optimized styling
expect.extend({
  toHaveMobileOptimizedStyling(received: HTMLElement) {
    const computedStyle = window.getComputedStyle(received);
    
    // Check for mobile-friendly touch targets
    const minHeight = parseInt(computedStyle.minHeight) || 0;
    const minWidth = parseInt(computedStyle.minWidth) || 0;
    const fontSize = parseInt(computedStyle.fontSize) || 0;
    
    const hasMinTouchTarget = minHeight >= 44 && minWidth >= 44;
    const hasMinFontSize = fontSize >= 16; // Prevents zoom on iOS
    
    const pass = hasMinTouchTarget && hasMinFontSize;
    
    return {
      message: () => pass
        ? `Expected element NOT to have mobile-optimized styling`
        : `Expected element to have mobile-optimized styling (min 44px touch target, 16px+ font)`,
      pass,
    };
  },
});

// Matcher to check graceful error handling
expect.extend({
  toHandleSellerErrorGracefully(received: any) {
    // Check if error boundary or fallback UI is rendered
    const hasErrorBoundary = received.querySelector('[data-testid*="error"]') !== null;
    const hasRetryButton = received.querySelector('button[data-testid*="retry"]') !== null;
    const hasFallbackContent = received.querySelector('[data-testid*="fallback"]') !== null;
    
    const pass = hasErrorBoundary || hasRetryButton || hasFallbackContent;
    
    return {
      message: () => pass
        ? `Expected component NOT to handle errors gracefully`
        : `Expected component to handle errors gracefully with error boundary, retry button, or fallback content`,
      pass,
    };
  },
});

export {};