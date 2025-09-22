/**
 * PostTypeIndicators Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PostTypeIndicators from '../PostTypeIndicators';
import { PostType } from '../../../../types/communityEnhancements';

describe('PostTypeIndicators', () => {
  const postTypes: PostType[] = ['proposal', 'analysis', 'showcase', 'discussion', 'announcement'];

  describe('Basic Rendering', () => {
    it('renders all post types correctly', () => {
      postTypes.forEach(postType => {
        const { unmount } = render(<PostTypeIndicators postType={postType} />);
        
        // Check if the post type label is rendered
        const expectedLabels = {
          proposal: 'Proposal',
          analysis: 'Analysis',
          showcase: 'Showcase',
          discussion: 'Discussion',
          announcement: 'Announcement'
        };
        
        expect(screen.getByText(expectedLabels[postType])).toBeInTheDocument();
        unmount();
      });
    });

    it('renders with correct ARIA labels', () => {
      render(<PostTypeIndicators postType="proposal" />);
      
      const indicator = screen.getByRole('badge');
      expect(indicator).toHaveAttribute('aria-label', 'Governance proposal post');
    });

    it('renders icons for each post type', () => {
      const expectedIcons = {
        proposal: '🗳️',
        analysis: '📊',
        showcase: '✨',
        discussion: '💬',
        announcement: '📢'
      };

      postTypes.forEach(postType => {
        const { unmount } = render(<PostTypeIndicators postType={postType} />);
        expect(screen.getByText(expectedIcons[postType])).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Priority Indicators', () => {
    it('renders high priority indicator', () => {
      render(<PostTypeIndicators postType="proposal" priority="high" />);
      
      const indicator = screen.getByRole('badge');
      expect(indicator).toHaveAttribute('aria-label', 'Governance proposal post, High priority post');
      expect(screen.getByText('📌')).toBeInTheDocument();
    });

    it('renders medium priority indicator', () => {
      render(<PostTypeIndicators postType="analysis" priority="medium" />);
      
      const indicator = screen.getByRole('badge');
      expect(indicator).toHaveAttribute('aria-label', 'Analysis or research post, Medium priority post');
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('does not render priority indicator for low priority', () => {
      render(<PostTypeIndicators postType="discussion" priority="low" />);
      
      const indicator = screen.getByRole('badge');
      expect(indicator).toHaveAttribute('aria-label', 'Discussion post');
      expect(screen.queryByText('📌')).not.toBeInTheDocument();
      expect(screen.queryByText('⭐')).not.toBeInTheDocument();
    });

    it('includes screen reader text for priority', () => {
      render(<PostTypeIndicators postType="showcase" priority="high" />);
      
      expect(screen.getByText('High priority post')).toHaveClass('sr-only');
    });
  });

  describe('CSS Classes', () => {
    it('applies correct base CSS classes', () => {
      render(<PostTypeIndicators postType="proposal" />);
      
      const indicator = screen.getByRole('badge');
      expect(indicator).toHaveClass('ce-post-type-indicator');
      expect(indicator).toHaveClass('ce-post-type-proposal');
      expect(indicator).toHaveClass('inline-flex');
      expect(indicator).toHaveClass('items-center');
    });

    it('applies animation classes when animated is true', () => {
      render(<PostTypeIndicators postType="analysis" animated={true} />);
      
      const indicator = screen.getByRole('badge');
      expect(indicator).toHaveClass('transition-all');
      expect(indicator).toHaveClass('duration-200');
      expect(indicator).toHaveClass('ease-in-out');
    });

    it('does not apply animation classes when animated is false', () => {
      render(<PostTypeIndicators postType="analysis" animated={false} />);
      
      const indicator = screen.getByRole('badge');
      expect(indicator).not.toHaveClass('transition-all');
      expect(indicator).not.toHaveClass('duration-200');
      expect(indicator).not.toHaveClass('ease-in-out');
    });

    it('applies priority-specific CSS classes', () => {
      const { rerender } = render(<PostTypeIndicators postType="proposal" priority="high" />);
      let indicator = screen.getByRole('badge');
      expect(indicator).toHaveClass('ce-priority-high');

      rerender(<PostTypeIndicators postType="proposal" priority="medium" />);
      indicator = screen.getByRole('badge');
      expect(indicator).toHaveClass('ce-priority-medium');

      rerender(<PostTypeIndicators postType="proposal" priority="low" />);
      indicator = screen.getByRole('badge');
      expect(indicator).not.toHaveClass('ce-priority-high');
      expect(indicator).not.toHaveClass('ce-priority-medium');
    });
  });

  describe('Styling', () => {
    it('applies correct colors for each post type', () => {
      const colorTests = [
        { postType: 'proposal' as PostType, color: '#3B82F6' },
        { postType: 'analysis' as PostType, color: '#10B981' },
        { postType: 'showcase' as PostType, color: '#F59E0B' },
        { postType: 'discussion' as PostType, color: '#8B5CF6' },
        { postType: 'announcement' as PostType, color: '#EF4444' }
      ];

      colorTests.forEach(({ postType, color }) => {
        const { unmount } = render(<PostTypeIndicators postType={postType} />);
        const indicator = screen.getByRole('badge');
        
        expect(indicator).toHaveStyle({ color });
        unmount();
      });
    });

    it('applies correct background colors', () => {
      render(<PostTypeIndicators postType="proposal" />);
      const indicator = screen.getByRole('badge');
      
      expect(indicator).toHaveStyle({ backgroundColor: '#EFF6FF' });
    });
  });

  describe('Accessibility', () => {
    it('has proper role attribute', () => {
      render(<PostTypeIndicators postType="proposal" />);
      expect(screen.getByRole('badge')).toBeInTheDocument();
    });

    it('has aria-hidden on decorative elements', () => {
      render(<PostTypeIndicators postType="proposal" priority="high" />);
      
      const icon = screen.getByText('🗳️');
      const priorityIcon = screen.getByText('📌');
      
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(priorityIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('provides title attribute for priority indicators', () => {
      render(<PostTypeIndicators postType="proposal" priority="medium" />);
      
      const priorityIcon = screen.getByText('⭐');
      expect(priorityIcon).toHaveAttribute('title', 'Medium priority post');
    });

    it('is keyboard accessible', () => {
      render(<PostTypeIndicators postType="proposal" />);
      
      const indicator = screen.getByRole('badge');
      expect(indicator).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Component Props', () => {
    it('uses default props correctly', () => {
      render(<PostTypeIndicators postType="discussion" />);
      
      const indicator = screen.getByRole('badge');
      expect(indicator).toHaveClass('transition-all'); // animated defaults to true
      expect(indicator).toHaveClass('opacity-75'); // priority defaults to low
    });

    it('handles all priority levels', () => {
      const priorities = ['high', 'medium', 'low'] as const;
      
      priorities.forEach(priority => {
        const { unmount } = render(<PostTypeIndicators postType="proposal" priority={priority} />);
        const indicator = screen.getByRole('badge');
        
        if (priority === 'high') {
          expect(indicator).toHaveClass('ce-priority-high');
        } else if (priority === 'medium') {
          expect(indicator).toHaveClass('ce-priority-medium');
        } else {
          expect(indicator).toHaveClass('opacity-75');
        }
        
        unmount();
      });
    });
  });

  describe('Memoization', () => {
    it('memoizes component correctly', () => {
      const { rerender } = render(<PostTypeIndicators postType="proposal" priority="high" />);
      const firstRender = screen.getByRole('badge');
      
      // Re-render with same props
      rerender(<PostTypeIndicators postType="proposal" priority="high" />);
      const secondRender = screen.getByRole('badge');
      
      // Component should be memoized (same reference)
      expect(firstRender).toBe(secondRender);
    });
  });
});