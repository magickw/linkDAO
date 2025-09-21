import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AboutCommunityWidget } from '../AboutCommunityWidget';
import { Community } from '../../../models/Community';
import { CommunityStats, CommunityRule } from '../../../types/community';

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 months ago')
}));

describe('AboutCommunityWidget', () => {
  const mockCommunity: Community = {
    id: '1',
    name: 'test-community',
    displayName: 'Test Community',
    description: 'This is a test community for developers and enthusiasts.',
    rules: ['Be respectful', 'No spam'],
    memberCount: 1250,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-03-20'),
    avatar: 'https://example.com/avatar.jpg',
    banner: 'https://example.com/banner.jpg',
    category: 'technology',
    tags: ['javascript', 'react', 'web3', 'blockchain', 'defi'],
    isPublic: true,
    moderators: ['mod1', 'mod2'],
    treasuryAddress: '0x123...',
    governanceToken: 'TEST',
    settings: {
      allowedPostTypes: [],
      requireApproval: false,
      minimumReputation: 0,
      stakingRequirements: []
    }
  };

  const mockStats: CommunityStats = {
    memberCount: 1250,
    onlineCount: 45,
    postsThisWeek: 23,
    activeDiscussions: 8,
    growthRate: 5.2,
    createdAt: new Date('2023-01-15')
  };

  const mockRules: CommunityRule[] = [
    {
      id: '1',
      title: 'Be Respectful',
      description: 'Treat all community members with respect and kindness.',
      order: 1
    },
    {
      id: '2',
      title: 'No Spam',
      description: 'Do not post repetitive or promotional content.',
      order: 2
    },
    {
      id: '3',
      title: 'Stay On Topic',
      description: 'Keep discussions relevant to the community theme.',
      order: 3
    }
  ];

  const defaultProps = {
    community: mockCommunity,
    stats: mockStats,
    rules: mockRules,
    canEdit: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the widget with community information', () => {
      render(<AboutCommunityWidget {...defaultProps} />);
      
      expect(screen.getByText('About Community')).toBeInTheDocument();
      expect(screen.getByText(mockCommunity.description)).toBeInTheDocument();
      expect(screen.getByText('1.3K')).toBeInTheDocument(); // Formatted member count
      expect(screen.getByText('45')).toBeInTheDocument(); // Online count
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('displays creation date and category', () => {
      render(<AboutCommunityWidget {...defaultProps} />);
      
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('2 months ago')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('technology')).toBeInTheDocument();
    });

    it('displays community tags with truncation', () => {
      render(<AboutCommunityWidget {...defaultProps} />);
      
      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('javascript')).toBeInTheDocument();
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('web3')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument(); // Shows truncation
    });

    it('displays community stats', () => {
      render(<AboutCommunityWidget {...defaultProps} />);
      
      expect(screen.getByText('23')).toBeInTheDocument(); // Posts this week
      expect(screen.getByText('Posts this week')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument(); // Active discussions
      expect(screen.getByText('Active discussions')).toBeInTheDocument();
    });
  });

  describe('Member Count Formatting', () => {
    it('formats large member counts correctly', () => {
      const largeStats = { ...mockStats, memberCount: 1500000 };
      render(<AboutCommunityWidget {...defaultProps} stats={largeStats} />);
      
      expect(screen.getByText('1.5M')).toBeInTheDocument();
    });

    it('formats thousands correctly', () => {
      const thousandStats = { ...mockStats, memberCount: 5500 };
      render(<AboutCommunityWidget {...defaultProps} stats={thousandStats} />);
      
      expect(screen.getByText('5.5K')).toBeInTheDocument();
    });

    it('displays small numbers without formatting', () => {
      const smallStats = { ...mockStats, memberCount: 150 };
      render(<AboutCommunityWidget {...defaultProps} stats={smallStats} />);
      
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  describe('Rules Section', () => {
    it('displays rules section with correct count', () => {
      render(<AboutCommunityWidget {...defaultProps} />);
      
      expect(screen.getByText('Community Rules (3)')).toBeInTheDocument();
    });

    it('expands and collapses rules when clicked', async () => {
      render(<AboutCommunityWidget {...defaultProps} />);
      
      const rulesButton = screen.getByRole('button', { name: /community rules/i });
      
      // Rules should be collapsed initially
      expect(screen.queryByText('Be Respectful')).not.toBeInTheDocument();
      
      // Click to expand
      fireEvent.click(rulesButton);
      
      await waitFor(() => {
        expect(screen.getByText('1. Be Respectful')).toBeInTheDocument();
        expect(screen.getByText('2. No Spam')).toBeInTheDocument();
        expect(screen.getByText('3. Stay On Topic')).toBeInTheDocument();
      });
      
      // Click to collapse
      fireEvent.click(rulesButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Be Respectful')).not.toBeInTheDocument();
      });
    });

    it('displays rule descriptions when expanded', async () => {
      render(<AboutCommunityWidget {...defaultProps} />);
      
      const rulesButton = screen.getByRole('button', { name: /community rules/i });
      fireEvent.click(rulesButton);
      
      await waitFor(() => {
        expect(screen.getByText('Treat all community members with respect and kindness.')).toBeInTheDocument();
        expect(screen.getByText('Do not post repetitive or promotional content.')).toBeInTheDocument();
        expect(screen.getByText('Keep discussions relevant to the community theme.')).toBeInTheDocument();
      });
    });

    it('does not render rules section when no rules exist', () => {
      render(<AboutCommunityWidget {...defaultProps} rules={[]} />);
      
      expect(screen.queryByText(/Community Rules/)).not.toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    it('shows edit button when user can edit', () => {
      render(<AboutCommunityWidget {...defaultProps} canEdit={true} />);
      
      expect(screen.getByRole('button', { name: 'Edit community information' })).toBeInTheDocument();
    });

    it('does not show edit button when user cannot edit', () => {
      render(<AboutCommunityWidget {...defaultProps} canEdit={false} />);
      
      expect(screen.queryByRole('button', { name: 'Edit community information' })).not.toBeInTheDocument();
    });

    it('calls onEdit when edit button is clicked', () => {
      const mockOnEdit = jest.fn();
      render(<AboutCommunityWidget {...defaultProps} canEdit={true} onEdit={mockOnEdit} />);
      
      const editButton = screen.getByRole('button', { name: 'Edit community information' });
      fireEvent.click(editButton);
      
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('does not call onEdit when no handler provided', () => {
      render(<AboutCommunityWidget {...defaultProps} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: 'Edit community information' });
      fireEvent.click(editButton);
      
      // Should not throw error
      expect(editButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing description gracefully', () => {
      const communityWithoutDescription = { ...mockCommunity, description: '' };
      render(<AboutCommunityWidget {...defaultProps} community={communityWithoutDescription} />);
      
      expect(screen.getByText('No description available.')).toBeInTheDocument();
    });

    it('handles missing tags gracefully', () => {
      const communityWithoutTags = { ...mockCommunity, tags: [] };
      render(<AboutCommunityWidget {...defaultProps} community={communityWithoutTags} />);
      
      expect(screen.queryByText('Tags')).not.toBeInTheDocument();
    });

    it('handles zero member count', () => {
      const zeroStats = { ...mockStats, memberCount: 0, onlineCount: 0 };
      render(<AboutCommunityWidget {...defaultProps} stats={zeroStats} />);
      
      const memberElements = screen.getAllByText('0');
      expect(memberElements).toHaveLength(2); // Both member count and online count should be 0
      expect(screen.getByText('Members')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for rules expansion', () => {
      render(<AboutCommunityWidget {...defaultProps} />);
      
      const rulesButton = screen.getByRole('button', { name: /community rules/i });
      expect(rulesButton).toHaveAttribute('aria-expanded', 'false');
      expect(rulesButton).toHaveAttribute('aria-controls', 'community-rules');
    });

    it('updates ARIA attributes when rules are expanded', async () => {
      render(<AboutCommunityWidget {...defaultProps} />);
      
      const rulesButton = screen.getByRole('button', { name: /community rules/i });
      fireEvent.click(rulesButton);
      
      await waitFor(() => {
        expect(rulesButton).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('has proper aria-label for edit button', () => {
      render(<AboutCommunityWidget {...defaultProps} canEdit={true} />);
      
      const editButton = screen.getByRole('button', { name: 'Edit community information' });
      expect(editButton).toHaveAttribute('aria-label', 'Edit community information');
    });
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode classes correctly', () => {
      const { container } = render(<AboutCommunityWidget {...defaultProps} />);
      
      // Check for dark mode classes
      expect(container.querySelector('.dark\\:bg-gray-800')).toBeInTheDocument();
      expect(container.querySelector('.dark\\:border-gray-700')).toBeInTheDocument();
      expect(container.querySelector('.dark\\:text-white')).toBeInTheDocument();
    });
  });
});