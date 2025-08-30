import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  PostCardSkeleton, 
  FeedSkeleton, 
  SidebarSkeleton, 
  CommunityHeaderSkeleton,
  CommentSkeleton,
  UserProfileSkeleton 
} from '../LoadingSkeletons';

describe('Loading Skeletons', () => {
  describe('PostCardSkeleton', () => {
    it('renders post card skeleton structure', () => {
      render(<PostCardSkeleton />);

      expect(screen.getByTestId('post-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('username-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('content-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('actions-skeleton')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<PostCardSkeleton />);

      const skeleton = screen.getByTestId('post-skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading post...');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    it('applies animation classes', () => {
      render(<PostCardSkeleton />);

      const skeleton = screen.getByTestId('post-skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
    });
  });

  describe('FeedSkeleton', () => {
    it('renders multiple post skeletons', () => {
      render(<FeedSkeleton count={3} />);

      const skeletons = screen.getAllByTestId('post-skeleton');
      expect(skeletons).toHaveLength(3);
    });

    it('renders default number of skeletons when count not specified', () => {
      render(<FeedSkeleton />);

      const skeletons = screen.getAllByTestId('post-skeleton');
      expect(skeletons).toHaveLength(5); // Default count
    });

    it('has proper container structure', () => {
      render(<FeedSkeleton />);

      expect(screen.getByTestId('feed-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('feed-skeleton')).toHaveAttribute('aria-label', 'Loading feed...');
    });
  });

  describe('SidebarSkeleton', () => {
    it('renders sidebar skeleton structure', () => {
      render(<SidebarSkeleton />);

      expect(screen.getByTestId('sidebar-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('profile-section-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('navigation-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('communities-skeleton')).toBeInTheDocument();
    });

    it('renders navigation menu items', () => {
      render(<SidebarSkeleton />);

      const navItems = screen.getAllByTestId('nav-item-skeleton');
      expect(navItems.length).toBeGreaterThan(0);
    });

    it('renders community list items', () => {
      render(<SidebarSkeleton />);

      const communityItems = screen.getAllByTestId('community-item-skeleton');
      expect(communityItems.length).toBeGreaterThan(0);
    });
  });

  describe('CommunityHeaderSkeleton', () => {
    it('renders community header skeleton structure', () => {
      render(<CommunityHeaderSkeleton />);

      expect(screen.getByTestId('community-header-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('community-banner-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('community-info-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('community-stats-skeleton')).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<CommunityHeaderSkeleton />);

      const skeleton = screen.getByTestId('community-header-skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading community...');
    });
  });

  describe('CommentSkeleton', () => {
    it('renders comment skeleton structure', () => {
      render(<CommentSkeleton />);

      expect(screen.getByTestId('comment-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('comment-avatar-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('comment-content-skeleton')).toBeInTheDocument();
    });

    it('renders nested comment skeletons', () => {
      render(<CommentSkeleton depth={2} />);

      const skeleton = screen.getByTestId('comment-skeleton');
      expect(skeleton).toHaveStyle('margin-left: 2rem'); // Indentation for nested comments
    });

    it('limits nesting depth', () => {
      render(<CommentSkeleton depth={10} />);

      const skeleton = screen.getByTestId('comment-skeleton');
      // Should not indent beyond maximum depth
      expect(skeleton).toHaveStyle('margin-left: 5rem'); // Max depth
    });
  });

  describe('UserProfileSkeleton', () => {
    it('renders user profile skeleton structure', () => {
      render(<UserProfileSkeleton />);

      expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('profile-avatar-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('profile-name-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('profile-stats-skeleton')).toBeInTheDocument();
    });

    it('renders compact version when specified', () => {
      render(<UserProfileSkeleton compact />);

      const skeleton = screen.getByTestId('profile-skeleton');
      expect(skeleton).toHaveClass('compact');
      
      // Compact version should not show stats
      expect(screen.queryByTestId('profile-stats-skeleton')).not.toBeInTheDocument();
    });
  });

  describe('Skeleton Animations', () => {
    it('applies pulse animation by default', () => {
      render(<PostCardSkeleton />);

      const skeleton = screen.getByTestId('post-skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('can disable animations when specified', () => {
      render(<PostCardSkeleton animate={false} />);

      const skeleton = screen.getByTestId('post-skeleton');
      expect(skeleton).not.toHaveClass('animate-pulse');
    });

    it('respects reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<PostCardSkeleton />);

      const skeleton = screen.getByTestId('post-skeleton');
      expect(skeleton).toHaveClass('reduced-motion');
    });
  });

  describe('Skeleton Accessibility', () => {
    it('provides appropriate ARIA labels', () => {
      render(<FeedSkeleton />);

      expect(screen.getByLabelText('Loading feed...')).toBeInTheDocument();
    });

    it('uses proper roles for screen readers', () => {
      render(<PostCardSkeleton />);

      const skeleton = screen.getByTestId('post-skeleton');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    it('is hidden from screen readers when content loads', () => {
      const { rerender } = render(<PostCardSkeleton />);

      // Initially visible to screen readers
      expect(screen.getByTestId('post-skeleton')).not.toHaveAttribute('aria-hidden');

      // When content loads, skeleton should be hidden
      rerender(<PostCardSkeleton hidden />);
      expect(screen.getByTestId('post-skeleton')).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Skeleton Responsiveness', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<SidebarSkeleton />);

      const skeleton = screen.getByTestId('sidebar-skeleton');
      expect(skeleton).toHaveClass('mobile');
    });

    it('shows appropriate number of items on different screen sizes', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<FeedSkeleton />);

      const skeletons = screen.getAllByTestId('post-skeleton');
      expect(skeletons.length).toBeLessThanOrEqual(3); // Fewer items on smaller screens
    });
  });

  describe('Skeleton Performance', () => {
    it('renders efficiently with many items', () => {
      const startTime = performance.now();
      
      render(<FeedSkeleton count={50} />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly even with many items
      expect(renderTime).toBeLessThan(100); // 100ms threshold
    });

    it('does not cause memory leaks', () => {
      const { unmount } = render(<FeedSkeleton count={20} />);
      
      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });
  });
});