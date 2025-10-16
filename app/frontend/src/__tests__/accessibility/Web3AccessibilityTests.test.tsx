import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StakingIndicator } from '@/components/Staking/StakingIndicator';
import { BoostButton } from '@/components/Staking/BoostButton';
import { OnChainVerificationBadge } from '@/components/OnChainVerification/OnChainVerificationBadge';
import { GovernanceVotingButton } from '@/components/SmartContractInteraction/GovernanceVotingButton';
import { LiveTokenPriceDisplay } from '@/components/RealTimeUpdates/LiveTokenPriceDisplay';
import { MobileWeb3DataDisplay } from '@/components/Mobile/MobileWeb3DataDisplay';
import { mockData } from '../mocks/web3MockData';
import { 
  testWeb3Accessibility,
  testKeyboardNavigation,
  testAriaLabels,
  testVisualAccessibility,
  testMobileAccessibility,
  testScreenReaderCompatibility,
  runWeb3AccessibilityTests
} from '../utils/web3AccessibilityUtils';

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

describe('Web3 Components Accessibility Tests', () => {
  describe('Staking Components Accessibility', () => {
    it('StakingIndicator meets WCAG 2.1 AA standards', async () => {
      const component = render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={mockData.stakingInfo}
            token={mockData.token}
            size="md"
            showTooltip={true}
          />
        </TestWrapper>
      );

      await testWeb3Accessibility(component);
    });

    it('StakingIndicator supports keyboard navigation', () => {
      const component = render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={mockData.stakingInfo}
            token={mockData.token}
            size="md"
            showTooltip={true}
          />
        </TestWrapper>
      );

      const keyboardTests = testKeyboardNavigation(component);
      keyboardTests.hasTabIndex();
      keyboardTests.buttonKeyboardSupport();
    });

    it('StakingIndicator has proper ARIA labels', () => {
      const component = render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={mockData.stakingInfo}
            token={mockData.token}
            size="md"
          />
        </TestWrapper>
      );

      const ariaTests = testAriaLabels(component);
      ariaTests.interactiveElementsHaveNames();
      ariaTests.liveRegionsForUpdates();
    });

    it('BoostButton meets accessibility standards', async () => {
      const component = render(
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

      await runWeb3AccessibilityTests(component);
    });

    it('BoostButton supports screen readers', () => {
      const component = render(
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

      const screenReaderTests = testScreenReaderCompatibility(component);
      screenReaderTests.formLabels();
      screenReaderTests.dynamicContentAnnouncement();
    });
  });

  describe('On-Chain Verification Accessibility', () => {
    it('OnChainVerificationBadge meets accessibility standards', async () => {
      const component = render(
        <TestWrapper>
          <OnChainVerificationBadge
            proof={mockData.onChainProof}
            explorerBaseUrl="https://etherscan.io"
            onViewTransaction={jest.fn()}
          />
        </TestWrapper>
      );

      await testWeb3Accessibility(component);
    });

    it('OnChainVerificationBadge has proper visual accessibility', () => {
      const component = render(
        <TestWrapper>
          <OnChainVerificationBadge
            proof={mockData.onChainProof}
            explorerBaseUrl="https://etherscan.io"
            onViewTransaction={jest.fn()}
          />
        </TestWrapper>
      );

      const visualTests = testVisualAccessibility(component);
      visualTests.colorContrast();
      visualTests.textNotColorOnly();
    });

    it('OnChainVerificationBadge supports keyboard interaction', () => {
      const component = render(
        <TestWrapper>
          <OnChainVerificationBadge
            proof={mockData.onChainProof}
            explorerBaseUrl="https://etherscan.io"
            onViewTransaction={jest.fn()}
          />
        </TestWrapper>
      );

      const keyboardTests = testKeyboardNavigation(component);
      keyboardTests.hasTabIndex();
      keyboardTests.buttonKeyboardSupport();
    });
  });

  describe('Governance Components Accessibility', () => {
    it('GovernanceVotingButton meets accessibility standards', async () => {
      const component = render(
        <TestWrapper>
          <GovernanceVotingButton
            proposal={mockData.proposal}
            userVotingPower={100}
            onVote={jest.fn()}
          />
        </TestWrapper>
      );

      await testWeb3Accessibility(component);
    });

    it('GovernanceVotingButton has proper ARIA structure', () => {
      const component = render(
        <TestWrapper>
          <GovernanceVotingButton
            proposal={mockData.proposal}
            userVotingPower={100}
            onVote={jest.fn()}
          />
        </TestWrapper>
      );

      const ariaTests = testAriaLabels(component);
      ariaTests.interactiveElementsHaveNames();
      ariaTests.complexWidgetsStructure();
    });

    it('GovernanceVotingButton supports screen readers', () => {
      const component = render(
        <TestWrapper>
          <GovernanceVotingButton
            proposal={mockData.proposal}
            userVotingPower={100}
            onVote={jest.fn()}
          />
        </TestWrapper>
      );

      const screenReaderTests = testScreenReaderCompatibility(component);
      screenReaderTests.dynamicContentAnnouncement();
      screenReaderTests.formLabels();
    });
  });

  describe('Real-Time Updates Accessibility', () => {
    it('LiveTokenPriceDisplay meets accessibility standards', async () => {
      const component = render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={mockData.token.address}
            displayFormat="detailed"
            showChange={true}
          />
        </TestWrapper>
      );

      await testWeb3Accessibility(component);
    });

    it('LiveTokenPriceDisplay has proper live regions', () => {
      const component = render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={mockData.token.address}
            displayFormat="detailed"
            showChange={true}
          />
        </TestWrapper>
      );

      const ariaTests = testAriaLabels(component);
      ariaTests.liveRegionsForUpdates();
    });

    it('LiveTokenPriceDisplay supports screen readers for dynamic content', () => {
      const component = render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={mockData.token.address}
            displayFormat="compact"
          />
        </TestWrapper>
      );

      const screenReaderTests = testScreenReaderCompatibility(component);
      screenReaderTests.dynamicContentAnnouncement();
      screenReaderTests.loadingStates();
    });
  });

  describe('Mobile Web3 Accessibility', () => {
    it('MobileWeb3DataDisplay meets mobile accessibility standards', async () => {
      const component = render(
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

      await testWeb3Accessibility(component);
    });

    it('MobileWeb3DataDisplay has proper touch targets', () => {
      const component = render(
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

      const mobileTests = testMobileAccessibility(component);
      mobileTests.touchTargetSize();
      mobileTests.readableText();
      mobileTests.elementSpacing();
    });

    it('MobileWeb3DataDisplay supports mobile screen readers', () => {
      const component = render(
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

      const screenReaderTests = testScreenReaderCompatibility(component);
      screenReaderTests.dynamicContentAnnouncement();
      screenReaderTests.formLabels();
    });
  });

  describe('Cross-Component Accessibility', () => {
    it('Multiple Web3 components maintain accessibility when combined', async () => {
      const component = render(
        <TestWrapper>
          <div>
            <StakingIndicator 
              stakingInfo={mockData.stakingInfo}
              token={mockData.token}
              size="md"
            />
            <OnChainVerificationBadge
              proof={mockData.onChainProof}
              explorerBaseUrl="https://etherscan.io"
              onViewTransaction={jest.fn()}
            />
            <LiveTokenPriceDisplay
              tokenAddress={mockData.token.address}
              displayFormat="compact"
            />
          </div>
        </TestWrapper>
      );

      await runWeb3AccessibilityTests(component);
    });

    it('Focus management works across Web3 components', () => {
      const component = render(
        <TestWrapper>
          <div>
            <BoostButton
              postId="post-123"
              currentStake={10}
              userBalance={100}
              token={mockData.token}
              onBoost={jest.fn()}
              size="md"
              variant="primary"
            />
            <GovernanceVotingButton
              proposal={mockData.proposal}
              userVotingPower={100}
              onVote={jest.fn()}
            />
          </div>
        </TestWrapper>
      );

      const keyboardTests = testKeyboardNavigation(component);
      keyboardTests.hasTabIndex();
      keyboardTests.buttonKeyboardSupport();
      keyboardTests.focusVisibility();
    });

    it('ARIA landmarks and structure work across components', () => {
      const component = render(
        <TestWrapper>
          <main>
            <section aria-label="Token Information">
              <StakingIndicator 
                stakingInfo={mockData.stakingInfo}
                token={mockData.token}
                size="md"
              />
              <LiveTokenPriceDisplay
                tokenAddress={mockData.token.address}
                displayFormat="detailed"
              />
            </section>
            <section aria-label="Governance Actions">
              <GovernanceVotingButton
                proposal={mockData.proposal}
                userVotingPower={100}
                onVote={jest.fn()}
              />
            </section>
          </main>
        </TestWrapper>
      );

      const ariaTests = testAriaLabels(component);
      ariaTests.interactiveElementsHaveNames();
      ariaTests.liveRegionsForUpdates();
      ariaTests.complexWidgetsStructure();
    });
  });

  describe('Color and Contrast Accessibility', () => {
    it('Tier colors maintain sufficient contrast', () => {
      const goldStaking = { ...mockData.stakingInfo, stakingTier: 'gold' as const };
      const silverStaking = { ...mockData.stakingInfo, stakingTier: 'silver' as const };
      const bronzeStaking = { ...mockData.stakingInfo, stakingTier: 'bronze' as const };

      const goldComponent = render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={goldStaking}
            token={mockData.token}
            size="md"
          />
        </TestWrapper>
      );

      const silverComponent = render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={silverStaking}
            token={mockData.token}
            size="md"
          />
        </TestWrapper>
      );

      const bronzeComponent = render(
        <TestWrapper>
          <StakingIndicator 
            stakingInfo={bronzeStaking}
            token={mockData.token}
            size="md"
          />
        </TestWrapper>
      );

      // Test color contrast for each tier
      [goldComponent, silverComponent, bronzeComponent].forEach(component => {
        const visualTests = testVisualAccessibility(component);
        visualTests.colorContrast();
        visualTests.textNotColorOnly();
      });
    });

    it('Price change indicators work without color alone', () => {
      const positiveToken = { ...mockData.token, priceChange24h: 5.67 };
      const negativeToken = { ...mockData.token, priceChange24h: -3.45 };

      const positiveComponent = render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={positiveToken.address}
            displayFormat="detailed"
            showChange={true}
          />
        </TestWrapper>
      );

      const negativeComponent = render(
        <TestWrapper>
          <LiveTokenPriceDisplay
            tokenAddress={negativeToken.address}
            displayFormat="detailed"
            showChange={true}
          />
        </TestWrapper>
      );

      [positiveComponent, negativeComponent].forEach(component => {
        const visualTests = testVisualAccessibility(component);
        visualTests.textNotColorOnly();
      });
    });
  });

  describe('Error State Accessibility', () => {
    it('Error states are properly announced to screen readers', () => {
      const component = render(
        <TestWrapper>
          <MobileWeb3DataDisplay
            token={mockData.token}
            stakingInfo={mockData.stakingInfo}
            userBalance={100}
            error="Failed to load token data"
            onStake={jest.fn()}
            onTip={jest.fn()}
          />
        </TestWrapper>
      );

      const screenReaderTests = testScreenReaderCompatibility(component);
      screenReaderTests.dynamicContentAnnouncement();
    });

    it('Loading states are accessible', () => {
      const component = render(
        <TestWrapper>
          <MobileWeb3DataDisplay
            token={mockData.token}
            stakingInfo={mockData.stakingInfo}
            userBalance={100}
            isLoading={true}
            onStake={jest.fn()}
            onTip={jest.fn()}
          />
        </TestWrapper>
      );

      const screenReaderTests = testScreenReaderCompatibility(component);
      screenReaderTests.loadingStates();
    });
  });
});