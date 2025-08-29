import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the contexts before importing the component
const mockAddToast = jest.fn();
const mockUseToast = jest.fn(() => ({
  toasts: [],
  addToast: mockAddToast,
  removeToast: jest.fn()
}));

jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    chainId: 1,
    isLoading: false,
    error: null
  })
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: mockUseToast
}));

import UnifiedPostCreation from '../UnifiedPostCreation';

describe('UnifiedPostCreation', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAddToast.mockClear();
    localStorage.clear();
  });

  it('renders in collapsed state by default', () => {
    render(
      <UnifiedPostCreation
        context="feed"
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText("What's happening in Web3?")).toBeInTheDocument();
    expect(screen.getByText('Click to create post')).toBeInTheDocument();
  });

  it('renders in expanded state when expanded prop is true', () => {
    render(
      <UnifiedPostCreation
        context="feed"
        onSubmit={mockOnSubmit}
        expanded={true}
      />
    );

    expect(screen.getByText('Create Post')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toBeInTheDocument();
  });

  it('shows community-specific placeholder in community context', () => {
    render(
      <UnifiedPostCreation
        context="community"
        communityId="test-community"
        onSubmit={mockOnSubmit}
        expanded={true}
      />
    );

    expect(screen.getByPlaceholderText('Share your thoughts with the community...')).toBeInTheDocument();
    expect(screen.getByText('Create Community Post')).toBeInTheDocument();
  });

  it('shows different post types for feed vs community context', () => {
    const { rerender } = render(
      <UnifiedPostCreation
        context="feed"
        onSubmit={mockOnSubmit}
        expanded={true}
      />
    );

    // Feed context should have Proposal
    expect(screen.getByText('Proposal')).toBeInTheDocument();

    rerender(
      <UnifiedPostCreation
        context="community"
        communityId="test-community"
        onSubmit={mockOnSubmit}
        expanded={true}
      />
    );

    // Community context should have Discussion and Question
    expect(screen.getByText('Discussion')).toBeInTheDocument();
    expect(screen.getByText('Question')).toBeInTheDocument();
    expect(screen.queryByText('Proposal')).not.toBeInTheDocument();
  });

  it('validates required fields before submission', async () => {
    const user = userEvent.setup();
    
    render(
      <UnifiedPostCreation
        context="feed"
        onSubmit={mockOnSubmit}
        expanded={true}
      />
    );

    const contentInput = screen.getByLabelText('Content');
    const submitButton = screen.getByText('Post');
    
    // Check that the content input is required
    expect(contentInput).toBeRequired();
    
    // Check that submit button is disabled when content is empty
    expect(submitButton).toBeDisabled();
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    
    render(
      <UnifiedPostCreation
        context="feed"
        onSubmit={mockOnSubmit}
        expanded={true}
      />
    );

    const contentInput = screen.getByLabelText('Content');
    const tagsInput = screen.getByLabelText('Tags (comma separated)');
    
    await user.type(contentInput, 'Test post content');
    await user.type(tagsInput, 'test, web3');

    const submitButton = screen.getByText('Post');
    await user.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledWith({
      author: '0x1234567890123456789012345678901234567890',
      content: 'Test post content',
      tags: ['test', 'web3', 'standard']
    });
  });
});