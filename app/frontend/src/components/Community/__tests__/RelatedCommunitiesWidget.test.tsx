import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { RelatedCommunitiesWidget } from '../RelatedCommunitiesWidget';
import { CommunityService } from '../../../services/communityService';
import { Community } from '../../../models/Community';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { beforeEach } from 'node:test';
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

// Mock the CommunityService
jest.mock('../../../services/communityService');
const mockCommunityService = CommunityService as jest.Mocked<typeof CommunityService>;

// Mock community data
const mockCurrentCommunity: Community = {
  id: 'current-community',
  name: 'current-community',
  displayName: 'Current Community',
  description: 'A community about technology and innovation',
  rules: [],
  memberCount: 1000,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  category: 'technology',
  tags: ['tech', 'innovation', 'programming'],
  isPublic: true,
  moderators: [],
  settings: {
    allowedPostTypes: [],
    requireApproval: false,
    minimumReputation: 0,
    stakingRequirements: []
  }
};

const mockRelatedCommunities: Community[] = [
  {
    id: 'related-1',
    name: 'related-1',
    displayName: 'Tech Innovators',
    description: 'Innovation and technology discussions',
    rules: [],
    memberCount: 800,
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-01'),
    category: 'technology',
    tags: ['tech', 'innovation'],
    isPublic: true,
    moderators: [],
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  },
  {
    id: 'related-2',
    name: 'related-2',
    displayName: 'Programming Hub',
    description: 'Programming and software development',
    rules: [],
    memberCount: 1200,
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-01'),
    category: 'technology',
    tags: ['programming', 'software'],
    isPublic: true,
    moderators: [],
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  }
];

const mockPopularCommunities: Community[] = [
  {
    id: 'popular-1',
    name: 'popular-1',
    displayName: 'Popular Community',
    description: 'A very popular community',
    rules: [],
    memberCount: 5000,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-01-15'),
    category: 'general',
    tags: ['popular', 'general'],
    isPublic: true,
    moderators: [],
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  }
];

describe('RelatedCommunitiesWidget', () => {
  const mockOnJoinCommunity = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnJoinCommunity.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('renders the widget with correct title when related communities exist', async () => {
      mockCommunityService.getAllCommunities.mockResolvedValue(mockRelatedCommunities);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      // Should show loading initially
      expect(screen.getByText('Similar Communities')).toBeInTheDocument();
      
      // Wait for communities to load
      await waitFor(() => {
        expect(screen.getByText('Tech Innovators')).toBeInTheDocument();
      });
    });

    it('renders popular communities fallback when no related communities found', async () => {
      mockCommunityService.getAllCommunities.mockResolvedValue([]);
      mockCommunityService.getTrendingCommunities.mockResolvedValue(mockPopularCommunities);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Popular Communities')).toBeInTheDocument();
        expect(screen.getByText('Popular Community')).toBeInTheDocument();
      });
    });

    it('displays loading state correctly', () => {
      mockCommunityService.getAllCommunities.mockImplementation(() => new Promise(() => {}));

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      // Should show loading skeletons
      const skeletons = screen.getAllByRole('generic');
      expect(skeletons.some(el => el.classList.contains('animate-pulse'))).toBe(true);
    });

    it('displays error state and retry button', async () => {
      const errorMessage = 'Failed to fetch communities';
      mockCommunityService.getAllCommunities.mockRejectedValue(new Error(errorMessage));

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load related communities')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });
  });

  describe('Community Recommendation Algorithm', () => {
    it('calculates similarity scores correctly', async () => {
      const highSimilarityCommunity: Community = {
        ...mockRelatedCommunities[0],
        category: 'technology', // Same category
        tags: ['tech', 'innovation', 'programming'], // All shared tags
        memberCount: 1000, // Same member count
        description: 'A community about technology and innovation' // Similar description
      };

      mockCommunityService.getAllCommunities.mockResolvedValue([highSimilarityCommunity]);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        // Should show high similarity match percentage
        expect(screen.getByText(/\d+% match/)).toBeInTheDocument();
      });
    });

    it('shows popular communities fallback when similarity scores are too low', async () => {
      // Create communities with very low similarity (different category, no shared tags)
      const veryLowSimilarityCommunity: Community = {
        ...mockRelatedCommunities[0],
        category: 'sports', // Different category
        tags: ['sports', 'fitness'], // No shared tags
        description: 'A community about sports and fitness', // Different description
        memberCount: 50 // Very different member count
      };

      // Mock empty results for category and tag searches to ensure low similarity
      mockCommunityService.getAllCommunities
        .mockResolvedValueOnce([]) // Category search returns empty
        .mockResolvedValueOnce([veryLowSimilarityCommunity]); // Tag search returns low similarity
      mockCommunityService.getTrendingCommunities.mockResolvedValue(mockPopularCommunities);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        // Should fall back to popular communities
        expect(screen.getByText('Popular Communities')).toBeInTheDocument();
        expect(screen.getByText('Popular Community')).toBeInTheDocument();
      });
    });

    it('excludes the current community from recommendations', async () => {
      const communitiesIncludingCurrent = [...mockRelatedCommunities, mockCurrentCommunity];
      mockCommunityService.getAllCommunities.mockResolvedValue(communitiesIncludingCurrent);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Current Community')).not.toBeInTheDocument();
        expect(screen.getByText('Tech Innovators')).toBeInTheDocument();
      });
    });
  });

  describe('Community Display', () => {
    beforeEach(async () => {
      mockCommunityService.getAllCommunities.mockResolvedValue(mockRelatedCommunities);
    });

    it('displays community information correctly', async () => {
      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Tech Innovators')).toBeInTheDocument();
        expect(screen.getByText('800 members')).toBeInTheDocument();
        expect(screen.getByText('Innovation and technology discussions')).toBeInTheDocument();
      });
    });

    it('formats member counts correctly', async () => {
      const communityWithLargeCount: Community = {
        ...mockRelatedCommunities[0],
        memberCount: 1500000
      };

      mockCommunityService.getAllCommunities.mockResolvedValue([communityWithLargeCount]);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('1.5M members')).toBeInTheDocument();
      });
    });

    it('displays community avatars or fallback initials', async () => {
      const communityWithAvatar: Community = {
        ...mockRelatedCommunities[0],
        avatar: 'https://example.com/avatar.jpg'
      };

      mockCommunityService.getAllCommunities.mockResolvedValue([communityWithAvatar]);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        const avatar = screen.getByAltText('Tech Innovators avatar');
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
      });
    });

    it('displays fallback initials when no avatar is provided', async () => {
      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('T')).toBeInTheDocument(); // First letter of "Tech Innovators"
      });
    });
  });

  describe('Join Functionality', () => {
    beforeEach(async () => {
      mockCommunityService.getAllCommunities.mockResolvedValue(mockRelatedCommunities);
    });

    it('handles joining a community successfully', async () => {
      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Tech Innovators')).toBeInTheDocument();
      });

      const joinButton = screen.getAllByText('Join')[0];
      fireEvent.click(joinButton);

      expect(mockOnJoinCommunity).toHaveBeenCalledWith('related-1');

      await waitFor(() => {
        expect(screen.getByText('Joined')).toBeInTheDocument();
      });
    });

    it('shows loading state while joining', async () => {
      mockOnJoinCommunity.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Tech Innovators')).toBeInTheDocument();
      });

      const joinButton = screen.getAllByText('Join')[0];
      fireEvent.click(joinButton);

      expect(screen.getByText('Joining...')).toBeInTheDocument();
    });

    it('handles join errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockOnJoinCommunity.mockRejectedValue(new Error('Join failed'));

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Tech Innovators')).toBeInTheDocument();
      });

      const joinButton = screen.getAllByText('Join')[0];
      fireEvent.click(joinButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error joining community:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockCommunityService.getAllCommunities.mockRejectedValue(new Error('Network error'));

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load related communities')).toBeInTheDocument();
      });
    });

    it('allows retrying after error', async () => {
      mockCommunityService.getAllCommunities.mockRejectedValue(new Error('Network error'));

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });

      // Clear the mock and set up success response for retry
      mockCommunityService.getAllCommunities.mockClear();
      mockCommunityService.getAllCommunities.mockResolvedValue(mockRelatedCommunities);

      fireEvent.click(screen.getByText('Try again'));

      // Verify that the service was called again (retry functionality works)
      await waitFor(() => {
        expect(mockCommunityService.getAllCommunities).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockCommunityService.getAllCommunities.mockResolvedValue(mockRelatedCommunities);
    });

    it('provides proper ARIA labels for join buttons', async () => {
      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        const joinButton = screen.getByLabelText('Join Tech Innovators');
        expect(joinButton).toBeInTheDocument();
      });
    });

    it('provides proper alt text for community avatars', async () => {
      const communityWithAvatar: Community = {
        ...mockRelatedCommunities[0],
        avatar: 'https://example.com/avatar.jpg'
      };

      mockCommunityService.getAllCommunities.mockResolvedValue([communityWithAvatar]);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        const avatar = screen.getByAltText('Tech Innovators avatar');
        expect(avatar).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty community lists gracefully', async () => {
      mockCommunityService.getAllCommunities.mockResolvedValue([]);
      mockCommunityService.getTrendingCommunities.mockResolvedValue([]);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No related communities found')).toBeInTheDocument();
      });
    });

    it('handles communities with missing optional fields', async () => {
      const minimalCommunity: Community = {
        ...mockRelatedCommunities[0],
        avatar: undefined,
        tags: [],
        description: ''
      };

      mockCommunityService.getAllCommunities.mockResolvedValue([minimalCommunity]);

      render(
        <RelatedCommunitiesWidget
          currentCommunity={mockCurrentCommunity}
          onJoinCommunity={mockOnJoinCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Tech Innovators')).toBeInTheDocument();
      });
    });
  });
});