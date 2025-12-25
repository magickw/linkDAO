/**
 * TierBenefitsCard Component
 * Shows current tier benefits and comparison with other tiers
 */

import React, { useState } from 'react';
import { SellerTierBadge, SellerTier } from './SellerTierBadge';
import {
  DollarSign,
  Users,
  Headphones,
  Crown,
  Shield,
  Zap,
  TrendingUp,
  Award,
  Star,
  ChevronRight,
  Info,
  CheckCircle,
  Lock
} from 'lucide-react';

interface TierBenefit {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  value: string;
  isAvailable: boolean;
}

interface TierBenefitsCardProps {
  currentTier: SellerTier;
  benefits: Record<SellerTier, TierBenefit[]>;
  onUpgradeClick?: () => void;
  showComparison?: boolean;
  className?: string;
}

const TIER_CONFIG = {
  bronze: {
    name: 'Bronze',
    description: 'Perfect for new sellers',
    color: 'from-amber-500 to-amber-700',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  silver: {
    name: 'Silver',
    description: 'Growing sellers with consistent sales',
    color: 'from-gray-400 to-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-700'
  },
  gold: {
    name: 'Gold',
    description: 'Established sellers with strong performance',
    color: 'from-yellow-400 to-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  platinum: {
    name: 'Platinum',
    description: 'High-performing sellers with exceptional service',
    color: 'from-cyan-400 to-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    borderColor: 'border-cyan-200 dark:border-cyan-800'
  },
  diamond: {
    name: 'Diamond',
    description: 'Top-performing sellers who exemplify excellence',
    color: 'from-purple-500 to-purple-700',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800'
  }
};

export const TierBenefitsCard: React.FC<TierBenefitsCardProps> = ({
  currentTier,
  benefits,
  onUpgradeClick,
  showComparison = false,
  className = ''
}) => {
  const [selectedBenefit, setSelectedBenefit] = useState<string | null>(null);
  const currentTierConfig = TIER_CONFIG[currentTier];
  const currentBenefits = benefits[currentTier] || [];

  const getBenefitIcon = (title: string) => {
    if (title.toLowerCase().includes('commission') || title.toLowerCase().includes('rate')) {
      return DollarSign;
    }
    if (title.toLowerCase().includes('support') || title.toLowerCase().includes('help')) {
      return Headphones;
    }
    if (title.toLowerCase().includes('withdrawal') || title.toLowerCase().includes('limit')) {
      return TrendingUp;
    }
    if (title.toLowerCase().includes('feature') || title.toLowerCase().includes('access')) {
      return Zap;
    }
    if (title.toLowerCase().includes('manager') || title.toLowerCase().includes('dedicated')) {
      return Users;
    }
    if (title.toLowerCase().includes('priority') || title.toLowerCase().includes('premium')) {
      return Crown;
    }
    if (title.toLowerCase().includes('protection') || title.toLowerCase().includes('security')) {
      return Shield;
    }
    return Award;
  };

  const renderBenefitCard = (benefit: TierBenefit, isExpanded = false) => {
    const Icon = benefit.icon;
    return (
      <div
        key={benefit.title}
        className={`
          p-4 rounded-lg border transition-all duration-300
          ${benefit.isAvailable 
            ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20'
          }
          ${isExpanded ? 'col-span-full' : ''}
          hover:shadow-md cursor-pointer
        `}
        onClick={() => setSelectedBenefit(selectedBenefit === benefit.title ? null : benefit.title)}
      >
        <div className="flex items-start gap-3">
          <div className={`
            p-2 rounded-lg
            ${benefit.isAvailable 
              ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' 
              : 'bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500'
            }
          `}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {benefit.title}
              </h4>
              {benefit.isAvailable ? (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {benefit.description}
            </p>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {benefit.value}
            </div>
            {selectedBenefit === benefit.title && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {benefit.isAvailable 
                    ? 'This benefit is currently active for your account.'
                    : 'Upgrade to a higher tier to unlock this benefit.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTierComparison = () => {
    const tiers: SellerTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left p-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Benefit
              </th>
              {tiers.map(tier => (
                <th key={tier} className="text-center p-3">
                  <SellerTierBadge tier={tier} size="sm" showLabel={false} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentBenefits.map((benefit, index) => (
              <tr key={benefit.title} className="border-b border-gray-100 dark:border-gray-800">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <benefit.icon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {benefit.title}
                    </span>
                  </div>
                </td>
                {tiers.map(tier => {
                  const tierBenefit = benefits[tier]?.find(b => b.title === benefit.title);
                  return (
                    <td key={tier} className="text-center p-3">
                      {tierBenefit?.isAvailable ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto" />
                      ) : (
                        <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className={`
        p-6 border-b border-gray-200 dark:border-gray-700
        ${currentTierConfig.bgColor}
      `}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <SellerTierBadge tier={currentTier} size="lg" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentTierConfig.name} Tier Benefits
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {currentTierConfig.description}
                </p>
              </div>
            </div>
          </div>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Upgrade Tier
            </button>
          )}
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {currentBenefits.map(benefit => renderBenefitCard(benefit))}
        </div>

        {/* Toggle Comparison */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Compare benefits across all tiers
            </span>
          </div>
          <button
            onClick={() => setSelectedBenefit(showComparison ? null : 'comparison')}
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            {showComparison ? 'Hide' : 'Show'} Comparison
            <ChevronRight className={`w-4 h-4 transition-transform ${
              selectedBenefit === 'comparison' ? 'rotate-90' : ''
            }`} />
          </button>
        </div>

        {/* Tier Comparison */}
        {selectedBenefit === 'comparison' && (
          <div className="mt-4">
            {renderTierComparison()}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <Star className="inline w-4 h-4 mr-1" />
            {currentBenefits.filter(b => b.isAvailable).length} of {currentBenefits.length} benefits active
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Upgrade to unlock {currentBenefits.filter(b => !b.isAvailable).length} more benefits
          </div>
        </div>
      </div>
    </div>
  );
};

export default TierBenefitsCard;