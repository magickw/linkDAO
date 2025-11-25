/**
 * StablecoinPricing Component Tests
 * Tests for stablecoin pricing display without complex conversions
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { StablecoinPricing } from '../StablecoinPricing';

// Mock the design tokens
jest.mock('../../tokens', () => ({
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
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('StablecoinPricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Display', () => {
    it('displays stablecoin price with symbol', () => {
      render(
        <StablecoinPricing
          price="25.99"
          symbol="USDC"
        />
      );

      expect(screen.getByText('25.99 USDC')).toBeInTheDocument();
    });

    it('shows USD equivalent by default', () => {
      render(
        <StablecoinPricing
          price="25.99"
          symbol="USDC"
        />
      );

      expect(screen.getByText(/\$25.99 USD/)).toBeInTheDocument();
    });

    it('hides USD equivalent when disabled', () => {
      render(
        <StablecoinPricing
          price="25.99"
          symbol="USDC"
          showUsdEquivalent={false}
        />
      );

      expect(screen.queryByText(/\$25.99 USD/)).not.toBeInTheDocument();
    });
  });

  describe('Formatting', () => {
    it('formats prices with 2 decimal places for amounts >= 1', () => {
      render(
        <StablecoinPricing
          price="25"
          symbol="USDC"
        />
      );

      expect(screen.getByText('25.00 USDC')).toBeInTheDocument();
    });

    it('formats prices with 4 decimal places for amounts >= 0.01', () => {
      render(
        <StablecoinPricing
          price="0.25"
          symbol="USDC"
        />
      );

      expect(screen.getByText('0.2500 USDC')).toBeInTheDocument();
    });

    it('formats prices with 6 decimal places for amounts < 0.01', () => {
      render(
        <StablecoinPricing
          price="0.0025"
          symbol="USDC"
        />
      );

      expect(screen.getByText('0.002500 USDC')).toBeInTheDocument();
    });
  });

  describe('Layout Variants', () => {
    it('renders horizontal layout correctly', () => {
      const { container } = render(
        <StablecoinPricing
          price="25.99"
          symbol="USDC"
          layout="horizontal"
        />
      );

      const stablecoinPricing = container.querySelector('.stablecoin-pricing--horizontal');
      expect(stablecoinPricing).toBeInTheDocument();
    });

    it('renders vertical layout correctly', () => {
      const { container } = render(
        <StablecoinPricing
          price="25.99"
          symbol="USDC"
          layout="vertical"
        />
      );

      const stablecoinPricing = container.querySelector('.stablecoin-pricing--vertical');
      expect(stablecoinPricing).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('applies small size styling', () => {
      render(
        <StablecoinPricing
          price="25.99"
          symbol="USDC"
          size="sm"
        />
      );

      // Component should render without errors
      expect(screen.getByText('25.99 USDC')).toBeInTheDocument();
    });

    it('applies medium size styling', () => {
      render(
        <StablecoinPricing
          price="25.99"
          symbol="USDC"
          size="md"
        />
      );

      // Component should render without errors
      expect(screen.getByText('25.99 USDC')).toBeInTheDocument();
    });

    it('applies large size styling', () => {
      render(
        <StablecoinPricing
          price="25.99"
          symbol="USDC"
          size="lg"
        />
      );

      // Component should render without errors
      expect(screen.getByText('25.99 USDC')).toBeInTheDocument();
    });
  });

  describe('Different Stablecoins', () => {
    it('displays USDT symbol correctly', () => {
      render(
        <StablecoinPricing
          price="25.99"
          symbol="USDT"
        />
      );

      expect(screen.getByText('25.99 USDT')).toBeInTheDocument();
    });

    it('displays DAI symbol correctly', () => {
      render(
        <StablecoinPricing
          price="25.99"
          symbol="DAI"
        />
      );

      expect(screen.getByText('25.99 DAI')).toBeInTheDocument();
    });
  });
});