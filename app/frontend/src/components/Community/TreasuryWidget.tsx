/**
 * Treasury Widget Component
 * Displays treasury balance, recent transactions, spending categories, and governance-controlled assets
 */

import React, { useState, useEffect } from 'react';
import { Wallet, TrendingDown, PieChart, ExternalLink, DollarSign, Activity } from 'lucide-react';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    timestamp: Date;
    txHash: string;
}

interface SpendingCategory {
    name: string;
    amount: number;
    percentage: number;
    color: string;
}

interface Asset {
    symbol: string;
    name: string;
    balance: number;
    valueUSD: number;
}

interface TreasuryWidgetProps {
    treasuryAddress?: string;
    className?: string;
    compact?: boolean;
}

export const TreasuryWidget: React.FC<TreasuryWidgetProps> = ({
    treasuryAddress,
    className = '',
    compact = false
}) => {
    const [treasuryData, setTreasuryData] = useState({
        balanceUSD: 0,
        balanceETH: 0,
        recentTransactions: [] as Transaction[],
        spendingCategories: [] as SpendingCategory[],
        assets: [] as Asset[]
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data for demonstration - replace with actual API call
        const mockData = {
            balanceUSD: 1234567.89,
            balanceETH: 456.78,
            recentTransactions: [
                {
                    id: '1',
                    type: 'expense' as const,
                    amount: 5000,
                    description: 'Development Grant',
                    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    txHash: '0xabcd...1234'
                },
                {
                    id: '2',
                    type: 'income' as const,
                    amount: 15000,
                    description: 'Protocol Revenue',
                    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
                    txHash: '0xefgh...5678'
                },
                {
                    id: '3',
                    type: 'expense' as const,
                    amount: 3500,
                    description: 'Marketing Campaign',
                    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
                    txHash: '0xijkl...9012'
                }
            ],
            spendingCategories: [
                { name: 'Development', amount: 45000, percentage: 45, color: '#3b82f6' },
                { name: 'Marketing', amount: 25000, percentage: 25, color: '#8b5cf6' },
                { name: 'Operations', amount: 20000, percentage: 20, color: '#10b981' },
                { name: 'Community', amount: 10000, percentage: 10, color: '#f59e0b' }
            ],
            assets: [
                { symbol: 'ETH', name: 'Ethereum', balance: 456.78, valueUSD: 912345.67 },
                { symbol: 'USDC', name: 'USD Coin', balance: 250000, valueUSD: 250000 },
                { symbol: 'LDAO', name: 'LinkDAO Token', balance: 1000000, valueUSD: 72222.22 }
            ]
        };

        setTimeout(() => {
            setTreasuryData(mockData);
            setLoading(false);
        }, 500);
    }, [treasuryAddress]);

    const formatUSD = (amount: number): string => {
        if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
        if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
        return `$${amount.toFixed(2)}`;
    };

    const formatTimeAgo = (date: Date): string => {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse ${className}`}>
                <div className="space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        );
    }

    if (compact) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
                <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Treasury</h3>
                </div>
                <div className="space-y-2">
                    <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatUSD(treasuryData.balanceUSD)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {treasuryData.balanceETH.toFixed(2)} ETH
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            DAO Treasury
                        </h3>
                    </div>
                    {treasuryAddress && (
                        <a
                            href={`https://etherscan.io/address/${treasuryAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>

            {/* Balance */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Balance</div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {formatUSD(treasuryData.balanceUSD)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {treasuryData.balanceETH.toFixed(4)} ETH
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Recent Transactions
                    </h4>
                </div>
                <div className="space-y-2">
                    {treasuryData.recentTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between text-sm">
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">
                                    {tx.description}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatTimeAgo(tx.timestamp)}
                                </div>
                            </div>
                            <div className={`font-semibold ${tx.type === 'income'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                {tx.type === 'income' ? '+' : '-'}{formatUSD(tx.amount)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Spending Categories */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                    <PieChart className="w-4 h-4 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Spending Categories
                    </h4>
                </div>
                <div className="space-y-2">
                    {treasuryData.spendingCategories.map((category) => (
                        <div key={category.name}>
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-700 dark:text-gray-300">{category.name}</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {category.percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${category.percentage}%`,
                                        backgroundColor: category.color
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Governance Assets */}
            <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Governance-Controlled Assets
                    </h4>
                </div>
                <div className="space-y-2">
                    {treasuryData.assets.map((asset) => (
                        <div key={asset.symbol} className="flex items-center justify-between text-sm">
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                    {asset.balance.toLocaleString()} {asset.symbol}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {asset.name}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold text-gray-900 dark:text-white">
                                    {formatUSD(asset.valueUSD)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <button className="w-full text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                    View Full Treasury Dashboard
                </button>
            </div>
        </div>
    );
};

export default TreasuryWidget;
