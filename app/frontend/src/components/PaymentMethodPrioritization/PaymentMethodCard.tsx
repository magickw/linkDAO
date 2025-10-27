/**
 * Payment Method Card Component
 * Displays individual payment methods with priority ordering, cost estimates, and recommendation reasons
 */

import React from 'react';
import { PrioritizedPaymentMethod, PaymentMethodType } from '../../types/paymentPrioritization';

interface PaymentMethodCardProps {
  paymentMethod: PrioritizedPaymentMethod;
  isSelected?: boolean;
  isRecommended?: boolean;
  onSelect: (method: PrioritizedPaymentMethod) => void;
  showCostBreakdown?: boolean;
  className?: string;
}

const PaymentMethodCard: React.FC<PaymentMethodCardProps> = ({
  paymentMethod,
  isSelected = false,
  isRecommended = false,
  onSelect,
  showCostBreakdown = true,
  className = ''
}) => {
  const { method, costEstimate, availabilityStatus, recommendationReason, priority, warnings, benefits } = paymentMethod;

  const getMethodIcon = (methodType: PaymentMethodType): string => {
    switch (methodType) {
      case PaymentMethodType.STABLECOIN_USDC:
        return '/icons/usdc.svg';
      case PaymentMethodType.STABLECOIN_USDT:
        return '/icons/usdt.svg';
      case PaymentMethodType.FIAT_STRIPE:
        return '/icons/credit-card.svg';
      case PaymentMethodType.NATIVE_ETH:
        return method.token?.symbol === 'MATIC' ? '/icons/matic.svg' : '/icons/eth.svg';
      default:
        return '/icons/payment-default.svg';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'unavailable_high_gas_fees':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'unavailable_insufficient_balance':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'unavailable_network_unsupported':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityBadgeColor = (priority: number): string => {
    if (priority === 1) return 'bg-green-100 text-green-800 border-green-300';
    if (priority === 2) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (priority === 3) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1: return 'Ethereum';
      case 137: return 'Polygon';
      case 56: return 'BSC';
      case 42161: return 'Arbitrum';
      case 10: return 'Optimism';
      case 8453: return 'Base';
      case 11155111: return 'Sepolia';
      case 84532: return 'Base Sepolia';
      case 0: return 'Fiat'; // For fiat payments
      default: return `Chain ${chainId}`;
    }
  };

  const getNetworkColor = (chainId: number): string => {
    switch (chainId) {
      case 1: return 'bg-blue-500'; // Ethereum
      case 137: return 'bg-purple-600'; // Polygon
      case 56: return 'bg-yellow-500'; // BSC
      case 42161: return 'bg-blue-600'; // Arbitrum
      case 10: return 'bg-red-500'; // Optimism
      case 8453: return 'bg-blue-400'; // Base
      case 11155111: return 'bg-purple-500'; // Sepolia
      case 84532: return 'bg-blue-300'; // Base Sepolia
      case 0: return 'bg-gray-500'; // Fiat
      default: return 'bg-gray-400';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const isAvailable = availabilityStatus === 'available';
  const isDisabled = !isAvailable;
  const isFiat = method.type === PaymentMethodType.FIAT_STRIPE;

  return (
    <div
      className={`
        relative p-4 border-2 rounded-lg transition-all duration-200 cursor-pointer
        ${isSelected 
          ? 'border-blue-500 bg-blue-500/10 shadow-md' 
          : isAvailable 
            ? 'border-white/20 bg-white/5 hover:border-white/30 hover:shadow-sm' 
            : 'border-white/10 bg-white/5 opacity-50 cursor-not-allowed'
        }
        ${isRecommended ? 'ring-2 ring-green-400 ring-opacity-50' : ''}
        ${className}
      `}
      onClick={() => isAvailable && onSelect(paymentMethod)}
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-disabled={isDisabled}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && isAvailable) {
          e.preventDefault();
          onSelect(paymentMethod);
        }
      }}
    >
      {/* Priority Badge */}
      <div className="absolute -top-2 -left-2">
        <div className={`
          px-2 py-1 text-xs font-semibold rounded-full border
          ${getPriorityBadgeColor(priority)}
        `}>
          #{priority}
        </div>
      </div>

      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -top-2 -right-2">
          <div className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 border border-green-300 rounded-full">
            Recommended
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <img
            src={getMethodIcon(method.type)}
            alt={method.name}
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/icons/payment-default.svg';
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${isDisabled ? 'text-white/50' : 'text-white'}`}>
                {method.name}
              </h3>
              {/* Network Badge */}
              {method.chainId !== undefined && method.chainId !== 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10">
                  <div className={`w-2 h-2 rounded-full ${getNetworkColor(method.chainId)}`}></div>
                  <span className="text-xs text-white/80 font-medium">
                    {getNetworkName(method.chainId)}
                  </span>
                </div>
              )}
            </div>
            <p className={`text-sm ${isDisabled ? 'text-white/40' : 'text-white/70'}`}>
              {method.description}
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`
          px-2 py-1 text-xs font-medium rounded-full border
          ${getStatusColor(availabilityStatus)}
        `}>
          {availabilityStatus === 'available' ? 'Available' : 'Unavailable'}
        </div>
      </div>

      {/* Cost Information */}
      {showCostBreakdown && (
        <div className="mb-3 p-3 bg-white/5 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-white/80">Total Cost</span>
            <span className={`text-lg font-bold ${isDisabled ? 'text-white/50' : 'text-white'}`}>
              {formatCurrency(costEstimate.totalCost, costEstimate.currency)}
            </span>
          </div>
          
          <div className="space-y-1 text-xs text-white/70">
            <div className="flex justify-between">
              <span>Base Amount</span>
              <span>{formatCurrency(costEstimate.baseCost, costEstimate.currency)}</span>
            </div>
            {costEstimate.gasFee > 0 && (
              <div className="flex justify-between">
                <span>Gas Fee</span>
                <span className={costEstimate.gasFee > 25 ? 'text-orange-400 font-medium' : ''}>
                  {formatCurrency(costEstimate.gasFee, costEstimate.currency)}
                </span>
              </div>
            )}
            {costEstimate.breakdown.platformFee && (
              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span>{formatCurrency(costEstimate.breakdown.platformFee, costEstimate.currency)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
            <span className="text-xs text-white/60">Est. Time</span>
            <span className="text-xs font-medium text-white">
              {isFiat ? 'Instant' : formatTime(costEstimate.estimatedTime)}
            </span>
          </div>
        </div>
      )}

      {/* Recommendation Reason */}
      <div className="mb-3">
        <p className={`text-sm ${isDisabled ? 'text-white/40' : 'text-white/80'}`}>
          {recommendationReason}
        </p>
      </div>

      {/* Benefits */}
      {benefits && benefits.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {benefits.map((benefit, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded-full"
              >
                ✓ {benefit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {warnings.map((warning, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 rounded-full"
              >
                ⚠ {warning}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Indicator */}
      <div className="flex items-center justify-between text-xs text-white/50">
        <span>Confidence</span>
        <div className="flex items-center space-x-1">
          <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                costEstimate.confidence >= 0.8 ? 'bg-green-500' :
                costEstimate.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${costEstimate.confidence * 100}%` }}
            />
          </div>
          <span>{Math.round(costEstimate.confidence * 100)}%</span>
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodCard;