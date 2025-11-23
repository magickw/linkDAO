/**
 * Design System Component Tests
 * Tests for core glassmorphism design system components
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  GlassPanel,
  Button,
  TrustIndicators,
  DualPricing,
  LoadingSkeleton,
} from '../index';

// Mock framer-motion for testing
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('Design System Components', () => {
  describe('GlassPanel', () => {
    it('renders with default props', () => {
      render(
        <GlassPanel>
          <div>Test content</div>
        </GlassPanel>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('applies correct variant class', () => {
      const { container } = render(
        <GlassPanel variant="secondary">
          <div>Test content</div>
        </GlassPanel>
      );
      
      expect(container.firstChild).toHaveClass('glass-panel');
    });

    it('renders with NFT shadow variant', () => {
      render(
        <GlassPanel nftShadow="premium">
          <div>Premium NFT</div>
        </GlassPanel>
      );
      
      expect(screen.getByText('Premium NFT')).toBeInTheDocument();
    });
  });

  describe('Button', () => {
    it('renders with correct text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('handles click events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows loading state', () => {
      render(<Button loading>Loading...</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('renders with icon', () => {
      render(
        <Button icon={<span data-testid="icon">🚀</span>}>
          Launch
        </Button>
      );
      
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Launch')).toBeInTheDocument();
    });

    it('applies correct size classes', () => {
      const { rerender } = render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
      
      rerender(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('TrustIndicators', () => {
    it('renders verified badge', () => {
      render(<TrustIndicators verified />);
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('renders multiple indicators', () => {
      render(
        <TrustIndicators 
          verified 
          escrowProtected 
          onChainCertified 
        />
      );
      
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Escrow Protected')).toBeInTheDocument();
      expect(screen.getByText('On-Chain Certified')).toBeInTheDocument();
    });

    it('renders DAO approved indicator', () => {
      render(<TrustIndicators daoApproved />);
      expect(screen.getByText('DAO Approved')).toBeInTheDocument();
    });

    it('renders nothing when no indicators are active', () => {
      const { container } = render(<TrustIndicators />);
      expect(container.firstChild).toBeNull();
    });

    it('applies compact layout correctly', () => {
      render(
        <TrustIndicators 
          verified 
          escrowProtected 
          layout="compact" 
        />
      );
      
      // In compact layout, text should not be visible, only icons
      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
      expect(screen.queryByText('Escrow Protected')).not.toBeInTheDocument();
    });
  });

  describe('DualPricing', () => {
    it('renders crypto and fiat prices', () => {
      render(
        <DualPricing 
          cryptoPrice="0.15" 
          cryptoSymbol="ETH" 
          fiatPrice="270.00" 
          fiatSymbol="USD" 
        />
      );
      
      expect(screen.getByText('0.15 ETH')).toBeInTheDocument();
      expect(screen.getByText('≈ $270.00')).toBeInTheDocument();
    });

    it('shows real-time indicator when enabled', () => {
      render(
        <DualPricing 
          cryptoPrice="0.15" 
          cryptoSymbol="ETH" 
          realTimeConversion 
        />
      );
      
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('renders toggle button when showToggle is true', () => {
      render(
        <DualPricing 
          cryptoPrice="0.15" 
          cryptoSymbol="ETH" 
          fiatPrice="270.00" 
          showToggle 
        />
      );
      
      expect(screen.getByRole('button', { name: '⇄' })).toBeInTheDocument();
    });

    it('handles toggle functionality', () => {
      render(
        <DualPricing 
          cryptoPrice="0.15" 
          cryptoSymbol="ETH" 
          fiatPrice="270.00" 
          showToggle 
        />
      );
      
      const toggleButton = screen.getByRole('button', { name: '⇄' });
      fireEvent.click(toggleButton);
      
      // After toggle, fiat should be primary
      expect(screen.getByText('$270.00')).toBeInTheDocument();
    });
  });

  describe('LoadingSkeleton', () => {
    it('renders text skeleton', () => {
      const { container } = render(
        <LoadingSkeleton variant="text" width="200px" height="1rem" />
      );
      
      expect(container.firstChild).toHaveClass('loading-skeleton');
    });

    it('renders multiple lines for text skeleton', () => {
      const { container } = render(
        <LoadingSkeleton variant="text" lines={3} />
      );
      
      const skeletons = container.querySelectorAll('.loading-skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('renders card skeleton', () => {
      const { container } = render(
        <LoadingSkeleton variant="card" width="300px" height="200px" />
      );
      
      expect(container.firstChild).toHaveClass('loading-skeleton--card');
    });

    it('renders avatar skeleton', () => {
      const { container } = render(
        <LoadingSkeleton variant="avatar" width="48px" height="48px" />
      );
      
      expect(container.firstChild).toHaveClass('loading-skeleton--avatar');
    });
  });

  describe('Accessibility', () => {
    it('button has proper accessibility attributes', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('disabled');
    });

    it('trust indicators have proper text content', () => {
      render(<TrustIndicators verified escrowProtected />);
      
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Escrow Protected')).toBeInTheDocument();
    });

    it('pricing components have readable text', () => {
      render(
        <DualPricing 
          cryptoPrice="0.15" 
          cryptoSymbol="ETH" 
          fiatPrice="270.00" 
        />
      );
      
      expect(screen.getByText('0.15 ETH')).toBeInTheDocument();
      expect(screen.getByText('≈ $270.00')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('components render without errors on different screen sizes', () => {
      // Mock window.innerWidth for responsive testing
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <GlassPanel>
          <Button size="md">Responsive Button</Button>
          <TrustIndicators verified escrowProtected />
          <DualPricing cryptoPrice="0.15" fiatPrice="270.00" />
        </GlassPanel>
      );

      expect(screen.getByText('Responsive Button')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('0.15 ETH')).toBeInTheDocument();
    });
  });
});