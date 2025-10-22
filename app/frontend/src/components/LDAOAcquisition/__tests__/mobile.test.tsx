import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LDAOPurchaseModal from '../LDAOPurchaseModal';
import EarnLDAOPage from '../EarnLDAOPage';
import DEXTradingInterface from '../DEXTradingInterface';

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

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Mobile Compatibility Tests', () => {
  const mockViewport = (width: number, height: number) => {
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
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'));
  };

  describe('LDAOPurchaseModal Mobile', () => {
    beforeEach(() => {
      mockViewport(375, 667); // iPhone SE dimensions
    });

    it('renders properly on mobile viewport', () => {
      render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );
      
      expect(screen.getByText('Choose Method')).toBeInTheDocument();
    });

    it('has responsive modal sizing', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );
      
      const modal = container.querySelector('[role="dialog"]');
      expect(modal).toHaveClass('max-w-lg');
    });

    it('has touch-friendly button sizes', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );
      
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        // Check for adequate padding for touch targets
        expect(
          button.classList.contains('p-3') ||
          button.classList.contains('p-4') ||
          button.classList.contains('py-3') ||
          button.classList.contains('py-4') ||
          button.classList.contains('px-4') ||
          button.classList.contains('px-6')
        ).toBeTruthy();
      });
    });

    it('handles touch interactions', () => {
      render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );
      
      const cryptoButton = screen.getByText('Pay with Crypto');
      
      // Simulate touch events
      fireEvent.touchStart(cryptoButton);
      fireEvent.touchEnd(cryptoButton);
      fireEvent.click(cryptoButton);
      
      expect(cryptoButton.closest('button')).toHaveClass('border-blue-500');
    });

    it('has readable text sizes on mobile', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );
      
      // Check that text is not too small
      const smallText = container.querySelectorAll('.text-xs');
      const totalText = container.querySelectorAll('[class*="text-"]');
      
      // Most text should not be extra small
      expect(smallText.length / totalText.length).toBeLessThan(0.5);
    });

    it('has proper spacing on mobile', () => {
      const { container } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );
      
      // Check for adequate spacing
      const spacedElements = container.querySelectorAll('[class*="space-y"], [class*="gap-"]');
      expect(spacedElements.length).toBeGreaterThan(0);
    });
  });

  describe('EarnLDAOPage Mobile', () => {
    beforeEach(() => {
      mockViewport(375, 667);
    });

    it('renders responsive grid layout', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      // Should have responsive grid classes
      const grids = container.querySelectorAll('[class*="grid-cols-1"], [class*="md:grid-cols-"], [class*="lg:grid-cols-"]');
      expect(grids.length).toBeGreaterThan(0);
    });

    it('has mobile-friendly tab navigation', () => {
      render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      // Tab buttons should be easily tappable
      const tabButtons = screen.getAllByRole('button').filter(button => 
        button.textContent?.includes('Tasks') || 
        button.textContent?.includes('Achievements') || 
        button.textContent?.includes('Leaderboard')
      );
      
      expect(tabButtons.length).toBeGreaterThan(0);
    });

    it('handles swipe gestures for tabs', () => {
      render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const achievementsTab = screen.getByText('Achievements');
      
      // Simulate swipe gesture
      fireEvent.touchStart(achievementsTab, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      fireEvent.touchMove(achievementsTab, {
        touches: [{ clientX: 50, clientY: 100 }]
      });
      fireEvent.touchEnd(achievementsTab);
      
      // Tab should still be clickable
      fireEvent.click(achievementsTab);
      expect(achievementsTab).toHaveClass('bg-blue-600');
    });

    it('has mobile-optimized card layouts', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      // Cards should stack on mobile
      const cardContainers = container.querySelectorAll('[class*="grid-cols-1"]');
      expect(cardContainers.length).toBeGreaterThan(0);
    });

    it('shows progress bars clearly on mobile', () => {
      const { container } = render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      // Progress bars should have adequate height
      const progressBars = container.querySelectorAll('[class*="h-2"], [class*="h-3"]');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('DEXTradingInterface Mobile', () => {
    beforeEach(() => {
      mockViewport(375, 667);
    });

    it('has mobile-friendly form inputs', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const inputs = container.querySelectorAll('input');
      inputs.forEach(input => {
        // Inputs should have adequate padding for mobile
        expect(
          input.classList.contains('py-3') ||
          input.classList.contains('p-3') ||
          input.classList.contains('p-4')
        ).toBeTruthy();
      });
    });

    it('has mobile-optimized dropdowns', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const selects = container.querySelectorAll('select');
      selects.forEach(select => {
        expect(
          select.classList.contains('py-3') ||
          select.classList.contains('p-3')
        ).toBeTruthy();
      });
    });

    it('handles pinch-to-zoom on charts', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const chart = container.querySelector('[class*="h-32"]');
      expect(chart).toBeTruthy();
      
      // Chart should be touch-friendly
      if (chart) {
        fireEvent.touchStart(chart, {
          touches: [
            { clientX: 100, clientY: 100 },
            { clientX: 120, clientY: 120 }
          ]
        });
      }
    });

    it('has mobile-friendly settings panel', () => {
      render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);
      
      // Settings should be visible and touch-friendly
      expect(screen.getByText('Slippage Tolerance')).toBeInTheDocument();
    });

    it('shows mobile-optimized quote details', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const amountInput = screen.getByPlaceholderText('0.0');
      fireEvent.change(amountInput, { target: { value: '1' } });
      
      // Quote details should be readable on mobile
      const quoteContainer = container.querySelector('[class*="bg-gray-50"]');
      expect(quoteContainer).toBeTruthy();
    });
  });

  describe('Cross-Device Compatibility', () => {
    const devices = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];

    devices.forEach(device => {
      describe(`${device.name} (${device.width}x${device.height})`, () => {
        beforeEach(() => {
          mockViewport(device.width, device.height);
        });

        it('renders LDAOPurchaseModal correctly', () => {
          render(
            <LDAOPurchaseModal 
              isOpen={true} 
              onClose={jest.fn()} 
              userAddress="0x1234567890123456789012345678901234567890"
            />
          );
          
          expect(screen.getByText('Choose Method')).toBeInTheDocument();
        });

        it('renders EarnLDAOPage correctly', () => {
          render(
            <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
          );
          
          expect(screen.getByText('Earn LDAO Tokens')).toBeInTheDocument();
        });

        it('renders DEXTradingInterface correctly', () => {
          render(
            <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
          );
          
          expect(screen.getByText('DEX Trading')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Touch Gestures', () => {
    beforeEach(() => {
      mockViewport(375, 667);
    });

    it('handles tap gestures on buttons', () => {
      const onClose = jest.fn();
      render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={onClose} 
          userAddress="0x1234567890123456789012345678901234567890"
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      
      // Simulate tap
      fireEvent.touchStart(closeButton);
      fireEvent.touchEnd(closeButton);
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('handles long press on interactive elements', () => {
      render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const tabButton = screen.getByText('Tasks');
      
      // Simulate long press
      fireEvent.touchStart(tabButton);
      setTimeout(() => {
        fireEvent.touchEnd(tabButton);
      }, 500);
      
      expect(tabButton).toBeInTheDocument();
    });

    it('prevents accidental double-tap zoom', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      // Check for touch-action CSS or meta viewport
      const metaViewport = document.querySelector('meta[name="viewport"]');
      expect(
        metaViewport?.getAttribute('content')?.includes('user-scalable=no') ||
        container.querySelector('[style*="touch-action"]')
      ).toBeTruthy();
    });
  });

  describe('Mobile Performance', () => {
    beforeEach(() => {
      mockViewport(375, 667);
    });

    it('loads efficiently on mobile', () => {
      const startTime = performance.now();
      
      render(
        <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly (under 100ms for initial render)
      expect(renderTime).toBeLessThan(100);
    });

    it('handles memory constraints', () => {
      // Render multiple components to test memory usage
      const { unmount } = render(
        <div>
          <LDAOPurchaseModal 
            isOpen={true} 
            onClose={jest.fn()} 
            userAddress="0x1234567890123456789012345678901234567890"
          />
          <EarnLDAOPage userAddress="0x1234567890123456789012345678901234567890" />
          <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
        </div>
      );
      
      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('optimizes images for mobile', () => {
      const { container } = render(
        <DEXTradingInterface userAddress="0x1234567890123456789012345678901234567890" />
      );
      
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        // Images should have proper loading attributes
        expect(
          img.hasAttribute('loading') ||
          img.hasAttribute('decoding')
        ).toBeTruthy();
      });
    });
  });
});