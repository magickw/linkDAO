/**
 * Payment Method Comparison Component
 * Helps users choose between crypto and fiat payment methods
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Wallet,
  TrendingDown,
  Clock,
  Shield,
  Zap,
  Globe,
  CheckCircle,
  AlertCircle,
  Info,
  Calculator
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import { UnifiedCheckoutService } from '@/services/unifiedCheckoutService';
import { CryptoPaymentService } from '@/services/cryptoPaymentService';
import { StripePaymentService } from '@/services/stripePaymentService';

interface PaymentMethodComparisonProps {
  amount: number;
  currency: string;
  buyerAddress?: string;
  userCountry?: string;
  onMethodSelect: (method: 'crypto' | 'fiat') => void;
}

interface PaymentComparison {
  crypto: {
    available: boolean;
    fees: number;
    estimatedTime: string;
    benefits: string[];
    requirements: string[];
    risks: string[];
    gasEstimate?: number;
    tokenOptions: Array<{
      symbol: string;
      name: string;
      balance?: number;
      usdValue?: number;
    }>;
  };
  fiat: {
    available: boolean;
    fees: number;
    estimatedTime: string;
    benefits: string[];
    requirements: string[];
    risks: string[];
    supportedCards: string[];
    processingCountries: string[];
  };
  recommendation: string;
  savings?: {
    method: 'crypto' | 'fiat';
    amount: number;
    percentage: number;
  };
}

export const PaymentMethodComparison: React.FC<PaymentMethodComparisonProps> = ({
  amount,
  currency,
  buyerAddress,
  userCountry,
  onMethodSelect
}) => {
  const [comparison, setComparison] = useState<PaymentComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<'crypto' | 'fiat' | null>(null);
  const [showDetails, setShowDetails] = useState<'crypto' | 'fiat' | null>(null);

  // Services
  const [checkoutService] = useState(() => {
    const cryptoService = new CryptoPaymentService();
    const stripeService = new StripePaymentService();
    return new UnifiedCheckoutService(cryptoService, stripeService);
  });

  useEffect(() => {
    loadComparison();
  }, [amount, currency, buyerAddress, userCountry]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const data = await checkoutService.getPaymentMethodComparison(
        buyerAddress || '',
        amount,
        currency,
        userCountry
      );

      // Transform and enhance the data
      const enhancedComparison: PaymentComparison = {
        crypto: {
          available: data.crypto.available,
          fees: data.crypto.fees,
          estimatedTime: data.crypto.estimatedTime || '1-5 minutes',
          benefits: [
            'Lower transaction fees',
            'Decentralized escrow protection',
            'No intermediary banks',
            'Global accessibility',
            'Transparent on-chain verification'
          ],
          requirements: [
            'Crypto wallet (MetaMask, etc.)',
            'Sufficient token balance',
            'Basic understanding of crypto',
            'Gas fees for transactions'
          ],
          risks: [
            'Price volatility during transaction',
            'Irreversible transactions',
            'Technical complexity',
            'Network congestion delays'
          ],
          gasEstimate: data.crypto.gasEstimate || 0.5,
          tokenOptions: [
            { symbol: 'USDC', name: 'USD Coin', balance: 1000, usdValue: 1000 },
            { symbol: 'ETH', name: 'Ethereum', balance: 0.5, usdValue: 1600 },
            { symbol: 'USDT', name: 'Tether', balance: 500, usdValue: 500 }
          ]
        },
        fiat: {
          available: data.fiat.available,
          fees: data.fiat.fees,
          estimatedTime: data.fiat.estimatedTime || 'Instant',
          benefits: [
            'Instant payment processing',
            'Familiar payment experience',
            'Buyer protection policies',
            'No crypto knowledge needed',
            'Stable pricing in local currency'
          ],
          requirements: [
            'Valid credit/debit card',
            'Billing address verification',
            'Sufficient card balance/limit',
            'Card enabled for online purchases'
          ],
          risks: [
            'Higher processing fees',
            'Potential chargebacks',
            'Geographic restrictions',
            'Bank processing delays'
          ],
          supportedCards: ['Visa', 'Mastercard', 'American Express', 'Discover'],
          processingCountries: ['US', 'CA', 'UK', 'EU', 'AU', 'JP', 'SG']
        },
        recommendation: data.recommendation,
        savings: data.crypto.fees < data.fiat.fees ? {
          method: 'crypto',
          amount: data.fiat.fees - data.crypto.fees,
          percentage: ((data.fiat.fees - data.crypto.fees) / data.fiat.fees) * 100
        } : {
          method: 'fiat',
          amount: data.crypto.fees - data.fiat.fees,
          percentage: ((data.crypto.fees - data.fiat.fees) / data.crypto.fees) * 100
        }
      };

      setComparison(enhancedComparison);
    } catch (error) {
      console.error('Failed to load payment comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodSelect = (method: 'crypto' | 'fiat') => {
    setSelectedMethod(method);
    onMethodSelect(method);
  };

  const renderLoadingState = () => (
    <div className="text-center py-12">
      <Calculator className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-pulse" />
      <h3 className="text-lg font-semibold text-white mb-2">Analyzing Payment Options</h3>
      <p className="text-white/70">Comparing fees, speed, and availability...</p>
    </div>
  );

  const renderMethodCard = (
    method: 'crypto' | 'fiat',
    data: PaymentComparison['crypto'] | PaymentComparison['fiat'],
    icon: React.ReactNode,
    title: string,
    subtitle: string
  ) => {
    const isRecommended = comparison?.recommendation.toLowerCase().includes(method);
    const isSelected = selectedMethod === method;

    return (
      <GlassPanel
        variant={isSelected ? "primary" : "secondary"}
        className={`p-6 cursor-pointer transition-all duration-300 ${
          !data.available ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
        } ${isRecommended ? 'ring-2 ring-blue-400' : ''}`}
        onClick={() => data.available && handleMethodSelect(method)}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${
                method === 'crypto' ? 'bg-orange-500/20' : 'bg-blue-500/20'
              }`}>
                {icon}
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <p className="text-white/70 text-sm">{subtitle}</p>
              </div>
            </div>
            
            {isRecommended && (
              <div className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
                Recommended
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-4 h-4 text-green-400" />
                <span className="text-white/70 text-xs">Fees</span>
              </div>
              <p className="font-bold text-white">${data.fees.toFixed(2)}</p>
            </div>
            
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-white/70 text-xs">Time</span>
              </div>
              <p className="font-bold text-white">{data.estimatedTime}</p>
            </div>
          </div>

          {/* Benefits Preview */}
          <div className="space-y-2">
            <h4 className="font-medium text-white text-sm">Key Benefits:</h4>
            <ul className="space-y-1">
              {data.benefits.slice(0, 3).map((benefit, index) => (
                <li key={index} className="flex items-center gap-2 text-white/70 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant={isSelected ? "primary" : "outline"}
              onClick={() => data.available && handleMethodSelect(method)}
              disabled={!data.available}
              className="flex-1"
            >
              {isSelected ? 'Selected' : 'Choose'}
            </Button>
            
            <Button
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setShowDetails(showDetails === method ? null : method);
              }}
              className="px-3"
            >
              <Info className="w-4 h-4" />
            </Button>
          </div>

          {/* Availability Status */}
          {!data.available && (
            <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm">Currently unavailable</span>
            </div>
          )}
        </div>
      </GlassPanel>
    );
  };

  const renderDetailedComparison = () => {
    if (!comparison || !showDetails) return null;

    const data = showDetails === 'crypto' ? comparison.crypto : comparison.fiat;
    const title = showDetails === 'crypto' ? 'Cryptocurrency Payment' : 'Credit Card Payment';

    return (
      <GlassPanel variant="secondary" className="p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">{title} Details</h3>
          <Button
            variant="ghost"
            onClick={() => setShowDetails(null)}
            className="text-white/70 hover:text-white"
          >
            ✕
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Benefits */}
          <div>
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Benefits
            </h4>
            <ul className="space-y-2">
              {data.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-white/70 text-sm">
                  <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Requirements */}
          <div>
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              Requirements
            </h4>
            <ul className="space-y-2">
              {data.requirements.map((requirement, index) => (
                <li key={index} className="flex items-start gap-2 text-white/70 text-sm">
                  <div className="w-3 h-3 border border-blue-400 rounded-full mt-0.5 flex-shrink-0" />
                  {requirement}
                </li>
              ))}
            </ul>
          </div>

          {/* Risks */}
          <div>
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              Considerations
            </h4>
            <ul className="space-y-2">
              {data.risks.map((risk, index) => (
                <li key={index} className="flex items-start gap-2 text-white/70 text-sm">
                  <AlertCircle className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                  {risk}
                </li>
              ))}
            </ul>
          </div>

          {/* Additional Info */}
          <div>
            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-purple-400" />
              {showDetails === 'crypto' ? 'Supported Tokens' : 'Supported Cards'}
            </h4>
            {showDetails === 'crypto' ? (
              <div className="space-y-2">
                {(data as PaymentComparison['crypto']).tokenOptions.map((token, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                    <span className="text-white text-sm">{token.symbol}</span>
                    <span className="text-white/70 text-xs">
                      {token.balance} ({token.usdValue ? `$${token.usdValue}` : 'N/A'})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(data as PaymentComparison['fiat']).supportedCards.map((card, index) => (
                  <span key={index} className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded">
                    {card}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    );
  };

  const renderSavingsHighlight = () => {
    if (!comparison?.savings) return null;

    const { method, amount, percentage } = comparison.savings;

    return (
      <GlassPanel variant="secondary" className="p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <TrendingDown className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">
              Save ${amount.toFixed(2)} ({percentage.toFixed(1)}%) with {method === 'crypto' ? 'Cryptocurrency' : 'Credit Card'}
            </h3>
            <p className="text-white/70 text-sm">
              {method === 'crypto' 
                ? 'Lower network fees and no payment processor markup'
                : 'Promotional rates and instant processing'
              }
            </p>
          </div>
        </div>
      </GlassPanel>
    );
  };

  if (loading) {
    return renderLoadingState();
  }

  if (!comparison) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Unable to Load Payment Options</h3>
        <p className="text-white/70 mb-4">Please try again or contact support if the issue persists.</p>
        <Button variant="primary" onClick={loadComparison}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Payment Method</h2>
        <p className="text-white/70">
          Compare options and select the best payment method for your purchase
        </p>
      </div>

      {/* Savings Highlight */}
      {renderSavingsHighlight()}

      {/* Payment Method Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderMethodCard(
          'crypto',
          comparison.crypto,
          <Wallet className="w-6 h-6 text-orange-400" />,
          'Cryptocurrency',
          'Pay with digital assets'
        )}
        
        {renderMethodCard(
          'fiat',
          comparison.fiat,
          <CreditCard className="w-6 h-6 text-blue-400" />,
          'Credit Card',
          'Pay with traditional methods'
        )}
      </div>

      {/* Detailed Comparison */}
      {renderDetailedComparison()}

      {/* Security Notice */}
      <GlassPanel variant="secondary" className="p-6">
        <div className="flex items-start gap-4">
          <Shield className="w-6 h-6 text-green-400 mt-1" />
          <div>
            <h3 className="font-semibold text-white mb-2">Secure Escrow Protection</h3>
            <p className="text-white/70 text-sm">
              Regardless of your payment method, all transactions are protected by escrow. 
              Your funds are held securely until you confirm delivery, ensuring safe transactions for both buyers and sellers.
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Quick Comparison Table */}
      <GlassPanel variant="secondary" className="p-6">
        <h3 className="font-semibold text-white mb-4">Quick Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left text-white/70 pb-2">Feature</th>
                <th className="text-center text-white/70 pb-2">Cryptocurrency</th>
                <th className="text-center text-white/70 pb-2">Credit Card</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              <tr className="border-b border-white/10">
                <td className="py-2 text-white/70">Transaction Fees</td>
                <td className="py-2 text-center text-white">${comparison.crypto.fees.toFixed(2)}</td>
                <td className="py-2 text-center text-white">${comparison.fiat.fees.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-2 text-white/70">Processing Time</td>
                <td className="py-2 text-center text-white">{comparison.crypto.estimatedTime}</td>
                <td className="py-2 text-center text-white">{comparison.fiat.estimatedTime}</td>
              </tr>
              <tr className="border-b border-white/10">
                <td className="py-2 text-white/70">Reversibility</td>
                <td className="py-2 text-center text-red-400">No</td>
                <td className="py-2 text-center text-green-400">Yes</td>
              </tr>
              <tr>
                <td className="py-2 text-white/70">Global Access</td>
                <td className="py-2 text-center text-green-400">Yes</td>
                <td className="py-2 text-center text-yellow-400">Limited</td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
};

export default PaymentMethodComparison;