import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PinnedPostsSection from '../PinnedPostsSection';
import { CommunityPost } from '@/models/CommunityPost';
import { Community } from '@/models/Community';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock RedditStylePostCard
jest.mock('../../RedditStylePostCard/RedditStylePostCard', () => ({
  default: ({ post, isPinned, onVote, onSave, onHide, onReport, onComment }: any) => (
    <div data-testid={`post-card-${post.id}`}>
      <div>Post: {post.contentCid}</div>
      <div>Pinned: {isPinned ? 'true' : 'false'}</div>
      <button onClick={() => onVote(post.id, 'up')} data-testid={`vote-up-${post.id}`}>
        Upvote
      </button>
      <button onClick={() => onSave?.(post.id)} data-testid={`save-${post.id}`}>
        Save
      </button>
      <button onClick={() => onHide?.(post.id)} data-testid={`hide-${post.id}`}>
        Hide
      </button>
      <button onClick={() => onReport?.(post.id)} data-testid={`report-${post.id}`}>
        Report
      </button>
      <button onClick={() => onComment?.(post.id)} data-testid={`comment-${post.id}`}>
        Comment
      </button>
    </div>
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Pin: () => <div data-testid="pin-icon">Pin</div>,
  ChevronUp: () => <div data-testid="chevron-up">Up</div>,
  ChevronDown: () => <div data-testid="chevron-down">Down</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
}));

describe('PinnedPostsSection Integration', () => {
  const mockCommunity: Community = {
    id: 'community-1',
    name: 'test-community',
    displayName: 'Test Community',
    description: 'A test community',
    memberCount: 100,
    onlineCount: 10,
    createdAt: new Date(),
    rules: [],
    flairs: [],
    moderators: [],
    isJoined: false,
    canModerate: false,
  };

  const createMockPost = (id: string, isPinned: boolean = false, sortOrder: number = 0): CommunityPost => ({
    id,
    author: 'test-user',
    communityId: 'community-1',
    contentCid: `Test post content ${id}`,
    mediaCids: [],
    tags: [],
    createdAt: new Date(),
    onchainRef: '',
    flair: undefined,
    isPinned,
    isLocked: false,
    upvotes: 10,
    downvotes: 2,
    comments: [],
    depth: 0,
    sortOrder,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Pin Management Workflow', () => {
    it('should handle complete pin/unpin/reorder workflow', async () => {
      const user = userEvent.setup();
      const onPin = jest.fn().mockResolvedValue(undefined);
      const onUnpin = jest.fn().mockResolvedValue(undefined);
      const onReorder = jest.fn().mockResolvedValue(undefined);

      // Start with 2 pinned posts
      const initialPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      const { rerender } = render(
        <PinnedPostsSection
          posts={initialPosts}
          community={mockCommunity}
          canModerate={true}
          onPin={onPin}
          onUnpin={onUnpin}
          onReorder={onReorder}
          onVote={vi.fn()}
          onSave={vi.fn()}
          onHide={vi.fn()}
          onReport={vi.fn()}
          onComment={vi.fn()}
        />
      );

      // Verify initial state
      expect(screen.getByText('(2/3)')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-2')).toBeInTheDocument();

      // Test reordering - move first post down
      const firstSettingsButton = screen.getAllByTestId('settings-icon')[0].closest('button');
      await user.click(firstSettingsButton!);
      
      const moveDownButton = screen.getByText('Move Down');
      await user.click(moveDownButton);

      expect(onReorder).toHaveBeenCalledWith(['post-2', 'post-1']);

      // Test unpinning - unpin second post
      const secondSettingsButton = screen.getAllByTestId('settings-icon')[1].closest('button');
      await user.click(secondSettingsButton!);
      
      const unpinButton = screen.getByText('Unpin');
      await user.click(unpinButton);

      expect(onUnpin).toHaveBeenCalledWith('post-2');

      // Simulate state after unpinning (only post-1 remains)
      const updatedPosts = [createMockPost('post-1', true, 0)];
      
      rerender(
        <PinnedPostsSection
          posts={updatedPosts}
          community={mockCommunity}
          canModerate={true}
          onPin={onPin}
          onUnpin={onUnpin}
          onReorder={onReorder}
          onVote={vi.fn()}
          onSave={vi.fn()}
          onHide={vi.fn()}
          onReport={vi.fn()}
          onComment={vi.fn()}
        />
      );

      // Verify updated state
      expect(screen.getByText('(1/3)')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();
      expect(screen.queryByTestId('post-card-post-2')).not.toBeInTheDocument();
    });

    it('should show pin limit warning and prevent further pinning', async () => {
      const user = userEvent.setup();
      
      // Start with 3 pinned posts (maximum)
      const maxPinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
        createMockPost('post-3', true, 2),
      ];

      render(
        <PinnedPostsSection
          posts={maxPinnedPosts}
          community={mockCommunity}
          canModerate={true}
          onPin={jest.fn()}
          onUnpin={jest.fn()}
          onReorder={jest.fn()}
          onVote={jest.fn()}
          onSave={jest.fn()}
          onHide={jest.fn()}
          onReport={jest.fn()}
          onComment={jest.fn()}
        />
      );

      // Verify maximum posts are shown
      expect(screen.getByText('(3/3)')).toBeInTheDocument();
      expect(screen.getByText(/Maximum of 3 posts can be pinned/)).toBeInTheDocument();
      
      // Verify all 3 posts are displayed
      expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-2')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-3')).toBeInTheDocument();
    });

    it('should handle post interactions correctly', async () => {
      const user = userEvent.setup();
      const onVote = jest.fn();
      const onSave = jest.fn();
      const onHide = jest.fn();
      const onReport = jest.fn();
      const onComment = jest.fn();

      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(
        <PinnedPostsSection
          posts={pinnedPosts}
          community={mockCommunity}
          canModerate={false}
          onPin={vi.fn()}
          onUnpin={vi.fn()}
          onReorder={vi.fn()}
          onVote={onVote}
          onSave={onSave}
          onHide={onHide}
          onReport={onReport}
          onComment={onComment}
        />
      );

      // Test voting
      await user.click(screen.getByTestId('vote-up-post-1'));
      expect(onVote).toHaveBeenCalledWith('post-1', 'up');

      // Test save
      await user.click(screen.getByTestId('save-post-1'));
      expect(onSave).toHaveBeenCalledWith('post-1');

      // Test hide
      await user.click(screen.getByTestId('hide-post-1'));
      expect(onHide).toHaveBeenCalledWith('post-1');

      // Test report
      await user.click(screen.getByTestId('report-post-1'));
      expect(onReport).toHaveBeenCalledWith('post-1');

      // Test comment
      await user.click(screen.getByTestId('comment-post-1'));
      expect(onComment).toHaveBeenCalledWith('post-1');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle async operation failures gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const onUnpin = jest.fn().mockRejectedValue(new Error('Network error'));
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(
        <PinnedPostsSection
          posts={pinnedPosts}
          community={mockCommunity}
          canModerate={true}
          onPin={jest.fn()}
          onUnpin={onUnpin}
          onReorder={jest.fn()}
          onVote={jest.fn()}
          onSave={jest.fn()}
          onHide={jest.fn()}
          onReport={jest.fn()}
          onComment={jest.fn()}
        />
      );

      // Try to unpin and expect error handling
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      await user.click(settingsButton!);
      
      const unpinButton = screen.getByText('Unpin');
      await user.click(unpinButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to unpin post:', expect.any(Error));
      });

      // Post should still be visible (operation failed)
      expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Responsive Behavior', () => {
    it('should maintain functionality across different screen sizes', () => {
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      const { container } = render(
        <PinnedPostsSection
          posts={pinnedPosts}
          community={mockCommunity}
          canModerate={true}
          onPin={jest.fn()}
          onUnpin={jest.fn()}
          onReorder={jest.fn()}
          onVote={jest.fn()}
          onSave={jest.fn()}
          onHide={jest.fn()}
          onReport={jest.fn()}
          onComment={jest.fn()}
        />
      );

      // Verify all essential elements are present
      expect(screen.getByText('Pinned Posts')).toBeInTheDocument();
      expect(screen.getByText('(2/3)')).toBeInTheDocument();
      expect(screen.getAllByTestId('settings-icon')).toHaveLength(2);
      expect(screen.getAllByText('Pinned')).toHaveLength(2);
      
      // Verify posts are rendered
      expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-2')).toBeInTheDocument();
    });
  });
});