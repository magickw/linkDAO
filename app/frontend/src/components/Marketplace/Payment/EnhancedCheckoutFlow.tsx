/**
 * EnhancedCheckoutFlow - Comprehensive Web3 checkout with escrow integration
 * Features: Multi-step flow, wallet connection, escrow setup, shipping management
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Shield, CreditCard, Truck, CheckCircle, AlertTriangle,
  ArrowLeft, ArrowRight, User, MapPin, Wallet, Clock, Info, Lock, Vote, BookOpen
} from 'lucide-react';
import { useAccount, useConnect, useBalance } from 'wagmi';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';
import { useProfile } from '../../../hooks/useProfile';
import { countries } from '../../../utils/countries';

interface CartItem {
  id: string;
  title: string;
  price: { crypto: string; cryptoSymbol: string; fiat: string; fiatSymbol: string; };
  seller: { id: string; name: string; avatar: string; verified: boolean; daoApproved: boolean; };
  image: string;
  quantity: number;
  isDigital: boolean;
  escrowProtected: boolean;
  shippingCost?: string;
  estimatedDelivery?: string;
}

interface ShippingAddress {
  firstName: string; lastName: string; email: string; address1: string;
  address2?: string; city: string; state: string; zipCode: string; country: string; phone?: string;
}

interface EnhancedCheckoutFlowProps {
  cartItems: CartItem[];
  onComplete: (orderData: any) => void;
  onCancel: () => void;
}

export const EnhancedCheckoutFlow: React.FC<EnhancedCheckoutFlowProps> = ({
  cartItems, onComplete, onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '', lastName: '', email: '', address1: '', address2: '',
    city: '', state: '', zipCode: '', country: 'US', phone: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [escrowSetup, setEscrowSetup] = useState(false);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: balance } = useBalance({ address });
  const { data: userProfile } = useProfile(address);

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => 
    sum + (parseFloat(item.price.crypto) * item.quantity), 0
  );
  const shippingCost = cartItems
    .filter(item => !item.isDigital)
    .reduce((sum, item) => sum + parseFloat(item.shippingCost || '0'), 0);
  const escrowFee = subtotal * 0.01; // 1% escrow fee
  const total = subtotal + shippingCost + escrowFee;

  const hasPhysicalItems = cartItems.some(item => !item.isDigital);

  const steps = [
    { key: 'cart', title: 'Review Cart', show: true },
    { key: 'shipping', title: 'Shipping Info', show: hasPhysicalItems },
    { key: 'payment', title: 'Payment & Escrow', show: true },
    { key: 'review', title: 'Review Order', show: true }
  ].filter(step => step.show);

  const validateCurrentStep = (): boolean => {
    const currentStepKey = steps[currentStep]?.key;
    const newErrors: Record<string, string> = {};

    switch (currentStepKey) {
      case 'shipping':
        if (!shippingAddress.firstName) newErrors.firstName = 'Required';
        if (!shippingAddress.lastName) newErrors.lastName = 'Required';
        if (!shippingAddress.email) newErrors.email = 'Required';
        if (!shippingAddress.address1) newErrors.address1 = 'Required';
        if (!shippingAddress.city) newErrors.city = 'Required';
        if (!shippingAddress.state) newErrors.state = 'Required';
        if (!shippingAddress.zipCode) newErrors.zipCode = 'Required';
        if (!shippingAddress.country) newErrors.country = 'Required';
        break;
      case 'payment':
        if (!isConnected) newErrors.wallet = 'Please connect your wallet';
        if (!escrowSetup) newErrors.escrow = 'Please setup escrow protection';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const setupEscrow = async () => {
    setIsProcessing(true);
    try {
      // Import the enhanced marketplace service
      const { enhancedMarketplaceService } = await import('../../../services/enhancedMarketplaceService');
      
      // Validate payment method first
      const validationResult = await enhancedMarketplaceService.validatePaymentMethod({
        paymentMethod: 'escrow',
        amount: total,
        currency: 'ETH',
        userAddress: address || '',
        paymentDetails: {
          escrowEnabled: true,
          items: cartItems
        }
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }

      if (!validationResult.hasSufficientBalance) {
        // Show alternative payment methods
        if (validationResult.suggestedAlternatives && validationResult.suggestedAlternatives.length > 0) {
          const alternatives = validationResult.suggestedAlternatives
            .map(alt => `${alt.method} (${alt.description})`)
            .join(', ');
          throw new Error(`Insufficient balance for escrow. Try: ${alternatives}`);
        } else {
          throw new Error('Insufficient balance for escrow payment');
        }
      }

      // Setup escrow if validation passes
      await new Promise(resolve => setTimeout(resolve, 2000));
      setEscrowSetup(true);
    } catch (error) {
      console.error('Escrow setup error:', error);
      setErrors({ escrow: error instanceof Error ? error.message : 'Failed to setup escrow' });
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      // Import the enhanced marketplace service
      const { enhancedMarketplaceService } = await import('../../../services/enhancedMarketplaceService');
      
      const checkoutData = {
        items: cartItems,
        shippingAddress: hasPhysicalItems ? shippingAddress : null,
        paymentMethod: 'escrow',
        totals: { subtotal, shippingCost, escrowFee, total },
        userAddress: address,
        escrowEnabled: escrowSetup
      };

      const result = await enhancedMarketplaceService.processEnhancedCheckout(checkoutData);
      
      const orderData = {
        id: result.orderId || `ORDER_${Date.now()}`,
        items: cartItems,
        shippingAddress: hasPhysicalItems ? shippingAddress : null,
        totals: { subtotal, shippingCost, escrowFee, total },
        timestamp: new Date(),
        paymentResult: result
      };
      
      onComplete(orderData);
    } catch (error) {
      console.error('Payment processing error:', error);
      setErrors({ payment: error instanceof Error ? error.message : 'Payment failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Step Components
  const CartReviewStep = () => (
    <div className="space-y-4">
      {cartItems.map((item) => (
        <div key={item.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
          <img src={item.image} alt={item.title} className="w-16 h-16 object-cover rounded" />
          <div className="flex-1">
            <h3 className="font-medium text-white">{item.title}</h3>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <img src={item.seller.avatar} alt={item.seller.name} className="w-4 h-4 rounded-full" />
              <span>{item.seller.name}</span>
              {item.seller.verified && <CheckCircle size={12} className="text-green-400" />}
              {item.seller.daoApproved && (
                <span className="px-1 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">DAO</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-white font-medium">
                {item.price.crypto} {item.price.cryptoSymbol}
              </span>
              <span className="text-white/60">Qty: {item.quantity}</span>
              {item.escrowProtected && (
                <span className="flex items-center gap-1 text-blue-400 text-xs">
                  <Shield size={12} />
                  Escrow Protected
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const loadSavedAddress = (type: 'billing' | 'shipping') => {
    if (!userProfile) return;
    
    const savedAddress = type === 'billing' 
      ? {
          firstName: userProfile.billingFirstName || '',
          lastName: userProfile.billingLastName || '',
          email: userProfile.email || '',
          address1: userProfile.billingAddress1 || '',
          address2: userProfile.billingAddress2 || '',
          city: userProfile.billingCity || '',
          state: userProfile.billingState || '',
          zipCode: userProfile.billingZipCode || '',
          country: userProfile.billingCountry || 'US',
          phone: userProfile.billingPhone || ''
        }
      : {
          firstName: userProfile.shippingFirstName || '',
          lastName: userProfile.shippingLastName || '',
          email: userProfile.email || '',
          address1: userProfile.shippingAddress1 || '',
          address2: userProfile.shippingAddress2 || '',
          city: userProfile.shippingCity || '',
          state: userProfile.shippingState || '',
          zipCode: userProfile.shippingZipCode || '',
          country: userProfile.shippingCountry || 'US',
          phone: userProfile.shippingPhone || ''
        };
    
    setShippingAddress(savedAddress);
    setShowSavedAddresses(false);
  };

  const ShippingStep = () => (
    <div className="space-y-4">
      {/* Saved Addresses Section */}
      {userProfile && (userProfile.billingAddress1 || userProfile.shippingAddress1) && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="text-blue-400" size={16} />
              <h4 className="font-medium text-blue-400">Use Saved Address</h4>
            </div>
            <Button
              variant="outline"
              size="small"
              onClick={() => setShowSavedAddresses(!showSavedAddresses)}
              className="border-blue-400/30 text-blue-300 hover:bg-blue-500/20"
            >
              {showSavedAddresses ? 'Hide' : 'Show'} Saved
            </Button>
          </div>
          
          {showSavedAddresses && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {userProfile.billingAddress1 && (
                <div className="p-3 bg-white/5 rounded border border-white/10 hover:border-blue-400/30 cursor-pointer transition-colors"
                     onClick={() => loadSavedAddress('billing')}>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Billing Address</span>
                  </div>
                  <div className="text-xs text-white/70">
                    <p>{userProfile.billingFirstName} {userProfile.billingLastName}</p>
                    <p>{userProfile.billingAddress1}</p>
                    <p>{userProfile.billingCity}, {userProfile.billingState} {userProfile.billingZipCode}</p>
                  </div>
                </div>
              )}
              
              {userProfile.shippingAddress1 && (
                <div className="p-3 bg-white/5 rounded border border-white/10 hover:border-blue-400/30 cursor-pointer transition-colors"
                     onClick={() => loadSavedAddress('shipping')}>
                  <div className="flex items-center gap-2 mb-2">
                    <Truck size={14} className="text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Shipping Address</span>
                  </div>
                  <div className="text-xs text-white/70">
                    <p>{userProfile.shippingFirstName} {userProfile.shippingLastName}</p>
                    <p>{userProfile.shippingAddress1}</p>
                    <p>{userProfile.shippingCity}, {userProfile.shippingState} {userProfile.shippingZipCode}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">First Name *</label>
          <input
            type="text"
            value={shippingAddress.firstName}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, firstName: e.target.value }))}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter first name"
          />
          {errors.firstName && <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">Last Name *</label>
          <input
            type="text"
            value={shippingAddress.lastName}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, lastName: e.target.value }))}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter last name"
          />
          {errors.lastName && <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Email Address *</label>
        <input
          type="email"
          value={shippingAddress.email}
          onChange={(e) => setShippingAddress(prev => ({ ...prev, email: e.target.value }))}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter email address"
        />
        {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Street Address *</label>
        <input
          type="text"
          value={shippingAddress.address1}
          onChange={(e) => setShippingAddress(prev => ({ ...prev, address1: e.target.value }))}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          placeholder="Enter street address"
        />
        <input
          type="text"
          value={shippingAddress.address2}
          onChange={(e) => setShippingAddress(prev => ({ ...prev, address2: e.target.value }))}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Apartment, suite, etc. (optional)"
        />
        {errors.address1 && <p className="text-red-400 text-sm mt-1">{errors.address1}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">City *</label>
          <input
            type="text"
            value={shippingAddress.city}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter city"
          />
          {errors.city && <p className="text-red-400 text-sm mt-1">{errors.city}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">State/Province *</label>
          <input
            type="text"
            value={shippingAddress.state}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value }))}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter state"
          />
          {errors.state && <p className="text-red-400 text-sm mt-1">{errors.state}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">ZIP/Postal Code *</label>
          <input
            type="text"
            value={shippingAddress.zipCode}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, zipCode: e.target.value }))}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter ZIP code"
          />
          {errors.zipCode && <p className="text-red-400 text-sm mt-1">{errors.zipCode}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">Country *</label>
          <select
            value={shippingAddress.country}
            onChange={(e) => setShippingAddress(prev => ({ ...prev, country: e.target.value }))}
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Country</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.name}
              </option>
            ))}
          </select>
          {errors.country && <p className="text-red-400 text-sm mt-1">{errors.country}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Phone</label>
        <input
          type="tel"
          value={shippingAddress.phone}
          onChange={(e) => setShippingAddress(prev => ({ ...prev, phone: e.target.value }))}
          className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter phone number"
        />
      </div>
    </div>
  );

  const PaymentStep = () => (
    <div className="space-y-6">
      {/* Wallet Connection */}
      {!isConnected ? (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-yellow-400" size={20} />
            <h3 className="font-medium text-yellow-400">Connect Wallet</h3>
          </div>
          <div className="flex gap-3">
            {connectors.map((connector) => (
              <Button
                key={connector.id}
                variant="primary"
                onClick={() => connect({ connector })}
                className="flex items-center gap-2"
              >
                <Wallet size={16} />
                {connector.name}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-green-400" size={20} />
            <div>
              <h3 className="font-medium text-green-400">Wallet Connected</h3>
              <p className="text-white/70 text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)} • Balance: {balance?.formatted} {balance?.symbol}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Escrow Setup */}
      {isConnected && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="text-blue-400 mt-1" size={20} />
            <div className="flex-1">
              <h4 className="font-medium text-blue-400 mb-2">Escrow Protection</h4>
              <p className="text-white/70 text-sm mb-4">
                Secure smart contract holds funds until delivery confirmed.
              </p>
              
              {!escrowSetup ? (
                <Button
                  variant="primary"
                  onClick={setupEscrow}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Setup Escrow
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle size={16} />
                  <span>Escrow contract ready</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {Object.values(errors).map((error, index) => (
        <p key={index} className="text-red-400 text-sm">{error}</p>
      ))}
    </div>
  );

  const ReviewStep = () => (
    <div className="space-y-6">
      {/* Order Summary */}
      <div>
        <h3 className="font-medium text-white mb-4">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/70">Subtotal:</span>
            <span className="text-white">{subtotal.toFixed(4)} ETH</span>
          </div>
          {shippingCost > 0 && (
            <div className="flex justify-between">
              <span className="text-white/70">Shipping:</span>
              <span className="text-white">{shippingCost.toFixed(4)} ETH</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-white/70">Escrow Fee (1%):</span>
            <span className="text-white">{escrowFee.toFixed(4)} ETH</span>
          </div>
          <div className="border-t border-white/20 pt-2 flex justify-between font-medium">
            <span className="text-white">Total:</span>
            <span className="text-white">{total.toFixed(4)} ETH</span>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      {hasPhysicalItems && (
        <div>
          <h3 className="font-medium text-white mb-4">Shipping Address</h3>
          <div className="p-4 bg-white/5 rounded-lg text-sm">
            <p className="text-white">{shippingAddress.firstName} {shippingAddress.lastName}</p>
            <p className="text-white/70">{shippingAddress.address1}</p>
            {shippingAddress.address2 && <p className="text-white/70">{shippingAddress.address2}</p>}
            <p className="text-white/70">{shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}</p>
          </div>
        </div>
      )}

      {/* Final Payment Button */}
      <Button
        variant="primary"
        size="large"
        onClick={processPayment}
        disabled={isProcessing || !escrowSetup}
        className="w-full flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Shield size={20} />
            Complete Secure Payment
          </>
        )}
      </Button>

      {errors.payment && <p className="text-red-400 text-sm text-center">{errors.payment}</p>}
    </div>
  );

  const stepComponents = {
    cart: <CartReviewStep />,
    shipping: <ShippingStep />,
    payment: <PaymentStep />,
    review: <ReviewStep />
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index < currentStep ? 'bg-green-500 text-white' 
                : index === currentStep ? 'bg-blue-500 text-white' 
                : 'bg-white/20 text-white/60'
              }`}>
                {index < currentStep ? <CheckCircle size={16} /> : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-20 h-0.5 mx-2 ${
                  index < currentStep ? 'bg-green-500' : 'bg-white/20'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm">
          {steps.map((step, index) => (
            <span key={step.key} className={index <= currentStep ? 'text-white' : 'text-white/60'}>
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="mb-8"
      >
        <GlassPanel variant="primary" className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              {steps[currentStep]?.title}
            </h2>
          </div>
          {stepComponents[steps[currentStep]?.key as keyof typeof stepComponents]}
        </GlassPanel>
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onCancel : prevStep}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>

        {currentStep < steps.length - 1 && (
          <Button
            variant="primary"
            onClick={nextStep}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            Next
            <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default EnhancedCheckoutFlow;