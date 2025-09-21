import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RedditStylePostCard from '../RedditStylePostCard';
import { CommunityPost } from '@/models/CommunityPost';
import { Community } from '@/models/Community';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronUp: () => <div data-testid="chevron-up">↑</div>,
  ChevronDown: () => <div data-testid="chevron-down">↓</div>,
  MessageCircle: () => <div data-testid="message-circle">💬</div>,
  Share2: () => <div data-testid="share">📤</div>,
  Bookmark: () => <div data-testid="bookmark">🔖</div>,
  MoreHorizontal: () => <div data-testid="more">⋯</div>,
  Eye: () => <div data-testid="eye">👁</div>,
  Clock: () => <div data-testid="clock">🕐</div>,
}));

const mockPost: CommunityPost = {
  id: 'test-post-1',
  author: '0x1234567890123456789012345678901234567890',
  communityId: 'test-community',
  contentCid: 'This is a test post content',
  mediaCids: [],
  tags: ['test', 'reddit'],
  createdAt: new Date('2024-01-01T12:00:00Z'),
  onchainRef: '',
  flair: 'Discussion',
  isPinned: false,
  isLocked: false,
  upvotes: 10,
  downvotes: 2,
  comments: [],
  depth: 0,
  sortOrder: 0,
};

const mockCommunity: Community = {
  id: 'test-community',
  name: 'testcommunity',
  displayName: 'Test Community',
  description: 'A test community',
  rules: [],
  memberCount: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: 'test',
  tags: [],
  isPublic: true,
  moderators: [],
  settings: {
    allowedPostTypes: [],
    requireApproval: false,
    minimumReputation: 0,
    stakingRequirements: [],
  },
};

describe('RedditStylePostCard', () => {
  const mockOnVote = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnHide = jest.fn();
  const mockOnReport = jest.fn();
  const mockOnComment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders post content correctly', () => {
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    expect(screen.getByText('This is a test post content')).toBeInTheDocument();
    expect(screen.getByText('r/testcommunity')).toBeInTheDocument();
    expect(screen.getByText(/u\/0x1234/)).toBeInTheDocument();
    expect(screen.getByText('Discussion')).toBeInTheDocument();
  });

  it('displays correct vote score', () => {
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    // Vote score should be upvotes - downvotes = 10 - 2 = 8
    expect(screen.getByText('+8')).toBeInTheDocument();
  });

  it('handles upvote click correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    await user.click(upvoteButton);

    expect(mockOnVote).toHaveBeenCalledWith('test-post-1', 'up');
  });

  it('handles downvote click correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    const downvoteButton = screen.getByLabelText('Downvote');
    await user.click(downvoteButton);

    expect(mockOnVote).toHaveBeenCalledWith('test-post-1', 'down');
  });

  it('provides immediate visual feedback for voting', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    
    // Check initial state
    expect(upvoteButton).not.toHaveClass('text-orange-500');
    
    // Click upvote
    await user.click(upvoteButton);
    
    // Should have active styling (optimistic update)
    expect(upvoteButton).toHaveClass('text-orange-500');
  });

  it('toggles vote when clicking same direction twice', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    
    // First click - should upvote
    await user.click(upvoteButton);
    expect(mockOnVote).toHaveBeenCalledWith('test-post-1', 'up');
    
    // Second click - should toggle off (remove vote)
    await user.click(upvoteButton);
    expect(mockOnVote).toHaveBeenCalledWith('test-post-1', 'up'); // Still calls with 'up', component handles toggle logic
  });

  it('prevents multiple rapid clicks while voting', async () => {
    const user = userEvent.setup();
    const slowOnVote = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={slowOnVote}
      />
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    
    // Rapid clicks
    await user.click(upvoteButton);
    await user.click(upvoteButton);
    await user.click(upvoteButton);
    
    // Should only call once due to isVoting state
    expect(slowOnVote).toHaveBeenCalledTimes(1);
  });

  it('displays pinned indicator when post is pinned', () => {
    const pinnedPost = { ...mockPost, isPinned: true };
    
    render(
      <RedditStylePostCard
        post={pinnedPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    expect(screen.getByText('📌 Pinned')).toBeInTheDocument();
  });

  it('displays locked indicator when post is locked', () => {
    const lockedPost = { ...mockPost, isLocked: true };
    
    render(
      <RedditStylePostCard
        post={lockedPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    expect(screen.getByText('🔒')).toBeInTheDocument();
  });

  it('shows more options menu when menu button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onSave={mockOnSave}
        onHide={mockOnHide}
        onReport={mockOnReport}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    await user.click(menuButton);

    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Hide')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
  });

  it('calls save handler when save option is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onSave={mockOnSave}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    await user.click(menuButton);

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith('test-post-1');
  });

  it('calls hide handler when hide option is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onHide={mockOnHide}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    await user.click(menuButton);

    const hideButton = screen.getByText('Hide');
    await user.click(hideButton);

    expect(mockOnHide).toHaveBeenCalledWith('test-post-1');
  });

  it('calls report handler when report option is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onReport={mockOnReport}
      />
    );

    const menuButton = screen.getByLabelText('More options');
    await user.click(menuButton);

    const reportButton = screen.getByText('Report');
    await user.click(reportButton);

    expect(mockOnReport).toHaveBeenCalledWith('test-post-1');
  });

  it('calls comment handler when comments button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onComment={mockOnComment}
      />
    );

    const commentsButton = screen.getByText('0 comments');
    await user.click(commentsButton);

    expect(mockOnComment).toHaveBeenCalledWith('test-post-1');
  });

  it('displays media when present and showThumbnail is true', () => {
    const postWithMedia = {
      ...mockPost,
      mediaCids: ['https://example.com/image.jpg']
    };
    
    render(
      <RedditStylePostCard
        post={postWithMedia}
        community={mockCommunity}
        onVote={mockOnVote}
        showThumbnail={true}
      />
    );

    const image = screen.getByAltText('Post media');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('does not display media when showThumbnail is false', () => {
    const postWithMedia = {
      ...mockPost,
      mediaCids: ['https://example.com/image.jpg']
    };
    
    render(
      <RedditStylePostCard
        post={postWithMedia}
        community={mockCommunity}
        onVote={mockOnVote}
        showThumbnail={false}
      />
    );

    expect(screen.queryByAltText('Post media')).not.toBeInTheDocument();
  });

  it('displays tags when present', () => {
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    expect(screen.getByText('#test')).toBeInTheDocument();
    expect(screen.getByText('#reddit')).toBeInTheDocument();
  });

  it('formats time correctly', () => {
    // Create a post from 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentPost = { ...mockPost, createdAt: twoHoursAgo };
    
    render(
      <RedditStylePostCard
        post={recentPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('handles negative vote scores correctly', () => {
    const negativePost = { ...mockPost, upvotes: 2, downvotes: 10 };
    
    render(
      <RedditStylePostCard
        post={negativePost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    // Vote score should be 2 - 10 = -8
    expect(screen.getByText('-8')).toBeInTheDocument();
  });

  it('handles zero vote scores correctly', () => {
    const zeroPost = { ...mockPost, upvotes: 5, downvotes: 5 };
    
    render(
      <RedditStylePostCard
        post={zeroPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    // Vote score should be 5 - 5 = 0
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('applies correct CSS classes for different vote states', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
      />
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    const downvoteButton = screen.getByLabelText('Downvote');
    
    // Initial state - no active votes
    expect(upvoteButton).toHaveClass('text-gray-400');
    expect(downvoteButton).toHaveClass('text-gray-400');
    
    // Click upvote
    await user.click(upvoteButton);
    expect(upvoteButton).toHaveClass('text-orange-500');
    expect(downvoteButton).toHaveClass('text-gray-400');
    
    // Click downvote
    await user.click(downvoteButton);
    expect(upvoteButton).toHaveClass('text-gray-400');
    expect(downvoteButton).toHaveClass('text-blue-500');
  });

  it('handles vote error gracefully', async () => {
    const user = userEvent.setup();
    const failingOnVote = jest.fn().mockRejectedValue(new Error('Vote failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={failingOnVote}
      />
    );

    const upvoteButton = screen.getByLabelText('Upvote');
    await user.click(upvoteButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Vote failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});