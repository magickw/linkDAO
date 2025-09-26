/**
 * GameFi Achievement System
 * Tracks on-chain activity and awards achievement badges
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Star, Zap, Wallet, TrendingUp, 
  Users, Target, Award, Crown, Gem, Flame,
  CheckCircle, Lock, Clock, Gift, Rocket, Shield, Calendar
} from 'lucide-react';
import { useAccount } from 'wagmi';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'trading' | 'governance' | 'social' | 'defi' | 'nft' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  icon: React.ReactNode;
  requirements: AchievementRequirement[];
  reward: {
    points: number;
    tokens?: number;
    nft?: string;
    badge?: string;
  };
  isUnlocked: boolean;
  progress: number;
  unlockedAt?: Date;
  xpValue: number;
}

interface AchievementRequirement {
  type: 'transaction_count' | 'volume' | 'nft_count' | 'governance_votes' | 'social_interactions' | 'defi_interactions' | 'time_held' | 'custom';
  target: number;
  current: number;
  description: string;
}

interface LeaderboardEntry {
  address: string;
  name: string;
  totalPoints: number;
  achievements: number;
  rank: number;
  avatar?: string;
  badges: string[];
}

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  rewards: {
    points: number;
    tokens?: number;
    nft?: string;
  };
  requirements: AchievementRequirement[];
  isCompleted: boolean;
  expiresAt: Date;
  progress: number;
}

const AchievementSystem: React.FC<{
  className?: string;
  onAchievementUnlocked?: (achievement: Achievement) => void;
  onQuestCompleted?: (quest: Quest) => void;
}> = ({ className = '', onAchievementUnlocked, onQuestCompleted }) => {
  const { address, isConnected } = useAccount();
  
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'first_trade',
      name: 'First Trade',
      description: 'Complete your first marketplace transaction',
      category: 'trading',
      rarity: 'common',
      icon: <Wallet size={24} />,
      requirements: [{ type: 'transaction_count', target: 1, current: 1, description: 'Complete 1 transaction' }],
      reward: { points: 100, tokens: 10 },
      isUnlocked: true,
      progress: 100,
      unlockedAt: new Date(Date.now() - 86400000),
      xpValue: 100
    },
    {
      id: 'volume_trader',
      name: 'Volume Trader',
      description: 'Trade over $10,000 in total volume',
      category: 'trading',
      rarity: 'rare',
      icon: <TrendingUp size={24} />,
      requirements: [{ type: 'volume', target: 10000, current: 7500, description: 'Trade $10,000 total volume' }],
      reward: { points: 500, tokens: 50 },
      isUnlocked: false,
      progress: 75,
      xpValue: 500
    },
    {
      id: 'nft_collector',
      name: 'NFT Collector',
      description: 'Own 10 or more NFTs',
      category: 'nft',
      rarity: 'epic',
      icon: <Gem size={24} />,
      requirements: [{ type: 'nft_count', target: 10, current: 7, description: 'Own 10 NFTs' }],
      reward: { points: 1000, tokens: 100, nft: 'Collector Badge' },
      isUnlocked: false,
      progress: 70,
      xpValue: 1000
    },
    {
      id: 'governance_participant',
      name: 'Governance Participant',
      description: 'Vote on 5 DAO proposals',
      category: 'governance',
      rarity: 'rare',
      icon: <Users size={24} />,
      requirements: [{ type: 'governance_votes', target: 5, current: 3, description: 'Vote on 5 proposals' }],
      reward: { points: 750, tokens: 75 },
      isUnlocked: false,
      progress: 60,
      xpValue: 750
    },
    {
      id: 'defi_explorer',
      name: 'DeFi Explorer',
      description: 'Interact with 3 different DeFi protocols',
      category: 'defi',
      rarity: 'epic',
      icon: <Zap size={24} />,
      requirements: [{ type: 'defi_interactions', target: 3, current: 2, description: 'Use 3 DeFi protocols' }],
      reward: { points: 1200, tokens: 120 },
      isUnlocked: false,
      progress: 67,
      xpValue: 1200
    },
    {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Make 100 social interactions (posts, comments, reactions)',
      category: 'social',
      rarity: 'common',
      icon: <Users size={24} />,
      requirements: [{ type: 'social_interactions', target: 100, current: 85, description: 'Make 100 social interactions' }],
      reward: { points: 300, tokens: 30 },
      isUnlocked: false,
      progress: 85,
      xpValue: 300
    },
    {
      id: 'legendary_trader',
      name: 'Legendary Trader',
      description: 'Achieve $100,000 in trading volume',
      category: 'trading',
      rarity: 'legendary',
      icon: <Crown size={24} />,
      requirements: [{ type: 'volume', target: 100000, current: 25000, description: 'Trade $100,000 total volume' }],
      reward: { points: 5000, tokens: 500, nft: 'Legendary Trader NFT' },
      isUnlocked: false,
      progress: 25,
      xpValue: 5000
    },
    {
      id: 'dao_champion',
      name: 'DAO Champion',
      description: 'Lead a successful governance proposal',
      category: 'governance',
      rarity: 'mythic',
      icon: <Crown size={24} />,
      requirements: [{ type: 'custom', target: 1, current: 0, description: 'Lead a successful proposal' }],
      reward: { points: 10000, tokens: 1000, nft: 'DAO Champion Crown' },
      isUnlocked: false,
      progress: 0,
      xpValue: 10000
    }
  ]);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([
    {
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
      name: 'vitalik.eth',
      totalPoints: 15420,
      achievements: 12,
      rank: 1,
      badges: ['Legendary Trader', 'DAO Champion', 'DeFi Explorer']
    },
    {
      address: '0x8ba1f109551bD432803012645Hac136c30C6d8b1',
      name: 'alice.eth',
      totalPoints: 12850,
      achievements: 10,
      rank: 2,
      badges: ['Volume Trader', 'NFT Collector', 'Governance Participant']
    },
    {
      address: address || '',
      name: 'you',
      totalPoints: 8500,
      achievements: 6,
      rank: 3,
      badges: ['First Trade', 'Social Butterfly']
    }
  ]);

  const [activeQuests, setActiveQuests] = useState<Quest[]>([
    {
      id: 'daily_trade',
      title: 'Daily Trader',
      description: 'Complete 3 marketplace transactions today',
      type: 'daily',
      rewards: { points: 200, tokens: 20 },
      requirements: [{ type: 'transaction_count', target: 3, current: 1, description: 'Complete 3 transactions' }],
      isCompleted: false,
      expiresAt: new Date(Date.now() + 86400000),
      progress: 33
    },
    {
      id: 'weekly_social',
      title: 'Weekly Social',
      description: 'Make 20 social interactions this week',
      type: 'weekly',
      rewards: { points: 500, tokens: 50 },
      requirements: [{ type: 'social_interactions', target: 20, current: 12, description: 'Make 20 interactions' }],
      isCompleted: false,
      expiresAt: new Date(Date.now() + 7 * 86400000),
      progress: 60
    },
    {
      id: 'monthly_governance',
      title: 'Monthly Governance',
      description: 'Participate in 3 governance votes this month',
      type: 'monthly',
      rewards: { points: 1000, tokens: 100, nft: 'Governance Badge' },
      requirements: [{ type: 'governance_votes', target: 3, current: 2, description: 'Vote on 3 proposals' }],
      isCompleted: false,
      expiresAt: new Date(Date.now() + 30 * 86400000),
      progress: 67
    }
  ]);

  const [userStats, setUserStats] = useState({
    totalPoints: 8500,
    totalAchievements: 6,
    currentLevel: 8,
    xpToNextLevel: 1500,
    totalXp: 8500,
    rank: 3
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-orange-400';
      case 'mythic': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-800';
      case 'rare': return 'bg-blue-900';
      case 'epic': return 'bg-purple-900';
      case 'legendary': return 'bg-orange-900';
      case 'mythic': return 'bg-red-900';
      default: return 'bg-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trading': return <TrendingUp size={16} />;
      case 'governance': return <Users size={16} />;
      case 'social': return <Users size={16} />;
      case 'defi': return <Zap size={16} />;
      case 'nft': return <Gem size={16} />;
      case 'special': return <Crown size={16} />;
      default: return <Award size={16} />;
    }
  };

  const unlockAchievement = (achievementId: string) => {
    setAchievements(prev => prev.map(ach => 
      ach.id === achievementId 
        ? { ...ach, isUnlocked: true, unlockedAt: new Date(), progress: 100 }
        : ach
    ));
    
    const achievement = achievements.find(ach => ach.id === achievementId);
    if (achievement) {
      onAchievementUnlocked?.(achievement);
      
      // Update user stats
      setUserStats(prev => ({
        ...prev,
        totalPoints: prev.totalPoints + achievement.reward.points,
        totalAchievements: prev.totalAchievements + 1,
        totalXp: prev.totalXp + achievement.xpValue
      }));
    }
  };

  const completeQuest = (questId: string) => {
    setActiveQuests(prev => prev.map(quest => 
      quest.id === questId 
        ? { ...quest, isCompleted: true, progress: 100 }
        : quest
    ));
    
    const quest = activeQuests.find(q => q.id === questId);
    if (quest) {
      onQuestCompleted?.(quest);
      
      // Update user stats
      setUserStats(prev => ({
        ...prev,
        totalPoints: prev.totalPoints + quest.rewards.points,
        totalXp: prev.totalXp + quest.rewards.points
      }));
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Trophy size={24} className="text-yellow-500 mr-3" />
          <div>
            <h2 className="text-xl font-bold text-white">Achievement System</h2>
            <p className="text-sm text-gray-400">Track your Web3 journey and earn rewards</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{userStats.totalPoints.toLocaleString()}</div>
          <div className="text-sm text-gray-400">Total Points</div>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{userStats.currentLevel}</div>
          <div className="text-sm text-gray-400">Level</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{userStats.totalAchievements}</div>
          <div className="text-sm text-gray-400">Achievements</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">#{userStats.rank}</div>
          <div className="text-sm text-gray-400">Rank</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{userStats.xpToNextLevel}</div>
          <div className="text-sm text-gray-400">XP to Next</div>
        </div>
      </div>

      {/* Active Quests */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Target size={20} className="mr-2" />
          Active Quests
        </h3>
        
        <div className="space-y-3">
          {activeQuests.map(quest => (
            <div key={quest.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                    quest.type === 'daily' ? 'bg-green-900' :
                    quest.type === 'weekly' ? 'bg-blue-900' :
                    quest.type === 'monthly' ? 'bg-purple-900' : 'bg-orange-900'
                  }`}>
                    {quest.type === 'daily' ? <Clock size={16} className="text-green-400" /> :
                     quest.type === 'weekly' ? <Calendar size={16} className="text-blue-400" /> :
                     quest.type === 'monthly' ? <Calendar size={16} className="text-purple-400" /> :
                     <Gift size={16} className="text-orange-400" />}
                  </div>
                  
                  <div>
                    <div className="font-medium text-white">{quest.title}</div>
                    <div className="text-sm text-gray-400">{quest.description}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{quest.rewards.points} XP</div>
                  {quest.rewards.tokens && (
                    <div className="text-xs text-gray-400">{quest.rewards.tokens} tokens</div>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white">{quest.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${quest.progress}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Expires: {quest.expiresAt.toLocaleDateString()}
                </div>
                
                {quest.progress === 100 && !quest.isCompleted && (
                  <button
                    onClick={() => completeQuest(quest.id)}
                    className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                  >
                    Claim Reward
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Award size={20} className="mr-2" />
          Achievements
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {achievements.map(achievement => (
            <div 
              key={achievement.id} 
              className={`rounded-lg p-4 border ${
                achievement.isUnlocked 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-gray-800 border-gray-700 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                    achievement.isUnlocked ? getRarityBg(achievement.rarity) : 'bg-gray-700'
                  }`}>
                    {achievement.isUnlocked ? achievement.icon : <Lock size={20} className="text-gray-500" />}
                  </div>
                  
                  <div>
                    <div className="font-medium text-white">{achievement.name}</div>
                    <div className="text-sm text-gray-400">{achievement.description}</div>
                  </div>
                </div>
                
                <div className={`text-sm font-semibold ${getRarityColor(achievement.rarity)}`}>
                  {achievement.rarity.toUpperCase()}
                </div>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white">{achievement.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      achievement.isUnlocked ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{ width: `${achievement.progress}%` }}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-xs text-gray-400">
                  {getCategoryIcon(achievement.category)}
                  <span className="ml-1 capitalize">{achievement.category}</span>
                </div>
                
                <div className="text-sm font-semibold text-yellow-400">
                  {achievement.reward.points} XP
                </div>
              </div>
              
              {achievement.isUnlocked && achievement.unlockedAt && (
                <div className="mt-2 text-xs text-green-400">
                  Unlocked: {achievement.unlockedAt.toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Trophy size={20} className="mr-2" />
          Leaderboard
        </h3>
        
        <div className="space-y-2">
          {leaderboard.map(entry => (
            <div 
              key={entry.address}
              className={`flex items-center p-3 rounded-lg ${
                entry.address === address ? 'bg-blue-900' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">
                    {entry.rank === 1 ? '👑' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </span>
                </div>
                
                <div>
                  <div className="font-medium text-white">{entry.name}</div>
                  <div className="text-sm text-gray-400">{entry.totalPoints.toLocaleString()} points</div>
                </div>
              </div>
              
              <div className="ml-auto text-right">
                <div className="text-sm text-white">{entry.achievements} achievements</div>
                <div className="text-xs text-gray-400">
                  {entry.badges.slice(0, 2).join(', ')}
                  {entry.badges.length > 2 && ` +${entry.badges.length - 2} more`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementSystem;