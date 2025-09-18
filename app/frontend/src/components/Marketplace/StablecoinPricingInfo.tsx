import React from 'react';
import { STABLECOIN_BENEFITS, GAS_COST_COMPARISON } from '../../utils/stablecoinPricing';

interface StablecoinPricingInfoProps {
  className?: string;
}

export default function StablecoinPricingInfo({ className = '' }: StablecoinPricingInfoProps) {
  return (
    <div className={`bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start space-x-3 mb-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 font-semibold">💵</span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Why Use USDC/USDT for Pricing?
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Stablecoins provide predictable pricing and lower transaction costs compared to volatile cryptocurrencies like ETH.
          </p>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(STABLECOIN_BENEFITS).map(([benefit, description]) => (
          <div key={benefit} className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{benefit}</h4>
              <p className="text-gray-600 text-xs mt-1">{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gas Cost Comparison */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="font-medium text-gray-900 mb-3 text-sm">Transaction Cost Comparison</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(GAS_COST_COMPARISON).map(([key, chain]) => (
            <div key={key} className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900 text-sm">{chain.name}</h5>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  key === 'polygon' ? 'bg-green-100 text-green-700' :
                  key === 'arbitrum' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {chain.avgGasCost}
                </span>
              </div>
              <p className="text-xs text-gray-600 mb-1">{chain.speed}</p>
              <p className="text-xs text-gray-500">{chain.recommendation}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 text-sm mb-2">💡 Pro Tips</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Use Polygon for everyday items ($0.01 gas fees)</li>
          <li>• Price in whole dollars for easy understanding</li>
          <li>• USDC is more widely accepted than USDT</li>
          <li>• Consider offering multiple payment options</li>
        </ul>
      </div>
    </div>
  );
}