/**
 * Enhanced Token Price Widget
 * Displays comprehensive token price information with market data and trading links
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, Droplet, ExternalLink } from 'lucide-react';
import MiniSparkline from './MiniSparkline';

interface TokenData {
    symbol: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    liquidity: number;
    priceHistory: number[];
    contractAddress?: string;
}

interface EnhancedTokenPriceWidgetProps {
    tokenAddress: string;
    className?: string;
    showBuySellButtons?: boolean;
    compact?: boolean;
}

export const EnhancedTokenPriceWidget: React.FC<EnhancedTokenPriceWidgetProps> = ({
    tokenAddress,
    className = '',
    showBuySellButtons = true,
    compact = false
}) => {
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data for demonstration - replace with actual API call
        const mockData: TokenData = {
            symbol: 'LDAO',
            name: 'LinkDAO Token',
            price: 1.23,
            change24h: 5.67,
            volume24h: 1234567,
            marketCap: 45678900,
            liquidity: 2345678,
            priceHistory: [1.15, 1.18, 1.16, 1.20, 1.22, 1.19, 1.21, 1.23, 1.25, 1.23],
            contractAddress: tokenAddress
        };

        setTimeout(() => {
            setTokenData(mockData);
            setLoading(false);
        }, 500);
    }, [tokenAddress]);

    const formatPrice = (price: number): string => {
        if (price < 0.01) return `$${price.toFixed(6)}`;
        if (price < 1) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(2)}`;
    };

    const formatLargeNumber = (num: number): string => {
        if (num >= 1000000000) return `$${(num / 1000000000).toFixed(2)}B`;
        if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
        return `$${num.toFixed(2)}`;
    };

    const getUniswapBuyUrl = () => {
        return `https://app.uniswap.org/#/swap?outputCurrency=${tokenAddress}&chain=mainnet`;
    };

    const getUniswapSellUrl = () => {
        return `https://app.uniswap.org/#/swap?inputCurrency=${tokenAddress}&chain=mainnet`;
    };

    if (loading) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse ${className}`}>
                <div className="space-y-3">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
            </div>
        );
    }

    if (!tokenData) {
        return null;
    }

    const isPositiveChange = tokenData.change24h >= 0;

    if (compact) {
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${className}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{tokenData.symbol}</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatPrice(tokenData.price)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 text-sm font-medium ${isPositiveChange ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {isPositiveChange ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {Math.abs(tokenData.change24h).toFixed(2)}%
                        </div>
                        <MiniSparkline
                            data={tokenData.priceHistory}
                            width={60}
                            height={30}
                            color={isPositiveChange ? '#10b981' : '#ef4444'}
                            strokeWidth={2}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {tokenData.name}
                        </h3>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {formatPrice(tokenData.price)}
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isPositiveChange
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                        {isPositiveChange ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        <span className="font-semibold">
                            {isPositiveChange ? '+' : ''}{tokenData.change24h.toFixed(2)}%
                        </span>
                    </div>
                </div>

                {/* Price Chart */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3">
                    <MiniSparkline
                        data={tokenData.priceHistory}
                        width={280}
                        height={60}
                        color={isPositiveChange ? '#10b981' : '#ef4444'}
                        fillColor={isPositiveChange ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}
                        strokeWidth={2}
                        showArea={true}
                    />
                </div>
            </div>

            {/* Market Stats */}
            <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <Activity className="w-3.5 h-3.5" />
                            24h Volume
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatLargeNumber(tokenData.volume24h)}
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            Market Cap
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatLargeNumber(tokenData.marketCap)}
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 col-span-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <Droplet className="w-3.5 h-3.5" />
                            On-Chain Liquidity
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatLargeNumber(tokenData.liquidity)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Buy/Sell Buttons */}
            {showBuySellButtons && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="grid grid-cols-2 gap-2">
                        <a
                            href={getUniswapBuyUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg transition-all shadow-sm hover:shadow"
                        >
                            <DollarSign className="w-4 h-4" />
                            Buy on Uniswap
                            <ExternalLink className="w-3 h-3" />
                        </a>
                        <a
                            href={getUniswapSellUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all shadow-sm hover:shadow"
                        >
                            <Activity className="w-4 h-4" />
                            Sell on Uniswap
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>
                    <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                        Powered by Uniswap V3
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedTokenPriceWidget;
