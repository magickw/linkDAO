/**
 * TierProgressionUI Component
 * Visual tier progression map with interactive requirements
 */

import React, { useState } from 'react';
import { SellerTierBadge, SellerTier } from './SellerTierBadge';
import { 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Users,
  Award,
  Lock,
  Unlock,
  CheckCircle,
  Info
} from 'lucide-react';

interface TierData {
  tier: SellerTier;
  name: string;
  description: string;
  requirements: {
    sales: number;
    rating: number;
    responseTime: number;
    returnRate?: number;
    disputeRate?: number;
    repeatRate?: number;
  };
  benefits: {
    commissionRate: number;
    withdrawalLimit: number;
    support: string;
    features: string[];
  };
  isUnlocked: boolean;
  isCurrent: boolean;
}

interface TierProgressionUIProps {
  tiers: TierData[];
  currentMetrics: {
    totalSales: number;
    rating: number;
    responseTime: number;
    returnRate: number;
    disputeRate: number;
    repeatRate: number;
  };
  onTierSelect?: (tier: SellerTier) => void;
  className?: string;
}

const TIER_COLORS = {
  bronze: 'from-amber-500 to-amber-700',
  silver: 'from-gray-400 to-gray-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-cyan-400 to-cyan-600',
  diamond: 'from-purple-500 to-purple-700'
};

export const TierProgressionUI: React.FC<TierProgressionUIProps> = ({
  tiers,
  currentMetrics,
  onTierSelect,
  className = ''
}) => {
  const [selectedTier, setSelectedTier] = useState<SellerTier | null>(null);
  const [expandedRequirement, setExpandedRequirement] = useState<string | null>(null);

  const getRequirementProgress = (current: number, required: number) => {
    return Math.min((current / required) * 100, 100);
  };

  const isRequirementMet = (current: number, required: number) => {
    return current >= required;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Your Seller Journey
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Progress through tiers to unlock better rates and exclusive features
        </p>
      </div>

      {/* Tier Progression Map */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0" />
        
        <div className="relative flex justify-between items-center z-10">
          {tiers.map((tierData, index) => (
            <div key={tierData.tier} className="flex flex-col items-center">
              {/* Tier Node */}
              <button
                onClick={() => {
                  setSelectedTier(tierData.tier);
                  onTierSelect?.(tierData.tier);
                }}
                className={`
                  relative flex flex-col items-center p-4 rounded-xl transition-all duration-300
                  ${tierData.isCurrent 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' 
                    : tierData.isUnlocked
                      ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500'
                      : 'bg-gray-50 dark:bg-gray-900/20 border-2 border-gray-300 dark:border-gray-600'
                  }
                  hover:scale-105 cursor-pointer
                `}
              >
                {/* Lock/Unlock Status */}
                <div className="absolute -top-2 -right-2">
                  {tierData.isUnlocked ? (
                    <Unlock className="w-4 h-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                </div>

                {/* Tier Icon */}
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  bg-gradient-to-br ${TIER_COLORS[tierData.tier]}
                  text-white text-2xl font-bold shadow-lg
                  ${tierData.isCurrent ? 'ring-4 ring-blue-200 dark:ring-blue-800' : ''}
                `}>
                  {tierData.tier === 'bronze' && '🥉'}
                  {tierData.tier === 'silver' && '🥈'}
                  {tierData.tier === 'gold' && '🥇'}
                  {tierData.tier === 'platinum' && '💎'}
                  {tierData.tier === 'diamond' && '👑'}
                </div>

                {/* Tier Name */}
                <div className="mt-2 text-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {tierData.name}
                  </h3>
                  {tierData.isCurrent && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                      Current Tier
                    </span>
                  )}
                </div>

                {/* Commission Rate */}
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {tierData.benefits.commissionRate}% commission
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Tier Details */}
      {selectedTier && (
        <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          {(() => {
            const tierData = tiers.find(t => t.tier === selectedTier);
            if (!tierData) return null;

            return (
              <div className="space-y-6">
                {/* Tier Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {tierData.name} Tier
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {tierData.description}
                    </p>
                  </div>
                  <SellerTierBadge tier={tierData.tier} size="lg" />
                </div>

                {/* Requirements Section */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Requirements
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sales Requirement */}
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Total Sales
                          </span>
                          <span className={`text-sm font-semibold ${
                            isRequirementMet(currentMetrics.totalSales, tierData.requirements.sales)
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            ${currentMetrics.totalSales.toLocaleString()} / ${tierData.requirements.sales.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isRequirementMet(currentMetrics.totalSales, tierData.requirements.sales)
                                ? 'bg-green-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ 
                              width: `${getRequirementProgress(currentMetrics.totalSales, tierData.requirements.sales)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rating Requirement */}
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Rating
                          </span>
                          <span className={`text-sm font-semibold ${
                            isRequirementMet(currentMetrics.rating, tierData.requirements.rating)
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {currentMetrics.rating.toFixed(1)} / {tierData.requirements.rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isRequirementMet(currentMetrics.rating, tierData.requirements.rating)
                                ? 'bg-green-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ 
                              width: `${getRequirementProgress(currentMetrics.rating, tierData.requirements.rating)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Response Time Requirement */}
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Response Time
                          </span>
                          <span className={`text-sm font-semibold ${
                            isRequirementMet(tierData.requirements.responseTime, currentMetrics.responseTime)
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {currentMetrics.responseTime} min / {tierData.requirements.responseTime} min
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isRequirementMet(tierData.requirements.responseTime, currentMetrics.responseTime)
                                ? 'bg-green-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ 
                              width: `${getRequirementProgress(tierData.requirements.responseTime, currentMetrics.responseTime)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Requirements (if applicable) */}
                    {tierData.requirements.returnRate && (
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Return Rate
                            </span>
                            <span className={`text-sm font-semibold ${
                              isRequirementMet(tierData.requirements.returnRate, currentMetrics.returnRate)
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {currentMetrics.returnRate}% / {tierData.requirements.returnRate}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                isRequirementMet(tierData.requirements.returnRate, currentMetrics.returnRate)
                                  ? 'bg-green-500'
                                  : 'bg-blue-500'
                              }`}
                              style={{ 
                                width: `${getRequirementProgress(tierData.requirements.returnRate, currentMetrics.returnRate)}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Benefits Section */}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Benefits
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Commission Rate
                        </div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {tierData.benefits.commissionRate}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Withdrawal Limit
                        </div>
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          ${tierData.benefits.withdrawalLimit.toLocaleString()}/week
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Support Level
                        </div>
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {tierData.benefits.support}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Features
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {tierData.benefits.features.length} premium features
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default TierProgressionUI;