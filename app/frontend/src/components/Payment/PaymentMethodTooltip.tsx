import React, { useState } from 'react';
import { PrioritizedPaymentMethod, PaymentMethodType } from '../../types/paymentPrioritization';

interface PaymentMethodTooltipProps {
    paymentMethod: PrioritizedPaymentMethod;
    children: React.ReactNode;
}

interface NetworkInfo {
    type: string;
    securityLevel: 'High' | 'Medium' | 'Low';
    speed: 'Fast' | 'Medium' | 'Slow';
    bestFor: string;
    learnMoreUrl?: string;
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

    const getNetworkInfo = (chainId: number): NetworkInfo => {
        switch (chainId) {
            case 1:
                return {
                    type: 'Layer 1 (Mainnet)',
                    securityLevel: 'High',
                    speed: 'Medium',
                    bestFor: 'Large transactions requiring maximum security',
                    learnMoreUrl: 'https://ethereum.org/en/developers/docs/intro-to-ethereum/'
                };
            case 137:
                return {
                    type: 'Layer 2 (Polygon)',
                    securityLevel: 'High',
                    speed: 'Fast',
                    bestFor: 'Frequent transactions with low fees',
                    learnMoreUrl: 'https://polygon.technology/learn'
                };
            case 42161:
                return {
                    type: 'Layer 2 (Arbitrum)',
                    securityLevel: 'High',
                    speed: 'Fast',
                    bestFor: 'DeFi and smart contract interactions',
                    learnMoreUrl: 'https://arbitrum.io/learn'
                };
            case 8453:
                return {
                    type: 'Layer 2 (Base)',
                    securityLevel: 'High',
                    speed: 'Fast',
                    bestFor: 'Coinbase users and low-cost transactions',
                    learnMoreUrl: 'https://base.org/learn'
                };
            case 11155111:
            case 84532:
                return {
                    type: 'Testnet',
                    securityLevel: 'Low',
                    speed: 'Fast',
                    bestFor: 'Testing and development only'
                };
            case 0:
                return {
                    type: 'Fiat Payment',
                    securityLevel: 'High',
                    speed: 'Fast',
                    bestFor: 'Users without crypto wallets'
                };
            default:
                return {
                    type: 'Unknown Network',
                    securityLevel: 'Medium',
                    speed: 'Medium',
                    bestFor: 'General transactions'
                };
        }
    };

    const getGasFeeExplanation = (chainId: number): string => {
        switch (chainId) {
            case 1:
                return 'Ethereum mainnet has higher gas fees due to network congestion and L1 security costs. Gas fees fluctuate based on network demand.';
            case 137:
                return 'Polygon offers significantly lower gas fees as an L2 scaling solution. Transactions are batched and settled on Ethereum.';
            case 42161:
                return 'Arbitrum provides low gas fees through optimistic rollup technology, processing transactions off-chain and settling on Ethereum.';
            case 8453:
                return 'Base offers competitive fees as a Coinbase-backed L2 solution, optimized for speed and low costs.';
            case 11155111:
            case 84532:
                return 'Testnet transactions have minimal fees for testing purposes. Not for real value transfers.';
            case 0:
                return 'No gas fees - traditional payment processing fees apply (2.9% + $0.30).';
            default:
                return 'Gas fees vary based on network congestion and transaction complexity.';
        }
    };

    const getSecurityBadgeColor = (level: string): string => {
        switch (level) {
            case 'High': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'Low': return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const networkInfo = method.chainId !== undefined ? getNetworkInfo(method.chainId) : null;

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onClick={() => setIsVisible(!isVisible)} // Mobile support
        >
            {children}

            {isVisible && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 w-80">
                    <div className="bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 p-4">
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                            <div className="border-8 border-transparent border-t-gray-900"></div>
                        </div>

                        {/* Header */}
                        <div className="mb-3 pb-3 border-b border-gray-700">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-sm">{method.name}</h4>
                                    <p className="text-xs text-gray-400 mt-1">{method.description}</p>
                                </div>
                                {networkInfo && (
                                    <span className={`ml-2 px-2 py-0.5 text-xs rounded border ${getSecurityBadgeColor(networkInfo.securityLevel)}`}>
                                        {networkInfo.securityLevel} Security
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Network Info Section */}
                        {networkInfo && networkInfo.type !== 'Fiat Payment' && (
                            <div className="mb-3 pb-3 border-b border-gray-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span className="text-xs font-medium text-blue-400">{networkInfo.type}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-400">Speed:</span>
                                        <span className="ml-1 font-medium">{networkInfo.speed}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Security:</span>
                                        <span className="ml-1 font-medium">{networkInfo.securityLevel}</span>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs">
                                    <span className="text-gray-400">Best for:</span>
                                    <p className="text-gray-300 mt-0.5">{networkInfo.bestFor}</p>
                                </div>
                            </div>
                        )}

                        {/* Cost Breakdown */}
                        <div className="space-y-2 mb-3">
                            <div className="text-xs font-medium text-gray-400 mb-2">💰 Cost Breakdown</div>

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
                        {method.chainId !== undefined && (
                            <div className="bg-gray-800 rounded p-2.5 text-xs text-gray-300 mb-3">
                                <div className="flex items-start gap-1.5">
                                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <div className="font-medium text-blue-400 mb-1">Why this price?</div>
                                        <span>{getGasFeeExplanation(method.chainId)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Estimated Time */}
                        <div className="flex justify-between text-xs border-t border-gray-700 pt-2">
                            <span className="text-gray-400">⏱️ Estimated Time:</span>
                            <span className="font-medium">
                                {method.type === PaymentMethodType.FIAT_STRIPE
                                    ? 'Instant'
                                    : `~${Math.round(costEstimate.estimatedTime)} min`}
                            </span>
                        </div>

                        {/* Learn More Link */}
                        {networkInfo?.learnMoreUrl && (
                            <div className="mt-3 pt-2 border-t border-gray-700">
                                <a
                                    href={networkInfo.learnMoreUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <span>Learn more about {networkInfo.type}</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentMethodTooltip;
