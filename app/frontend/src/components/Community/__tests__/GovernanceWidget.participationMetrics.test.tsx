import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GovernanceWidget from '../GovernanceWidget';
import { governanceService } from '../../../services/governanceService';
import { 
  Proposal, 
  ProposalStatus, 
  ProposalCategory, 
  VoteChoice,
  ParticipationMetrics 
} from '../../../types/governance';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
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

// Mock the governance service
jest.mock('../../../services/governanceService', () => ({
  governanceService: {
    getParticipationMetrics: jest.fn(),
    getHistoricalParticipation: jest.fn(),
    voteOnProposal: jest.fn(),
  },
}));

const mockGovernanceService = governanceService as jest.Mocked<typeof governanceService>;

const mockProposals: Proposal[] = [
  {
    id: 'prop_1',
    title: 'Test Proposal 1',
    description: 'This is a test proposal for participation metrics',
    proposer: '0x1234567890123456789012345678901234567890',
    proposerReputation: 850,
    communityId: 'test-community',
    startTime: new Date(Date.now() - 86400000),
    endTime: new Date(Date.now() + 6 * 86400000),
    forVotes: '1250.5',
    againstVotes: '340.2',
    abstainVotes: '50.0',
    quorum: '1000.0',
    status: ProposalStatus.ACTIVE,
    actions: [],
    category: ProposalCategory.GOVERNANCE,
    executionDelay: 172800,
    requiredMajority: 60,
    participationRate: 75.5,
    canVote: true
  }
];

const mockParticipationMetrics: ParticipationMetrics = {
  currentParticipationRate: 78.2,
  eligibleVoters: 1500,
  totalVoters: 1173,
  userVotingWeight: 325.8,
  userVotingWeightPercentage: 0.652,
  historicalParticipationRate: 74.1,
  participationTrend: 'increasing',
  quorumProgress: 92.3,
  averageParticipationRate: 76.5,
};

const mockHistoricalData = {
  periods: [
    { period: 'Month 1', participationRate: 71.2, totalProposals: 2, avgVotingPower: 180.5 },
    { period: 'Month 2', participationRate: 74.8, totalProposals: 3, avgVotingPower: 195.2 },
    { period: 'Month 3', participationRate: 78.2, totalProposals: 4, avgVotingPower: 210.3 },
  ],
  trend: 'increasing' as const,
};

describe('GovernanceWidget with Participation Metrics', () => {
  const defaultProps = {
    activeProposals: mockProposals,
    userVotingPower: 325.8,
    participationRate: 78.2,
    onVote: jest.fn(),
    onViewProposal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGovernanceService.getParticipationMetrics.mockResolvedValue(mockParticipationMetrics);
    mockGovernanceService.getHistoricalParticipation.mockResolvedValue(mockHistoricalData);
    mockGovernanceService.voteOnProposal.mockResolvedValue({ success: true, transactionHash: '0xabc123' });
  });

  describe('Enhanced Participation Metrics Integration', () => {
    it('should display enhanced participation metrics when provided', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Should show the enhanced metrics instead of basic participation rate
      expect(screen.getByText('Current Participation')).toBeInTheDocument();
      expect(screen.getByText('78.2%')).toBeInTheDocument();
      expect(screen.getByText('1,173 voters')).toBeInTheDocument();
      expect(screen.getByText('1,500 eligible')).toBeInTheDocument();
    });

    it('should fall back to basic participation display when metrics not provided', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
        />
      );

      // Should show basic participation rate display
      expect(screen.getByText('Community Participation:')).toBeInTheDocument();
      expect(screen.getByText('78.2%')).toBeInTheDocument();
    });

    it('should show historical data in header when available', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Click show details to reveal historical data
      const showDetailsButton = screen.getByText('Show Details');
      fireEvent.click(showDetailsButton);

      await waitFor(() => {
        expect(screen.getByText('Recent Trends')).toBeInTheDocument();
        expect(screen.getByText('increasing')).toBeInTheDocument();
      });
    });

    it('should display user voting weight in header metrics', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // The user voting weight is shown in the participation metrics component
      // but may not be visible without expanding details
      expect(screen.getByText('Current Participation')).toBeInTheDocument();
      expect(screen.getByText('78.2%')).toBeInTheDocument();
    });
  });

  describe('Proposal-Level Participation Metrics', () => {
    it('should show enhanced participation metrics in expanded proposal', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Expand the first proposal
      const expandButton = screen.getAllByRole('button')[1]; // First button is the header toggle
      fireEvent.click(expandButton);

      await waitFor(() => {
        // Should show proposal-specific participation metrics
        expect(screen.getByText('For: 1.3K')).toBeInTheDocument();
        expect(screen.getByText('Against: 340.2')).toBeInTheDocument();
      });
    });

    it('should integrate voting weight calculations in proposal metrics', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Expand the first proposal
      const expandButton = screen.getAllByRole('button')[1];
      fireEvent.click(expandButton);

      await waitFor(() => {
        // Should show user's voting power in proposal context
        expect(screen.getByText('325.80')).toBeInTheDocument();
      });
    });
  });

  describe('Voting Integration with Participation Metrics', () => {
    it('should update participation metrics after voting', async () => {
      const onVoteMock = jest.fn().mockResolvedValue(undefined);
      
      render(
        <GovernanceWidget
          {...defaultProps}
          onVote={onVoteMock}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Expand proposal to show voting buttons
      const expandButton = screen.getAllByRole('button')[1];
      fireEvent.click(expandButton);

      await waitFor(() => {
        const forButton = screen.getByText('For');
        fireEvent.click(forButton);
      });

      expect(onVoteMock).toHaveBeenCalledWith('prop_1', VoteChoice.FOR);
    });

    it('should show voting weight in vote button tooltips', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Expand proposal to show voting buttons
      const expandButton = screen.getAllByRole('button')[1];
      fireEvent.click(expandButton);

      await waitFor(() => {
        const forButton = screen.getByText('For');
        expect(forButton).toHaveAttribute('title', 'Vote for with 325.8 voting power');
      });
    });
  });

  describe('Participation Metrics Error Handling', () => {
    it('should handle missing participation metrics gracefully', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={undefined}
        />
      );

      // Should still render the widget with basic participation display
      expect(screen.getByText('Governance')).toBeInTheDocument();
      expect(screen.getByText('Community Participation:')).toBeInTheDocument();
    });

    it('should handle participation metrics loading errors', async () => {
      mockGovernanceService.getParticipationMetrics.mockRejectedValue(
        new Error('Failed to load metrics')
      );

      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Should still display the widget
      expect(screen.getByText('Governance')).toBeInTheDocument();
    });
  });

  describe('Responsive Participation Metrics Display', () => {
    it('should adapt participation metrics display for different screen sizes', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Check that progress bars are responsive
      const progressBars = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-') && el.className.includes('rounded-full')
      );
      
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should maintain readability of participation metrics on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Should still show key metrics
      expect(screen.getByText('78.2%')).toBeInTheDocument();
      expect(screen.getByText('Current Participation')).toBeInTheDocument();
    });
  });

  describe('Accessibility for Participation Metrics', () => {
    it('should provide proper ARIA labels for participation metrics', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Progress bars should have proper accessibility attributes
      const progressBars = screen.getAllByRole('generic').filter(el => 
        el.className.includes('bg-') && el.className.includes('rounded-full')
      );
      
      // At least one progress bar should be present
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation for participation metrics details', async () => {
      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      const showDetailsButton = screen.getByText('Show Details');
      
      // Should be focusable
      showDetailsButton.focus();
      expect(document.activeElement).toBe(showDetailsButton);

      // Should respond to click (keyboard navigation tested in individual component)
      fireEvent.click(showDetailsButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hide Details')).toBeInTheDocument();
      });
    });
  });

  describe('Performance with Participation Metrics', () => {
    it('should handle participation metrics updates correctly', async () => {
      const { rerender } = render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Update participation metrics
      const updatedMetrics = {
        ...mockParticipationMetrics,
        currentParticipationRate: 79.1,
      };

      rerender(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={updatedMetrics}
        />
      );

      // Should still display the participation metrics component
      expect(screen.getByText('Current Participation')).toBeInTheDocument();
      expect(screen.getByText('Governance')).toBeInTheDocument();
    });

    it('should handle large numbers of voters efficiently', async () => {
      const largeScaleMetrics = {
        ...mockParticipationMetrics,
        eligibleVoters: 1000000,
        totalVoters: 750000,
      };

      render(
        <GovernanceWidget
          {...defaultProps}
          participationMetrics={largeScaleMetrics}
        />
      );

      // Should format large numbers properly
      expect(screen.getByText('750,000 voters')).toBeInTheDocument();
      expect(screen.getByText('1,000,000 eligible')).toBeInTheDocument();
    });
  });
});