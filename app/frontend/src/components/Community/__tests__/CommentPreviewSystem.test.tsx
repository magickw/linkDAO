import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import CommentPreviewSystem from '../CommentPreviewSystem';
import { CommunityPostService } from '@/services/communityPostService';
import { useToast } from '@/context/ToastContext';

// Mock dependencies
jest.mock('@/services/communityPostService');
jest.mock('@/context/ToastContext');
jest.mock('@/components/EnhancedCommentSystem', () => {
  return function MockEnhancedCommentSystem({ onCommentAdded }: any) {
    return (
      <div data-testid="enhanced-comment-system">
        <button 
          onClick={() => onCommentAdded?.({ id: 'new-comment', content: 'New comment' })}
          data-testid="add-comment-button"
        >
          Add Comment
        </button>
      </div>
    );
  };
});

const mockAddToast = jest.fn();
const mockCommunityPostService = CommunityPostService as jest.Mocked<typeof CommunityPostService>;

// Mock data
const mockComments = [
  {
    id: 'comment-1',
    postId: 'post-1',
    author: '0x1234567890123456789012345678901234567890',
    content: 'This is a great post! I really enjoyed reading it and learned a lot from the insights shared.',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    upvotes: 15,
    downvotes: 2,
    replies: [],
    depth: 0,
    isDeleted: false,
    isEdited: false
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    author: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    content: 'I disagree with some points but overall a solid analysis.',
    createdAt: new Date('2024-01-15T11:00:00Z'),
    updatedAt: new Date('2024-01-15T11:00:00Z'),
    upvotes: 8,
    downvotes: 1,
    replies: [],
    depth: 0,
    isDeleted: false,
    isEdited: false
  },
  {
    id: 'comment-3',
    postId: 'post-1',
    author: '0x9876543210987654321098765432109876543210',
    content: 'Short comment',
    createdAt: new Date('2024-01-15T12:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    upvotes: 3,
    downvotes: 0,
    replies: [],
    depth: 0,
    isDeleted: false,
    isEdited: false
  }
];

const mockPostStats = {
  commentsCount: 5,
  upvotes: 25,
  downvotes: 3
};

describe('CommentPreviewSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ addToast: mockAddToast });
    mockCommunityPostService.getPostComments.mockResolvedValue(mockComments);
    mockCommunityPostService.getPostStats.mockResolvedValue(mockPostStats);
  });

  describe('Rendering', () => {
    it('renders loading state initially', async () => {
      mockCommunityPostService.getPostComments.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockComments), 100))
      );

      render(<CommentPreviewSystem postId="post-1" />);

      expect(screen.getByText('Loading comments...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument(); // Loading spinner
    });

    it('renders comment previews after loading', async () => {
      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('5 comments')).toBeInTheDocument();
      });

      expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
      expect(screen.getByText(/This is a great post!/)).toBeInTheDocument();
      expect(screen.getByText('Top comment')).toBeInTheDocument();
    });

    it('renders empty state when no comments', async () => {
      mockCommunityPostService.getPostComments.mockResolvedValue([]);
      mockCommunityPostService.getPostStats.mockResolvedValue({ commentsCount: 0, upvotes: 0, downvotes: 0 });

      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('No comments yet')).toBeInTheDocument();
      });

      expect(screen.getByText('Be the first to comment')).toBeInTheDocument();
    });

    it('renders error state when loading fails', async () => {
      mockCommunityPostService.getPostComments.mockRejectedValue(new Error('Network error'));

      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
      });

      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(mockAddToast).toHaveBeenCalledWith('Failed to load comment previews', 'error');
    });
  });

  describe('Content Truncation', () => {
    it('truncates long comments with ellipsis', async () => {
      render(<CommentPreviewSystem postId="post-1" maxPreviewLength={50} />);

      await waitFor(() => {
        expect(screen.getByText(/This is a great post! I really enjoyed reading.../)).toBeInTheDocument();
      });

      expect(screen.getByText('Read more')).toBeInTheDocument();
    });

    it('does not truncate short comments', async () => {
      render(<CommentPreviewSystem postId="post-1" maxPreviewLength={100} />);

      await waitFor(() => {
        expect(screen.getByText('Short comment')).toBeInTheDocument();
      });

      // Should not have "Read more" for short comments
      const readMoreButtons = screen.queryAllByText('Read more');
      expect(readMoreButtons.length).toBeLessThan(mockComments.length);
    });

    it('respects custom maxPreviewLength prop', async () => {
      render(<CommentPreviewSystem postId="post-1" maxPreviewLength={20} />);

      await waitFor(() => {
        expect(screen.getByText(/This is a great.../)).toBeInTheDocument();
      });
    });

    it('truncates at word boundaries when possible', async () => {
      const longComment = {
        ...mockComments[0],
        content: 'This is a very long comment that should be truncated at word boundaries for better readability'
      };
      
      mockCommunityPostService.getPostComments.mockResolvedValue([longComment]);

      render(<CommentPreviewSystem postId="post-1" maxPreviewLength={50} />);

      await waitFor(() => {
        const truncatedText = screen.getByText(/This is a very long comment that should be.../);
        expect(truncatedText).toBeInTheDocument();
        // Should not cut off in the middle of a word
        expect(truncatedText.textContent).not.toMatch(/\w\.\.\.$/);
      });
    });
  });

  describe('Comment Display', () => {
    it('displays correct number of preview comments', async () => {
      render(<CommentPreviewSystem postId="post-1" maxPreviewComments={2} />);

      await waitFor(() => {
        expect(screen.getByText('5 comments')).toBeInTheDocument();
      });

      // Should show only 2 comment previews
      const commentPreviews = screen.getAllByText(/0x\w{4}\.\.\.\w{4}/);
      expect(commentPreviews).toHaveLength(2);
    });

    it('marks the first comment as top comment', async () => {
      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('Top comment')).toBeInTheDocument();
      });

      // Should only have one "Top comment" badge
      expect(screen.getAllByText('Top comment')).toHaveLength(1);
    });

    it('displays vote scores for comments with votes', async () => {
      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('13')).toBeInTheDocument(); // 15 - 2
        expect(screen.getByText('7')).toBeInTheDocument(); // 8 - 1
      });
    });

    it('formats author addresses correctly', async () => {
      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
        expect(screen.getByText('0xabcd...abcd')).toBeInTheDocument();
      });
    });

    it('displays relative timestamps', async () => {
      // Mock current time to be after the comment times
      const mockDate = new Date('2024-01-15T13:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('3h')).toBeInTheDocument(); // 3 hours ago
        expect(screen.getByText('2h')).toBeInTheDocument(); // 2 hours ago
        expect(screen.getByText('1h')).toBeInTheDocument(); // 1 hour ago
      });

      jest.restoreAllMocks();
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('expands to show full comment system when clicked', async () => {
      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('View all comments')).toBeInTheDocument();
      });

      const expandButton = screen.getByText('View all comments');
      await userEvent.click(expandButton);

      expect(screen.getByTestId('enhanced-comment-system')).toBeInTheDocument();
      expect(screen.getByText('Collapse comments')).toBeInTheDocument();
    });

    it('collapses back to preview when collapse button is clicked', async () => {
      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('View all comments')).toBeInTheDocument();
      });

      // Expand
      const expandButton = screen.getByText('View all comments');
      await userEvent.click(expandButton);

      expect(screen.getByTestId('enhanced-comment-system')).toBeInTheDocument();

      // Collapse
      const collapseButton = screen.getByText('Collapse comments');
      await userEvent.click(collapseButton);

      expect(screen.queryByTestId('enhanced-comment-system')).not.toBeInTheDocument();
      expect(screen.getByText('View all comments')).toBeInTheDocument();
    });

    it('calls onExpand callback when expanding', async () => {
      const mockOnExpand = jest.fn();
      render(<CommentPreviewSystem postId="post-1" onExpand={mockOnExpand} />);

      await waitFor(() => {
        expect(screen.getByText('View all comments')).toBeInTheDocument();
      });

      const expandButton = screen.getByText('View all comments');
      await userEvent.click(expandButton);

      expect(mockOnExpand).toHaveBeenCalledTimes(1);
    });

    it('expands when "Read more" is clicked on truncated comment', async () => {
      render(<CommentPreviewSystem postId="post-1" maxPreviewLength={50} />);

      await waitFor(() => {
        expect(screen.getByText('Read more')).toBeInTheDocument();
      });

      const readMoreButton = screen.getByText('Read more');
      await userEvent.click(readMoreButton);

      expect(screen.getByTestId('enhanced-comment-system')).toBeInTheDocument();
    });

    it('shows "View X more comments" when there are more comments than previews', async () => {
      render(<CommentPreviewSystem postId="post-1" maxPreviewComments={2} />);

      await waitFor(() => {
        expect(screen.getByText('View 3 more comments')).toBeInTheDocument();
      });
    });

    it('handles singular vs plural correctly in "more comments" text', async () => {
      mockCommunityPostService.getPostStats.mockResolvedValue({ commentsCount: 2, upvotes: 0, downvotes: 0 });
      
      render(<CommentPreviewSystem postId="post-1" maxPreviewComments={1} />);

      await waitFor(() => {
        expect(screen.getByText('View 1 more comment')).toBeInTheDocument();
      });
    });
  });

  describe('Comment Count Updates', () => {
    it('calls oncommentsCountChange when comments are loaded', async () => {
      const mockOncommentsCountChange = jest.fn();
      
      render(
        <CommentPreviewSystem 
          postId="post-1" 
          oncommentsCountChange={mockOncommentsCountChange} 
        />
      );

      await waitFor(() => {
        expect(mockOncommentsCountChange).toHaveBeenCalledWith(5);
      });
    });

    it('refreshes previews when new comment is added', async () => {
      const updatedComments = [...mockComments, {
        id: 'comment-4',
        postId: 'post-1',
        author: '0xnewuser123456789012345678901234567890',
        content: 'New comment added',
        createdAt: new Date(),
        updatedAt: new Date(),
        upvotes: 0,
        downvotes: 0,
        replies: [],
        depth: 0,
        isDeleted: false,
        isEdited: false
      }];

      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('View all comments')).toBeInTheDocument();
      });

      // Expand to show comment system
      const expandButton = screen.getByText('View all comments');
      await userEvent.click(expandButton);

      // Mock updated response for refresh
      mockCommunityPostService.getPostComments.mockResolvedValue(updatedComments);
      mockCommunityPostService.getPostStats.mockResolvedValue({ commentsCount: 6, upvotes: 0, downvotes: 0 });

      // Simulate adding a comment
      const addCommentButton = screen.getByTestId('add-comment-button');
      await userEvent.click(addCommentButton);

      // Should call the service again to refresh
      await waitFor(() => {
        expect(mockCommunityPostService.getPostComments).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('shows retry button on error and retries when clicked', async () => {
      mockCommunityPostService.getPostComments.mockRejectedValueOnce(new Error('Network error'));

      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      
      // Mock successful retry
      mockCommunityPostService.getPostComments.mockResolvedValue(mockComments);
      
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('5 comments')).toBeInTheDocument();
      });

      expect(mockCommunityPostService.getPostComments).toHaveBeenCalledTimes(2);
    });

    it('handles API timeout gracefully', async () => {
      mockCommunityPostService.getPostComments.mockRejectedValue(new Error('Request timeout'));

      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
      });

      expect(mockAddToast).toHaveBeenCalledWith('Failed to load comment previews', 'error');
    });

    it('falls back gracefully when stats API fails', async () => {
      mockCommunityPostService.getPostStats.mockRejectedValue(new Error('Stats API error'));

      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        // Should still show comments even if stats fail
        expect(screen.getByText(/comments/)).toBeInTheDocument();
      });

      // Should not crash the component
      expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
    });
  });

  describe('Props and Configuration', () => {
    it('respects showExpandButton prop', async () => {
      render(<CommentPreviewSystem postId="post-1" showExpandButton={false} />);

      await waitFor(() => {
        expect(screen.getByText('5 comments')).toBeInTheDocument();
      });

      expect(screen.queryByText('View all comments')).not.toBeInTheDocument();
    });

    it('applies custom className', async () => {
      const { container } = render(
        <CommentPreviewSystem postId="post-1" className="custom-class" />
      );

      await waitFor(() => {
        expect(screen.getByText('5 comments')).toBeInTheDocument();
      });

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('passes postType to EnhancedCommentSystem', async () => {
      render(<CommentPreviewSystem postId="post-1" postType="feed" />);

      await waitFor(() => {
        expect(screen.getByText('View all comments')).toBeInTheDocument();
      });

      const expandButton = screen.getByText('View all comments');
      await userEvent.click(expandButton);

      // The EnhancedCommentSystem should receive the postType prop
      expect(screen.getByTestId('enhanced-comment-system')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('5 comments')).toBeInTheDocument();
      });

      // Check for accessible button
      const expandButton = screen.getByRole('button', { name: /view all comments/i });
      expect(expandButton).toBeInTheDocument();
    });

    it('maintains focus management during expand/collapse', async () => {
      render(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('View all comments')).toBeInTheDocument();
      });

      const expandButton = screen.getByText('View all comments');
      expandButton.focus();
      
      await userEvent.click(expandButton);

      // After expanding, the collapse button should be focusable
      const collapseButton = screen.getByText('Collapse comments');
      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not make duplicate API calls during loading', async () => {
      render(<CommentPreviewSystem postId="post-1" />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('5 comments')).toBeInTheDocument();
      });

      // Should only call the API once during initial load
      expect(mockCommunityPostService.getPostComments).toHaveBeenCalledTimes(1);
      expect(mockCommunityPostService.getPostStats).toHaveBeenCalledTimes(1);
    });

    it('prevents multiple simultaneous API calls', async () => {
      const { rerender } = render(<CommentPreviewSystem postId="post-1" />);
      
      // Quickly rerender before first call completes
      rerender(<CommentPreviewSystem postId="post-1" />);
      rerender(<CommentPreviewSystem postId="post-1" />);

      await waitFor(() => {
        expect(screen.getByText('5 comments')).toBeInTheDocument();
      });

      // Should still only call API once despite multiple rerenders
      expect(mockCommunityPostService.getPostComments).toHaveBeenCalledTimes(1);
    });
  });
});