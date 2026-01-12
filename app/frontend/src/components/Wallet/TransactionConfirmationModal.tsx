/**
 * Transaction Confirmation Modal
 * Displays comprehensive transaction details before signing
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TransactionSecurityService, TransactionSecurityResult } from '@/security/transactionSecurity';
import { sanitizeAddress } from '@/security/xssProtection';

interface TransactionConfirmationModalProps {
    isOpen: boolean;
    transaction: {
        to?: string;
        from?: string;
        data?: string;
        value?: bigint;
        gasLimit?: bigint;
        maxFeePerGas?: bigint;
        maxPriorityFeePerGas?: bigint;
        nonce?: number;
        chainId?: number;
    };
    provider: ethers.Provider;
    onConfirm: () => void;
    onCancel: () => void;
    requireUnderstanding?: boolean; // For high-value transactions
}

export const TransactionConfirmationModal: React.FC<TransactionConfirmationModalProps> = ({
    isOpen,
    transaction,
    provider,
    onConfirm,
    onCancel,
    requireUnderstanding = false,
}) => {
    const [securityResult, setSecurityResult] = useState<TransactionSecurityResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [understood, setUnderstood] = useState(false);
    const [chainName, setChainName] = useState<string>('Unknown');

    useEffect(() => {
        if (isOpen) {
            analyzeTransaction();
            loadChainName();
        }
    }, [isOpen, transaction]);

    const analyzeTransaction = async () => {
        setIsAnalyzing(true);
        try {
            const txSecurity = new TransactionSecurityService(provider, transaction.chainId || 1);
            const result = await txSecurity.validateTransaction(transaction);
            setSecurityResult(result);
        } catch (error) {
            console.error('Transaction analysis error:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const loadChainName = async () => {
        try {
            const network = await provider.getNetwork();
            const names: Record<string, string> = {
                '1': 'Ethereum Mainnet',
                '5': 'Goerli Testnet',
                '11155111': 'Sepolia Testnet',
                '137': 'Polygon',
                '80001': 'Mumbai Testnet',
                '8453': 'Base',
                '84532': 'Base Sepolia',
            };
            setChainName(names[network.chainId.toString()] || `Chain ${network.chainId}`);
        } catch (error) {
            console.error('Error loading chain name:', error);
        }
    };

    const formatAddress = (address: string) => {
        try {
            const sanitized = sanitizeAddress(address);
            return `${sanitized.slice(0, 6)}...${sanitized.slice(-4)}`;
        } catch {
            return 'Invalid Address';
        }
    };

    const formatValue = (value: bigint) => {
        return `${ethers.formatEther(value)} ETH`;
    };

    const formatGas = (gasLimit?: bigint, maxFeePerGas?: bigint) => {
        if (!gasLimit || !maxFeePerGas) return 'Estimating...';
        const totalCost = gasLimit * maxFeePerGas;
        return `${ethers.formatEther(totalCost)} ETH`;
    };

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'low': return 'text-green-600';
            case 'medium': return 'text-yellow-600';
            case 'high': return 'text-orange-600';
            case 'critical': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const getRiskBgColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'low': return 'bg-green-50 border-green-200';
            case 'medium': return 'bg-yellow-50 border-yellow-200';
            case 'high': return 'bg-orange-50 border-orange-200';
            case 'critical': return 'bg-red-50 border-red-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const canConfirm = () => {
        if (isAnalyzing) return false;
        if (!securityResult) return false;
        if (securityResult.phishingDetected) return false;
        if (securityResult.errors.length > 0) return false;
        if (requireUnderstanding && !understood) return false;
        return true;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Confirm Transaction</h2>
                    <p className="text-sm text-gray-600 mt-1">Review the details carefully before signing</p>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-4">
                    {/* Security Analysis */}
                    {isAnalyzing ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Analyzing transaction security...</span>
                        </div>
                    ) : securityResult && (
                        <div className={`p-4 rounded-lg border ${getRiskBgColor(securityResult.riskLevel)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-gray-900">Security Analysis</span>
                                <span className={`font-bold ${getRiskColor(securityResult.riskLevel)} uppercase text-sm`}>
                                    {securityResult.riskLevel} Risk
                                </span>
                            </div>

                            {/* Errors */}
                            {securityResult.errors.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {securityResult.errors.map((error, idx) => (
                                        <div key={idx} className="flex items-start text-red-700">
                                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm">{error}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Warnings */}
                            {securityResult.warnings.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {securityResult.warnings.map((warning, idx) => (
                                        <div key={idx} className="flex items-start text-yellow-700">
                                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm">{warning}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Recommendations */}
                            {securityResult.recommendations.length > 0 && (
                                <div className="mt-3 space-y-1">
                                    {securityResult.recommendations.map((rec, idx) => (
                                        <div key={idx} className="flex items-start text-blue-700">
                                            <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-sm">{rec}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Transaction Details */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <h3 className="font-semibold text-gray-900 mb-3">Transaction Details</h3>

                        {/* Network */}
                        <div className="flex justify-between">
                            <span className="text-gray-600">Network:</span>
                            <span className="font-medium text-gray-900">{chainName}</span>
                        </div>

                        {/* From */}
                        {transaction.from && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">From:</span>
                                <span className="font-mono text-sm text-gray-900">{formatAddress(transaction.from)}</span>
                            </div>
                        )}

                        {/* To */}
                        {transaction.to && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">To:</span>
                                <span className="font-mono text-sm text-gray-900">{formatAddress(transaction.to)}</span>
                            </div>
                        )}

                        {/* Value */}
                        {transaction.value !== undefined && transaction.value > 0n && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount:</span>
                                <span className="font-bold text-lg text-gray-900">{formatValue(transaction.value)}</span>
                            </div>
                        )}

                        {/* Gas Estimate */}
                        <div className="flex justify-between">
                            <span className="text-gray-600">Estimated Gas Fee:</span>
                            <span className="font-medium text-gray-900">
                                {formatGas(securityResult?.gasEstimate || transaction.gasLimit, transaction.maxFeePerGas)}
                            </span>
                        </div>

                        {/* Max Total */}
                        {transaction.value !== undefined && transaction.value > 0n && (
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="text-gray-900 font-semibold">Max Total:</span>
                                <span className="font-bold text-lg text-gray-900">
                                    {formatValue(
                                        transaction.value +
                                        ((securityResult?.gasEstimate || transaction.gasLimit || 0n) * (transaction.maxFeePerGas || 0n))
                                    )}
                                </span>
                            </div>
                        )}

                        {/* Contract Interaction */}
                        {transaction.data && transaction.data !== '0x' && (
                            <div className="pt-2 border-t border-gray-200">
                                <span className="text-gray-600 text-sm">Contract Interaction</span>
                                <div className="mt-1 p-2 bg-white rounded border border-gray-200">
                                    <code className="text-xs text-gray-700 break-all">
                                        {transaction.data.slice(0, 100)}...
                                    </code>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Simulation Result */}
                    {securityResult?.simulationResult && !securityResult.simulationResult.success && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h3 className="font-semibold text-red-900 mb-2">⚠️ Transaction Will Fail</h3>
                            <p className="text-sm text-red-700">
                                {securityResult.simulationResult.revertReason || 'Unknown reason'}
                            </p>
                        </div>
                    )}

                    {/* Understanding Checkbox for High-Value Transactions */}
                    {requireUnderstanding && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <label className="flex items-start cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={understood}
                                    onChange={(e) => setUnderstood(e.target.checked)}
                                    className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-900">
                                    I understand this is a high-value transaction and have verified the recipient address is correct.
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!canConfirm()}
                        className={`px-6 py-2 rounded-lg font-medium ${canConfirm()
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {securityResult?.phishingDetected ? 'Blocked' : 'Confirm & Sign'}
                    </button>
                </div>
            </div>
        </div>
    );
};
