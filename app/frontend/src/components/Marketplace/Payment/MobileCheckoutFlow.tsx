/**
 * MobileCheckoutFlow - Mobile-optimized checkout with sticky summary and touch interactions
 * Features: Sticky checkout summary, touch-friendly inputs, collapsible order details
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Shield, CreditCard, Truck, CheckCircle, AlertTriangle,
  ArrowLeft, ArrowRight, User, MapPin, Wallet, Clock, Info, Lock, Vote,
  ChevronDown, ChevronUp, Eye, EyeOff, Plus, Minus, X, Menu
} from 'lucide-react';
import { useAccount, useConnect, useBalance } from 'wagmi';
import { GlassPanel } from '../../../design-system/components/GlassPanel';
import { Button } from '../../../design-system/components/Button';

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

interface MobileCheckoutFlowProps {
  cartItems: CartItem[];
  onComplete: (orderData: any) => void;
  onCancel: () => void;
}

export const MobileCheckoutFlow: React.FC<MobileCheckoutFlowProps> = ({
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
  
  // Mobile-specific states
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [orderDetailsExpanded, setOrderDetailsExpanded] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  
  const formRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { data: balance } = useBalance({ address });

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
    { key: 'cart', title: 'Review Cart', icon: ShoppingCart, show: true },
    { key: 'shipping', title: 'Shipping', icon: Truck, show: hasPhysicalItems },
    { key: 'payment', title: 'Payment', icon: CreditCard, show: true },
    { key: 'review', title: 'Review', icon: CheckCircle, show: true }
  ].filter(step => step.show);

  // Virtual keyboard detection
  useEffect(() => {
    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      setIsKeyboardVisible(viewportHeight < windowHeight * 0.8);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Touch gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    };

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;

    // Swipe threshold
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
      if (deltaX > 0 && currentStep < steps.length - 1) {
        nextStep();
      } else if (deltaX < 0 && currentStep > 0) {
        prevStep();
      }
    }

    setTouchStart(null);
  };

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
      // Scroll to top on mobile
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const setupEscrow = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setEscrowSetup(true);
    } catch (error) {
      setErrors({ escrow: 'Failed to setup escrow' });
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const orderData = {
        id: `ORDER_${Date.now()}`,
        items: cartItems,
        shippingAddress: hasPhysicalItems ? shippingAddress : null,
        totals: { subtotal, shippingCost, escrowFee, total },
        timestamp: new Date()
      };
      
      onComplete(orderData);
    } catch (error) {
      setErrors({ payment: 'Payment failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Touch-friendly input component
  const TouchInput = ({ 
    label, 
    value, 
    onChange, 
    placeholder, 
    type = 'text', 
    required = false,
    error,
    inputKey
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
    required?: boolean;
    error?: string;
    inputKey: string;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-white mb-2">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setActiveInput(inputKey)}
        onBlur={() => setActiveInput(null)}
        className={`
          w-full p-4 text-lg rounded-xl bg-white/10 border-2 text-white placeholder-white/50 
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-0 focus:border-blue-400 focus:bg-white/15
          touch-manipulation
          ${activeInput === inputKey ? 'border-blue-400 bg-white/15 scale-[1.02]' : 'border-white/20'}
          ${error ? 'border-red-400' : ''}
        `}
        placeholder={placeholder}
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          fontSize: '16px' // Prevents zoom on iOS
        }}
      />
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm mt-2"
        >
          {error}
        </motion.p>
      )}
    </div>
  );

  // Mobile step progress indicator
  const MobileStepIndicator = () => (
    <div className="flex items-center justify-between mb-6 px-2">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <motion.div
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all
                  ${isActive ? 'bg-blue-500 border-blue-500 text-white' : 
                    isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                    'bg-white/10 border-white/30 text-white/60'}
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isCompleted ? (
                  <CheckCircle size={24} />
                ) : (
                  <StepIcon size={20} />
                )}
              </motion.div>
              <span className={`text-xs mt-2 font-medium ${isActive ? 'text-white' : 'text-white/60'}`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-white/20'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Sticky checkout summary
  const StickyCheckoutSummary = () => (
    <motion.div
      ref={summaryRef}
      className={`
        fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg bg-black/80 border-t border-white/20
        ${isKeyboardVisible ? 'translate-y-full' : 'translate-y-0'}
      `}
      initial={{ y: 100 }}
      animate={{ y: isKeyboardVisible ? 100 : 0 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      {/* Expandable summary header */}
      <motion.div
        className="p-4 cursor-pointer"
        onClick={() => setSummaryExpanded(!summaryExpanded)}
        whileTap={{ scale: 0.98 }}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/70">Total</div>
            <div className="text-xl font-bold text-white">
              {total.toFixed(4)} ETH
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm text-white/70">{cartItems.length} items</div>
              <div className="text-sm text-blue-400">
                {summaryExpanded ? 'Collapse' : 'Expand'}
              </div>
            </div>
            <motion.div
              animate={{ rotate: summaryExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronUp size={20} className="text-white/70" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Expandable summary details */}
      <AnimatePresence>
        {summaryExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 max-h-60 overflow-y-auto">
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <motion.div
                    key={item.id}
                    className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-12 h-12 object-cover rounded-lg" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-white truncate">
                        {item.title}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/70">Qty: {item.quantity}</span>
                        <span className="text-sm font-medium text-white">
                          {(parseFloat(item.price.crypto) * item.quantity).toFixed(4)} ETH
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/20 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Subtotal</span>
                  <span className="text-white">{subtotal.toFixed(4)} ETH</span>
                </div>
                {shippingCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Shipping</span>
                    <span className="text-white">{shippingCost.toFixed(4)} ETH</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/70">Escrow Fee (1%)</span>
                  <span className="text-white">{escrowFee.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/20 font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-white">{total.toFixed(4)} ETH</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="p-4 pt-0 space-y-3">
        {currentStep === steps.length - 1 ? (
          <Button
            variant="primary"
            onClick={processPayment}
            disabled={isProcessing}
            className="w-full h-14 text-lg font-semibold rounded-xl touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white mr-3" />
                Processing...
              </div>
            ) : (
              'Complete Order'
            )}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={nextStep}
            className="w-full h-14 text-lg font-semibold rounded-xl touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Continue to {steps[currentStep + 1]?.title}
            <ArrowRight size={20} className="ml-2" />
          </Button>
        )}
        
        {currentStep > 0 && (
          <Button
            variant="outline"
            onClick={prevStep}
            className="w-full h-12 text-base rounded-xl border-white/30 text-white/90 touch-manipulation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to {steps[currentStep - 1]?.title}
          </Button>
        )}
      </div>
    </motion.div>
  );

  // Collapsible order details component
  const CollapsibleOrderDetails = ({ item }: { item: CartItem }) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
      <motion.div
        className="bg-white/5 rounded-xl overflow-hidden"
        layout
      >
        <motion.div
          className="p-4 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
          whileTap={{ scale: 0.98 }}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className="flex items-center space-x-4">
            <img 
              src={item.image} 
              alt={item.title} 
              className="w-16 h-16 object-cover rounded-lg" 
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white truncate">{item.title}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <img 
                  src={item.seller.avatar} 
                  alt={item.seller.name} 
                  className="w-4 h-4 rounded-full" 
                />
                <span className="text-sm text-white/70">{item.seller.name}</span>
                {item.seller.verified && <CheckCircle size={12} className="text-green-400" />}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-white font-medium">
                  {item.price.crypto} {item.price.cryptoSymbol}
                </span>
                <span className="text-white/70">Qty: {item.quantity}</span>
              </div>
            </div>
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={20} className="text-white/70" />
            </motion.div>
          </div>
        </motion.div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/70">Type:</span>
                    <p className="text-white">{item.isDigital ? 'Digital' : 'Physical'}</p>
                  </div>
                  <div>
                    <span className="text-white/70">Protection:</span>
                    <p className="text-white">
                      {item.escrowProtected ? 'Escrow Protected' : 'Standard'}
                    </p>
                  </div>
                  {!item.isDigital && item.shippingCost && (
                    <div>
                      <span className="text-white/70">Shipping:</span>
                      <p className="text-white">{item.shippingCost} ETH</p>
                    </div>
                  )}
                  {!item.isDigital && item.estimatedDelivery && (
                    <div>
                      <span className="text-white/70">Delivery:</span>
                      <p className="text-white">{item.estimatedDelivery}</p>
                    </div>
                  )}
                </div>
                
                {item.seller.daoApproved && (
                  <div className="flex items-center space-x-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <Vote size={16} className="text-yellow-400" />
                    <span className="text-sm text-yellow-400">DAO Approved Seller</span>
                  </div>
                )}
                
                {item.escrowProtected && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Shield size={16} className="text-blue-400" />
                    <span className="text-sm text-blue-400">Funds held in escrow until delivery</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
    
    // Step Components
    const CartReviewStep = () => (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white mb-4">Review Your Cart</h2>
        {cartItems.map((item) => (
          <CollapsibleOrderDetails key={item.id} item={item} />
        ))}
      </div>
    );
    
    const ShippingStep = () => (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white mb-4">Shipping Information</h2>
          
        <div className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <TouchInput
              label="First Name"
              value={shippingAddress.firstName}
              onChange={(value) => setShippingAddress(prev => ({ ...prev, firstName: value }))}
              placeholder="Enter first name"
              required
              error={errors.firstName}
              inputKey="firstName"
            />
            <TouchInput
              label="Last Name"
              value={shippingAddress.lastName}
              onChange={(value) => setShippingAddress(prev => ({ ...prev, lastName: value }))}
              placeholder="Enter last name"
              required
              error={errors.lastName}
              inputKey="lastName"
            />
          </div>
            
          <TouchInput
            label="Email"
            value={shippingAddress.email}
            onChange={(value) => setShippingAddress(prev => ({ ...prev, email: value }))}
            placeholder="Enter email address"
            type="email"
            required
            error={errors.email}
            inputKey="email"
          />
            
          <TouchInput
            label="Address Line 1"
            value={shippingAddress.address1}
            onChange={(value) => setShippingAddress(prev => ({ ...prev, address1: value }))}
            placeholder="Street address"
            required
            error={errors.address1}
            inputKey="address1"
          />
            
          <TouchInput
            label="Address Line 2"
            value={shippingAddress.address2 || ''}
            onChange={(value) => setShippingAddress(prev => ({ ...prev, address2: value }))}
            placeholder="Apartment, suite, etc. (optional)"
            inputKey="address2"
          />
            
          <div className="grid grid-cols-2 gap-4">
            <TouchInput
              label="City"
              value={shippingAddress.city}
              onChange={(value) => setShippingAddress(prev => ({ ...prev, city: value }))}
              placeholder="City"
              required
              error={errors.city}
              inputKey="city"
            />
            <TouchInput
              label="State"
              value={shippingAddress.state}
              onChange={(value) => setShippingAddress(prev => ({ ...prev, state: value }))}
              placeholder="State"
              required
              error={errors.state}
              inputKey="state"
            />
          </div>
            
          <div className="grid grid-cols-2 gap-4">
            <TouchInput
              label="ZIP Code"
              value={shippingAddress.zipCode}
              onChange={(value) => setShippingAddress(prev => ({ ...prev, zipCode: value }))}
              placeholder="ZIP code"
              required
              error={errors.zipCode}
              inputKey="zipCode"
            />
            <TouchInput
              label="Phone"
              value={shippingAddress.phone || ''}
              onChange={(value) => setShippingAddress(prev => ({ ...prev, phone: value }))}
              placeholder="Phone number"
              type="tel"
              inputKey="phone"
            />
          </div>
        </div>
      </div>
    );
    
    const PaymentStep = () => (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white mb-4">Payment & Security</h2>
          
        {/* Wallet Connection */}
        <GlassPanel variant="primary" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Wallet size={20} className="mr-2" />
              Wallet Connection
            </h3>
            {isConnected && (
              <CheckCircle size={20} className="text-green-400" />
            )}
          </div>
            
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-white/70 text-sm">
                Connect your wallet to proceed with payment
              </p>
              {connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  variant="primary"
                  onClick={() => connect({ connector })}
                  className="w-full h-12 rounded-xl touch-manipulation"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Connect {connector.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Connected Wallet:</span>
                <span className="text-white font-mono text-sm">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Balance:</span>
                <span className="text-white">
                  {balance ? parseFloat(balance.formatted).toFixed(4) : '0'} {balance?.symbol}
                </span>
              </div>
            </div>
          )}
            
          {errors.wallet && (
            <p className="text-red-400 text-sm mt-2">{errors.wallet}</p>
          )}
        </GlassPanel>
          
        {/* Escrow Setup */}
        <GlassPanel variant="primary" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Shield size={20} className="mr-2" />
              Escrow Protection
            </h3>
            {escrowSetup && (
              <CheckCircle size={20} className="text-green-400" />
            )}
          </div>
            
          <div className="space-y-4">
            <p className="text-white/70 text-sm">
              Your funds will be held securely until delivery is confirmed
            </p>
              
            <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
              <div className="flex items-start space-x-3">
                <Info size={16} className="text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-400">
                  <p className="font-medium mb-1">How escrow works:</p>
                  <ul className="space-y-1 text-blue-300/80">
                    <li>• Funds are locked in smart contract</li>
                    <li>• Released when delivery is confirmed</li>
                    <li>• Dispute resolution available if needed</li>
                  </ul>
                </div>
              </div>
            </div>
              
            {!escrowSetup ? (
              <Button
                variant="primary"
                onClick={setupEscrow}
                disabled={!isConnected || isProcessing}
                className="w-full h-12 rounded-xl touch-manipulation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                    Setting up escrow...
                  </div>
                ) : (
                  'Setup Escrow Protection'
                )}
              </Button>
            ) : (
              <div className="flex items-center space-x-2 text-green-400">
                <CheckCircle size={16} />
                <span className="text-sm">Escrow protection enabled</span>
              </div>
            )}
          </div>
            
          {errors.escrow && (
            <p className="text-red-400 text-sm mt-2">{errors.escrow}</p>
          )}
        </GlassPanel>
      </div>
    );
    
    const ReviewStep = () => (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white mb-4">Review Your Order</h2>
          
        {/* Order Items */}
        <GlassPanel variant="primary" className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Items ({cartItems.length})</h3>
          <div className="space-y-4">
            {cartItems.map((item) => (
              <CollapsibleOrderDetails key={item.id} item={item} />
            ))}
          </div>
        </GlassPanel>
          
        {/* Shipping Information */}
        {hasPhysicalItems && (
          <GlassPanel variant="primary" className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Truck size={20} className="mr-2" />
              Shipping Information
            </h3>
            <div className="bg-white/5 p-4 rounded-lg">
              <p className="text-white font-medium">
                {shippingAddress.firstName} {shippingAddress.lastName}
              </p>
              <p className="text-white/70">{shippingAddress.address1}</p>
              {shippingAddress.address2 && (
                <p className="text-white/70">{shippingAddress.address2}</p>
              )}
              <p className="text-white/70">
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zipCode}
              </p>
              <p className="text-white/70">{shippingAddress.email}</p>
              {shippingAddress.phone && (
                <p className="text-white/70">{shippingAddress.phone}</p>
              )}
            </div>
          </GlassPanel>
        )}
          
        {/* Payment Summary */}
        <GlassPanel variant="primary" className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CreditCard size={20} className="mr-2" />
            Payment Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-white/70">Subtotal</span>
              <span className="text-white">{subtotal.toFixed(4)} ETH</span>
            </div>
            {shippingCost > 0 && (
              <div className="flex justify-between">
                <span className="text-white/70">Shipping</span>
                <span className="text-white">{shippingCost.toFixed(4)} ETH</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-white/70">Escrow Fee (1%)</span>
              <span className="text-white">{escrowFee.toFixed(4)} ETH</span>
            </div>
            <div className="border-t border-white/20 pt-3 flex justify-between">
              <span className="text-white font-semibold text-lg">Total</span>
              <span className="text-white font-bold text-lg">{total.toFixed(4)} ETH</span>
            </div>
          </div>
        </GlassPanel>
          
        {/* Security Features */}
        <GlassPanel variant="primary" className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Lock size={20} className="mr-2" />
            Security Features
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-white/90 text-sm">Escrow protection enabled</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-white/90 text-sm">Smart contract verified</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-white/90 text-sm">Dispute resolution available</span>
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  };

  const getCurrentStepComponent = () => {
    const currentStepKey = steps[currentStep]?.key;
    switch (currentStepKey) {
      case 'cart': return <div className="text-white">Cart Review Step - Coming Soon</div>;
      case 'shipping': return <div className="text-white">Shipping Step - Coming Soon</div>;
      case 'payment': return <div className="text-white">Payment Step - Coming Soon</div>;
      case 'review': return <div className="text-white">Review Step - Coming Soon</div>;
      default: return <div className="text-white">Cart Review Step - Coming Soon</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-black/50 border-b border-white/20">
        <div className="flex items-center justify-between p-4">
          <motion.button
            onClick={onCancel}
            className="p-2 rounded-lg bg-white/10 text-white touch-manipulation"
            whileTap={{ scale: 0.95 }}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <X size={20} />
          </motion.button>
            
          <div className="text-center">
            <h1 className="text-lg font-bold text-white">Checkout</h1>
            <p className="text-sm text-white/70">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
            
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="px-4 py-6">
        <MobileStepIndicator />
      </div>

      {/* Main Content */}
      <motion.div
        ref={formRef}
        className="px-4 pb-80" // Extra padding for sticky summary
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 300,
              duration: 0.3 
            }}
          >
            {getCurrentStepComponent()}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Sticky Checkout Summary */}
      <StickyCheckoutSummary />
        
      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <GlassPanel variant="primary" className="p-8 text-center max-w-sm mx-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Processing Your Order
              </h3>
              <p className="text-white/70 text-sm">
                Please wait while we process your transaction...
              </p>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};