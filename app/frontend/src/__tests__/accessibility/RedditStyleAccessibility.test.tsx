import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

import RedditStylePostCard from '@/components/RedditStylePostCard/RedditStylePostCard';
import CommunityHeader from '@/components/CommunityManagement/CommunityHeader';
import PostSortingTabs, { PostSortOption, TimeFilter } from '@/components/Community/PostSortingTabs';
import { AccessibilityProvider } from '@/components/Accessibility/AccessibilityProvider';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    article: ({ children, ...props }: any) => <article {...props}>{children}</article>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock components that aren't directly tested
jest.mock('@/components/RedditStylePostCard/MediaPreview', () => {
  return function MediaPreview({ url, alt }: any) {
    return <div data-testid="media-preview" aria-label={alt}>{url}</div>;
  };
});

jest.mock('@/components/RedditStylePostCard/PostMetadata', () => {
  return function PostMetadata({ author, createdAt, commentCount }: any) {
    return (
      <div data-testid="post-metadata">
        <span>By {author}</span>
        <span>{commentCount} comments</span>
      </div>
    );
  };
});

jest.mock('@/components/RedditStylePostCard/PostFlair', () => {
  return function PostFlair({ flair }: any) {
    return <span data-testid="post-flair">{flair?.name}</span>;
  };
});

jest.mock('@/components/RedditStylePostCard/ReportModal', () => {
  return function ReportModal({ isOpen, onClose, onSubmit }: any) {
    return isOpen ? (
      <div role="dialog" aria-label="Report post">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSubmit('spam', 'test details')}>Submit Report</button>
      </div>
    ) : null;
  };
});

jest.mock('@/hooks/useViewMode', () => ({
  getViewModeClasses: (viewMode: string) => ({
    postCard: 'post-card',
    content: 'content',
    voting: 'voting',
    main: 'main',
    title: 'title',
    metadata: 'metadata',
    actions: 'actions',
    thumbnail: 'thumbnail'
  }),
  shouldShowThumbnail: () => true,
  getThumbnailSize: () => 'medium'
}));

// Test wrapper with accessibility provider
const AccessibilityWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AccessibilityProvider>
    {children}
  </AccessibilityProvider>
);

// Mock data
const mockPost = {
  id: 'post-1',
  contentCid: 'Test post content',
  author: 'testuser',
  createdAt: new Date('2024-01-01'),
  upvotes: 10,
  downvotes: 2,
  comments: [{ id: 'comment-1', content: 'Test comment' }],
  mediaCids: ['https://example.com/image.jpg'],
  tags: ['test', 'accessibility'],
  isPinned: false,
  isLocked: false,
  flair: { id: 'flair-1', name: 'Discussion', color: '#blue' }
};

const mockCommunity = {
  id: 'community-1',
  name: 'testcommunity',
  displayName: 'Test Community',
  description: 'A test community for accessibility testing',
  bannerImage: 'https://example.com/banner.jpg',
  avatarImage: 'https://example.com/avatar.jpg',
  memberCount: 1500,
  onlineCount: 150,
  createdAt: new Date('2023-01-01'),
  isJoined: false,
  canModerate: false
};

describe('Reddit Style Components Accessibility', () => {
  describe('RedditStylePostCard', () => {
    const defaultProps = {
      post: mockPost,
      community: mockCommunity,
      onVote: jest.fn(),
      onSave: jest.fn(),
      onHide: jest.fn(),
      onReport: jest.fn(),
      onShare: jest.fn(),
      onComment: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibilityWrapper>
          <RedditStylePostCard {...defaultProps} />
        </AccessibilityWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', () => {
      render(
        <AccessibilityWrapper>
          <RedditStylePostCard {...defaultProps} />
        </AccessibilityWrapper>
      );

      // Check article role and labeling
      const article = screen.getByRole('article');
      expect(article).toBeInTheDocument();
      expect(article).toHaveAttribute('aria-labelledby');
      expect(article).toHaveAttribute('aria-describedby');

      // Check voting controls
      const upvoteButton = screen.getByRole('button', { name: /upvote/i });
      const downvoteButton = screen.getByRole('button', { name: /downvote/i });
      
      expect(upvoteButton).toHaveAttribute('aria-label');
      expect(upvoteButton).toHaveAttribute('aria-pressed', 'false');
      expect(downvoteButton).toHaveAttribute('aria-label');
      expect(downvoteButton).toHaveAttribute('aria-pressed', 'false');

      // Check vote score has proper labeling
      const voteScore = screen.getByRole('status');
      expect(voteScore).toHaveAttribute('aria-label');
      expect(voteScore).toHaveAttribute('aria-live', 'polite');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const mockOnComment = jest.fn();
      
      render(
        <AccessibilityWrapper>
          <RedditStylePostCard {...defaultProps} onComment={mockOnComment} />
        </AccessibilityWrapper>
      );

      const article = screen.getByRole('article');
      
      // Focus the article
      article.focus();
      expect(article).toHaveFocus();

      // Test Enter key for comments
      await user.keyboard('{Enter}');
      expect(mockOnComment).toHaveBeenCalledWith('post-1');
    });

    it('should announce vote changes to screen readers', async () => {
      const user = userEvent.setup();
      const mockOnVote = jest.fn();
      
      render(
        <AccessibilityWrapper>
          <RedditStylePostCard {...defaultProps} onVote={mockOnVote} />
        </AccessibilityWrapper>
      );

      const upvoteButton = screen.getByRole('button', { name: /upvote/i });
      
      await user.click(upvoteButton);
      
      expect(mockOnVote).toHaveBeenCalledWith('post-1', 'up');
      
      // Check that aria-pressed is updated
      await waitFor(() => {
        expect(upvoteButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('should have accessible menu with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibilityWrapper>
          <RedditStylePostCard {...defaultProps} />
        </AccessibilityWrapper>
      );

      const menuButton = screen.getByRole('button', { name: /more options/i });
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');

      // Open menu
      await user.click(menuButton);
      
      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
      
      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
      
      // Check menu items have proper roles
      const menuItems = screen.getAllByRole('menuitem');
      expect(menuItems.length).toBeGreaterThan(0);
    });

    it('should handle focus management for modals', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibilityWrapper>
          <RedditStylePostCard {...defaultProps} />
        </AccessibilityWrapper>
      );

      // Open report modal via keyboard
      const article = screen.getByRole('article');
      article.focus();
      await user.keyboard('r');

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-label', 'Report post');
    });

    it('should provide alternative text for images', () => {
      render(
        <AccessibilityWrapper>
          <RedditStylePostCard {...defaultProps} />
        </AccessibilityWrapper>
      );

      const thumbnail = screen.getByRole('img');
      expect(thumbnail).toHaveAttribute('alt');
      expect(thumbnail.getAttribute('alt')).toContain('Thumbnail for post');
    });
  });

  describe('CommunityHeader', () => {
    const defaultProps = {
      community: mockCommunity,
      isJoined: false,
      onJoinToggle: jest.fn(),
      canModerate: false,
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibilityWrapper>
          <CommunityHeader {...defaultProps} />
        </AccessibilityWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper semantic structure', () => {
      render(
        <AccessibilityWrapper>
          <CommunityHeader {...defaultProps} />
        </AccessibilityWrapper>
      );

      // Check header role and structure
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();

      // Check heading hierarchy
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Test Community');

      // Check join button
      const joinButton = screen.getByRole('button', { name: /join test community/i });
      expect(joinButton).toHaveAttribute('aria-pressed', 'false');
    });

    it('should announce membership changes', async () => {
      const user = userEvent.setup();
      const mockOnJoinToggle = jest.fn();
      
      render(
        <AccessibilityWrapper>
          <CommunityHeader {...defaultProps} onJoinToggle={mockOnJoinToggle} />
        </AccessibilityWrapper>
      );

      const joinButton = screen.getByRole('button', { name: /join test community/i });
      await user.click(joinButton);
      
      expect(mockOnJoinToggle).toHaveBeenCalled();
    });

    it('should have accessible file upload for moderators', () => {
      render(
        <AccessibilityWrapper>
          <CommunityHeader 
            {...defaultProps} 
            canModerate={true} 
            onBannerUpload={jest.fn()} 
          />
        </AccessibilityWrapper>
      );

      const uploadButton = screen.getByRole('button', { name: /change community banner/i });
      expect(uploadButton).toBeInTheDocument();

      const fileInput = screen.getByLabelText(/upload banner image file/i);
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });

    it('should provide meaningful statistics labels', () => {
      render(
        <AccessibilityWrapper>
          <CommunityHeader {...defaultProps} />
        </AccessibilityWrapper>
      );

      const statsGroup = screen.getByRole('group', { name: /community statistics/i });
      expect(statsGroup).toBeInTheDocument();

      // Check that member counts have proper labels
      expect(screen.getByText(/1.5K members/)).toBeInTheDocument();
      expect(screen.getByText(/150 online/)).toBeInTheDocument();
    });
  });

  describe('PostSortingTabs', () => {
    const defaultProps = {
      sortBy: PostSortOption.BEST,
      timeFilter: TimeFilter.DAY,
      onSortChange: jest.fn(),
      onTimeFilterChange: jest.fn(),
      postCount: 42,
    };

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <AccessibilityWrapper>
          <PostSortingTabs {...defaultProps} />
        </AccessibilityWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should implement proper tab navigation', () => {
      render(
        <AccessibilityWrapper>
          <PostSortingTabs {...defaultProps} />
        </AccessibilityWrapper>
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Sort posts by');

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(6); // Best, Hot, New, Top, Rising, Controversial

      // Check active tab
      const activeTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
      expect(activeTab).toHaveTextContent('Best');
      expect(activeTab).toHaveAttribute('tabindex', '0');

      // Check inactive tabs
      const inactiveTabs = tabs.filter(tab => tab.getAttribute('aria-selected') === 'false');
      inactiveTabs.forEach(tab => {
        expect(tab).toHaveAttribute('tabindex', '-1');
      });
    });

    it('should support keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      const mockOnSortChange = jest.fn();
      
      render(
        <AccessibilityWrapper>
          <PostSortingTabs {...defaultProps} onSortChange={mockOnSortChange} />
        </AccessibilityWrapper>
      );

      const tablist = screen.getByRole('tablist');
      tablist.focus();

      // Test arrow key navigation
      await user.keyboard('{ArrowRight}');
      expect(mockOnSortChange).toHaveBeenCalledWith(PostSortOption.HOT);

      await user.keyboard('{ArrowLeft}');
      expect(mockOnSortChange).toHaveBeenCalledWith(PostSortOption.CONTROVERSIAL);

      await user.keyboard('{Home}');
      expect(mockOnSortChange).toHaveBeenCalledWith(PostSortOption.BEST);

      await user.keyboard('{End}');
      expect(mockOnSortChange).toHaveBeenCalledWith(PostSortOption.CONTROVERSIAL);
    });

    it('should have accessible time filter dropdown', () => {
      render(
        <AccessibilityWrapper>
          <PostSortingTabs 
            {...defaultProps} 
            sortBy={PostSortOption.TOP} 
          />
        </AccessibilityWrapper>
      );

      const timeFilterSelect = screen.getByRole('combobox', { name: /select time period/i });
      expect(timeFilterSelect).toBeInTheDocument();
      expect(timeFilterSelect).toHaveAttribute('aria-label');

      const label = screen.getByText('Time:');
      expect(label).toBeInTheDocument();
    });

    it('should announce sort changes to screen readers', async () => {
      const user = userEvent.setup();
      const mockOnSortChange = jest.fn();
      
      render(
        <AccessibilityWrapper>
          <PostSortingTabs {...defaultProps} onSortChange={mockOnSortChange} />
        </AccessibilityWrapper>
      );

      const hotTab = screen.getByRole('tab', { name: /sort by hot/i });
      await user.click(hotTab);
      
      expect(mockOnSortChange).toHaveBeenCalledWith(PostSortOption.HOT);
    });

    it('should provide status information for post count and loading', () => {
      render(
        <AccessibilityWrapper>
          <PostSortingTabs {...defaultProps} />
        </AccessibilityWrapper>
      );

      const postCountStatus = screen.getByRole('status', { name: /42 posts found/i });
      expect(postCountStatus).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('should trap focus in modal dialogs', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibilityWrapper>
          <RedditStylePostCard 
            post={mockPost}
            community={mockCommunity}
            onVote={jest.fn()}
            onReport={jest.fn()}
          />
        </AccessibilityWrapper>
      );

      // Open report modal
      const article = screen.getByRole('article');
      article.focus();
      await user.keyboard('r');

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Focus should be trapped within the dialog
      const closeButton = screen.getByRole('button', { name: /close/i });
      const submitButton = screen.getByRole('button', { name: /submit report/i });

      // Tab should cycle between dialog elements
      await user.tab();
      expect(submitButton).toHaveFocus();

      await user.tab();
      expect(closeButton).toHaveFocus();
    });

    it('should restore focus when closing modals', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibilityWrapper>
          <RedditStylePostCard 
            post={mockPost}
            community={mockCommunity}
            onVote={jest.fn()}
            onReport={jest.fn()}
          />
        </AccessibilityWrapper>
      );

      const article = screen.getByRole('article');
      article.focus();
      
      // Open and close report modal
      await user.keyboard('r');
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      // Focus should return to the article
      expect(article).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide descriptive labels for all interactive elements', () => {
      render(
        <AccessibilityWrapper>
          <RedditStylePostCard 
            post={mockPost}
            community={mockCommunity}
            onVote={jest.fn()}
            onSave={jest.fn()}
            onShare={jest.fn()}
            onComment={jest.fn()}
          />
        </AccessibilityWrapper>
      );

      // Check that all buttons have descriptive labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button.getAttribute('aria-label')).toBeTruthy();
      });
    });

    it('should use live regions for dynamic content updates', () => {
      render(
        <AccessibilityWrapper>
          <PostSortingTabs 
            sortBy={PostSortOption.BEST}
            timeFilter={TimeFilter.DAY}
            onSortChange={jest.fn()}
            onTimeFilterChange={jest.fn()}
            postCount={42}
          />
        </AccessibilityWrapper>
      );

      // Check for live region
      const liveRegion = document.getElementById('accessibility-live-region');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });
  });
});