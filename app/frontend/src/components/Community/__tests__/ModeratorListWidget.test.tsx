import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModeratorListWidget } from '../ModeratorListWidget';
import { Moderator } from '../../../types/community';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { it } from 'date-fns/locale';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn((date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return `${hours} hours ago`;
  })
}));

describe('ModeratorListWidget', () => {
  const mockModerators: Moderator[] = [
    {
      id: '1',
      username: 'owner_user',
      displayName: 'Community Owner',
      avatar: 'https://example.com/avatar1.jpg',
      role: 'owner',
      tenure: 365,
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      isOnline: true
    },
    {
      id: '2',
      username: 'admin_user',
      displayName: 'Admin User',
      role: 'admin',
      tenure: 180,
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      isOnline: false
    },
    {
      id: '3',
      username: 'mod_user',
      displayName: 'Moderator User',
      role: 'moderator',
      tenure: 90,
      lastActive: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      isOnline: true
    },
    {
      id: '4',
      username: 'mod_user2',
      displayName: 'Another Mod',
      role: 'moderator',
      tenure: 45,
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      isOnline: false
    }
  ];

  const defaultProps = {
    moderators: mockModerators,
    loading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders moderator list widget with correct title', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      expect(screen.getByText('Moderators (4)')).toBeInTheDocument();
    });

    it('displays all moderators with correct information', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      // Check that all moderators are displayed
      expect(screen.getByText('Community Owner')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Moderator User')).toBeInTheDocument();
      expect(screen.getByText('Another Mod')).toBeInTheDocument();
    });

    it('shows moderator avatars when provided', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      const avatarImage = screen.getByAltText("Community Owner's avatar");
      expect(avatarImage).toBeInTheDocument();
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar1.jpg');
    });

    it('shows initials when no avatar is provided', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      // Admin User has no avatar, should show initial 'A'
      const initials = screen.getAllByText('A');
      expect(initials.length).toBeGreaterThan(0);
    });
  });

  describe('Role Badges', () => {
    it('displays correct role badges for different moderator types', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      expect(screen.getByText('Owner')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getAllByText('Mod')).toHaveLength(2);
    });

    it('applies correct CSS classes for role badges', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      const ownerBadge = screen.getByText('Owner');
      const adminBadge = screen.getByText('Admin');
      const modBadge = screen.getAllByText('Mod')[0];
      
      expect(ownerBadge).toHaveClass('bg-red-100', 'text-red-800');
      expect(adminBadge).toHaveClass('bg-purple-100', 'text-purple-800');
      expect(modBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  describe('Online Status and Activity', () => {
    it('shows online indicators for online moderators', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      // Should have green indicators for online users
      const onlineIndicators = document.querySelectorAll('.bg-green-400');
      expect(onlineIndicators).toHaveLength(2); // owner_user and mod_user are online
    });

    it('shows offline indicators for offline moderators', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      // Should have gray indicators for offline users (only the small status dots)
      const offlineIndicators = document.querySelectorAll('.w-2.h-2.rounded-full.bg-gray-300');
      expect(offlineIndicators.length).toBeGreaterThanOrEqual(2); // admin_user and mod_user2 are offline
    });

    it('displays last active time for offline moderators', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      // Should show last active time for offline users
      expect(screen.getAllByText(/hours ago/)).toHaveLength(2);
    });

    it('does not show last active time for online moderators', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      // Online moderators should not show last active time
      const ownerSection = screen.getByText('Community Owner').closest('div');
      expect(ownerSection).not.toHaveTextContent('hours ago');
    });
  });

  describe('Tenure Display', () => {
    it('formats tenure correctly for different time periods', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      expect(screen.getByText('1y tenure')).toBeInTheDocument(); // 365 days = 1 year
      expect(screen.getByText('6mo tenure')).toBeInTheDocument(); // 180 days = 6 months
      expect(screen.getByText('3mo tenure')).toBeInTheDocument(); // 90 days = 3 months
      expect(screen.getByText('1mo tenure')).toBeInTheDocument(); // 45 days = 1 month (rounded)
    });
  });

  describe('Sorting and Display Order', () => {
    it('sorts moderators by role priority (owner, admin, moderator)', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      // Get all moderator name elements in order
      const nameElements = screen.getAllByText(/Community Owner|Admin User|Moderator User|Another Mod/);
      const displayedNames = nameElements.map(el => el.textContent);
      
      // Should be sorted: Owner, Admin, then Moderators (by tenure within same role)
      expect(displayedNames[0]).toBe('Community Owner');
      expect(displayedNames[1]).toBe('Admin User');
      expect(displayedNames[2]).toBe('Moderator User'); // Higher tenure
      expect(displayedNames[3]).toBe('Another Mod'); // Lower tenure
    });
  });

  describe('Expansion and Collapse', () => {
    it('can be collapsed and expanded', async () => {
      const user = userEvent.setup();
      render(<ModeratorListWidget {...defaultProps} />);
      
      const toggleButton = screen.getByRole('button', { name: /Moderators \(4\)/ });
      
      // Initially expanded
      expect(screen.getByText('Community Owner')).toBeInTheDocument();
      
      // Collapse
      await user.click(toggleButton);
      expect(screen.queryByText('Community Owner')).not.toBeInTheDocument();
      
      // Expand again
      await user.click(toggleButton);
      expect(screen.getByText('Community Owner')).toBeInTheDocument();
    });

    it('updates aria-expanded attribute correctly', async () => {
      const user = userEvent.setup();
      render(<ModeratorListWidget {...defaultProps} />);
      
      const toggleButton = screen.getByRole('button', { name: /Moderators \(4\)/ });
      
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Show More/Less Functionality', () => {
    const manyModerators: Moderator[] = [
      ...mockModerators,
      ...Array.from({ length: 6 }, (_, i) => ({
        id: `extra-${i}`,
        username: `mod_${i}`,
        displayName: `Extra Mod ${i}`,
        role: 'moderator' as const,
        tenure: 30,
        lastActive: new Date(),
        isOnline: false
      }))
    ];

    it('shows only first 5 moderators initially when there are more than 5', () => {
      render(<ModeratorListWidget moderators={manyModerators} />);
      
      // Should show first 5 moderators
      expect(screen.getByText('Community Owner')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Moderator User')).toBeInTheDocument();
      expect(screen.getByText('Another Mod')).toBeInTheDocument();
      expect(screen.getByText('Extra Mod 0')).toBeInTheDocument();
      
      // Should not show the 6th moderator initially
      expect(screen.queryByText('Extra Mod 1')).not.toBeInTheDocument();
    });

    it('shows "Show More" button when there are more than 5 moderators', () => {
      render(<ModeratorListWidget moderators={manyModerators} />);
      
      expect(screen.getByText('Show 5 More Moderators')).toBeInTheDocument();
    });

    it('expands to show all moderators when "Show More" is clicked', async () => {
      const user = userEvent.setup();
      render(<ModeratorListWidget moderators={manyModerators} />);
      
      const showMoreButton = screen.getByText('Show 5 More Moderators');
      await user.click(showMoreButton);
      
      // Should now show all moderators
      expect(screen.getByText('Extra Mod 1')).toBeInTheDocument();
      expect(screen.getByText('Extra Mod 5')).toBeInTheDocument();
      
      // Button should change to "Show Less"
      expect(screen.getByText('Show Less')).toBeInTheDocument();
    });

    it('does not show "Show More" button when there are 5 or fewer moderators', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      expect(screen.queryByText(/Show.*More Moderators/)).not.toBeInTheDocument();
    });
  });

  describe('Click Interactions', () => {
    it('calls onModeratorClick when a moderator is clicked', async () => {
      const user = userEvent.setup();
      const onModeratorClick = jest.fn();
      
      render(<ModeratorListWidget {...defaultProps} onModeratorClick={onModeratorClick} />);
      
      const moderatorElement = screen.getByText('Community Owner').closest('div');
      await user.click(moderatorElement!);
      
      expect(onModeratorClick).toHaveBeenCalledWith(mockModerators[0]);
    });

    it('supports keyboard navigation when onModeratorClick is provided', async () => {
      const user = userEvent.setup();
      const onModeratorClick = jest.fn();
      
      render(<ModeratorListWidget {...defaultProps} onModeratorClick={onModeratorClick} />);
      
      // Find the clickable moderator element (the one with role="button")
      const clickableElements = document.querySelectorAll('[role="button"][tabindex="0"]');
      const moderatorElement = Array.from(clickableElements).find(el => 
        el.textContent?.includes('Community Owner')
      );
      
      expect(moderatorElement).toBeTruthy();
      moderatorElement!.focus();
      await user.keyboard('{Enter}');
      
      expect(onModeratorClick).toHaveBeenCalledWith(mockModerators[0]);
    });

    it('does not make moderators clickable when onModeratorClick is not provided', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      const moderatorElement = screen.getByText('Community Owner').closest('div');
      expect(moderatorElement).not.toHaveAttribute('role', 'button');
      expect(moderatorElement).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Loading State', () => {
    it('displays loading skeleton when loading is true', () => {
      render(<ModeratorListWidget moderators={[]} loading={true} />);
      
      expect(screen.getByText('Moderators')).toBeInTheDocument();
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('does not display moderators when loading', () => {
      render(<ModeratorListWidget {...defaultProps} loading={true} />);
      
      expect(screen.queryByText('Community Owner')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when error is provided', () => {
      const errorMessage = 'Failed to load moderators';
      render(<ModeratorListWidget moderators={[]} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toHaveClass('text-red-600');
    });

    it('does not display moderators when there is an error', () => {
      render(<ModeratorListWidget {...defaultProps} error="Some error" />);
      
      expect(screen.queryByText('Community Owner')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('displays empty state message when no moderators are provided', () => {
      render(<ModeratorListWidget moderators={[]} />);
      
      expect(screen.getByText('No moderators found')).toBeInTheDocument();
    });

    it('shows correct count in header when no moderators', () => {
      render(<ModeratorListWidget moderators={[]} />);
      
      // When empty, the widget shows a simple header without count
      expect(screen.getByText('Moderators')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      const toggleButton = screen.getByRole('button', { name: /Moderators \(4\)/ });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      expect(toggleButton).toHaveAttribute('aria-controls', 'moderator-list');
      
      expect(document.getElementById('moderator-list')).toBeInTheDocument();
    });

    it('provides proper alt text for avatar images', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      const avatarImage = screen.getByAltText("Community Owner's avatar");
      expect(avatarImage).toBeInTheDocument();
    });

    it('supports keyboard navigation for clickable moderators', async () => {
      const user = userEvent.setup();
      const onModeratorClick = jest.fn();
      
      render(<ModeratorListWidget {...defaultProps} onModeratorClick={onModeratorClick} />);
      
      // Find the clickable moderator element (the one with role="button")
      const moderatorElements = screen.getAllByRole('button');
      const clickableModerator = moderatorElements.find(el => 
        el.textContent?.includes('Community Owner')
      );
      
      expect(clickableModerator).toHaveAttribute('tabIndex', '0');
      
      clickableModerator!.focus();
      await user.keyboard(' '); // Space key
      
      expect(onModeratorClick).toHaveBeenCalledWith(mockModerators[0]);
    });
  });

  describe('Dark Mode Support', () => {
    it('includes dark mode CSS classes', () => {
      render(<ModeratorListWidget {...defaultProps} />);
      
      const widget = document.querySelector('.dark\\:bg-gray-800');
      expect(widget).toBeInTheDocument();
    });
  });
});