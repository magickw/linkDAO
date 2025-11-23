import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BoostButton } from '../BoostButton';
import { TokenInfo } from '@/types/web3Post';

// Mock Web3 hooks
jest.mock('@/hooks/useWeb3', () => ({
  useWeb3: () => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    chainId: 1,
  }),
}));

// Mock gas fee estimation
jest.mock('@/services/web3/gasFeeService', () => ({
  estimateGasFee: jest.fn(() => Promise.resolve({ gasPrice: '20', gasLimit: '21000', totalCost: '0.42' })),
}));

describe('BoostButton', () => {
  const mockToken: TokenInfo = {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'LNK',
    decimals: 18,
    name: 'LinkDAO Token',
    logoUrl: 'https://example.com/token-logo.png',
    priceUSD: 1.25,
  };

  const mockProps = {
    postId: 'post-123',
    currentStake: 10.5,
    userBalance: 100.0,
    token: mockToken,
    onBoost: jest.fn(),
    size: 'md' as const,
    variant: 'primary' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders boost button with correct text', () => {
    render(<BoostButton {...mockProps} />);

    expect(screen.getByText('Boost Post')).toBeInTheDocument();
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('shows current stake when user has staked', () => {
    render(<BoostButton {...mockProps} />);

    expect(screen.getByText('Current: 10.5 LNK')).toBeInTheDocument();
  });

  it('opens staking modal when clicked', async () => {
    render(<BoostButton {...mockProps} />);

    const boostButton = screen.getByText('Boost Post');
    fireEvent.click(boostButton);

    await waitFor(() => {
      expect(screen.getByText('Boost This Post')).toBeInTheDocument();
      expect(screen.getByText('Stake tokens to increase post visibility')).toBeInTheDocument();
    });
  });

  it('displays user balance in modal', async () => {
    render(<BoostButton {...mockProps} />);

    fireEvent.click(screen.getByText('Boost Post'));

    await waitFor(() => {
      expect(screen.getByText('Balance: 100 LNK')).toBeInTheDocument();
    });
  });

  it('validates staking amount input', async () => {
    render(<BoostButton {...mockProps} />);

    fireEvent.click(screen.getByText('Boost Post'));

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter amount to stake');
      
      // Test invalid amount (more than balance)
      fireEvent.change(input, { target: { value: '150' } });
      expect(screen.getByText('Insufficient balance')).toBeInTheDocument();

      // Test valid amount
      fireEvent.change(input, { target: { value: '25' } });
      expect(screen.queryByText('Insufficient balance')).not.toBeInTheDocument();
    });
  });

  it('estimates gas fees when amount is entered', async () => {
    const mockEstimateGasFee = require('@/services/web3/gasFeeService').estimateGasFee;
    
    render(<BoostButton {...mockProps} />);

    fireEvent.click(screen.getByText('Boost Post'));

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter amount to stake');
      fireEvent.change(input, { target: { value: '25' } });
    });

    await waitFor(() => {
      expect(mockEstimateGasFee).toHaveBeenCalledWith('stake', 25);
      expect(screen.getByText('Gas Fee: ~$0.42')).toBeInTheDocument();
    });
  });

  it('calls onBoost when stake button is clicked', async () => {
    render(<BoostButton {...mockProps} />);

    fireEvent.click(screen.getByText('Boost Post'));

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter amount to stake');
      fireEvent.change(input, { target: { value: '25' } });
      
      const stakeButton = screen.getByText('Stake 25 LNK');
      fireEvent.click(stakeButton);
    });

    expect(mockProps.onBoost).toHaveBeenCalledWith('post-123', 25);
  });

  it('shows loading state during staking', async () => {
    const slowOnBoost = jest.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<BoostButton {...mockProps} onBoost={slowOnBoost} />);

    fireEvent.click(screen.getByText('Boost Post'));

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter amount to stake');
      fireEvent.change(input, { target: { value: '25' } });
      
      const stakeButton = screen.getByText('Stake 25 LNK');
      fireEvent.click(stakeButton);
    });

    expect(screen.getByText('Staking...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('handles different button sizes', () => {
    const { rerender } = render(<BoostButton {...mockProps} size="sm" />);
    
    let button = screen.getByText('Boost Post');
    expect(button).toHaveClass('size-sm');

    rerender(<BoostButton {...mockProps} size="lg" />);
    
    button = screen.getByText('Boost Post');
    expect(button).toHaveClass('size-lg');
  });

  it('handles different button variants', () => {
    const { rerender } = render(<BoostButton {...mockProps} variant="secondary" />);
    
    let button = screen.getByText('Boost Post');
    expect(button).toHaveClass('variant-secondary');

    rerender(<BoostButton {...mockProps} variant="outline" />);
    
    button = screen.getByText('Boost Post');
    expect(button).toHaveClass('variant-outline');
  });

  it('is disabled when user is not connected', () => {
    // Mock disconnected state
    jest.mocked(require('@/hooks/useWeb3').useWeb3).mockReturnValue({
      address: null,
      isConnected: false,
      chainId: null,
    });

    render(<BoostButton {...mockProps} />);

    const button = screen.getByText('Connect Wallet');
    expect(button).toBeDisabled();
  });

  it('shows insufficient balance state', () => {
    const propsWithLowBalance = { ...mockProps, userBalance: 5.0 };
    
    render(<BoostButton {...propsWithLowBalance} />);

    fireEvent.click(screen.getByText('Boost Post'));

    expect(screen.getByText('Insufficient Balance')).toBeInTheDocument();
    expect(screen.getByText('You need more LNK tokens to boost this post')).toBeInTheDocument();
  });

  it('closes modal when cancel is clicked', async () => {
    render(<BoostButton {...mockProps} />);

    fireEvent.click(screen.getByText('Boost Post'));

    await waitFor(() => {
      expect(screen.getByText('Boost This Post')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Boost This Post')).not.toBeInTheDocument();
    });
  });

  it('is accessible with proper ARIA labels', () => {
    render(<BoostButton {...mockProps} />);

    const button = screen.getByText('Boost Post');
    expect(button).toHaveAttribute('aria-label', 'Boost post by staking LNK tokens');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('handles error states gracefully', async () => {
    const errorOnBoost = jest.fn(() => Promise.reject(new Error('Transaction failed')));
    
    render(<BoostButton {...mockProps} onBoost={errorOnBoost} />);

    fireEvent.click(screen.getByText('Boost Post'));

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter amount to stake');
      fireEvent.change(input, { target: { value: '25' } });
      
      const stakeButton = screen.getByText('Stake 25 LNK');
      fireEvent.click(stakeButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Transaction failed')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('shows success state after successful staking', async () => {
    const successOnBoost = jest.fn(() => Promise.resolve({ txHash: '0xabc123' }));
    
    render(<BoostButton {...mockProps} onBoost={successOnBoost} />);

    fireEvent.click(screen.getByText('Boost Post'));

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Enter amount to stake');
      fireEvent.change(input, { target: { value: '25' } });
      
      const stakeButton = screen.getByText('Stake 25 LNK');
      fireEvent.click(stakeButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Staking Successful!')).toBeInTheDocument();
      expect(screen.getByText('Your 25 LNK has been staked')).toBeInTheDocument();
    });
  });
});