import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModeratorTools } from '../CommunityManagement/ModeratorTools';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

// Mock dependencies
jest.mock('@/context/Web3Context');
jest.mock('@/context/ToastContext');

const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockCommunity = {
  id: 'test-community',
  name: 'test-community',
  displayName: 'Test Community',
  description: 'A test community',
  moderators: ['0x1234567890123456789012345678901234567890'],
  memberCount: 100,
  settings: {
    allowedPostTypes: ['text', 'image', 'link'],
    requireApproval: false,
    minimumReputation: 0,
  },
};

const mockPendingPosts = [
  {
    id: '1',
    author: '0xabcd1234567890abcd1234567890abcd12345678',
    content: 'This post needs approval',
    communityId: 'test-community',
    createdAt: new Date(),
    status: 'pending',
  },
];

const mockReportedPosts = [
  {
    id: '2',
    author: '0xefgh1234567890efgh1234567890efgh12345678',
    content: 'This post was reported',
    communityId: 'test-community',
    createdAt: new Date(),
    reports: [
      {
        id: '1',
        reason: 'spam',
        reporter: '0x9876543210987654321098765432109876543210',
        createdAt: new Date(),
      },
    ],
  },
];

describe('ModeratorTools', () => {
  const mockAddToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseWeb3.mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true,
    } as any);

    mockUseToast.mockReturnValue({
      addToast: mockAddToast,
    } as any);

    // Mock fetch responses
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingPosts),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReportedPosts),
      });
  });

  it('renders moderator tools interface', async () => {
    render(<ModeratorTools community={mockCommunity} />);

    expect(screen.getByText('Moderator Tools')).toBeInTheDocument();
    expect(screen.getByText('Pending Posts')).toBeInTheDocument();
    expect(screen.getByText('Reported Posts')).toBeInTheDocument();
    expect(screen.getByText('Community Settings')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('This post needs approval')).toBeInTheDocument();
      expect(screen.getByText('This post was reported')).toBeInTheDocument();
    });
  });

  it('does not render for non-moderators', () => {
    const nonModeratorCommunity = {
      ...mockCommunity,
      moderators: ['0xother1234567890other1234567890other123456'],
    };

    render(<ModeratorTools community={nonModeratorCommunity} />);

    expect(screen.queryByText('Moderator Tools')).not.toBeInTheDocument();
  });

  it('approves pending posts', async () => {
    const mockApproveFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingPosts),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReportedPosts),
      })
      .mockResolvedValueOnce(mockApproveFetch());

    render(<ModeratorTools community={mockCommunity} />);

    await waitFor(() => {
      expect(screen.getByText('This post needs approval')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockApproveFetch).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith('Post approved', 'success');
    });
  });

  it('rejects pending posts', async () => {
    const mockRejectFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingPosts),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReportedPosts),
      })
      .mockResolvedValueOnce(mockRejectFetch());

    render(<ModeratorTools community={mockCommunity} />);

    await waitFor(() => {
      expect(screen.getByText('This post needs approval')).toBeInTheDocument();
    });

    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockRejectFetch).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith('Post rejected', 'success');
    });
  });

  it('removes reported posts', async () => {
    const mockRemoveFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingPosts),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReportedPosts),
      })
      .mockResolvedValueOnce(mockRemoveFetch());

    render(<ModeratorTools community={mockCommunity} />);

    await waitFor(() => {
      expect(screen.getByText('This post was reported')).toBeInTheDocument();
    });

    const removeButton = screen.getByText('Remove Post');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockRemoveFetch).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith('Post removed', 'success');
    });
  });

  it('dismisses reports', async () => {
    const mockDismissFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingPosts),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReportedPosts),
      })
      .mockResolvedValueOnce(mockDismissFetch());

    render(<ModeratorTools community={mockCommunity} />);

    await waitFor(() => {
      expect(screen.getByText('This post was reported')).toBeInTheDocument();
    });

    const dismissButton = screen.getByText('Dismiss Report');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(mockDismissFetch).toHaveBeenCalled();
      expect(mockAddToast).toHaveBeenCalledWith('Report dismissed', 'success');
    });
  });

  it('updates community settings', async () => {
    const mockUpdateFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPendingPosts),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReportedPosts),
      })
      .mockResolvedValueOnce(mockUpdateFetch());

    render(<ModeratorTools community={mockCommunity} />);

    // Toggle require approval setting
    const requireApprovalToggle = screen.getByLabelText(/require post approval/i);
    fireEvent.click(requireApprovalToggle);

    // Update minimum reputation
    const reputationInput = screen.getByLabelText(/minimum reputation/i);
    fireEvent.change(reputationInput, { target: { value: '10' } });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateFetch).toHaveBeenCalledWith(
        `/api/communities/${mockCommunity.id}/settings`,
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requireApproval: true,
            minimumReputation: 10,
            allowedPostTypes: ['text', 'image', 'link'],
          }),
        })
      );
      expect(mockAddToast).toHaveBeenCalledWith('Settings updated', 'success');
    });
  });

  it('handles errors gracefully', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    render(<ModeratorTools community={mockCommunity} />);

    await waitFor(() => {
      expect(screen.getByText('Error loading moderator data')).toBeInTheDocument();
    });
  });

  it('shows empty states when no pending or reported posts', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

    render(<ModeratorTools community={mockCommunity} />);

    await waitFor(() => {
      expect(screen.getByText('No pending posts')).toBeInTheDocument();
      expect(screen.getByText('No reported posts')).toBeInTheDocument();
    });
  });
});