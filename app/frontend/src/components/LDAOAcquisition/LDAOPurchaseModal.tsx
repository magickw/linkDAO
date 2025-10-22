import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  XMarkIcon, 
  CreditCardIcon, 
  BanknotesIcon, 
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { ldaoAcquisitionService, PurchaseQuote } from '../../services/ldaoAcquisitionService';
import { toast } from 'react-hot-toast';

interface LDAOPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: string;
  userAddress?: string;
}

type PurchaseMethod = 'fiat' | 'crypto' | 'earn';
type FiatMethod = 'card' | 'apple_pay' | 'google_pay';
type CryptoMethod = 'ETH' | 'USDC';
type PurchaseStep = 'method' | 'amount' | 'payment' | 'confirmation' | 'processing' | 'success' | 'error';

interface TransactionStatus {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  message?: string;
}

export default function LDAOPurchaseModal({ 
  isOpen, 
  onClose, 
  initialAmount = '1000',
  userAddress 
}: LDAOPurchaseModalProps) {
  // State management
  const [currentStep, setCurrentStep] = useState<PurchaseStep>('method');
  const [purchaseMethod, setPurchaseMethod] = useState<PurchaseMethod>('crypto');
  const [fiatMethod, setFiatMethod] = useState<FiatMethod>('card');
  const [cryptoMethod, setCryptoMethod] = useState<CryptoMethod>('ETH');
  const [ldaoAmount, setLdaoAmount] = useState(initialAmount);
  const [quote, setQuote] = useState<PurchaseQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus | null>(null);
  const [priceRefreshInterval, setPriceRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('method');
      setTransactionStatus(null);
      setValidationErrors({});
      if (ldaoAmount) {
        fetchQuote();
        startPriceRefresh();
      }
    } else {
      stopPriceRefresh();
    }
    
    return () => {
      stopPriceRefresh();
    };
  }, [isOpen, ldaoAmount]);

  // Real-time price updates
  const startPriceRefresh = useCallback(() => {
    if (priceRefreshInterval) {
      clearInterval(priceRefreshInterval);
    }
    
    const interval = setInterval(() => {
      if (ldaoAmount && currentStep !== 'processing') {
        fetchQuote();
      }
    }, 30000); // Refresh every 30 seconds
    
    setPriceRefreshInterval(interval);
  }, [ldaoAmount, currentStep]);

  const stopPriceRefresh = useCallback(() => {
    if (priceRefreshInterval) {
      clearInterval(priceRefreshInterval);
      setPriceRefreshInterval(null);
    }
  }, [priceRefreshInterval]);

  const fetchQuote = async () => {
    if (!ldaoAmount || parseFloat(ldaoAmount) <= 0) {
      setQuote(null);
      return;
    }

    try {
      setLoading(true);
      const quoteData = await ldaoAcquisitionService.getQuote(ldaoAmount);
      setQuote(quoteData);
      setValidationErrors(prev => ({ ...prev, quote: '' }));
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      setValidationErrors(prev => ({ ...prev, quote: 'Failed to get price quote' }));
      toast.error('Failed to get price quote');
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (amount: string): boolean => {
    const numAmount = parseFloat(amount);
    const errors: Record<string, string> = {};

    if (!amount || isNaN(numAmount)) {
      errors.amount = 'Please enter a valid amount';
    } else if (numAmount < 1) {
      errors.amount = 'Minimum purchase is 1 LDAO';
    } else if (numAmount > 1000000) {
      errors.amount = 'Maximum purchase is 1,000,000 LDAO';
    }

    setValidationErrors(prev => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const validatePaymentMethod = (): boolean => {
    if (!userAddress && purchaseMethod === 'crypto') {
      setValidationErrors(prev => ({ ...prev, wallet: 'Please connect your wallet first' }));
      return false;
    }
    return true;
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'method':
        if (purchaseMethod === 'earn') {
          onClose();
          window.location.href = '/earn';
          return;
        }
        setCurrentStep('amount');
        break;
      case 'amount':
        if (validateAmount(ldaoAmount)) {
          setCurrentStep('payment');
        }
        break;
      case 'payment':
        if (validatePaymentMethod()) {
          setCurrentStep('confirmation');
        }
        break;
      case 'confirmation':
        handlePurchase();
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'amount':
        setCurrentStep('method');
        break;
      case 'payment':
        setCurrentStep('amount');
        break;
      case 'confirmation':
        setCurrentStep('payment');
        break;
      case 'error':
        setCurrentStep('confirmation');
        break;
    }
  };

  const handlePurchase = async () => {
    try {
      setPurchasing(true);
      setCurrentStep('processing');
      stopPriceRefresh();
      
      // Initialize transaction status
      setTransactionStatus({
        step: 'Initializing transaction...',
        status: 'processing'
      });
      
      let result;
      if (purchaseMethod === 'fiat') {
        setTransactionStatus({
          step: 'Processing payment...',
          status: 'processing'
        });
        
        result = await ldaoAcquisitionService.purchaseWithFiat({
          amount: parseFloat(quote?.usdAmount || '0'),
          currency: 'USD',
          paymentMethod: fiatMethod
        });
      } else if (purchaseMethod === 'crypto') {
        setTransactionStatus({
          step: 'Confirming blockchain transaction...',
          status: 'processing'
        });
        
        result = await ldaoAcquisitionService.purchaseWithCrypto(cryptoMethod, ldaoAmount);
      }
      
      if (result?.success) {
        setTransactionStatus({
          step: 'Transaction completed successfully!',
          status: 'completed',
          txHash: result.transactionHash
        });
        setCurrentStep('success');
        toast.success(`Successfully purchased ${ldaoAmount} LDAO tokens!`);
      } else {
        setTransactionStatus({
          step: 'Transaction failed',
          status: 'failed',
          message: result?.error || 'Purchase failed'
        });
        setCurrentStep('error');
        toast.error(result?.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setTransactionStatus({
        step: 'Transaction failed',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Purchase failed'
      });
      setCurrentStep('error');
      toast.error('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const presetAmounts = ['100', '500', '1000', '5000', '10000'];

  const getStepNumber = (step: PurchaseStep): number => {
    const stepMap = {
      method: 1,
      amount: 2,
      payment: 3,
      confirmation: 4,
      processing: 4,
      success: 4,
      error: 4
    };
    return stepMap[step] || 1;
  };

  const getStepTitle = (step: PurchaseStep): string => {
    const titleMap = {
      method: 'Choose Method',
      amount: 'Enter Amount',
      payment: 'Payment Details',
      confirmation: 'Confirm Purchase',
      processing: 'Processing...',
      success: 'Success!',
      error: 'Error'
    };
    return titleMap[step] || 'Purchase LDAO';
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            step <= getStepNumber(currentStep)
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {step < getStepNumber(currentStep) ? (
              <CheckCircleIcon className="w-5 h-5" />
            ) : (
              step
            )}
          </div>
          {step < 4 && (
            <div className={`w-12 h-0.5 mx-2 ${
              step < getStepNumber(currentStep) ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const PriceDisplay = () => {
    if (!quote || loading) {
      return (
        <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Live Price Quote</span>
          <div className="flex items-center text-xs text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            Real-time
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">You'll receive:</span>
            <span className="font-semibold text-lg text-blue-600">{quote.ldaoAmount} LDAO</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {purchaseMethod === 'crypto' ? `${cryptoMethod} cost:` : 'USD cost:'}
            </span>
            <span className="font-medium">
              {purchaseMethod === 'crypto' 
                ? `${cryptoMethod === 'ETH' ? quote.ethAmount : quote.usdcAmount} ${cryptoMethod}`
                : `$${quote.usdAmount}`
              }
            </span>
          </div>
          
          {quote.discount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600">Volume discount:</span>
              <span className="font-medium text-green-600">-{quote.discount}%</span>
            </div>
          )}
          
          <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-200">
            <span>Estimated time:</span>
            <span>{quote.estimatedTime}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                    {getStepTitle(currentStep)}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Step Indicator */}
                {!['success', 'error'].includes(currentStep) && <StepIndicator />}

                {/* Step 1: Purchase Method Selection */}
                {currentStep === 'method' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        How would you like to get LDAO tokens?
                      </label>
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          onClick={() => setPurchaseMethod('crypto')}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            purchaseMethod === 'crypto'
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center">
                            <BanknotesIcon className="h-6 w-6 mr-3 text-blue-600" />
                            <div>
                              <div className="font-medium text-gray-900">Pay with Crypto</div>
                              <div className="text-sm text-gray-500">Use ETH or USDC • Instant • Lower fees</div>
                            </div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => setPurchaseMethod('fiat')}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            purchaseMethod === 'fiat'
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center">
                            <CreditCardIcon className="h-6 w-6 mr-3 text-green-600" />
                            <div>
                              <div className="font-medium text-gray-900">Pay with Card</div>
                              <div className="text-sm text-gray-500">Credit/Debit card or Apple Pay • 2.9% fee</div>
                            </div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => setPurchaseMethod('earn')}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            purchaseMethod === 'earn'
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center">
                            <DevicePhoneMobileIcon className="h-6 w-6 mr-3 text-purple-600" />
                            <div>
                              <div className="font-medium text-gray-900">Earn Tokens</div>
                              <div className="text-sm text-gray-500">Complete tasks to earn free LDAO • No cost</div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Amount Selection */}
                {currentStep === 'amount' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        How many LDAO tokens would you like to purchase?
                      </label>
                      
                      {/* Preset Amounts */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {presetAmounts.map((amount) => (
                          <button
                            key={amount}
                            onClick={() => {
                              setLdaoAmount(amount);
                              setValidationErrors(prev => ({ ...prev, amount: '' }));
                            }}
                            className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                              ldaoAmount === amount
                                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            {parseInt(amount).toLocaleString()}
                          </button>
                        ))}
                      </div>

                      {/* Custom Amount Input */}
                      <div className="space-y-2">
                        <input
                          type="number"
                          value={ldaoAmount}
                          onChange={(e) => {
                            setLdaoAmount(e.target.value);
                            setValidationErrors(prev => ({ ...prev, amount: '' }));
                          }}
                          placeholder="Enter custom amount"
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            validationErrors.amount ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                        {validationErrors.amount && (
                          <p className="text-sm text-red-600 flex items-center">
                            <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                            {validationErrors.amount}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Live Price Display */}
                    {ldaoAmount && parseFloat(ldaoAmount) > 0 && (
                      <PriceDisplay />
                    )}

                    {/* Benefits Info */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-start">
                        <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <div className="font-medium mb-1">Volume Discounts Available</div>
                          <div>Purchase 10,000+ LDAO tokens and save up to 15% on your order.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Payment Method Selection */}
                {currentStep === 'payment' && (
                  <div className="space-y-6">
                    {purchaseMethod === 'fiat' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-4">
                          Choose your payment method
                        </label>
                        <div className="space-y-3">
                          <button
                            onClick={() => setFiatMethod('card')}
                            className={`w-full p-4 rounded-lg border text-left transition-all ${
                              fiatMethod === 'card'
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <CreditCardIcon className="h-6 w-6 mr-3 text-blue-600" />
                                <div>
                                  <div className="font-medium text-gray-900">Credit/Debit Card</div>
                                  <div className="text-sm text-gray-500">Visa, Mastercard, American Express</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">Instant</div>
                                <div className="text-sm text-gray-500">2.9% fee</div>
                              </div>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => setFiatMethod('apple_pay')}
                            className={`w-full p-4 rounded-lg border text-left transition-all ${
                              fiatMethod === 'apple_pay'
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <DevicePhoneMobileIcon className="h-6 w-6 mr-3 text-gray-900" />
                                <div>
                                  <div className="font-medium text-gray-900">Apple Pay</div>
                                  <div className="text-sm text-gray-500">Touch ID or Face ID</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">Instant</div>
                                <div className="text-sm text-gray-500">2.9% fee</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {purchaseMethod === 'crypto' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-4">
                          Select cryptocurrency to pay with
                        </label>
                        
                        {validationErrors.wallet && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600 flex items-center">
                              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                              {validationErrors.wallet}
                            </p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 gap-3">
                          <button
                            onClick={() => setCryptoMethod('ETH')}
                            className={`p-4 rounded-lg border text-left transition-all ${
                              cryptoMethod === 'ETH'
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-white text-sm font-bold">Ξ</span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">Ethereum (ETH)</div>
                                  <div className="text-sm text-gray-500">Native Ethereum token</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">~$2,400</div>
                                <div className="text-sm text-gray-500">Current price</div>
                              </div>
                            </div>
                          </button>
                          
                          <button
                            onClick={() => setCryptoMethod('USDC')}
                            className={`p-4 rounded-lg border text-left transition-all ${
                              cryptoMethod === 'USDC'
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-white text-sm font-bold">$</span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">USD Coin (USDC)</div>
                                  <div className="text-sm text-gray-500">Stable USD-pegged token</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">$1.00</div>
                                <div className="text-sm text-gray-500">Stable price</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Current Quote Display */}
                    {quote && (
                      <PriceDisplay />
                    )}
                  </div>
                )}

                {/* Quote Display */}
                {quote && purchaseMethod !== 'earn' && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">You'll receive:</span>
                      <span className="font-medium">{quote.ldaoAmount} LDAO</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">
                        {purchaseMethod === 'crypto' ? `${cryptoMethod} cost:` : 'USD cost:'}
                      </span>
                      <span className="font-medium">
                        {purchaseMethod === 'crypto' 
                          ? `${cryptoMethod === 'ETH' ? quote.ethAmount : quote.usdcAmount} ${cryptoMethod}`
                          : `$${quote.usdAmount}`
                        }
                      </span>
                    </div>
                    {quote.discount > 0 && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-green-600">Volume discount:</span>
                        <span className="font-medium text-green-600">{quote.discount}%</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Estimated time:</span>
                      <span>{quote.estimatedTime}</span>
                    </div>
                  </div>
                )}

                {/* Earn Options */}
                {purchaseMethod === 'earn' && (
                  <div className="mb-6">
                    <div className="text-center py-8">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Earn LDAO Tokens
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Complete activities to earn free LDAO tokens
                      </p>
                      <button
                        onClick={() => {
                          onClose();
                          // Navigate to earn page
                          window.location.href = '/earn';
                        }}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Earning Opportunities
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Confirmation */}
                {currentStep === 'confirmation' && quote && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Confirm Your Purchase
                      </h3>
                      <p className="text-gray-600">
                        Please review your order details before proceeding
                      </p>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                        <span className="text-lg font-semibold text-gray-900">Order Summary</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">LDAO Tokens</span>
                          <span className="font-semibold">{parseInt(quote.ldaoAmount).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Payment Method</span>
                          <span className="font-medium">
                            {purchaseMethod === 'crypto' 
                              ? `${cryptoMethod} (Crypto)`
                              : `${fiatMethod === 'card' ? 'Credit Card' : 'Apple Pay'} (Fiat)`
                            }
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Unit Price</span>
                          <span className="font-medium">$0.01 per LDAO</span>
                        </div>
                        
                        {quote.discount > 0 && (
                          <div className="flex justify-between items-center text-green-600">
                            <span>Volume Discount ({quote.discount}%)</span>
                            <span className="font-medium">
                              -${(parseFloat(quote.usdAmount) * quote.discount / 100).toFixed(2)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                          <span className="text-lg font-semibold text-gray-900">Total Cost</span>
                          <span className="text-lg font-bold text-blue-600">
                            {purchaseMethod === 'crypto' 
                              ? `${cryptoMethod === 'ETH' ? quote.ethAmount : quote.usdcAmount} ${cryptoMethod}`
                              : `$${quote.usdAmount}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Important Notes */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <InformationCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <div className="font-medium mb-1">Important Notes:</div>
                          <ul className="space-y-1 text-xs">
                            <li>• Transactions are irreversible once confirmed</li>
                            <li>• Estimated completion time: {quote.estimatedTime}</li>
                            <li>• You'll receive tokens in your connected wallet</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing Step */}
                {currentStep === 'processing' && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Processing Your Purchase
                    </h3>
                    {transactionStatus && (
                      <div className="space-y-3">
                        <p className="text-gray-600">{transactionStatus.step}</p>
                        {transactionStatus.txHash && (
                          <div className="text-sm text-blue-600">
                            Transaction: {transactionStatus.txHash.slice(0, 10)}...
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mt-4">
                      Please don't close this window. This may take a few minutes.
                    </p>
                  </div>
                )}

                {/* Success Step */}
                {currentStep === 'success' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircleIcon className="h-10 w-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Purchase Successful!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      You've successfully purchased {ldaoAmount} LDAO tokens
                    </p>
                    
                    {transactionStatus?.txHash && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="text-sm text-gray-600 mb-1">Transaction Hash:</div>
                        <div className="font-mono text-sm text-blue-600 break-all">
                          {transactionStatus.txHash}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => window.open(`https://etherscan.io/tx/${transactionStatus?.txHash}`, '_blank')}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View on Etherscan
                      </button>
                      <button
                        onClick={onClose}
                        className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Step */}
                {currentStep === 'error' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Purchase Failed
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {transactionStatus?.message || 'Something went wrong with your purchase'}
                    </p>
                    
                    <div className="space-y-3">
                      <button
                        onClick={handleBack}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                      <button
                        onClick={onClose}
                        className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                {!['processing', 'success', 'error'].includes(currentStep) && (
                  <div className="flex space-x-3 mt-8">
                    {currentStep !== 'method' && (
                      <button
                        onClick={handleBack}
                        className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Back
                      </button>
                    )}
                    
                    <button
                      onClick={handleNext}
                      disabled={loading || (currentStep === 'amount' && !validateAmount(ldaoAmount)) || (currentStep === 'payment' && !validatePaymentMethod())}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {currentStep === 'confirmation' ? (
                        purchasing ? 'Processing...' : 'Confirm Purchase'
                      ) : (
                        <>
                          {currentStep === 'method' && purchaseMethod === 'earn' ? 'View Opportunities' : 'Continue'}
                          <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="mt-4 text-xs text-gray-500 text-center">
                  By purchasing LDAO tokens, you agree to our Terms of Service and acknowledge 
                  that cryptocurrency investments carry risk.
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}