import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import CommentPreviewSystem from '../CommentPreviewSystem';
import { CommunityPostService } from '@/services/communityPostService';
import { useToast } from '@/context/ToastContext';

// Mock dependencies
jest.mock('@/services/communityPostService');
jest.mock('@/context/ToastContext');
jest.mock('@/components/EnhancedCommentSystem', () => {
  return function MockEnhancedCommentSystem() {
    return <div data-testid="enhanced-comment-system">Enhanced Comment System</div>;
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
    content: 'Short comment',
    createdAt: new Date('2024-01-15T11:00:00Z'),
    updatedAt: new Date('2024-01-15T11:00:00Z'),
    upvotes: 8,
    downvotes: 1,
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

describe('CommentPreviewSystem - Core Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ addToast: mockAddToast });
    mockCommunityPostService.getPostComments.mockResolvedValue(mockComments);
    mockCommunityPostService.getPostStats.mockResolvedValue(mockPostStats);
  });

  it('renders comment previews with correct content', async () => {
    render(<CommentPreviewSystem postId="post-1" />);

    await waitFor(() => {
      expect(screen.getByText('5 comments')).toBeInTheDocument();
    });

    // Check if comments are displayed
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();
    expect(screen.getByText(/This is a great post!/)).toBeInTheDocument();
    expect(screen.getByText('Top comment')).toBeInTheDocument();
  });

  it('truncates long comments with ellipsis', async () => {
    render(<CommentPreviewSystem postId="post-1" maxPreviewLength={50} />);

    await waitFor(() => {
      expect(screen.getByText(/This is a great post! I really enjoyed reading.../)).toBeInTheDocument();
    });

    expect(screen.getByText('Read more')).toBeInTheDocument();
  });

  it('expands to show full comment system when expand button is clicked', async () => {
    const user = userEvent.setup();
    render(<CommentPreviewSystem postId="post-1" />);

    await waitFor(() => {
      expect(screen.getByText('View all comments')).toBeInTheDocument();
    });

    const expandButton = screen.getByText('View all comments');
    await user.click(expandButton);

    expect(screen.getByTestId('enhanced-comment-system')).toBeInTheDocument();
    expect(screen.getByText('Collapse comments')).toBeInTheDocument();
  });

  it('handles empty state correctly', async () => {
    mockCommunityPostService.getPostComments.mockResolvedValue([]);
    mockCommunityPostService.getPostStats.mockResolvedValue({ commentsCount: 0, upvotes: 0, downvotes: 0 });

    render(<CommentPreviewSystem postId="post-1" />);

    await waitFor(() => {
      expect(screen.getByText('No comments yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Be the first to comment')).toBeInTheDocument();
  });

  it('handles error state with retry functionality', async () => {
    const user = userEvent.setup();
    mockCommunityPostService.getPostComments.mockRejectedValueOnce(new Error('Network error'));

    render(<CommentPreviewSystem postId="post-1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(mockAddToast).toHaveBeenCalledWith('Failed to load comment previews', 'error');

    // Test retry functionality
    mockCommunityPostService.getPostComments.mockResolvedValue(mockComments);
    
    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('5 comments')).toBeInTheDocument();
    });
  });

  it('respects maxPreviewComments prop', async () => {
    render(<CommentPreviewSystem postId="post-1" maxPreviewComments={1} />);

    await waitFor(() => {
      expect(screen.getByText('5 comments')).toBeInTheDocument();
    });

    // Should show only 1 comment preview
    const commentPreviews = screen.getAllByText(/0x\w{4}\.\.\.\w{4}/);
    expect(commentPreviews).toHaveLength(1);

    // Should show "View X more comments"
    expect(screen.getByText('View 4 more comments')).toBeInTheDocument();
  });

  it('calls oncommentsCountChange callback', async () => {
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

  it('calls onExpand callback when expanding', async () => {
    const user = userEvent.setup();
    const mockOnExpand = jest.fn();
    
    render(<CommentPreviewSystem postId="post-1" onExpand={mockOnExpand} />);

    await waitFor(() => {
      expect(screen.getByText('View all comments')).toBeInTheDocument();
    });

    const expandButton = screen.getByText('View all comments');
    await user.click(expandButton);

    expect(mockOnExpand).toHaveBeenCalledTimes(1);
  });

  it('hides expand button when showExpandButton is false', async () => {
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
});