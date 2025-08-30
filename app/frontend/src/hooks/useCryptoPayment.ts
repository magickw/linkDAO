import { useState, useCallback, useEffect } from 'react';
import { usePublicClient, useWalletClient, useChainId, useAccount } from 'wagmi';
import { 
  PaymentRequest, 
  PaymentTransaction, 
  PaymentStatus, 
  PaymentReceipt,
  PaymentError,
  GasFeeEstimate 
} from '../types/payment';
import { CryptoPaymentService } from '../services/cryptoPaymentService';
import { GasFeeService } from '../services/gasFeeService';

interface UseCryptoPaymentReturn {
  // State
  isProcessing: boolean;
  currentTransaction: PaymentTransaction | null;
  error: PaymentError | null;
  gasEstimate: GasFeeEstimate | null;
  
  // Actions
  estimateGas: (request: PaymentRequest) => Promise<GasFeeEstimate>;
  processPayment: (request: PaymentRequest) => Promise<PaymentTransaction>;
  retryPayment: (transactionId: string) => Promise<PaymentTransaction>;
  cancelPayment: (transactionId: string) => Promise<void>;
  generateReceipt: (transaction: PaymentTransaction) => PaymentReceipt;
  clearError: () => void;
  
  // Utils
  formatAmount: (amount: bigint, decimals: number) => string;
  parseAmount: (amount: string, decimals: number) => bigint;
}

export function useCryptoPayment(): UseCryptoPaymentReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<PaymentTransaction | null>(null);
  const [error, setError] = useState<PaymentError | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasFeeEstimate | null>(null);

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { address, isConnected } = useAccount();

  // Initialize services
  const [paymentService, setPaymentService] = useState<CryptoPaymentService | null>(null);
  const [gasFeeService, setGasFeeService] = useState<GasFeeService | null>(null);

  useEffect(() => {
    if (publicClient && walletClient) {
      const payment = new CryptoPaymentService(publicClient, walletClient);
      const gasFee = new GasFeeService(publicClient);
      
      setPaymentService(payment);
      setGasFeeService(gasFee);
    }
  }, [publicClient, walletClient]);

  /**
   * Estimate gas fees for a payment
   */
  const estimateGas = useCallback(async (request: PaymentRequest): Promise<GasFeeEstimate> => {
    if (!gasFeeService) {
      throw new Error('Gas fee service not initialized');
    }

    try {
      setError(null);
      
      const { token, amount, recipient } = request;
      let estimate: GasFeeEstimate;

      if (token.isNative) {
        estimate = await gasFeeService.estimateGasFees(recipient, '0x', amount);
      } else {
        // ERC-20 transfer data
        const transferData = `0xa9059cbb${recipient.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;
        estimate = await gasFeeService.estimateGasFees(token.address, transferData);
      }

      setGasEstimate(estimate);
      return estimate;
    } catch (err: any) {
      const paymentError: PaymentError = {
        code: 'GAS_ESTIMATION_FAILED',
        message: 'Failed to estimate gas fees',
        details: err,
        retryable: true
      };
      setError(paymentError);
      throw paymentError;
    }
  }, [gasFeeService]);

  /**
   * Process a cryptocurrency payment
   */
  const processPayment = useCallback(async (request: PaymentRequest): Promise<PaymentTransaction> => {
    if (!paymentService) {
      throw new Error('Payment service not initialized');
    }

    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      setIsProcessing(true);
      setError(null);

      const transaction = await paymentService.processPayment(request);
      setCurrentTransaction(transaction);

      // Monitor transaction status
      const monitorInterval = setInterval(() => {
        const status = paymentService.getTransactionStatus(transaction.id);
        if (status) {
          setCurrentTransaction(status);
          
          // Stop monitoring when transaction is final
          if ([PaymentStatus.CONFIRMED, PaymentStatus.FAILED, PaymentStatus.CANCELLED].includes(status.status)) {
            clearInterval(monitorInterval);
            setIsProcessing(false);
          }
        }
      }, 2000);

      return transaction;
    } catch (err: any) {
      setIsProcessing(false);
      const paymentError: PaymentError = {
        code: err.code || 'PAYMENT_FAILED',
        message: err.message || 'Payment processing failed',
        details: err,
        retryable: err.retryable || false
      };
      setError(paymentError);
      throw paymentError;
    }
  }, [paymentService, isConnected, address]);

  /**
   * Retry a failed payment
   */
  const retryPayment = useCallback(async (transactionId: string): Promise<PaymentTransaction> => {
    if (!paymentService) {
      throw new Error('Payment service not initialized');
    }

    try {
      setIsProcessing(true);
      setError(null);

      const transaction = await paymentService.retryPayment(transactionId);
      setCurrentTransaction(transaction);

      return transaction;
    } catch (err: any) {
      setIsProcessing(false);
      const paymentError: PaymentError = {
        code: 'RETRY_FAILED',
        message: err.message || 'Payment retry failed',
        details: err,
        retryable: false
      };
      setError(paymentError);
      throw paymentError;
    }
  }, [paymentService]);

  /**
   * Cancel a pending payment
   */
  const cancelPayment = useCallback(async (transactionId: string): Promise<void> => {
    if (!paymentService) {
      throw new Error('Payment service not initialized');
    }

    try {
      await paymentService.cancelPayment(transactionId);
      setCurrentTransaction(null);
      setIsProcessing(false);
    } catch (err: any) {
      const paymentError: PaymentError = {
        code: 'CANCEL_FAILED',
        message: err.message || 'Payment cancellation failed',
        details: err,
        retryable: false
      };
      setError(paymentError);
      throw paymentError;
    }
  }, [paymentService]);

  /**
   * Generate payment receipt
   */
  const generateReceipt = useCallback((transaction: PaymentTransaction): PaymentReceipt => {
    if (!paymentService) {
      throw new Error('Payment service not initialized');
    }

    return paymentService.generateReceipt(transaction);
  }, [paymentService]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Format token amount for display
   */
  const formatAmount = useCallback((amount: bigint, decimals: number): string => {
    const divisor = BigInt(10 ** decimals);
    const quotient = amount / divisor;
    const remainder = amount % divisor;
    
    if (remainder === 0n) {
      return quotient.toString();
    }
    
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');
    
    return trimmedRemainder ? `${quotient}.${trimmedRemainder}` : quotient.toString();
  }, []);

  /**
   * Parse amount string to bigint
   */
  const parseAmount = useCallback((amount: string, decimals: number): bigint => {
    const [whole, fraction = ''] = amount.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(whole + paddedFraction);
  }, []);

  return {
    // State
    isProcessing,
    currentTransaction,
    error,
    gasEstimate,
    
    // Actions
    estimateGas,
    processPayment,
    retryPayment,
    cancelPayment,
    generateReceipt,
    clearError,
    
    // Utils
    formatAmount,
    parseAmount
  };
}