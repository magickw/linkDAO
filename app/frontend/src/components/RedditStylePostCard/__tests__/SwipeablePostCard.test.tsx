import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import SwipeablePostCard from '../SwipeablePostCard';
import { CommunityPost } from '@/models/CommunityPost';
import { Community } from '@/models/Community';

// Mock the hooks
jest.mock('@/hooks/useSwipeGestures', () => ({
  usePostCardSwipeGestures: jest.fn(() => ({
    swipeState: {
      isActive: false,
      direction: null,
      distance: 0,
      velocity: 0,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    },
    swipeHandlers: {
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
      onTouchCancel: jest.fn()
    },
    resetSwipe: jest.fn(),
    isSwipeSupported: true
  }))
}));

jest.mock('@/hooks/useMobileAccessibility', () => ({
  useMobileAccessibility: jest.fn(() => ({
    announceToScreenReader: jest.fn(),
    manageFocus: jest.fn(),
    enhanceTouchTargets: jest.fn(),
    applyHighContrastMode: jest.fn(),
    accessibilityClasses: '',
    isScreenReaderActive: false,
    prefersReducedMotion: false,
    prefersHighContrast: false,
    prefersLargeText: false,
    colorScheme: 'light' as const,
    textSize: 'normal' as const
  }))
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock RedditStylePostCard
jest.mock('../RedditStylePostCard', () => {
  return function MockRedditStylePostCard(props: any) {
    return (
      <div data-testid="reddit-style-post-card">
        <div>Post: {props.post.contentCid}</div>
        <button onClick={() => props.onVote(props.post.id, 'up')}>Upvote</button>
        <button onClick={() => props.onVote(props.post.id, 'down')}>Downvote</button>
        {props.onSave && <button onClick={() => props.onSave(props.post.id)}>Save</button>}
        {props.onShare && <button onClick={() => props.onShare(props.post.id)}>Share</button>}
      </div>
    );
  };
});

const mockPost: CommunityPost = {
  id: 'post-1',
  contentCid: 'Test post content',
  author: 'testuser',
  createdAt: new Date('2024-01-01'),
  upvotes: 10,
  downvotes: 2,
  comments: [],
  tags: ['test'],
  mediaCids: [],
  isPinned: false,
  isLocked: false
};

const mockCommunity: Community = {
  id: 'community-1',
  name: 'Test Community',
  description: 'A test community',
  memberCount: 100,
  createdAt: new Date('2024-01-01'),
  isJoined: false
};

describe('SwipeablePostCard', () => {
  const mockOnVote = jest.fn();
  const mockOnSave = jest.fn();
  const mockOnShare = jest.fn();
  const mockOnComment = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the post card correctly', () => {
    render(
      <SwipeablePostCard
        post={mockPost}
        community={mockCommunity}
        onVote={mockOnVote}
        onSave={mockOnSave}
        onShare={mockOnShare}
        onComment={mockOnComment}
      />
    );

    expect(screen.getByTestId('reddit-style-post-card')).toBeInTheDocument();
    expect(screen.getByText('Post: Test post content')).toBeInTheDocument();
  });

  it('should show swipe instructions for screen readers', () => {
    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    expect(screen.getByText(/Swipe left to vote, swipe right to save or share/)).toBeInTheDocument();
  });

  it('should handle vote actions through regular buttons', async () => {
    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
      />
    );

    const upvoteButton = screen.getByText('Upvote');
    const downvoteButton = screen.getByText('Downvote');

    fireEvent.click(upvoteButton);
    expect(mockOnVote).toHaveBeenCalledWith('post-1', 'up');

    fireEvent.click(downvoteButton);
    expect(mockOnVote).toHaveBeenCalledWith('post-1', 'down');
  });

  it('should handle save action through regular button', async () => {
    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    expect(mockOnSave).toHaveBeenCalledWith('post-1');
  });

  it('should handle share action through regular button', async () => {
    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
        onShare={mockOnShare}
      />
    );

    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);
    expect(mockOnShare).toHaveBeenCalledWith('post-1');
  });

  it('should fallback to regular post card when swipe is not supported', () => {
    const { usePostCardSwipeGestures } = require('@/hooks/useSwipeGestures');
    usePostCardSwipeGestures.mockReturnValue({
      swipeState: {
        isActive: false,
        direction: null,
        distance: 0,
        velocity: 0,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      },
      swipeHandlers: {
        onTouchStart: jest.fn(),
        onTouchMove: jest.fn(),
        onTouchEnd: jest.fn(),
        onTouchCancel: jest.fn()
      },
      resetSwipe: jest.fn(),
      isSwipeSupported: false
    });

    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
      />
    );

    expect(screen.getByTestId('reddit-style-post-card')).toBeInTheDocument();
  });

  it('should fallback to regular post card when swipe is disabled', () => {
    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
        enableSwipeGestures={false}
      />
    );

    expect(screen.getByTestId('reddit-style-post-card')).toBeInTheDocument();
  });

  it('should handle touch events when swipe is supported', () => {
    const mockSwipeHandlers = {
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
      onTouchCancel: jest.fn()
    };

    const { usePostCardSwipeGestures } = require('@/hooks/useSwipeGestures');
    usePostCardSwipeGestures.mockReturnValue({
      swipeState: {
        isActive: false,
        direction: null,
        distance: 0,
        velocity: 0,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      },
      swipeHandlers: mockSwipeHandlers,
      resetSwipe: jest.fn(),
      isSwipeSupported: true
    });

    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
      />
    );

    const cardContainer = screen.getByTestId('reddit-style-post-card').parentElement;
    
    // Simulate touch events
    const touchEvent = {
      touches: [{ clientX: 100, clientY: 100 }]
    };

    fireEvent.touchStart(cardContainer!, touchEvent);
    expect(mockSwipeHandlers.onTouchStart).toHaveBeenCalled();

    fireEvent.touchMove(cardContainer!, touchEvent);
    expect(mockSwipeHandlers.onTouchMove).toHaveBeenCalled();

    fireEvent.touchEnd(cardContainer!, {});
    expect(mockSwipeHandlers.onTouchEnd).toHaveBeenCalled();
  });

  it('should show swipe visual feedback during active swipe', () => {
    const { usePostCardSwipeGestures } = require('@/hooks/useSwipeGestures');
    usePostCardSwipeGestures.mockReturnValue({
      swipeState: {
        isActive: true,
        direction: 'left',
        distance: 80,
        velocity: 0.5,
        startX: 100,
        startY: 100,
        currentX: 20,
        currentY: 100
      },
      swipeHandlers: {
        onTouchStart: jest.fn(),
        onTouchMove: jest.fn(),
        onTouchEnd: jest.fn(),
        onTouchCancel: jest.fn()
      },
      resetSwipe: jest.fn(),
      isSwipeSupported: true
    });

    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
      />
    );

    // Should show upvote feedback for left swipe with distance < 100
    const swipeFeedback = screen.getByText('Upvote').closest('.absolute.inset-0');
    expect(swipeFeedback).toBeInTheDocument();
  });

  it('should show downvote feedback for long left swipe', () => {
    const { usePostCardSwipeGestures } = require('@/hooks/useSwipeGestures');
    usePostCardSwipeGestures.mockReturnValue({
      swipeState: {
        isActive: true,
        direction: 'left',
        distance: 120,
        velocity: 0.5,
        startX: 200,
        startY: 100,
        currentX: 80,
        currentY: 100
      },
      swipeHandlers: {
        onTouchStart: jest.fn(),
        onTouchMove: jest.fn(),
        onTouchEnd: jest.fn(),
        onTouchCancel: jest.fn()
      },
      resetSwipe: jest.fn(),
      isSwipeSupported: true
    });

    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
      />
    );

    // Should show downvote feedback for left swipe with distance > 100
    const swipeFeedback = screen.getByText('Downvote').closest('.absolute.inset-0');
    expect(swipeFeedback).toBeInTheDocument();
  });

  it('should show save feedback for right swipe', () => {
    const { usePostCardSwipeGestures } = require('@/hooks/useSwipeGestures');
    usePostCardSwipeGestures.mockReturnValue({
      swipeState: {
        isActive: true,
        direction: 'right',
        distance: 80,
        velocity: 0.5,
        startX: 100,
        startY: 100,
        currentX: 180,
        currentY: 100
      },
      swipeHandlers: {
        onTouchStart: jest.fn(),
        onTouchMove: jest.fn(),
        onTouchEnd: jest.fn(),
        onTouchCancel: jest.fn()
      },
      resetSwipe: jest.fn(),
      isSwipeSupported: true
    });

    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
        onSave={mockOnSave}
      />
    );

    // Should show save feedback for right swipe with distance < 100
    const swipeFeedback = screen.getByText('Save').closest('.absolute.inset-0');
    expect(swipeFeedback).toBeInTheDocument();
  });

  it('should show share feedback for long right swipe', () => {
    const { usePostCardSwipeGestures } = require('@/hooks/useSwipeGestures');
    usePostCardSwipeGestures.mockReturnValue({
      swipeState: {
        isActive: true,
        direction: 'right',
        distance: 120,
        velocity: 0.5,
        startX: 100,
        startY: 100,
        currentX: 220,
        currentY: 100
      },
      swipeHandlers: {
        onTouchStart: jest.fn(),
        onTouchMove: jest.fn(),
        onTouchEnd: jest.fn(),
        onTouchCancel: jest.fn()
      },
      resetSwipe: jest.fn(),
      isSwipeSupported: true
    });

    render(
      <SwipeablePostCard
        post={mockPost}
        onVote={mockOnVote}
        onSave={mockOnSave}
        onShare={mockOnShare}
      />
    );

    // Should show share feedback for right swipe with distance > 100
    const swipeFeedback = screen.getByText('Share').closest('.absolute.inset-0');
    expect(swipeFeedback).toBeInTheDocument();
  });

  it('should pass through all props to RedditStylePostCard', () => {
    render(
      <SwipeablePostCard
        post={mockPost}
        community={mockCommunity}
        viewMode="compact"
        showThumbnail={false}
        onVote={mockOnVote}
        onSave={mockOnSave}
        onShare={mockOnShare}
        onComment={mockOnComment}
        isPinned={true}
        className="custom-class"
      />
    );

    expect(screen.getByTestId('reddit-style-post-card')).toBeInTheDocument();
  });
});