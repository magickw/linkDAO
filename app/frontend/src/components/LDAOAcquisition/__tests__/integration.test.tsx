import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LDAOPurchaseModal from '../LDAOPurchaseModal';
import EarnLDAOPage from '../EarnLDAOPage';
import DEXTradingInterface from '../DEXTradingInterface';
import TradingDashboard from '../TradingDashboard';
import { ldaoAcquisitionService } from '../../../services/ldaoAcquisitionService';

// Mock the service
jest.mock('../../../services/ldaoAcquisitionService');
const mockService = ldaoAcquisitionService as jest.Mocked<typeof ldaoAcquisitionService>;

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Integration Tests', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockService.getQuote.mockResolvedValue({
      ldaoAmount: '1000',
      usdAmount: '10.00',
      ethAmount: '0.004',
      usdcAmount: '10.00',
      discount: 0,
      fees: {
        processing: '0.01',
        gas: '0.005',
        total: '0.015'
      },
      estimatedTime: '2-5 minutes'
    });

    mockService.getEarnOpportunities.mockResolvedValue([
      {
        id: 'profile_setup',
        title: 'Complete Profile Setup',
        description: 'Add profile picture, bio, and social links',
        reward: '50 LDAO',
        difficulty: 'easy',
        timeEstimate: '5 minutes',
        category: 'social',
        requirements: ['Connect wallet', 'Verify email']
      }
    ]);

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/ldao/user-progress/')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            streak: 0,
            totalEarned: '0',
            completedTasks: [],
            achievements: [],
            rank: 0,
            weeklyEarnings: 0
          })
        } as Response);
      }
      if (url.includes('/api/ldao/leaderboard')) {
        return Promise.resolve({
          json: () => Promise.resolve([])
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('Complete Purchase Flow Integration', () => {
    it('completes full crypto purchase flow', async () => {
      mockService.purchaseWithCrypto.mockResolvedValue({
        success: true,
        transactionHash: '0xabcdef123456',
        ldaoAmount: '1000'
      });

      render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress={mockUserAddress}
        />
      );

      // Step 1: Select crypto payment
      const cryptoButton = screen.getByText('Pay with Crypto');
      fireEvent.click(cryptoButton);
      fireEvent.click(screen.getByText('Continue'));

      // Step 2: Enter amount
      await waitFor(() => {
        const amountInput = screen.getByPlaceholderText('Enter custom amount');
        fireEvent.change(amountInput, { target: { value: '1000' } });
      });
      fireEvent.click(screen.getByText('Continue'));

      // Step 3: Select payment method (ETH should be selected by default)
      await waitFor(() => {
        expect(screen.getByText('Ethereum (ETH)')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Continue'));

      // Step 4: Confirm purchase
      await waitFor(() => {
        expect(screen.getByText('Confirm Purchase')).toBeInTheDocument();
        expect(screen.getByText('1,000')).toBeInTheDocument(); // LDAO amount
      });

      const confirmButton = screen.getByText('Confirm Purchase');
      fireEvent.click(confirmButton);

      // Should show processing
      await waitFor(() => {
        expect(screen.getByText('Processing Your Purchase')).toBeInTheDocument();
      });

      // Should show success
      await waitFor(() => {
        expect(screen.getByText('Purchase Successful!')).toBeInTheDocument();
        expect(mockService.purchaseWithCrypto).toHaveBeenCalledWith('ETH', '1000');
      });
    });

    it('completes full fiat purchase flow', async () => {
      mockService.purchaseWithFiat.mockResolvedValue({
        success: true,
        ldaoAmount: '1000'
      });

      render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress={mockUserAddress}
        />
      );

      // Select fiat payment
      const fiatButton = screen.getByText('Pay with Card');
      fireEvent.click(fiatButton);
      fireEvent.click(screen.getByText('Continue'));

      // Enter amount
      await waitFor(() => {
        const amountInput = screen.getByPlaceholderText('Enter custom amount');
        fireEvent.change(amountInput, { target: { value: '1000' } });
      });
      fireEvent.click(screen.getByText('Continue'));

      // Select card payment
      await waitFor(() => {
        expect(screen.getByText('Credit/Debit Card')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText('Continue'));

      // Confirm purchase
      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Purchase');
        fireEvent.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockService.purchaseWithFiat).toHaveBeenCalledWith({
          amount: 10,
          currency: 'USD',
          paymentMethod: 'card'
        });
      });
    });

    it('handles purchase errors gracefully', async () => {
      mockService.purchaseWithCrypto.mockResolvedValue({
        success: false,
        error: 'Insufficient balance'
      });

      render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress={mockUserAddress}
        />
      );

      // Complete flow to confirmation
      fireEvent.click(screen.getByText('Continue')); // Method
      
      await waitFor(() => {
        const amountInput = screen.getByPlaceholderText('Enter custom amount');
        fireEvent.change(amountInput, { target: { value: '1000' } });
      });
      
      fireEvent.click(screen.getByText('Continue')); // Amount
      fireEvent.click(screen.getByText('Continue')); // Payment
      
      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Purchase');
        fireEvent.click(confirmButton);
      });

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Purchase Failed')).toBeInTheDocument();
        expect(screen.getByText('Insufficient balance')).toBeInTheDocument();
      });

      // Should allow retry
      const tryAgainButton = screen.getByText('Try Again');
      expect(tryAgainButton).toBeInTheDocument();
    });
  });

  describe('Earn-to-Own Integration', () => {
    it('completes task claiming flow with level up', async () => {
      mockService.claimEarnedTokens.mockResolvedValue({
        success: true,
        ldaoAmount: '50'
      });

      render(<EarnLDAOPage userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Complete Profile Setup')).toBeInTheDocument();
      });

      // Claim task
      const startButton = screen.getByText('Start Task');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockService.claimEarnedTokens).toHaveBeenCalledWith('profile_setup');
      });

      // Should show success and potentially level up
      await waitFor(() => {
        expect(screen.getByText('✓ Completed')).toBeInTheDocument();
      });
    });

    it('shows achievement unlock flow', async () => {
      mockService.claimEarnedTokens.mockResolvedValue({
        success: true,
        ldaoAmount: '50'
      });

      render(<EarnLDAOPage userAddress={mockUserAddress} />);

      await waitFor(() => {
        const startButton = screen.getByText('Start Task');
        fireEvent.click(startButton);
      });

      // Should show achievement celebration
      await waitFor(() => {
        expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      });
    });

    it('integrates with leaderboard updates', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.includes('/api/ldao/leaderboard')) {
          return Promise.resolve({
            json: () => Promise.resolve([
              {
                rank: 1,
                address: mockUserAddress,
                totalEarned: '100',
                weeklyEarned: '50',
                level: 2
              }
            ])
          } as Response);
        }
        return Promise.resolve({
          json: () => Promise.resolve({})
        } as Response);
      });

      render(<EarnLDAOPage userAddress={mockUserAddress} />);

      // Switch to leaderboard
      const leaderboardTab = screen.getByText('Leaderboard');
      fireEvent.click(leaderboardTab);

      await waitFor(() => {
        expect(screen.getByText('🥇')).toBeInTheDocument();
      });
    });
  });

  describe('DEX Trading Integration', () => {
    it('completes swap flow with quote updates', async () => {
      render(<DEXTradingInterface userAddress={mockUserAddress} />);

      // Enter amount
      const amountInput = screen.getByPlaceholderText('0.0');
      fireEvent.change(amountInput, { target: { value: '1' } });

      // Should get quote
      await waitFor(() => {
        expect(screen.getByText('Price Impact')).toBeInTheDocument();
        expect(screen.getByText('Minimum Received')).toBeInTheDocument();
      });

      // Execute swap
      const swapButton = screen.getByText(/Swap ETH for LDAO/);
      fireEvent.click(swapButton);

      await waitFor(() => {
        expect(screen.getByText('Swapping...')).toBeInTheDocument();
      });
    });

    it('integrates with settings changes', () => {
      render(<DEXTradingInterface userAddress={mockUserAddress} />);

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);

      // Change slippage
      const slippageButton = screen.getByText('1.0%');
      fireEvent.click(slippageButton);

      // Change DEX
      const sushiButton = screen.getByText('SushiSwap');
      fireEvent.click(sushiButton);

      // Settings should be applied
      expect(slippageButton).toHaveClass('bg-blue-600');
      expect(sushiButton.closest('button')).toHaveClass('border-blue-500');
    });

    it('handles network switching', () => {
      render(<DEXTradingInterface userAddress={mockUserAddress} />);

      // Token swap should work
      const swapButton = screen.getByRole('button', { name: /swap/i });
      fireEvent.click(swapButton);

      // Should swap token positions
      expect(screen.getByDisplayValue('LDAO')).toBeInTheDocument();
    });
  });

  describe('Trading Dashboard Integration', () => {
    it('integrates all trading components', async () => {
      render(<TradingDashboard userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Trading Dashboard')).toBeInTheDocument();
      });

      // Should show portfolio overview
      expect(screen.getByText('Total Portfolio Value')).toBeInTheDocument();

      // Should have tab navigation
      expect(screen.getByText('Trade')).toBeInTheDocument();
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('Liquidity')).toBeInTheDocument();
    });

    it('opens quick trade modal', () => {
      render(<TradingDashboard userAddress={mockUserAddress} />);

      const quickTradeButton = screen.getByText('Quick Trade');
      fireEvent.click(quickTradeButton);

      // Should open trading interface modal
      expect(screen.getByText('DEX Trading')).toBeInTheDocument();
    });

    it('switches between dashboard tabs', async () => {
      render(<TradingDashboard userAddress={mockUserAddress} />);

      // Switch to portfolio tab
      const portfolioTab = screen.getByText('Portfolio');
      fireEvent.click(portfolioTab);

      await waitFor(() => {
        expect(portfolioTab.closest('button')).toHaveClass('bg-white');
      });

      // Switch to history tab
      const historyTab = screen.getByText('History');
      fireEvent.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('Trade History')).toBeInTheDocument();
      });
    });
  });

  describe('Cross-Component Integration', () => {
    it('maintains state across component interactions', async () => {
      const { rerender } = render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress={mockUserAddress}
        />
      );

      // Complete a purchase
      fireEvent.click(screen.getByText('Continue')); // Method
      
      await waitFor(() => {
        const amountInput = screen.getByPlaceholderText('Enter custom amount');
        fireEvent.change(amountInput, { target: { value: '1000' } });
      });

      // Switch to earn page
      rerender(<EarnLDAOPage userAddress={mockUserAddress} />);

      await waitFor(() => {
        expect(screen.getByText('Earn LDAO Tokens')).toBeInTheDocument();
      });
    });

    it('handles wallet connection state changes', () => {
      const { rerender } = render(
        <DEXTradingInterface userAddress={undefined} />
      );

      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();

      // Connect wallet
      rerender(<DEXTradingInterface userAddress={mockUserAddress} />);

      expect(screen.getByText('Enter Amount')).toBeInTheDocument();
    });

    it('propagates error states correctly', async () => {
      mockService.getQuote.mockRejectedValue(new Error('Network error'));

      render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress={mockUserAddress}
        />
      );

      fireEvent.click(screen.getByText('Continue')); // Method
      
      await waitFor(() => {
        const amountInput = screen.getByPlaceholderText('Enter custom amount');
        fireEvent.change(amountInput, { target: { value: '1000' } });
      });

      // Should handle quote error gracefully
      await waitFor(() => {
        expect(screen.getByText('Failed to get price quote')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates Integration', () => {
    it('handles price updates in real-time', async () => {
      jest.useFakeTimers();

      render(<DEXTradingInterface userAddress={mockUserAddress} />);

      const amountInput = screen.getByPlaceholderText('0.0');
      fireEvent.change(amountInput, { target: { value: '1' } });

      // Fast-forward time to trigger price update
      jest.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(mockService.getQuote).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('updates user progress in real-time', async () => {
      mockService.claimEarnedTokens.mockResolvedValue({
        success: true,
        ldaoAmount: '50'
      });

      render(<EarnLDAOPage userAddress={mockUserAddress} />);

      await waitFor(() => {
        const startButton = screen.getByText('Start Task');
        fireEvent.click(startButton);
      });

      // Progress should update immediately
      await waitFor(() => {
        expect(screen.getByText('✓ Completed')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery Integration', () => {
    it('recovers from network errors', async () => {
      // First call fails
      mockService.getQuote.mockRejectedValueOnce(new Error('Network error'));
      // Second call succeeds
      mockService.getQuote.mockResolvedValueOnce({
        ldaoAmount: '1000',
        usdAmount: '10.00',
        ethAmount: '0.004',
        usdcAmount: '10.00',
        discount: 0,
        fees: { processing: '0.01', gas: '0.005', total: '0.015' },
        estimatedTime: '2-5 minutes'
      });

      render(
        <LDAOPurchaseModal 
          isOpen={true} 
          onClose={jest.fn()} 
          userAddress={mockUserAddress}
        />
      );

      fireEvent.click(screen.getByText('Continue')); // Method
      
      await waitFor(() => {
        const amountInput = screen.getByPlaceholderText('Enter custom amount');
        fireEvent.change(amountInput, { target: { value: '1000' } });
      });

      // Should retry and succeed
      await waitFor(() => {
        expect(screen.getByText('Live Price Quote')).toBeInTheDocument();
      });
    });

    it('handles service unavailability gracefully', async () => {
      mockService.getEarnOpportunities.mockRejectedValue(new Error('Service unavailable'));

      render(<EarnLDAOPage userAddress={mockUserAddress} />);

      await waitFor(() => {
        // Should still render page structure
        expect(screen.getByText('Earn LDAO Tokens')).toBeInTheDocument();
      });
    });
  });
});