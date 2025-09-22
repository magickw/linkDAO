/**
 * DeFiProtocolPreview Component Tests
 * 
 * Tests for DeFi protocol preview component including yield charts, APY display,
 * risk indicators, TVL metrics, quick actions, and real-time updates.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeFiProtocolPreview from '../DeFiProtocolPreview';
import { DeFiPreview } from '../../../../../types/communityEnhancements';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock data
const mockDeFiPreview: DeFiPreview = {
  protocol: 'Compound Finance',
  apy: 8.45,
  tvl: 12500000000, // $12.5B
  riskLevel: 'low',
  yields: {
    current: 8.45,
    historical: [8.2, 8.3, 8.1, 8.4, 8.5, 8.3, 8.45]
  }
};

const mockHighRiskDeFi: DeFiPreview = {
  protocol: 'New Protocol',
  apy: 25.67,
  tvl: 50000000, // $50M
  riskLevel: 'high',
  yields: {
    current: 25.67,
    historical: [24.1, 25.2, 26.3, 24.8, 25.9, 25.1, 25.67]
  }
};

// Mock functions
const mockOnInteract = jest.fn();
const mockOnExpand = jest.fn();

describe('DeFiProtocolPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders protocol name and basic information', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      expect(screen.getByText('Compound Finance')).toBeInTheDocument();
      expect(screen.getByText('8.45%')).toBeInTheDocument();
      expect(screen.getByText('APY')).toBeInTheDocument();
    });

    it('displays TVL and current yield metrics', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      expect(screen.getByText('Total Value Locked')).toBeInTheDocument();
      expect(screen.getByText('$12.5B')).toBeInTheDocument();
      expect(screen.getByText('Current Yield')).toBeInTheDocument();
    });

    it('shows risk level badge with appropriate styling', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      const riskBadge = screen.getByText('Low Risk');
      expect(riskBadge).toBeInTheDocument();
      expect(riskBadge.closest('div')).toHaveAttribute('title', 'Established protocol with strong security record');
    });

    it('renders high risk protocol with appropriate styling', () => {
      render(<DeFiProtocolPreview defi={mockHighRiskDeFi} />);

      const riskBadge = screen.getByText('High Risk');
      expect(riskBadge).toBeInTheDocument();
      expect(riskBadge.closest('div')).toHaveAttribute('title', 'Higher risk, newer protocol or experimental features');
    });
  });

  describe('Chart Visualization', () => {
    it('renders mini chart for historical yields', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      const svg = document.querySelector('svg'); // SVG elements
      expect(svg).toBeInTheDocument();
    });

    it('does not render chart in compact mode', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} compact />);

      const svg = document.querySelector('svg');
      expect(svg).not.toBeInTheDocument();
    });

    it('shows yield trend indicator', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      // Should show trend indicator (up, down, or stable)
      expect(screen.getByText(/Rising|Falling|Stable/)).toBeInTheDocument();
    });
  });

  describe('User Position Display', () => {
    it('shows user staked amount when provided', () => {
      render(
        <DeFiProtocolPreview
          defi={mockDeFiPreview}
          userStaked={5000}
        />
      );

      expect(screen.getByText('Your Stake')).toBeInTheDocument();
      expect(screen.getByText('$5.00K')).toBeInTheDocument();
    });

    it('shows user rewards when available', () => {
      render(
        <DeFiProtocolPreview
          defi={mockDeFiPreview}
          userRewards={250}
        />
      );

      expect(screen.getByText('Rewards')).toBeInTheDocument();
      expect(screen.getByText('$250.00')).toBeInTheDocument();
    });

    it('shows additional action buttons for users with positions', () => {
      render(
        <DeFiProtocolPreview
          defi={mockDeFiPreview}
          userStaked={5000}
          userRewards={250}
          onInteract={mockOnInteract}
        />
      );

      expect(screen.getByLabelText(`Unstake from ${mockDeFiPreview.protocol}`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Claim rewards from ${mockDeFiPreview.protocol}`)).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('renders default quick action buttons', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} onInteract={mockOnInteract} />);

      expect(screen.getByLabelText(`Stake in ${mockDeFiPreview.protocol}`)).toBeInTheDocument();
      expect(screen.getByLabelText(`View ${mockDeFiPreview.protocol} details`)).toBeInTheDocument();
    });

    it('does not render quick actions when disabled', () => {
      render(
        <DeFiProtocolPreview
          defi={mockDeFiPreview}
          onInteract={mockOnInteract}
          showQuickActions={false}
        />
      );

      expect(screen.queryByLabelText(`Stake in ${mockDeFiPreview.protocol}`)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(`View ${mockDeFiPreview.protocol} details`)).not.toBeInTheDocument();
    });

    it('calls onInteract when stake button is clicked', async () => {
      const user = userEvent.setup();
      render(<DeFiProtocolPreview defi={mockDeFiPreview} onInteract={mockOnInteract} />);

      const stakeButton = screen.getByLabelText(`Stake in ${mockDeFiPreview.protocol}`);
      await user.click(stakeButton);

      expect(mockOnInteract).toHaveBeenCalledWith(mockDeFiPreview.protocol, 'stake');
    });

    it('calls onInteract when view details button is clicked', async () => {
      const user = userEvent.setup();
      render(<DeFiProtocolPreview defi={mockDeFiPreview} onInteract={mockOnInteract} />);

      const viewButton = screen.getByLabelText(`View ${mockDeFiPreview.protocol} details`);
      await user.click(viewButton);

      expect(mockOnInteract).toHaveBeenCalledWith(mockDeFiPreview.protocol, 'view');
    });

    it('prevents event propagation on button clicks', async () => {
      const user = userEvent.setup();
      render(
        <DeFiProtocolPreview
          defi={mockDeFiPreview}
          onInteract={mockOnInteract}
          onExpand={mockOnExpand}
        />
      );

      const stakeButton = screen.getByLabelText(`Stake in ${mockDeFiPreview.protocol}`);
      await user.click(stakeButton);

      expect(mockOnInteract).toHaveBeenCalledWith(mockDeFiPreview.protocol, 'stake');
      expect(mockOnExpand).not.toHaveBeenCalled();
    });
  });

  describe('Expand Functionality', () => {
    it('calls onExpand when card is clicked', async () => {
      const user = userEvent.setup();
      render(<DeFiProtocolPreview defi={mockDeFiPreview} onExpand={mockOnExpand} />);

      const card = screen.getByRole('button');
      await user.click(card);

      expect(mockOnExpand).toHaveBeenCalledWith(mockDeFiPreview);
    });

    it('supports keyboard navigation for expand', async () => {
      const user = userEvent.setup();
      render(<DeFiProtocolPreview defi={mockDeFiPreview} onExpand={mockOnExpand} />);

      const card = screen.getByRole('button', { name: /DeFi protocol: Compound Finance/ });
      card.focus();
      await user.keyboard('{Enter}');

      expect(mockOnExpand).toHaveBeenCalledWith(mockDeFiPreview);
    });

    it('shows expand indicator on hover', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} onExpand={mockOnExpand} />);

      const expandIcon = document.querySelector('.absolute.top-2.right-2 svg');
      expect(expandIcon).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading overlay when isLoading is true', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} isLoading />);

      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('disables interactions when loading', async () => {
      const user = userEvent.setup();
      render(
        <DeFiProtocolPreview
          defi={mockDeFiPreview}
          onInteract={mockOnInteract}
          onExpand={mockOnExpand}
          isLoading
        />
      );

      const stakeButton = screen.getByLabelText(`Stake in ${mockDeFiPreview.protocol}`);
      expect(stakeButton).toBeDisabled();

      const card = screen.getByRole('button', { name: /DeFi protocol: Compound Finance/ });
      await user.click(card);

      expect(mockOnExpand).not.toHaveBeenCalled();
    });

    it('shows loading state in buttons during interaction', async () => {
      const user = userEvent.setup();

      // Mock a slow interaction
      const slowOnInteract = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <DeFiProtocolPreview
          defi={mockDeFiPreview}
          onInteract={slowOnInteract}
        />
      );

      const stakeButton = screen.getByLabelText(`Stake in ${mockDeFiPreview.protocol}`);
      await user.click(stakeButton);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(stakeButton).toBeDisabled();
    });
  });

  describe('Real-time Updates', () => {
    it('updates yield values over time', async () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      const initialYieldElements = screen.getAllByText('8.45%');
      expect(initialYieldElements.length).toBeGreaterThan(0);

      // The yield should be displayed
      await waitFor(() => {
        const yieldElements = screen.getAllByText(/\d+\.\d+%/);
        expect(yieldElements.length).toBeGreaterThan(0);
      });
    });

    it('updates chart data with new yield values', async () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      // Chart should be present
      await waitFor(() => {
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides comprehensive screen reader information', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      const srInfo = screen.getByText(/DeFi protocol: Compound Finance/);
      expect(srInfo).toBeInTheDocument();
      expect(srInfo).toHaveClass('sr-only');
    });

    it('includes proper ARIA labels for interactive elements', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} onInteract={mockOnInteract} />);

      const stakeButton = screen.getByLabelText(`Stake in ${mockDeFiPreview.protocol}`);
      const viewButton = screen.getByLabelText(`View ${mockDeFiPreview.protocol} details`);

      expect(stakeButton).toBeInTheDocument();
      expect(viewButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <DeFiProtocolPreview
          defi={mockDeFiPreview}
          onInteract={mockOnInteract}
          onExpand={mockOnExpand}
        />
      );

      // Tab through interactive elements
      await user.tab();
      const expandButton = screen.getByRole('button', { name: /DeFi protocol: Compound Finance/ });
      expect(expandButton).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(`Stake in ${mockDeFiPreview.protocol}`)).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('applies compact styling when compact prop is true', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} compact />);

      const card = screen.getByRole('article');
      expect(card).toHaveClass('max-w-xs');
    });

    it('applies custom className when provided', () => {
      const customClass = 'custom-defi-preview';
      render(<DeFiProtocolPreview defi={mockDeFiPreview} className={customClass} />);

      const card = screen.getByRole('article');
      expect(card).toHaveClass(customClass);
    });
  });

  describe('Number Formatting', () => {
    it('formats large TVL numbers correctly', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      expect(screen.getByText('$12.5B')).toBeInTheDocument();
    });

    it('formats medium numbers with K suffix', () => {
      const mediumTvlDefi = { ...mockDeFiPreview, tvl: 1500000 };
      render(<DeFiProtocolPreview defi={mediumTvlDefi} />);

      expect(screen.getByText('$1.5M')).toBeInTheDocument();
    });

    it('formats percentages with two decimal places', () => {
      render(<DeFiProtocolPreview defi={mockDeFiPreview} />);

      const percentageElements = screen.getAllByText('8.45%');
      expect(percentageElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles missing historical data gracefully', () => {
      const noHistoryDefi = {
        ...mockDeFiPreview,
        yields: { current: 8.45, historical: [] }
      };

      expect(() => {
        render(<DeFiProtocolPreview defi={noHistoryDefi} />);
      }).not.toThrow();
    });

    it('handles interaction errors gracefully', async () => {
      const user = userEvent.setup();
      const errorOnInteract = jest.fn().mockRejectedValue(new Error('Network error'));

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

      render(
        <DeFiProtocolPreview
          defi={mockDeFiPreview}
          onInteract={errorOnInteract}
        />
      );

      const stakeButton = screen.getByLabelText(`Stake in ${mockDeFiPreview.protocol}`);
      await user.click(stakeButton);

      // Should not crash and should re-enable button
      await waitFor(() => {
        expect(stakeButton).not.toBeDisabled();
      });

      consoleSpy.mockRestore();
    });
  });
});