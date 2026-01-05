import React from 'react';
import {
    PrioritizationContext,
    PrioritizationResult,
    PrioritizedPaymentMethod,
    PaymentMethodType
} from '../../types/paymentPrioritization';
import { NetworkIcon } from '../Payment/NetworkIcon';

interface TransactionSummaryProps {
    selectedMethod: PrioritizedPaymentMethod | null;
    totalAmount: number;
    onConfirm: () => void;
    isProcessing?: boolean;
    taxBreakdown?: Array<{ name: string; rate: number; amount: number; type: string }>;
    taxRate?: number;
}

export const TransactionSummary: React.FC<TransactionSummaryProps> = ({
    selectedMethod,
    totalAmount,
    onConfirm,
    isProcessing = false,
    taxBreakdown = [],
    taxRate = 0
}) => {
    if (!selectedMethod) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="text-center text-gray-500 dark:text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <p className="text-sm">Select a payment method to continue</p>
                </div>
            </div>
        );
    }

    const { method, costEstimate } = selectedMethod;

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const getNetworkName = (chainId: number): string => {
        const networks: { [key: number]: string } = {
            1: 'Ethereum',
            137: 'Polygon',
            42161: 'Arbitrum',
            8453: 'Base',
            11155111: 'Sepolia',
            84532: 'Base Sepolia',
            0: 'Fiat'
        };
        return networks[chainId] || 'Unknown';
    };

    const getSecurityLevel = (chainId: number): { level: string; color: string } => {
        if (chainId === 1) return { level: 'Maximum', color: 'text-green-600' };
        if ([137, 42161, 8453].includes(chainId)) return { level: 'High', color: 'text-green-500' };
        if ([11155111, 84532].includes(chainId)) return { level: 'Testnet', color: 'text-yellow-500' };
        return { level: 'Standard', color: 'text-blue-500' };
    };

    const security = method.chainId !== undefined ? getSecurityLevel(method.chainId) : { level: 'High', color: 'text-green-500' };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Transaction Summary
                </h3>
            </div>

            <div className="p-6 space-y-4">
                {/* Selected Payment Method */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border-2 border-blue-500">
                    <div className="flex items-center gap-3 mb-3">
                        {method.chainId !== undefined && method.chainId !== 0 && (
                            <NetworkIcon chainId={method.chainId} size={32} />
                        )}
                        {method.type === PaymentMethodType.FIAT_STRIPE && (
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white">{method.name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                {method.chainId !== undefined && method.chainId !== 0
                                    ? getNetworkName(method.chainId)
                                    : 'Credit/Debit Card'}
                            </div>
                        </div>
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>

                    {/* Security & Speed Info */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white dark:bg-gray-800 rounded p-2">
                            <div className="text-gray-500 dark:text-gray-400 mb-1">Security</div>
                            <div className={`font-semibold ${security.color}`}>{security.level}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded p-2">
                            <div className="text-gray-500 dark:text-gray-400 mb-1">Speed</div>
                            <div className="font-semibold text-blue-600">
                                {method.type === PaymentMethodType.FIAT_STRIPE
                                    ? 'Instant'
                                    : `~${Math.round(costEstimate.estimatedTime)} min`}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Cost Breakdown</h4>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Item Total</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(costEstimate.baseCost)}
                            </span>
                        </div>

                        {costEstimate.gasFee > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    Network Gas Fee
                                    <svg className="w-3 h-3 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <span className="font-medium text-orange-600">
                                    +{formatCurrency(costEstimate.gasFee)}
                                </span>
                            </div>
                        )}

                        {/* Tax Breakdown */}
                        {taxBreakdown && taxBreakdown.length > 0 && (
                            <>
                                {taxBreakdown.map((tax, index) => (
                                    <div key={index} className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                            {tax.name}
                                            <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        <span className="font-medium text-blue-600">
                                            +{formatCurrency(tax.amount)}
                                        </span>
                                    </div>
                                ))}
                            </>
                        )}

                        {(costEstimate as any).platformFee > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Platform Fee</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    +{formatCurrency((costEstimate as any).platformFee)}
                                </span>
                            </div>
                        )}

                        <div className="pt-3 border-t-2 border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <span className="font-bold text-gray-900 dark:text-white">Total Amount</span>
                            <span className="font-bold text-xl text-green-600">
                                {formatCurrency(
                                    costEstimate.totalCost +
                                    (taxBreakdown?.reduce((sum, tax) => sum + tax.amount, 0) || 0)
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Important Notes */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-xs text-blue-800 dark:text-blue-300">
                            {method.type === PaymentMethodType.FIAT_STRIPE ? (
                                <p>Your payment will be processed securely through Stripe. You'll receive a confirmation email after payment.</p>
                            ) : (
                                <p>Please confirm the transaction in your wallet. Gas fees may vary based on network congestion.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Confirm Button */}
                <button
                    onClick={onConfirm}
                    disabled={isProcessing}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                        <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Confirm Payment</span>
                        </>
                    )}
                </button>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Secured & Encrypted Transaction</span>
                </div>
            </div>
        </div>
    );
};

export default TransactionSummary;
