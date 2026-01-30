import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RedditStylePostCard from '../RedditStylePostCard';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onMouseEnter, onMouseLeave, ...props }: any) => (
      <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} {...props}>
        {children}
      </div>
    ),
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
  Flag: () => <div data-testid="flag">🚩</div>,
  Check: () => <div data-testid="check">✓</div>,
  X: () => <div data-testid="x">✕</div>,
  Undo2: () => <div data-testid="undo">↶</div>,
}));

// Mock the ReportModal component
jest.mock('../ReportModal', () => {
  return function MockReportModal({ isOpen, onClose, onSubmit, isLoading }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="report-modal">
        <h3>Report Post</h3>
        <button 
          onClick={() => onSubmit('spam', 'Test details')} 
          disabled={isLoading}
          data-testid="submit-report"
        >
          {isLoading ? 'Submitting...' : 'Submit Report'}
        </button>
        <button onClick={onClose} data-testid="close-report">
          Close
        </button>
      </div>
    );
  };
});

// Mock other components
jest.mock('../MediaPreview', () => {
  return function MockMediaPreview({ url }: any) {
    return <img src={url} alt="Post media" />;
  };
});

jest.mock('../PostMetadata', () => {
  return function MockPostMetadata({ author, community, flair, commentsCount }: any) {
    return (
      <div>
        <span>u/{author.slice(0, 8)}...</span>
        <span>r/{community?.name}</span>
        <span>{flair?.name}</span>
        <span>{commentsCount} comments</span>
      </div>
    );
  };
});

jest.mock('../PostFlair', () => {
  return function MockPostFlair({ flair }: any) {
    return <span>{flair.name}</span>;
  };
});

// Mock data
const mockPost = {
  id: 'test-post-1',
  contentCid: 'This is a test post content',
  author: '0x1234567890123456789012345678901234567890',
  createdAt: new Date('2024-01-01T12:00:00Z'),
  upvotes: 10,
  downvotes: 2,
  comments: [],
  tags: ['test', 'reddit'],
  flair: {
    id: 'discussion',
    name: 'Discussion',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    textColor: '#374151',
    moderatorOnly: false
  },
  mediaCids: [],
  isPinned: false,
  isLocked: false
};

const mockCommunity = {
  id: 'test-community',
  name: 'testcommunity',
  displayName: 'Test Community'
};

describe('Quick Actions Integration Tests', () => {
  const mockOnVote = jest.fn();
  const mockOnSave = jest.fn().mockResolvedValue(undefined);
  const mockOnHide = jest.fn().mockResolvedValue(undefined);
  const mockOnReport = jest.fn().mockResolvedValue(undefined);
  const mockOnShare = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows quick actions on hover and handles save action', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onSave={mockOnSave}
      />
    );

    // Find the main content area and trigger hover
    const mainContent = screen.getByText('This is a test post content').closest('.relative');
    expect(mainContent).toBeInTheDocument();

    // Trigger mouse enter event
    fireEvent.mouseEnter(mainContent!);

    // Quick actions should now be visible
    await waitFor(() => {
      expect(screen.getByTitle('Save')).toBeInTheDocument();
    });

    const saveButton = screen.getByTitle('Save');
    await user.click(saveButton);

    expect(mockOnSave).toHaveBeenCalledWith('test-post-1');
    
    // Check for save confirmation
    await waitFor(() => {
      expect(screen.getByText('Post saved!')).toBeInTheDocument();
    });
  });

  it('handles hide action with undo option', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onHide={mockOnHide}
      />
    );

    // Trigger hover
    const mainContent = screen.getByText('This is a test post content').closest('.relative');
    fireEvent.mouseEnter(mainContent!);

    await waitFor(() => {
      expect(screen.getByTitle('Hide')).toBeInTheDocument();
    });

    const hideButton = screen.getByTitle('Hide');
    await user.click(hideButton);

    expect(mockOnHide).toHaveBeenCalledWith('test-post-1');
    
    // Check for undo option
    await waitFor(() => {
      expect(screen.getByText('Post hidden from your feed')).toBeInTheDocument();
      expect(screen.getByText('Undo')).toBeInTheDocument();
    });

    // Test undo functionality
    const undoButton = screen.getByText('Undo');
    await user.click(undoButton);

    // Undo message should disappear
    await waitFor(() => {
      expect(screen.queryByText('Post hidden from your feed')).not.toBeInTheDocument();
    });
  });

  it('handles share action', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onShare={mockOnShare}
      />
    );

    // Trigger hover
    const mainContent = screen.getByText('This is a test post content').closest('.relative');
    fireEvent.mouseEnter(mainContent!);

    await waitFor(() => {
      expect(screen.getByTitle('Share')).toBeInTheDocument();
    });

    const shareButton = screen.getByTitle('Share');
    await user.click(shareButton);

    expect(mockOnShare).toHaveBeenCalledWith('test-post-1');
  });

  it('opens and handles report modal', async () => {
    const user = userEvent.setup();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onReport={mockOnReport}
      />
    );

    // Trigger hover
    const mainContent = screen.getByText('This is a test post content').closest('.relative');
    fireEvent.mouseEnter(mainContent!);

    await waitFor(() => {
      expect(screen.getByTitle('Report')).toBeInTheDocument();
    });

    const reportButton = screen.getByTitle('Report');
    await user.click(reportButton);

    // Report modal should be open
    await waitFor(() => {
      expect(screen.getByTestId('report-modal')).toBeInTheDocument();
    });
    expect(screen.getByText('Report Post')).toBeInTheDocument();

    // Submit report
    const submitButton = screen.getByTestId('submit-report');
    await user.click(submitButton);

    expect(mockOnReport).toHaveBeenCalledWith('test-post-1', 'spam', 'Test details');
  });

  it('shows actions in dropdown menu for accessibility', async () => {
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

    // All actions should be available in the dropdown
    await waitFor(() => {
      const saveButtons = screen.getAllByText('Save');
      const shareButtons = screen.getAllByText('Share');
      expect(saveButtons.length).toBeGreaterThan(0);
      expect(shareButtons.length).toBeGreaterThan(0);
      expect(screen.getByText('Hide')).toBeInTheDocument();
      expect(screen.getByText('Report')).toBeInTheDocument();
    });
  });

  it('handles share fallback to clipboard when no custom handler', async () => {
    const user = userEvent.setup();
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    
    // Mock navigator.clipboard
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        // No onShare prop - should use clipboard fallback
      />
    );

    // Trigger hover
    const mainContent = screen.getByText('This is a test post content').closest('.relative');
    fireEvent.mouseEnter(mainContent!);

    await waitFor(() => {
      expect(screen.getByTitle('Share')).toBeInTheDocument();
    });

    const shareButton = screen.getByTitle('Share');
    await user.click(shareButton);

    expect(mockWriteText).toHaveBeenCalledWith(window.location.href);

    // Restore original
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    });
  });

  it('prevents multiple rapid actions while processing', async () => {
    const user = userEvent.setup();
    let resolvePromise: () => void;
    const slowOnSave = jest.fn().mockImplementation(() => 
      new Promise<void>(resolve => {
        resolvePromise = resolve;
      })
    );
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onSave={slowOnSave}
      />
    );

    // Trigger hover
    const mainContent = screen.getByText('This is a test post content').closest('.relative');
    fireEvent.mouseEnter(mainContent!);

    await waitFor(() => {
      expect(screen.getByTitle('Save')).toBeInTheDocument();
    });

    const saveButton = screen.getByTitle('Save');
    
    // Click multiple times rapidly
    await user.click(saveButton);
    await user.click(saveButton);
    await user.click(saveButton);
    
    // Should only call once due to isProcessingAction state
    expect(slowOnSave).toHaveBeenCalledTimes(1);

    // Resolve the promise to complete the test
    resolvePromise!();
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(screen.getByText('Post saved!')).toBeInTheDocument();
    });
  });

  it('handles action errors gracefully', async () => {
    const user = userEvent.setup();
    const failingOnSave = jest.fn().mockRejectedValue(new Error('Save failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(
      <RedditStylePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onSave={failingOnSave}
      />
    );

    // Trigger hover
    const mainContent = screen.getByText('This is a test post content').closest('.relative');
    fireEvent.mouseEnter(mainContent!);

    await waitFor(() => {
      expect(screen.getByTitle('Save')).toBeInTheDocument();
    });

    const saveButton = screen.getByTitle('Save');
    await user.click(saveButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Save failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});