import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenReactionFlow } from '../TokenReactionFlow';
import { EnhancedStateProvider } from '@/contexts/EnhancedStateProvider';

// Mock services
jest.mock('@/services/tokenReactionService', () => ({
  tokenReactionService: {
    reactToPost: jest.fn(),
    getReactions: jest.fn(),
    getReactors: jest.fn(),
    calculateReactionCost: jest.fn(),
    validateReaction: jest.fn(),
  },
}));

jest.mock('@/services/walletSecurityService', () => ({
  walletSecurityService: {
    validateTransaction: jest.fn(),
    checkBalance: jest.fn(),
    estimateGas: jest.fn(),
  },
}));

jest.mock('@/services/auditLoggingService', () => ({
  auditLoggingService: {
    logReaction: jest.fn(),
    logError: jest.fn(),
  },
}));

// Mock Web3 provider
const mockWeb3Provider = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};

Object.defineProperty(window, 'ethereum', {
  value: mockWeb3Provider,
  writable: true,
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EnhancedStateProvider>
    {children}
  </EnhancedStateProvider>
);

describe('Token Reaction Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    require('@/services/tokenReactionService').tokenReactionService.calculateReactionCost.mockReturnValue(5);
    require('@/services/walletSecurityService').walletSecurityService.checkBalance.mockResolvedValue(true);
    require('@/services/walletSecurityService').walletSecurityService.validateTransaction.mockResolvedValue(true);
    require('@/services/tokenReactionService').tokenReactionService.validateReaction.mockResolvedValue(true);
  });

  it('completes full reaction flow successfully', async () => {
    const user = userEvent.setup();
    
    // Mock successful reaction
    require('@/services/tokenReactionService').tokenReactionService.reactToPost.mockResolvedValue({
      success: true,
      transactionHash: '0xabc123',
      newTotal: 15,
      milestone: false,
    });

    render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
        />
      </TestWrapper>
    );

    // Click on fire reaction
    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    // Should show loading state
    expect(screen.getByTestId('reaction-loading')).toBeInTheDocument();

    // Wait for reaction to complete
    await waitFor(() => {
      expect(screen.queryByTestId('reaction-loading')).not.toBeInTheDocument();
    });

    // Verify services were called in correct order
    expect(require('@/services/walletSecurityService').walletSecurityService.checkBalance).toHaveBeenCalled();
    expect(require('@/services/tokenReactionService').tokenReactionService.validateReaction).toHaveBeenCalled();
    expect(require('@/services/tokenReactionService').tokenReactionService.reactToPost).toHaveBeenCalledWith(
      'test-post-1',
      '🔥',
      5,
      '0x1234567890abcdef'
    );
    expect(require('@/services/auditLoggingService').auditLoggingService.logReaction).toHaveBeenCalled();

    // Should show success feedback
    expect(screen.getByText(/reaction added/i)).toBeInTheDocument();
  });

  it('handles insufficient balance gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock insufficient balance
    require('@/services/walletSecurityService').walletSecurityService.checkBalance.mockResolvedValue(false);

    render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
        />
      </TestWrapper>
    );

    const diamondButton = screen.getByRole('button', { name: /diamond|💎/i });
    await user.click(diamondButton);

    await waitFor(() => {
      expect(screen.getByText(/insufficient balance/i)).toBeInTheDocument();
    });

    // Should not proceed with reaction
    expect(require('@/services/tokenReactionService').tokenReactionService.reactToPost).not.toHaveBeenCalled();
    
    // Should log the error
    expect(require('@/services/auditLoggingService').auditLoggingService.logError).toHaveBeenCalled();
  });

  it('handles transaction failure with retry', async () => {
    const user = userEvent.setup();
    
    // Mock transaction failure then success
    require('@/services/tokenReactionService').tokenReactionService.reactToPost
      .mockRejectedValueOnce(new Error('Transaction failed'))
      .mockResolvedValueOnce({
        success: true,
        transactionHash: '0xdef456',
        newTotal: 8,
        milestone: false,
      });

    render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
        />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    // Should succeed on retry
    await waitFor(() => {
      expect(screen.getByText(/reaction added/i)).toBeInTheDocument();
    });

    expect(require('@/services/tokenReactionService').tokenReactionService.reactToPost).toHaveBeenCalledTimes(2);
  });

  it('handles milestone celebrations', async () => {
    const user = userEvent.setup();
    
    // Mock milestone reaction
    require('@/services/tokenReactionService').tokenReactionService.reactToPost.mockResolvedValue({
      success: true,
      transactionHash: '0xghi789',
      newTotal: 100,
      milestone: true,
      milestoneType: 'century',
    });

    render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
        />
      </TestWrapper>
    );

    const rocketButton = screen.getByRole('button', { name: /rocket|🚀/i });
    await user.click(rocketButton);

    await waitFor(() => {
      expect(screen.getByTestId('celebration-animation')).toBeInTheDocument();
      expect(screen.getByText(/milestone reached/i)).toBeInTheDocument();
    });
  });

  it('handles network connectivity issues', async () => {
    const user = userEvent.setup();
    
    // Mock network error
    require('@/services/tokenReactionService').tokenReactionService.reactToPost.mockRejectedValue(
      new Error('Network error')
    );

    render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
        />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('validates reaction permissions', async () => {
    const user = userEvent.setup();
    
    // Mock validation failure
    require('@/services/tokenReactionService').tokenReactionService.validateReaction.mockResolvedValue(false);

    render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
        />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    await waitFor(() => {
      expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
    });

    expect(require('@/services/tokenReactionService').tokenReactionService.reactToPost).not.toHaveBeenCalled();
  });

  it('handles concurrent reactions', async () => {
    const user = userEvent.setup();
    
    // Mock delayed reaction
    require('@/services/tokenReactionService').tokenReactionService.reactToPost.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        transactionHash: '0xjkl012',
        newTotal: 12,
        milestone: false,
      }), 1000))
    );

    render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
        />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    const rocketButton = screen.getByRole('button', { name: /rocket|🚀/i });

    // Try to click multiple reactions quickly
    await user.click(fireButton);
    await user.click(rocketButton);

    // Should only process one reaction at a time
    expect(screen.getAllByTestId('reaction-loading')).toHaveLength(1);
    
    // Second button should be disabled
    expect(rocketButton).toBeDisabled();
  });

  it('updates UI with real-time reaction changes', async () => {
    const user = userEvent.setup();
    
    require('@/services/tokenReactionService').tokenReactionService.reactToPost.mockResolvedValue({
      success: true,
      transactionHash: '0xmno345',
      newTotal: 25,
      milestone: false,
    });

    render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
          initialReactions={[
            { type: '🔥', totalAmount: 20, users: [], tokenType: 'LDAO' }
          ]}
        />
      </TestWrapper>
    );

    // Initial count should be 20
    expect(screen.getByText('20')).toBeInTheDocument();

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    // Should update to new total
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('handles gas estimation and optimization', async () => {
    const user = userEvent.setup();
    
    require('@/services/walletSecurityService').walletSecurityService.estimateGas.mockResolvedValue({
      gasLimit: '21000',
      gasPrice: '20000000000',
      estimatedCost: '0.00042',
    });

    require('@/services/tokenReactionService').tokenReactionService.reactToPost.mockResolvedValue({
      success: true,
      transactionHash: '0xpqr678',
      newTotal: 18,
      milestone: false,
      gasUsed: '19500',
    });

    render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
        />
      </TestWrapper>
    );

    const diamondButton = screen.getByRole('button', { name: /diamond|💎/i });
    await user.click(diamondButton);

    // Should show gas estimation in confirmation modal
    await waitFor(() => {
      expect(screen.getByText(/estimated gas/i)).toBeInTheDocument();
      expect(screen.getByText(/0.00042/)).toBeInTheDocument();
    });

    // Confirm transaction
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/reaction added/i)).toBeInTheDocument();
    });
  });

  it('maintains reaction state across component updates', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
        />
      </TestWrapper>
    );

    const fireButton = screen.getByRole('button', { name: /fire|🔥/i });
    await user.click(fireButton);

    // Rerender with new props
    rerender(
      <TestWrapper>
        <TokenReactionFlow 
          postId="test-post-1"
          userWallet="0x1234567890abcdef"
          theme="dark"
        />
      </TestWrapper>
    );

    // Loading state should persist
    expect(screen.getByTestId('reaction-loading')).toBeInTheDocument();
  });
});