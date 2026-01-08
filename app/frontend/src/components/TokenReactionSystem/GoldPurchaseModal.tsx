/**
 * Enhanced Award Purchase Modal Component
 * Modal for purchasing gold/awards with integrated checkout system supporting USDC and fiat payments
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useWeb3 } from '../../context/Web3Context';
import { useToast } from '../../context/ToastContext';

// Simple types for now to avoid dependency issues
const PaymentMethodType = {
  FIAT_STRIPE: 'FIAT_STRIPE',
  STABLECOIN_USDC: 'STABLECOIN_USDC'
} as const;

type PaymentMethodType = typeof PaymentMethodType[keyof typeof PaymentMethodType];

interface PrioritizedPaymentMethod {
  method: {
    id: string;
    type: string; // Use string to avoid enum issues
    name: string;
    description: string;
    chainId: number;
    enabled: boolean;
    supportedNetworks: number[];
    token?: any;
  };
  availabilityStatus: string;
  costEstimate: {
    totalCost: number;
    fees: number;
    gasFees: number;
    processingFees: number;
    exchangeRateFees: number;
  };
  confidence: number;
  recommendationReason: string;
}

interface GoldPackage {
  id: string;
  amount: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

interface AwardPurchaseModalProps {
  isOpen: boolean;
  awardCost: number; // Gold needed for this award
  currentGold: number;
  onPurchase: (packageId: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const GoldPurchaseModal: React.FC<AwardPurchaseModalProps> = ({
  isOpen,
  awardCost,
  currentGold,
  onPurchase,
  onClose,
  isLoading = false
}) => {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();

  const [selectedPackage, setSelectedPackage] = useState<string>('100');
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PrioritizedPaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const goldPackages: GoldPackage[] = [
    {
      id: '100',
      amount: 100,
      price: 1.79,
    },
    {
      id: '200',
      amount: 200,
      price: 3.59,
      popular: true,
    },
    {
      id: '300',
      amount: 300,
      price: 5.39,
      bonus: 50,
    },
    {
      id: '500',
      amount: 500,
      price: 8.99,
      bonus: 100,
    },
    {
      id: '1000',
      amount: 1000,
      price: 16.99,
      bonus: 250,
    }
  ];

  const selectedPackageData = goldPackages.find(pkg => pkg.id === selectedPackage);
  const goldNeeded = Math.max(0, awardCost - currentGold);
  const remainingGold = currentGold + (selectedPackageData?.amount || 0) - awardCost;

  // Web3-themed package names and icons
  const packageThemes: { [key: string]: { name: string; icon: string; description: string } } = {
    '100': {
      name: 'Starter Stack',
      icon: '🚀',
      description: 'Perfect for your first awards'
    },
    '200': {
      name: 'DeFi Degen',
      icon: '💎',
      description: 'For the true degen in you'
    },
    '300': {
      name: 'Whale Pack',
      icon: '🐋',
      description: 'Make a splash with big awards'
    },
    '500': {
      name: 'Diamond Hands',
      icon: '💎',
      description: 'HODL strong, award stronger'
    },
    '1000': {
      name: 'OG Collection',
      icon: '👑',
      description: 'Legendary status unlocked'
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Auto-select package that covers the award cost
      const suitablePackage = goldPackages.find(pkg => pkg.amount >= goldNeeded);
      if (suitablePackage) {
        setSelectedPackage(suitablePackage.id);
      }
      loadPaymentMethods();
    }
  }, [isOpen, goldNeeded]);

  const loadPaymentMethods = () => {
    // Set default payment method to USDC on Base (low gas fees)
    setSelectedPaymentMethod({
      method: {
        id: 'usdc-base',
        type: 'STABLECOIN_USDC',
        name: 'USDC on Base',
        description: 'USD Coin on Base network',
        chainId: 8453,
        enabled: true,
        supportedNetworks: [8453],
        token: {
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bA029339',
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          chainId: 8453
        }
      },
      availabilityStatus: 'available',
      costEstimate: {
        totalCost: (selectedPackageData?.price || 0) + 0.01, // Very low gas on Base
        fees: 0.01,
        gasFees: 0.01,
        processingFees: 0,
        exchangeRateFees: 0
      },
      confidence: 0.95,
      recommendationReason: 'Low fees on Base network'
    } as any);
  };

  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
    // Reload payment methods for new price
    loadPaymentMethods();
  };

  const handlePaymentMethodSelect = (method: PrioritizedPaymentMethod) => {
    setSelectedPaymentMethod(method);
  };

  const handlePurchase = async () => {
    if (!selectedPaymentMethod || !selectedPackageData) return;

    setIsProcessing(true);
    try {
      // Process actual payment based on selected method
      if (selectedPaymentMethod.method.type === 'FIAT_STRIPE') {
        // Create Stripe checkout session for fiat payment
        // Create Stripe checkout session for fiat payment
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.linkdao.io';

        // Use the dedicated gold purchase endpoint
        const response = await fetch(`${apiUrl}/api/gold/payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add authorization header if available from context/hook
            // 'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({
            packageId: selectedPackage,
            paymentMethod: 'stripe'
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment session');
        }

        const paymentIntent = await response.json();

        // In a real implementation, you would redirect to Stripe Checkout here
        // For now, we'll simulate the payment completion
        addToast('Redirecting to Stripe for payment...', 'info');

        // Simulate successful payment (replace with actual Stripe redirect handling)
        setTimeout(async () => {
          try {
            // Call backend endpoint to complete purchase and send receipt
            await completeGoldPurchase(paymentIntent.id || 'stripe-' + Date.now(), selectedPackage, 'stripe');

            addToast('Gold purchase successful! Award will be given.', 'success');
            await onPurchase(selectedPackage);
            onClose();
          } catch (error) {
            console.error('Error completing purchase:', error);
            addToast('Error completing purchase', 'error');
          } finally {
            setIsProcessing(false);
          }
        }, 3000);

        return; // Exit early to avoid closing modal immediately
      } else {
        // Handle crypto payment (USDC, etc.)
        addToast('Crypto payment processing...', 'info');

        // Simulate crypto payment processing
        await new Promise(resolve => setTimeout(resolve, 3000));

        const transactionHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const network = selectedPaymentMethod.method.id?.replace('usdc-', '') || 'Ethereum';

        // Call backend endpoint to complete purchase and send receipt
        await completeGoldPurchase('crypto-' + Date.now(), selectedPackage, 'usdc', network, transactionHash);

        addToast('Gold purchase successful! Award will be given.', 'success');
        await onPurchase(selectedPackage);
        onClose();
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      addToast(`Purchase failed: ${error.message}`, 'error');
      setIsProcessing(false);
    }
  };

  const completeGoldPurchase = async (
    paymentIntentId: string,
    packageId: string,
    paymentMethod: string,
    network?: string,
    transactionHash?: string
  ) => {
    try {
      const response = await fetch('/api/gold/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          userId: address,
          packageId,
          goldAmount: selectedPackageData?.amount || 0,
          paymentMethod,
          network,
          transactionHash
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete gold purchase on backend');
      }

      const result = await response.json();
      if (result.success) {
        addToast('Receipt sent to your email!', 'success');
      }
    } catch (error) {
      console.error('Error completing gold purchase on backend:', error);
      throw error;
    }
  };

  if (!isOpen) return null;

  // Check if document.body exists before creating portal
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Buy gold to give this award</h2>
            <p className="text-sm text-gray-600 mt-1">
              Gold is used to give awards. You need at least {goldNeeded} more gold for this award
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Gold Usage Info */}
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-blue-900">How gold will be used</span>
          </div>
          <p className="text-sm text-blue-800">
            {awardCost} gold will automatically be used to give this award. {remainingGold} gold will go to your balance to use on future awards.
          </p>
        </div>

        {/* Gold Packages */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Gold Package</h3>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
            {goldPackages.map((pkg) => {
              const theme = packageThemes[pkg.id];
              return (
                <button
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg.id)}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${selectedPackage === pkg.id
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-2xl mb-1">{theme.icon}</div>
                    <div className="text-xs font-medium text-gray-900 mb-1">{theme.name}</div>
                    <div className="text-lg font-bold text-gray-900">{pkg.amount}</div>
                    <div className="text-sm text-gray-600">gold</div>
                    <div className="text-lg font-bold text-gray-900 mt-2">${pkg.price}</div>
                    {pkg.bonus && (
                      <div className="text-xs text-green-600 mt-1">+{pkg.bonus} bonus</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method</h3>

            {/* Simple Payment Method Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* USDC with Network Selector */}
              <div className={`p-4 rounded-lg border-2 transition-all ${selectedPaymentMethod?.method.type === 'STABLECOIN_USDC'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200'
                }`}>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">USDC</h4>
                      <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Recommended</span>
                    </div>
                    <p className="text-sm text-gray-600">No platform fees, you pay gas</p>
                  </div>
                </div>
                <select
                  value={selectedPaymentMethod?.method.id || 'usdc-base'}
                  onChange={(e) => {
                    const networkId = e.target.value;
                    const networks = {
                      'usdc-base': {
                        id: 'usdc-base',
                        name: 'Base',
                        chainId: 8453,
                        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bA029339',
                        gasFees: 0.01,
                        description: 'Lowest gas fees'
                      },
                      'usdc-ethereum': {
                        id: 'usdc-ethereum',
                        name: 'Ethereum',
                        chainId: 1,
                        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                        gasFees: 2.00,
                        description: 'Mainnet'
                      },
                      'usdc-polygon': {
                        id: 'usdc-polygon',
                        name: 'Polygon',
                        chainId: 137,
                        address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
                        gasFees: 0.05,
                        description: 'Low fees'
                      },
                      'usdc-arbitrum': {
                        id: 'usdc-arbitrum',
                        name: 'Arbitrum',
                        chainId: 42161,
                        address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                        gasFees: 0.02,
                        description: 'Layer 2'
                      },
                      'usdc-optimism': {
                        id: 'usdc-optimism',
                        name: 'Optimism',
                        chainId: 10,
                        address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
                        gasFees: 0.02,
                        description: 'Layer 2'
                      }
                    };
                    const network = networks[networkId as keyof typeof networks];
                    if (network) {
                      setSelectedPaymentMethod({
                        method: {
                          id: network.id,
                          type: 'STABLECOIN_USDC',
                          name: `USDC on ${network.name}`,
                          description: `USD Coin on ${network.name} network`,
                          chainId: network.chainId,
                          enabled: true,
                          supportedNetworks: [network.chainId],
                          token: {
                            address: network.address,
                            symbol: 'USDC',
                            decimals: 6,
                            name: 'USD Coin',
                            chainId: network.chainId
                          }
                        },
                        availabilityStatus: 'available',
                        costEstimate: {
                          totalCost: (selectedPackageData?.price || 0) + network.gasFees,
                          fees: network.gasFees,
                          gasFees: network.gasFees,
                          processingFees: 0,
                          exchangeRateFees: 0
                        },
                        confidence: 0.95,
                        recommendationReason: network.description
                      } as any);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="usdc-base">Base (~$0.01 gas) - Recommended</option>
                  <option value="usdc-polygon">Polygon (~$0.05 gas)</option>
                  <option value="usdc-arbitrum">Arbitrum (~$0.02 gas)</option>
                  <option value="usdc-optimism">Optimism (~$0.02 gas)</option>
                  <option value="usdc-ethereum">Ethereum (~$2.00 gas)</option>
                </select>
              </div>

              {/* Credit/Debit Card */}
              <button
                onClick={() => {
                  setSelectedPaymentMethod({
                    method: {
                      id: 'stripe-fiat',
                      type: 'FIAT_STRIPE',
                      name: 'Credit/Debit Card',
                      description: 'Pay with credit or debit card',
                      chainId: 0,
                      enabled: true,
                      supportedNetworks: []
                    },
                    availabilityStatus: 'available',
                    costEstimate: {
                      totalCost: selectedPackageData?.price || 0,
                      fees: 0,
                      gasFees: 0,
                      processingFees: (selectedPackageData?.price || 0) * 0.029, // 2.9% Stripe fee
                      exchangeRateFees: 0
                    },
                    confidence: 0.95,
                    recommendationReason: 'Fast and secure payment with no crypto wallet needed'
                  } as any);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${selectedPaymentMethod?.method.type === 'FIAT_STRIPE'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">Credit/Debit Card</h4>
                    <p className="text-sm text-gray-600">Fast and secure</p>
                    <p className="text-xs text-green-600 mt-1">No wallet required</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Payment Method Info */}
            {selectedPaymentMethod && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${selectedPaymentMethod.method.type === 'FIAT_STRIPE'
                    ? 'bg-blue-100'
                    : selectedPaymentMethod.method.id === 'usdc-base'
                      ? 'bg-green-100'
                      : 'bg-orange-100'
                    }`}>
                    {selectedPaymentMethod.method.type === 'FIAT_STRIPE' ? (
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{selectedPaymentMethod.method.name}</h4>
                    <p className="text-sm text-gray-600">{selectedPaymentMethod.method.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedPaymentMethod.recommendationReason}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      ${(selectedPaymentMethod.costEstimate?.totalCost || selectedPackageData?.price || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {selectedPaymentMethod.costEstimate?.gasFees > 0 &&
                        `+ $${selectedPaymentMethod.costEstimate.gasFees.toFixed(2)} gas (you pay)`
                      }
                      {selectedPaymentMethod.costEstimate?.processingFees > 0 &&
                        `+ $${selectedPaymentMethod.costEstimate.processingFees.toFixed(2)} processing fee`
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              By continuing you agree to our <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>.
            </p>
            <div className="text-right">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-xl font-bold text-gray-900">
                ${(selectedPaymentMethod?.costEstimate?.totalCost || selectedPackageData?.price || 0).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePurchase}
              disabled={!selectedPaymentMethod || isProcessing}
              className="flex-1 bg-blue-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                `Buy Gold and Give Award`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  try {
    return createPortal(
      <ErrorBoundary>
        {modalContent}
      </ErrorBoundary>,
      document.body
    );
  } catch (error) {
    console.error('Error creating portal for GoldPurchaseModal:', error);
    // Fallback to non-portal rendering with error boundary
    return (
      <ErrorBoundary>
        {modalContent}
      </ErrorBoundary>
    );
  }
};

export default GoldPurchaseModal;