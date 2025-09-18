import React, { useState, useEffect } from 'react';
import { useAccount, useNetwork } from 'wagmi';
import { getPreferredStablecoin, getStablecoinsForChain, formatStablecoinPrice, SUGGESTED_PRICING_TIERS } from '../../utils/stablecoinPricing';
import { PaymentToken } from '../../types/payment';
import StablecoinPricingInfo from './StablecoinPricingInfo';

interface PricingSelectorProps {
  value: string;
  currency: string;
  onPriceChange: (price: string) => void;
  onCurrencyChange: (currency: string) => void;
  category?: keyof typeof SUGGESTED_PRICING_TIERS;
  className?: string;
}

export default function PricingSelector({
  value,
  currency,
  onPriceChange,
  onCurrencyChange,
  category = 'digital_art',
  className = ''
}: PricingSelectorProps) {
  const { chain } = useNetwork();
  const [availableTokens, setAvailableTokens] = useState<PaymentToken[]>([]);
  const [showPricingInfo, setShowPricingInfo] = useState(false);
  const [suggestedPrices] = useState(SUGGESTED_PRICING_TIERS[category] || SUGGESTED_PRICING_TIERS.digital_art);

  useEffect(() => {
    if (chain?.id) {
      const stablecoins = getStablecoinsForChain(chain.id);
      setAvailableTokens(stablecoins);
      
      // Auto-select preferred stablecoin if no currency is set
      if (!currency && stablecoins.length > 0) {
        const preferred = getPreferredStablecoin(chain.id);
        if (preferred) {
          onCurrencyChange(preferred.symbol);
        }
      }
    }
  }, [chain?.id, currency, onCurrencyChange]);

  const handleSuggestedPriceClick = (price: string) => {
    onPriceChange(price);
  };

  const formatDisplayPrice = (price: string) => {
    if (!price || isNaN(parseFloat(price))) return '';
    return formatStablecoinPrice(price, currency);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Price Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Price
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => onPriceChange(e.target.value)}
            placeholder="0.00"
            className="block w-full pl-4 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          />
          
          {/* Currency Selector */}
          <div className="absolute inset-y-0 right-0 flex items-center">
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="h-full py-0 pl-3 pr-8 border-0 bg-transparent text-gray-700 focus:ring-2 focus:ring-blue-500 rounded-r-lg"
            >
              {availableTokens.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
              <option value="ETH">ETH</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        
        {/* Price Preview */}
        {value && (
          <p className="mt-2 text-sm text-gray-600">
            Display price: <span className="font-medium">{formatDisplayPrice(value)}</span>
          </p>
        )}
      </div>

      {/* Suggested Prices */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Suggested Prices for {category.replace('_', ' ')}
          </label>
          <button
            type="button"
            onClick={() => setShowPricingInfo(!showPricingInfo)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Why USDC? {showPricingInfo ? '▼' : '▶'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(suggestedPrices).map(([tier, price]) => (
            <button
              key={tier}
              type="button"
              onClick={() => handleSuggestedPriceClick(price)}
              className={`p-3 text-center border rounded-lg hover:bg-gray-50 transition-colors ${
                value === price ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="text-xs text-gray-500 capitalize mb-1">{tier}</div>
              <div className="font-medium text-gray-900">
                {formatStablecoinPrice(price, currency)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Information Panel */}
      {showPricingInfo && (
        <StablecoinPricingInfo className="mt-4" />
      )}

      {/* Advanced Options */}
      <details className="border border-gray-200 rounded-lg">
        <summary className="p-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
          Advanced Pricing Options
        </summary>
        <div className="p-3 border-t border-gray-200 space-y-3">
          {/* Listing Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Listing Type
            </label>
            <select className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="FIXED_PRICE">Fixed Price</option>
              <option value="AUCTION">Auction</option>
              <option value="OFFER">Accept Offers</option>
            </select>
          </div>

          {/* Royalty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Creator Royalty (%)
            </label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              placeholder="2.5"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Earn royalties on future sales (0-10%)
            </p>
          </div>

          {/* Multiple Payment Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accept Multiple Currencies
            </label>
            <div className="space-y-2">
              {availableTokens.map((token) => (
                <label key={token.symbol} className="flex items-center">
                  <input
                    type="checkbox"
                    defaultChecked={token.symbol === currency}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {token.name} ({token.symbol})
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </details>

      {/* Price Validation */}
      {value && parseFloat(value) > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-green-600">✓</span>
            </div>
            <div className="ml-2">
              <p className="text-sm text-green-800">
                Price looks good! Your item will be listed for{' '}
                <span className="font-medium">{formatDisplayPrice(value)}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}