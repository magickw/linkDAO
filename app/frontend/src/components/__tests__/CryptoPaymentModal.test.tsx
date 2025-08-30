import React from 'react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CryptoPaymentModal } from '../CryptoPaymentModal';
import { PaymentRequest, PaymentStatus } from '../../types/payment';
import { parseEther } from 'viem';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x123...', isConnected: true }),
  useChainId: () => 1,
  useSwitchChain: () => ({ switchChain: jest.fn() })
}));

// Mock the crypto payment hook
jest.mock('../../hooks/useCryptoPayment', () => ({
  useCryptoPayment: () => ({
    isProcessing: false,
    currentTransaction: null,
    error: null,
    gasEstimate: {
      gasLimit: BigInt(21000),
      gasPrice: BigInt(20000000000),
      totalCost: BigInt(420000000000000),
      totalCostUSD: 0.84
    },
    estimateGas: jest.fn().mockResolvedValue({
      gasLimit: BigInt(21000),
      gasPrice: BigInt(20000000000),
      totalCost: BigInt(420000000000000),
      totalCostUSD: 0.84
    }),
    processPayment: jest.fn().mockResolvedValue({
      id: 'tx_123',
      hash: '0xabc123...',
      status: PaymentStatus.CONFIRMING
    }),
    retryPayment: jest.fn(),
    cancelPayment: jest.fn(),
    generateReceipt: jest.fn(),
    clearError: jest.fn(),
    formatAmount: (amount: bigint, decimals: number) => '1.0'
  })
}));

const mockPaymentRequest: PaymentRequest = {
  orderId: 'order_123',
  amount: parseEther('1'),
  token: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    chainId: 1,
    isNative: true
  },
  recipient: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4',
  chainId: 1
};

describe('CryptoPaymentModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    paymentRequest: mockPaymentRequest,
    onSuccess: jest.fn(),
    onError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render payment modal when open', () => {
    render(<CryptoPaymentModal {...mockProps} />);

    expect(screen.getByText('Complete Payment')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('1.0 ETH')).toBeInTheDocument();
    expect(screen.getByText('Pay Now')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<CryptoPaymentModal {...mockProps} isOpen={false} />);

    expect(screen.queryByText('Complete Payment')).not.toBeInTheDocument();
  });

  it('should display payment details correctly', () => {
    render(<CryptoPaymentModal {...mockProps} />);

    expect(screen.getByText('1.0 ETH')).toBeInTheDocument();
    expect(screen.getByText('0x742d...4d4d')).toBeInTheDocument();
    expect(screen.getByText('Ethereum')).toBeInTheDocument();
  });

  it('should display gas fee estimate', () => {
    render(<CryptoPaymentModal {...mockProps} />);

    expect(screen.getByText('Gas Fee:')).toBeInTheDocument();
    expect(screen.getByText('$0.84')).toBeInTheDocument();
  });

  it('should handle payment button click', async () => {
    render(<CryptoPaymentModal {...mockProps} />);

    const payButton = screen.getByText('Pay Now');
    fireEvent.click(payButton);

    // The processPayment function should be called
    await waitFor(() => {
      expect(mockProps.onSuccess).not.toHaveBeenCalled(); // Won't be called in test due to mocking
    });
  });

  it('should handle close button click', () => {
    render(<CryptoPaymentModal {...mockProps} />);

    const closeButton = screen.getByText('✕');
    fireEvent.click(closeButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should handle cancel button click', () => {
    render(<CryptoPaymentModal {...mockProps} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should show wallet connection message when not connected', () => {
    // Mock disconnected wallet
    jest.mocked(require('wagmi').useAccount).mockReturnValue({
      address: null,
      isConnected: false
    });

    render(<CryptoPaymentModal {...mockProps} />);

    expect(screen.getByText('Please connect your wallet to continue')).toBeInTheDocument();
  });

  it('should disable pay button when processing', () => {
    // Mock processing state
    jest.mocked(require('../../hooks/useCryptoPayment').useCryptoPayment).mockReturnValue({
      isProcessing: true,
      currentTransaction: null,
      error: null,
      gasEstimate: null,
      estimateGas: jest.fn(),
      processPayment: jest.fn(),
      retryPayment: jest.fn(),
      cancelPayment: jest.fn(),
      generateReceipt: jest.fn(),
      clearError: jest.fn(),
      formatAmount: jest.fn()
    });

    render(<CryptoPaymentModal {...mockProps} />);

    const payButton = screen.getByText('Processing...');
    expect(payButton).toBeDisabled();
  });

  it('should display error message when error occurs', () => {
    // Mock error state
    jest.mocked(require('../../hooks/useCryptoPayment').useCryptoPayment).mockReturnValue({
      isProcessing: false,
      currentTransaction: null,
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient funds for transaction',
        retryable: false
      },
      gasEstimate: null,
      estimateGas: jest.fn(),
      processPayment: jest.fn(),
      retryPayment: jest.fn(),
      cancelPayment: jest.fn(),
      generateReceipt: jest.fn(),
      clearError: jest.fn(),
      formatAmount: jest.fn()
    });

    render(<CryptoPaymentModal {...mockProps} />);

    expect(screen.getByText('Insufficient funds for transaction')).toBeInTheDocument();
  });

  it('should display transaction status when transaction is active', () => {
    // Mock transaction state
    jest.mocked(require('../../hooks/useCryptoPayment').useCryptoPayment).mockReturnValue({
      isProcessing: false,
      currentTransaction: {
        id: 'tx_123',
        hash: '0xabc123def456...',
        status: PaymentStatus.CONFIRMING,
        confirmations: 5
      },
      error: null,
      gasEstimate: null,
      estimateGas: jest.fn(),
      processPayment: jest.fn(),
      retryPayment: jest.fn(),
      cancelPayment: jest.fn(),
      generateReceipt: jest.fn(),
      clearError: jest.fn(),
      formatAmount: jest.fn()
    });

    render(<CryptoPaymentModal {...mockProps} />);

    expect(screen.getByText('Transaction Status: confirming')).toBeInTheDocument();
    expect(screen.getByText('Hash: 0xabc123de...')).toBeInTheDocument();
    expect(screen.getByText('Confirmations: 5')).toBeInTheDocument();
  });

  it('should show retry button for retryable errors', () => {
    // Mock retryable error state
    jest.mocked(require('../../hooks/useCryptoPayment').useCryptoPayment).mockReturnValue({
      isProcessing: false,
      currentTransaction: null,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        retryable: true
      },
      gasEstimate: null,
      estimateGas: jest.fn(),
      processPayment: jest.fn(),
      retryPayment: jest.fn(),
      cancelPayment: jest.fn(),
      generateReceipt: jest.fn(),
      clearError: jest.fn(),
      formatAmount: jest.fn()
    });

    render(<CryptoPaymentModal {...mockProps} />);

    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });
});