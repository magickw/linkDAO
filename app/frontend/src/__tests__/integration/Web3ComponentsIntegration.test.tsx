import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Web3Provider } from '@/contexts/Web3Context';
import { StakingIndicator } from '@/components/Staking/StakingIndicator';
import { BoostButton } from '@/components/Staking/BoostButton';
import { OnChainVerificationBadge } from '@/components/OnChainVerification/OnChainVerificationBadge';
import { GovernanceVotingButton } from '@/components/SmartContractInteraction/GovernanceVotingButton';
import { LiveTokenPriceDisplay } from '@/components/RealTimeUpdates/LiveTokenPriceDisplay';
import { MobileWeb3DataDisplay } from '@/components/Mobile/MobileWeb3DataDisplay';
import { mockData, mockWeb3ServiceResponses, createMockWebSocket } from '../mocks/web3MockData';
import { runWeb3AccessibilityTests } from '../utils/web3AccessibilityUtils';

// Mock Web3 services
jest.mock('@/services/web3/tokenService', () => mockWeb3ServiceResponses);
jest.mock('@/services/web3/governanceService', () => mockWeb3ServiceResponses);
jest.mock('@/services/web3/stakingService', () => mockWeb3ServiceResponses);

// Mock WebSocket
global.WebSocket = jest.fn(() => createMockWebSocket()) as any;

// Test wrapper with all necessary providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
        {children}
      </Web3Provider>
    </QueryClientProvider>
  );
};

describe('Web3 Components Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Staking System Integration', () => {
    it('integrates staking indicator with boost button functionality', async () => {
      const mockOnBoost = jest.fn();
      
      const { container } = render(
        <TestWrapper>
          <div>
            <StakingIndicator 
              stakingInfo={mockData.stakingInfo}
              token={mockData.token}
              size="md"
              showTooltip={true}
            />
            <BoostButton
              postId="post-123"
              currentStake={mockData.stakingInfo.userStake || 0}
              userBalance={100}
              token={mockData.token}
              onBoost={mockOnBoost}
              size="md"
              variant="primary"
            />
          </div>
        </TestWrapper>
      );

      // Verify staking indicator displays current state
      expect(screen.getByText('150.75 LNK')).toBeInTheDocument();
      expect(screen.getByText('12 stakers')).toBeInTheDocument();

      // Interact with boost button
      const boostButton = screen.getByText('Boost Post');
      fireEvent.click(boostButton);

      await waitFor(() => {
        expect(screen.getByText('Boost This Post')).toBeInTheDocument();
      });

      // Enter staking amount
      const amountInput = screen.getByPlaceholderText('Enter amount to stake');
      fireEvent.change(amountInput, { target: { value: '25' } });

      // Confirm staking
      const confirmButton = screen.getByText('Stake 25 LNK');
      fireEvent.click(confirmButton);

      expect(mockOnBoost).toHaveBeenCalledWith('post-123', 25);

      // Test accessibility
      await runWeb3AccessibilityTests({ container });
    });

    it('handles real-time staking updates across components', async () => {
      const mockWebSocket = createMockWebSocket();
      global.WebSocket = jest.fn(() => mockWebSocket) as any;

      render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={mockData.stakingInfo}
            token={mockData.token}
            size="md"
          />
        </TestWrapper>
      );

      // Initial state
      expect(screen.getByText('150.75 LNK')).toBeInTheDocument();

      // Simulate WebSocket update
      const updateMessage = {
        data: JSON.stringify({
          postId: 'post-123',
          stakingInfo: {
            ...mockData.stakingInfo,
            totalStaked: 175.75,
            stakerCount: 13,
          },
        }),
      };

      // Trigger WebSocket message handler
      if (mockWebSocket.addEventListener.mock.calls.length > 0) {
        const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'message'
        )?.[1];
        
        if (messageHandler) {
          messageHandler(updateMessage);
        }
      }

      await waitFor(() => {
        expect(screen.getByText('175.75 LNK')).toBeInTheDocument();
        expect(screen.getByText('13 stakers')).toBeInTheDocument();
      });
    });
  });

  describe('Governance Integration', () => {
    it('integrates on-chain verification with governance voting', async () => {
      const mockOnVote = jest.fn();
      
      const { container } = render(
        <TestWrapper>
          <div>
            <OnChainVerificationBadge
              proof={mockData.onChainProof}
              explorerBaseUrl="https://etherscan.io"
              onViewTransaction={jest.fn()}
            />
            <GovernanceVotingButton
              proposal={mockData.proposal}
              userVotingPower={100}
              onVote={mockOnVote}
            />
          </div>
        </TestWrapper>
      );

      // Verify on-chain verification badge
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Governance Vote')).toBeInTheDocument();

      // Interact with governance voting
      const voteButton = screen.getByText('Vote on Proposal');
      fireEvent.click(voteButton);

      await waitFor(() => {
        expect(screen.getByText('Cast Your Vote')).toBeInTheDocument();
      });

      // Select vote option
      const forButton = screen.getByText('For');
      fireEvent.click(forButton);

      // Confirm vote
      const confirmButton = screen.getByText('Confirm Vote');
      fireEvent.click(confirmButton);

      expect(mockOnVote).toHaveBeenCalledWith(mockData.proposal.id, 'for');

      // Test accessibility
      await runWeb3AccessibilityTests({ container });
    });

    it('displays governance results with real-time updates', async () => {
      render(
        <TestWrapper>
          <GovernanceVotingButton
            proposal={mockData.proposal}
            userVotingPower={100}
            onVote={jest.fn()}
          />
        </TestWrapper>
      );

      // Open voting modal
      fireEvent.click(screen.getByText('Vote on Proposal'));

      await waitFor(() => {
        expect(screen.getByText('Current Results')).toBeInTheDocument();
        expect(screen.getByText('For: 1,500 votes (71.4%)')).toBeInTheDocument();
        expect(screen.getByText('Against: 500 votes (23.8%)')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Price Integration', () => {
    it('displays live token prices with proper formatting', async () => {
      const { container } = render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={mockData.token.address}
            displayFormat="detailed"
            showChange={true}
            updateInterval={5000}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('$1.25')).toBeInTheDocument();
        expect(screen.getByText('+5.67%')).toBeInTheDocument();
      });

      // Test accessibility
      await runWeb3AccessibilityTests({ container });
    });

    it('handles price update errors gracefully', async () => {
      // Mock price service to throw error
      mockWeb3ServiceResponses.getTokenPrice.mockRejectedValueOnce(
        new Error('Failed to fetch price')
      );

      render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={mockData.token.address}
            displayFormat="compact"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Price unavailable')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Web3 Integration', () => {
    it('displays comprehensive Web3 data in mobile format', async () => {
      const mockOnStake = jest.fn();
      const mockOnTip = jest.fn();

      const { container } = render(
        <TestWrapper>
          <MobileWeb3DataDisplay
            token={mockData.token}
            stakingInfo={mockData.stakingInfo}
            userBalance={100}
            votingPower={75}
            onStake={mockOnStake}
            onTip={mockOnTip}
          />
        </TestWrapper>
      );

      // Verify mobile-optimized display
      expect(screen.getByText('LNK')).toBeInTheDocument();
      expect(screen.getByText('$1.25')).toBeInTheDocument();
      expect(screen.getByText('Balance: 100 LNK')).toBeInTheDocument();
      expect(screen.getByText('Voting Power: 75')).toBeInTheDocument();

      // Test mobile interactions
      const stakeButton = screen.getByText('Stake');
      fireEvent.click(stakeButton);
      expect(mockOnStake).toHaveBeenCalled();

      const tipButton = screen.getByText('Tip');
      fireEvent.click(tipButton);
      expect(mockOnTip).toHaveBeenCalled();

      // Test accessibility for mobile
      await runWeb3AccessibilityTests({ container });
    });

    it('handles mobile gestures and interactions', async () => {
      render(
        <TestWrapper>
          <MobileWeb3DataDisplay
            token={mockData.token}
            stakingInfo={mockData.stakingInfo}
            userBalance={100}
            onStake={jest.fn()}
            onTip={jest.fn()}
          />
        </TestWrapper>
      );

      const display = screen.getByTestId('mobile-web3-display');

      // Test swipe gesture
      fireEvent.touchStart(display, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      fireEvent.touchMove(display, {
        touches: [{ clientX: 50, clientY: 100 }],
      });
      fireEvent.touchEnd(display);

      await waitFor(() => {
        expect(screen.getByTestId('swipe-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Component Data Flow', () => {
    it('maintains consistent data across all Web3 components', async () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <StakingIndicator 
              stakingInfo={mockData.stakingInfo}
              token={mockData.token}
              size="md"
            />
            <LiveTokenPriceDisplay
              tokenAddress={mockData.token.address}
              displayFormat="compact"
            />
            <OnChainVerificationBadge
              proof={mockData.onChainProof}
              explorerBaseUrl="https://etherscan.io"
              onViewTransaction={jest.fn()}
            />
          </div>
        </TestWrapper>
      );

      // All components should display consistent token information
      const linkTokenElements = screen.getAllByText(/LNK/);
      expect(linkTokenElements.length).toBeGreaterThan(0);

      // Price should be consistent across components
      await waitFor(() => {
        expect(screen.getByText('$1.25')).toBeInTheDocument();
      });

      // Test accessibility across all components
      await runWeb3AccessibilityTests({ container });
    });

    it('handles loading states consistently across components', () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <StakingIndicator 
              stakingInfo={mockData.stakingInfo}
              token={mockData.token}
              size="md"
            />
            <LiveTokenPriceDisplay
              tokenAddress={mockData.token.address}
              displayFormat="detailed"
            />
          </div>
        </TestWrapper>
      );

      // Should show loading states initially
      expect(screen.getByTestId('price-loading')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('handles Web3 connection errors gracefully', async () => {
      // Mock Web3 connection failure
      const mockWeb3Context = {
        address: null,
        isConnected: false,
        chainId: null,
        error: 'Connection failed',
      };

      render(
        <TestWrapper>
          <BoostButton
            postId="post-123"
            currentStake={0}
            userBalance={0}
            token={mockData.token}
            onBoost={jest.fn()}
            size="md"
            variant="primary"
          />
        </TestWrapper>
      );

      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('handles transaction failures with proper user feedback', async () => {
      const mockOnBoost = jest.fn(() => Promise.reject(new Error('Transaction failed')));

      render(
        <TestWrapper>
          <BoostButton
            postId="post-123"
            currentStake={10}
            userBalance={100}
            token={mockData.token}
            onBoost={mockOnBoost}
            size="md"
            variant="primary"
          />
        </TestWrapper>
      );

      // Open boost modal and attempt transaction
      fireEvent.click(screen.getByText('Boost Post'));

      await waitFor(() => {
        const amountInput = screen.getByPlaceholderText('Enter amount to stake');
        fireEvent.change(amountInput, { target: { value: '25' } });
        
        const confirmButton = screen.getByText('Stake 25 LNK');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Transaction failed')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Integration', () => {
    it('renders multiple Web3 components efficiently', async () => {
      const startTime = performance.now();

      const { container } = render(
        <TestWrapper>
          <div>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i}>
                <StakingIndicator 
                  stakingInfo={mockData.stakingInfo}
                  token={mockData.token}
                  size="sm"
                />
                <LiveTokenPriceDisplay
                  tokenAddress={mockData.token.address}
                  displayFormat="compact"
                />
              </div>
            ))}
          </div>
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000); // 1 second

      // All components should be present
      const stakingIndicators = container.querySelectorAll('[data-testid="staking-indicator"]');
      expect(stakingIndicators).toHaveLength(10);
    });

    it('handles rapid state updates without performance degradation', async () => {
      const { rerender } = render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={mockData.stakingInfo}
            token={mockData.token}
            size="md"
          />
        </TestWrapper>
      );

      // Simulate rapid updates
      for (let i = 0; i < 50; i++) {
        const updatedStakingInfo = {
          ...mockData.stakingInfo,
          totalStaked: mockData.stakingInfo.totalStaked + i,
        };

        rerender(
          <TestWrapper>
            <StakingIndicator 
              stakingInfo={updatedStakingInfo}
              token={mockData.token}
              size="md"
            />
          </TestWrapper>
        );
      }

      // Should still be responsive
      expect(screen.getByTestId('staking-indicator')).toBeInTheDocument();
    });
  });
});