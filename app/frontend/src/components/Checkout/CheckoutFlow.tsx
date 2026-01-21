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
import { useAccount, useConnect, useChainId, useSwitchChain, usePublicClient, useWalletClient } from 'wagmi';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import {
  UnifiedCheckoutService,
  CheckoutRecommendation,
  UnifiedCheckoutRequest,
  PrioritizedCheckoutRequest
} from '@/services/unifiedCheckoutService';
import { PaymentErrorCode, PaymentError as PaymentErrorType } from '@/services/paymentErrorHandler';
import { CryptoPaymentService } from '@/services/cryptoPaymentService';
import { StripePaymentService } from '@/services/stripePaymentService';
import { PaymentMethodPrioritizationService } from '@/services/paymentMethodPrioritizationService';
import { CostEffectivenessCalculator } from '@/services/costEffectivenessCalculator';
import { NetworkAvailabilityChecker } from '@/services/networkAvailabilityChecker';
import { UserPreferenceManager } from '@/services/userPreferenceManager';
import PaymentMethodSelector from '@/components/PaymentMethodPrioritization/PaymentMethodSelector';
import {
  PaymentMethod as PrioritizedPaymentMethodType,
  PaymentMethodType,
  PrioritizedPaymentMethod,
  PrioritizationContext,
  PrioritizationResult,
  UserContext,
  MarketConditions,
  AvailabilityStatus
} from '@/types/paymentPrioritization';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { getNetworkName } from '@/config/escrowConfig';
import { USDC_MAINNET, USDC_POLYGON, USDC_ARBITRUM, USDC_SEPOLIA, USDC_BASE, USDC_BASE_SEPOLIA } from '@/config/payment';
import { TRANSACTION_HELPERS } from '@/config/networks';
import { API_BASE_URL } from '@/config/api';
import { taxService, TaxCalculationResult } from '@/services/taxService';

import { PaymentErrorModal } from '@/components/Payment/PaymentErrorModal';
import { WalletConnectionPrompt } from '@/components/Payment/WalletConnectionPrompt';
import { StripeCheckout } from '@/components/Payment/StripeCheckout';
import ProductThumbnail from './ProductThumbnail';
import Link from 'next/link';
import { walletAssetDetectionService } from '@/services/walletAssetDetectionService';
import { TransactionSummary } from './TransactionSummary';

import { ShippingStep } from './Steps/ShippingStep';
import { useProfile } from '@/hooks/useProfile';
import { ShippingAddress } from '@/hooks/useCheckoutFlow';
import { useX402 } from '@/hooks/useX402';
import HelperCheckoutService from '@/services/checkoutService'; // Import Class as Helper
import { ProfileService } from '@/services/profileService';
// Assuming checkoutService is the singleton instance usually exported as default or named.
// If not, we might need to verify import.
// Based on usage 'cryptoPaymentService' was imported in unifiedCheckoutService.
// Let's assume standard singleton pattern for services in frontend.

interface CheckoutFlowProps {
  onBack: () => void;
  onComplete: (orderId: string) => void;
}

type CheckoutStep = 'address' | 'review' | 'payment-method' | 'payment-details' | 'processing' | 'confirmation';

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
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClientData } = useWalletClient();
  const { fetchWithAuth } = useX402();
  const { addToast } = useToast();

  // Fetch user profile for auto-filling address
  const { profile } = useProfile(address);

  // State management
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PrioritizedPaymentMethod | null>(null);
  const [prioritizationResult, setPrioritizationResult] = useState<PrioritizationResult | null>(null);
  const [recommendation, setRecommendation] = useState<CheckoutRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<PaymentErrorType | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [useEscrow, setUseEscrow] = useState(true);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculationResult | null>(null);

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    firstName: '',
    lastName: '',
    email: '',
    address1: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: '',
    address2: ''
  });
  const [billingAddress, setBillingAddress] = useState<ShippingAddress>({
    firstName: '', lastName: '', email: '', address1: '', city: '', state: '', zipCode: '', country: 'US', phone: '', address2: ''
  });
  const [sameAsShipping, setSameAsShipping] = useState(true);

  const [shippingErrors, setShippingErrors] = useState<Record<string, string>>({});
  const [billingErrors, setBillingErrors] = useState<Record<string, string>>({});

  // State for saving addresses to profile
  const [saveShippingAddress, setSaveShippingAddress] = useState(false);
  const [saveBillingAddress, setSaveBillingAddress] = useState(false);

  // State for saved addresses and payment methods
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<any[]>([]);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string>('');
  const [selectedSavedPayment, setSelectedSavedPayment] = useState<string>('');
  const [loadingSavedData, setLoadingSavedData] = useState(true);

  const checkoutService = React.useMemo(() => {
    const cryptoService = new CryptoPaymentService(publicClient, walletClientData);
    const stripeService = new StripePaymentService();
    return new UnifiedCheckoutService(cryptoService, stripeService);
  }, [publicClient, walletClientData]);

  // Instantiate the wrapper service for API calls like createCheckoutSession
  const apiService = React.useMemo(() => new HelperCheckoutService(), []);

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

  // Fetch saved addresses and payment methods on mount
  useEffect(() => {
    const fetchSavedData = async () => {
      if (!address) {
        setLoadingSavedData(false);
        return;
      }

      try {
        setLoadingSavedData(true);

        // Fetch saved addresses
        const token = localStorage.getItem('token') || 
                     localStorage.getItem('authToken') || 
                     localStorage.getItem('linkdao_access_token');
        
        if (!token) {
          console.warn('No authentication token found, skipping saved data fetch');
          setLoadingSavedData(false);
          return;
        }

        const addressResponse = await fetch(`${API_BASE_URL}/api/user/addresses`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (addressResponse.ok) {
          const addressData = await addressResponse.json();
          setSavedAddresses(addressData.data || []);

          // Auto-select default shipping address
          const defaultShipping = addressData.data?.find((addr: any) =>
            addr.isDefault && (addr.addressType === 'shipping' || addr.addressType === 'both')
          );
          if (defaultShipping) {
            setSelectedSavedAddress(defaultShipping.id);
            loadAddressIntoForm(defaultShipping, 'shipping');
          }
        }

        // Fetch saved payment methods
        const paymentResponse = await fetch(`${API_BASE_URL}/api/user/payment-methods`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (paymentResponse.ok) {
          const paymentData = await paymentResponse.json();
          setSavedPaymentMethods(paymentData.data || []);

          // Auto-select default payment method
          const defaultPayment = paymentData.data?.find((pm: any) => pm.isDefault);
          if (defaultPayment) {
            setSelectedSavedPayment(defaultPayment.id);
          }
        }
      } catch (error) {
        console.error('Error fetching saved data:', error);
      } finally {
        setLoadingSavedData(false);
      }
    };

    fetchSavedData();
  }, [address]);

  // Helper function to load address into form
  const loadAddressIntoForm = (address: any, type: 'shipping' | 'billing') => {
    const formattedAddress = {
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      email: address.email || '',
      address1: address.addressLine1 || '',
      address2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.postalCode || '',
      country: address.country || 'US',
      phone: address.phone || '',
    };

    if (type === 'shipping') {
      setShippingAddress(formattedAddress);
    } else {
      setBillingAddress(formattedAddress);
    }
  };

  // Debounce cart, address, and chainId changes
  const debouncedCartItemsLength = useDebounce(cartState.items.length, 1000);
  const debouncedAddress = useDebounce(address, 1000);
  const debouncedChainId = useDebounce(chainId, 1000);

  // Load payment prioritization when debounced values or tax calculation change
  useEffect(() => {
    loadPaymentPrioritization();
  }, [debouncedCartItemsLength, debouncedAddress, debouncedChainId, taxCalculation]);

  const loadPaymentPrioritization = async () => {
    if (cartState.items.length === 0) return;

    setLoading(true);
    try {
      // Calculate base amount (subtotal + shipping) WITHOUT tax
      // Tax is passed separately to TransactionSummary to avoid double-counting
      const subtotal = parseFloat(cartState.totals.subtotal.fiat);
      const shipping = parseFloat(cartState.totals.shipping?.fiat || '0');
      // Note: Tax is NOT included in transactionAmount - it's displayed separately in TransactionSummary
      const baseAmount = subtotal + shipping;

      // Create prioritization context WITHOUT wallet balance detection
      // Balance will only be checked when user selects a crypto payment method
      const context: PrioritizationContext = {
        transactionAmount: baseAmount,
        transactionCurrency: 'USD',
        userContext: {
          userAddress: address || undefined,
          chainId: chainId || 1,
          walletBalances: [], // Empty - will be populated when user selects crypto payment
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

      // Safety check: ensure availablePaymentMethods is not empty
      if (!context.availablePaymentMethods || context.availablePaymentMethods.length === 0) {
        console.warn('⚠️ No available payment methods, adding fallback methods');
        context.availablePaymentMethods = await getAvailablePaymentMethods();
      }

      console.log('🔍 Payment context:', {
        hasWallet: !!address,
        chainId: context.userContext.chainId,
        availableMethodsCount: context.availablePaymentMethods.length,
        fiatAvailable: context.availablePaymentMethods.some(m => m.type === PaymentMethodType.FIAT_STRIPE)
      });

      // Get prioritized payment methods
      let result;
      try {
        result = await prioritizationService.prioritizePaymentMethods(context);
        setPrioritizationResult(result);

        console.log('💳 Prioritization result:', {
          totalMethods: result.prioritizedMethods.length,
          availableMethods: result.prioritizedMethods.filter(m => m.availabilityStatus === 'available').length,
          fiatMethod: result.prioritizedMethods.find(m => m.method.type === PaymentMethodType.FIAT_STRIPE),
          defaultMethod: result.defaultMethod?.method.name
        });
      } catch (prioritizationError) {
        console.error('Payment method prioritization failed, using fallback:', prioritizationError);

        // Fallback: create a simple prioritization result with all methods available
        const availableMethods = context.availablePaymentMethods || [];

        if (availableMethods.length === 0) {
          console.warn('⚠️ No available payment methods in fallback, retrying...');
          setPrioritizationResult(null);
          setError('Unable to load payment options. Please refresh the page.');
          return;
        }

        const fallbackMethods = availableMethods.map(method => ({
          method,
          availabilityStatus: 'available' as any,
          priority: method.type === PaymentMethodType.FIAT_STRIPE ? 1 : 100,
          costEstimate: {
            baseCost: context.transactionAmount,
            gasFee: 0,
            platformFee: context.transactionAmount * 0.025,
            totalCost: context.transactionAmount * 1.025,
            estimatedTime: method.type === PaymentMethodType.FIAT_STRIPE ? 0 : 5,
            currency: 'USD',
            breakdown: { // Ensure breakdown is present
              amount: context.transactionAmount,
              networkFee: 0,
              platformFee: context.transactionAmount * 0.025
            },
            confidence: 0.1 // Low confidence marker
          },
          recommendationReason: method.type === PaymentMethodType.FIAT_STRIPE
            ? 'Instant payment with saved card'
            : 'Crypto payment available',
          warnings: ['Estimated costs unavailable'], // Ensure array
          benefits: [], // Ensure array
          userPreferenceScore: 0,
          totalScore: 0.5
        }));

        result = {
          prioritizedMethods: fallbackMethods,
          defaultMethod: fallbackMethods[0] || null,
          warnings: [
            {
              type: 'api_limit',
              message: 'Using fallback payment options due to API rate limits',
              actionRequired: 'Payment methods are still available'
            }
          ],
          marketConditions: context.marketConditions,
          metadata: {
            calculatedAt: new Date(),
            processingTimeMs: 0,
            cacheHit: false
          }
        };

        setPrioritizationResult(result);
      }

      // Pre-select default method only if none is selected
      if (result.defaultMethod && !selectedPaymentMethod) {
        setSelectedPaymentMethod(result.defaultMethod);
      }

      // DO NOT force navigation to payment-method here. 
      // User must complete address step first.
      // setCurrentStep('payment-method');


      // Also get legacy recommendation for backward compatibility
      const request: UnifiedCheckoutRequest = {
        orderId: `order_${Date.now()}`,
        listingId: cartState.items[0]?.id || '',
        buyerAddress: address || '',
        sellerAddress: cartState.items[0]?.seller?.walletAddress || cartState.items[0]?.seller?.id || '',
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

  // Calculate tax when entering review step or when address changes
  useEffect(() => {
    if ((currentStep === 'review' || currentStep === 'payment-method') && shippingAddress.country) {
      calculateOrderTax(shippingAddress);
    }
  }, [currentStep, shippingAddress, cartState.items]);

  const calculateOrderTax = async (address: any) => {
    if (!address || !address.country) {
      setTaxCalculation(null);
      return;
    }

    try {
      const items = cartState.items.map(item => ({
        id: item.id,
        name: item.title,
        price: parseFloat(item.price.fiat),
        quantity: item.quantity,
        isDigital: false,
        isTaxExempt: false
      }));

      // Calculate pseudo-shipping cost based on total
      const shippingCost = parseFloat(cartState.totals.shipping.fiat) || 0;

      const taxResult = await taxService.calculateTax(
        items,
        {
          country: address.country,
          state: address.state,
          city: address.city,
          postalCode: address.zipCode || address.postalCode,
          line1: address.address1 || address.addressLine1
        },
        shippingCost
      );

      setTaxCalculation(taxResult);
    } catch (error) {
      console.error('Failed to calculate tax:', error);
      // Even if it fails, we shouldn't block checkout, but maybe warn?
      // For now, fail silently or with null
      setTaxCalculation(null);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod || !address) return;

    setLoading(true);
    setError(null);
    setPaymentError(null);

    try {
      const taxAmount = taxCalculation?.taxAmount || 0;
      // Recalculate total ensuring we use the same numbers as UI
      // Subtotal (already discounted in logic? No, check cart totals)
      // Cart logic: subtotal matches UI. 
      // Total = Subtotal + Shipping + Tax
      const subtotal = parseFloat(cartState.totals.subtotal.fiat);
      const shipping = parseFloat(cartState.totals.shipping.fiat);
      const totalAmount = subtotal + shipping + taxAmount;

      if (selectedPaymentMethod?.method.type === PaymentMethodType.FIAT_STRIPE && totalAmount < 0.50) {
        throw new Error(`Order total ($${totalAmount.toFixed(2)}) must be at least $0.50 USD for card payments.`);
      }

      const listingId = cartState.items[0]?.id;
      if (!listingId || listingId === 'undefined') {
        throw new Error('Invalid product information: Listing ID is missing');
      }

      // Get seller address - prioritize walletAddress, fall back to id (for compatibility)
      const sellerAddress = cartState.items[0]?.seller?.walletAddress || cartState.items[0]?.seller?.id || '';

      if (!sellerAddress) {
        throw new Error('Seller information not available. Please refresh the page and try again.');
      }

      const request: PrioritizedCheckoutRequest = {
        orderId: `order_${Date.now()}`,
        listingId: listingId,
        buyerAddress: address,
        sellerAddress: sellerAddress,
        amount: totalAmount,
        currency: 'USD',
        selectedPaymentMethod,
        paymentDetails: {
          walletAddress: address,
          tokenSymbol: selectedPaymentMethod.method.token?.symbol,
          networkId: selectedPaymentMethod.method.chainId,
          billingAddress: sameAsShipping ? shippingAddress : billingAddress
        }
      };

      console.log('🚀 Processing checkout request:', request);
      console.table(cartState.items.map(i => ({ id: i.id, title: i.title, price: i.price.fiat })));

      // Determine payment path
      const isX402 = selectedPaymentMethod.method.type === PaymentMethodType.X402;
      const isCrypto = selectedPaymentMethod.method.type !== PaymentMethodType.FIAT_STRIPE;

      let result;

      if (isX402) {
        // x402 Protocol Flow
        // 1. Create Checkout Session to get Order ID and finalize totals
        console.log('🔄 Creating checkout session...');
        const session = await apiService.createCheckoutSession(cartState.items, address);
        console.log('✅ Checkout session created:', session);

        // 2. Pay via x402 Protocol (Signature Handshake)
        console.log('🔐 Initiating x402 payment for order:', session.orderId);

        const requestBody = {
          orderId: session.orderId,
          amount: session.totals.total
        };

        console.log('📤 Sending x402 checkout request:', {
          url: '/api/x402/checkout',
          method: 'POST',
          body: requestBody
        });

        let x402Response;
        try {
          x402Response = await fetchWithAuth('/api/x402/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });

          console.log('📥 x402 response received:', {
            status: x402Response.status,
            statusText: x402Response.statusText,
            ok: x402Response.ok
          });

          // Handle non-OK responses
          if (!x402Response.ok) {
            const errorText = await x402Response.text();
            console.error('❌ x402 checkout failed:', {
              status: x402Response.status,
              statusText: x402Response.statusText,
              body: errorText
            });

            throw new Error(
              `x402 checkout failed (${x402Response.status}): ${errorText || x402Response.statusText}`
            );
          }
        } catch (fetchError) {
          console.error('❌ x402 fetch error:', fetchError);
          throw new Error(
            `Failed to connect to x402 checkout endpoint: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`
          );
        }

        let paymentData;
        try {
          paymentData = await x402Response.json();
          console.log('✅ x402 payment data:', paymentData);
        } catch (parseError) {
          console.error('❌ Failed to parse x402 response:', parseError);
          throw new Error('Invalid response from x402 checkout endpoint');
        }

        if (!paymentData.success) {
          throw new Error(paymentData.message || 'x402 Payment Failed');
        }

        // Construct successful result
        result = {
          orderId: session.orderId,
          status: 'completed',
          paymentPath: 'crypto',
          transactionId: paymentData.data.paymentVerified ? 'x402-signed' : 'pending'
        };
      } else if (isCrypto) {
        // Standard Crypto Payment Flow (USDC, ETH, etc.)
        console.log('💎 Processing standard crypto payment...');
        result = await checkoutService.processPrioritizedCheckout(request);
      } else {
        // Fiat (Stripe) Flow
        console.log('💳 Processing fiat payment...');
        result = await checkoutService.processPrioritizedCheckout(request);
      }

      if (result.status === 'completed' || result.status === 'processing') {
        // ... (existing success handling)
        setOrderData(result);
        setCurrentStep('confirmation');

        // Save addresses to profile if requested
        if ((saveShippingAddress || saveBillingAddress) && address) {
          // ... (existing address saving logic)
          try {
            const addressUpdates: any = {};
            if (saveShippingAddress) {
              Object.assign(addressUpdates, {
                shippingFirstName: shippingAddress.firstName,
                shippingLastName: shippingAddress.lastName,
                shippingAddress1: shippingAddress.address1,
                shippingAddress2: shippingAddress.address2 || '',
                shippingCity: shippingAddress.city,
                shippingState: shippingAddress.state,
                shippingZipCode: shippingAddress.zipCode,
                shippingCountry: shippingAddress.country,
                shippingPhone: shippingAddress.phone || ''
              });
            }
            if (saveBillingAddress) {
              const target = sameAsShipping ? shippingAddress : billingAddress;
              Object.assign(addressUpdates, {
                billingFirstName: target.firstName,
                billingLastName: target.lastName,
                billingAddress1: target.address1,
                billingAddress2: target.address2 || '',
                billingCity: target.city,
                billingState: target.state,
                billingZipCode: target.zipCode,
                billingCountry: target.country,
                billingPhone: target.phone || ''
              });
            }
            await ProfileService.updateProfile(address, addressUpdates);
            console.log('✅ Address saved to profile successfully');
            addToast('Address saved to your profile!', 'success');
          } catch (error) {
            console.error('Failed to save address:', error);
            addToast('Order completed, but failed to save address to profile', 'warning');
          }
        }

        onComplete(result.orderId);
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (err: any) {
      console.error('Checkout failed:', err);

      // Auto-handle missing product error
      const errorMessage = err.message || '';
      if (errorMessage.includes('Product not found') ||
        errorMessage.includes('longer available') ||
        errorMessage.includes('Invalid product') ||
        errorMessage.includes('product information')) {

        const listingId = cartState.items[0]?.id;
        console.warn(`⚠️ Item ${listingId} appears invalid or missing. Auto-removing.`);

        addToast('This item is no longer available and has been removed from your cart.', 'error');

        if (listingId) {
          await actions.removeItem(listingId);
        }

        // Wait a bit for toast to be seen? No, redirect is fast.
        // Maybe redirect to marketplace
        router.push('/marketplace');
        return;
      }

      const paymentErr = PaymentErrorType.fromError(err);
      setPaymentError(paymentErr);
      setShowErrorModal(true);
      addToast(paymentErr.userMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of methods)

  const renderOrderSummary = () => {
    // Calculate total discount from items
    const totalDiscount = cartState.items.reduce((sum, item) => {
      return sum + (parseFloat(item.appliedDiscount || '0'));
    }, 0);

    // Derived values for display
    const subtotal = parseFloat(cartState.totals.subtotal.fiat);
    const shipping = parseFloat(cartState.totals.shipping.fiat);
    const tax = taxCalculation?.taxAmount || 0;

    // Gas fee only for crypto payments (this is a network fee paid by buyer)
    // Note: Platform fee is a SELLER fee, not shown to buyers
    const gasFee = selectedPaymentMethod?.costEstimate?.gasFee || 0;

    // Note: totalDiscount is already subtracted from subtotal in cart logic
    // CartService: subtotal = sum(price * qty) - discount
    // So subtotal IS the discounted price.
    // If we want to show "Gross Subtotal", we add back discount.
    const grossSubtotal = subtotal + totalDiscount;

    // Final total for buyer: subtotal + shipping + tax + gas fee (if crypto)
    // Platform fee is NOT included - that's charged to sellers
    const finalTotal = subtotal + shipping + tax + gasFee;

    return (
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
        <div className="space-y-4">
          {cartState.items.map((item) => {
            const itemTotal = parseFloat(item.price.fiat) * item.quantity;
            const itemDiscount = parseFloat(item.appliedDiscount || '0');
            const itemFinalPrice = itemTotal - itemDiscount;

            return (
              <div key={item.id} className="flex items-center gap-4">
                {/* ... item rendering code ... */}
                {/* Keep existing item rendering but update checks if needed */}
                <Link href={`/marketplace/product/${item.id}`}>
                  <a className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
                    <ProductThumbnail
                      item={{
                        id: item.id,
                        title: item.title,
                        image: item.image,
                        category: item.category
                      }}
                      size="medium"
                      fallbackType="letter"
                      className="flex-shrink-0"
                    />
                  </a>
                </Link>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white truncate">{item.title}</h4>
                  <p className="text-white/70 text-sm">Qty: {item.quantity}</p>
                  {itemDiscount > 0 && (
                    <p className="text-green-400 text-xs">
                      Promo applied: -${itemDiscount.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-medium text-white">${itemFinalPrice.toFixed(2)}</p>
                </div>
              </div>
            );
          })}

          <hr className="border-white/20" />

          <div className="space-y-2">
            <div className="flex justify-between text-white/70">
              <span>Subtotal ({cartState.totals.itemCount} items)</span>
              <span>${grossSubtotal.toFixed(2)}</span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Total Discount</span>
                <span>-${totalDiscount.toFixed(2)}</span>
              </div>
            )}

            {shipping > 0 ? (
              <div className="flex justify-between text-white/70">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-white/70">
                <span>Shipping</span>
                <span className="text-green-400">Free</span>
              </div>
            )}

            {/* Tax Display */}
            <div className="flex justify-between text-white/70">
              <span>Tax {taxCalculation ? `(${(taxCalculation.taxRate * 100).toFixed(0)}%)` : '(Est.)'}</span>
              <span>${tax.toFixed(2)}</span>
            </div>

            {/* Gas Fee - only show for crypto payments */}
            {gasFee > 0 && (
              <div className="flex justify-between text-white/70">
                <span>Network Fee</span>
                <span>${gasFee.toFixed(2)}</span>
              </div>
            )}

            <hr className="border-white/20 my-2" />

            <div className="flex justify-between text-lg font-bold text-white">
              <span>Total</span>
              <span>${finalTotal.toFixed(2)}</span>
            </div>

            {selectedPaymentMethod?.method.type !== PaymentMethodType.FIAT_STRIPE && selectedPaymentMethod?.method.token && (
              <div className="text-right text-xs text-white/50">
                ≈ {((finalTotal / (selectedPaymentMethod?.costEstimate?.exchangeRate || 1))).toFixed(4)} {selectedPaymentMethod?.method.token?.symbol}
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    );
  };

  const getAvailablePaymentMethods = async (): Promise<PrioritizedPaymentMethodType[]> => {
    // Get current network or default to mainnet
    const currentChainId = chainId || 1;

    const methods: PrioritizedPaymentMethodType[] = [];

    // Add network-specific USDC options for all supported networks
    const usdcConfigs = [
      { token: USDC_MAINNET, name: 'USDC (Ethereum)', chainId: 1, networkName: 'Ethereum', isTestnet: false },
      { token: USDC_POLYGON, name: 'USDC (Polygon)', chainId: 137, networkName: 'Polygon', isTestnet: false },
      { token: USDC_ARBITRUM, name: 'USDC (Arbitrum)', chainId: 42161, networkName: 'Arbitrum', isTestnet: false },
      { token: USDC_BASE, name: 'USDC (Base)', chainId: 8453, networkName: 'Base', isTestnet: false },
      { token: USDC_SEPOLIA, name: 'USDC (Sepolia)', chainId: 11155111, networkName: 'Sepolia', isTestnet: true },
      { token: USDC_BASE_SEPOLIA, name: 'USDC (Base Sepolia)', chainId: 84532, networkName: 'Base Sepolia', isTestnet: true }
    ];

    usdcConfigs.forEach(config => {
      methods.push({
        id: `usdc-${config.chainId}`,
        type: PaymentMethodType.STABLECOIN_USDC,
        name: config.name,
        description: config.isTestnet
          ? `USD Coin on ${config.networkName} (Testnet)`
          : `USD Coin on ${config.networkName}`,
        chainId: config.chainId,
        enabled: true,
        supportedNetworks: [config.chainId],
        token: config.token
      });
    });

    // Add Fiat payment option - Always available regardless of wallet connection
    methods.push({
      id: 'stripe-fiat',
      type: PaymentMethodType.FIAT_STRIPE,
      name: 'Credit/Debit Card',
      description: 'Pay with your saved card from your profile - Instant payment',
      chainId: 0, // Not applicable for fiat
      enabled: true,
      supportedNetworks: [1, 137, 42161, 8453, 11155111, 84532] // Available on all networks
    });

    // Add x402 payment option
    methods.push({
      id: 'x402-payment',
      type: PaymentMethodType.X402,
      name: 'x402 Protocol',
      description: 'Pay with reduced fees using Coinbase x402 protocol',
      chainId: 1, // Mainnet
      enabled: true,
      supportedNetworks: [1, 137, 42161, 11155111], // Supported networks
      token: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'X402',
        decimals: 18,
        name: 'x402 Protocol',
        chainId: 1,
        isNative: false
      }
    });

    console.log('✅ Available payment methods including fiat and x402:', methods.map(m => m.name));

    // Add native ETH options for supported networks
    methods.push({
      id: 'eth-mainnet',
      type: PaymentMethodType.NATIVE_ETH,
      name: 'Ethereum (Mainnet)',
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
    });

    methods.push({
      id: 'eth-arbitrum',
      type: PaymentMethodType.NATIVE_ETH,
      name: 'Ethereum (Arbitrum)',
      description: 'Native ETH on Arbitrum',
      chainId: 42161,
      enabled: true,
      supportedNetworks: [42161],
      token: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum',
        chainId: 42161,
        isNative: true
      }
    });

    return methods;
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

    // Only check wallet balance and switch network for crypto payments
    if (method.method.type !== PaymentMethodType.FIAT_STRIPE && isConnected && address) {
      try {
        // Check wallet balance for the selected crypto payment method
        const assets = await walletAssetDetectionService.detectWalletAssets(
          address,
          parseFloat(cartState.totals.total.fiat)
        );

        // Find balance for the selected token
        const tokenBalance = Object.values(assets.assetsByChain)
          .flat()
          .find(asset =>
            asset.tokenAddress.toLowerCase() === method.method.token?.address.toLowerCase() &&
            asset.chainId === method.method.chainId
          );

        if (tokenBalance && tokenBalance.balanceUSD < parseFloat(cartState.totals.total.fiat)) {
          addToast(
            `Insufficient ${tokenBalance.tokenSymbol} balance. Please add funds or choose another payment method.`,
            'warning'
          );
        }

        // Auto-switch network if needed
        const requiredChainId = method.method.chainId;
        if (chainId !== requiredChainId && switchChain) {
          try {
            addToast(`Switching to ${getNetworkName(requiredChainId)}...`, 'info');
            await switchChain({ chainId: requiredChainId });
            addToast(`Successfully switched to ${getNetworkName(requiredChainId)}`, 'success');
          } catch (error) {
            console.error('Network switch failed:', error);

            // If switch failed, try to add the network to wallet
            if (requiredChainId === 11155111) {
              // Try to add Sepolia to wallet using helper function
              try {
                await TRANSACTION_HELPERS.addSepoliaToMetaMask();
                // Now try switching again
                await switchChain({ chainId: requiredChainId });
                addToast(`Successfully added and switched to ${getNetworkName(requiredChainId)}`, 'success');
              } catch (addError) {
                console.error('Failed to add Sepolia to wallet:', addError);
                addToast(
                  'Please add Sepolia testnet to your wallet manually, or choose a mainnet payment method.',
                  'warning'
                );
              }
            } else {
              addToast('Network switch cancelled or failed. Please switch manually.', 'warning');
            }
          }
        }
      } catch (error) {
        console.error('Failed to check wallet balance:', error);
        // Continue anyway - balance check is optional
      }
    }

    console.log('Payment method selected:', method.method.name);
  };




  const handleProcessPayment = () => {
    setCurrentStep('processing');
    handlePaymentSubmit();
  };

  const handleRecoveryAction = async (action: string) => {
    console.log('Recovery action:', action);
    setShowErrorModal(false);

    switch (action) {
      case 'retry':
        // Retry the payment
        await handlePaymentSubmit();
        break;

      case 'connect_wallet':
        // Navigate back to payment method selection
        setCurrentStep('payment-method');
        break;

      case 'switch_to_fiat':
        // Switch to fiat payment method
        const fiatMethod = prioritizationResult?.prioritizedMethods.find(
          m => m.method.type === PaymentMethodType.FIAT_STRIPE
        );
        if (fiatMethod) {
          setSelectedPaymentMethod(fiatMethod);
          setCurrentStep('payment-details');
        }
        break;

      case 'switch_to_crypto':
        // Switch to crypto payment method
        const cryptoMethod = prioritizationResult?.prioritizedMethods.find(
          m => m.method.type !== PaymentMethodType.FIAT_STRIPE && m.availabilityStatus === 'available'
        );
        if (cryptoMethod) {
          setSelectedPaymentMethod(cryptoMethod);
          setCurrentStep('payment-details');
        }
        break;

      case 'add_funds':
      case 'switch_token':
        // Navigate back to payment method selection
        setCurrentStep('payment-method');
        addToast('Please select a different payment method', 'info');
        break;

      case 'contact_support':
        // Open support in new tab
        window.open('/support', '_blank');
        break;

      case 'wait_retry':
        // Wait and retry after a delay
        addToast('Please wait a few minutes before retrying', 'info');
        setTimeout(() => {
          handlePaymentSubmit();
        }, 5 * 60 * 1000); // 5 minutes
        break;

      default:
        console.warn('Unknown recovery action:', action);
    }
  };






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

        {/* Network Selection Info - Only for crypto payments */}
        {isConnected && (
          <GlassPanel variant="secondary" className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-1">Smart Network Detection</h4>
                <p className="text-white/70 text-sm">
                  We'll automatically detect your wallet's assets and switch to the optimal network for your selected payment method.
                </p>
                <p className="text-white/60 text-xs mt-2">
                  💡 <span className="font-medium text-green-400">Credit/Debit Card</span> payment is always available and uses your saved card from your profile.
                </p>
              </div>
            </div>
          </GlassPanel>
        )}

        {/* Payment Method Selector */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
          {prioritizationResult && prioritizationResult.prioritizedMethods.length > 0 ? (
            <>
              <PaymentMethodSelector
                prioritizationResult={prioritizationResult}
                selectedMethodId={selectedPaymentMethod?.method.id}
                onMethodSelect={handlePaymentMethodSelect}
                showCostBreakdown={true}
                showRecommendations={true}
                showWarnings={true}
                maxDisplayMethods={10}
                layout="list"
                responsive={true}
                className="text-white"
              />
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Loading Payment Options
              </h3>
              <p className="text-white/70 mb-4">
                We're finalizing your payment options. One moment please...
              </p>
              {/* Fallback to basic options if loading takes too long */}
              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="text-sm text-white/50 mb-4">Taking too long?</p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    // Manually set basic methods
                    const basicMethods = await getAvailablePaymentMethods();
                    if (basicMethods.length > 0) {
                      const basicPrioritization: PrioritizationResult = {
                        prioritizedMethods: basicMethods.map((m, i) => ({
                          method: m,
                          priority: i + 1,
                          costEstimate: {
                            totalCost: parseFloat(cartState.totals.total.fiat),
                            baseCost: parseFloat(cartState.totals.total.fiat),
                            gasFee: 0,
                            estimatedTime: 5,
                            confidence: 0.5,
                            currency: 'USD',
                            breakdown: { amount: parseFloat(cartState.totals.total.fiat) }
                          },
                          availabilityStatus: AvailabilityStatus.AVAILABLE,
                          userPreferenceScore: 0,
                          recommendationReason: 'Basic fallback',
                          totalScore: 0.5
                        })),
                        defaultMethod: null,
                        recommendations: [],
                        warnings: [],
                        metadata: { calculatedAt: new Date(), processingTimeMs: 0, totalMethodsEvaluated: 0, averageConfidence: 0 }
                      };
                      setPrioritizationResult(basicPrioritization);
                      if (basicMethods.length > 0) handlePaymentMethodSelect(basicPrioritization.prioritizedMethods[0]);
                    }
                  }}
                  className="mx-auto"
                >
                  Load Basic Options
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Summary - Same styling as payment method selector */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
          <TransactionSummary
            selectedMethod={selectedPaymentMethod}
            totalAmount={parseFloat(cartState.totals.total.fiat) + (taxCalculation?.taxAmount || 0)}
            onConfirm={() => setCurrentStep('payment-details')}
            isProcessing={loading}
            taxBreakdown={taxCalculation?.taxBreakdown}
            taxRate={taxCalculation?.taxRate}
          />
        </div>
      </div>
    );
  };



  const renderPaymentDetails = () => {
    if (!selectedPaymentMethod) return null;

    const handleConnected = () => {
      addToast('Wallet connected successfully!', 'success');
    };

    const handleError = (error: Error) => {
      addToast(`Wallet connection failed: ${error.message}`, 'error');
    };

    if (selectedPaymentMethod.method.type !== PaymentMethodType.FIAT_STRIPE) {
      return (
        <CryptoPaymentDetails
          paymentMethod={selectedPaymentMethod}
          onProceed={handlePaymentSubmit}
          useEscrow={useEscrow}
          setUseEscrow={setUseEscrow}
          onConnected={handleConnected}
          onError={handleError}
          isConnected={isConnected}
        />
      );
    } else {
      return (
        <FiatPaymentDetails
          paymentMethod={selectedPaymentMethod}
          onProceed={handlePaymentSubmit}
          address={address}
        />
      );
    }
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
            {orderData.escrowType === 'smart_contract' && orderData.transactionId && (
              <div className="flex justify-between">
                <span className="text-white/70">Escrow ID:</span>
                <Link href={`/escrow/${orderData.transactionId}`}>
                  <a className="text-blue-400 hover:underline">{orderData.transactionId}</a>
                </Link>
              </div>
            )}
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
            <div className={`p-2 rounded-lg ${selectedPaymentMethod.method.type !== PaymentMethodType.FIAT_STRIPE
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
        <Button variant="primary" onClick={() => router.push('/marketplace/orders')}>
          View Orders
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


  const validateAddress = (addr: ShippingAddress, setErrors: (e: Record<string, string>) => void) => {
    const newErrors: Record<string, string> = {};
    if (!addr.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!addr.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!addr.address1?.trim()) newErrors.address1 = 'Address is required';
    if (!addr.city?.trim()) newErrors.city = 'City is required';
    if (!addr.state?.trim()) newErrors.state = 'State is required';
    if (!addr.zipCode?.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!addr.country) newErrors.country = 'Country is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateShippingAddress = () => {
    const isShippingValid = validateAddress(shippingAddress, setShippingErrors);
    let isBillingValid = true;

    if (!sameAsShipping) {
      isBillingValid = validateAddress(billingAddress, setBillingErrors);
    }

    return isShippingValid && isBillingValid;
  };

  const handleAddressSubmit = async () => {
    if (validateShippingAddress()) {
      // Calculate tax and verify address before proceeding
      await calculateOrderTax(shippingAddress);
      setCurrentStep('payment-method');
    } else {
      addToast('Please fill in all required fields correctly', 'error');
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'cart', label: 'Cart', completed: true }, // Always completed as we are in checkout
      { key: 'address', label: 'Address', completed: ['review', 'payment-method', 'payment-details', 'processing', 'confirmation'].includes(currentStep) },
      // Merge Payment Method and Details into one visual step 'Payment'
      { key: 'payment', label: 'Payment', completed: ['processing', 'confirmation'].includes(currentStep) },
      { key: 'confirmation', label: 'Complete', completed: false }
    ];

    // Helper to check if step is active
    const isStepActive = (stepKey: string) => {
      if (stepKey === 'cart') return false;
      if (stepKey === 'address') return currentStep === 'address';
      if (stepKey === 'payment') return ['payment-method', 'payment-details', 'review'].includes(currentStep);
      if (stepKey === 'confirmation') return currentStep === 'confirmation';
      return false;
    };

    return (
      <div className="flex items-center justify-center mb-8 w-full">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="relative flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 z-10 bg-gray-900 ${step.completed || isStepActive(step.key)
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-white/30 text-white/60'
                }`}>
                {step.completed ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span className={`absolute top-10 text-xs whitespace-nowrap ${isStepActive(step.key) ? 'text-white' : 'text-white/50'}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 mb-4 ${step.completed ? 'bg-blue-500' : 'bg-white/30'
                }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderAddressStep = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Shipping & Billing Address</h2>
      </div>

      <GlassPanel variant="secondary" className="p-6">
        {/* Saved Addresses Dropdown */}
        {savedAddresses.length > 0 && (
          <div className="mb-6 pb-6 border-b border-white/10">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Use Saved Address
            </label>
            <select
              value={selectedSavedAddress}
              onChange={(e) => {
                const addressId = e.target.value;
                setSelectedSavedAddress(addressId);

                if (addressId) {
                  const address = savedAddresses.find(a => a.id === addressId);
                  if (address) {
                    loadAddressIntoForm(address, 'shipping');
                  }
                } else {
                  // Clear form for new address
                  setShippingAddress({
                    firstName: '',
                    lastName: '',
                    email: '',
                    address1: '',
                    address2: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: 'US',
                    phone: '',
                  });
                }
              }}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Enter new address</option>
              {savedAddresses.map(addr => (
                <option key={addr.id} value={addr.id}>
                  {addr.label || addr.addressType} - {addr.addressLine1}, {addr.city}
                  {addr.isDefault && ' ⭐'}
                </option>
              ))}
            </select>

            {selectedSavedAddress && (
              <p className="text-xs text-white/60 mt-2">
                You can edit the address below if needed
              </p>
            )}
          </div>
        )}

        <ShippingStep
          shippingAddress={shippingAddress}
          errors={shippingErrors}
          onAddressChange={(updates) => setShippingAddress(prev => ({ ...prev, ...updates }))}
          userProfile={profile}
          title="Shipping Address"
          saveToProfile={saveShippingAddress}
          onSaveAddressChange={setSaveShippingAddress}
        />

        <div className="pt-4 border-t border-white/10">
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={sameAsShipping}
              onChange={(e) => setSameAsShipping(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
            />
            <span className="text-white">Billing address is same as shipping</span>
          </label>

          {!sameAsShipping && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
              <ShippingStep
                shippingAddress={billingAddress}
                errors={billingErrors}
                onAddressChange={(updates) => setBillingAddress(prev => ({ ...prev, ...updates }))}
                userProfile={profile}
                title="Billing Address"
                saveToProfile={saveBillingAddress}
                onSaveAddressChange={setSaveBillingAddress}
              />
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            variant="primary"
            onClick={handleAddressSubmit}
            className="w-full md:w-auto px-8"
          >
            Continue to Payment
          </Button>
        </div>
      </GlassPanel>
    </div>
  );

  const getStepBackAction = () => {
    switch (currentStep) {
      case 'address': return onBack;
      case 'review': return () => setCurrentStep('address'); // Fix: 'review' should go back to address, not exit
      case 'payment-method': return () => setCurrentStep('address');
      case 'payment-details': return () => setCurrentStep('payment-method');
      default: return onBack;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          onClick={getStepBackAction()}
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
          {currentStep === 'address' && renderAddressStep()}
          {currentStep === 'address' ? null : (
            <GlassPanel variant="secondary" className="p-8">
              {currentStep === 'review' && renderPaymentMethodSelection()}
              {currentStep === 'payment-method' && renderPaymentMethodSelection()}
              {currentStep === 'payment-details' && renderPaymentDetails()}
              {currentStep === 'processing' && renderProcessing()}
              {currentStep === 'confirmation' && renderConfirmation()}
            </GlassPanel>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          {renderOrderSummary()}
        </div>
      </div>

      {/* Payment Error Modal */}
      <PaymentErrorModal
        error={paymentError}
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        onRecoveryAction={handleRecoveryAction}
      />
    </div>
  );
};

// Crypto Payment Details Component
const CryptoPaymentDetails: React.FC<{
  paymentMethod: PrioritizedPaymentMethod;
  onProceed: () => void;
  useEscrow: boolean;
  setUseEscrow: (use: boolean) => void;
  onConnected: () => void;
  onError: (error: Error) => void;
  isConnected: boolean;
}> = ({ paymentMethod, onProceed, useEscrow, setUseEscrow, onConnected, onError, isConnected }) => {
  return (
    <div className="space-y-6">
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="font-semibold text-white mb-4">Wallet Connection</h3>

        <WalletConnectionPrompt
          onConnected={onConnected}
          onError={onError}
          requiredNetwork={paymentMethod.method.chainId}
          showNetworkWarning={true}
        />
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

          {/* Detailed Price Breakdown */}
          <div className="border-t border-white/10 pt-3 mt-3">
            <div className="flex justify-between mb-2">
              <span className="text-white/70">Base Price:</span>
              <span className="text-white">${paymentMethod.costEstimate.baseCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-white/70">Gas Fee:</span>
              <span className={`${paymentMethod.costEstimate.gasFee > 1 ? 'text-orange-400' : 'text-white'}`}>
                ${paymentMethod.costEstimate.gasFee.toFixed(2)}
                {paymentMethod.costEstimate.gasFee > 1 && ' ⚠️'}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-white/70">Platform Fee (2.5%):</span>
              <span className="text-white">${(paymentMethod.costEstimate.baseCost * 0.025).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between border-t border-white/10 pt-3 mt-3">
            <span className="text-white font-medium">Total Cost:</span>
            <span className="text-white font-semibold text-lg">${paymentMethod.costEstimate.totalCost.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/70">Est. Time:</span>
            <span className="text-white">~{paymentMethod.costEstimate.estimatedTime} min</span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/70">Escrow Type:</span>
            <span className="text-white">Smart Contract</span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <label htmlFor="useEscrow" className="text-white/70 flex items-center">
              <input
                id="useEscrow"
                type="checkbox"
                checked={useEscrow}
                onChange={(e) => setUseEscrow(e.target.checked)}
                className="form-checkbox h-5 w-5 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 mr-2"
              />
              Use Escrow
            </label>
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
  address?: string;
}> = ({ paymentMethod, onProceed, address }) => {
  const { state: cartState } = useCart();
  const router = useRouter();

  return (
    <div className="space-y-6">
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

      {/* Stripe Checkout Integration */}
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="font-semibold text-white mb-4">Payment Information</h3>

        <StripeCheckout
          amount={paymentMethod.costEstimate.totalCost}
          currency="USD"
          orderId={`order_${Date.now()}`}
          userAddress={address}
          metadata={{
            cartItems: cartState.items.map(item => item.id).join(','),
            itemCount: cartState.items.length.toString(),
            paymentMethod: paymentMethod.method.name,
          }}
          onSuccess={(paymentIntentId) => {
            console.log('Stripe payment successful!', paymentIntentId);
            // Call the parent onProceed to update checkout state
            onProceed();
          }}
          onError={(error) => {
            console.error('Stripe payment failed:', error);
            // Error is already handled by StripeCheckout component
          }}
          onCancel={() => {
            // User can go back to payment method selection
            console.log('Payment cancelled by user');
          }}
        />
      </GlassPanel>
    </div>
  );
};

export default CheckoutFlow;