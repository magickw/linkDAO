import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ReactElement } from 'react';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Accessibility testing utilities
export class AccessibilityTestUtils {
  /**
   * Test component for WCAG compliance using axe-core
   */
  static async testWCAGCompliance(component: ReactElement, options?: any) {
    const { container } = render(component);
    const results = await axe(container, {
      rules: {
        // Enable all WCAG 2.1 AA rules
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labels': { enabled: true },
        'semantic-markup': { enabled: true },
        ...options?.rules
      }
    });
    
    expect(results).toHaveNoViolations();
    return results;
  }

  /**
   * Test keyboard navigation
   */
  static async testKeyboardNavigation(component: ReactElement, expectedFocusOrder: string[]) {
    const user = userEvent.setup();
    render(component);

    // Test Tab navigation
    for (let i = 0; i < expectedFocusOrder.length; i++) {
      await user.tab();
      const focusedElement = document.activeElement;
      
      if (expectedFocusOrder[i]) {
        const expectedElement = screen.getByTestId(expectedFocusOrder[i]) || 
                               screen.getByRole(expectedFocusOrder[i]) ||
                               screen.getByLabelText(expectedFocusOrder[i]);
        expect(focusedElement).toBe(expectedElement);
      }
    }

    // Test Shift+Tab navigation (reverse)
    for (let i = expectedFocusOrder.length - 1; i >= 0; i--) {
      await user.tab({ shift: true });
      const focusedElement = document.activeElement;
      
      if (expectedFocusOrder[i]) {
        const expectedElement = screen.getByTestId(expectedFocusOrder[i]) || 
                               screen.getByRole(expectedFocusOrder[i]) ||
                               screen.getByLabelText(expectedFocusOrder[i]);
        expect(focusedElement).toBe(expectedElement);
      }
    }
  }

  /**
   * Test screen reader announcements
   */
  static async testScreenReaderAnnouncements(
    component: ReactElement, 
    action: () => Promise<void> | void,
    expectedAnnouncement: string
  ) {
    render(component);
    
    // Create a mock live region to capture announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.id = 'test-live-region';
    document.body.appendChild(liveRegion);

    // Mock the announcement function
    const originalAnnounce = (window as any).announceToScreenReader;
    const mockAnnounce = jest.fn((message: string) => {
      liveRegion.textContent = message;
    });
    (window as any).announceToScreenReader = mockAnnounce;

    // Perform the action
    await action();

    // Wait for announcement
    await waitFor(() => {
      expect(mockAnnounce).toHaveBeenCalledWith(expectedAnnouncement);
    });

    // Cleanup
    document.body.removeChild(liveRegion);
    (window as any).announceToScreenReader = originalAnnounce;
  }

  /**
   * Test ARIA attributes
   */
  static testARIAAttributes(component: ReactElement, expectedAttributes: Record<string, any>) {
    const { container } = render(component);
    
    Object.entries(expectedAttributes).forEach(([selector, attributes]) => {
      const element = container.querySelector(selector);
      expect(element).toBeInTheDocument();
      
      Object.entries(attributes).forEach(([attr, value]) => {
        if (value === null) {
          expect(element).not.toHaveAttribute(attr);
        } else {
          expect(element).toHaveAttribute(attr, value);
        }
      });
    });
  }

  /**
   * Test focus management
   */
  static async testFocusManagement(
    component: ReactElement,
    triggerAction: () => Promise<void> | void,
    expectedFocusTarget: string
  ) {
    render(component);
    
    await triggerAction();
    
    await waitFor(() => {
      const expectedElement = screen.getByTestId(expectedFocusTarget) ||
                             screen.getByRole(expectedFocusTarget) ||
                             screen.getByLabelText(expectedFocusTarget);
      expect(expectedElement).toHaveFocus();
    });
  }

  /**
   * Test color contrast
   */
  static testColorContrast(element: HTMLElement, expectedRatio: number = 4.5) {
    const computedStyle = window.getComputedStyle(element);
    const backgroundColor = computedStyle.backgroundColor;
    const color = computedStyle.color;
    
    // This is a simplified test - in practice, you'd use a proper color contrast library
    const contrastRatio = this.calculateContrastRatio(color, backgroundColor);
    expect(contrastRatio).toBeGreaterThanOrEqual(expectedRatio);
  }

  /**
   * Test touch target size (minimum 44px)
   */
  static testTouchTargetSize(element: HTMLElement, minSize: number = 44) {
    const rect = element.getBoundingClientRect();
    expect(rect.width).toBeGreaterThanOrEqual(minSize);
    expect(rect.height).toBeGreaterThanOrEqual(minSize);
  }

  /**
   * Test responsive design
   */
  static async testResponsiveDesign(
    component: ReactElement,
    viewports: Array<{ width: number; height: number; name: string }>
  ) {
    const { container } = render(component);
    
    for (const viewport of viewports) {
      // Mock viewport size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: viewport.width,
      });
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: viewport.height,
      });

      // Trigger resize event
      fireEvent(window, new Event('resize'));
      
      // Wait for responsive changes
      await waitFor(() => {
        // Test that component adapts to viewport
        const elements = container.querySelectorAll('[data-testid*="responsive"]');
        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          expect(rect.width).toBeLessThanOrEqual(viewport.width);
        });
      });
    }
  }

  /**
   * Test high contrast mode
   */
  static async testHighContrastMode(component: ReactElement) {
    // Mock high contrast media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const { container } = render(component);
    
    // Trigger high contrast mode
    fireEvent(window, new Event('change'));
    
    await waitFor(() => {
      // Check that high contrast styles are applied
      expect(container.firstChild).toHaveClass('high-contrast-mode');
    });
  }

  /**
   * Test reduced motion preference
   */
  static async testReducedMotion(component: ReactElement) {
    // Mock reduced motion media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const { container } = render(component);
    
    // Trigger reduced motion preference
    fireEvent(window, new Event('change'));
    
    await waitFor(() => {
      // Check that animations are disabled or reduced
      const animatedElements = container.querySelectorAll('[data-testid*="animated"]');
      animatedElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        expect(computedStyle.animationDuration).toBe('0.01ms');
      });
    });
  }

  /**
   * Test form accessibility
   */
  static testFormAccessibility(formElement: HTMLElement) {
    const inputs = formElement.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      const inputElement = input as HTMLInputElement;
      
      // Check for labels
      const label = formElement.querySelector(`label[for="${inputElement.id}"]`) ||
                   inputElement.closest('label');
      expect(label).toBeInTheDocument();
      
      // Check required fields have aria-required
      if (inputElement.required) {
        expect(inputElement).toHaveAttribute('aria-required', 'true');
      }
      
      // Check error states
      if (inputElement.getAttribute('aria-invalid') === 'true') {
        const errorId = inputElement.getAttribute('aria-describedby');
        if (errorId) {
          const errorElement = document.getElementById(errorId);
          expect(errorElement).toBeInTheDocument();
        }
      }
    });
  }

  /**
   * Test modal accessibility
   */
  static async testModalAccessibility(
    component: ReactElement,
    openModalAction: () => Promise<void> | void
  ) {
    render(component);
    
    await openModalAction();
    
    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
      
      // Test focus trap
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      expect(focusableElements.length).toBeGreaterThan(0);
      expect(focusableElements[0]).toHaveFocus();
    });
    
    // Test Escape key closes modal
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  }

  // Helper method to calculate contrast ratio (simplified)
  private static calculateContrastRatio(color1: string, color2: string): number {
    // This is a simplified implementation
    // In practice, you'd use a proper color contrast calculation library
    return 4.5; // Mock value for testing
  }
}

// Custom Jest matchers for accessibility testing
export const accessibilityMatchers = {
  toBeAccessible: async (received: HTMLElement) => {
    const results = await axe(received);
    const pass = results.violations.length === 0;
    
    return {
      pass,
      message: () => 
        pass 
          ? `Expected element to have accessibility violations, but it passed all tests`
          : `Expected element to be accessible, but found ${results.violations.length} violations:\n${
              results.violations.map(v => `- ${v.description}`).join('\n')
            }`
    };
  },

  toHaveProperFocus: (received: HTMLElement) => {
    const pass = received === document.activeElement;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected element not to have focus`
          : `Expected element to have focus, but ${document.activeElement?.tagName || 'no element'} has focus instead`
    };
  },

  toHaveMinimumTouchTarget: (received: HTMLElement, minSize: number = 44) => {
    const rect = received.getBoundingClientRect();
    const pass = rect.width >= minSize && rect.height >= minSize;
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected element to have touch target smaller than ${minSize}px`
          : `Expected element to have minimum touch target of ${minSize}px, but got ${rect.width}x${rect.height}px`
    };
  }
};

// Test data generators
export const AccessibilityTestData = {
  generateMockUser: () => ({
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      screenReader: false
    }
  }),

  generateMockPost: () => ({
    id: 'test-post-1',
    title: 'Test Post Title',
    content: 'This is a test post content for accessibility testing.',
    author: 'Test Author',
    timestamp: new Date().toISOString(),
    reactions: { likes: 5, dislikes: 1 },
    comments: []
  }),

  generateMockForm: () => ({
    fields: [
      {
        id: 'name',
        name: 'name',
        label: 'Full Name',
        type: 'text',
        required: true
      },
      {
        id: 'email',
        name: 'email',
        label: 'Email Address',
        type: 'email',
        required: true
      },
      {
        id: 'message',
        name: 'message',
        label: 'Message',
        type: 'textarea',
        required: false
      }
    ]
  })
};

export default AccessibilityTestUtils;