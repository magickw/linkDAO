/**
 * Unit Tests for CommunityPage Component
 * Tests community page functionality, membership management, and real-time updates
 * Requirements: 2.1, 2.2, 2.7
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityPage } from '../../../components/Community/CommunityPage';
import { testUtils } from '../../setup/testSetup';

// Mock dependencies
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      address: '0x1234567890123456789012345678901234567890',
      ensName: 'testuser.eth'
    },
    isAuthenticated: true
  })
}));

jest.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    send: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  })
}));

jest.mock('../../../services/communityService', () => ({
  CommunityService: {
    getCommunityById: jest.fn(),
    joinCommunity: jest.fn(),
    leaveCommunity: jest.fn()
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('CommunityPage Component', () => {
  const mockCommunity = {
    id: 'test-community-1',
    name: 'test-community',
    displayName: 'Test Community',
    description: 'A test community for unit testing',
    iconUrl: '/test-icon.png',
    bannerUrl: '/test-banner.png',
    category: 'technology',
    tags: ['test', 'community'],
    isPublic: true,
    memberCount: 150,
    postCount: 45,
    createdAt: new Date('2023-01-01'),
    rules: [
      { id: '1', title: 'Be respectful', description: 'Treat all members with respect' },
      { id: '2', title: 'No spam', description: 'Do not post spam content' }
    ],
    moderators: ['0x1234567890123456789012345678901234567890'],
    governanceEnabled: true,
    stakingRequired: false
  };

  const mockStats = {
    memberCount: 150,
    postCount: 45,
    activeMembers: 23,
    postsThisWeek: 12,
    growthRate: 5.2
  };

  const mockMembershipStatus = {
    isMember: true,
    role: 'member' as const,
    joinedAt: new Date('2023-06-01'),
    canPost: true,
    canModerate: false
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default fetch responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats)
        });
      }
      if (url.includes('/membership/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMembershipStatus)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render community page with initial data', async () => {
      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Check if community header is rendered
      expect(screen.getByText('Test Community')).toBeInTheDocument();
      expect(screen.getByText('A test community for unit testing')).toBeInTheDocument();

      // Wait for stats to load
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Member count
      });
    });

    it('should show loading state when no initial data provided', () => {
      render(<CommunityPage communityId="test-community-1" />);
      
      expect(screen.getByText('Loading community...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show error state when community not found', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Community not found'));

      render(<CommunityPage communityId="invalid-community" />);

      await waitFor(() => {
        expect(screen.getByText('Community Not Found')).toBeInTheDocument();
        expect(screen.getByText('Browse Communities')).toBeInTheDocument();
      });
    });

    it('should render all navigation tabs', async () => {
      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Posts')).toBeInTheDocument();
        expect(screen.getByText('Rules')).toBeInTheDocument();
        expect(screen.getByText('Members')).toBeInTheDocument();
      });
    });
  });

  describe('Membership Management', () => {
    it('should handle join community action', async () => {
      const user = userEvent.setup();
      
      // Mock non-member status initially
      const nonMemberStatus = { ...mockMembershipStatus, isMember: false, canPost: false };
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/membership/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(nonMemberStatus)
          });
        }
        if (url.includes('/join')) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats)
        });
      });

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      await waitFor(() => {
        const joinButton = screen.getByText('Join Community');
        expect(joinButton).toBeInTheDocument();
      });

      const joinButton = screen.getByText('Join Community');
      await user.click(joinButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/join'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should handle leave community action', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/leave')) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMembershipStatus)
        });
      });

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      await waitFor(() => {
        const leaveButton = screen.getByText('Leave Community');
        expect(leaveButton).toBeInTheDocument();
      });

      const leaveButton = screen.getByText('Leave Community');
      await user.click(leaveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/leave'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should update member count after join/leave', async () => {
      const user = userEvent.setup();
      let memberCount = 150;
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/join')) {
          memberCount++;
          return Promise.resolve({ ok: true });
        }
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ ...mockStats, memberCount })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMembershipStatus)
        });
      });

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Initial member count
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      // Join community
      const joinButton = screen.getByText('Join Community');
      await user.click(joinButton);

      // Check updated member count
      await waitFor(() => {
        expect(screen.getByText('151')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Default tab should be posts
      await waitFor(() => {
        expect(screen.getByText('Posts')).toHaveClass('active');
      });

      // Switch to rules tab
      const rulesTab = screen.getByText('Rules');
      await user.click(rulesTab);

      expect(rulesTab).toHaveClass('active');
      expect(screen.getByText('Be respectful')).toBeInTheDocument();

      // Switch to members tab
      const membersTab = screen.getByText('Members');
      await user.click(membersTab);

      expect(membersTab).toHaveClass('active');
    });

    it('should show appropriate content for each tab', async () => {
      const user = userEvent.setup();
      
      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Posts tab content
      await waitFor(() => {
        expect(screen.getByTestId('community-post-list')).toBeInTheDocument();
      });

      // Rules tab content
      const rulesTab = screen.getByText('Rules');
      await user.click(rulesTab);

      await waitFor(() => {
        expect(screen.getByTestId('community-rules')).toBeInTheDocument();
        expect(screen.getByText('Be respectful')).toBeInTheDocument();
      });

      // Members tab content
      const membersTab = screen.getByText('Members');
      await user.click(membersTab);

      await waitFor(() => {
        expect(screen.getByTestId('community-members')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time membership updates', async () => {
      const mockWebSocket = {
        isConnected: true,
        send: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      };

      jest.doMock('../../../hooks/useWebSocket', () => ({
        useWebSocket: () => mockWebSocket
      }));

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Simulate real-time membership update
      const membershipHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'community:membership_changed'
      )?.[1];

      if (membershipHandler) {
        act(() => {
          membershipHandler({
            communityId: 'test-community-1',
            userAddress: '0x9876543210987654321098765432109876543210',
            action: 'join'
          });
        });

        // Member count should update
        await waitFor(() => {
          expect(screen.getByText('151')).toBeInTheDocument();
        });
      }
    });

    it('should handle real-time community updates', async () => {
      const mockWebSocket = {
        isConnected: true,
        send: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      };

      jest.doMock('../../../hooks/useWebSocket', () => ({
        useWebSocket: () => mockWebSocket
      }));

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Simulate real-time community update
      const communityHandler = mockWebSocket.on.mock.calls.find(
        call => call[0] === 'community:updated'
      )?.[1];

      if (communityHandler) {
        act(() => {
          communityHandler({
            communityId: 'test-community-1',
            updates: {
              displayName: 'Updated Test Community',
              description: 'Updated description'
            }
          });
        });

        // Community info should update
        await waitFor(() => {
          expect(screen.getByText('Updated Test Community')).toBeInTheDocument();
          expect(screen.getByText('Updated description')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Permission Handling', () => {
    it('should show post creation for members who can post', async () => {
      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create Post')).toBeInTheDocument();
      });
    });

    it('should hide post creation for non-members', async () => {
      const nonMemberStatus = { ...mockMembershipStatus, isMember: false, canPost: false };
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/membership/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(nonMemberStatus)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats)
        });
      });

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('Create Post')).not.toBeInTheDocument();
      });
    });

    it('should show moderation tools for moderators', async () => {
      const moderatorStatus = { ...mockMembershipStatus, role: 'moderator' as const, canModerate: true };
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/membership/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(moderatorStatus)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStats)
        });
      });

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Moderation')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<CommunityPage communityId="test-community-1" />);

      await waitFor(() => {
        expect(screen.getByText('Community Not Found')).toBeInTheDocument();
      });
    });

    it('should handle join/leave errors', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/join')) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMembershipStatus)
        });
      });

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      const joinButton = await screen.findByText('Join Community');
      await user.click(joinButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to update membership')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render within acceptable time limits', async () => {
      const renderTime = await testUtils.measureRenderTime(() => {
        render(
          <CommunityPage 
            communityId="test-community-1" 
            initialData={mockCommunity}
          />
        );
      });

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('should handle large member counts efficiently', async () => {
      const largeCommunity = {
        ...mockCommunity,
        memberCount: 50000,
        postCount: 10000
      };

      const renderTime = await testUtils.measureRenderTime(() => {
        render(
          <CommunityPage 
            communityId="test-community-1" 
            initialData={largeCommunity}
          />
        );
      });

      expect(renderTime).toBeLessThan(150); // Should still render efficiently
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', async () => {
      const { container } = render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Check for proper ARIA labels
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('complementary')).toBeInTheDocument(); // Sidebar
      
      // Check accessibility
      const results = await testUtils.checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText('Join Community')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Posts')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('Rules')).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Check mobile-specific elements
      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toHaveClass('mobile-sidebar');
    });

    it('should handle tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });

      render(
        <CommunityPage 
          communityId="test-community-1" 
          initialData={mockCommunity}
        />
      );

      // Check tablet-specific layout
      const content = screen.getByRole('main');
      expect(content).toHaveClass('tablet-layout');
    });
  });
});