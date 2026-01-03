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
import { useAccount, useConnect, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import {
  UnifiedCheckoutService
} from '@/services/firstPrioritization';
import {
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
  MarketConditions
} from '@/types/paymentPrioritization';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/context/ToastContext';
import { getNetworkName } from '@/config/escrowConfig';
import { USDC_MAINNET, USDC_POLYGON, USDC_ARBITRUM, USDC_SEPOLIA, USDC_BASE, USDC_BASE_SEPOLIA } from '@/config/payment';
import { TRANSACTION_HELPERS } from '@/config/networks';

import { PaymentErrorModal } from '@/components/Payment/PaymentErrorModal';
import { WalletConnectionPrompt } from '@/components/Payment/WalletConnectionPrompt';
import { StripeCheckout } from '@/components/Payment/StripeCheckout';
import ProductThumbnail from './ProductThumbnail';
import Link from 'next/link';
import { walletAssetDetectionService } from '@/services/walletAssetDetectionService';
import { TransactionSummary } from './TransactionSummary';

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
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { addToast } = useToast();

  // State management
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('review');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PrioritizedPaymentMethod | null>(null);
  const [prioritizationResult, setPrioritizationResult] = useState<PrioritizationResult | null>(null);
  const [recommendation, setRecommendation] = useState<CheckoutRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<PaymentErrorType | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [useEscrow, setUseEscrow] = useState(true);

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

  // Debounce cart, address, and chainId changes
  const debouncedCartItemsLength = useDebounce(cartState.items.length, 1000);
  const debouncedAddress = useDebounce(address, 1000);
  const debouncedChainId = useDebounce(chainId, 1000);

  // Load payment prioritization when debounced values change
  useEffect(() => {
    loadPaymentPrioritization();
  }, [debouncedCartItemsLength, debouncedAddress, debouncedChainId]);

  const loadPaymentPrioritization = async () => {
    if (cartState.items.length === 0) return;

    setLoading(true);
    try {
      // Create prioritization context WITHOUT wallet balance detection
      // Balance will only be checked when user selects a crypto payment method
      const context: PrioritizationContext = {
        transactionAmount: parseFloat(cartState.totals.total.fiat),
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
            currency: 'USD'
          },
          recommendationReason: method.type === PaymentMethodType.FIAT_STRIPE
            ? 'Instant payment with saved card'
            : 'Crypto payment available',
          warnings: [],
          benefits: []
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

      // Pre-select default method (but don't auto-advance)
      if (result.defaultMethod) {
        setSelectedPaymentMethod(result.defaultMethod);
      }

      // Keep user on payment method selection screen to allow choice
      setCurrentStep('payment-method');

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

  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod || !address) return;

    setLoading(true);
    setError(null);
    setPaymentError(null);

    try {
      // Create checkout request with selected payment method
      const request: PrioritizedCheckoutRequest = {
        orderId: `order_${Date.now()}`,
        listingId: cartState.items[0]?.id || '',
        buyerAddress: address,
        sellerAddress: cartState.items[0]?.seller.id || '',
        amount: parseFloat(cartState.totals.total.fiat),
        currency: 'USD',
        selectedPaymentMethod,
        paymentDetails: {
          // For crypto payments
          walletAddress: address,
          tokenSymbol: selectedPaymentMethod.method.token?.symbol,
          networkId: selectedPaymentMethod.method.chainId,
        }
      };

      // Process checkout with selected payment method
      const result = useEscrow && selectedPaymentMethod.method.type !== PaymentMethodType.FIAT_STRIPE
        ? await checkoutService.processEscrowPayment(request)
        : await checkoutService.processPrioritizedCheckout(request);

      if (result.status === 'completed' || result.status === 'processing') {
        setOrderData(result);
        setCurrentStep('confirmation');
        onComplete(result.orderId);
      } else {
        throw new Error('Payment processing failed');
      }
    } catch (err) {
      console.error('Checkout failed:', err);

      // Use PaymentError.fromError for intelligent error handling
      const paymentErr = PaymentErrorType.fromError(err);
      setPaymentError(paymentErr);
      setShowErrorModal(true);

      // Also show toast for immediate feedback
      addToast(paymentErr.userMessage, 'error');
    } finally {
      setLoading(false);
    }
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
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step.completed || currentStep === step.key
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
              <div className={`w-12 h-0.5 mx-2 ${step.completed ? 'bg-blue-500' : 'bg-white/30'
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
              <Link href={`/marketplace/product/${item.id}`}>
                <a className="hover:text-blue-400 transition-colors">
                  <h4 className="font-medium text-white truncate">{item.title}</h4>
                </a>
              </Link>
              <p className="text-white/70 text-sm">Qty: {item.quantity}</p>
              {item.seller && (
                <p className="text-white/60 text-xs">by {item.seller.name}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-medium text-white">${item.price.fiat}</p>
              {item.quantity > 1 && (
                <p className="text-white/60 text-xs">
                  ${(parseFloat(item.price.fiat) * item.quantity).toFixed(2)} total
                </p>
              )}
            </div>
          </div>
        ))}

        <hr className="border-white/20" />

        <div className="space-y-2">
          <div className="flex justify-between text-white/70">
            <span>Subtotal ({cartState.totals.itemCount} items)</span>
            <span>${cartState.totals.subtotal.fiat}</span>
          </div>
          {parseFloat(cartState.totals.shipping.fiat) > 0 && (
            <div className="flex justify-between text-white/70">
              <span>Shipping</span>
              <span>${cartState.totals.shipping.fiat}</span>
            </div>
          )}
          <div className="flex justify-between text-white/70">
            <span>Platform Fee (2.5%)</span>
            <span>${(parseFloat(cartState.totals.total.fiat) * 0.025).toFixed(2)}</span>
          </div>
          <hr className="border-white/20" />
          <div className="flex justify-between text-white font-semibold text-lg">
            <span>Total</span>
            <div className="text-right">
              <div>${cartState.totals.total.fiat}</div>
              <div className="text-sm text-white/60 font-normal">
                ≈ {cartState.totals.total.crypto} {cartState.totals.total.cryptoSymbol}
              </div>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Shield className="w-4 h-4 text-green-400" />
            <span>Escrow protected • Secure payment</span>
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

        {/* Enhanced Payment Method Selector with Transaction Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Methods - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
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
          </div>

          {/* Transaction Summary - Takes 1 column on large screens, sticky on desktop */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-6">
              <TransactionSummary
                selectedMethod={selectedPaymentMethod}
                totalAmount={parseFloat(cartState.totals.total.fiat)}
                onConfirm={() => setCurrentStep('payment-details')}
                isProcessing={loading}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };



  const handlePaymentSubmit = async () => {
    if (!selectedPaymentMethod) return;

    setLoading(true);
    setPaymentError(null);
    setShowErrorModal(false);

    try {
      // Process payment based on type
      if (selectedPaymentMethod.method.type === PaymentMethodType.FIAT_STRIPE) {
        // Stripe payment is handled by the Stripe component's onSuccess callback
        // This function will be called AFTER payment is confirmed
        setCurrentStep('processing');

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Create order record
        const orderId = `order_${Date.now()}`;
        setOrderData({
          orderId,
          status: 'completed',
          paymentPath: 'Stripe',
          estimatedCompletionTime: new Date(Date.now() + 30 * 60000)
        });
        setCurrentStep('confirmation');
      } else {
        // Crypto payment logic
        setCurrentStep('processing');

        // In a real implementation, we would call checkoutService.processPayment here
        // await checkoutService.processPayment(...)

        // Simulate blockchain transaction
        await new Promise(resolve => setTimeout(resolve, 3000));

        const orderId = `order_${Date.now()}`;
        setOrderData({
          orderId,
          status: 'processing',
          paymentPath: selectedPaymentMethod.method.name,
          transactionId: '0x' + Array(64).fill('0').map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          escrowType: useEscrow ? 'smart_contract' : 'none',
          estimatedCompletionTime: new Date(Date.now() + 15 * 60000)
        });
        setCurrentStep('confirmation');
      }

      addToast('Payment processed successfully!', 'success');
      // Ideally call onComplete after some time or user action
    } catch (err) {
      console.error('Payment failed:', err);
      setPaymentError(new PaymentErrorType({
        code: PaymentErrorCode.TRANSACTION_FAILED,
        message: err instanceof Error ? err.message : 'Payment processing failed',
        userMessage: 'Payment processing failed. Please try again.',
        recoveryOptions: [{
          action: 'retry',
          label: 'Try Again',
          description: 'Retry the payment',
          priority: 'primary'
        }],
        retryable: true
      }));
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
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