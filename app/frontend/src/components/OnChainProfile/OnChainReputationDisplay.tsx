import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface ReputationMetric {
  name: string;
  value: number;
  maxValue: number;
  weight: number;
  description: string;
  icon: string;
  color: string;
}

interface OnChainReputationDisplayProps {
  address: string;
  totalReputation: number;
  trustScore: number;
  verificationLevel: 'unverified' | 'basic' | 'advanced' | 'expert';
  metrics?: ReputationMetric[];
  showBreakdown?: boolean;
  showTrends?: boolean;
  size?: 'compact' | 'detailed' | 'full';
  className?: string;
}

const DEFAULT_METRICS: ReputationMetric[] = [
  {
    name: 'Transaction History',
    value: 0,
    maxValue: 1000,
    weight: 0.3,
    description: 'Based on transaction volume and frequency',
    icon: '📊',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    name: 'Community Participation',
    value: 0,
    maxValue: 100,
    weight: 0.25,
    description: 'Governance voting and community engagement',
    icon: '🗳️',
    color: 'from-purple-500 to-pink-500'
  },
  {
    name: 'DeFi Activity',
    value: 0,
    maxValue: 500,
    weight: 0.2,
    description: 'Liquidity provision and protocol usage',
    icon: '🏦',
    color: 'from-green-500 to-emerald-500'
  },
  {
    name: 'NFT Holdings',
    value: 0,
    maxValue: 200,
    weight: 0.15,
    description: 'Verified NFT collections and rarity',
    icon: '🎨',
    color: 'from-orange-500 to-red-500'
  },
  {
    name: 'Security Score',
    value: 0,
    maxValue: 100,
    weight: 0.1,
    description: 'No malicious activity or compromised addresses',
    icon: '🛡️',
    color: 'from-gray-500 to-slate-500'
  }
];

const VERIFICATION_LEVELS = {
  unverified: {
    label: 'Unverified',
    icon: '❓',
    color: 'from-gray-500 to-slate-500',
    minScore: 0
  },
  basic: {
    label: 'Basic',
    icon: '✅',
    color: 'from-green-500 to-emerald-500',
    minScore: 25
  },
  advanced: {
    label: 'Advanced',
    icon: '🏆',
    color: 'from-blue-500 to-cyan-500',
    minScore: 60
  },
  expert: {
    label: 'Expert',
    icon: '👑',
    color: 'from-purple-500 to-pink-500',
    minScore: 85
  }
};

export const OnChainReputationDisplay: React.FC<OnChainReputationDisplayProps> = ({
  address,
  totalReputation,
  trustScore,
  verificationLevel,
  metrics = DEFAULT_METRICS,
  showBreakdown = true,
  showTrends = false,
  size = 'detailed',
  className = ''
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [animatedTrust, setAnimatedTrust] = useState(0);

  const levelConfig = VERIFICATION_LEVELS[verificationLevel];
  const reputationPercentage = Math.min((totalReputation / 1000) * 100, 100);
  const trustPercentage = trustScore * 100;

  useEffect(() => {
    // Animate score counting
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      setAnimatedScore(Math.floor(totalReputation * progress));
      setAnimatedTrust(Math.floor(trustPercentage * progress));
      
      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedScore(totalReputation);
        setAnimatedTrust(Math.floor(trustPercentage));
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [totalReputation, trustPercentage]);

  const getNextLevel = () => {
    const levels = Object.entries(VERIFICATION_LEVELS);
    const currentIndex = levels.findIndex(([key]) => key === verificationLevel);
    
    if (currentIndex < levels.length - 1) {
      return levels[currentIndex + 1][1];
    }
    
    return null;
  };

  const getProgressToNextLevel = () => {
    const nextLevel = getNextLevel();
    if (!nextLevel) return 100;
    
    const currentMin = levelConfig.minScore;
    const nextMin = nextLevel.minScore;
    const progress = ((reputationPercentage - currentMin) / (nextMin - currentMin)) * 100;
    
    return Math.max(0, Math.min(100, progress));
  };

  if (size === 'compact') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className={`
          w-12 h-12 rounded-full bg-gradient-to-r ${levelConfig.color}
          flex items-center justify-center border-2 border-white/20
        `}>
          <span className="text-xl">{levelConfig.icon}</span>
        </div>
        
        <div>
          <div className="text-white font-medium">{animatedScore.toLocaleString()}</div>
          <div className="text-gray-400 text-sm">{levelConfig.label}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">On-Chain Reputation</h3>
        <div className={`
          px-3 py-1 rounded-full bg-gradient-to-r ${levelConfig.color}
          flex items-center space-x-2
        `}>
          <span>{levelConfig.icon}</span>
          <span className="text-white text-sm font-medium">{levelConfig.label}</span>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="text-center mb-8">
        <motion.div
          className="text-4xl font-bold text-white mb-2"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          {animatedScore.toLocaleString()}
        </motion.div>
        
        <div className="text-gray-400 mb-4">Reputation Score</div>
        
        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${levelConfig.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${reputationPercentage}%` }}
            transition={{ duration: 2, ease: 'easeOut' }}
          />
          
          {/* Level Markers */}
          {Object.values(VERIFICATION_LEVELS).map((level, index) => (
            <div
              key={index}
              className="absolute top-0 h-full w-0.5 bg-white/30"
              style={{ left: `${level.minScore}%` }}
            />
          ))}
        </div>
        
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>0</span>
          <span>1000</span>
        </div>
      </div>

      {/* Trust Score */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{animatedTrust}%</div>
          <div className="text-sm text-gray-400">Trust Score</div>
          <div className="w-full h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${trustPercentage}%` }}
              transition={{ duration: 2, ease: 'easeOut' }}
            />
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {getProgressToNextLevel().toFixed(0)}%
          </div>
          <div className="text-sm text-gray-400">
            {getNextLevel() ? `To ${getNextLevel()?.label}` : 'Max Level'}
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${getNextLevel()?.color || levelConfig.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${getProgressToNextLevel()}%` }}
              transition={{ duration: 2, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Metrics Breakdown */}
      {showBreakdown && (
        <div className="space-y-4">
          <h4 className="text-white font-medium">Reputation Breakdown</h4>
          
          {metrics.map((metric, index) => {
            const percentage = (metric.value / metric.maxValue) * 100;
            const contribution = (metric.value / metric.maxValue) * metric.weight * 1000;
            
            return (
              <motion.div
                key={metric.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800/30 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{metric.icon}</span>
                    <span className="text-white font-medium">{metric.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      +{contribution.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {metric.value}/{metric.maxValue}
                    </div>
                  </div>
                </div>
                
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${metric.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1.5, delay: index * 0.1 }}
                  />
                </div>
                
                <p className="text-xs text-gray-400 mt-2">{metric.description}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Trends (if enabled) */}
      {showTrends && (
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
          <h4 className="text-white font-medium mb-3">Recent Trends</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-green-400 font-medium">+12%</div>
              <div className="text-xs text-gray-400">This Week</div>
            </div>
            <div>
              <div className="text-green-400 font-medium">+8%</div>
              <div className="text-xs text-gray-400">This Month</div>
            </div>
            <div>
              <div className="text-blue-400 font-medium">Stable</div>
              <div className="text-xs text-gray-400">Overall</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};