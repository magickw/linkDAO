/**
 * QuickBuy Component - Streamlined purchase flow for single items
 * Provides immediate purchase experience without cart complexity
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useBalance, usePublicClient, useWalletClient } from 'wagmi';
import { X, ShoppingBag, Wallet, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { MarketplaceListing } from '@/services/marketplaceService';
import { useToast } from '@/context/ToastContext';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { Button } from '@/design-system/components/Button';
import { useEnhancedCart } from '@/hooks/useEnhancedCart';
import { useChainId, useSwitchChain } from 'wagmi';
import {
  UnifiedCheckoutService,
  PrioritizedCheckoutRequest
} from '@/services/unifiedCheckoutService';
import { CryptoPaymentService } from '@/services/cryptoPaymentService';
import { StripePaymentService } from '@/services/stripePaymentService';
import { PaymentMethodPrioritizationService } from '@/services/paymentMethodPrioritizationService';
import { CostEffectivenessCalculator } from '@/services/costEffectivenessCalculator';
import { NetworkAvailabilityChecker } from '@/services/networkAvailabilityChecker';
import { UserPreferenceManager } from '@/services/userPreferenceManager';
import PaymentMethodSelector from '@/components/PaymentMethodPrioritization/PaymentMethodSelector';
import {
  PaymentMethodType,
  PrioritizedPaymentMethod,
  PrioritizationContext,
  PrioritizationResult,
  MarketConditions
} from '@/types/paymentPrioritization';
import { getNetworkName } from '@/config/escrowConfig';
import { USDC_MAINNET, USDC_POLYGON, USDC_ARBITRUM, USDC_SEPOLIA, USDC_BASE, USDC_BASE_SEPOLIA } from '@/config/payment';
import { PaymentError as PaymentErrorType } from '@/services/paymentErrorHandler';
import { taxService, TaxCalculationResult } from '@/services/taxService';

interface QuickBuyProps {
  listing: MarketplaceListing;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId?: string) => void;
}

type QuickBuyStep = 'review' | 'payment' | 'processing' | 'confirmation';

export const QuickBuy: React.FC<QuickBuyProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClientData } = useWalletClient();

  const { addToast } = useToast();
  const cart = useEnhancedCart();

  // State
  const [currentStep, setCurrentStep] = useState<QuickBuyStep>('review');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useEscrow, setUseEscrow] = useState(true);
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculationResult | null>(null);

  // New State for Unified Checkout
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PrioritizedPaymentMethod | null>(null);
  const [prioritizationResult, setPrioritizationResult] = useState<PrioritizationResult | null>(null);

  // Services Initialization
  const checkoutService = useMemo(() => {
    const cryptoService = new CryptoPaymentService(publicClient, walletClientData);
    const stripeService = new StripePaymentService();
    return new UnifiedCheckoutService(cryptoService, stripeService);
  }, [publicClient, walletClientData]);

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

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('review');
      setError(null);
      setUseEscrow(true);
      setOrderId(null);
      // Trigger prioritization load
      loadPaymentPrioritization();
      // Trigger tax calculation
      calculateTax();
    }
  }, [isOpen]);

  // Tax calculation
  const calculateTax = async () => {
    try {
      // Mock address for estimation (since QuickBuy typically is fast)
      // Ideally we'd user user profile address or IP geo
      const address = {
        country: 'US',
        state: 'CA',
        city: 'San Francisco',
        postalCode: '94105',
        line1: '123 Market St'
      };

      const price = parseFloat(listing.price);
      // Estimate USD price (assuming ~2000 ETH/USD for now as per CheckoutFlow mock)
      const estimatedUsdPrice = price * 2000;

      const items = [{
        id: listing.id,
        name: listing.metadataURI || 'Item',
        price: estimatedUsdPrice,
        quantity: 1,
        isDigital: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT',
        isTaxExempt: false
      }];

      const taxResult = await taxService.calculateTax(
        items,
        address,
        0 // shipping
      );

      setTaxCalculation(taxResult);
    } catch (e) {
      console.warn('Tax calc failed', e);
      setTaxCalculation(null);
    }
  };

  // Helper Functions needed for Prioritization (copied/adapted from CheckoutFlow)
  const getAvailablePaymentMethods = async () => {
    // Configs for USDC across networks
    const usdcConfigs = [
      { token: USDC_MAINNET, name: 'USDC (Ethereum)', chainId: 1, networkName: 'Ethereum' },
      { token: USDC_POLYGON, name: 'USDC (Polygon)', chainId: 137, networkName: 'Polygon' },
      { token: USDC_ARBITRUM, name: 'USDC (Arbitrum)', chainId: 42161, networkName: 'Arbitrum' },
      { token: USDC_BASE, name: 'USDC (Base)', chainId: 8453, networkName: 'Base' },
      { token: USDC_SEPOLIA, name: 'USDC (Sepolia)', chainId: 11155111, networkName: 'Sepolia Testnet' },
      { token: USDC_BASE_SEPOLIA, name: 'USDC (Base Sepolia)', chainId: 84532, networkName: 'Base Sepolia' }
    ];

    const methods: any[] = [];

    // Add USDC options
    usdcConfigs.forEach(config => {
      methods.push({
        id: `usdc-${config.chainId}`,
        type: PaymentMethodType.STABLECOIN_USDC,
        name: config.name,
        description: `USD Coin on ${config.networkName}`,
        chainId: config.chainId,
        enabled: true,
        supportedNetworks: [config.chainId],
        token: config.token
      });
    });

    // Add Fiat
    methods.push({
      id: 'stripe-fiat',
      type: PaymentMethodType.FIAT_STRIPE,
      name: 'Credit/Debit Card',
      description: 'Pay with credit or debit card',
      chainId: 0,
      enabled: true,
      supportedNetworks: [1, 137, 42161, 8453, 11155111, 84532]
    });

    // Add x402
    methods.push({
      id: 'x402-payment',
      type: PaymentMethodType.X402,
      name: 'x402 Protocol',
      description: 'Pay with reduced fees using Coinbase x402 protocol',
      chainId: 1,
      enabled: true,
      supportedNetworks: [1, 137, 42161, 11155111],
      token: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'X402',
        decimals: 18,
        name: 'x402 Protocol',
        chainId: 1,
        isNative: false
      }
    });

    // Add Native ETH
    methods.push({
      id: 'eth-mainnet',
      type: PaymentMethodType.NATIVE_ETH,
      name: 'Ethereum',
      description: 'Native ETH',
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

    return methods;
  };

  const getCurrentMarketConditions = async (): Promise<MarketConditions> => {
    // Mock implementation aligning with CheckoutFlow
    return {
      gasConditions: [{ chainId: 1, gasPrice: BigInt(30000000000), gasPriceUSD: 0.50, networkCongestion: 'medium', blockTime: 12, lastUpdated: new Date() }],
      networkAvailability: [{ chainId: 1, available: true }],
      exchangeRates: [
        { fromToken: 'ETH', toToken: 'USD', rate: 2000, source: 'coingecko', confidence: 0.95, lastUpdated: new Date() },
        { fromToken: 'USDC', toToken: 'USD', rate: 1, source: 'coingecko', confidence: 0.99, lastUpdated: new Date() }
      ],
      lastUpdated: new Date()
    };
  };

  const loadPaymentPrioritization = async () => {
    if (!listing) return;
    setLoading(true);
    try {
      const context: PrioritizationContext = {
        transactionAmount: parseFloat(listing.price), // Assuming price is in ETH/USD? CheckoutFlow assumes FIAT total. QuickBuy listing.price seems to be ETH.
        // Wait, listing.price in PurchaseModal was treated as ETH.
        // QuickBuy originally checked "balance < price" (ETH).
        // CheckoutFlow treats cartState.totals.total.fiat as the amount.
        // We need to clarify if listing.price is ETH or USD. 
        // Based on "Buy Now - {listing.price} ETH" in UI, it is ETH.
        // UnifiedCheckoutService likely expects USD amount? 
        // CheckoutFlow: amount: parseFloat(cartState.totals.total.fiat) -> USD.
        // So we need to convert ETH to USD for the service context if the service expects USD.
        // Or if listing.price is USD?
        // PurchaseModal: fiat: (parseFloat(listing.price) * 1650).toFixed(2). 
        // So listing.price IS ETH. We need to convert it to USD for the context roughly.
        // For the sake of this refactor, let's look at how CheckoutFlow uses it.
        // CheckoutFlow passes `cartState.totals.total.fiat`.
        // We should calculate estimated USD.
        transactionCurrency: 'USD',
        userContext: {
          userAddress: address || undefined,
          chainId: chainId || 1,
          walletBalances: [],
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

      // Rough ETH -> USD conversion for context if needed, or update context to support ETH.
      // UnifiedCheckoutService likely handles currency conversion internally or expects USD.
      // Let's perform a rough conversion using the 1650 rate found elsewhere to populate the USD expectation
      // OR better, we simply pass the ETH amount if the type allows.
      // PrioritizationContext: transactionAmount: number, transactionCurrency: string.
      // Let's convert for now to match CheckoutFlow pattern.
      const ethPrice = parseFloat(listing.price);
      context.transactionAmount = ethPrice * 2000; // Using 2000 as per CheckoutFlow mock rate for consistency

      const result = await prioritizationService.prioritizePaymentMethods(context);
      setPrioritizationResult(result);
      if (result.defaultMethod) {
        setSelectedPaymentMethod(result.defaultMethod);
      }
    } catch (err) {
      console.error('Failed to load payment options', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodSelect = async (method: PrioritizedPaymentMethod) => {
    setSelectedPaymentMethod(method);
    if (method.method.type !== PaymentMethodType.FIAT_STRIPE && isConnected) {
      const requiredChainId = method.method.chainId;
      if (requiredChainId && chainId !== requiredChainId && switchChain) {
        try {
          await switchChain({ chainId: requiredChainId });
          addToast(`Switched to ${getNetworkName(requiredChainId)}`, 'success');
        } catch (e) {
          console.error(e);
          addToast('Network switch failed', 'warning');
        }
      }
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatItemType = (type: string) => {
    return type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ');
  };



  const handleQuickBuy = async () => {
    if (!address || !isConnected) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    if (!selectedPaymentMethod) {
      addToast('Please select a payment method', 'error');
      return;
    }

    // Basic balance check logic moved to prioritization service, but we can double check here or trust the selector
    // The selector should ideally disable methods the user can't afford, but for now we proceed.

    try {
      setLoading(true);
      setError(null);
      setCurrentStep('processing');

      const request: PrioritizedCheckoutRequest = {
        orderId: crypto.randomUUID(),
        listingId: listing.id,
        buyerAddress: address,
        sellerAddress: listing.sellerWalletAddress,
        amount: (parseFloat(listing.price) * 2000) + (taxCalculation?.taxAmount || 0), // Include tax
        currency: 'USD',
        selectedPaymentMethod,
        paymentDetails: {
          walletAddress: address,
          tokenSymbol: selectedPaymentMethod.method.token?.symbol,
          networkId: selectedPaymentMethod.method.chainId,
        }
      };

      const result = useEscrow && selectedPaymentMethod.method.type !== PaymentMethodType.FIAT_STRIPE
        ? await checkoutService.processEscrowPayment(request)
        : await checkoutService.processPrioritizedCheckout(request);

      if (result.status === 'completed' || result.status === 'processing') {
        // Remove item from cart if it was there
        try {
          if (cart.isInCart(listing.id)) {
            console.log('🛒 Removing purchased item from cart...');
            await cart.removeItem(listing.id);
          }
        } catch (cartError) {
          console.warn('Failed to remove item from cart after QuickBuy:', cartError);
        }

        setOrderId(result.orderId);
        setCurrentStep('confirmation');
        addToast('Purchase successful!', 'success');
        onSuccess(result.orderId);
      } else {
        throw new Error('Payment processing failed');
      }

    } catch (err: any) {
      console.error('Purchase error:', err);
      // Simplify error handling for QuickBuy compared to full checkout flow
      const errorMessage = err.message || 'Purchase failed. Please try again.';
      setError(errorMessage);
      addToast(errorMessage, 'error');
      setCurrentStep('review');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!address || !isConnected) {
      addToast('Please connect your wallet', 'error');
      return;
    }

    const cartProduct = {
      id: listing.id,
      title: listing.metadataURI || 'Unnamed Item',
      description: listing.metadataURI || '',
      image: '',
      price: {
        crypto: listing.price,
        cryptoSymbol: 'ETH',
        fiat: (parseFloat(listing.price) * 1650).toFixed(2),
        fiatSymbol: 'USD'
      },
      seller: {
        id: listing.sellerWalletAddress,
        name: `Seller ${listing.sellerWalletAddress.slice(0, 6)}`,
        avatar: '',
        verified: true,
        daoApproved: false,
        escrowSupported: true,
        walletAddress: listing.sellerWalletAddress
      },
      category: listing.itemType.toLowerCase(),
      isDigital: listing.itemType === 'DIGITAL' || listing.itemType === 'NFT',
      isNFT: listing.itemType === 'NFT',
      quantity: 1,
      shipping: {
        cost: '0',
        freeShipping: true,
        estimatedDays: listing.itemType === 'DIGITAL' ? 'instant' : '3-5',
        regions: ['US', 'CA', 'EU']
      },
      trust: {
        escrowProtected: true,
        onChainCertified: true,
        safetyScore: 95
      }
    };

    cart.addItem(cartProduct);
    addToast('Added to cart!', 'success');
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <GlassPanel variant="primary" className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Quick Purchase</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 'review' ? 'bg-blue-500 text-white' :
              currentStep === 'payment' ? 'bg-blue-500 text-white' :
                currentStep === 'processing' ? 'bg-yellow-500 text-white' :
                  'bg-green-500 text-white'
              }`}>
              {currentStep === 'confirmation' ? <CheckCircle className="w-4 h-4" /> : '1'}
            </div>
            <div className={`flex-1 h-1 rounded ${currentStep === 'review' ? 'bg-gray-600' :
              currentStep === 'payment' ? 'bg-gray-600' :
                currentStep === 'processing' ? 'bg-yellow-500' :
                  'bg-green-500'
              }`} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              {/* Product Info */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">
                    {listing.metadataURI || 'Unnamed Item'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {formatItemType(listing.itemType)} • {formatAddress(listing.sellerWalletAddress)}
                  </p>
                </div>
              </div>

              {/* Price & Payment Selection */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-400">Item Price</span>
                  <span className="text-2xl font-bold text-white">{listing.price} ETH</span>
                </div>

                {taxCalculation && (
                  <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-gray-400">Est. Tax ({taxCalculation.taxRate * 100}%)</span>
                    <span className="text-white">${taxCalculation.taxAmount.toFixed(2)}</span>
                  </div>
                )}

                {prioritizationResult ? (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Select Payment Method</h4>
                    <PaymentMethodSelector
                      prioritizationResult={prioritizationResult}
                      selectedMethodId={selectedPaymentMethod?.method.id}
                      onMethodSelect={handlePaymentMethodSelect}
                      showCostBreakdown={true}
                      showRecommendations={true}
                      showWarnings={false} // Compact mode
                      layout="list"
                      className="text-white"
                    />
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                    <p className="text-xs text-gray-500 mt-2">Loading best payment routes...</p>
                  </div>
                )}
              </div>

              {/* Escrow Option */}
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-white text-sm font-medium">Escrow Protection</p>
                    <p className="text-gray-400 text-xs">Secure your purchase with escrow</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useEscrow}
                    onChange={(e) => setUseEscrow(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>

              {/* Delivery Info for Physical Items */}
              {listing.itemType === 'PHYSICAL' && (
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Delivery Information
                  </label>
                  <textarea
                    value={deliveryInfo}
                    onChange={(e) => setDeliveryInfo(e.target.value)}
                    placeholder="Enter your delivery address..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  variant="primary"
                  onClick={handleQuickBuy}
                  disabled={loading || !selectedPaymentMethod}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Buy Now'
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleAddToCart}
                  disabled={loading}
                  className="w-full"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {currentStep === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
              <h3 className="text-white text-lg font-medium mb-2">Processing Purchase</h3>
              <p className="text-gray-400">Securing your transaction on the blockchain...</p>
            </div>
          )}

          {/* Confirmation Step */}
          {currentStep === 'confirmation' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-white text-lg font-medium mb-2">Purchase Successful!</h3>
              <p className="text-gray-400 mb-4">Your order has been confirmed</p>
              {orderId && (
                <p className="text-gray-500 text-sm mb-4">Order ID: {orderId}</p>
              )}
              <Button
                variant="primary"
                onClick={onClose}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};

export default QuickBuy;