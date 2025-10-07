/**
 * Unit Tests for ModerationDashboard Component
 * Tests moderation functionality, item management, and bulk actions
 * Requirements: 2.5, 2.6
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModerationDashboard } from '../../../components/Community/ModerationDashboard';
import { testUtils } from '../../setup/testSetup';

// Mock dependencies
global.fetch = jest.fn();

describe('ModerationDashboard Component', () => {
  const mockModerationItems = [
    {
      id: 'item-1',
      type: 'post' as const,
      content: 'This is a test post that needs moderation review',
      author: {
        address: '0x1234567890123456789012345678901234567890',
        ensName: 'testuser.eth',
        reputation: 150
      },
      reportedBy: '0x9876543210987654321098765432109876543210',
      reason: 'Inappropriate content',
      severity: 'medium' as const,
      status: 'pending' as const,
      createdAt: new Date('2023-12-01'),
      reportedAt: new Date('2023-12-02')
    },
    {
      id: 'item-2',
      type: 'comment' as const,
      content: 'This is a spam comment that should be removed',
      author: {
        address: '0x5555666677778888999900001111222233334444',
        reputation: 25
      },
      reason: 'Spam',
      severity: 'high' as const,
      status: 'pending' as const,
      createdAt: new Date('2023-12-01'),
      reportedAt: new Date('2023-12-02')
    }
  ];

  const mockModerationStats = {
    pendingItems: 5,
    approvedToday: 12,
    rejectedToday: 3,
    totalReports: 25,
    averageResponseTime: 45,
    activeReports: 8
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default fetch responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/moderation/items')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockModerationItems })
        });
      }
      if (url.includes('/moderation/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModerationStats)
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Access Control', () => {
    it('should show access denied for non-moderators', () => {
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={false}
        />
      );

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText("You don't have permission to access moderation tools.")).toBeInTheDocument();
    });

    it('should show dashboard for moderators', async () => {
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Moderation Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Manage community content and user reports')).toBeInTheDocument();
      });
    });
  });

  describe('Stats Display', () => {
    it('should display moderation statistics correctly', async () => {
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Pending items
        expect(screen.getByText('12')).toBeInTheDocument(); // Approved today
        expect(screen.getByText('3')).toBeInTheDocument(); // Rejected today
        expect(screen.getByText('8')).toBeInTheDocument(); // Active reports
      });

      expect(screen.getByText('Pending Review')).toBeInTheDocument();
      expect(screen.getByText('Approved Today')).toBeInTheDocument();
      expect(screen.getByText('Rejected Today')).toBeInTheDocument();
      expect(screen.getByText('Active Reports')).toBeInTheDocument();
    });

    it('should handle missing stats gracefully', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/moderation/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(null)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: [] })
        });
      });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Moderation Dashboard')).toBeInTheDocument();
      });

      // Should not crash without stats
      expect(screen.queryByText('Pending Review')).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between different status tabs', async () => {
      const user = userEvent.setup();
      
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('⏳ Pending (5)')).toBeInTheDocument();
      });

      // Switch to reports tab
      const reportsTab = screen.getByText('🚩 Reports (8)');
      await user.click(reportsTab);

      expect(reportsTab).toHaveClass('active');

      // Switch to approved tab
      const approvedTab = screen.getByText('✅ Approved');
      await user.click(approvedTab);

      expect(approvedTab).toHaveClass('active');

      // Switch to rejected tab
      const rejectedTab = screen.getByText('❌ Rejected');
      await user.click(rejectedTab);

      expect(rejectedTab).toHaveClass('active');
    });

    it('should load different items for each tab', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('status=reports')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
              items: mockModerationItems.filter(item => item.reportedBy) 
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockModerationItems })
        });
      });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      // Switch to reports tab
      const reportsTab = await screen.findByText('🚩 Reports (8)');
      await user.click(reportsTab);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=reports'),
          undefined
        );
      });
    });
  });

  describe('Item Display', () => {
    it('should display moderation items correctly', async () => {
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        // Check first item
        expect(screen.getByText('This is a test post that needs moderation review')).toBeInTheDocument();
        expect(screen.getByText('testuser.eth')).toBeInTheDocument();
        expect(screen.getByText('(150 rep)')).toBeInTheDocument();
        expect(screen.getByText('Inappropriate content')).toBeInTheDocument();

        // Check second item
        expect(screen.getByText('This is a spam comment that should be removed')).toBeInTheDocument();
        expect(screen.getByText('Spam')).toBeInTheDocument();
      });
    });

    it('should show correct icons and severity indicators', async () => {
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        // Check type icons
        expect(screen.getByText('📝 post')).toBeInTheDocument();
        expect(screen.getByText('💬 comment')).toBeInTheDocument();

        // Check severity indicators
        expect(screen.getByText('⚠️ medium')).toBeInTheDocument();
        expect(screen.getByText('🚨 high')).toBeInTheDocument();
      });
    });

    it('should truncate long content appropriately', async () => {
      const longContentItem = {
        ...mockModerationItems[0],
        content: 'This is a very long piece of content that should be truncated when displayed in the moderation dashboard because it exceeds the maximum length limit that we have set for preview purposes in the interface design.'
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/moderation/items')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: [longContentItem] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModerationStats)
        });
      });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/This is a very long piece of content.*\.\.\./)).toBeInTheDocument();
      });
    });
  });

  describe('Individual Actions', () => {
    it('should handle approve action', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes('/moderation/items/item-1') && options?.method === 'PUT') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockModerationItems })
        });
      });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✅ Approve')).toBeInTheDocument();
      });

      const approveButton = screen.getAllByText('✅ Approve')[0];
      await user.click(approveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/moderation/items/item-1'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ action: 'approve' })
          })
        );
      });
    });

    it('should handle reject action', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes('/moderation/items/item-1') && options?.method === 'PUT') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockModerationItems })
        });
      });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('❌ Reject')).toBeInTheDocument();
      });

      const rejectButton = screen.getAllByText('❌ Reject')[0];
      await user.click(rejectButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/moderation/items/item-1'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ action: 'reject' })
          })
        );
      });
    });

    it('should handle escalate action', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes('/moderation/items/item-1') && options?.method === 'PUT') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockModerationItems })
        });
      });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('⬆️ Escalate')).toBeInTheDocument();
      });

      const escalateButton = screen.getAllByText('⬆️ Escalate')[0];
      await user.click(escalateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/moderation/items/item-1'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ action: 'escalate' })
          })
        );
      });
    });

    it('should remove item from list after action', async () => {
      const user = userEvent.setup();
      
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('This is a test post that needs moderation review')).toBeInTheDocument();
      });

      const approveButton = screen.getAllByText('✅ Approve')[0];
      await user.click(approveButton);

      await waitFor(() => {
        expect(screen.queryByText('This is a test post that needs moderation review')).not.toBeInTheDocument();
      });
    });
  });

  describe('Bulk Actions', () => {
    it('should allow selecting multiple items', async () => {
      const user = userEvent.setup();
      
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox')).toHaveLength(2);
      });

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      expect(screen.getByText('2 items selected')).toBeInTheDocument();
    });

    it('should show bulk actions when items are selected', async () => {
      const user = userEvent.setup();
      
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox')).toHaveLength(2);
      });

      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      expect(screen.getByText('1 item selected')).toBeInTheDocument();
      expect(screen.getByText('Select Action')).toBeInTheDocument();
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });

    it('should handle bulk approve action', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes('/moderation/bulk') && options?.method === 'POST') {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockModerationItems })
        });
      });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox')).toHaveLength(2);
      });

      // Select items
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      // Select bulk action
      const actionSelect = screen.getByDisplayValue('Select Action');
      await user.selectOptions(actionSelect, 'approve');

      // Apply action
      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/moderation/bulk'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              action: 'approve',
              itemIds: ['item-1', 'item-2']
            })
          })
        );
      });
    });

    it('should clear selection after bulk action', async () => {
      const user = userEvent.setup();
      
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('checkbox')).toHaveLength(2);
      });

      // Select items
      const checkbox = screen.getAllByRole('checkbox')[0];
      await user.click(checkbox);

      expect(screen.getByText('1 item selected')).toBeInTheDocument();

      // Clear selection
      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      expect(screen.queryByText('1 item selected')).not.toBeInTheDocument();
    });

    it('should select all items', async () => {
      const user = userEvent.setup();
      
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Select All (2)')).toBeInTheDocument();
      });

      const selectAllButton = screen.getByText('Select All (2)');
      await user.click(selectAllButton);

      expect(screen.getByText('2 items selected')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no items', async () => {
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/moderation/items')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: [] })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModerationStats)
        });
      });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No items to review')).toBeInTheDocument();
        expect(screen.getByText('All caught up! Check back later for new items.')).toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      expect(screen.getByText('Loading moderation items...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to load items')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('should handle action errors', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
        if (url.includes('/moderation/items/item-1') && options?.method === 'PUT') {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ items: mockModerationItems })
        });
      });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✅ Approve')).toBeInTheDocument();
      });

      const approveButton = screen.getAllByText('✅ Approve')[0];
      await user.click(approveButton);

      // Item should still be in the list since action failed
      await waitFor(() => {
        expect(screen.getByText('This is a test post that needs moderation review')).toBeInTheDocument();
      });
    });

    it('should retry loading on error', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementation((url: string) => {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: mockModerationItems })
          });
        });

      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('This is a test post that needs moderation review')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render efficiently with many items', async () => {
      const manyItems = Array.from({ length: 50 }, (_, i) => ({
        ...mockModerationItems[0],
        id: `item-${i}`,
        content: `Test content ${i}`
      }));

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/moderation/items')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ items: manyItems })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModerationStats)
        });
      });

      const renderTime = await testUtils.measureRenderTime(() => {
        render(
          <ModerationDashboard 
            communityId="test-community-1" 
            canModerate={true}
          />
        );
      });

      expect(renderTime).toBeLessThan(200); // Should render efficiently even with many items
    });
  });

  describe('Accessibility', () => {
    it('should be accessible to screen readers', async () => {
      const { container } = render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Moderation Dashboard')).toBeInTheDocument();
      });

      // Check accessibility
      const results = await testUtils.checkAccessibility(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <ModerationDashboard 
          communityId="test-community-1" 
          canModerate={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('⏳ Pending (5)')).toBeInTheDocument();
      });

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByText('⏳ Pending (5)')).toHaveFocus();

      await user.tab();
      expect(screen.getByText('🚩 Reports (8)')).toHaveFocus();
    });
  });
});