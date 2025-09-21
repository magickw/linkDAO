import React from 'react';
import { render, screen } from '@testing-library/react';
import { PostCardSkeleton } from '../PostCardSkeleton';
import { SidebarWidgetSkeleton } from '../SidebarWidgetSkeleton';
import { CommunityHeaderSkeleton } from '../CommunityHeaderSkeleton';
import { PostListSkeleton } from '../PostListSkeleton';

describe('Loading Skeletons', () => {
  describe('PostCardSkeleton', () => {
    it('renders card view skeleton by default', () => {
      const { container } = render(<PostCardSkeleton />);
      
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(container.querySelector('.bg-white')).toBeInTheDocument();
    });

    it('renders compact view skeleton', () => {
      const { container } = render(<PostCardSkeleton viewMode="compact" />);
      
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(container.querySelector('.flex.items-center')).toBeInTheDocument();
    });

    it('shows thumbnail when showThumbnail is true', () => {
      const { container } = render(<PostCardSkeleton showThumbnail={true} />);
      
      const thumbnails = container.querySelectorAll('.bg-gray-200');
      expect(thumbnails.length).toBeGreaterThan(0);
    });

    it('hides thumbnail when showThumbnail is false', () => {
      const { container } = render(<PostCardSkeleton showThumbnail={false} />);
      
      // Should still have skeleton elements but fewer of them
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders vote section in card view', () => {
      const { container } = render(<PostCardSkeleton viewMode="card" />);
      
      // Should have vote arrows and score placeholder
      const voteElements = container.querySelectorAll('.w-8.h-8, .w-10.h-5');
      expect(voteElements.length).toBeGreaterThan(0);
    });

    it('renders compact layout correctly', () => {
      const { container } = render(<PostCardSkeleton viewMode="compact" />);
      
      // Compact view should have different structure
      expect(container.querySelector('.flex.items-center.space-x-3')).toBeInTheDocument();
    });
  });

  describe('SidebarWidgetSkeleton', () => {
    it('renders generic widget skeleton by default', () => {
      const { container } = render(<SidebarWidgetSkeleton />);
      
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(container.querySelector('.h-48')).toBeInTheDocument(); // medium height
    });

    it('renders about widget skeleton', () => {
      const { container } = render(<SidebarWidgetSkeleton type="about" />);
      
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      // Should have specific structure for about widget
      const elements = container.querySelectorAll('.bg-gray-200');
      expect(elements.length).toBeGreaterThan(3);
    });

    it('renders stats widget skeleton', () => {
      const { container } = render(<SidebarWidgetSkeleton type="stats" />);
      
      expect(container.querySelector('.grid.grid-cols-2')).toBeInTheDocument();
    });

    it('renders moderators widget skeleton', () => {
      const { container } = render(<SidebarWidgetSkeleton type="moderators" />);
      
      // Should have circular avatars
      const avatars = container.querySelectorAll('.rounded-full');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('renders governance widget skeleton', () => {
      const { container } = render(<SidebarWidgetSkeleton type="governance" />);
      
      expect(container.querySelector('.border.border-gray-200.rounded')).toBeInTheDocument();
    });

    it('renders related communities widget skeleton', () => {
      const { container } = render(<SidebarWidgetSkeleton type="related" />);
      
      const communityElements = container.querySelectorAll('.flex.items-center.justify-between');
      expect(communityElements.length).toBeGreaterThan(0);
    });

    it('applies correct height classes', () => {
      const { container: smallContainer } = render(
        <SidebarWidgetSkeleton height="small" />
      );
      expect(smallContainer.querySelector('.h-32')).toBeInTheDocument();

      const { container: mediumContainer } = render(
        <SidebarWidgetSkeleton height="medium" />
      );
      expect(mediumContainer.querySelector('.h-48')).toBeInTheDocument();

      const { container: largeContainer } = render(
        <SidebarWidgetSkeleton height="large" />
      );
      expect(largeContainer.querySelector('.h-80')).toBeInTheDocument();
    });
  });

  describe('CommunityHeaderSkeleton', () => {
    it('renders header skeleton with banner by default', () => {
      const { container } = render(<CommunityHeaderSkeleton />);
      
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(container.querySelector('.bg-gradient-to-r')).toBeInTheDocument();
    });

    it('renders header skeleton without banner', () => {
      const { container } = render(<CommunityHeaderSkeleton showBanner={false} />);
      
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(container.querySelector('.bg-gradient-to-r')).not.toBeInTheDocument();
    });

    it('renders community avatar placeholder', () => {
      const { container } = render(<CommunityHeaderSkeleton />);
      
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('renders navigation tabs', () => {
      const { container } = render(<CommunityHeaderSkeleton />);
      
      const tabs = container.querySelectorAll('.w-16.h-4');
      expect(tabs.length).toBe(4); // Should have 4 tab placeholders
    });

    it('renders join button placeholder', () => {
      const { container } = render(<CommunityHeaderSkeleton />);
      
      expect(container.querySelector('.w-20.h-8')).toBeInTheDocument();
    });
  });

  describe('PostListSkeleton', () => {
    it('renders default number of post skeletons', () => {
      const { container } = render(<PostListSkeleton />);
      
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      // Should render 5 post cards by default
      const postCards = container.querySelectorAll('.bg-white.border');
      expect(postCards.length).toBeGreaterThanOrEqual(5);
    });

    it('renders custom number of post skeletons', () => {
      const { container } = render(<PostListSkeleton count={3} />);
      
      // Should render 3 post cards
      const postCards = container.querySelectorAll('.bg-white.border');
      expect(postCards.length).toBeGreaterThanOrEqual(3);
    });

    it('renders sorting tabs when showSortingTabs is true', () => {
      const { container } = render(<PostListSkeleton showSortingTabs={true} />);
      
      // Should have sorting tabs skeleton
      const sortingElements = container.querySelectorAll('.w-12.h-6');
      expect(sortingElements.length).toBeGreaterThan(0);
    });

    it('hides sorting tabs when showSortingTabs is false', () => {
      const { container } = render(<PostListSkeleton showSortingTabs={false} />);
      
      // Should not have as many sorting-related elements
      const allElements = container.querySelectorAll('*');
      expect(allElements.length).toBeGreaterThan(0);
    });

    it('renders load more skeleton', () => {
      const { container } = render(<PostListSkeleton />);
      
      expect(container.querySelector('.w-24.h-8')).toBeInTheDocument();
    });

    it('passes viewMode to PostCardSkeleton', () => {
      const { container } = render(<PostListSkeleton viewMode="compact" />);
      
      // Compact view should have different structure
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('Animation and Styling', () => {
    it('all skeletons have animate-pulse class', () => {
      const skeletons = [
        <PostCardSkeleton />,
        <SidebarWidgetSkeleton />,
        <CommunityHeaderSkeleton />,
        <PostListSkeleton />
      ];

      skeletons.forEach((skeleton) => {
        const { container } = render(skeleton);
        expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
      });
    });

    it('all skeletons use consistent gray colors', () => {
      const { container } = render(<PostCardSkeleton />);
      
      expect(container.querySelector('.bg-gray-200')).toBeInTheDocument();
      expect(container.querySelector('.bg-gray-300')).toBeInTheDocument();
    });

    it('skeletons have proper rounded corners', () => {
      const { container } = render(<SidebarWidgetSkeleton />);
      
      expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
    });
  });
});