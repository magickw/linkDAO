import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommunityPostCardEnhanced from '../CommunityPostCardEnhanced';
import { Community } from '../../../models/Community';
import { CommunityPost } from '../../../models/CommunityPost';
import { CommunityMembership } from '../../../models/CommunityMembership';

// Mock community data
const mockCommunity: Community = {
  id: 'test-community',
  name: 'test-community',
  displayName: 'Test Community',
  description: 'A test community for testing purposes',
  memberCount: 1234,
  avatar: '🏛️',
  banner: 'https://example.com/banner.jpg',
  category: 'Development',
  tags: ['ethereum', 'blockchain', 'web3'],
  isPublic: true,
  rules: ['Be respectful', 'No spam'],
  moderators: ['0x1234...5678'],
  treasuryAddress: '0x1234567890123456789012345678901234567890',
  governanceToken: 'TEST',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  settings: {
    allowedPostTypes: [],
    requireApproval: false,
    minimumReputation: 0,
    stakingRequirements: []
  }
};

// Mock post data
const mockPost: CommunityPost = {
  id: 'test-post-1',
  contentCid: 'This is a test post content for testing purposes.',
  author: '0x1234567890123456789012345678901234567890',
  communityId: 'test-community',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  upvotes: 42,
  downvotes: 3,
  flair: 'Verified',
  isPinned: false,
  isLocked: false,
  tags: ['ethereum', 'blockchain'],
  mediaCids: [],
  onchainRef: '0x1234567890123456789012345678901234567890:1',
  comments: []
};

// Mock membership data
const mockMembership: CommunityMembership = {
  id: 'membership-1',
  userId: '0x1234567890123456789012345678901234567890',
  communityId: 'test-community',
  role: 'member',
  joinedAt: new Date('2023-01-01'),
  reputation: 100,
  isActive: true,
  settings: {
    notifications: true,
    emailDigest: true
  }
};

describe('CommunityPostCardEnhanced', () => {
  const mockOnVote = jest.fn();
  const mockOnReaction = jest.fn();
  const mockOnTip = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders post information correctly', () => {
      render(
        <CommunityPostCardEnhanced
          post={mockPost}
          community={mockCommunity}
          userMembership={mockMembership}
          onVote={mockOnVote}
          onReaction={mockOnReaction}
          onTip={mockOnTip}
        />
      );
      
      expect(screen.getByText('This is a test post content for testing purposes.')).toBeInTheDocument();
      expect(screen.getByText('u/0x1234...7890')).toBeInTheDocument();
      expect(screen.getByText('+39')).toBeInTheDocument(); // Vote score (42 - 3)
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('renders loading skeleton when isLoading is true', () => {
      render(
        <CommunityPostCardEnhanced
          post={mockPost}
          community={mockCommunity}
          userMembership={mockMembership}
          onVote={mockOnVote}
          onReaction={mockOnReaction}
          onTip={mockOnTip}
          isLoading={true}
        />
      );
      
      expect(screen.getByRole('article')).toHaveClass('animate-pulse');
    });
  });

  describe('Interactions', () => {
    it('handles upvote action', () => {
      render(
        <CommunityPostCardEnhanced
          post={mockPost}
          community={mockCommunity}
          userMembership={mockMembership}
          onVote={mockOnVote}
          onReaction={mockOnReaction}
          onTip={mockOnTip}
        />
      );
      
      const upvoteButton = screen.getByLabelText('Upvote');
      fireEvent.click(upvoteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('test-post-1', 'upvote', undefined);
    });

    it('handles downvote action', () => {
      render(
        <CommunityPostCardEnhanced
          post={mockPost}
          community={mockCommunity}
          userMembership={mockMembership}
          onVote={mockOnVote}
          onReaction={mockOnReaction}
          onTip={mockOnTip}
        />
      );
      
      const downvoteButton = screen.getByLabelText('Downvote');
      fireEvent.click(downvoteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('test-post-1', 'downvote', undefined);
    });
  });

  describe('Props and Variants', () => {
    it('renders without user membership', () => {
      render(
        <CommunityPostCardEnhanced
          post={mockPost}
          community={mockCommunity}
          userMembership={null}
          onVote={mockOnVote}
          onReaction={mockOnReaction}
          onTip={mockOnTip}
        />
      );
      
      expect(screen.getByText('This is a test post content for testing purposes.')).toBeInTheDocument();
    });
  });
});