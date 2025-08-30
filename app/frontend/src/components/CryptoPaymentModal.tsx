import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useCryptoPayment } from '../hooks/useCryptoPayment';
import { 
  PaymentRequest, 
  PaymentToken, 
  PaymentStatus,
  GasFeeEstimate 
} from '../types/payment';
import { getTokensForChain, getChainConfig } from '../config/payment';

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentRequest: PaymentRequest;
  onSuccess: (transactionHash: string) => void;
  onError: (error: string) => void;
}

export function CryptoPaymentModal({
  isOpen,
  onClose,
  paymentRequest,
  onSuccess,
  onError
}: CryptoPaymentModalProps) {
  const [selectedToken, setSelectedToken] = useState<PaymentToken>(paymentRequest.token);
  const [gasEstimate, setGasEstimate] = useState<GasFeeEstimate | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const {
    isProcessing,
    currentTransaction,
    error,
    estimateGas,
    processPayment,
    retryPayment,
    formatAmount,
    clearError
  } = useCryptoPayment();

  const supportedTokens = getTokensForChain(paymentRequest.chainId);
  const chainConfig = getChainConfig(paymentRequest.chainId);

  // Estimate gas when token changes
  useEffect(() => {
    if (selectedToken && isConnected) {
      handleGasEstimation();
    }
  }, [selectedToken, isConnected]);

  // Handle transaction status changes
  useEffect(() => {
    if (currentTransaction) {
      if (currentTransaction.status === PaymentStatus.CONFIRMED && currentTransaction.hash) {
        onSuccess(currentTransaction.hash);
      } else if (currentTransaction.status === PaymentStatus.FAILED) {
        onError(currentTransaction.failureReason || 'Payment failed');
      }
    }
  }, [currentTransaction, onSuccess, onError]);

  const handleGasEstimation = async () => {
    try {
      setIsEstimating(true);
      const request = { ...paymentRequest, token: selectedToken };
      const estimate = await estimateGas(request);
      setGasEstimate(estimate);
    } catch (err: any) {
      console.error('Gas estimation failed:', err);
    } finally {
      setIsEstimating(false);
    }
  };

  const handlePayment = async () => {
    if (!isConnected) {
      onError('Please connect your wallet');
      return;
    }

    if (chainId !== paymentRequest.chainId) {
      try {
        await switchChain({ chainId: paymentRequest.chainId });
      } catch (err) {
        onError('Please switch to the correct network');
        return;
      }
    }

    try {
      clearError();
      const request = { ...paymentRequest, token: selectedToken };
      await processPayment(request);
    } catch (err: any) {
      onError(err.message || 'Payment failed');
    }
  };

  const handleRetry = async () => {
    if (currentTransaction) {
      try {
        await retryPayment(currentTransaction.id);
      } catch (err: any) {
        onError(err.message || 'Retry failed');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Complete Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>

        {/* Payment Details */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Amount</span>
              <span className="font-semibold">
                {formatAmount(paymentRequest.amount, selectedToken.decimals)} {selectedToken.symbol}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">To</span>
              <span className="text-sm font-mono">
                {paymentRequest.recipient.slice(0, 6)}...{paymentRequest.recipient.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Network</span>
              <span className="text-sm">{chainConfig?.name}</span>
            </div>
          </div>

          {/* Token Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Token
            </label>
            <select
              value={selectedToken.address}
              onChange={(e) => {
                const token = supportedTokens.find(t => t.address === e.target.value);
                if (token) setSelectedToken(token);
              }}
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isProcessing}
            >
              {supportedTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          {/* Gas Estimate */}
          {gasEstimate && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <div className="text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Gas Fee:</span>
                  <span>{formatAmount(gasEstimate.totalCost, 18)} ETH</span>
                </div>
                {gasEstimate.totalCostUSD && (
                  <div className="flex justify-between">
                    <span>USD:</span>
                    <span>${gasEstimate.totalCostUSD.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="text-red-800 text-sm">
                <div className="font-medium">{error.message}</div>
                {error.retryable && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-red-600 hover:text-red-800 underline"
                    disabled={isProcessing}
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Transaction Status */}
          {currentTransaction && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="text-yellow-800 text-sm">
                <div className="font-medium">Transaction Status: {currentTransaction.status}</div>
                {currentTransaction.hash && (
                  <div className="mt-1">
                    Hash: {currentTransaction.hash.slice(0, 10)}...
                  </div>
                )}
                {currentTransaction.confirmations > 0 && (
                  <div className="mt-1">
                    Confirmations: {currentTransaction.confirmations}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={isProcessing || !isConnected || isEstimating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Pay Now'}
          </button>
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Please connect your wallet to continue
          </div>
        )}
      </div>
    </div>
  );
}