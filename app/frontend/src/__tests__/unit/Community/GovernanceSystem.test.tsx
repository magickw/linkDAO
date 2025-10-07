/**
 * Unit Tests for GovernanceSystem Component
 * Tests governance functionality, proposal management, and voting
 * Requirements: 2.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GovernanceSystem } from '../../../components/Community/GovernanceSystem';
import { testUtils } from '../../setup/testSetup';

// Mock dependencies
global.fetch = jest.fn();

describe('GovernanceSystem Component', () => {
  const mockProposals = [
    {
      id: 'proposal-1',
      title: 'Update Community Rules',
      description: 'Proposal to update the community rules to be more inclusive and clear about acceptable behavior.',
      type: 'rule_change' as const,
      proposer: {
        address: '0x1234567890123456789012345678901234567890',
        ensName: 'proposer.eth',
        reputation: 500
      },
      status: 'active' as const,
      votingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date('2023-12-01'),
      votes: {
        yes: 45,
        no: 12,
        abstain: 3,
        total: 60
      },
      requiredQuorum: 100,
      requiredMajority: 0.6,
      stakingRequired: false
    },
    {
      id: 'proposal-2',
      title: 'Elect New Moderator',
      description: 'Proposal to elect a new moderator for the community.',
      type: 'moderator_election' as const,
      proposer: {
        address: '0x9876543210987654321098765432109876543210',
        reputation: 750
      },
      status: 'passed' as const,
      votingDeadline: new Date('2023-11-30'),
      createdAt: new Date('2023-11-15'),
      votes: {
        yes: 85,
        no: 15,
        abstain: 5,
        total: 105
      },
      requiredQuorum: 100,
      requiredMajority: 0.6,
      stakingRequired: true,
      minimumStake: 100
    }
  ];

  const mockGovernanceStats = {
    totalProposals: 25,
    activeProposals: 3,
    passedProposals: 18,
    rejectedProposals: 4,
    participationRate: 0.65,
    averageVotingPower: 150,
    userVotingPower: 200
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default fetch responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/governance?')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ proposals: mockProposals })
        });
      }
      if (url.includes('/governance/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGovernanceStats)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render governance system with stats', async () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      expect(screen.getByText('Community Governance')).toBeInTheDocument();
      expect(screen.getByText('Participate in community decision-making through proposals and voting')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Active proposals
        expect(screen.getByText('25')).toBeInTheDocument(); // Total proposals
        expect(screen.getByText('65%')).toBeInTheDocument(); // Participation rate
        expect(screen.getByText('200')).toBeInTheDocument(); // User voting power
      });
    });

    it('should show create proposal button for authorized users', () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      expect(screen.getByText('📝 Create Proposal')).toBeInTheDocument();
    });

    it('should hide create proposal button for unauthorized users', () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={false}
          userVotingPower={0}
        />
      );

      expect(screen.queryByText('📝 Create Proposal')).not.toBeInTheDocument();
    });

    it('should render navigation tabs with counts', async () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🔄 Active (3)')).toBeInTheDocument();
        expect(screen.getByText('✅ Passed (18)')).toBeInTheDocument();
        expect(screen.getByText('❌ Rejected (4)')).toBeInTheDocument();
        expect(screen.getByText('📋 All')).toBeInTheDocument();
      });
    });
  });

  describe('Proposal Display', () => {
    it('should display proposals correctly', async () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        // Check first proposal
        expect(screen.getByText('Update Community Rules')).toBeInTheDocument();
        expect(screen.getByText('proposer.eth')).toBeInTheDocument();
        expect(screen.getByText('(500 rep)')).toBeInTheDocument();
        expect(screen.getByText('📋 Rule Change')).toBeInTheDocument();
        expect(screen.getByText('🔄 active')).toBeInTheDocument();

        // Check second proposal
        expect(screen.getByText('Elect New Moderator')).toBeInTheDocument();
        expect(screen.getByText('🗳️ Moderator Election')).toBeInTheDocument();
        expect(screen.getByText('✅ passed')).toBeInTheDocument();
      });
    });

    it('should show voting progress correctly', async () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        // Check voting counts
        expect(screen.getByText('60 votes')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument(); // Yes votes
        expect(screen.getByText('12')).toBeInTheDocument(); // No votes

        // Check percentages
        expect(screen.getByText('Yes (75%)')).toBeInTheDocument();
        expect(screen.getByText('No (20%)')).toBeInTheDocument();

        // Check quorum progress
        expect(screen.getByText('Quorum: 60%')).toBeInTheDocument();
        expect(screen.getByText('(60/100)')).toBeInTheDocument();
      });
    });

    it('should show time remaining for active proposals', async () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/\d+d \d+h remaining/)).toBeInTheDocument();
      });
    });

    it('should truncate long descriptions', async () => {
      const longProposal = {
        ...mockProposals[0],
        description: 'This is a very long proposal description that should be truncated when displayed in the governance interface because it exceeds the maximum length limit that we have set for preview purposes in the interface design and user experience considerations.'
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/governance?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ proposals: [longProposal] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGovernanceStats)
        });
      });

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/This is a very long proposal description.*\.\.\./)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs and load different proposals', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('status=passed')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              proposals: mockProposals.filter(p => p.status === 'passed') 
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ proposals: mockProposals })
        });
      });

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      // Switch to passed tab
      const passedTab = await screen.findByText('✅ Passed (18)');
      await user.click(passedTab);

      expect(passedTab).toHaveClass('active');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=passed'),
          undefined
        );
      });
    });

    it('should maintain active tab state', async () => {
      const user = userEvent.setup();
      
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      // Default active tab
      await waitFor(() => {
        expect(screen.getByText('🔄 Active (3)')).toHaveClass('active');
      });

      // Switch to rejected tab
      const rejectedTab = screen.getByText('❌ Rejected (4)');
      await user.click(rejectedTab);

      expect(rejectedTab).toHaveClass('active');
      expect(screen.getByText('🔄 Active (3)')).not.toHaveClass('active');
    });
  });

  describe('Voting Functionality', () => {
    it('should show vote button for active proposals when user has voting power', async () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🗳️ Vote')).toBeInTheDocument();
      });
    });

    it('should hide vote button when user has no voting power', async () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={0}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('🗳️ Vote')).not.toBeInTheDocument();
      });
    });

    it('should hide vote button when user already voted', async () => {
      const votedProposal = { ...mockProposals[0], userVote: 'yes' as const };
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/governance?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ proposals: [votedProposal] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGovernanceStats)
        });
      });

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('You voted: YES')).toBeInTheDocument();
        expect(screen.queryByText('🗳️ Vote')).not.toBeInTheDocument();
      });
    });

    it('should open vote modal when vote button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('🗳️ Vote')).toBeInTheDocument();
      });

      const voteButton = screen.getByText('🗳️ Vote');
      await user.click(voteButton);

      expect(screen.getByText('Cast Your Vote')).toBeInTheDocument();
      expect(screen.getByText('Update Community Rules')).toBeInTheDocument();
      expect(screen.getByText('Your Voting Power: 200')).toBeInTheDocument();
      expect(screen.getByText('✅ Vote Yes')).toBeInTheDocument();
      expect(screen.getByText('❌ Vote No')).toBeInTheDocument();
      expect(screen.getByText('⚪ Abstain')).toBeInTheDocument();
    });

    it('should submit vote correctly', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes('/vote') && options?.method === 'POST') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ proposals: mockProposals })
        });
      });

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      // Open vote modal
      const voteButton = await screen.findByText('🗳️ Vote');
      await user.click(voteButton);

      // Cast yes vote
      const yesButton = screen.getByText('✅ Vote Yes');
      await user.click(yesButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/governance/proposal-1/vote'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ vote: 'yes' })
          })
        );
      });

      // Modal should close
      expect(screen.queryByText('Cast Your Vote')).not.toBeInTheDocument();
    });

    it('should update vote counts after voting', async () => {
      const user = userEvent.setup();
      
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      // Initial vote count
      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument(); // Yes votes
      });

      // Open vote modal and vote
      const voteButton = screen.getByText('🗳️ Vote');
      await user.click(voteButton);

      const yesButton = screen.getByText('✅ Vote Yes');
      await user.click(yesButton);

      // Vote count should update
      await waitFor(() => {
        expect(screen.getByText('46')).toBeInTheDocument(); // Updated yes votes
      });
    });

    it('should close modal when close button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      // Open vote modal
      const voteButton = await screen.findByText('🗳️ Vote');
      await user.click(voteButton);

      expect(screen.getByText('Cast Your Vote')).toBeInTheDocument();

      // Close modal
      const closeButton = screen.getByText('✕');
      await user.click(closeButton);

      expect(screen.queryByText('Cast Your Vote')).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no proposals', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/governance?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ proposals: [] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGovernanceStats)
        });
      });

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No proposals found')).toBeInTheDocument();
        expect(screen.getByText('No active proposals at the moment')).toBeInTheDocument();
      });
    });

    it('should show create first proposal button in empty state', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/governance?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ proposals: [] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGovernanceStats)
        });
      });

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create First Proposal')).toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      expect(screen.getByText('Loading proposals...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load proposals')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should handle voting errors', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes('/vote') && options?.method === 'POST') {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ proposals: mockProposals })
        });
      });

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      // Open vote modal and try to vote
      const voteButton = await screen.findByText('🗳️ Vote');
      await user.click(voteButton);

      const yesButton = screen.getByText('✅ Vote Yes');
      await user.click(yesButton);

      // Vote counts should not change on error
      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument(); // Original yes votes
      });
    });

    it('should retry loading on error', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementation((url: string) => {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ proposals: mockProposals })
          });
        });

      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Update Community Rules')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render efficiently with many proposals', async () => {
      const manyProposals = Array.from({ length: 20 }, (_, i) => ({
        ...mockProposals[0],
        id: `proposal-${i}`,
        title: `Proposal ${i}`
      }));

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/governance?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ proposals: manyProposals })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGovernanceStats)
        });
      });

      const renderTime = await testUtils.measureRenderTime(() => {
        render(
          <GovernanceSystem 
            communityId="test-community-1" 
            canCreateProposal={true}
            userVotingPower={200}
          />
        );
      });

      expect(renderTime).toBeLessThan(200); // Should render efficiently
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', async () => {
      const { container } = render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Community Governance')).toBeInTheDocument();
      });

      // Check accessibility
      const results = await testUtils.checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('📝 Create Proposal')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText('📝 Create Proposal')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('🔄 Active (3)')).toHaveFocus();
    });

    it('should have proper ARIA labels for voting progress', async () => {
      render(
        <GovernanceSystem 
          communityId="test-community-1" 
          canCreateProposal={true}
          userVotingPower={200}
        />
      );

      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars.length).toBeGreaterThan(0);
        
        progressBars.forEach(bar => {
          expect(bar).toHaveAttribute('aria-label');
        });
      });
    });
  });
});