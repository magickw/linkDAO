import React, { useState } from 'react';
import { PrioritizedPaymentMethod, PaymentMethodType } from '../../types/paymentPrioritization';

interface PaymentMethodTooltipProps {
    paymentMethod: PrioritizedPaymentMethod;
    children: React.ReactNode;
}

export const PaymentMethodTooltip: React.FC<PaymentMethodTooltipProps> = ({
    paymentMethod,
    children
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const { costEstimate, method } = paymentMethod;

    const formatCurrency = (amount: number, currency: string = 'USD'): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const getGasFeeExplanation = (chainId: number): string => {
        switch (chainId) {
            case 1:
                return 'Ethereum mainnet has higher gas fees due to network congestion and L1 security costs.';
            case 137:
                return 'Polygon offers significantly lower gas fees as an L2 scaling solution.';
            case 42161:
                return 'Arbitrum provides low gas fees through optimistic rollup technology.';
            case 8453:
                return 'Base offers competitive fees as a Coinbase-backed L2 solution.';
            case 11155111:
            case 84532:
                return 'Testnet transactions have minimal fees for testing purposes.';
            case 0:
                return 'No gas fees - traditional payment processing fees apply.';
            default:
                return 'Gas fees vary based on network congestion.';
        }
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}

            {isVisible && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-72">
                    <div className="bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 p-4">
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                            <div className="border-8 border-transparent border-t-gray-900"></div>
                        </div>

                        {/* Header */}
                        <div className="mb-3 pb-2 border-b border-gray-700">
                            <h4 className="font-semibold text-sm">{method.name}</h4>
                            <p className="text-xs text-gray-400 mt-1">{method.description}</p>
                        </div>

                        {/* Cost Breakdown */}
                        <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Base Cost:</span>
                                <span className="font-medium">{formatCurrency(costEstimate.baseCost)}</span>
                            </div>

                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Gas Fee:</span>
                                <span className="font-medium text-orange-400">
                                    {formatCurrency(costEstimate.gasFee)}
                                </span>
                            </div>

                            {(costEstimate as any).platformFee > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">Platform Fee:</span>
                                    <span className="font-medium">
                                        {formatCurrency((costEstimate as any).platformFee)}
                                    </span>
                                </div>
                            )}

                            <div className="pt-2 border-t border-gray-700 flex justify-between text-sm font-bold">
                                <span>Total:</span>
                                <span className="text-green-400">{formatCurrency(costEstimate.totalCost)}</span>
                            </div>
                        </div>

                        {/* Gas Fee Explanation */}
                        {method.chainId !== undefined && method.chainId !== 0 && (
                            <div className="bg-gray-800 rounded p-2 text-xs text-gray-300">
                                <div className="flex items-start gap-1">
                                    <svg className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>{getGasFeeExplanation(method.chainId)}</span>
                                </div>
                            </div>
                        )}

                        {/* Estimated Time */}
                        <div className="mt-3 pt-2 border-t border-gray-700 flex justify-between text-xs">
                            <span className="text-gray-400">Estimated Time:</span>
                            <span className="font-medium">
                                {method.type === PaymentMethodType.FIAT_STRIPE
                                    ? 'Instant'
                                    : `~${Math.round(costEstimate.estimatedTime)} min`}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentMethodTooltip;
