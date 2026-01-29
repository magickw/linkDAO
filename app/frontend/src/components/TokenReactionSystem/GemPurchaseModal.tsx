/**
 * Enhanced Award Purchase Modal Component
 * Modal for purchasing gems/awards with integrated checkout system supporting USDC and fiat payments
 * Refactored to use viem/wagmi for consistency with checkout flow
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  useAccount,
  useChainId,
  useSwitchChain,
  usePublicClient,
  useWalletClient,
  useBalance
} from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useToast } from '../../context/ToastContext';
import { StripeProvider } from '../Payment/StripeProvider';
import { StripePaymentForm } from '../Payment/StripePaymentForm';
import { useX402 } from '@/hooks/useX402';
import { GasFeeService } from '@/services/gasFeeService';
import { PaymentError } from '@/services/paymentErrorHandler';
import {
  USDC_MAINNET,
  USDC_POLYGON,
  USDC_ARBITRUM,
  USDC_BASE,
  USDC_SEPOLIA,
  USDC_BASE_SEPOLIA,
  getChainConfig
} from '@/config/payment';
import { PaymentToken, GasFeeEstimate } from '@/types/payment';
import { Loader2, AlertCircle, CheckCircle, Zap, CreditCard, Wallet, Info } from 'lucide-react';

// Platform treasury address for receiving payments
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0xeF85C8CcC03320dA32371940b315D563be2585e5';

// Payment method types
const PaymentMethodType = {
  FIAT_STRIPE: 'FIAT_STRIPE',
  STABLECOIN_USDC: 'STABLECOIN_USDC',
  X402_PROTOCOL: 'X402_PROTOCOL'
} as const;

type PaymentMethodTypeValue = typeof PaymentMethodType[keyof typeof PaymentMethodType];

// USDC tokens by chain ID
const USDC_TOKENS: Record<number, PaymentToken> = {
  1: USDC_MAINNET,
  137: USDC_POLYGON,
  42161: USDC_ARBITRUM,
  8453: USDC_BASE,
  11155111: USDC_SEPOLIA,
  84532: USDC_BASE_SEPOLIA
};

// USDT tokens by chain ID
const USDT_TOKENS: Record<number, PaymentToken> = {
  1: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, symbol: 'USDT' }, // Ethereum Mainnet
  137: { address: '0xc2132D05D31c914a87C6611C105485024C443d30', decimals: 6, symbol: 'USDT' }, // Polygon
  42161: { address: '0xFd086Bc7E529487F2b2bE33fA0408f0F4C12EbD', decimals: 6, symbol: 'USDT' }, // Arbitrum
  8453: { address: '0x50c5725949A6F0c72E6C4a641F24049A817f0f7', decimals: 6, 'symbol': 'USDT' }, // Base
  11155111: { address: '0x337610d27c682E347C9cD60B4cB40bA37531707e', decimals: 18, symbol: 'USDT' }, // Sepolia
  84532: { address: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d6a', decimals: 18, 'symbol': 'USDT' }, // Base Sepolia
};

// Network configurations with gas estimates
const NETWORK_CONFIGS = {
  'base': {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    description: 'Lowest gas fees (~$0.01)',
    avgGasUSD: 0.01
  },
  'polygon': {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    description: 'Low fees (~$0.05)',
    avgGasUSD: 0.05
  },
  'arbitrum': {
    id: 'arbitrum',
    name: 'revenue',
    chainId: 42161,
    description: 'Layer 2 (~$0.02)',
    avgGasUSD: 0.02
  },
  'ethereum': {
    id: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    description: 'Mainnet (~$2-5)',
    avgGasUSD: 3.00
  }
};

interface PrioritizedPaymentMethod {
  method: {
    id: string;
    type: PaymentMethodTypeValue;
    name: string;
    description: string;
    chainId: number;
    enabled: boolean;
    supportedNetworks: number[];
    token?: PaymentToken;
  };
  availabilityStatus: 'available' | 'unavailable' | 'checking';
  costEstimate: {
    totalCost: number;
    baseCost: number;
    gasFees: number;
    processingFees: number;
    platformFees: number;
  };
  confidence: number;
  recommendationReason: string;
  isRecommended?: boolean;
}

interface GemPackage {
  id: string;
  amount: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

interface AwardPurchaseModalProps {
  isOpen: boolean;
  awardCost: number;
  currentGems: number;
  onPurchase: (packageId: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

const GemPurchaseModal: React.FC<AwardPurchaseModalProps> = ({
  isOpen,
  awardCost,
  currentGems,
  onPurchase,
  onClose,
  isLoading = false
}) => {
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { fetchWithAuth } = useX402();
  const { addToast } = useToast();

  // State
  const [selectedPackage, setSelectedPackage] = useState<string>('100');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PrioritizedPaymentMethod | null>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('base');
  const [selectedStablecoin, setSelectedStablecoin] = useState<'USDC' | 'USDT'>('USDC');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PrioritizedPaymentMethod[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  // Stripe payment state
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [showStripeForm, setShowStripeForm] = useState(false);

  // Gas estimation state
  const [gasEstimate, setGasEstimate] = useState<GasFeeEstimate | null>(null);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string>('0');

  // Gem packages
  const gemPackages: GemPackage[] = [
    { id: '100', amount: 100, price: 1.79 },
    { id: '200', amount: 200, price: 3.59, popular: true },
    { id: '300', amount: 300, price: 5.39, bonus: 50 },
    { id: '500', amount: 500, price: 8.99, bonus: 100 },
    { id: '1000', amount: 1000, price: 16.99, bonus: 250 }
  ];

  const selectedPackageData = gemPackages.find(pkg => pkg.id === selectedPackage);
  const gemsNeeded = Math.max(0, awardCost - currentGems);
  const remainingGems = currentGems + (selectedPackageData?.amount || 0) - awardCost;

  // Package themes
  const packageThemes: Record<string, { name: string; icon: string; description: string }> = {
    '100': { name: 'Starter Stack', icon: '🚀', description: 'Perfect for your first awards' },
    '200': { name: 'DeFi Degen', icon: '🔥', description: 'For the true degen in you' },
    '300': { name: 'Whale Pack', icon: '🐋', description: 'Make a splash with big awards' },
    '500': { name: 'Diamond Hands', icon: '💎', description: 'HODL strong, award stronger' },
    '1000': { name: 'OG Collection', icon: '👑', description: 'Legendary status unlocked' }
  };

  // Gas fee service
  const gasFeeService = useMemo(() => {
    if (publicClient) {
      return new GasFeeService(publicClient);
    }
    return null;
  }, [publicClient]);

  // Get token for selected network and stablecoin
  const getSelectedToken = useCallback(() => {
    const networkConfig = NETWORK_CONFIGS[selectedNetworkId as keyof typeof NETWORK_CONFIGS];
    if (!networkConfig) return null;

    if (selectedStablecoin === 'USDC') {
      return USDC_TOKENS[networkConfig.chainId] || null;
    } else {
      return USDT_TOKENS[networkConfig.chainId] || null;
    }
  }, [selectedNetworkId, selectedStablecoin]);

  // Get USDC token for current network selection
  const getSelectedUSDCToken = useCallback(() => {
    return getSelectedToken();
  }, [getSelectedToken]);

  // Fetch USDC balance for selected network
  const fetchStablecoinBalance = useCallback(async () => {
    if (!address || !publicClient || !isConnected) {
      setUsdcBalance('0');
      return;
    }

    const token = getSelectedToken();
    if (!token) {
      setUsdcBalance('0');
      return;
    }

    try {
      const balance = await publicClient.readContract({
        address: token.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address]
      }) as bigint;

      setUsdcBalance(formatUnits(balance as bigint, token.decimals));
    } catch (error) {
      console.error(`Error fetching ${selectedStablecoin} balance:`, error);
      setUsdcBalance('0');
    }
  }, [address, publicClient, getSelectedToken, selectedStablecoin, isConnected]);

  // Estimate gas for USDC transfer
  const estimateGas = useCallback(async () => {
    if (!gasFeeService || !selectedPackageData || !address) return;

    const token = getSelectedToken();
    if (!token) return;

    setIsEstimatingGas(true);
    try {
      const amount = parseUnits(selectedPackageData.price.toString(), token.decimals);

      // Encode transfer function data
      const transferData = `0xa9059cbb${TREASURY_ADDRESS.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;

      const estimate = await gasFeeService.estimateGasFees(
        token.address,
        transferData,
        0n,
        'standard'
      );

      setGasEstimate(estimate);
    } catch (error) {
      console.error('Error estimating gas:', error);
      // Use fallback estimate
      const networkConfig = NETWORK_CONFIGS[selectedNetworkId as keyof typeof NETWORK_CONFIGS];
      setGasEstimate({
        gasLimit: 65000n,
        gasPrice: 0n,
        totalCost: 0n,
        totalCostUSD: networkConfig?.avgGasUSD || 0.01
      });
    } finally {
      setIsEstimatingGas(false);
    }
  }, [gasFeeService, selectedPackageData, address, getSelectedToken, selectedNetworkId]);

  // Load payment methods with cost comparison
  const loadPaymentMethods = useCallback(async () => {
    if (!selectedPackageData) return;

    setIsLoadingMethods(true);

    const methods: PrioritizedPaymentMethod[] = [];

    // x402 Protocol - Ultra low fees
    methods.push({
      method: {
        id: 'x402-protocol',
        type: PaymentMethodType.X402_PROTOCOL,
        name: 'x402 Protocol',
        description: 'Ultra-low fee payment (~$0.01)',
        chainId: 8453, // Base
        enabled: true,
        supportedNetworks: [8453]
      },
      availabilityStatus: isConnected ? 'available' : 'unavailable',
      costEstimate: {
        totalCost: selectedPackageData.price + 0.01,
        baseCost: selectedPackageData.price,
        gasFees: 0.01,
        processingFees: 0,
        platformFees: 0
      },
      confidence: 0.95,
      recommendationReason: 'Lowest fees available (~$0.01)',
      isRecommended: true
    });

    // USDC on various networks
    for (const [networkId, config] of Object.entries(NETWORK_CONFIGS)) {
      const usdcToken = USDC_TOKENS[config.chainId];
      const usdtToken = USDT_TOKENS[config.chainId];
      
      if (usdcToken) {
        methods.push({
          method: {
            id: networkId,
            type: PaymentMethodType.STABLECOIN_USDC,
            name: `USDC on ${config.name}`,
            description: config.description,
            chainId: config.chainId,
            enabled: true,
            supportedNetworks: [config.chainId],
            token: usdcToken
          },
          availabilityStatus: isConnected ? 'available' : 'unavailable',
          costEstimate: {
            totalCost: selectedPackageData.price + config.avgGasUSD,
            baseCost: selectedPackageData.price,
            gasFees: config.avgGasUSD,
            processingFees: 0,
            platformFees: 0
          },
          confidence: 0.90,
          recommendationReason: config.description
        });
      }

      if (usdtToken) {
        methods.push({
          method: {
            id: `${networkId}-usdt`,
            type: PaymentMethodType.STABLECOIN_USDC, // Reusing same type for now
            name: `USDT on ${config.name}`,
            description: config.description,
            chainId: config.chainId,
            enabled: true,
            supportedNetworks: [config.chainId],
            token: usdtToken
          },
          availabilityStatus: isConnected ? 'available' : 'unavailable',
          costEstimate: {
            totalCost: selectedPackageData.price + config.avgGasUSD,
            baseCost: selectedPackageData.price,
            gasFees: config.avgGasUSD,
            processingFees: 0,
            platformFees: 0
          },
          confidence: 0.85,
          recommendationReason: `Alternative stablecoin on ${config.name}`
        });
      }
    }

    // Credit/Debit Card (Stripe)
    const stripeFee = selectedPackageData.price * 0.029 + 0.30;
    methods.push({
      method: {
        id: 'stripe-fiat',
        type: PaymentMethodType.FIAT_STRIPE,
        name: 'Credit/Debit Card',
        description: 'Pay with card (2.9% + $0.30 fee)',
        chainId: 0,
        enabled: true,
        supportedNetworks: []
      },
      availabilityStatus: 'available',
      costEstimate: {
        totalCost: selectedPackageData.price + stripeFee,
        baseCost: selectedPackageData.price,
        gasFees: 0,
        processingFees: stripeFee,
        platformFees: 0
      },
      confidence: 0.99,
      recommendationReason: 'No crypto wallet needed, instant'
    });

    // Sort by total cost
    methods.sort((a, b) => a.costEstimate.totalCost - b.costEstimate.totalCost);

    setPaymentMethods(methods);
    setIsLoadingMethods(false);

    // Select the cheapest method by default
    if (methods.length > 0 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(methods[0]);
    }
  }, [selectedPackageData, isConnected, selectedPaymentMethod]);

  // Effects
  useEffect(() => {
    if (isOpen) {
      // Auto-select package that covers the award cost
      const suitablePackage = gemPackages.find(pkg => pkg.amount >= gemsNeeded);
      if (suitablePackage) {
        setSelectedPackage(suitablePackage.id);
      }
      loadPaymentMethods();
    }
  }, [isOpen, gemsNeeded]);

  useEffect(() => {
    loadPaymentMethods();
  }, [selectedPackage]);

  useEffect(() => {
    if (selectedPaymentMethod?.method.type === PaymentMethodType.STABLECOIN_USDC) {
      fetchStablecoinBalance();
      estimateGas();
    }
  }, [selectedPaymentMethod, selectedNetworkId, selectedStablecoin, fetchStablecoinBalance, estimateGas]);

  // Handle package selection
  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
    setSelectedPaymentMethod(null); // Reset payment method to recalculate
  };

  // Handle payment method selection
  const handlePaymentMethodSelect = (method: PrioritizedPaymentMethod) => {
    setSelectedPaymentMethod(method);
    if (method.method.type === PaymentMethodType.STABLECOIN_USDC) {
      // Check if this is a USDT method (e.g., "base-usdt", "polygon-usdt")
      if (method.method.id.includes('-usdt')) {
        setSelectedStablecoin('USDT');
        setSelectedNetworkId(method.method.id.replace('-usdt', ''));
      } else {
        setSelectedStablecoin('USDC');
        setSelectedNetworkId(method.method.id);
      }
    }
  };

  // Process x402 payment
  const processX402Payment = async (): Promise<string> => {
    if (!selectedPackageData) throw new Error('No package selected');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io';

    const response = await fetchWithAuth(`${apiUrl}/api/x402-payments/gem-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: selectedPackage,
        amount: selectedPackageData.price,
        userId: address
      })
    });

    if (!response.ok) {
      throw new Error('x402 payment failed');
    }

    const result = await response.json();
    return result.transactionId;
  };

  // Process USDC payment using viem
  const processUSDCPayment = async (): Promise<string> => {
    if (!walletClient || !address || !publicClient || !selectedPackageData) {
      throw new Error('Wallet not connected');
    }

    const token = getSelectedToken();
    if (!token) throw new Error('Token not found');

    const networkConfig = NETWORK_CONFIGS[selectedNetworkId as keyof typeof NETWORK_CONFIGS];
    if (!networkConfig) throw new Error('Network not found');

    // Switch network if needed
    if (chainId !== networkConfig.chainId) {
      addToast(`Switching to ${networkConfig.name}...`, 'info');
      try {
        await switchChain({ chainId: networkConfig.chainId });
      } catch (error: any) {
        throw new Error(`Failed to switch network: ${error.message}`);
      }
    }

    const amount = parseUnits(selectedPackageData.price.toString(), token.decimals);

    // Check balance
    const balance = await publicClient.readContract({
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address]
    }) as bigint;

    if (balance < amount) {
      const formattedBalance = formatUnits(balance, token.decimals);
      throw new Error(`Insufficient ${selectedStablecoin}. You have ${parseFloat(formattedBalance).toFixed(2)} ${selectedStablecoin} but need ${selectedPackageData.price.toFixed(2)} ${selectedStablecoin}`);
    }

    addToast(`Please confirm the ${selectedStablecoin} transfer in your wallet...`, 'info');

    // Execute transfer
    const hash = await walletClient.writeContract({
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [TREASURY_ADDRESS as `0x${string}`, amount]
    });

    addToast('Transaction submitted. Waiting for confirmation...', 'info');

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
      throw new Error('Transaction failed');
    }

    return hash;
  };

  // Complete gem purchase on backend
  const completeGemPurchase = async (
    paymentId: string,
    packageId: string,
    paymentMethod: string,
    network?: string,
    transactionHash?: string
  ) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io';

    let authToken = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
    if (!authToken) {
      try {
        const sessionDataStr = localStorage.getItem('linkdao_session_data');
        if (sessionDataStr) {
          const sessionData = JSON.parse(sessionDataStr);
          authToken = sessionData.token || sessionData.accessToken || '';
        }
      } catch (e) {
        // Don't clear session data - let auth service handle session management
        console.warn('Failed to parse session data');
      }
    }

    const response = await fetch(`${apiUrl}/api/gems/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({
        paymentIntentId: paymentId,
        userId: address,
        packageId,
        gemAmount: selectedPackageData?.amount || 0,
        paymentMethod,
        network,
        transactionHash
      })
    });

    if (!response.ok) {
      throw new Error('Failed to complete gem purchase on backend');
    }

    const result = await response.json();
    if (result.success) {
      addToast('Receipt sent to your email!', 'success');
    }
  };

  // Main purchase handler
  const handlePurchase = async () => {
    if (!selectedPaymentMethod || !selectedPackageData) return;

    setIsProcessing(true);
    try {
      const methodType = selectedPaymentMethod.method.type;

      if (methodType === PaymentMethodType.FIAT_STRIPE) {
        // Create Stripe payment intent
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io';

        let authToken = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
        if (!authToken) {
          try {
            const sessionData = localStorage.getItem('linkdao_session_data');
            if (sessionData) {
              const parsed = JSON.parse(sessionData);
              authToken = parsed.token || parsed.accessToken || '';
            }
          } catch (e) {
            console.warn('Failed to parse session data');
          }
        }

        const response = await fetch(`${apiUrl}/api/gems/payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify({
            packageId: selectedPackage,
            paymentMethod: 'stripe',
            amount: Math.round(selectedPackageData.price * 100),
            currency: 'usd'
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create payment session');
        }

        const paymentIntent = await response.json();

        if (!paymentIntent.clientSecret) {
          throw new Error('No client secret received from server');
        }

        setStripeClientSecret(paymentIntent.clientSecret);
        setShowStripeForm(true);
        setIsProcessing(false);
        return;

      } else if (methodType === PaymentMethodType.X402_PROTOCOL) {
        // x402 ultra-low fee payment
        if (!isConnected) {
          addToast('Please connect your wallet first', 'error');
          setIsProcessing(false);
          return;
        }

        addToast('Processing x402 payment...', 'info');
        const transactionId = await processX402Payment();

        await completeGemPurchase(
          `x402-${transactionId}`,
          selectedPackage,
          'x402',
          'base',
          transactionId
        );

        addToast('Gem purchase successful!', 'success');
        await onPurchase(selectedPackage);
        onClose();

      } else if (methodType === PaymentMethodType.STABLECOIN_USDC) {
        // USDC/USDT payment
        if (!isConnected) {
          addToast('Please connect your wallet first', 'error');
          setIsProcessing(false);
          return;
        }

        const transactionHash = await processUSDCPayment();
        const network = selectedNetworkId;

        await completeGemPurchase(
          `crypto-${transactionHash}`,
          selectedPackage,
          selectedStablecoin.toLowerCase(),
          network,
          transactionHash
        );

        addToast('Gem purchase successful!', 'success');
        await onPurchase(selectedPackage);
        onClose();
      }

    } catch (error: any) {
      console.error('Purchase failed:', error);

      // Handle specific error types using PaymentError
      const paymentError = PaymentError.fromError(error);

      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        addToast('Transaction cancelled', 'info');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        addToast('Insufficient funds for gas fees', 'error');
      } else {
        addToast(paymentError.getUserFriendlyMessage(), 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Stripe handlers
  const handleStripeSuccess = async (paymentIntentId: string) => {
    try {
      await completeGemPurchase(paymentIntentId, selectedPackage, 'stripe');
      addToast('Gem purchase successful!', 'success');
      await onPurchase(selectedPackage);
      setShowStripeForm(false);
      setStripeClientSecret(null);
      onClose();
    } catch (error: any) {
      console.error('Error completing purchase:', error);
      addToast(`Error completing purchase: ${error.message}`, 'error');
    }
  };

  const handleStripeError = (error: Error) => {
    console.error('Stripe payment error:', error);
    addToast(`Payment failed: ${error.message}`, 'error');
  };

  const handleStripeCancel = () => {
    setShowStripeForm(false);
    setStripeClientSecret(null);
  };

  // Get chain name helper
  const getChainName = (targetChainId: number): string => {
    const config = getChainConfig(targetChainId);
    return config?.name || `Chain ${targetChainId}`;
  };

  if (!isOpen) return null;

  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {showStripeForm ? 'Complete Your Payment' : 'Buy gems to give this award'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {showStripeForm
                ? `You're purchasing ${selectedPackageData?.amount || 0} gems for $${selectedPackageData?.price || 0}`
                : `Gems are used to give awards. You need at least ${gemsNeeded} more gems for this award`}
            </p>
          </div>
          <button
            onClick={showStripeForm ? handleStripeCancel : onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stripe Payment Form */}
        {showStripeForm && stripeClientSecret && (
          <div className="p-6">
            <StripeProvider options={{ clientSecret: stripeClientSecret }}>
              <StripePaymentForm
                clientSecret={stripeClientSecret}
                amount={selectedPackageData?.price || 0}
                currency="USD"
                onSuccess={handleStripeSuccess}
                onError={handleStripeError}
                onCancel={handleStripeCancel}
                metadata={{
                  packageId: selectedPackage,
                  gemAmount: String(selectedPackageData?.amount || 0),
                  userId: address || 'anonymous'
                }}
              />
            </StripeProvider>
          </div>
        )}

        {/* Regular Purchase Flow */}
        {!showStripeForm && (
          <>
            {/* Gem Usage Info */}
            <div className="p-6 bg-blue-50 border-b border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <Info className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">How gems will be used</span>
              </div>
              <p className="text-sm text-blue-800">
                {awardCost} gems will automatically be used to give this award. {remainingGems} gems will go to your balance to use on future awards.
              </p>
            </div>

            {/* Gem Packages */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Gem Package</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                {gemPackages.map((pkg) => {
                  const theme = packageThemes[pkg.id];
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => handlePackageSelect(pkg.id)}
                      className={`
                        relative p-4 rounded-lg border-2 transition-all
                        ${selectedPackage === pkg.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      {pkg.popular && (
                        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                          <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            Most Popular
                          </span>
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-2xl mb-1">{theme.icon}</div>
                        <div className="text-xs font-medium text-gray-900 mb-1">{theme.name}</div>
                        <div className="text-lg font-bold text-gray-900">{pkg.amount}</div>
                        <div className="text-sm text-gray-600">gems</div>
                        <div className="text-lg font-bold text-gray-900 mt-2">${pkg.price}</div>
                        {pkg.bonus && (
                          <div className="text-xs text-green-600 mt-1">+{pkg.bonus} bonus</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Payment Method Selection with Cost Comparison */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method</h3>

                {/* Wallet Connection Warning */}
                {!isConnected && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <p className="text-sm text-yellow-800">
                        Connect your wallet for crypto payments (lowest fees)
                      </p>
                    </div>
                  </div>
                )}

                {/* Network and Stablecoin Selection Dropdowns */}
                {selectedPaymentMethod?.method.type === PaymentMethodType.STABLECOIN_USDC && (
                  <div className="mb-4 space-y-3">
                    {/* Network Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Network
                      </label>
                      <select
                        value={selectedNetworkId}
                        onChange={(e) => setSelectedNetworkId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        {Object.entries(NETWORK_CONFIGS).map(([id, config]) => {
                          const usdcToken = USDC_TOKENS[config.chainId];
                          const usdtToken = USDT_TOKENS[config.chainId];
                          const hasUSDC = !!usdcToken;
                          const hasUSDT = !!usdtToken;
                          
                          if (selectedStablecoin === 'USDC' && !hasUSDC) return null;
                          if (selectedStablecoin === 'USDT' && !hasUSDT) return null;
                          
                          return (
                            <option key={id} value={id}>
                              {config.name} - {config.description}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Stablecoin Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Stablecoin
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStablecoin('USDC')}
                          className={`
                            p-3 rounded-lg border-2 transition-all
                            ${selectedStablecoin === 'USDC'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">USDC</div>
                            <div className="text-xs text-gray-500">USD Coin</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedStablecoin('USDT')}
                          className={`
                            p-3 rounded-lg border-2 transition-all
                            ${selectedStablecoin === 'USDT'
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <div className="text-center">
                            <div className="font-semibold text-gray-900">USDT</div>
                            <div className="text-xs text-gray-500">Tether</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isLoadingMethods ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600">Calculating best payment options...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.method.id}
                        onClick={() => handlePaymentMethodSelect(method)}
                        disabled={method.availabilityStatus === 'unavailable'}
                        className={`
                          w-full p-4 rounded-lg border-2 transition-all text-left
                          ${selectedPaymentMethod?.method.id === method.method.id
                            ? 'border-blue-500 bg-blue-50'
                            : method.availabilityStatus === 'unavailable'
                              ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${method.method.type === PaymentMethodType.X402_PROTOCOL
                              ? 'bg-purple-100'
                              : method.method.type === PaymentMethodType.STABLECOIN_USDC
                                ? 'bg-green-100'
                                : 'bg-blue-100'
                              }`}>
                              {method.method.type === PaymentMethodType.X402_PROTOCOL ? (
                                <Zap className="w-5 h-5 text-purple-600" />
                              ) : method.method.type === PaymentMethodType.STABLECOIN_USDC ? (
                                <Wallet className="w-5 h-5 text-green-600" />
                              ) : (
                                <CreditCard className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{method.method.name}</h4>
                                {method.isRecommended && (
                                  <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    Best Value
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{method.recommendationReason}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              ${method.costEstimate.totalCost.toFixed(2)}
                            </div>
                            {method.costEstimate.gasFees > 0 && (
                              <div className="text-xs text-gray-500">
                                incl. ~${method.costEstimate.gasFees.toFixed(2)} gas
                              </div>
                            )}
                            {method.costEstimate.processingFees > 0 && (
                              <div className="text-xs text-gray-500">
                                incl. ${method.costEstimate.processingFees.toFixed(2)} fee
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Real-time Gas Estimation for Selected USDC Method */}
                {selectedPaymentMethod?.method.type === PaymentMethodType.STABLECOIN_USDC && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Your {selectedStablecoin} Balance:</span>
                      <span className="text-sm text-gray-900">{parseFloat(usdcBalance).toFixed(2)} {selectedStablecoin}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Estimated Gas:</span>
                      {isEstimatingGas ? (
                        <div className="flex items-center">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">Calculating...</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900">
                          ~${gasEstimate?.totalCostUSD?.toFixed(4) || '0.01'}
                        </span>
                      )}
                    </div>

                    {/* Network Switch Notice */}
                    {chainId !== selectedPaymentMethod.method.chainId && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                        <span className="text-xs text-yellow-700">
                          Will switch to {getChainName(selectedPaymentMethod.method.chainId)} when you click purchase
                        </span>
                      </div>
                    )}

                    {/* Balance Warning */}
                    {parseFloat(usdcBalance) < (selectedPackageData?.price || 0) && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span className="text-xs text-red-700">
                          Insufficient {selectedStablecoin} balance. You need ${selectedPackageData?.price.toFixed(2)} {selectedStablecoin}.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  By continuing you agree to our <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>.
                </p>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-xl font-bold text-gray-900">
                    ${(selectedPaymentMethod?.costEstimate.totalCost || selectedPackageData?.price || 0).toFixed(2)}
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
                  disabled={
                    !selectedPaymentMethod ||
                    isProcessing ||
                    isSwitchingChain ||
                    (selectedPaymentMethod?.method.type !== PaymentMethodType.FIAT_STRIPE && !isConnected)
                  }
                  className="flex-1 bg-blue-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing || isSwitchingChain ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isSwitchingChain ? 'Switching Network...' : 'Processing...'}</span>
                    </div>
                  ) : (
                    'Buy Gold and Give Award'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
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
    return (
      <ErrorBoundary>
        {modalContent}
      </ErrorBoundary>
    );
  }
};

export default GemPurchaseModal;
