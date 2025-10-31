/**
 * Gas Fee Warning Component
 * Displays warnings for high-cost options with explanations and alternatives
 */

import React from 'react';
import { PrioritizedPaymentMethod, PaymentMethodType } from '../../types/paymentPrioritization';

interface GasFeeWarningProps {
  paymentMethods: PrioritizedPaymentMethod[];
  selectedMethod?: PrioritizedPaymentMethod;
  gasFeeThreshold?: number;
  onAlternativeSelect?: (method: PrioritizedPaymentMethod) => void;
  className?: string;
}

const GasFeeWarning: React.FC<GasFeeWarningProps> = ({
  paymentMethods,
  selectedMethod,
  gasFeeThreshold = 25, // $25 USD default threshold
  onAlternativeSelect,
  className = ''
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getWarningLevel = (gasFee: number): 'none' | 'medium' | 'high' | 'critical' => {
    if (gasFee < gasFeeThreshold) return 'none';
    if (gasFee < gasFeeThreshold * 2) return 'medium';
    if (gasFee < gasFeeThreshold * 4) return 'high';
    return 'critical';
  };

  const getWarningConfig = (level: 'none' | 'medium' | 'high' | 'critical') => {
    switch (level) {
      case 'medium':
        return {
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-600',
          title: 'Moderate Gas Fees',
          icon: '⚠️'
        };
      case 'high':
        return {
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600',
          title: 'High Gas Fees',
          icon: '🔥'
        };
      case 'critical':
        return {
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-600',
          title: 'Very High Gas Fees',
          icon: '🚨'
        };
      default:
        return null;
    }
  };

  const getAlternatives = (currentMethod: PrioritizedPaymentMethod): PrioritizedPaymentMethod[] => {
    return paymentMethods
      .filter(method => 
        method.method.id !== currentMethod.method.id &&
        method.availabilityStatus === 'available' &&
        method.costEstimate.gasFee < currentMethod.costEstimate.gasFee
      )
      .sort((a, b) => a.costEstimate.totalCost - b.costEstimate.totalCost)
      .slice(0, 3); // Show top 3 alternatives
  };

  const calculateSavings = (currentMethod: PrioritizedPaymentMethod, alternative: PrioritizedPaymentMethod): number => {
    return currentMethod.costEstimate.totalCost - alternative.costEstimate.totalCost;
  };

  const getMethodIcon = (methodType: PaymentMethodType): string => {
    switch (methodType) {
      case PaymentMethodType.STABLECOIN_USDC:
        return '/icons/usdc.svg';
      case PaymentMethodType.STABLECOIN_USDT:
        return '/icons/usdt.svg';
      case PaymentMethodType.FIAT_STRIPE:
        return '/icons/credit-card.svg';
      case PaymentMethodType.NATIVE_ETH:
        return '/icons/eth.svg';
      default:
        return '/icons/payment-default.svg';
    }
  };

  if (!selectedMethod) return null;

  const warningLevel = getWarningLevel(selectedMethod.costEstimate.gasFee);
  const warningConfig = getWarningConfig(warningLevel);

  if (!warningConfig) return null;

  const alternatives = getAlternatives(selectedMethod);
  const hasAlternatives = alternatives.length > 0;

  return (
    <div className={`gas-fee-warning ${className}`}>
      <div className={`
        p-4 rounded-lg border-2 
        ${warningConfig.bgColor} 
        ${warningConfig.borderColor}
      `}>
        {/* Header */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="text-2xl">{warningConfig.icon}</span>
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${warningConfig.textColor}`}>
              {warningConfig.title}
            </h3>
            <div className={`mt-1 text-sm ${warningConfig.textColor}`}>
              <p>
                The selected payment method ({selectedMethod.method.name}) has a gas fee of{' '}
                <span className="font-semibold">
                  {formatCurrency(selectedMethod.costEstimate.gasFee)}
                </span>
                , which is above the recommended threshold of {formatCurrency(gasFeeThreshold)}.
              </p>
            </div>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="mt-4 p-3 bg-white bg-opacity-50 rounded-lg">
          <h4 className={`text-sm font-semibold ${warningConfig.textColor} mb-2`}>
            Cost Breakdown
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Base Amount:</span>
              <div className="font-semibold">
                {formatCurrency(selectedMethod.costEstimate.baseCost)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Gas Fee:</span>
              <div className={`font-semibold ${warningConfig.textColor}`}>
                {formatCurrency(selectedMethod.costEstimate.gasFee)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Total Cost:</span>
              <div className="font-semibold text-lg">
                {formatCurrency(selectedMethod.costEstimate.totalCost)}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Gas % of Total:</span>
              <div className={`font-semibold ${warningConfig.textColor}`}>
                {((selectedMethod.costEstimate.gasFee / selectedMethod.costEstimate.totalCost) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-4">
          <h4 className={`text-sm font-semibold ${warningConfig.textColor} mb-2`}>
            Why are gas fees high?
          </h4>
          <div className={`text-sm ${warningConfig.textColor} space-y-1`}>
            <p>• Network congestion is causing higher transaction costs</p>
            <p>• Complex smart contract interactions require more gas</p>
            <p>• Current gas prices are above normal levels</p>
          </div>
        </div>

        {/* Alternatives */}
        {hasAlternatives && (
          <div className="mt-4">
            <h4 className={`text-sm font-semibold ${warningConfig.textColor} mb-3`}>
              💡 Consider these alternatives to save money:
            </h4>
            <div className="space-y-2">
              {alternatives.map((alternative) => {
                const savings = calculateSavings(selectedMethod, alternative);
                return (
                  <div
                    key={alternative.method.id}
                    className={`
                      flex items-center justify-between p-3 bg-white bg-opacity-70 rounded-lg
                      ${onAlternativeSelect ? 'cursor-pointer hover:bg-opacity-90 transition-all' : ''}
                    `}
                    onClick={() => onAlternativeSelect?.(alternative)}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={getMethodIcon(alternative.method.type)}
                        alt={alternative.method.name}
                        className="w-6 h-6 rounded-full"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          // Prevent infinite loop by checking if we're already using the fallback
                          if (!img.src.includes('payment-default.svg')) {
                            img.src = '/icons/payment-default.svg';
                          }
                        }}
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {alternative.method.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          Gas fee: {alternative.costEstimate.gasFee === 0 
                            ? 'Free' 
                            : formatCurrency(alternative.costEstimate.gasFee)
                          }
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">
                        Save {formatCurrency(savings)}
                      </div>
                      <div className="text-xs text-gray-600">
                        Total: {formatCurrency(alternative.costEstimate.totalCost)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            className={`
              flex-1 px-4 py-2 text-sm font-medium rounded-lg border-2 transition-colors
              ${warningConfig.borderColor} ${warningConfig.textColor}
              hover:bg-white hover:bg-opacity-50
            `}
            onClick={() => {
              // Could trigger a refresh of gas estimates
              window.location.reload();
            }}
          >
            🔄 Check Current Gas Prices
          </button>
          
          {hasAlternatives && onAlternativeSelect && (
            <button
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              onClick={() => onAlternativeSelect(alternatives[0])}
            >
              ✨ Use Cheapest Alternative
            </button>
          )}
        </div>

        {/* Additional Tips */}
        <div className="mt-4 pt-4 border-t border-gray-200 border-opacity-50">
          <h4 className={`text-sm font-semibold ${warningConfig.textColor} mb-2`}>
            💡 Tips to reduce gas fees:
          </h4>
          <div className={`text-xs ${warningConfig.textColor} space-y-1`}>
            <p>• Try again during off-peak hours (weekends, late nights UTC)</p>
            <p>• Consider using Layer 2 networks like Polygon or Arbitrum</p>
            <p>• Use stablecoins or fiat payment to avoid gas fees entirely</p>
            <p>• Set a lower gas price and wait longer for confirmation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GasFeeWarning;