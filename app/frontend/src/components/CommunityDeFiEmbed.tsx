import React, { useState, useEffect } from 'react';
import { communityWeb3Service } from '@/services/communityWeb3Service';

interface CommunityDeFiEmbedProps {
  protocolName: string;
  className?: string;
}

interface DeFiProtocolData {
  protocol: string;
  tvl: string;
  apy: string;
  token: string;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  category: string;
}

export default function CommunityDeFiEmbed({
  protocolName,
  className = ''
}: CommunityDeFiEmbedProps) {
  const [protocolData, setProtocolData] = useState<DeFiProtocolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProtocolData();
  }, [protocolName]);

  const loadProtocolData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await communityWeb3Service.getDeFiProtocolData(protocolName);
      setProtocolData(data);
    } catch (err) {
      console.error('Error loading DeFi protocol data:', err);
      setError('Failed to load protocol data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Low':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'High':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'lending':
        return '🏦';
      case 'dex':
        return '🔄';
      case 'yield':
        return '🌾';
      case 'staking':
        return '🔒';
      case 'derivatives':
        return '📈';
      default:
        return '💰';
    }
  };

  const openProtocol = () => {
    // In a real implementation, this would open the actual protocol URL
    const protocolUrls: { [key: string]: string } = {
      'Aave': 'https://aave.com',
      'Compound': 'https://compound.finance',
      'Uniswap': 'https://uniswap.org',
      'Curve': 'https://curve.fi',
      'Yearn': 'https://yearn.finance'
    };
    
    const url = protocolUrls[protocolName] || `https://defipulse.com`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700 p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-green-200 dark:bg-green-700 rounded-full"></div>
            <div className="h-4 bg-green-200 dark:bg-green-700 rounded w-1/3"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-green-200 dark:bg-green-700 rounded w-full"></div>
            <div className="h-3 bg-green-200 dark:bg-green-700 rounded w-2/3"></div>
          </div>
          <div className="flex space-x-4 mt-4">
            <div className="h-12 bg-green-200 dark:bg-green-700 rounded flex-1"></div>
            <div className="h-12 bg-green-200 dark:bg-green-700 rounded flex-1"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !protocolData) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700 p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">{error || 'Failed to load DeFi data'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700 overflow-hidden hover:shadow-lg transition-shadow duration-300 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-lg">{getCategoryIcon(protocolData.category)}</span>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {protocolData.protocol}
              </h4>
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                {protocolData.category}
              </span>
            </div>
          </div>
          
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(protocolData.riskLevel)}`}>
            {protocolData.riskLevel} Risk
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {protocolData.description}
        </p>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Total Value Locked
            </div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
              {protocolData.tvl}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Current APY
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {protocolData.apy}
            </div>
          </div>
        </div>

        {/* Token Info */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Primary Token:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {protocolData.token}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={openProtocol}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            Visit Protocol
          </button>
          
          <button
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 text-sm font-medium"
            title="Add to watchlist"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Risk Warning */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Risk Disclaimer:</strong> DeFi protocols carry smart contract risks. 
                Always do your own research before investing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}