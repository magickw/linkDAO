/**
 * Complete Checkout Flow Component
 * Handles the entire checkout process with Web3 and traditional payment integration
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'crypto' | 'fiat' | null>(null);
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

  // Load payment recommendations on mount
  useEffect(() => {
    loadPaymentRecommendations();
  }, [cartState.items]);

  const loadPaymentRecommendations = async () => {
    if (cartState.items.length === 0) return;

    setLoading(true);
    try {
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
      setSelectedPaymentMethod(rec.recommendedPath);
    } catch (err) {
      console.error('Failed to load payment recommendations:', err);
      setError('Failed to load payment options. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelect = (method: 'crypto' | 'fiat') => {
    setSelectedPaymentMethod(method);
    setCurrentStep('payment-details');
  };

  const handleProcessPayment = async () => {
    if (!selectedPaymentMethod || !recommendation) return;

    setCurrentStep('processing');
    setLoading(true);
    setError(null);

    try {
      // Prepare checkout request
      const request: UnifiedCheckoutRequest = {
        orderId: `order_${Date.now()}`,
        listingId: cartState.items[0]?.id || '',
        buyerAddress: address || '',
        sellerAddress: cartState.items[0]?.seller.id || '',
        amount: parseFloat(cartState.totals.total.fiat),
        currency: 'USD',
        preferredMethod: selectedPaymentMethod
      };

      // Process checkout
      const result = await checkoutService.processCheckout(request);
      
      setOrderData(result);
      setCurrentStep('confirmation');

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
    if (!recommendation) return null;

    const methods: PaymentMethod[] = [
      {
        type: 'crypto',
        name: 'Cryptocurrency',
        description: 'Pay with USDC, ETH, or other supported tokens',
        fees: recommendation.cryptoOption.fees,
        estimatedTime: recommendation.cryptoOption.estimatedTime,
        benefits: recommendation.cryptoOption.benefits,
        requirements: recommendation.cryptoOption.requirements,
        available: recommendation.cryptoOption.available
      },
      {
        type: 'fiat',
        name: 'Credit/Debit Card',
        description: 'Pay with traditional payment methods',
        fees: recommendation.fiatOption.fees,
        estimatedTime: recommendation.fiatOption.estimatedTime,
        benefits: recommendation.fiatOption.benefits,
        requirements: recommendation.fiatOption.requirements,
        available: recommendation.fiatOption.available
      }
    ];

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Choose Payment Method</h2>
          <p className="text-white/70">
            We recommend <span className="font-medium text-blue-400">
              {recommendation.recommendedPath === 'crypto' ? 'Cryptocurrency' : 'Credit Card'}
            </span> for this purchase
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {methods.map((method) => (
            <GlassPanel
              key={method.type}
              variant={selectedPaymentMethod === method.type ? "primary" : "secondary"}
              className={`p-6 cursor-pointer transition-all duration-200 ${
                !method.available ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              } ${
                recommendation.recommendedPath === method.type ? 'ring-2 ring-blue-400' : ''
              }`}
              onClick={() => method.available && handlePaymentMethodSelect(method.type)}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  method.type === 'crypto' ? 'bg-orange-500/20' : 'bg-blue-500/20'
                }`}>
                  {method.type === 'crypto' ? (
                    <Wallet className="w-6 h-6 text-orange-400" />
                  ) : (
                    <CreditCard className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-white">{method.name}</h3>
                    {recommendation.recommendedPath === method.type && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  
                  <p className="text-white/70 text-sm mb-3">{method.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Fees:</span>
                      <span className="text-white">${method.fees.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Time:</span>
                      <span className="text-white">{method.estimatedTime}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-white/80 text-sm font-medium mb-2">Benefits:</h4>
                    <ul className="space-y-1">
                      {method.benefits.slice(0, 2).map((benefit, index) => (
                        <li key={index} className="text-white/60 text-xs flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-400" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>

        {/* Security Notice */}
        <GlassPanel variant="secondary" className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400" />
            <div>
              <h4 className="font-medium text-white">Secure Escrow Protection</h4>
              <p className="text-white/70 text-sm">
                Your payment is held securely until you confirm delivery. 
                {selectedPaymentMethod === 'crypto' ? ' Smart contract escrow ensures trustless transactions.' : ' Stripe Connect provides buyer protection.'}
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  };

  const renderPaymentDetails = () => {
    if (!selectedPaymentMethod) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Payment Details</h2>
          <p className="text-white/70">
            Complete your {selectedPaymentMethod === 'crypto' ? 'cryptocurrency' : 'card'} payment
          </p>
        </div>

        {selectedPaymentMethod === 'crypto' ? (
          <CryptoPaymentDetails onProceed={handleProcessPayment} />
        ) : (
          <FiatPaymentDetails onProceed={handleProcessPayment} />
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
          {selectedPaymentMethod === 'crypto' 
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
          Your order has been placed successfully and is now being processed.
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
              <span className="text-white capitalize">{orderData.paymentPath}</span>
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

  if (loading && !recommendation) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
        <p className="text-white/70">Loading payment options...</p>
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
const CryptoPaymentDetails: React.FC<{ onProceed: () => void }> = ({ onProceed }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

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
            <span className="text-white">USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Network:</span>
            <span className="text-white">Ethereum</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Gas Fee:</span>
            <span className="text-white">~$0.50</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Escrow Type:</span>
            <span className="text-white">Smart Contract</span>
          </div>
        </div>
      </GlassPanel>

      <Button
        variant="primary"
        onClick={onProceed}
        disabled={!isConnected}
        className="w-full"
      >
        {isConnected ? 'Proceed with Crypto Payment' : 'Connect Wallet First'}
      </Button>
    </div>
  );
};

// Fiat Payment Details Component
const FiatPaymentDetails: React.FC<{ onProceed: () => void }> = ({ onProceed }) => {
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

      <Button variant="primary" onClick={onProceed} className="w-full">
        Complete Payment
      </Button>
    </div>
  );
};

export default CheckoutFlow;