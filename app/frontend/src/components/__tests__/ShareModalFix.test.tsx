/**
 * Test suite for Share Modal and Comment Section fixes
 * Verifies that modals render properly and comments are accessible
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SharePostModal from '../SharePostModal';
import Web3SocialPostCard from '../Web3SocialPostCard';

// Mock dependencies
jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn()
  })
}));

jest.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    data: null,
    isLoading: false
  })
}));

describe('Share Modal Fix', () => {
  const mockPost = {
    id: 'test-post-1',
    title: 'Test Post',
    contentCid: 'QmTest123',
    author: '0x1234567890123456789012345678901234567890',
    communityId: 'test-community'
  };

  it('should render modal using portal at document root', () => {
    const { container } = render(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    // Modal should not be in the container, but in document.body
    const modalInContainer = container.querySelector('[role="dialog"]');
    expect(modalInContainer).toBeNull();

    // Modal should be in document.body
    const modalInBody = document.body.querySelector('[role="dialog"]');
    expect(modalInBody).toBeInTheDocument();
  });

  it('should have proper z-index for stacking', () => {
    render(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    const modal = document.body.querySelector('[role="dialog"]');
    expect(modal).toHaveClass('z-[9999]');
  });

  it('should close on ESC key press', async () => {
    const onClose = jest.fn();
    render(
      <SharePostModal
        isOpen={true}
        onClose={onClose}
        post={mockPost}
        postType="feed"
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should close on backdrop click', () => {
    const onClose = jest.fn();
    render(
      <SharePostModal
        isOpen={true}
        onClose={onClose}
        post={mockPost}
        postType="feed"
      />
    );

    const backdrop = document.body.querySelector('[role="dialog"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should prevent body scroll when open', () => {
    const { rerender } = render(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <SharePostModal
        isOpen={false}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    expect(document.body.style.overflow).toBe('unset');
  });

  it('should have proper ARIA attributes', () => {
    render(
      <SharePostModal
        isOpen={true}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    const modal = document.body.querySelector('[role="dialog"]');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'share-modal-title');
  });

  it('should not render when isOpen is false', () => {
    render(
      <SharePostModal
        isOpen={false}
        onClose={jest.fn()}
        post={mockPost}
        postType="feed"
      />
    );

    const modal = document.body.querySelector('[role="dialog"]');
    expect(modal).not.toBeInTheDocument();
  });
});

describe('Feed Card Container Fix', () => {
  const mockPost = {
    id: 'test-post-1',
    contentCid: 'Test post content',
    author: {
      address: '0x1234567890123456789012345678901234567890',
      username: 'testuser',
      avatar: 'https://example.com/avatar.jpg'
    },
    createdAt: new Date(),
    tags: ['test'],
    commentCount: 5,
    views: 100,
    reactions: []
  };

  it('should not have overflow-hidden on container', () => {
    const { container } = render(
      <Web3SocialPostCard
        post={mockPost}
        onReaction={jest.fn()}
        onTip={jest.fn()}
      />
    );

    // The GestureHandler wrapper should not have overflow-hidden
    const wrapper = container.firstChild;
    expect(wrapper).not.toHaveClass('overflow-hidden');
  });

  it('should render comments section without clipping', () => {
    const { container } = render(
      <Web3SocialPostCard
        post={mockPost}
        onReaction={jest.fn()}
        onTip={jest.fn()}
      />
    );

    // Comments section should be present and not clipped
    const commentsSection = container.querySelector('[class*="px-4 pb-4"]');
    expect(commentsSection).toBeInTheDocument();
  });
});

describe('Integration Test', () => {
  it('should allow share modal to appear above feed card', async () => {
    const mockPost = {
      id: 'test-post-1',
      contentCid: 'Test post content',
      author: {
        address: '0x1234567890123456789012345678901234567890',
        username: 'testuser',
        avatar: 'https://example.com/avatar.jpg'
      },
      createdAt: new Date(),
      tags: ['test'],
      commentCount: 5,
      views: 100,
      reactions: []
    };

    render(
      <Web3SocialPostCard
        post={mockPost}
        onReaction={jest.fn()}
        onTip={jest.fn()}
      />
    );

    // Find and click share button
    const shareButton = screen.getByText(/Share/i);
    fireEvent.click(shareButton);

    // Modal should appear at document root level
    await waitFor(() => {
      const modal = document.body.querySelector('[role="dialog"]');
      expect(modal).toBeInTheDocument();
    });

    // Modal should have higher z-index than feed card
    const modal = document.body.querySelector('[role="dialog"]');
    expect(modal).toHaveClass('z-[9999]');
  });
});
