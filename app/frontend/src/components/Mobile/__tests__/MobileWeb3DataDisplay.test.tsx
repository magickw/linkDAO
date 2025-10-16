import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileWeb3DataDisplay } from '../MobileWeb3DataDisplay';
import { TokenInfo, StakingInfo } from '@/types/web3Post';

// Mock responsive hook
jest.mock('@/hooks/useResponsive', () => ({
  useResponsive: () => ({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    screenSize: 'mobile',
  }),
}));

// Mock framer-motion for mobile animations
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('MobileWeb3DataDisplay', () => {
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

  const mockProps = {
    token: mockToken,
    stakingInfo: mockStakingInfo,
    userBalance: 100.0,
    votingPower: 75,
    onStake: jest.fn(),
    onTip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders mobile-optimized Web3 data display', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    expect(screen.getByTestId('mobile-web3-display')).toBeInTheDocument();
    expect(screen.getByText('LNK')).toBeInTheDocument();
    expect(screen.getByText('$1.25')).toBeInTheDocument();
  });

  it('displays token information in compact format', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    // Should show compact token info
    expect(screen.getByText('LNK')).toBeInTheDocument();
    expect(screen.getByText('$1.25')).toBeInTheDocument();
    expect(screen.getByText('+5.67%')).toBeInTheDocument();
  });

  it('shows staking information in mobile-friendly layout', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    expect(screen.getByText('150.75 LNK')).toBeInTheDocument();
    expect(screen.getByText('12 stakers')).toBeInTheDocument();
    expect(screen.getByText('Your stake: 25.5 LNK')).toBeInTheDocument();
  });

  it('displays user balance prominently', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    expect(screen.getByText('Balance: 100 LNK')).toBeInTheDocument();
  });

  it('shows voting power when provided', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    expect(screen.getByText('Voting Power: 75')).toBeInTheDocument();
  });

  it('renders touch-friendly action buttons', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    const stakeButton = screen.getByText('Stake');
    const tipButton = screen.getByText('Tip');

    expect(stakeButton).toBeInTheDocument();
    expect(tipButton).toBeInTheDocument();
    
    // Should have mobile-friendly sizing
    expect(stakeButton).toHaveClass('touch-target');
    expect(tipButton).toHaveClass('touch-target');
  });

  it('handles stake button interaction', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    const stakeButton = screen.getByText('Stake');
    fireEvent.click(stakeButton);

    expect(mockProps.onStake).toHaveBeenCalled();
  });

  it('handles tip button interaction', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    const tipButton = screen.getByText('Tip');
    fireEvent.click(tipButton);

    expect(mockProps.onTip).toHaveBeenCalled();
  });

  it('displays tier badge with appropriate mobile styling', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    const tierBadge = screen.getByTestId('tier-badge');
    expect(tierBadge).toHaveClass('tier-gold');
    expect(tierBadge).toHaveClass('mobile-size');
  });

  it('shows expandable details section', async () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    const expandButton = screen.getByText('Details');
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Token Details')).toBeInTheDocument();
      expect(screen.getByText('Contract: 0x1234...7890')).toBeInTheDocument();
      expect(screen.getByText('Decimals: 18')).toBeInTheDocument();
    });
  });

  it('collapses details when clicked again', async () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    const expandButton = screen.getByText('Details');
    
    // Expand
    fireEvent.click(expandButton);
    await waitFor(() => {
      expect(screen.getByText('Token Details')).toBeInTheDocument();
    });

    // Collapse
    fireEvent.click(expandButton);
    await waitFor(() => {
      expect(screen.queryByText('Token Details')).not.toBeInTheDocument();
    });
  });

  it('handles missing optional data gracefully', () => {
    const propsWithoutOptional = {
      ...mockProps,
      votingPower: undefined,
      stakingInfo: { ...mockStakingInfo, userStake: undefined },
    };

    render(<MobileWeb3DataDisplay {...propsWithoutOptional} />);

    expect(screen.queryByText('Voting Power:')).not.toBeInTheDocument();
    expect(screen.queryByText('Your stake:')).not.toBeInTheDocument();
  });

  it('displays loading state for async data', () => {
    const propsWithLoading = {
      ...mockProps,
      isLoading: true,
    };

    render(<MobileWeb3DataDisplay {...propsWithLoading} />);

    expect(screen.getByTestId('mobile-loading-skeleton')).toBeInTheDocument();
  });

  it('shows error state when data fails to load', () => {
    const propsWithError = {
      ...mockProps,
      error: 'Failed to load token data',
    };

    render(<MobileWeb3DataDisplay {...propsWithError} />);

    expect(screen.getByText('Failed to load token data')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('formats numbers appropriately for mobile display', () => {
    const propsWithLargeNumbers = {
      ...mockProps,
      stakingInfo: {
        ...mockStakingInfo,
        totalStaked: 1234567.89,
        stakerCount: 1500,
      },
      userBalance: 9876.54,
    };

    render(<MobileWeb3DataDisplay {...propsWithLargeNumbers} />);

    expect(screen.getByText('1.23M LNK')).toBeInTheDocument();
    expect(screen.getByText('1.5K stakers')).toBeInTheDocument();
    expect(screen.getByText('Balance: 9.88K LNK')).toBeInTheDocument();
  });

  it('supports swipe gestures for navigation', async () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    const display = screen.getByTestId('mobile-web3-display');
    
    // Simulate swipe left
    fireEvent.touchStart(display, {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    fireEvent.touchMove(display, {
      touches: [{ clientX: 50, clientY: 100 }],
    });
    fireEvent.touchEnd(display);

    await waitFor(() => {
      // Should trigger next section or action
      expect(screen.getByTestId('swipe-indicator')).toBeInTheDocument();
    });
  });

  it('is accessible with proper mobile ARIA labels', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    const display = screen.getByTestId('mobile-web3-display');
    expect(display).toHaveAttribute('aria-label', 'Web3 token and staking information');
    
    const stakeButton = screen.getByText('Stake');
    expect(stakeButton).toHaveAttribute('aria-label', 'Stake LNK tokens');
    
    const tipButton = screen.getByText('Tip');
    expect(tipButton).toHaveAttribute('aria-label', 'Tip with LNK tokens');
  });

  it('handles different screen orientations', () => {
    // Mock landscape orientation
    Object.defineProperty(screen, 'orientation', {
      value: { angle: 90 },
      writable: true,
    });

    render(<MobileWeb3DataDisplay {...mockProps} />);

    const display = screen.getByTestId('mobile-web3-display');
    expect(display).toHaveClass('landscape-layout');
  });

  it('supports haptic feedback on interactions', () => {
    // Mock vibrate API
    const mockVibrate = jest.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      writable: true,
    });

    render(<MobileWeb3DataDisplay {...mockProps} enableHaptics={true} />);

    const stakeButton = screen.getByText('Stake');
    fireEvent.click(stakeButton);

    expect(mockVibrate).toHaveBeenCalledWith(50); // Short vibration
  });

  it('adjusts font sizes for readability', () => {
    render(<MobileWeb3DataDisplay {...mockProps} />);

    const priceText = screen.getByText('$1.25');
    expect(priceText).toHaveClass('text-lg'); // Larger text for mobile

    const balanceText = screen.getByText('Balance: 100 LNK');
    expect(balanceText).toHaveClass('text-base'); // Readable size
  });

  it('shows connection status indicator', () => {
    render(<MobileWeb3DataDisplay {...mockProps} isConnected={true} />);

    expect(screen.getByTestId('connection-indicator')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('handles offline state gracefully', () => {
    render(<MobileWeb3DataDisplay {...mockProps} isOffline={true} />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Some features may be limited')).toBeInTheDocument();
  });

  it('supports dark mode on mobile', () => {
    render(<MobileWeb3DataDisplay {...mockProps} theme="dark" />);

    const display = screen.getByTestId('mobile-web3-display');
    expect(display).toHaveClass('dark-theme');
  });

  it('handles pull-to-refresh gesture', async () => {
    const mockOnRefresh = jest.fn();
    
    render(<MobileWeb3DataDisplay {...mockProps} onRefresh={mockOnRefresh} />);

    const display = screen.getByTestId('mobile-web3-display');
    
    // Simulate pull-to-refresh
    fireEvent.touchStart(display, {
      touches: [{ clientX: 100, clientY: 50 }],
    });
    fireEvent.touchMove(display, {
      touches: [{ clientX: 100, clientY: 150 }],
    });
    fireEvent.touchEnd(display);

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });
});