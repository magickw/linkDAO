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
  default: ({ post, isPinned, className }: any) => (
    <div data-testid={`post-card-${post.id}`} className={className}>
      <div>Post: {post.contentCid}</div>
      <div>Pinned: {isPinned ? 'true' : 'false'}</div>
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

describe('PinnedPostsSection', () => {
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

  const mockProps = {
    posts: [],
    community: mockCommunity,
    canModerate: false,
    onVote: jest.fn(),
    onSave: jest.fn(),
    onHide: jest.fn(),
    onReport: jest.fn(),
    onComment: jest.fn(),
    onPin: jest.fn(),
    onUnpin: jest.fn(),
    onReorder: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when there are no pinned posts', () => {
      const { container } = render(<PinnedPostsSection {...mockProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render pinned posts section with posts', () => {
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} />);

      expect(screen.getByRole('region', { name: 'Pinned posts' })).toBeInTheDocument();
      expect(screen.getByText('Pinned Posts')).toBeInTheDocument();
      expect(screen.getByText('(2/3)')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-2')).toBeInTheDocument();
    });

    it('should limit display to maximum of 3 pinned posts', () => {
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
        createMockPost('post-3', true, 2),
        createMockPost('post-4', true, 3), // This should not be displayed
      ];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} />);

      expect(screen.getByText('(3/3)')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-2')).toBeInTheDocument();
      expect(screen.getByTestId('post-card-post-3')).toBeInTheDocument();
      expect(screen.queryByTestId('post-card-post-4')).not.toBeInTheDocument();
    });

    it('should sort pinned posts by sortOrder', () => {
      const pinnedPosts = [
        createMockPost('post-1', true, 2),
        createMockPost('post-2', true, 0),
        createMockPost('post-3', true, 1),
      ];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} />);

      const postCards = screen.getAllByTestId(/^post-card-/);
      expect(postCards[0]).toHaveAttribute('data-testid', 'post-card-post-2'); // sortOrder 0
      expect(postCards[1]).toHaveAttribute('data-testid', 'post-card-post-3'); // sortOrder 1
      expect(postCards[2]).toHaveAttribute('data-testid', 'post-card-post-1'); // sortOrder 2
    });

    it('should show pin badges on all pinned posts', () => {
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} />);

      expect(screen.getByText('Pinned')).toBeInTheDocument();
    });
  });

  describe('Moderator Controls', () => {
    it('should not show moderator controls when canModerate is false', () => {
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={false} />);

      expect(screen.queryByTestId('settings-icon')).not.toBeInTheDocument();
    });

    it('should show moderator controls when canModerate is true', () => {
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={true} />);

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });

    it('should show pin limit warning when 3 posts are pinned and user can moderate', () => {
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
        createMockPost('post-3', true, 2),
      ];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={true} />);

      expect(screen.getByText(/Maximum of 3 posts can be pinned/)).toBeInTheDocument();
    });

    it('should not show pin limit warning when user cannot moderate', () => {
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
        createMockPost('post-3', true, 2),
      ];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={false} />);

      expect(screen.queryByText(/Maximum of 3 posts can be pinned/)).not.toBeInTheDocument();
    });
  });

  describe('Pin Controls Menu', () => {
    it('should show controls menu when settings button is clicked', async () => {
      const user = userEvent.setup();
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={true} />);

      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      await user.click(settingsButton!);

      expect(screen.getByText('Unpin')).toBeInTheDocument();
    });

    it('should show move up option for posts that can move up', async () => {
      const user = userEvent.setup();
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={true} />);

      // Click settings on the second post (can move up)
      const settingsButtons = screen.getAllByTestId('settings-icon');
      await user.click(settingsButtons[1].closest('button')!);

      expect(screen.getByText('Move Up')).toBeInTheDocument();
    });

    it('should show move down option for posts that can move down', async () => {
      const user = userEvent.setup();
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={true} />);

      // Click settings on the first post (can move down)
      const settingsButtons = screen.getAllByTestId('settings-icon');
      await user.click(settingsButtons[0].closest('button')!);

      expect(screen.getByText('Move Down')).toBeInTheDocument();
    });

    it('should not show move up option for first post', async () => {
      const user = userEvent.setup();
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={true} />);

      // Click settings on the first post
      const settingsButtons = screen.getAllByTestId('settings-icon');
      await user.click(settingsButtons[0].closest('button')!);

      expect(screen.queryByText('Move Up')).not.toBeInTheDocument();
    });

    it('should not show move down option for last post', async () => {
      const user = userEvent.setup();
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={true} />);

      // Click settings on the last post
      const settingsButtons = screen.getAllByTestId('settings-icon');
      await user.click(settingsButtons[1].closest('button')!);

      expect(screen.queryByText('Move Down')).not.toBeInTheDocument();
    });
  });

  describe('Pin Actions', () => {
    it('should call onUnpin when unpin is clicked', async () => {
      const user = userEvent.setup();
      const onUnpin = jest.fn().mockResolvedValue(undefined);
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(
        <PinnedPostsSection 
          {...mockProps} 
          posts={pinnedPosts} 
          canModerate={true} 
          onUnpin={onUnpin}
        />
      );

      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      await user.click(settingsButton!);

      const unpinButton = screen.getByText('Unpin');
      await user.click(unpinButton);

      expect(onUnpin).toHaveBeenCalledWith('post-1');
    });

    it('should call onReorder when move up is clicked', async () => {
      const user = userEvent.setup();
      const onReorder = jest.fn().mockResolvedValue(undefined);
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      render(
        <PinnedPostsSection 
          {...mockProps} 
          posts={pinnedPosts} 
          canModerate={true} 
          onReorder={onReorder}
        />
      );

      // Click settings on the second post
      const settingsButtons = screen.getAllByTestId('settings-icon');
      await user.click(settingsButtons[1].closest('button')!);

      const moveUpButton = screen.getByText('Move Up');
      await user.click(moveUpButton);

      expect(onReorder).toHaveBeenCalledWith(['post-2', 'post-1']);
    });

    it('should call onReorder when move down is clicked', async () => {
      const user = userEvent.setup();
      const onReorder = jest.fn().mockResolvedValue(undefined);
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      render(
        <PinnedPostsSection 
          {...mockProps} 
          posts={pinnedPosts} 
          canModerate={true} 
          onReorder={onReorder}
        />
      );

      // Click settings on the first post
      const settingsButtons = screen.getAllByTestId('settings-icon');
      await user.click(settingsButtons[0].closest('button')!);

      const moveDownButton = screen.getByText('Move Down');
      await user.click(moveDownButton);

      expect(onReorder).toHaveBeenCalledWith(['post-2', 'post-1']);
    });

    it('should handle errors gracefully when unpin fails', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onUnpin = jest.fn().mockRejectedValue(new Error('Unpin failed'));
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(
        <PinnedPostsSection 
          {...mockProps} 
          posts={pinnedPosts} 
          canModerate={true} 
          onUnpin={onUnpin}
        />
      );

      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      await user.click(settingsButton!);

      const unpinButton = screen.getByText('Unpin');
      await user.click(unpinButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to unpin post:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully when reorder fails', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onReorder = jest.fn().mockRejectedValue(new Error('Reorder failed'));
      const pinnedPosts = [
        createMockPost('post-1', true, 0),
        createMockPost('post-2', true, 1),
      ];

      render(
        <PinnedPostsSection 
          {...mockProps} 
          posts={pinnedPosts} 
          canModerate={true} 
          onReorder={onReorder}
        />
      );

      const settingsButtons = screen.getAllByTestId('settings-icon');
      await user.click(settingsButtons[0].closest('button')!);

      const moveDownButton = screen.getByText('Move Down');
      await user.click(moveDownButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to reorder posts:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Post Card Integration', () => {
    it('should pass correct props to RedditStylePostCard', () => {
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} />);

      const postCard = screen.getByTestId('post-card-post-1');
      expect(postCard).toHaveTextContent('Pinned: true');
    });

    it('should forward vote actions to post cards', () => {
      const onVote = jest.fn();
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} onVote={onVote} />);

      // The onVote prop should be passed to the RedditStylePostCard
      expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={true} />);

      expect(screen.getByRole('region', { name: 'Pinned posts' })).toBeInTheDocument();
      
      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      expect(settingsButton).toHaveAttribute('aria-label', 'Pin controls');
    });

    it('should have proper button titles', () => {
      const pinnedPosts = [createMockPost('post-1', true, 0)];

      render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} canModerate={true} />);

      const settingsButton = screen.getByTestId('settings-icon').closest('button');
      expect(settingsButton).toHaveAttribute('title', 'Manage pinned post');
    });
  });
});