/**
 * CheckoutFlow Component Unit Tests
 * Tests for the complete checkout flow component including all steps and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CheckoutFlow } from '../CheckoutFlow';
import * as wagmi from 'wagmi';
import * as cartHook from '@/hooks/useCart';
import * as unifiedCheckoutService from '@/services/unifiedCheckoutService';
import * as paymentMethodPrioritizationService from '@/services/paymentMethodPrioritizationService';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(),
  useChainId: jest.fn(),
  useSwitchChain: jest.fn()
}));

// Mock cart hook
jest.mock('@/hooks/useCart', () => ({
  useCart: jest.fn()
}));

// Mock services
jest.mock('@/services/unifiedCheckoutService');
jest.mock('@/services/paymentMethodPrioritizationService');
jest.mock('@/services/costEffectivenessCalculator');
jest.mock('@/services/networkAvailabilityChecker');
jest.mock('@/services/userPreferenceManager');

// Mock child components
jest.mock('@/components/Web3/NetworkSwitcher', () => ({
  NetworkSwitcher: () => <div data-testid="network-switcher">Network Switcher</div>
}));

jest.mock('@/components/PaymentMethodPrioritization/PaymentMethodSelector', () => {
  const MockPaymentMethodSelector = ({ prioritizationResult, onMethodSelect }: any) => (
    <div data-testid="payment-method-selector">
      <button 
        onClick={() => onMethodSelect && onMethodSelect(prioritizationResult.prioritizedMethods[0])}
        data-testid="select-payment-method"
      >
        Select Payment Method
      </button>
    </div>
  );
  return MockPaymentMethodSelector;
});

// Mock router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('CheckoutFlow Component', () => {
  const mockOnBack = jest.fn();
  const mockOnComplete = jest.fn();

  const mockCartState = {
    items: [
      {
        id: '1',
        title: 'Test Item',
        price: { fiat: '100.00' },
        quantity: 1,
        seller: { id: 'seller1' }
      }
    ],
    totals: {
      subtotal: { fiat: '100.00' },
      shipping: { fiat: '0.00' },
      total: { fiat: '100.00' }
    }
  };

  const mockPrioritizationResult = {
    prioritizedMethods: [
      {
        method: {
          id: 'usdc-mainnet',
          type: 'STABLECOIN_USDC',
          name: 'USDC (Ethereum)',
          description: 'USD Coin on Ethereum mainnet',
          chainId: 1,
          enabled: true,
          supportedNetworks: [1],
          token: {
            address: '0xA0b86a33E6441e6e80D0c4C6C7527d72',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            chainId: 1
          }
        },
        priority: 1,
        costEstimate: {
          totalCost: 100.50,
          baseCost: 100,
          gasFee: 0.50,
          estimatedTime: 3,
          confidence: 0.9,
          currency: 'USD',
          breakdown: {
            amount: 100,
            gasLimit: BigInt(65000),
            gasPrice: BigInt(20000000000),
            networkFee: 0,
            platformFee: 0
          }
        },
        availabilityStatus: 'AVAILABLE',
        userPreferenceScore: 0.8,
        recommendationReason: 'Recommended: USDC-first prioritization',
        totalScore: 0.95,
        warnings: [],
        benefits: ['Applied rule: USDC is prioritized as the primary stablecoin choice']
      }
    ],
    defaultMethod: {
      method: {
        id: 'usdc-mainnet',
        type: 'STABLECOIN_USDC',
        name: 'USDC (Ethereum)',
        description: 'USD Coin on Ethereum mainnet',
        chainId: 1,
        enabled: true,
        supportedNetworks: [1],
        token: {
          address: '0xA0b86a33E6441e6e80D0c4C6C7527d72',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: 1
        }
      },
      priority: 1,
      costEstimate: {
        totalCost: 100.50,
        baseCost: 100,
        gasFee: 0.50,
        estimatedTime: 3,
        confidence: 0.9,
        currency: 'USD',
        breakdown: {
          amount: 100,
          gasLimit: BigInt(65000),
          gasPrice: BigInt(20000000000),
          networkFee: 0,
          platformFee: 0
        }
      },
      availabilityStatus: 'AVAILABLE',
      userPreferenceScore: 0.8,
      recommendationReason: 'Recommended: USDC-first prioritization',
      totalScore: 0.95,
      warnings: [],
      benefits: ['Applied rule: USDC is prioritized as the primary stablecoin choice']
    },
    recommendations: [],
    warnings: [],
    metadata: {
      calculatedAt: new Date(),
      totalMethodsEvaluated: 1,
      averageConfidence: 0.9,
      processingTimeMs: 100
    }
  };

  const mockCheckoutRecommendation = {
    recommendedPath: 'crypto',
    reason: 'USDC has lower fees',
    cryptoOption: {
      available: true,
      token: 'USDC',
      fees: 0.50,
      estimatedTime: '3 minutes',
      benefits: ['Lower fees', 'Stable value'],
      requirements: ['Wallet connection']
    },
    fiatOption: {
      available: true,
      provider: 'Stripe',
      fees: 3.90,
      estimatedTime: 'Instant',
      benefits: ['No crypto knowledge needed'],
      requirements: ['Valid payment method']
    }
  };

  const mockUnifiedCheckoutResult = {
    orderId: 'order_123',
    paymentPath: 'crypto',
    escrowType: 'smart_contract',
    transactionId: 'tx_123',
    status: 'processing',
    nextSteps: ['Wait for confirmation'],
    estimatedCompletionTime: new Date(Date.now() + 300000)
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock wagmi hooks
    (wagmi.useAccount as jest.Mock).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
      isConnected: true
    });

    (wagmi.useConnect as jest.Mock).mockReturnValue({
      connect: jest.fn(),
      connectors: [{ id: 'metamask', name: 'MetaMask' }]
    });

    (wagmi.useChainId as jest.Mock).mockReturnValue(1);

    // Mock cart hook
    (cartHook.useCart as jest.Mock).mockReturnValue({
      state: mockCartState,
      actions: {
        clearCart: jest.fn()
      }
    });

    // Mock service methods
    (paymentMethodPrioritizationService.PaymentMethodPrioritizationService as jest.Mock).mockImplementation(() => ({
      prioritizePaymentMethods: jest.fn().mockResolvedValue(mockPrioritizationResult)
    }));

    (unifiedCheckoutService.UnifiedCheckoutService as jest.Mock).mockImplementation(() => ({
      getCheckoutRecommendation: jest.fn().mockResolvedValue(mockCheckoutRecommendation),
      processPrioritizedCheckout: jest.fn().mockResolvedValue(mockUnifiedCheckoutResult)
    }));
  });

  it('renders checkout flow component', () => {
    render(<CheckoutFlow onBack={mockOnBack} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Secure Checkout')).toBeInTheDocument();
    expect(screen.getByText('Complete your purchase with escrow protection')).toBeInTheDocument();
  });

  it('loads payment prioritization on mount', async () => {
    render(<CheckoutFlow onBack={mockOnBack} onComplete={mockOnComplete} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
    });
  });

  it('displays order summary', () => {
    render(<CheckoutFlow onBack={mockOnBack} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Order Summary')).toBeInTheDocument();
    expect(screen.getByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
  });

  it('allows selecting a payment method', async () => {
    render(<CheckoutFlow onBack={mockOnBack} onComplete={mockOnComplete} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
    });
    
    const selectButton = screen.getByTestId('select-payment-method');
    fireEvent.click(selectButton);
    
    await waitFor(() => {
      expect(screen.getByText('Continue with USDC (Ethereum)')).toBeInTheDocument();
    });
  });

  it('navigates to payment details after selecting payment method', async () => {
    render(<CheckoutFlow onBack={mockOnBack} onComplete={mockOnComplete} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
    });
    
    const selectButton = screen.getByTestId('select-payment-method');
    fireEvent.click(selectButton);
    
    await waitFor(() => {
      expect(screen.getByText('Continue with USDC (Ethereum)')).toBeInTheDocument();
    });
    
    const continueButton = screen.getByText('Continue with USDC (Ethereum)');
    fireEvent.click(continueButton);
    
    await waitFor(() => {
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
    });
  });

  it('processes payment successfully', async () => {
    render(<CheckoutFlow onBack={mockOnBack} onComplete={mockOnComplete} />);
    
    // Select payment method
    await waitFor(() => {
      expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
    });
    
    const selectButton = screen.getByTestId('select-payment-method');
    fireEvent.click(selectButton);
    
    await waitFor(() => {
      expect(screen.getByText('Continue with USDC (Ethereum)')).toBeInTheDocument();
    });
    
    const continueButton = screen.getByText('Continue with USDC (Ethereum)');
    fireEvent.click(continueButton);
    
    // Process payment
    await waitFor(() => {
      expect(screen.getByText('Pay with USDC (Ethereum)')).toBeInTheDocument();
    });
    
    const payButton = screen.getByText('Pay with USDC (Ethereum)');
    fireEvent.click(payButton);
    
    // Check for confirmation
    await waitFor(() => {
      expect(screen.getByText('Order Confirmed!')).toBeInTheDocument();
    });
  });

  it('handles payment processing errors', async () => {
    // Mock service to throw an error
    (unifiedCheckoutService.UnifiedCheckoutService as jest.Mock).mockImplementation(() => ({
      getCheckoutRecommendation: jest.fn().mockResolvedValue(mockCheckoutRecommendation),
      processPrioritizedCheckout: jest.fn().mockRejectedValue(new Error('Payment failed'))
    }));
    
    render(<CheckoutFlow onBack={mockOnBack} onComplete={mockOnComplete} />);
    
    // Select payment method
    await waitFor(() => {
      expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
    });
    
    const selectButton = screen.getByTestId('select-payment-method');
    fireEvent.click(selectButton);
    
    await waitFor(() => {
      expect(screen.getByText('Continue with USDC (Ethereum)')).toBeInTheDocument();
    });
    
    const continueButton = screen.getByText('Continue with USDC (Ethereum)');
    fireEvent.click(continueButton);
    
    // Process payment
    await waitFor(() => {
      expect(screen.getByText('Pay with USDC (Ethereum)')).toBeInTheDocument();
    });
    
    const payButton = screen.getByText('Pay with USDC (Ethereum)');
    fireEvent.click(payButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Checkout failed. Please try again.')).toBeInTheDocument();
    });
  });

  it('allows going back to payment method selection', async () => {
    render(<CheckoutFlow onBack={mockOnBack} onComplete={mockOnComplete} />);
    
    // Select payment method
    await waitFor(() => {
      expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
    });
    
    const selectButton = screen.getByTestId('select-payment-method');
    fireEvent.click(selectButton);
    
    await waitFor(() => {
      expect(screen.getByText('Continue with USDC (Ethereum)')).toBeInTheDocument();
    });
    
    const continueButton = screen.getByText('Continue with USDC (Ethereum)');
    fireEvent.click(continueButton);
    
    // Go back to payment method selection
    await waitFor(() => {
      expect(screen.getByText('Change')).toBeInTheDocument();
    });
    
    const changeButton = screen.getByText('Change');
    fireEvent.click(changeButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
    });
  });

  it('displays network switcher when connected', () => {
    render(<CheckoutFlow onBack={mockOnBack} onComplete={mockOnComplete} />);
    
    expect(screen.getByTestId('network-switcher')).toBeInTheDocument();
  });
});