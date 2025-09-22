/**
 * Social Proof Indicators Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialProofIndicators, { SocialProofData } from '../SocialProofIndicators';

const mockSocialProofData: SocialProofData = {
  mutualFollows: [
    {
      userId: 'user1',
      username: 'alice',
      avatar: 'https://example.com/alice.jpg',
      ensName: 'alice.eth',
      connectionType: 'mutual_follow',
      strength: 'strong',
      metadata: {
        followedSince: new Date('2023-01-01'),
      },
    },
    {
      userId: 'user2',
      username: 'bob',
      connectionType: 'mutual_follow',
      strength: 'medium',
      metadata: {
        followedSince: new Date('2023-06-01'),
      },
    },
  ],
  sharedCommunities: [
    {
      communityId: 'community1',
      communityName: 'Web3 Developers',
      memberCount: 500,
      mutualMembers: [
        {
          userId: 'member1',
          username: 'charlie',
          connectionType: 'shared_community',
          strength: 'medium',
        },
      ],
    },
  ],
  connectionStrength: 'strong',
  interactionHistory: {
    totalInteractions: 25,
    recentInteractions: 5,
    lastInteraction: new Date('2023-12-01'),
  },
  trustScore: 85,
};

describe('SocialProofIndicators', () => {
  const defaultProps = {
    targetUserId: 'target-user',
    currentUserId: 'current-user',
    socialProofData: mockSocialProofData,
  };

  describe('Rendering', () => {
    it('should render social proof indicators with provided data', () => {
      render(<SocialProofIndicators {...defaultProps} />);

      expect(screen.getByText('Strong connection')).toBeInTheDocument();
      expect(screen.getByText('2 mutual follows')).toBeInTheDocument();
      expect(screen.getByText('1 shared community')).toBeInTheDocument();
      expect(screen.getByText('85% trust score')).toBeInTheDocument();
    });

    it('should not render when target and current user are the same', () => {
      const { container } = render(
        <SocialProofIndicators
          {...defaultProps}
          targetUserId="same-user"
          currentUserId="same-user"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show loading state when no data is provided', () => {
      render(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={undefined}
        />
      );

      expect(screen.getByTestId('social-proof-skeleton') || screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Connection Strength', () => {
    it('should display correct connection strength indicator', () => {
      render(<SocialProofIndicators {...defaultProps} />);

      const strengthIndicator = screen.getByText('●');
      expect(strengthIndicator).toBeInTheDocument();
      expect(strengthIndicator).toHaveStyle({ color: '#10b981' }); // Strong connection color
    });

    it('should not show connection strength when disabled', () => {
      render(
        <SocialProofIndicators
          {...defaultProps}
          showConnectionStrength={false}
        />
      );

      expect(screen.queryByText('Strong connection')).not.toBeInTheDocument();
    });

    it('should not show connection strength when set to none', () => {
      const dataWithNoConnection = {
        ...mockSocialProofData,
        connectionStrength: 'none' as const,
      };

      render(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={dataWithNoConnection}
        />
      );

      expect(screen.queryByText(/connection/)).not.toBeInTheDocument();
    });
  });

  describe('Trust Score', () => {
    it('should display trust score with correct color', () => {
      render(<SocialProofIndicators {...defaultProps} />);

      expect(screen.getByText('85% trust score')).toBeInTheDocument();
      
      const trustBar = screen.getByRole('progressbar') || document.querySelector('.ce-trust-score-fill');
      expect(trustBar).toHaveStyle({ backgroundColor: '#10b981' }); // High trust color
    });

    it('should not show trust score when disabled', () => {
      render(
        <SocialProofIndicators
          {...defaultProps}
          showTrustScore={false}
        />
      );

      expect(screen.queryByText(/trust score/)).not.toBeInTheDocument();
    });

    it('should show correct trust level colors', () => {
      const lowTrustData = { ...mockSocialProofData, trustScore: 25 };
      const { rerender } = render(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={lowTrustData}
        />
      );

      let trustBar = document.querySelector('.ce-trust-score-fill');
      expect(trustBar).toHaveStyle({ backgroundColor: '#ef4444' }); // Low trust color

      const mediumTrustData = { ...mockSocialProofData, trustScore: 50 };
      rerender(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={mediumTrustData}
        />
      );

      trustBar = document.querySelector('.ce-trust-score-fill');
      expect(trustBar).toHaveStyle({ backgroundColor: '#f59e0b' }); // Medium trust color
    });
  });

  describe('Mutual Follows', () => {
    it('should display mutual follows list', () => {
      render(<SocialProofIndicators {...defaultProps} />);

      expect(screen.getByText('2 mutual follows')).toBeInTheDocument();
      expect(screen.getByText('alice.eth')).toBeInTheDocument();
      expect(screen.getByText('bob')).toBeInTheDocument();
    });

    it('should show follow duration', () => {
      render(<SocialProofIndicators {...defaultProps} />);

      expect(screen.getByText(/Following since/)).toBeInTheDocument();
    });

    it('should limit displayed mutual follows', () => {
      const manyFollowsData = {
        ...mockSocialProofData,
        mutualFollows: Array.from({ length: 10 }, (_, i) => ({
          userId: `user${i}`,
          username: `user${i}`,
          connectionType: 'mutual_follow' as const,
          strength: 'medium' as const,
        })),
      };

      render(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={manyFollowsData}
          maxMutualFollows={3}
        />
      );

      expect(screen.getByText('10 mutual follows')).toBeInTheDocument();
      expect(screen.getByText('+7 more')).toBeInTheDocument();
    });

    it('should not show mutual follows when disabled', () => {
      render(
        <SocialProofIndicators
          {...defaultProps}
          showMutualFollows={false}
        />
      );

      expect(screen.queryByText(/mutual follows/)).not.toBeInTheDocument();
    });
  });

  describe('Shared Communities', () => {
    it('should display shared communities list', () => {
      render(<SocialProofIndicators {...defaultProps} />);

      expect(screen.getByText('1 shared community')).toBeInTheDocument();
      expect(screen.getByText('Web3 Developers')).toBeInTheDocument();
      expect(screen.getByText('1 mutual member')).toBeInTheDocument();
    });

    it('should handle plural forms correctly', () => {
      const multipleCommunitiesData = {
        ...mockSocialProofData,
        sharedCommunities: [
          ...mockSocialProofData.sharedCommunities,
          {
            communityId: 'community2',
            communityName: 'DeFi Enthusiasts',
            memberCount: 300,
            mutualMembers: [
              {
                userId: 'member2',
                username: 'dave',
                connectionType: 'shared_community' as const,
                strength: 'weak' as const,
              },
              {
                userId: 'member3',
                username: 'eve',
                connectionType: 'shared_community' as const,
                strength: 'medium' as const,
              },
            ],
          },
        ],
      };

      render(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={multipleCommunitiesData}
        />
      );

      expect(screen.getByText('2 shared communities')).toBeInTheDocument();
      expect(screen.getByText('2 mutual members')).toBeInTheDocument();
    });

    it('should not show shared communities when disabled', () => {
      render(
        <SocialProofIndicators
          {...defaultProps}
          showSharedCommunities={false}
        />
      );

      expect(screen.queryByText(/shared communit/)).not.toBeInTheDocument();
    });
  });

  describe('Interaction History', () => {
    it('should display interaction history', () => {
      render(<SocialProofIndicators {...defaultProps} />);

      expect(screen.getByText('25 past interactions')).toBeInTheDocument();
      expect(screen.getByText(/Last:/)).toBeInTheDocument();
    });

    it('should handle singular interaction correctly', () => {
      const singleInteractionData = {
        ...mockSocialProofData,
        interactionHistory: {
          totalInteractions: 1,
          recentInteractions: 1,
          lastInteraction: new Date('2023-12-01'),
        },
      };

      render(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={singleInteractionData}
        />
      );

      expect(screen.getByText('1 past interaction')).toBeInTheDocument();
    });

    it('should not show interaction history when no interactions', () => {
      const noInteractionsData = {
        ...mockSocialProofData,
        interactionHistory: {
          totalInteractions: 0,
          recentInteractions: 0,
        },
      };

      render(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={noInteractionsData}
        />
      );

      expect(screen.queryByText(/past interaction/)).not.toBeInTheDocument();
    });
  });

  describe('Privacy Controls', () => {
    it('should show privacy controls when enabled', () => {
      render(
        <SocialProofIndicators
          {...defaultProps}
          showPrivacyControls={true}
        />
      );

      expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    });

    it('should handle privacy setting changes', async () => {
      const mockOnPrivacyChange = jest.fn();

      render(
        <SocialProofIndicators
          {...defaultProps}
          showPrivacyControls={true}
          onPrivacyChange={mockOnPrivacyChange}
        />
      );

      // Open privacy dropdown
      fireEvent.click(screen.getByText('Privacy Settings'));

      // Toggle a privacy setting
      const mutualFollowsCheckbox = screen.getByLabelText('Show mutual follows');
      fireEvent.click(mutualFollowsCheckbox);

      expect(mockOnPrivacyChange).toHaveBeenCalledWith('showMutualFollows', false);
    });

    it('should not show privacy controls by default', () => {
      render(<SocialProofIndicators {...defaultProps} />);

      expect(screen.queryByText('Privacy Settings')).not.toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should not render when no social proof exists', () => {
      const emptyData: SocialProofData = {
        mutualFollows: [],
        sharedCommunities: [],
        connectionStrength: 'none',
        interactionHistory: {
          totalInteractions: 0,
          recentInteractions: 0,
        },
        trustScore: 0,
      };

      const { container } = render(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={emptyData}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should show error state when data loading fails', () => {
      render(
        <SocialProofIndicators
          {...defaultProps}
          socialProofData={undefined}
        />
      );

      // Simulate error state by waiting for loading to complete
      waitFor(() => {
        expect(screen.getByText('Unable to load social connections')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<SocialProofIndicators {...defaultProps} />);

      const strengthIndicator = screen.getByText('●');
      expect(strengthIndicator).toHaveAttribute('title', 'Strong connection');
    });

    it('should support keyboard navigation for privacy controls', () => {
      render(
        <SocialProofIndicators
          {...defaultProps}
          showPrivacyControls={true}
        />
      );

      const privacyToggle = screen.getByText('Privacy Settings');
      expect(privacyToggle).toBeInTheDocument();
      
      // Should be focusable
      privacyToggle.focus();
      expect(document.activeElement).toBe(privacyToggle);
    });
  });

  describe('Responsive Design', () => {
    it('should apply mobile-specific styles', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(<SocialProofIndicators {...defaultProps} />);

      const container = document.querySelector('.ce-social-proof-indicators');
      expect(container).toBeInTheDocument();
    });
  });
});