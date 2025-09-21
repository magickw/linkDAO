import React from 'react';
import { render, screen } from '@testing-library/react';
import PinnedPostsSection from '../PinnedPostsSection';
import { CommunityPost } from '@/models/CommunityPost';

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
  default: ({ post }: any) => (
    <div data-testid={`post-card-${post.id}`}>
      Post: {post.contentCid}
    </div>
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Pin: () => <div>Pin</div>,
  ChevronUp: () => <div>Up</div>,
  ChevronDown: () => <div>Down</div>,
  X: () => <div>X</div>,
  Settings: () => <div>Settings</div>,
}));

describe('PinnedPostsSection - Display Limits', () => {
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
    onVote: jest.fn(),
  };

  it('should display maximum of 3 pinned posts', () => {
    // Create 5 pinned posts
    const pinnedPosts = [
      createMockPost('post-1', true, 0),
      createMockPost('post-2', true, 1),
      createMockPost('post-3', true, 2),
      createMockPost('post-4', true, 3),
      createMockPost('post-5', true, 4),
    ];

    render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} />);

    // Should only display first 3 posts
    expect(screen.getByTestId('post-card-post-1')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-post-2')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-post-3')).toBeInTheDocument();
    
    // Should not display posts 4 and 5
    expect(screen.queryByTestId('post-card-post-4')).not.toBeInTheDocument();
    expect(screen.queryByTestId('post-card-post-5')).not.toBeInTheDocument();

    // Should show correct count
    expect(screen.getByText('(3/3)')).toBeInTheDocument();
  });

  it('should sort pinned posts by sortOrder before limiting', () => {
    // Create posts with mixed sortOrder
    const pinnedPosts = [
      createMockPost('post-high', true, 10), // Should not be displayed (4th in order)
      createMockPost('post-low', true, 1),   // Should be 2nd
      createMockPost('post-zero', true, 0),  // Should be 1st
      createMockPost('post-mid', true, 5),   // Should be 3rd
    ];

    render(<PinnedPostsSection {...mockProps} posts={pinnedPosts} />);

    // Should display posts in sortOrder, limited to 3
    expect(screen.getByTestId('post-card-post-zero')).toBeInTheDocument();  // sortOrder 0
    expect(screen.getByTestId('post-card-post-low')).toBeInTheDocument();   // sortOrder 1
    expect(screen.getByTestId('post-card-post-mid')).toBeInTheDocument();   // sortOrder 5
    
    // Should not display the highest sortOrder post
    expect(screen.queryByTestId('post-card-post-high')).not.toBeInTheDocument(); // sortOrder 10

    expect(screen.getByText('(3/3)')).toBeInTheDocument();
  });

  it('should filter out non-pinned posts', () => {
    const mixedPosts = [
      createMockPost('pinned-1', true, 0),
      createMockPost('regular-1', false, 0),
      createMockPost('pinned-2', true, 1),
      createMockPost('regular-2', false, 1),
    ];

    render(<PinnedPostsSection {...mockProps} posts={mixedPosts} />);

    // Should only display pinned posts
    expect(screen.getByTestId('post-card-pinned-1')).toBeInTheDocument();
    expect(screen.getByTestId('post-card-pinned-2')).toBeInTheDocument();
    
    // Should not display regular posts
    expect(screen.queryByTestId('post-card-regular-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('post-card-regular-2')).not.toBeInTheDocument();

    expect(screen.getByText('(2/3)')).toBeInTheDocument();
  });

  it('should not render section when no pinned posts exist', () => {
    const regularPosts = [
      createMockPost('regular-1', false, 0),
      createMockPost('regular-2', false, 1),
    ];

    const { container } = render(<PinnedPostsSection {...mockProps} posts={regularPosts} />);

    // Should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('should handle empty posts array', () => {
    const { container } = render(<PinnedPostsSection {...mockProps} posts={[]} />);

    // Should not render anything
    expect(container.firstChild).toBeNull();
  });

  it('should display correct count for different numbers of pinned posts', () => {
    // Test with 1 pinned post
    const onePinnedPost = [createMockPost('post-1', true, 0)];
    const { rerender } = render(<PinnedPostsSection {...mockProps} posts={onePinnedPost} />);
    expect(screen.getByText('(1/3)')).toBeInTheDocument();

    // Test with 2 pinned posts
    const twoPinnedPosts = [
      createMockPost('post-1', true, 0),
      createMockPost('post-2', true, 1),
    ];
    rerender(<PinnedPostsSection {...mockProps} posts={twoPinnedPosts} />);
    expect(screen.getByText('(2/3)')).toBeInTheDocument();

    // Test with 3 pinned posts
    const threePinnedPosts = [
      createMockPost('post-1', true, 0),
      createMockPost('post-2', true, 1),
      createMockPost('post-3', true, 2),
    ];
    rerender(<PinnedPostsSection {...mockProps} posts={threePinnedPosts} />);
    expect(screen.getByText('(3/3)')).toBeInTheDocument();
  });
});