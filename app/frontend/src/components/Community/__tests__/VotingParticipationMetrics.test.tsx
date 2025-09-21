import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VotingParticipationMetrics from '../VotingParticipationMetrics';
import { governanceService } from '../../../services/governanceService';
import { ParticipationMetrics } from '../../../types/governance';
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

// Mock the governance service
jest.mock('../../../services/governanceService', () => ({
  governanceService: {
    getParticipationMetrics: jest.fn(),
    getHistoricalParticipation: jest.fn(),
  },
}));

const mockGovernanceService = governanceService as jest.Mocked<typeof governanceService>;

const mockParticipationMetrics: ParticipationMetrics = {
  currentParticipationRate: 75.5,
  eligibleVoters: 1250,
  totalVoters: 944,
  userVotingWeight: 250.5,
  userVotingWeightPercentage: 0.501,
  historicalParticipationRate: 72.3,
  participationTrend: 'increasing',
  quorumProgress: 85.2,
  averageParticipationRate: 72.3,
};

const mockHistoricalData = {
  periods: [
    { period: 'Month 1', participationRate: 68.5, totalProposals: 3, avgVotingPower: 150.2 },
    { period: 'Month 2', participationRate: 72.1, totalProposals: 4, avgVotingPower: 165.8 },
    { period: 'Month 3', participationRate: 75.5, totalProposals: 2, avgVotingPower: 180.3 },
  ],
  trend: 'increasing' as const,
};

describe('VotingParticipationMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGovernanceService.getParticipationMetrics.mockResolvedValue(mockParticipationMetrics);
    mockGovernanceService.getHistoricalParticipation.mockResolvedValue(mockHistoricalData);
  });

  describe('Requirement 18.1: Display current participation rates for active proposals', () => {
    it('should display current participation rate with proper formatting', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
        />
      );

      expect(screen.getByText('Current Participation')).toBeInTheDocument();
      expect(screen.getByText('75.5%')).toBeInTheDocument();
      expect(screen.getByText('944 voters')).toBeInTheDocument();
      expect(screen.getByText('1,250 eligible')).toBeInTheDocument();
    });

    it('should show participation trend indicator', async () => {
      const { container } = render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
        />
      );

      // Should show increasing trend icon (upward arrow)
      const trendIcon = container.querySelector('svg.text-green-500');
      expect(trendIcon).toBeInTheDocument();
    });

    it('should display participation rate with appropriate color coding', async () => {
      const highParticipationMetrics = {
        ...mockParticipationMetrics,
        currentParticipationRate: 85.0,
      };

      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={highParticipationMetrics}
        />
      );

      const participationText = screen.getByText('85.0%');
      expect(participationText).toHaveClass('text-green-600');
    });

    it('should fetch participation metrics when not provided', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          userAddress="0x123"
        />
      );

      await waitFor(() => {
        expect(mockGovernanceService.getParticipationMetrics).toHaveBeenCalledWith(
          'test-community',
          '0x123'
        );
      });
    });
  });

  describe('Requirement 18.2: Show user voting weight based on token holdings', () => {
    it('should display user voting weight when user address is provided', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          userAddress="0x123"
          participationMetrics={mockParticipationMetrics}
        />
      );

      expect(screen.getByText('Your Voting Weight')).toBeInTheDocument();
      expect(screen.getByText('0.501%')).toBeInTheDocument();
      expect(screen.getByText('250.50 voting power')).toBeInTheDocument();
    });

    it('should not display user voting weight when no user address provided', async () => {
      const metricsWithoutUser = {
        ...mockParticipationMetrics,
        userVotingWeight: 0,
      };

      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={metricsWithoutUser}
        />
      );

      expect(screen.queryByText('Your Voting Weight')).not.toBeInTheDocument();
    });

    it('should display voting weight progress bar correctly', async () => {
      const { container } = render(
        <VotingParticipationMetrics
          communityId="test-community"
          userAddress="0x123"
          participationMetrics={mockParticipationMetrics}
        />
      );

      const progressBar = container.querySelector('.bg-blue-500');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle({ width: '5.01%' }); // 0.501% * 10 for visibility
    });
  });

  describe('Requirement 18.3: Add percentage display of eligible voters who have participated', () => {
    it('should display eligible voters count and percentage', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
        />
      );

      expect(screen.getByText('944 voters')).toBeInTheDocument();
      expect(screen.getByText('1,250 eligible')).toBeInTheDocument();
      
      // Calculate expected percentage: (944 / 1250) * 100 = 75.52%
      expect(screen.getByText('75.5%')).toBeInTheDocument();
    });

    it('should show quorum progress with eligible voter context', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
        />
      );

      expect(screen.getByText('Quorum Progress')).toBeInTheDocument();
      expect(screen.getByText('85.2%')).toBeInTheDocument();
    });

    it('should calculate participation rate correctly', async () => {
      const customMetrics = {
        ...mockParticipationMetrics,
        totalVoters: 500,
        eligibleVoters: 1000,
        currentParticipationRate: 50.0,
      };

      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={customMetrics}
        />
      );

      expect(screen.getByText('50.0%')).toBeInTheDocument();
      expect(screen.getByText('500 voters')).toBeInTheDocument();
      expect(screen.getByText('1,000 eligible')).toBeInTheDocument();
    });
  });

  describe('Requirement 18.4: Implement historical participation data for inactive governance', () => {
    it('should display historical participation data when showHistoricalData is true', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
          showHistoricalData={true}
        />
      );

      // Click show details to reveal historical data
      fireEvent.click(screen.getByText('Show Details'));

      await waitFor(() => {
        expect(screen.getByText('Recent Trends')).toBeInTheDocument();
        expect(screen.getByText('Month 1')).toBeInTheDocument();
        expect(screen.getByText('Month 2')).toBeInTheDocument();
        expect(screen.getByText('Month 3')).toBeInTheDocument();
      });
    });

    it('should show historical comparison with current rate', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
        />
      );

      fireEvent.click(screen.getByText('Show Details'));

      await waitFor(() => {
        expect(screen.getByText('vs. Historical Avg')).toBeInTheDocument();
        expect(screen.getAllByText('72.3%')).toHaveLength(2); // Historical avg and community average
        expect(screen.getByText(/\+3\.2%/)).toBeInTheDocument(); // 75.5 - 72.3 = 3.2
      });
    });

    it('should display community average participation rate', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
        />
      );

      fireEvent.click(screen.getByText('Show Details'));

      await waitFor(() => {
        expect(screen.getByText('Community Average')).toBeInTheDocument();
        expect(screen.getAllByText('72.3%')).toHaveLength(2); // Historical avg and community average
      });
    });

    it('should fetch historical data when showHistoricalData is enabled', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
          showHistoricalData={true}
        />
      );

      await waitFor(() => {
        expect(mockGovernanceService.getHistoricalParticipation).toHaveBeenCalledWith(
          'test-community',
          'month'
        );
      });
    });

    it('should show trend indicator for historical data', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
          showHistoricalData={true}
        />
      );

      fireEvent.click(screen.getByText('Show Details'));

      await waitFor(() => {
        expect(screen.getByText('increasing')).toBeInTheDocument();
      });
    });
  });

  describe('Interactive Features', () => {
    it('should toggle details visibility when clicking show/hide details', async () => {
      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
        />
      );

      const toggleButton = screen.getByText('Show Details');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Hide Details')).toBeInTheDocument();
        expect(screen.getByText('vs. Historical Avg')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Hide Details'));

      await waitFor(() => {
        expect(screen.getByText('Show Details')).toBeInTheDocument();
        expect(screen.queryByText('vs. Historical Avg')).not.toBeInTheDocument();
      });
    });

    it('should handle loading state correctly', async () => {
      mockGovernanceService.getParticipationMetrics.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockParticipationMetrics), 100))
      );

      const { container } = render(
        <VotingParticipationMetrics
          communityId="test-community"
          userAddress="0x123"
        />
      );

      // Should show loading skeleton
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Current Participation')).toBeInTheDocument();
      });
    });

    it('should handle error state correctly', async () => {
      mockGovernanceService.getParticipationMetrics.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <VotingParticipationMetrics
          communityId="test-community"
          userAddress="0x123"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load participation metrics')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should use appropriate colors for different participation rates', async () => {
      const lowParticipationMetrics = {
        ...mockParticipationMetrics,
        currentParticipationRate: 45.0,
      };

      render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={lowParticipationMetrics}
        />
      );

      const participationText = screen.getByText('45.0%');
      expect(participationText).toHaveClass('text-red-600');
    });

    it('should show correct progress bar colors based on participation rate', async () => {
      const { container } = render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={mockParticipationMetrics}
        />
      );

      const progressBar = container.querySelector('.bg-yellow-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display quorum progress with appropriate color when reached', async () => {
      const quorumReachedMetrics = {
        ...mockParticipationMetrics,
        quorumProgress: 100.0,
      };

      const { container } = render(
        <VotingParticipationMetrics
          communityId="test-community"
          participationMetrics={quorumReachedMetrics}
        />
      );

      const quorumBar = container.querySelector('.bg-green-500');
      expect(quorumBar).toBeInTheDocument();
    });
  });
});