/**
 * Complete Checkout Flow Component
 * Handles the entire checkout process with Web3 and traditional payment integration
 * Enhanced with intelligent payment method prioritization
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { 
  ArrowLeft, 
  CreditCard, 
  Wallet, 
  Shield, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAccount, useConnect } from 'wagmi';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { UnifiedCheckoutService, CheckoutRecommendation, UnifiedCheckoutRequest } from '@/services/unifiedCheckoutService';
import { CryptoPaymentService } from '@/services/cryptoPaymentService';
import { StripePaymentService } from '@/services/stripePaymentService';
import PaymentMethodPrioritizationService from '@/services/paymentMethodPrioritizationService';
import CostEffectivenessCalculator from '@/services/costEffectivenessCalculator';
import NetworkAvailabilityChecker from '@/services/networkAvailabilityChecker';
import UserPreferenceManager from '@/services/userPreferenceManager';
import PaymentMethodSelector from '@/components/PaymentMethodPrioritization/PaymentMethodSelector';
import {
  PaymentMethod as PrioritizedPaymentMethodType,
  PaymentMethodType,
  PrioritizedPaymentMethod,
  PrioritizationContext,
  PrioritizationResult,
  UserContext,
  MarketConditions
} from '@/types/paymentPrioritization';
import { toast } from 'react-hot-toast';

interface CheckoutFlowProps {
  onBack: () => void;
  onComplete: (orderId: string) => void;
}

type CheckoutStep = 'review' | 'payment-method' | 'payment-details' | 'processing' | 'confirmation';

interface PaymentMethod {
  type: 'crypto' | 'fiat';
  name: string;
  description: string;
  fees: number;
  estimatedTime: string;
  benefits: string[];
  requirements: string[];
  available: boolean;
}

export const CheckoutFlow: React.FC<CheckoutFlowProps> = ({ onBack, onComplete }) => {
  const router = useRouter();
  const { state: cartState, actions } = useCart();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  // State management
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PrioritizedPaymentMethod | null>(null);
  const [prioritizationResult, setPrioritizationResult] = useState<PrioritizationResult | null>(null);
  const [recommendation, setRecommendation] = useState<CheckoutRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);

  // Services
  const [checkoutService] = useState(() => {
    const cryptoService = new CryptoPaymentService();
    const stripeService = new StripePaymentService();
    return new UnifiedCheckoutService(cryptoService, stripeService);
  });

  const [prioritizationService] = useState(() => {
    const costCalculator = new CostEffectivenessCalculator();
    const networkChecker = new NetworkAvailabilityChecker();
    const preferenceManager = new UserPreferenceManager();
    return new PaymentMethodPrioritizationService(
      costCalculator,
      networkChecker,
      preferenceManager
    );
  });

  // Load payment prioritization on mount
  useEffect(() => {
    loadPaymentPrioritization();
  }, [cartState.items, address]);

  const loadPaymentPrioritization = async () => {
    if (cartState.items.length === 0) return;

    setLoading(true);
    try {
      // Create prioritization context
      const context: PrioritizationContext = {
        transactionAmount: parseFloat(cartState.totals.total.fiat),
        transactionCurrency: 'USD',
        userContext: {
          userAddress: address || undefined,
          chainId: 1, // Ethereum mainnet - should be dynamic
          walletBalances: [], // Should be fetched from wallet
          preferences: {
            preferredMethods: [],
            avoidedMethods: [],
            maxGasFeeThreshold: 50,
            preferStablecoins: true,
            preferFiat: false,
            lastUsedMethods: [],
            autoSelectBestOption: true
          }
        },
        availablePaymentMethods: await getAvailablePaymentMethods(),
        marketConditions: await getCurrentMarketConditions()
      };

      // Get prioritized payment methods
      const result = await prioritizationService.prioritizePaymentMethods(context);
      setPrioritizationResult(result);

      // Auto-select default method
      if (result.defaultMethod) {
        setSelectedPaymentMethod(result.defaultMethod);
      }

      // Also get legacy recommendation for backward compatibility
      const request: UnifiedCheckoutRequest = {
        orderId: `order_${Date.now()}`,
        listingId: cartState.items[0]?.id || '',
        buyerAddress: address || '',
        sellerAddress: cartState.items[0]?.seller.id || '',
        amount: parseFloat(cartState.totals.total.fiat),
        currency: 'USD',
        preferredMethod: 'auto'
      };

      const rec = await checkoutService.getCheckoutRecommendation(request);
      setRecommendation(rec);
    } catch (err) {
      console.error('Failed to load payment prioritization:', err);
      setError('Failed to load payment options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAvailablePaymentMethods = async (): Promise<PrioritizedPaymentMethodType[]> => {
    // Mock implementation - should be replaced with actual service calls
    return [
      {
        id: 'usdc-eth',
        type: PaymentMethodType.STABLECOIN_USDC,
        name: 'USDC',
        description: 'USD Coin on Ethereum',
        chainId: 1,
        enabled: true,
        supportedNetworks: [1],
        token: {
          address: '0xA0b86a33E6441E6C7C5c8b0b8c8b0b8c8b0b8c8b',
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
          chainId: 1
        }
      },
      {
        id: 'stripe-fiat',
        type: PaymentMethodType.FIAT_STRIPE,
        name: 'Credit/Debit Card',
        description: 'Traditional payment via Stripe',
        chainId: 0, // Not applicable for fiat
        enabled: true,
        supportedNetworks: []
      },
      {
        id: 'eth-mainnet',
        type: PaymentMethodType.NATIVE_ETH,
        name: 'Ethereum',
        description: 'Native ETH on Ethereum',
        chainId: 1,
        enabled: true,
        supportedNetworks: [1],
        token: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          decimals: 18,
          name: 'Ethereum',
          chainId: 1,
          isNative: true
        }
      }
    ];
  };

  const getCurrentMarketConditions = async (): Promise<MarketConditions> => {
    // Mock implementation - should be replaced with actual market data
    return {
      gasConditions: [
        {
          chainId: 1,
          gasPrice: BigInt(30000000000), // 30 gwei in wei
          gasPriceUSD: 0.50,
          networkCongestion: 'medium',
          blockTime: 12,
          lastUpdated: new Date()
        }
      ],
      networkAvailability: [
        {
          chainId: 1,
          available: true
        }
      ],
      exchangeRates: [
        { 
          fromToken: 'ETH', 
          toToken: 'USD', 
          rate: 2000, 
          source: 'coingecko',
          confidence: 0.95,
          lastUpdated: new Date() 
        },
        { 
          fromToken: 'USDC', 
          toToken: 'USD', 
          rate: 1, 
          source: 'coingecko',
          confidence: 0.99,
          lastUpdated: new Date() 
        }
      ],
      lastUpdated: new Date()
    };
  };

  const handlePaymentMethodSelect = async (method: PrioritizedPaymentMethod) => {
    setSelectedPaymentMethod(method);
    setCurrentStep('payment-details');
    
    // Track user preference for future prioritization
    // TODO: Implement user preference tracking when service exposes the interface
    console.log('Payment method selected:', method.method.name);
  };

  const handleProcessPayment = async () => {
    if (!selectedPaymentMethod || !recommendation) return;

    setCurrentStep('processing');
    setLoading(true);
    setError(null);

    try {
      // Prepare checkout request using selected prioritized method
      const request: UnifiedCheckoutRequest = {
        orderId: `order_${Date.now()}`,
        listingId: cartState.items[0]?.id || '',
        buyerAddress: address || '',
        sellerAddress: cartState.items[0]?.seller.id || '',
        amount: parseFloat(cartState.totals.total.fiat),
        currency: 'USD',
        preferredMethod: selectedPaymentMethod.method.type === PaymentMethodType.FIAT_STRIPE ? 'fiat' : 'crypto'
      };

      // Process checkout
      const result = await checkoutService.processCheckout(request);
      
      setOrderData(result);
      setCurrentStep('confirmation');

      // Update user preference with successful payment
      // TODO: Implement preference tracking when service exposes the interface
      console.log('Payment successful with:', selectedPaymentMethod.method.name);

      // Clear cart on successful checkout
      actions.clearCart();

      toast.success('Order placed successfully!');
      
      // Redirect to order tracking after delay
      setTimeout(() => {
        onComplete(result.orderId);
      }, 3000);

    } catch (err: any) {
      console.error('Checkout failed:', err);
      setError(err.message || 'Checkout failed. Please try again.');
      setCurrentStep('payment-details');
      
      // Update user preference with failed payment
      // TODO: Implement preference tracking when service exposes the interface
      console.log('Payment failed with:', selectedPaymentMethod?.method.name);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'review', label: 'Review', completed: ['payment-method', 'payment-details', 'processing', 'confirmation'].includes(currentStep) },
      { key: 'payment-method', label: 'Payment', completed: ['payment-details', 'processing', 'confirmation'].includes(currentStep) },
      { key: 'payment-details', label: 'Details', completed: ['processing', 'confirmation'].includes(currentStep) },
      { key: 'processing', label: 'Processing', completed: currentStep === 'confirmation' },
      { key: 'confirmation', label: 'Complete', completed: false }
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              step.completed || currentStep === step.key
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-white/30 text-white/60'
            }`}>
              {step.completed ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 ${
                step.completed ? 'bg-blue-500' : 'bg-white/30'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderOrderSummary = () => (
    <GlassPanel variant="secondary" className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
      <div className="space-y-4">
        {cartState.items.map((item) => (
          <div key={item.id} className="flex items-center gap-4">
            <img
              src={item.image}
              alt={item.title}
              className="w-16 h-16 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h4 className="font-medium text-white">{item.title}</h4>
              <p className="text-white/70 text-sm">Qty: {item.quantity}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-white">${item.price.fiat}</p>
            </div>
          </div>
        ))}
        
        <hr className="border-white/20" />
        
        <div className="space-y-2">
          <div className="flex justify-between text-white/70">
            <span>Subtotal</span>
            <span>${cartState.totals.subtotal.fiat}</span>
          </div>
          {parseFloat(cartState.totals.shipping.fiat) > 0 && (
            <div className="flex justify-between text-white/70">
              <span>Shipping</span>
              <span>${cartState.totals.shipping.fiat}</span>
            </div>
          )}
          <div className="flex justify-between text-white/70">
            <span>Platform Fee</span>
            <span>${(parseFloat(cartState.totals.total.fiat) * 0.025).toFixed(2)}</span>
          </div>
          <hr className="border-white/20" />
          <div className="flex justify-between text-white font-semibold text-lg">
            <span>Total</span>
            <span>${cartState.totals.total.fiat}</span>
          </div>
        </div>
      </div>
    </GlassPanel>
  );

  const renderPaymentMethodSelection = () => {
    if (!prioritizationResult) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Choose Payment Method</h2>
          <p className="text-white/70">
            {prioritizationResult.defaultMethod ? (
              <>
                We recommend <span className="font-medium text-blue-400">
                  {prioritizationResult.defaultMethod.method.name}
                </span> for this purchase
              </>
            ) : (
              'Select your preferred payment method'
            )}
          </p>
        </div>

        {/* Enhanced Payment Method Selector */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
          {prioritizationResult && prioritizationResult.prioritizedMethods.length > 0 ? (
            <PaymentMethodSelector
              prioritizationResult={prioritizationResult}
              selectedMethodId={selectedPaymentMethod?.method.id}
              onMethodSelect={handlePaymentMethodSelect}
              showCostBreakdown={true}
              showRecommendations={true}
              showWarnings={true}
              layout="grid"
              responsive={true}
              className="text-white"
            />
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Payment Options Unavailable
              </h3>
              <p className="text-white/70 mb-4">
                We're having trouble loading payment options. Please try refreshing the page.
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="mx-auto"
              >
                Refresh Page
              </Button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <GlassPanel variant="secondary" className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400" />
            <div>
              <h4 className="font-medium text-white">Secure Escrow Protection</h4>
              <p className="text-white/70 text-sm">
                Your payment is held securely until you confirm delivery. 
                {selectedPaymentMethod?.method.type === PaymentMethodType.FIAT_STRIPE 
                  ? ' Stripe Connect provides buyer protection.' 
                  : ' Smart contract escrow ensures trustless transactions.'
                }
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  };

  const renderPaymentDetails = () => {
    if (!selectedPaymentMethod) return null;

    const isCrypto = selectedPaymentMethod.method.type !== PaymentMethodType.FIAT_STRIPE;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Payment Details</h2>
          <p className="text-white/70">
            Complete your {selectedPaymentMethod.method.name} payment
          </p>
        </div>

        {/* Selected Method Summary */}
        <GlassPanel variant="secondary" className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${
              isCrypto ? 'bg-orange-500/20' : 'bg-blue-500/20'
            }`}>
              {isCrypto ? (
                <Wallet className="w-5 h-5 text-orange-400" />
              ) : (
                <CreditCard className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white">{selectedPaymentMethod.method.name}</h3>
              <p className="text-white/70 text-sm">{selectedPaymentMethod.method.description}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">Estimated Cost:</span>
              <span className="text-white ml-2">${selectedPaymentMethod.costEstimate.totalCost.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-white/60">Confirmation Time:</span>
              <span className="text-white ml-2">~{selectedPaymentMethod.costEstimate.estimatedTime} min</span>
            </div>
          </div>

          {selectedPaymentMethod.warnings && selectedPaymentMethod.warnings.length > 0 && (
            <div className="mt-3 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span className="text-orange-400 text-sm font-medium">Warnings</span>
              </div>
              <ul className="text-orange-300 text-xs space-y-1">
                {selectedPaymentMethod.warnings?.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
        </GlassPanel>

        {isCrypto ? (
          <CryptoPaymentDetails 
            paymentMethod={selectedPaymentMethod}
            onProceed={handleProcessPayment} 
          />
        ) : (
          <FiatPaymentDetails 
            paymentMethod={selectedPaymentMethod}
            onProceed={handleProcessPayment} 
          />
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>
    );
  };

  const renderProcessing = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <Loader2 className="w-16 h-16 text-blue-400 animate-spin" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Processing Payment</h2>
        <p className="text-white/70">
          {selectedPaymentMethod?.method.type !== PaymentMethodType.FIAT_STRIPE
            ? 'Waiting for blockchain confirmation...' 
            : 'Processing your payment securely...'
          }
        </p>
      </div>
      <div className="max-w-md mx-auto">
        <div className="bg-white/10 rounded-full h-2">
          <div className="bg-blue-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <CheckCircle className="w-16 h-16 text-green-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Order Confirmed!</h2>
        <p className="text-white/70">
          Your order has been placed successfully using {selectedPaymentMethod?.method.name} and is now being processed.
        </p>
      </div>
      
      {orderData && (
        <GlassPanel variant="secondary" className="p-6 text-left">
          <h3 className="font-semibold text-white mb-4">Order Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Order ID:</span>
              <span className="text-white font-mono">{orderData.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Payment Method:</span>
              <span className="text-white">{selectedPaymentMethod?.method.name || orderData.paymentPath}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Total Paid:</span>
              <span className="text-white">${selectedPaymentMethod?.costEstimate.totalCost.toFixed(2) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Status:</span>
              <span className="text-green-400 capitalize">{orderData.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Estimated Completion:</span>
              <span className="text-white">
                {orderData.estimatedCompletionTime.toLocaleDateString()}
              </span>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Payment Method Confirmation */}
      {selectedPaymentMethod && (
        <GlassPanel variant="secondary" className="p-4 text-left">
          <h4 className="font-semibold text-white mb-3">Payment Confirmation</h4>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${
              selectedPaymentMethod.method.type !== PaymentMethodType.FIAT_STRIPE 
                ? 'bg-orange-500/20' : 'bg-blue-500/20'
            }`}>
              {selectedPaymentMethod.method.type !== PaymentMethodType.FIAT_STRIPE ? (
                <Wallet className="w-4 h-4 text-orange-400" />
              ) : (
                <CreditCard className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{selectedPaymentMethod.method.name}</p>
              <p className="text-white/70 text-sm">{selectedPaymentMethod.recommendationReason}</p>
            </div>
          </div>
          
          {selectedPaymentMethod.method.type !== PaymentMethodType.FIAT_STRIPE && (
            <div className="text-xs text-white/60">
              <p>• Transaction will be confirmed on {selectedPaymentMethod.method.chainId === 1 ? 'Ethereum' : `Chain ${selectedPaymentMethod.method.chainId}`}</p>
              <p>• Funds are held in secure escrow until delivery confirmation</p>
            </div>
          )}
        </GlassPanel>
      )}

      <div className="flex gap-4 justify-center">
        <Button variant="outline" onClick={() => router.push('/marketplace')}>
          Continue Shopping
        </Button>
        <Button variant="primary" onClick={() => router.push('/orders')}>
          Track Order
        </Button>
      </div>
    </div>
  );

  if (loading && !prioritizationResult) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
        <p className="text-white/70">Loading intelligent payment options...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2 text-white/70 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">Secure Checkout</h1>
          <p className="text-white/70">Complete your purchase with escrow protection</p>
        </div>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <GlassPanel variant="secondary" className="p-8">
            {currentStep === 'review' && renderPaymentMethodSelection()}
            {currentStep === 'payment-method' && renderPaymentMethodSelection()}
            {currentStep === 'payment-details' && renderPaymentDetails()}
            {currentStep === 'processing' && renderProcessing()}
            {currentStep === 'confirmation' && renderConfirmation()}
          </GlassPanel>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          {renderOrderSummary()}
        </div>
      </div>
    </div>
  );
};

// Crypto Payment Details Component
const CryptoPaymentDetails: React.FC<{ 
  paymentMethod: PrioritizedPaymentMethod;
  onProceed: () => void;
}> = ({ paymentMethod, onProceed }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1: return 'Ethereum';
      case 137: return 'Polygon';
      case 56: return 'BSC';
      case 42161: return 'Arbitrum';
      case 10: return 'Optimism';
      default: return `Chain ${chainId}`;
    }
  };

  return (
    <div className="space-y-6">
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="font-semibold text-white mb-4">Wallet Connection</h3>
        
        {isConnected ? (
          <div className="flex items-center gap-3 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">Wallet Connected</p>
              <p className="text-white/70 text-sm font-mono">{address}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-white/70">Connect your wallet to proceed with crypto payment</p>
            <div className="grid grid-cols-1 gap-3">
              {connectors.map((connector) => (
                <Button
                  key={connector.id}
                  variant="outline"
                  onClick={() => connect({ connector })}
                  className="flex items-center gap-3"
                >
                  <Wallet className="w-4 h-4" />
                  Connect {connector.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>

      <GlassPanel variant="secondary" className="p-6">
        <h3 className="font-semibold text-white mb-4">Payment Summary</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Payment Token:</span>
            <span className="text-white">{paymentMethod.method.token?.symbol || 'ETH'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Network:</span>
            <span className="text-white">{getNetworkName(paymentMethod.method.chainId || 1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Gas Fee:</span>
            <span className="text-white">~${paymentMethod.costEstimate.gasFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Total Cost:</span>
            <span className="text-white font-semibold">${paymentMethod.costEstimate.totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Escrow Type:</span>
            <span className="text-white">Smart Contract</span>
          </div>
        </div>
      </GlassPanel>

      {/* Benefits Display */}
      {paymentMethod.benefits && paymentMethod.benefits.length > 0 && (
        <GlassPanel variant="secondary" className="p-4">
          <h4 className="text-white font-medium mb-3">Benefits of {paymentMethod.method.name}</h4>
          <ul className="space-y-2">
            {paymentMethod.benefits.map((benefit, index) => (
              <li key={index} className="text-white/70 text-sm flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                {benefit}
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      <Button
        variant="primary"
        onClick={onProceed}
        disabled={!isConnected}
        className="w-full"
      >
        {isConnected ? `Pay with ${paymentMethod.method.name}` : 'Connect Wallet First'}
      </Button>
    </div>
  );
};

// Fiat Payment Details Component
const FiatPaymentDetails: React.FC<{ 
  paymentMethod: PrioritizedPaymentMethod;
  onProceed: () => void;
}> = ({ paymentMethod, onProceed }) => {
  return (
    <div className="space-y-6">
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="font-semibold text-white mb-4">Payment Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">Card Number</label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">Expiry</label>
              <input
                type="text"
                placeholder="MM/YY"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">CVC</label>
              <input
                type="text"
                placeholder="123"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              />
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel variant="secondary" className="p-6">
        <h3 className="font-semibold text-white mb-4">Billing Address</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">Full Name</label>
            <input
              type="text"
              placeholder="John Doe"
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-2">Address</label>
            <input
              type="text"
              placeholder="123 Main St"
              className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">City</label>
              <input
                type="text"
                placeholder="New York"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">ZIP Code</label>
              <input
                type="text"
                placeholder="10001"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
              />
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Payment Method Benefits */}
      {paymentMethod.benefits && paymentMethod.benefits.length > 0 && (
        <GlassPanel variant="secondary" className="p-4">
          <h4 className="text-white font-medium mb-3">Benefits of Card Payment</h4>
          <ul className="space-y-2">
            {paymentMethod.benefits.map((benefit, index) => (
              <li key={index} className="text-white/70 text-sm flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                {benefit}
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      {/* Cost Summary */}
      <GlassPanel variant="secondary" className="p-4">
        <h4 className="text-white font-medium mb-3">Payment Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Processing Fee:</span>
            <span className="text-white">${(paymentMethod.costEstimate.totalCost - paymentMethod.costEstimate.baseCost).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Total Cost:</span>
            <span className="text-white font-semibold">${paymentMethod.costEstimate.totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Processing Time:</span>
            <span className="text-white">~{paymentMethod.costEstimate.estimatedTime} min</span>
          </div>
        </div>
      </GlassPanel>

      <Button variant="primary" onClick={onProceed} className="w-full">
        Complete Payment with {paymentMethod.method.name}
      </Button>
    </div>
  );
};

export default CheckoutFlow;