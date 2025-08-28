import React, { useState, useEffect } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';

interface DeFiPosition {
  protocol: string;
  asset: string;
  balance: number;
  valueUSD: number;
  apy: number;
  pnl: number;
}

interface SocialAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  dateEarned?: string;
}

interface GamifiedReputation {
  score: number;
  tier: string;
  nextTier: string;
  progressToNext: number;
  achievements: SocialAchievement[];
}

export default function DeFiSynergyDashboard({ className = '' }: { className?: string }) {
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  const [defiPositions, setDefiPositions] = useState<DeFiPosition[]>([]);
  const [reputation, setReputation] = useState<GamifiedReputation | null>(null);
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const fetchData = () => {
      try {
        setLoading(true);
        
        // Mock DeFi positions
        const mockPositions: DeFiPosition[] = [
          { protocol: 'Aave', asset: 'USDC', balance: 1200, valueUSD: 1200, apy: 4.2, pnl: 25.50 },
          { protocol: 'Compound', asset: 'ETH', balance: 0.5, valueUSD: 950, apy: 2.8, pnl: -12.30 },
          { protocol: 'Uniswap', asset: 'ETH/USDC LP', balance: 350, valueUSD: 350, apy: 12.5, pnl: 42.75 },
          { protocol: 'Curve', asset: '3CRV', balance: 200, valueUSD: 200, apy: 3.1, pnl: 6.20 },
        ];
        
        // Mock reputation data
        const mockReputation: GamifiedReputation = {
          score: 750,
          tier: 'Expert',
          nextTier: 'Master',
          progressToNext: 65,
          achievements: [
            { id: '1', title: 'First Post', description: 'Created your first DeFi analysis post', icon: '📝', earned: true, dateEarned: '2023-06-15' },
            { id: '2', title: 'Hot Take', description: 'Received 100+ hot reactions', icon: '🔥', earned: true, dateEarned: '2023-06-22' },
            { id: '3', title: 'Bullish', description: 'Posted 5 bullish DeFi strategies', icon: '🚀', earned: true, dateEarned: '2023-07-01' },
            { id: '4', title: 'Diamond Hands', description: 'Held position through 20%+ drawdown', icon: '💎', earned: false },
            { id: '5', title: 'Governance', description: 'Participated in 3 DAO votes', icon: '⚖️', earned: true, dateEarned: '2023-07-10' },
            { id: '6', title: 'Master Trader', description: 'Achieve 80%+ win rate on 10+ trades', icon: '🏆', earned: false },
          ]
        };
        
        setDefiPositions(mockPositions);
        setReputation(mockReputation);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        addToast('Failed to load dashboard data', 'error');
        setLoading(false);
      }
    };
    
    if (isConnected) {
      fetchData();
    } else {
      setLoading(false);
    }
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isConnected, addToast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const totalPortfolioValue = defiPositions.reduce((sum, position) => sum + position.valueUSD, 0);
  const totalPnL = defiPositions.reduce((sum, position) => sum + position.pnl, 0);
  const isPositive = totalPnL >= 0;

  if (!isConnected) {
    return (
      <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
        <div className="p-6 text-center">
          <div className="mx-auto bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Connect your wallet to see your DeFi positions and reputation stats
          </p>
          <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">DeFi + Social Dashboard</h3>
          <div className="flex space-x-1">
            {(['24h', '7d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 text-xs rounded-full ${
                  timeframe === tf
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Portfolio Summary */}
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Portfolio Value</p>
            <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(totalPortfolioValue)}</p>
          </div>
          <div className={`rounded-xl p-3 ${isPositive ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">P&L</p>
            <p className={`font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(totalPnL)} ({formatPercentage((totalPnL / totalPortfolioValue) * 100)})
            </p>
          </div>
        </div>
      </div>
      
      {/* DeFi Positions */}
      <div className="p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Your DeFi Positions</h4>
        <div className="space-y-3">
          {defiPositions.map((position, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm font-bold">
                  {position.protocol.substring(0, 2)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{position.protocol}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{position.asset}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(position.valueUSD)}</p>
                <p className={`text-xs ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(position.pnl)} ({formatPercentage(position.apy)} APY)
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Reputation & Achievements */}
      {reputation && (
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Reputation</h4>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-900 dark:text-white">{reputation.tier}</span>
              <span className="text-gray-500 dark:text-gray-400">{reputation.score} pts</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full" 
                style={{ width: `${reputation.progressToNext}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {100 - reputation.progressToNext}% to {reputation.nextTier}
            </div>
          </div>
          
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recent Achievements</h4>
          <div className="grid grid-cols-3 gap-2">
            {reputation.achievements.slice(0, 6).map((achievement) => (
              <div 
                key={achievement.id} 
                className={`flex flex-col items-center p-2 rounded-lg ${
                  achievement.earned 
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border border-yellow-200 dark:border-yellow-700/50' 
                    : 'bg-gray-100 dark:bg-gray-700/50 opacity-50'
                }`}
                title={achievement.earned ? `${achievement.title}: ${achievement.description}` : `Locked: ${achievement.description}`}
              >
                <span className="text-xl mb-1">{achievement.icon}</span>
                <span className="text-xs text-center text-gray-700 dark:text-gray-300 font-medium">
                  {achievement.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}