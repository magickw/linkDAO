import React from 'react';
import { TrendingDown, Zap, DollarSign, Clock } from 'lucide-react';

interface FeeBreakdown {
    method: string;
    baseFee: number;
    gasFee: number;
    totalFee: number;
    estimatedTime: string;
    icon: string;
    color: string;
}

interface FeeComparisonCardProps {
    orderAmount: number;
    className?: string;
}

export function FeeComparisonCard({ orderAmount, className = '' }: FeeComparisonCardProps) {
    // Calculate fees for different payment methods
    const feeBreakdowns: FeeBreakdown[] = [
        {
            method: 'x402 Protocol',
            baseFee: 0.1,
            gasFee: 0,
            totalFee: 0.1,
            estimatedTime: '1 min',
            icon: '⚡',
            color: 'from-purple-500 to-blue-500'
        },
        {
            method: 'Standard Crypto',
            baseFee: orderAmount * 0.025, // 2.5%
            gasFee: 2.5,
            totalFee: (orderAmount * 0.025) + 2.5,
            estimatedTime: '5-10 min',
            icon: '🔗',
            color: 'from-gray-400 to-gray-600'
        },
        {
            method: 'Fiat (Stripe)',
            baseFee: orderAmount * 0.029 + 0.30, // 2.9% + $0.30
            gasFee: 0,
            totalFee: (orderAmount * 0.029) + 0.30,
            estimatedTime: '2-3 days',
            icon: '💳',
            color: 'from-blue-400 to-blue-600'
        }
    ];

    const x402Fee = feeBreakdowns[0].totalFee;
    const standardCryptoFee = feeBreakdowns[1].totalFee;
    const savings = standardCryptoFee - x402Fee;
    const savingsPercentage = ((savings / standardCryptoFee) * 100).toFixed(0);

    return (
        <div className={`bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-purple-200 dark:border-purple-800 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-green-600" />
                        Save on Transaction Fees
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Compare payment methods and choose the best option
                    </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-semibold">
                    Save ${savings.toFixed(2)} ({savingsPercentage}%)
                </div>
            </div>

            {/* Fee Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {feeBreakdowns.map((breakdown, index) => {
                    const isRecommended = index === 0; // x402 is recommended
                    const isExpensive = index === 1; // Standard crypto is most expensive

                    return (
                        <div
                            key={breakdown.method}
                            className={`relative rounded-lg p-4 border-2 transition-all ${isRecommended
                                    ? 'border-purple-500 bg-white dark:bg-gray-800 shadow-lg scale-105'
                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                }`}
                        >
                            {/* Recommended Badge */}
                            {isRecommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    Recommended
                                </div>
                            )}

                            {/* Method Header */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${breakdown.color} flex items-center justify-center text-2xl`}>
                                    {breakdown.icon}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                                        {breakdown.method}
                                    </h4>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        {breakdown.estimatedTime}
                                    </div>
                                </div>
                            </div>

                            {/* Fee Breakdown */}
                            <div className="space-y-2 mb-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Base Fee</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        ${breakdown.baseFee.toFixed(2)}
                                    </span>
                                </div>
                                {breakdown.gasFee > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Gas Fee</span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            ${breakdown.gasFee.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Total Fee */}
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        Total Fee
                                    </span>
                                    <span className={`text-lg font-bold ${isRecommended ? 'text-purple-600 dark:text-purple-400' :
                                            isExpensive ? 'text-red-600 dark:text-red-400' :
                                                'text-gray-900 dark:text-white'
                                        }`}>
                                        ${breakdown.totalFee.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Savings Badge */}
                            {index > 0 && (
                                <div className="mt-2 text-center">
                                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                                        +${(breakdown.totalFee - x402Fee).toFixed(2)} more expensive
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Info */}
            <div className="mt-6 flex items-start gap-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-300 text-sm mb-1">
                        Why x402 Protocol?
                    </h4>
                    <p className="text-sm text-purple-800 dark:text-purple-400">
                        x402 uses optimized smart contracts to reduce transaction costs by up to 90%.
                        Enjoy faster confirmations and lower fees without compromising security.
                    </p>
                </div>
            </div>
        </div>
    );
}
