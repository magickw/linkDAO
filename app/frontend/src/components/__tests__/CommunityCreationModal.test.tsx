import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommunityCreationModal } from '../CommunityManagement/CommunityCreationModal';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

// Mock dependencies
jest.mock('@/context/Web3Context');
jest.mock('@/context/ToastContext');

const mockUseWeb3 = useWeb3 as jest.MockedFunction<typeof useWeb3>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe('CommunityCreationModal', () => {
  const mockOnClose = jest.fn();
  const mockOnCommunityCreated = jest.fn();
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
  });

  it('renders community creation form when open', () => {
    render(
      <CommunityCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCommunityCreated={mockOnCommunityCreated}
      />
    );

    expect(screen.getByText('Create Community')).toBeInTheDocument();
    expect(screen.getByLabelText(/community name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CommunityCreationModal
        isOpen={false}
        onClose={mockOnClose}
        onCommunityCreated={mockOnCommunityCreated}
      />
    );

    expect(screen.queryByText('Create Community')).not.toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <CommunityCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCommunityCreated={mockOnCommunityCreated}
      />
    );

    const createButton = screen.getByText('Create Community');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/community name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
    });
  });

  it('validates community name format', async () => {
    render(
      <CommunityCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCommunityCreated={mockOnCommunityCreated}
      />
    );

    const nameInput = screen.getByLabelText(/community name/i);
    fireEvent.change(nameInput, { target: { value: 'Invalid Name!' } });

    const createButton = screen.getByText('Create Community');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText(/only letters, numbers, and hyphens allowed/i)).toBeInTheDocument();
    });
  });

  it('creates community with valid data', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 'test-community',
        name: 'test-community',
        displayName: 'Test Community',
        description: 'A test community',
        category: 'Technology',
      }),
    });
    global.fetch = mockFetch;

    render(
      <CommunityCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCommunityCreated={mockOnCommunityCreated}
      />
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/community name/i), {
      target: { value: 'test-community' },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Test Community' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'A test community' },
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: 'Technology' },
    });

    const createButton = screen.getByText('Create Community');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/communities', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'test-community',
          displayName: 'Test Community',
          description: 'A test community',
          category: 'Technology',
          isPublic: true,
          creator: '0x1234567890123456789012345678901234567890',
        }),
      }));
      expect(mockOnCommunityCreated).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles creation errors gracefully', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Community name already exists' }),
    });
    global.fetch = mockFetch;

    render(
      <CommunityCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCommunityCreated={mockOnCommunityCreated}
      />
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/community name/i), {
      target: { value: 'existing-community' },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: 'Existing Community' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'A community that already exists' },
    });

    const createButton = screen.getByText('Create Community');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(
        'Community name already exists',
        'error'
      );
    });
  });

  it('closes modal when cancel button is clicked', () => {
    render(
      <CommunityCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCommunityCreated={mockOnCommunityCreated}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when clicking outside', () => {
    render(
      <CommunityCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onCommunityCreated={mockOnCommunityCreated}
      />
    );

    const backdrop = screen.getByTestId('modal-backdrop');
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });
});