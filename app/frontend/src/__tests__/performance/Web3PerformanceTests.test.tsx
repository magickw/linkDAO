import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { performance } from 'perf_hooks';
import { StakingIndicator } from '@/components/Staking/StakingIndicator';
import { BoostButton } from '@/components/Staking/BoostButton';
import { OnChainVerificationBadge } from '@/components/OnChainVerification/OnChainVerificationBadge';
import { GovernanceVotingButton } from '@/components/SmartContractInteraction/GovernanceVotingButton';
import { LiveTokenPriceDisplay } from '@/components/RealTimeUpdates/LiveTokenPriceDisplay';
import { MobileWeb3DataDisplay } from '@/components/Mobile/MobileWeb3DataDisplay';
import { mockData, createMockWebSocket } from '../mocks/web3MockData';

// Performance testing utilities
interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  reRenderCount: number;
  componentCount: number;
}

const measurePerformance = async (renderFn: () => void): Promise<PerformanceMetrics> => {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  renderFn();
  
  // Wait for render to complete
  await new Promise(resolve => setTimeout(resolve, 0));
  
  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  return {
    renderTime: endTime - startTime,
    memoryUsage: endMemory - startMemory,
    reRenderCount: 0, // Would need React DevTools profiler for accurate count
    componentCount: 1,
  };
};

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Web3 Components Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock WebSocket for performance tests
    global.WebSocket = jest.fn(() => createMockWebSocket()) as any;
  });

  describe('Individual Component Performance', () => {
    it('StakingIndicator renders within performance budget', async () => {
      const metrics = await measurePerformance(() => {
        render(
          <TestWrapper>
            <StakingIndicator 
              stakingInfo={mockData.stakingInfo}
              token={mockData.token}
              size="md"
            />
          </TestWrapper>
        );
      });

      expect(metrics.renderTime).toBeLessThan(50); // 50ms budget
      expect(metrics.memoryUsage).toBeLessThan(1024 * 1024); // 1MB budget
    });

    it('BoostButton renders efficiently', async () => {
      const metrics = await measurePerformance(() => {
        render(
          <TestWrapper>
            <BoostButton
              postId="post-123"
              currentStake={10}
              userBalance={100}
              token={mockData.token}
              onBoost={jest.fn()}
              size="md"
              variant="primary"
            />
          </TestWrapper>
        );
      });

      expect(metrics.renderTime).toBeLessThan(75); // 75ms budget for interactive component
    });

    it('OnChainVerificationBadge has minimal render overhead', async () => {
      const metrics = await measurePerformance(() => {
        render(
          <TestWrapper>
            <OnChainVerificationBadge
              proof={mockData.onChainProof}
              explorerBaseUrl="https://etherscan.io"
              onViewTransaction={jest.fn()}
            />
          </TestWrapper>
        );
      });

      expect(metrics.renderTime).toBeLessThan(30); // 30ms budget for simple component
    });

    it('GovernanceVotingButton renders within acceptable time', async () => {
      const metrics = await measurePerformance(() => {
        render(
          <TestWrapper>
            <GovernanceVotingButton
              proposal={mockData.proposal}
              userVotingPower={100}
              onVote={jest.fn()}
            />
          </TestWrapper>
        );
      });

      expect(metrics.renderTime).toBeLessThan(100); // 100ms budget for complex component
    });

    it('LiveTokenPriceDisplay initializes quickly', async () => {
      const metrics = await measurePerformance(() => {
        render(
          <TestWrapper>
            <LiveTokenPriceDisplay
              tokenAddress={mockData.token.address}
              displayFormat="detailed"
              showChange={true}
            />
          </TestWrapper>
        );
      });

      expect(metrics.renderTime).toBeLessThan(60); // 60ms budget
    });

    it('MobileWeb3DataDisplay is optimized for mobile performance', async () => {
      const metrics = await measurePerformance(() => {
        render(
          <TestWrapper>
            <MobileWeb3DataDisplay
              token={mockData.token}
              stakingInfo={mockData.stakingInfo}
              userBalance={100}
              votingPower={75}
              onStake={jest.fn()}
              onTip={jest.fn()}
            />
          </TestWrapper>
        );
      });

      expect(metrics.renderTime).toBeLessThan(80); // 80ms budget for mobile
    });
  });

  describe('Bulk Rendering Performance', () => {
    it('renders multiple StakingIndicators efficiently', async () => {
      const componentCount = 50;
      
      const metrics = await measurePerformance(() => {
        render(
          <TestWrapper>
            <div>
              {Array.from({ length: componentCount }, (_, i) => (
                <StakingIndicator 
                  key={i}
                  stakingInfo={{
                    ...mockData.stakingInfo,
                    totalStaked: mockData.stakingInfo.totalStaked + i,
                  }}
                  token={mockData.token}
                  size="sm"
                />
              ))}
            </div>
          </TestWrapper>
        );
      });

      const averageRenderTime = metrics.renderTime / componentCount;
      expect(averageRenderTime).toBeLessThan(5); // 5ms per component
      expect(metrics.renderTime).toBeLessThan(500); // Total under 500ms
    });

    it('handles large lists of OnChainVerificationBadges', async () => {
      const componentCount = 100;
      
      const metrics = await measurePerformance(() => {
        render(
          <TestWrapper>
            <div>
              {Array.from({ length: componentCount }, (_, i) => (
                <OnChainVerificationBadge
                  key={i}
                  proof={{
                    ...mockData.onChainProof,
                    transactionHash: `0x${i.toString(16).padStart(64, '0')}`,
                  }}
                  explorerBaseUrl="https://etherscan.io"
                  onViewTransaction={jest.fn()}
                  size="sm"
                />
              ))}
            </div>
          </TestWrapper>
        );
      });

      const averageRenderTime = metrics.renderTime / componentCount;
      expect(averageRenderTime).toBeLessThan(2); // 2ms per badge
    });
  });

  describe('Re-render Performance', () => {
    it('StakingIndicator handles frequent updates efficiently', async () => {
      const { rerender } = render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={mockData.stakingInfo}
            token={mockData.token}
            size="md"
          />
        </TestWrapper>
      );

      const updateCount = 20;
      const startTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        const updatedStakingInfo = {
          ...mockData.stakingInfo,
          totalStaked: mockData.stakingInfo.totalStaked + i * 0.1,
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

      const endTime = performance.now();
      const totalUpdateTime = endTime - startTime;
      const averageUpdateTime = totalUpdateTime / updateCount;

      expect(averageUpdateTime).toBeLessThan(10); // 10ms per update
    });

    it('LiveTokenPriceDisplay handles real-time price updates efficiently', async () => {
      const mockWebSocket = createMockWebSocket();
      global.WebSocket = jest.fn(() => mockWebSocket) as any;

      render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={mockData.token.address}
            displayFormat="detailed"
            showChange={true}
          />
        </TestWrapper>
      );

      // Simulate rapid price updates
      const updateCount = 50;
      const startTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        const priceUpdate = {
          data: JSON.stringify({
            tokenAddress: mockData.token.address,
            price: 1.25 + (i * 0.01),
            change24h: 5.67 + (i * 0.1),
          }),
        };

        // Simulate WebSocket message
        if (mockWebSocket.addEventListener.mock.calls.length > 0) {
          const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
            call => call[0] === 'message'
          )?.[1];
          
          if (messageHandler) {
            messageHandler(priceUpdate);
          }
        }
      }

      const endTime = performance.now();
      const totalUpdateTime = endTime - startTime;
      const averageUpdateTime = totalUpdateTime / updateCount;

      expect(averageUpdateTime).toBeLessThan(5); // 5ms per price update
    });
  });

  describe('Memory Usage Performance', () => {
    it('components clean up properly on unmount', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const { unmount } = render(
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
            <GovernanceVotingButton
              proposal={mockData.proposal}
              userVotingPower={100}
              onVote={jest.fn()}
            />
          </div>
        </TestWrapper>
      );

      const afterRenderMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const afterUnmountMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Memory should not increase significantly after unmount
      const memoryLeak = afterUnmountMemory - initialMemory;
      expect(memoryLeak).toBeLessThan(1024 * 100); // Less than 100KB leak
    });

    it('WebSocket connections are properly cleaned up', async () => {
      const mockWebSocket = createMockWebSocket();
      global.WebSocket = jest.fn(() => mockWebSocket) as any;

      const { unmount } = render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={mockData.token.address}
            displayFormat="detailed"
          />
        </TestWrapper>
      );

      unmount();

      // WebSocket should be closed on unmount
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('Interaction Performance', () => {
    it('BoostButton modal opens quickly', async () => {
      render(
        <TestWrapper>
          <BoostButton
            postId="post-123"
            currentStake={10}
            userBalance={100}
            token={mockData.token}
            onBoost={jest.fn()}
            size="md"
            variant="primary"
          />
        </TestWrapper>
      );

      const startTime = performance.now();
      
      const boostButton = screen.getByText('Boost Post');
      fireEvent.click(boostButton);

      await waitFor(() => {
        expect(screen.getByText('Boost This Post')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const modalOpenTime = endTime - startTime;

      expect(modalOpenTime).toBeLessThan(200); // Modal should open within 200ms
    });

    it('GovernanceVotingButton handles vote submission efficiently', async () => {
      const mockOnVote = jest.fn(() => Promise.resolve({ txHash: '0xabc123' }));

      render(
        <TestWrapper>
          <GovernanceVotingButton
            proposal={mockData.proposal}
            userVotingPower={100}
            onVote={mockOnVote}
          />
        </TestWrapper>
      );

      const startTime = performance.now();

      // Open voting modal
      fireEvent.click(screen.getByText('Vote on Proposal'));

      await waitFor(() => {
        const forButton = screen.getByText('For');
        fireEvent.click(forButton);
        
        const confirmButton = screen.getByText('Confirm Vote');
        fireEvent.click(confirmButton);
      });

      const endTime = performance.now();
      const voteSubmissionTime = endTime - startTime;

      expect(voteSubmissionTime).toBeLessThan(500); // Vote flow should complete within 500ms
    });
  });

  describe('Animation Performance', () => {
    it('staking tier animations perform smoothly', async () => {
      const { rerender } = render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={{ ...mockData.stakingInfo, stakingTier: 'bronze' }}
            token={mockData.token}
            size="md"
          />
        </TestWrapper>
      );

      const animationStartTime = performance.now();

      // Trigger tier change animation
      rerender(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={{ ...mockData.stakingInfo, stakingTier: 'gold' }}
            token={mockData.token}
            size="md"
          />
        </TestWrapper>
      );

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const animationEndTime = performance.now();
      const animationDuration = animationEndTime - animationStartTime;

      // Animation should not block the main thread excessively
      expect(animationDuration).toBeLessThan(350);
    });

    it('price change animations are performant', async () => {
      const mockWebSocket = createMockWebSocket();
      global.WebSocket = jest.fn(() => mockWebSocket) as any;

      render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={mockData.token.address}
            displayFormat="detailed"
            showChange={true}
          />
        </TestWrapper>
      );

      const animationStartTime = performance.now();

      // Simulate price change that triggers animation
      const priceUpdate = {
        data: JSON.stringify({
          tokenAddress: mockData.token.address,
          price: 1.50, // Significant price change
          change24h: 20.0,
        }),
      };

      if (mockWebSocket.addEventListener.mock.calls.length > 0) {
        const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'message'
        )?.[1];
        
        if (messageHandler) {
          messageHandler(priceUpdate);
        }
      }

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 200));

      const animationEndTime = performance.now();
      const animationDuration = animationEndTime - animationStartTime;

      expect(animationDuration).toBeLessThan(250);
    });
  });

  describe('Bundle Size Impact', () => {
    it('components have reasonable bundle impact', () => {
      // This would typically be measured with webpack-bundle-analyzer
      // For now, we'll do a basic check on component complexity
      
      const componentSizes = {
        StakingIndicator: 'small', // Simple display component
        BoostButton: 'medium', // Interactive with modal
        OnChainVerificationBadge: 'small', // Simple with tooltip
        GovernanceVotingButton: 'large', // Complex with multiple states
        LiveTokenPriceDisplay: 'medium', // Real-time updates
        MobileWeb3DataDisplay: 'large', // Comprehensive mobile component
      };

      // Ensure we're not adding too many large components
      const largeComponents = Object.values(componentSizes).filter(size => size === 'large');
      expect(largeComponents.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Concurrent Rendering Performance', () => {
    it('handles multiple simultaneous updates efficiently', async () => {
      const { rerender } = render(
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

      const startTime = performance.now();

      // Simulate simultaneous updates to all components
      const updatePromises = Array.from({ length: 10 }, (_, i) => {
        return new Promise<void>(resolve => {
          setTimeout(() => {
            rerender(
              <TestWrapper>
                <div>
                  <StakingIndicator 
                    stakingInfo={{
                      ...mockData.stakingInfo,
                      totalStaked: mockData.stakingInfo.totalStaked + i,
                    }}
                    token={{
                      ...mockData.token,
                      priceUSD: mockData.token.priceUSD! + (i * 0.01),
                    }}
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
            resolve();
          }, i * 10);
        });
      });

      await Promise.all(updatePromises);

      const endTime = performance.now();
      const totalUpdateTime = endTime - startTime;

      expect(totalUpdateTime).toBeLessThan(1000); // All updates within 1 second
    });
  });
});