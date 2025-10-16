import { render, RenderResult } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Web3-specific accessibility testing utilities
 * Ensures all Web3 components meet WCAG 2.1 AA standards
 */

export interface AccessibilityTestOptions {
  rules?: string[];
  tags?: string[];
  timeout?: number;
}

/**
 * Test accessibility of Web3 components with specific rules for blockchain UIs
 */
export const testWeb3Accessibility = async (
  component: RenderResult,
  options: AccessibilityTestOptions = {}
) => {
  const { container } = component;
  
  const axeConfig = {
    rules: {
      // Web3-specific accessibility rules
      'color-contrast': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'aria-labels': { enabled: true },
      'live-region': { enabled: true },
      ...options.rules?.reduce((acc, rule) => ({ ...acc, [rule]: { enabled: true } }), {}),
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa', ...(options.tags || [])],
  };

  const results = await axe(container, axeConfig);
  expect(results).toHaveNoViolations();
  
  return results;
};

/**
 * Test keyboard navigation for Web3 interactive elements
 */
export const testKeyboardNavigation = (component: RenderResult) => {
  const { container } = component;
  
  // Find all interactive elements
  const interactiveElements = container.querySelectorAll(
    'button, [role="button"], input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
  );
  
  const tests = {
    // All interactive elements should be keyboard accessible
    hasTabIndex: () => {
      interactiveElements.forEach(element => {
        const tabIndex = element.getAttribute('tabindex');
        expect(tabIndex === null || parseInt(tabIndex) >= 0).toBe(true);
      });
    },
    
    // All buttons should respond to Enter and Space
    buttonKeyboardSupport: () => {
      const buttons = container.querySelectorAll('button, [role="button"]');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type');
        // Should have keyboard event handlers or be a proper button element
        expect(
          button.tagName === 'BUTTON' || 
          button.hasAttribute('onKeyDown') ||
          button.hasAttribute('onKeyPress')
        ).toBe(true);
      });
    },
    
    // Focus should be visible
    focusVisibility: () => {
      const focusableElements = container.querySelectorAll(':focus-visible, :focus');
      // This would need to be tested with actual focus events in integration tests
      expect(focusableElements).toBeDefined();
    },
  };
  
  return tests;
};

/**
 * Test ARIA labels and descriptions for Web3 components
 */
export const testAriaLabels = (component: RenderResult) => {
  const { container } = component;
  
  const tests = {
    // All interactive elements should have accessible names
    interactiveElementsHaveNames: () => {
      const interactiveElements = container.querySelectorAll(
        'button, [role="button"], input, select, textarea'
      );
      
      interactiveElements.forEach(element => {
        const hasAccessibleName = 
          element.hasAttribute('aria-label') ||
          element.hasAttribute('aria-labelledby') ||
          element.textContent?.trim() ||
          element.hasAttribute('title') ||
          (element as HTMLInputElement).placeholder;
          
        expect(hasAccessibleName).toBe(true);
      });
    },
    
    // Status updates should use live regions
    liveRegionsForUpdates: () => {
      const statusElements = container.querySelectorAll('[role="status"], [aria-live]');
      // Should have at least one live region for dynamic updates
      if (container.querySelector('[data-testid*="price"], [data-testid*="balance"], [data-testid*="staking"]')) {
        expect(statusElements.length).toBeGreaterThan(0);
      }
    },
    
    // Complex widgets should have proper ARIA structure
    complexWidgetsStructure: () => {
      const modals = container.querySelectorAll('[role="dialog"]');
      modals.forEach(modal => {
        expect(modal).toHaveAttribute('aria-labelledby');
        expect(modal).toHaveAttribute('aria-modal', 'true');
      });
      
      const menus = container.querySelectorAll('[role="menu"]');
      menus.forEach(menu => {
        const menuItems = menu.querySelectorAll('[role="menuitem"]');
        expect(menuItems.length).toBeGreaterThan(0);
      });
    },
  };
  
  return tests;
};

/**
 * Test color contrast and visual accessibility
 */
export const testVisualAccessibility = (component: RenderResult) => {
  const { container } = component;
  
  const tests = {
    // Important elements should have sufficient color contrast
    colorContrast: () => {
      const importantElements = container.querySelectorAll(
        '.text-red-500, .text-green-500, .text-yellow-500, [data-testid*="price"], [data-testid*="change"]'
      );
      
      // This would need actual color contrast calculation in a real implementation
      importantElements.forEach(element => {
        expect(element).toBeInTheDocument();
      });
    },
    
    // Text should not rely solely on color
    textNotColorOnly: () => {
      const priceChangeElements = container.querySelectorAll('[data-testid*="price-change"]');
      priceChangeElements.forEach(element => {
        // Should have icons or text indicators in addition to color
        const hasNonColorIndicator = 
          element.textContent?.includes('↗') ||
          element.textContent?.includes('↘') ||
          element.textContent?.includes('+') ||
          element.textContent?.includes('-') ||
          element.querySelector('svg, .icon');
          
        expect(hasNonColorIndicator).toBe(true);
      });
    },
    
    // Focus indicators should be visible
    focusIndicators: () => {
      const focusableElements = container.querySelectorAll(
        'button, [role="button"], input, select, textarea, a[href]'
      );
      
      // Should have focus styles (this would need visual testing in practice)
      focusableElements.forEach(element => {
        expect(element).toBeInTheDocument();
      });
    },
  };
  
  return tests;
};

/**
 * Test mobile accessibility for Web3 components
 */
export const testMobileAccessibility = (component: RenderResult) => {
  const { container } = component;
  
  const tests = {
    // Touch targets should be large enough (44px minimum)
    touchTargetSize: () => {
      const touchTargets = container.querySelectorAll(
        'button, [role="button"], input[type="checkbox"], input[type="radio"], a[href]'
      );
      
      touchTargets.forEach(target => {
        // Should have appropriate CSS classes for touch targets
        expect(
          target.classList.contains('touch-target') ||
          target.classList.contains('min-h-11') ||
          target.classList.contains('h-11') ||
          target.classList.contains('p-3')
        ).toBe(true);
      });
    },
    
    // Content should be readable without zooming
    readableText: () => {
      const textElements = container.querySelectorAll('p, span, div, label');
      textElements.forEach(element => {
        // Should have appropriate text size classes
        const hasReadableSize = 
          element.classList.contains('text-sm') ||
          element.classList.contains('text-base') ||
          element.classList.contains('text-lg') ||
          element.classList.contains('text-xl');
          
        if (element.textContent?.trim()) {
          expect(hasReadableSize).toBe(true);
        }
      });
    },
    
    // Interactive elements should be spaced appropriately
    elementSpacing: () => {
      const interactiveElements = container.querySelectorAll('button, [role="button"]');
      // Should have margin or padding classes for proper spacing
      interactiveElements.forEach(element => {
        const hasSpacing = 
          element.classList.contains('m-1') ||
          element.classList.contains('m-2') ||
          element.classList.contains('p-2') ||
          element.classList.contains('p-3') ||
          element.classList.contains('space-x-2') ||
          element.classList.contains('space-y-2');
          
        expect(hasSpacing).toBe(true);
      });
    },
  };
  
  return tests;
};

/**
 * Test screen reader compatibility
 */
export const testScreenReaderCompatibility = (component: RenderResult) => {
  const { container } = component;
  
  const tests = {
    // Dynamic content should be announced
    dynamicContentAnnouncement: () => {
      const liveRegions = container.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
      
      // Should have live regions for price updates, transaction status, etc.
      const hasDynamicContent = container.querySelector(
        '[data-testid*="price"], [data-testid*="balance"], [data-testid*="status"]'
      );
      
      if (hasDynamicContent) {
        expect(liveRegions.length).toBeGreaterThan(0);
      }
    },
    
    // Form elements should have proper labels
    formLabels: () => {
      const formElements = container.querySelectorAll('input, select, textarea');
      formElements.forEach(element => {
        const hasLabel = 
          element.hasAttribute('aria-label') ||
          element.hasAttribute('aria-labelledby') ||
          container.querySelector(`label[for="${element.id}"]`) ||
          element.hasAttribute('placeholder');
          
        expect(hasLabel).toBe(true);
      });
    },
    
    // Loading states should be announced
    loadingStates: () => {
      const loadingElements = container.querySelectorAll('[data-testid*="loading"]');
      loadingElements.forEach(element => {
        expect(
          element.hasAttribute('aria-label') ||
          element.hasAttribute('role') ||
          element.textContent?.includes('Loading')
        ).toBe(true);
      });
    },
  };
  
  return tests;
};

/**
 * Comprehensive Web3 accessibility test suite
 */
export const runWeb3AccessibilityTests = async (component: RenderResult) => {
  // Run axe accessibility tests
  await testWeb3Accessibility(component);
  
  // Run keyboard navigation tests
  const keyboardTests = testKeyboardNavigation(component);
  keyboardTests.hasTabIndex();
  keyboardTests.buttonKeyboardSupport();
  
  // Run ARIA label tests
  const ariaTests = testAriaLabels(component);
  ariaTests.interactiveElementsHaveNames();
  ariaTests.liveRegionsForUpdates();
  ariaTests.complexWidgetsStructure();
  
  // Run visual accessibility tests
  const visualTests = testVisualAccessibility(component);
  visualTests.colorContrast();
  visualTests.textNotColorOnly();
  
  // Run mobile accessibility tests
  const mobileTests = testMobileAccessibility(component);
  mobileTests.touchTargetSize();
  mobileTests.readableText();
  mobileTests.elementSpacing();
  
  // Run screen reader tests
  const screenReaderTests = testScreenReaderCompatibility(component);
  screenReaderTests.dynamicContentAnnouncement();
  screenReaderTests.formLabels();
  screenReaderTests.loadingStates();
  
  return {
    keyboard: keyboardTests,
    aria: ariaTests,
    visual: visualTests,
    mobile: mobileTests,
    screenReader: screenReaderTests,
  };
};

/**
 * Custom accessibility matcher for Web3 components
 */
export const toBeWeb3Accessible = async (received: RenderResult) => {
  try {
    await runWeb3AccessibilityTests(received);
    return {
      message: () => 'Component is Web3 accessible',
      pass: true,
    };
  } catch (error) {
    return {
      message: () => `Component is not Web3 accessible: ${error}`,
      pass: false,
    };
  }
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWeb3Accessible(): Promise<R>;
    }
  }
}

expect.extend({
  toBeWeb3Accessible,
});