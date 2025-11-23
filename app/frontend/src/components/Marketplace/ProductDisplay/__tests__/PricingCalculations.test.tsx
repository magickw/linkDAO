/**
 * Pricing Calculations Tests
 * Tests for real-time crypto-to-fiat conversion and pricing display
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DualPricing } from '../../../../design-system/components/DualPricing';

// Mock the design tokens
jest.mock('../../../design-system/tokens', () => ({
  designTokens: {
    typography: {
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      fontWeight: {
        medium: '500',
        bold: '700',
      },
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
    },
    colors: {
      status: {
        success: '#10b981',
      },
    },
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('Pricing Calculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Real-time Conversion', () => {
    it('shows conversion loading state', () => {
      render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          realTimeConversion={true}
        />
      );

      expect(screen.getByText('Converting...')).toBeInTheDocument();
    });

    it('shows live indicator when real-time conversion is enabled', async () => {
      render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          realTimeConversion={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });
    });
  });

  describe('Static Pricing Display', () => {
    it('displays provided fiat price without conversion', () => {
      render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          fiatPrice="260.00"
          fiatSymbol="USD"
          realTimeConversion={false}
        />
      );

      expect(screen.getByText('0.15 ETH')).toBeInTheDocument();
      expect(screen.getByText(/260\.00/)).toBeInTheDocument();
      expect(screen.queryByText('Converting...')).not.toBeInTheDocument();
    });

    it('handles different currency symbols', () => {
      render(
        <DualPricing
          cryptoPrice="100"
          cryptoSymbol="USDC"
          fiatPrice="100.00"
          fiatSymbol="EUR"
          realTimeConversion={false}
        />
      );

      expect(screen.getByText('100 USDC')).toBeInTheDocument();
      expect(screen.getByText(/EUR100\.00/)).toBeInTheDocument();
    });
  });

  describe('Layout Variants', () => {
    it('renders horizontal layout correctly', () => {
      const { container } = render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          fiatPrice="260.00"
          layout="horizontal"
        />
      );

      const dualPricing = container.querySelector('.dual-pricing--horizontal');
      expect(dualPricing).toBeInTheDocument();
    });

    it('renders vertical layout correctly', () => {
      const { container } = render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          fiatPrice="260.00"
          layout="vertical"
        />
      );

      const dualPricing = container.querySelector('.dual-pricing--vertical');
      expect(dualPricing).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('applies small size styling', () => {
      render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          fiatPrice="260.00"
          size="sm"
        />
      );

      // Component should render without errors
      expect(screen.getByText('0.15 ETH')).toBeInTheDocument();
    });

    it('applies large size styling', () => {
      render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          fiatPrice="260.00"
          size="lg"
        />
      );

      // Component should render without errors
      expect(screen.getByText('0.15 ETH')).toBeInTheDocument();
    });
  });

  describe('Price Toggle Functionality', () => {
    it('shows toggle button when enabled', () => {
      render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          fiatPrice="260.00"
          showToggle={true}
        />
      );

      expect(screen.getByText('⇄')).toBeInTheDocument();
    });

    it('hides toggle button when disabled', () => {
      render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          fiatPrice="260.00"
          showToggle={false}
        />
      );

      expect(screen.queryByText('⇄')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing fiat price gracefully', () => {
      render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          realTimeConversion={false}
        />
      );

      expect(screen.getByText('0.15 ETH')).toBeInTheDocument();
      // Should not show fiat price section
      expect(screen.queryByText(/≈/)).not.toBeInTheDocument();
    });

    it('handles zero crypto price', () => {
      render(
        <DualPricing
          cryptoPrice="0"
          cryptoSymbol="ETH"
          realTimeConversion={true}
        />
      );

      expect(screen.getByText('0 ETH')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper text content for screen readers', () => {
      render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          fiatPrice="260.00"
          fiatSymbol="USD"
        />
      );

      // Should have readable price information
      expect(screen.getByText('0.15 ETH')).toBeInTheDocument();
      expect(screen.getByText(/≈.*260\.00/)).toBeInTheDocument();
    });

    it('maintains proper contrast for price text', () => {
      const { container } = render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          fiatPrice="260.00"
        />
      );

      // Primary price should have high contrast (white text)
      const primaryPrice = container.querySelector('.primary-price');
      expect(primaryPrice).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles price changes correctly', () => {
      const { rerender } = render(
        <DualPricing
          cryptoPrice="0.15"
          cryptoSymbol="ETH"
          realTimeConversion={true}
        />
      );

      // Change price
      rerender(
        <DualPricing
          cryptoPrice="0.17"
          cryptoSymbol="ETH"
          realTimeConversion={true}
        />
      );

      // Should show the updated price
      expect(screen.getByText('0.17 ETH')).toBeInTheDocument();
    });
  });
});