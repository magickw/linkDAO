import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StakingIndicator } from '../StakingIndicator';
import { StakingInfo, TokenInfo } from '@/types/web3Post';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('StakingIndicator', () => {
  const mockToken: TokenInfo = {
    address: '0x1234567890123456789012345678901234567890',
    symbol: 'LNK',
    decimals: 18,
    name: 'LinkDAO Token',
    logoUrl: 'https://example.com/token-logo.png',
    priceUSD: 1.25,
    priceChange24h: 5.67,
  };

  const mockStakingInfo: StakingInfo = {
    totalStaked: 150.75,
    stakerCount: 12,
    stakingTier: 'gold',
    userStake: 25.5,
  };

  it('renders staking indicator with token amount', () => {
    render(
      <StakingIndicator 
        stakingInfo={mockStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    expect(screen.getByText('150.75 LNK')).toBeInTheDocument();
    expect(screen.getByText('12 stakers')).toBeInTheDocument();
  });

  it('displays correct tier styling for gold tier', () => {
    render(
      <StakingIndicator 
        stakingInfo={mockStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    const indicator = screen.getByTestId('staking-indicator');
    expect(indicator).toHaveClass('tier-gold');
  });

  it('displays correct tier styling for silver tier', () => {
    const silverStakingInfo = { ...mockStakingInfo, stakingTier: 'silver' as const };
    
    render(
      <StakingIndicator 
        stakingInfo={silverStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    const indicator = screen.getByTestId('staking-indicator');
    expect(indicator).toHaveClass('tier-silver');
  });

  it('displays correct tier styling for bronze tier', () => {
    const bronzeStakingInfo = { ...mockStakingInfo, stakingTier: 'bronze' as const };
    
    render(
      <StakingIndicator 
        stakingInfo={bronzeStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    const indicator = screen.getByTestId('staking-indicator');
    expect(indicator).toHaveClass('tier-bronze');
  });

  it('shows tooltip when showTooltip is true', async () => {
    render(
      <StakingIndicator 
        stakingInfo={mockStakingInfo}
        token={mockToken}
        size="md"
        showTooltip={true}
      />
    );

    const indicator = screen.getByTestId('staking-indicator');
    fireEvent.mouseEnter(indicator);

    await waitFor(() => {
      expect(screen.getByText('Staking Details')).toBeInTheDocument();
      expect(screen.getByText('Total Staked: 150.75 LNK')).toBeInTheDocument();
      expect(screen.getByText('Your Stake: 25.5 LNK')).toBeInTheDocument();
    });
  });

  it('handles different sizes correctly', () => {
    const { rerender } = render(
      <StakingIndicator 
        stakingInfo={mockStakingInfo}
        token={mockToken}
        size="sm"
      />
    );

    let indicator = screen.getByTestId('staking-indicator');
    expect(indicator).toHaveClass('size-sm');

    rerender(
      <StakingIndicator 
        stakingInfo={mockStakingInfo}
        token={mockToken}
        size="lg"
      />
    );

    indicator = screen.getByTestId('staking-indicator');
    expect(indicator).toHaveClass('size-lg');
  });

  it('displays token logo when available', () => {
    render(
      <StakingIndicator 
        stakingInfo={mockStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    const tokenLogo = screen.getByAltText('LNK token');
    expect(tokenLogo).toBeInTheDocument();
    expect(tokenLogo).toHaveAttribute('src', mockToken.logoUrl);
  });

  it('handles zero staking gracefully', () => {
    const zeroStakingInfo: StakingInfo = {
      totalStaked: 0,
      stakerCount: 0,
      stakingTier: 'none',
    };

    render(
      <StakingIndicator 
        stakingInfo={zeroStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    expect(screen.getByText('0 LNK')).toBeInTheDocument();
    expect(screen.getByText('No stakers')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const largeStakingInfo: StakingInfo = {
      totalStaked: 1234567.89,
      stakerCount: 1500,
      stakingTier: 'gold',
    };

    render(
      <StakingIndicator 
        stakingInfo={largeStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    expect(screen.getByText('1.23M LNK')).toBeInTheDocument();
    expect(screen.getByText('1.5K stakers')).toBeInTheDocument();
  });

  it('is accessible with proper ARIA labels', () => {
    render(
      <StakingIndicator 
        stakingInfo={mockStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    const indicator = screen.getByTestId('staking-indicator');
    expect(indicator).toHaveAttribute('aria-label', 'Staking indicator: 150.75 LNK staked by 12 users, gold tier');
    expect(indicator).toHaveAttribute('role', 'status');
  });

  it('handles missing token logo gracefully', () => {
    const tokenWithoutLogo = { ...mockToken, logoUrl: undefined };
    
    render(
      <StakingIndicator 
        stakingInfo={mockStakingInfo}
        token={tokenWithoutLogo}
        size="md"
      />
    );

    // Should show default token icon or symbol
    expect(screen.getByText('LNK')).toBeInTheDocument();
  });

  it('updates when staking info changes', () => {
    const { rerender } = render(
      <StakingIndicator 
        stakingInfo={mockStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    expect(screen.getByText('150.75 LNK')).toBeInTheDocument();

    const updatedStakingInfo = { ...mockStakingInfo, totalStaked: 200.5, stakerCount: 15 };
    
    rerender(
      <StakingIndicator 
        stakingInfo={updatedStakingInfo}
        token={mockToken}
        size="md"
      />
    );

    expect(screen.getByText('200.5 LNK')).toBeInTheDocument();
    expect(screen.getByText('15 stakers')).toBeInTheDocument();
  });
});