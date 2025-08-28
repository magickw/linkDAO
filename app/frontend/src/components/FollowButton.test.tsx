import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowButton from './FollowButton';

// Mock the hooks used by FollowButton
jest.mock('@/hooks/useFollow', () => ({
  useFollow: () => ({
    follow: jest.fn().mockResolvedValue(undefined),
    unfollow: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
  }),
  useFollowStatus: () => ({
    isFollowing: false,
    isLoading: false,
    error: null,
  }),
}));

// Mock the Web3 context
jest.mock('@/context/Web3Context', () => ({
  useWeb3: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
  }),
}));

// Mock the Toast context
jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));

describe('FollowButton', () => {
  const mockTargetUserAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

  it('renders with default text when not following', () => {
    render(<FollowButton targetUserAddress={mockTargetUserAddress} />);
    
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  it('renders with "Following" text when following', () => {
    // Mock the useFollowStatus hook to return isFollowing = true
    jest.spyOn(require('@/hooks/useFollow'), 'useFollowStatus').mockReturnValue({
      isFollowing: true,
      isLoading: false,
      error: null,
    });
    
    render(<FollowButton targetUserAddress={mockTargetUserAddress} />);
    
    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  it('calls follow function when clicked and not following', async () => {
    const mockFollow = jest.fn().mockResolvedValue(undefined);
    
    // Mock the useFollow hook to return our mock function
    jest.spyOn(require('@/hooks/useFollow'), 'useFollow').mockReturnValue({
      follow: mockFollow,
      unfollow: jest.fn().mockResolvedValue(undefined),
      isLoading: false,
    });
    
    render(<FollowButton targetUserAddress={mockTargetUserAddress} />);
    
    const button = screen.getByText('Follow');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockFollow).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        mockTargetUserAddress
      );
    });
  });

  it('calls unfollow function when clicked and following', async () => {
    const mockUnfollow = jest.fn().mockResolvedValue(undefined);
    
    // Mock the useFollowStatus hook to return isFollowing = true
    jest.spyOn(require('@/hooks/useFollow'), 'useFollowStatus').mockReturnValue({
      isFollowing: true,
      isLoading: false,
      error: null,
    });
    
    // Mock the useFollow hook to return our mock function
    jest.spyOn(require('@/hooks/useFollow'), 'useFollow').mockReturnValue({
      follow: jest.fn().mockResolvedValue(undefined),
      unfollow: mockUnfollow,
      isLoading: false,
    });
    
    render(<FollowButton targetUserAddress={mockTargetUserAddress} />);
    
    const button = screen.getByText('Following');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockUnfollow).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        mockTargetUserAddress
      );
    });
  });

  it('shows loading state when action is in progress', () => {
    // Mock the useFollow hook to return isLoading = true
    jest.spyOn(require('@/hooks/useFollow'), 'useFollow').mockReturnValue({
      follow: jest.fn().mockResolvedValue(undefined),
      unfollow: jest.fn().mockResolvedValue(undefined),
      isLoading: true,
    });
    
    render(<FollowButton targetUserAddress={mockTargetUserAddress} />);
    
    expect(screen.getByText('Following...')).toBeInTheDocument();
  });
});