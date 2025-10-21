/**
 * Cost Comparison Table Component
 * Displays total transaction costs for each method with gas fee warnings and cost breakdowns
 */

import React, { useState } from 'react';
import { PrioritizedPaymentMethod, PaymentMethodType } from '../../types/paymentPrioritization';

interface CostComparisonTableProps {
  paymentMethods: PrioritizedPaymentMethod[];
  selectedMethodId?: string;
  onMethodSelect?: (method: PrioritizedPaymentMethod) => void;
  showGasFeeWarnings?: boolean;
  showSavingsCalculation?: boolean;
  className?: string;
}

const CostComparisonTable: React.FC<CostComparisonTableProps> = ({
  paymentMethods,
  selectedMethodId,
  onMethodSelect,
  showGasFeeWarnings = true,
  showSavingsCalculation = true,
  className = ''
}) => {
  const [sortBy, setSortBy] = useState<'priority' | 'totalCost' | 'gasFee' | 'time'>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedTooltip, setExpandedTooltip] = useState<string | null>(null);

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

  const getGasFeeWarningLevel = (gasFee: number): 'none' | 'low' | 'medium' | 'high' => {
    if (gasFee === 0) return 'none';
    if (gasFee < 10) return 'low';
    if (gasFee < 25) return 'medium';
    return 'high';
  };

  const getGasFeeWarningColor = (level: 'none' | 'low' | 'medium' | 'high'): string => {
    switch (level) {
      case 'none':
        return 'text-green-600';
      case 'low':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const calculateSavings = (method: PrioritizedPaymentMethod): { amount: number; percentage: number } => {
    const mostExpensive = Math.max(...paymentMethods.map(m => m.costEstimate.totalCost));
    const savings = mostExpensive - method.costEstimate.totalCost;
    const percentage = mostExpensive > 0 ? (savings / mostExpensive) * 100 : 0;
    return { amount: savings, percentage };
  };

  const sortedMethods = [...paymentMethods].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (sortBy) {
      case 'priority':
        aValue = a.priority;
        bValue = b.priority;
        break;
      case 'totalCost':
        aValue = a.costEstimate.totalCost;
        bValue = b.costEstimate.totalCost;
        break;
      case 'gasFee':
        aValue = a.costEstimate.gasFee;
        bValue = b.costEstimate.gasFee;
        break;
      case 'time':
        aValue = a.costEstimate.estimatedTime;
        bValue = b.costEstimate.estimatedTime;
        break;
      default:
        aValue = a.priority;
        bValue = b.priority;
    }

    const result = aValue - bValue;
    return sortDirection === 'asc' ? result : -result;
  });

  const handleSort = (column: 'priority' | 'totalCost' | 'gasFee' | 'time') => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const CostBreakdownTooltip: React.FC<{ method: PrioritizedPaymentMethod }> = ({ method }) => (
    <div className="absolute z-10 p-3 bg-white border border-gray-200 rounded-lg shadow-lg min-w-64 top-full left-0 mt-1">
      <h4 className="font-semibold text-gray-900 mb-2">Cost Breakdown</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Base Amount:</span>
          <span className="font-medium">{formatCurrency(method.costEstimate.baseCost)}</span>
        </div>
        {method.costEstimate.gasFee > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-600">Gas Fee:</span>
            <span className={`font-medium ${getGasFeeWarningColor(getGasFeeWarningLevel(method.costEstimate.gasFee))}`}>
              {formatCurrency(method.costEstimate.gasFee)}
            </span>
          </div>
        )}
        {method.costEstimate.breakdown.platformFee && (
          <div className="flex justify-between">
            <span className="text-gray-600">Platform Fee:</span>
            <span className="font-medium">{formatCurrency(method.costEstimate.breakdown.platformFee)}</span>
          </div>
        )}
        {method.costEstimate.breakdown.networkFee && (
          <div className="flex justify-between">
            <span className="text-gray-600">Network Fee:</span>
            <span className="font-medium">{formatCurrency(method.costEstimate.breakdown.networkFee)}</span>
          </div>
        )}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span>{formatCurrency(method.costEstimate.totalCost)}</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Confidence: {Math.round(method.costEstimate.confidence * 100)}%
        </div>
      </div>
    </div>
  );

  return (
    <div className={`cost-comparison-table ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Cost Comparison
        </h3>
        <p className="text-sm text-gray-600">
          Compare total transaction costs across all available payment methods
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment Method
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center space-x-1">
                  <span>Priority</span>
                  {getSortIcon('priority')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('totalCost')}
              >
                <div className="flex items-center space-x-1">
                  <span>Total Cost</span>
                  {getSortIcon('totalCost')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('gasFee')}
              >
                <div className="flex items-center space-x-1">
                  <span>Gas Fee</span>
                  {getSortIcon('gasFee')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('time')}
              >
                <div className="flex items-center space-x-1">
                  <span>Est. Time</span>
                  {getSortIcon('time')}
                </div>
              </th>
              {showSavingsCalculation && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Savings
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedMethods.map((method) => {
              const gasFeeLevel = getGasFeeWarningLevel(method.costEstimate.gasFee);
              const savings = showSavingsCalculation ? calculateSavings(method) : null;
              const isSelected = selectedMethodId === method.method.id;
              const isAvailable = method.availabilityStatus === 'available';

              return (
                <tr
                  key={method.method.id}
                  className={`
                    ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'}
                    ${!isAvailable ? 'opacity-60' : ''}
                    ${onMethodSelect && isAvailable ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => {
                    if (onMethodSelect && isAvailable) {
                      onMethodSelect(method);
                    }
                  }}
                >
                  {/* Payment Method */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={getMethodIcon(method.method.type)}
                        alt={method.method.name}
                        className="w-8 h-8 rounded-full mr-3"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/icons/payment-default.svg';
                        }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {method.method.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {method.method.token?.symbol || 'Fiat'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${method.priority === 1 ? 'bg-green-100 text-green-800' :
                          method.priority === 2 ? 'bg-blue-100 text-blue-800' :
                          method.priority === 3 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'}
                      `}>
                        #{method.priority}
                      </span>
                      {method.priority === 1 && (
                        <span className="ml-2 text-xs text-green-600 font-medium">
                          Recommended
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Total Cost */}
                  <td className="px-4 py-4 whitespace-nowrap relative">
                    <div
                      className="flex items-center cursor-help"
                      onMouseEnter={() => setExpandedTooltip(method.method.id)}
                      onMouseLeave={() => setExpandedTooltip(null)}
                    >
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(method.costEstimate.totalCost)}
                      </span>
                      <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {expandedTooltip === method.method.id && (
                      <CostBreakdownTooltip method={method} />
                    )}
                  </td>

                  {/* Gas Fee */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`text-sm font-medium ${getGasFeeWarningColor(gasFeeLevel)}`}>
                        {method.costEstimate.gasFee === 0 ? 'Free' : formatCurrency(method.costEstimate.gasFee)}
                      </span>
                      {showGasFeeWarnings && gasFeeLevel === 'high' && (
                        <div className="ml-2 flex items-center">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="ml-1 text-xs text-red-600">High</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Estimated Time */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {formatTime(method.costEstimate.estimatedTime)}
                    </span>
                  </td>

                  {/* Savings */}
                  {showSavingsCalculation && savings && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      {savings.amount > 0 ? (
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(savings.amount)}
                          </span>
                          <span className="ml-1 text-xs text-green-500">
                            ({savings.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  )}

                  {/* Status */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${isAvailable 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'}
                    `}>
                      {isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Cheapest Option:</span>
            <div className="font-semibold text-green-600">
              {(() => {
                const cheapest = sortedMethods.reduce((min, method) => 
                  method.costEstimate.totalCost < min.costEstimate.totalCost ? method : min
                );
                return `${cheapest.method.name} - ${formatCurrency(cheapest.costEstimate.totalCost)}`;
              })()}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Fastest Option:</span>
            <div className="font-semibold text-blue-600">
              {(() => {
                const fastest = sortedMethods.reduce((min, method) => 
                  method.costEstimate.estimatedTime < min.costEstimate.estimatedTime ? method : min
                );
                return `${fastest.method.name} - ${formatTime(fastest.costEstimate.estimatedTime)}`;
              })()}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Recommended:</span>
            <div className="font-semibold text-purple-600">
              {(() => {
                const recommended = sortedMethods.find(method => method.priority === 1);
                return recommended ? recommended.method.name : 'None';
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostComparisonTable;