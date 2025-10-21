/**
 * Payment Method Prioritization Demo
 * Demonstrates the core payment method prioritization functionality
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  CreditCard, 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { Button } from '@/design-system/components/Button';
import { GlassPanel } from '@/design-system/components/GlassPanel';
import {
  paymentPrioritizationFactory,
  PaymentMethodType,
  PrioritizedPaymentMethod,
  PrioritizationResult,
  AvailabilityStatus
} from '@/services/paymentPrioritization';

interface PaymentMethodPrioritizationDemoProps {
  transactionAmount?: number;
  chainId?: number;
}

export const PaymentMethodPrioritizationDemo: React.FC<PaymentMethodPrioritizationDemoProps> = ({
  transactionAmount = 100,
  chainId = 1
}) => {
  const { address } = useAccount();
  const [prioritizationResult, setPrioritizationResult] = useState<PrioritizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrioritization();
  }, [address, transactionAmount, chainId]);

  const loadPrioritization = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await paymentPrioritizationFactory.quickSetup(
        address,
        chainId,
        transactionAmount
      );

      const prioritization = await result.prioritize();
      setPrioritizationResult(prioritization);
    } catch (err: any) {
      console.error('Prioritization failed:', err);
      setError(err.message || 'Failed to load payment method prioritization');
    } finally {
      setLoading(false);
    }
  };

  const getMethodIcon = (methodType: PaymentMethodType) => {
    switch (methodType) {
      case PaymentMethodType.STABLECOIN_USDC:
      case PaymentMethodType.STABLECOIN_USDT:
        return <DollarSign className="w-5 h-5 text-green-400" />;
      case PaymentMethodType.FIAT_STRIPE:
        return <CreditCard className="w-5 h-5 text-blue-400" />;
      case PaymentMethodType.NATIVE_ETH:
        return <Wallet className="w-5 h-5 text-orange-400" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAvailabilityColor = (status: AvailabilityStatus) => {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return 'text-green-400';
      case AvailabilityStatus.UNAVAILABLE_HIGH_GAS_FEES:
        return 'text-yellow-400';
      default:
        return 'text-red-400';
    }
  };

  const getAvailabilityIcon = (status: AvailabilityStatus) => {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return <CheckCircle className="w-4 h-4" />;
      case AvailabilityStatus.UNAVAILABLE_HIGH_GAS_FEES:
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <GlassPanel variant="secondary" className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white/70">Analyzing payment methods...</p>
        </div>
      </GlassPanel>
    );
  }

  if (error) {
    return (
      <GlassPanel variant="secondary" className="p-6">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button variant="outline" onClick={loadPrioritization}>
            Retry
          </Button>
        </div>
      </GlassPanel>
    );
  }

  if (!prioritizationResult) {
    return (
      <GlassPanel variant="secondary" className="p-6">
        <div className="text-center">
          <Info className="w-8 h-8 text-blue-400 mx-auto mb-4" />
          <p className="text-white/70">No prioritization data available</p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Payment Method Prioritization
        </h2>
        <p className="text-white/70">
          Smart payment method ordering for ${transactionAmount} transaction
        </p>
      </div>

      {/* Default Method Highlight */}
      {prioritizationResult.defaultMethod && (
        <GlassPanel variant="primary" className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Recommended</h3>
              <p className="text-white/70 text-sm">
                {prioritizationResult.defaultMethod.method.name} - {prioritizationResult.defaultMethod.recommendationReason}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-white font-semibold">
                ${prioritizationResult.defaultMethod.costEstimate.totalCost.toFixed(2)}
              </p>
              <p className="text-white/60 text-sm">
                {prioritizationResult.defaultMethod.costEstimate.estimatedTime}min
              </p>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Prioritized Methods List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">All Payment Methods</h3>
        {prioritizationResult.prioritizedMethods.map((prioritizedMethod, index) => (
          <PaymentMethodCard
            key={prioritizedMethod.method.id}
            prioritizedMethod={prioritizedMethod}
            rank={index + 1}
            isRecommended={prioritizedMethod === prioritizationResult.defaultMethod}
          />
        ))}
      </div>

      {/* Recommendations */}
      {prioritizationResult.recommendations.length > 0 && (
        <GlassPanel variant="secondary" className="p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            Recommendations
          </h3>
          <div className="space-y-2">
            {prioritizationResult.recommendations.map((rec, index) => (
              <div key={index} className="text-sm">
                <p className="text-white/80">{rec.message}</p>
                {rec.potentialSavings && (
                  <p className="text-green-400">
                    Potential savings: ${rec.potentialSavings.toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Warnings */}
      {prioritizationResult.warnings.length > 0 && (
        <GlassPanel variant="secondary" className="p-4">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Warnings
          </h3>
          <div className="space-y-2">
            {prioritizationResult.warnings.map((warning, index) => (
              <div key={index} className="text-sm">
                <p className="text-yellow-400">{warning.message}</p>
                {warning.actionRequired && (
                  <p className="text-white/70 mt-1">{warning.actionRequired}</p>
                )}
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Metadata */}
      <div className="text-center text-white/50 text-xs">
        <p>
          Analyzed {prioritizationResult.metadata.totalMethodsEvaluated} methods in{' '}
          {prioritizationResult.metadata.processingTimeMs}ms
        </p>
        <p>
          Average confidence: {(prioritizationResult.metadata.averageConfidence * 100).toFixed(1)}%
        </p>
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <Button variant="outline" onClick={loadPrioritization}>
          Refresh Prioritization
        </Button>
      </div>
    </div>
  );
};

// Individual Payment Method Card Component
interface PaymentMethodCardProps {
  prioritizedMethod: PrioritizedPaymentMethod;
  rank: number;
  isRecommended: boolean;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  prioritizedMethod,
  rank,
  isRecommended
}) => {
  const { method, costEstimate, availabilityStatus, warnings, benefits } = prioritizedMethod;

  const getMethodIcon = (methodType: PaymentMethodType) => {
    switch (methodType) {
      case PaymentMethodType.STABLECOIN_USDC:
      case PaymentMethodType.STABLECOIN_USDT:
        return <DollarSign className="w-5 h-5 text-green-400" />;
      case PaymentMethodType.FIAT_STRIPE:
        return <CreditCard className="w-5 h-5 text-blue-400" />;
      case PaymentMethodType.NATIVE_ETH:
        return <Wallet className="w-5 h-5 text-orange-400" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAvailabilityColor = (status: AvailabilityStatus) => {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return 'text-green-400';
      case AvailabilityStatus.UNAVAILABLE_HIGH_GAS_FEES:
        return 'text-yellow-400';
      default:
        return 'text-red-400';
    }
  };

  const getAvailabilityIcon = (status: AvailabilityStatus) => {
    switch (status) {
      case AvailabilityStatus.AVAILABLE:
        return <CheckCircle className="w-4 h-4" />;
      case AvailabilityStatus.UNAVAILABLE_HIGH_GAS_FEES:
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <GlassPanel 
      variant={isRecommended ? "primary" : "secondary"} 
      className={`p-4 ${isRecommended ? 'ring-2 ring-blue-400' : ''}`}
    >
      <div className="flex items-start gap-4">
        {/* Rank and Icon */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isRecommended ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70'
          }`}>
            {rank}
          </div>
          <div className="p-2 bg-white/10 rounded-lg">
            {getMethodIcon(method.type)}
          </div>
        </div>

        {/* Method Details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white">{method.name}</h4>
            {isRecommended && (
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                Recommended
              </span>
            )}
            <div className={`flex items-center gap-1 ${getAvailabilityColor(availabilityStatus)}`}>
              {getAvailabilityIcon(availabilityStatus)}
              <span className="text-xs capitalize">
                {availabilityStatus.replace('unavailable_', '').replace('_', ' ')}
              </span>
            </div>
          </div>
          
          <p className="text-white/70 text-sm mb-2">{method.description}</p>
          
          {/* Cost Breakdown */}
          <div className="grid grid-cols-3 gap-4 text-sm mb-2">
            <div>
              <p className="text-white/60">Total Cost</p>
              <p className="text-white font-semibold">${costEstimate.totalCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-white/60">Gas Fee</p>
              <p className="text-white">${costEstimate.gasFee.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-white/60">Time</p>
              <p className="text-white flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {costEstimate.estimatedTime}min
              </p>
            </div>
          </div>

          {/* Benefits */}
          {benefits && benefits.length > 0 && (
            <div className="mb-2">
              <div className="flex flex-wrap gap-1">
                {benefits.slice(0, 2).map((benefit, index) => (
                  <span key={index} className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {warnings.slice(0, 2).map((warning, index) => (
                <span key={index} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                  {warning}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Score */}
        <div className="text-right">
          <p className="text-white/60 text-xs">Score</p>
          <p className="text-white font-semibold">
            {(prioritizedMethod.totalScore * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </GlassPanel>
  );
};



export default PaymentMethodPrioritizationDemo;