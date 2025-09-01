import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '../../design-system/components/GlassPanel';

interface GlobalStats {
  activeUsers: number;
  countriesSupported: number;
  transactionsToday: number;
  totalVolume: string;
}

interface CryptoSettlementProps {
  showLiveStats?: boolean;
  compact?: boolean;
  className?: string;
}

export const GlobalAccessibilityIndicator: React.FC<CryptoSettlementProps> = ({
  showLiveStats = true,
  compact = false,
  className = ''
}) => {
  const [stats, setStats] = useState<GlobalStats>({
    activeUsers: 12847,
    countriesSupported: 195,
    transactionsToday: 3421,
    totalVolume: '$2.4M'
  });

  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!showLiveStats) return;

    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 5),
        transactionsToday: prev.transactionsToday + Math.floor(Math.random() * 3),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [showLiveStats]);

  if (compact) {
    return (
      <div className={`flex items-center space-x-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-300">Global 24/7</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">⚡ Instant Settlement</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">🌍 {stats.countriesSupported} Countries</span>
        </div>
      </div>
    );
  }

  return (
    <GlassPanel className={`p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl">🌍</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Global Accessibility</h3>
              <p className="text-gray-400">Borderless commerce, 24/7</p>
            </div>
          </div>
          
          {isLive && (
            <motion.div
              className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-medium">LIVE</span>
            </motion.div>
          )}
        </div>

        {/* Key Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">⚡</span>
              <h4 className="text-white font-medium">Instant Settlement</h4>
            </div>
            <p className="text-gray-300 text-sm">
              Cryptocurrency payments settle instantly, no waiting for bank transfers or clearance periods.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">🚫</span>
              <h4 className="text-white font-medium">No Banking Required</h4>
            </div>
            <p className="text-gray-300 text-sm">
              Trade directly with crypto wallets, bypassing traditional banking infrastructure entirely.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-lg border border-green-500/20"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">🌐</span>
              <h4 className="text-white font-medium">Truly Borderless</h4>
            </div>
            <p className="text-gray-300 text-sm">
              No geographic restrictions, currency conversions, or international transfer fees.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20"
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">🕐</span>
              <h4 className="text-white font-medium">24/7 Operations</h4>
            </div>
            <p className="text-gray-300 text-sm">
              No banking hours, holidays, or weekend delays. Trade anytime, anywhere.
            </p>
          </motion.div>
        </div>

        {/* Live Statistics */}
        {showLiveStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-700"
          >
            <div className="text-center">
              <motion.div
                key={stats.activeUsers}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-green-400"
              >
                {stats.activeUsers.toLocaleString()}
              </motion.div>
              <p className="text-xs text-gray-400">Active Users</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {stats.countriesSupported}
              </div>
              <p className="text-xs text-gray-400">Countries</p>
            </div>

            <div className="text-center">
              <motion.div
                key={stats.transactionsToday}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-2xl font-bold text-purple-400"
              >
                {stats.transactionsToday.toLocaleString()}
              </motion.div>
              <p className="text-xs text-gray-400">Today's Transactions</p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {stats.totalVolume}
              </div>
              <p className="text-xs text-gray-400">24h Volume</p>
            </div>
          </motion.div>
        )}

        {/* Supported Networks */}
        <div className="pt-4 border-t border-gray-700">
          <h5 className="text-white font-medium mb-3">Supported Networks</h5>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'Ethereum', icon: '⟠', color: 'text-blue-400' },
              { name: 'Polygon', icon: '⬟', color: 'text-purple-400' },
              { name: 'Arbitrum', icon: '🔷', color: 'text-cyan-400' },
              { name: 'Optimism', icon: '🔴', color: 'text-red-400' },
              { name: 'BSC', icon: '🟡', color: 'text-yellow-400' }
            ].map((network) => (
              <div
                key={network.name}
                className="flex items-center space-x-2 px-3 py-1 bg-gray-800/50 rounded-full"
              >
                <span className={network.color}>{network.icon}</span>
                <span className="text-gray-300 text-sm">{network.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Ready to go global?</p>
              <p className="text-gray-400 text-sm">Start trading with anyone, anywhere</p>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};