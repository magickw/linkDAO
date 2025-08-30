import React, { useState, useEffect } from 'react';
import { useFiatPayment } from '../hooks/useFiatPayment';
import { 
  FiatPaymentRequest, 
  FiatPaymentStatus, 
  FiatPaymentMethod 
} from '../types/fiatPayment';

interface FiatPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentRequest: FiatPaymentRequest;
  customerId: string;
  stripeApiKey: string;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
}

export function FiatPaymentModal({
  isOpen,
  onClose,
  paymentRequest,
  customerId,
  stripeApiKey,
  onSuccess,
  onError
}: FiatPaymentModalProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [convertToCrypto, setConvertToCrypto] = useState(false);
  const [targetToken, setTargetToken] = useState('ETH');
  const [slippageTolerance, setSlippageTolerance] = useState(1.0);

  const {
    isProcessing,
    currentTransaction,
    error,
    paymentMethods,
    exchangeRates,
    processPayment,
    confirmPayment,
    loadPaymentMethods,
    getExchangeRate,
    convertAmount,
    formatCurrency,
    getSupportedCurrencies,
    clearError
  } = useFiatPayment(stripeApiKey);

  // Load payment methods when modal opens
  useEffect(() => {
    if (isOpen && customerId) {
      loadPaymentMethods(customerId).catch(console.error);
    }
  }, [isOpen, customerId, loadPaymentMethods]);

  // Get exchange rate for crypto conversion
  useEffect(() => {
    if (convertToCrypto && targetToken) {
      getExchangeRate(paymentRequest.currency, targetToken).catch(console.error);
    }
  }, [convertToCrypto, targetToken, paymentRequest.currency, getExchangeRate]);

  // Handle transaction status changes
  useEffect(() => {
    if (currentTransaction) {
      if (currentTransaction.status === FiatPaymentStatus.SUCCEEDED) {
        onSuccess(currentTransaction.id);
      } else if (currentTransaction.status === FiatPaymentStatus.FAILED) {
        onError(currentTransaction.failureReason || 'Payment failed');
      }
    }
  }, [currentTransaction, onSuccess, onError]);

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      onError('Please select a payment method');
      return;
    }

    try {
      clearError();
      
      const request: FiatPaymentRequest = {
        ...paymentRequest,
        paymentMethodId: selectedPaymentMethod,
        convertToCrypto: convertToCrypto ? {
          targetToken,
          targetChain: 1, // Ethereum mainnet
          slippageTolerance
        } : undefined
      };

      await processPayment(request);
    } catch (err: any) {
      onError(err.message || 'Payment failed');
    }
  };

  const getConversionPreview = async () => {
    if (!convertToCrypto || !targetToken) return null;

    try {
      const conversion = await convertAmount(
        paymentRequest.amount,
        paymentRequest.currency,
        targetToken
      );
      return conversion;
    } catch (error) {
      return null;
    }
  };

  if (!isOpen) return null;

  const supportedCurrencies = getSupportedCurrencies();
  const cryptoTokens = ['ETH', 'USDC', 'USDT', 'BTC'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Pay with Card</h2>
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
                {formatCurrency(paymentRequest.amount, paymentRequest.currency)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Order ID</span>
              <span className="text-sm font-mono">{paymentRequest.orderId}</span>
            </div>
            {paymentRequest.customerEmail && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Email</span>
                <span className="text-sm">{paymentRequest.customerEmail}</span>
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            {paymentMethods.length > 0 ? (
              <div className="space-y-2">
                {paymentMethods.map((method) => (
                  <label key={method.id} className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={selectedPaymentMethod === method.id}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                      className="mr-2"
                      disabled={isProcessing}
                    />
                    <span className="text-sm">
                      {method.name} {method.isDefault && '(Default)'}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                No payment methods found. Please add a payment method.
              </div>
            )}
            
            <button
              onClick={() => setShowAddPaymentMethod(true)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              disabled={isProcessing}
            >
              + Add New Payment Method
            </button>
          </div>

          {/* Crypto Conversion Option */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={convertToCrypto}
                onChange={(e) => setConvertToCrypto(e.target.checked)}
                className="mr-2"
                disabled={isProcessing}
              />
              <span className="text-sm font-medium">Convert to cryptocurrency</span>
            </label>
            
            {convertToCrypto && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Target Token</label>
                  <select
                    value={targetToken}
                    onChange={(e) => setTargetToken(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md"
                    disabled={isProcessing}
                  >
                    {cryptoTokens.map((token) => (
                      <option key={token} value={token}>{token}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Slippage Tolerance ({slippageTolerance}%)
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={slippageTolerance}
                    onChange={(e) => setSlippageTolerance(parseFloat(e.target.value))}
                    className="w-full"
                    disabled={isProcessing}
                  />
                </div>

                {/* Conversion Preview */}
                {exchangeRates[`${paymentRequest.currency}-${targetToken}`] && (
                  <div className="bg-blue-50 rounded p-2 text-sm">
                    <div className="text-blue-800">
                      Estimated: ~{(paymentRequest.amount * exchangeRates[`${paymentRequest.currency}-${targetToken}`].rate).toFixed(6)} {targetToken}
                    </div>
                    <div className="text-xs text-blue-600">
                      Rate: 1 {paymentRequest.currency} = {exchangeRates[`${paymentRequest.currency}-${targetToken}`].rate.toFixed(6)} {targetToken}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          )}

          {/* Transaction Status */}
          {currentTransaction && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="text-yellow-800 text-sm">
                <div className="font-medium">Status: {currentTransaction.status}</div>
                {currentTransaction.providerTransactionId && (
                  <div className="mt-1 text-xs">
                    Transaction ID: {currentTransaction.providerTransactionId}
                  </div>
                )}
                {currentTransaction.fees && (
                  <div className="mt-1 text-xs">
                    Processing Fee: {formatCurrency(currentTransaction.fees.processingFee, paymentRequest.currency)}
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
            disabled={isProcessing || !selectedPaymentMethod}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : `Pay ${formatCurrency(paymentRequest.amount, paymentRequest.currency)}`}
          </button>
        </div>

        {/* Add Payment Method Modal */}
        {showAddPaymentMethod && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Payment Method</h3>
              <p className="text-sm text-gray-600 mb-4">
                In a real implementation, this would integrate with Stripe Elements 
                to securely collect payment method details.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddPaymentMethod(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Mock adding a payment method
                    setShowAddPaymentMethod(false);
                    // In real implementation, this would save the payment method
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Method
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}