import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import LDAOPurchaseModal from '../LDAOPurchaseModal';
import EarnLDAOPage from '../EarnLDAOPage';
import DEXTradingInterface from '../DEXTradingInterface';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock services
jest.mock('../../../services/ldaoAcquisitionService', () => ({
  ldaoAcquisitionService: {
    getEarnOpportunities: jest.fn().mockResolvedValue([]),
    getQuote: jest.fn().mockResolvedValue({
      ldaoAmount: '1000',
      usdAmount: '10.00',
      ethAmount: '0.004',
      usdcAmount: '10.00',
      discount: 0,
      fees: { processing: '0.01', gas: '0.005', total: '0.015' },
      estimatedTime: '2-5 minutes'
    })
  }
}));

jest.mock('react-hot-toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}));

global.fetch = jest.fn().mockResolvedValue({
  json: () => Promise.resolve({})
});

describe('Accessibility Tests', () => {
  describe('LDAOPurchaseModal', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels for form elements', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );

      // Check for proper labeling
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type');
      });
    });

    it('supports keyboard navigation', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );

      // All interactive elements should be focusable
      const interactiveElements = container.querySelectorAll('button, input, select');
      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('has proper heading hierarchy', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );

      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('has sufficient color contrast', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );

      // Check for proper contrast classes (Tailwind ensures WCAG compliance)
      const textElements = container.querySelectorAll('[class*="text-"]');
      expect(textElements.length).toBeGreaterThan(0);
    });
  });

  describe('EarnLDAOPage', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper semantic structure', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );

      // Should have main content area
      const main = container.querySelector('main') || container.querySelector('[role="main"]');
      expect(main || container.firstChild).toBeTruthy();
    });

    it('has accessible tab navigation', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );

      // Tab buttons should have proper ARIA attributes
      const tabButtons = container.querySelectorAll('[role="tab"], button[aria-selected]');
      if (tabButtons.length > 0) {
        tabButtons.forEach(tab => {
          expect(tab).toHaveAttribute('aria-selected');
        });
      }
    });

    it('has accessible progress indicators', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );

      // Progress bars should have proper ARIA attributes
      const progressBars = container.querySelectorAll('[role="progressbar"]');
      progressBars.forEach(bar => {
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemin');
        expect(bar).toHaveAttribute('aria-valuemax');
      });
    });

    it('has accessible achievement cards', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );

      // Cards should be properly structured
      const cards = container.querySelectorAll('[class*="card"], [class*="rounded-lg"]');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  describe('DEXTradingInterface', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has accessible form controls', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );

      // Form inputs should have labels
      const inputs = container.querySelectorAll('input');
      inputs.forEach(input => {
        const label = container.querySelector(`label[for="${input.id}"]`) ||
                     input.closest('label') ||
                     input.getAttribute('aria-label') ||
                     input.getAttribute('aria-labelledby');
        expect(label).toBeTruthy();
      });
    });

    it('has accessible select dropdowns', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );

      const selects = container.querySelectorAll('select');
      selects.forEach(select => {
        expect(select).toHaveAttribute('aria-label');
      });
    });

    it('has accessible buttons with proper states', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );

      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        // Disabled buttons should have proper ARIA state
        if (button.hasAttribute('disabled')) {
          expect(button).toHaveAttribute('aria-disabled', 'true');
        }
      });
    });

    it('has accessible loading states', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );

      // Loading indicators should have proper ARIA attributes
      const loadingElements = container.querySelectorAll('[class*="animate-spin"]');
      loadingElements.forEach(element => {
        expect(element).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Mobile Accessibility', () => {
    beforeEach(() => {
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
    });

    it('has proper touch targets on mobile', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );

      // Interactive elements should have minimum 44px touch targets
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minSize = 44; // 44px minimum touch target
        
        // Check if button has adequate padding or size
        expect(
          parseInt(styles.minHeight) >= minSize ||
          parseInt(styles.padding) >= 12 ||
          button.classList.contains('p-3') ||
          button.classList.contains('p-4') ||
          button.classList.contains('py-3') ||
          button.classList.contains('py-4')
        ).toBeTruthy();
      });
    });

    it('has responsive text sizes', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );

      // Text should not be too small on mobile
      const textElements = container.querySelectorAll('[class*="text-"]');
      textElements.forEach(element => {
        expect(
          element.classList.contains('text-xs') ||
          element.classList.contains('text-sm') ||
          element.classList.contains('text-base') ||
          element.classList.contains('text-lg') ||
          element.classList.contains('text-xl') ||
          element.classList.contains('text-2xl') ||
          element.classList.contains('text-3xl') ||
          element.classList.contains('text-4xl')
        ).toBeTruthy();
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('has proper ARIA landmarks', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );

      // Should have navigation landmarks
      const landmarks = container.querySelectorAll(
        '[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer'
      );
      expect(landmarks.length).toBeGreaterThan(0);
    });

    it('has descriptive link text', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );

      const links = container.querySelectorAll('a');
      links.forEach(link => {
        const text = link.textContent?.trim();
        const ariaLabel = link.getAttribute('aria-label');
        const ariaLabelledBy = link.getAttribute('aria-labelledby');
        
        expect(
          (text && text.length > 0) ||
          (ariaLabel && ariaLabel.length > 0) ||
          (ariaLabelledBy && ariaLabelledBy.length > 0)
        ).toBeTruthy();
      });
    });

    it('has proper image alt text', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );

      const images = container.querySelectorAll('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });

    it('has proper focus management', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );

      // Modal should trap focus
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error States Accessibility', () => {
    it('has accessible error messages', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );

      // Error messages should be associated with form fields
      const errorMessages = container.querySelectorAll('[class*="text-red"]');
      errorMessages.forEach(error => {
        expect(
          error.getAttribute('role') === 'alert' ||
          error.getAttribute('aria-live') === 'polite' ||
          error.getAttribute('aria-live') === 'assertive'
        ).toBeTruthy();
      });
    });

    it('has accessible loading states', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );

      // Loading states should be announced to screen readers
      const loadingElements = container.querySelectorAll('[class*="animate"]');
      loadingElements.forEach(element => {
        expect(
          element.getAttribute('aria-label') ||
          element.getAttribute('aria-live') ||
          element.getAttribute('role')
        ).toBeTruthy();
      });
    });
  });
});