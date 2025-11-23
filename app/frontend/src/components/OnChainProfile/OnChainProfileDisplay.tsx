import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnChainProfile, OnChainAchievement, UserNFT } from '../../types/onChainVerification';
import { onChainVerificationService } from '../../services/web3/onChainVerificationService';
import { NFTVerificationBadge } from '../Trust/NFTVerificationBadge';

interface OnChainProfileDisplayProps {
  address: string;
  showAchievements?: boolean;
  showNFTs?: boolean;
  showReputation?: boolean;
  showTransactionHistory?: boolean;
  maxNFTs?: number;
  maxAchievements?: number;
  size?: 'compact' | 'detailed' | 'full';
  className?: string;
}

const SIZE_CONFIGS = {
  compact: {
    container: 'p-4',
    title: 'text-lg',
    subtitle: 'text-sm',
    nftGrid: 'grid-cols-3',
    achievementGrid: 'grid-cols-2'
  },
  detailed: {
    container: 'p-6',
    title: 'text-xl',
    subtitle: 'text-base',
    nftGrid: 'grid-cols-4',
    achievementGrid: 'grid-cols-3'
  },
  full: {
    container: 'p-8',
    title: 'text-2xl',
    subtitle: 'text-lg',
    nftGrid: 'grid-cols-6',
    achievementGrid: 'grid-cols-4'
  }
};

export const OnChainProfileDisplay: React.FC<OnChainProfileDisplayProps> = ({
  address,
  showAchievements = true,
  showNFTs = true,
  showReputation = true,
  showTransactionHistory = true,
  maxNFTs = 12,
  maxAchievements = 8,
  size = 'detailed',
  className = ''
}) => {
  const [profile, setProfile] = useState<OnChainProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'nfts' | 'activity'>('overview');

  const sizeConfig = SIZE_CONFIGS[size];

  useEffect(() => {
    loadProfile();
  }, [address]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const profileData = await onChainVerificationService.getOnChainProfile(address);
      setProfile(profileData);
    } catch (error) {
      console.error('Failed to load on-chain profile:', error);
      setError('Failed to load on-chain profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getVerificationLevelColor = (level: string) => {
    switch (level) {
      case 'expert':
        return 'from-purple-500 to-pink-500';
      case 'advanced':
        return 'from-blue-500 to-cyan-500';
      case 'basic':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  const getVerificationLevelIcon = (level: string) => {
    switch (level) {
      case 'expert':
        return '👑';
      case 'advanced':
        return '🏆';
      case 'basic':
        return '✅';
      default:
        return '❓';
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'from-yellow-400 to-orange-500';
      case 'epic':
        return 'from-purple-500 to-pink-500';
      case 'rare':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl ${sizeConfig.container} ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-red-500/20 rounded-xl ${sizeConfig.container} ${className}`}>
        <div className="text-center">
          <span className="text-red-400 text-2xl">⚠️</span>
          <p className="text-red-400 mt-2">{error || 'Profile not found'}</p>
          <button
            onClick={loadProfile}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl ${sizeConfig.container} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`font-semibold text-white ${sizeConfig.title}`}>
            On-Chain Profile
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <code className={`text-gray-300 ${sizeConfig.subtitle}`}>
              {profile.ensName || formatAddress(profile.address)}
            </code>
            <a
              href={`https://etherscan.io/address/${profile.address}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-2 py-1 text-xs rounded-md text-gray-300 hover:text-white hover:bg-white/10"
              title="View address on Etherscan"
            >
              ↗
            </a>
          </div>
        </div>

        {/* Verification Level Badge */}
        <div className={`
          px-3 py-1 rounded-full bg-gradient-to-r ${getVerificationLevelColor(profile.verificationLevel)}
          flex items-center space-x-2
        `}>
          <span>{getVerificationLevelIcon(profile.verificationLevel)}</span>
          <span className="text-white text-sm font-medium capitalize">
            {profile.verificationLevel}
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      {showReputation && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">
              {profile.onChainReputation.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">Reputation</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">
              {profile.totalTransactions.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">Transactions</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">
              {profile.achievements.filter(a => a.verified).length}
            </div>
            <div className="text-xs text-gray-400">Achievements</div>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">
              {Math.round(profile.trustScore * 100)}%
            </div>
            <div className="text-xs text-gray-400">Trust Score</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {size !== 'compact' && (
        <div className="flex space-x-1 mb-6 bg-gray-800/30 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'achievements', label: 'Achievements', icon: '🏆' },
            { id: 'nfts', label: 'NFTs', icon: '🎨' },
            { id: 'activity', label: 'Activity', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Recent Achievements */}
              {showAchievements && profile.achievements.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-3">Recent Achievements</h4>
                  <div className={`grid ${sizeConfig.achievementGrid} gap-3`}>
                    {profile.achievements
                      .filter(a => a.verified)
                      .slice(0, 4)
                      .map((achievement) => (
                        <motion.div
                          key={achievement.id}
                          className={`
                            p-3 rounded-lg bg-gradient-to-r ${getRarityColor(achievement.rarity)}
                            border border-white/20
                          `}
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="text-center">
                            <div className="text-2xl mb-1">{achievement.icon}</div>
                            <div className="text-white text-sm font-medium">
                              {achievement.title}
                            </div>
                            <div className="text-xs text-white/80 capitalize">
                              {achievement.rarity}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              )}

              {/* Featured NFTs */}
              {showNFTs && profile.nftCollections.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-3">Featured NFTs</h4>
                  <div className={`grid ${sizeConfig.nftGrid} gap-3`}>
                    {profile.nftCollections.slice(0, 6).map((nft) => (
                      <motion.div
                        key={`${nft.contractAddress}-${nft.tokenId}`}
                        className="relative group"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                          {nft.imageUrl ? (
                            <img
                              src={nft.imageUrl}
                              alt={nft.name || `NFT #${nft.tokenId}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              🎨
                            </div>
                          )}
                        </div>
                        
                        {nft.verified && (
                          <div className="absolute top-2 right-2">
                            <NFTVerificationBadge
                              contractAddress={nft.contractAddress}
                              tokenId={nft.tokenId}
                              size="sm"
                            />
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          <div className="text-center text-white">
                            <div className="font-medium text-sm">
                              {nft.name || `#${nft.tokenId}`}
                            </div>
                            <div className="text-xs text-gray-300">
                              {nft.collection.name}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="space-y-4">
              {profile.achievements
                .filter(a => a.verified)
                .slice(0, maxAchievements)
                .map((achievement) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`
                      p-4 rounded-lg bg-gradient-to-r ${getRarityColor(achievement.rarity)}
                      border border-white/20
                    `}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h5 className="text-white font-medium">{achievement.title}</h5>
                        <p className="text-white/80 text-sm">{achievement.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-white/60 capitalize">
                            {achievement.rarity}
                          </span>
                          {achievement.verifiedAt && (
                            <span className="text-xs text-white/60">
                              Earned {new Date(achievement.verifiedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          )}

          {/* NFTs Tab */}
          {activeTab === 'nfts' && (
            <div className={`grid ${sizeConfig.nftGrid} gap-4`}>
              {profile.nftCollections.slice(0, maxNFTs).map((nft) => (
                <motion.div
                  key={`${nft.contractAddress}-${nft.tokenId}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-800/50 rounded-lg overflow-hidden"
                >
                  <div className="aspect-square">
                    {nft.imageUrl ? (
                      <img
                        src={nft.imageUrl}
                        alt={nft.name || `NFT #${nft.tokenId}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-700">
                        🎨
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-white text-sm font-medium truncate">
                        {nft.name || `#${nft.tokenId}`}
                      </h6>
                      {nft.verified && (
                        <span className="text-green-400 text-xs">✅</span>
                      )}
                    </div>
                    
                    <p className="text-gray-400 text-xs truncate">
                      {nft.collection.name}
                    </p>
                    
                    {nft.attributes && nft.attributes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {nft.attributes.slice(0, 2).map((attr, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-700 text-xs text-gray-300 rounded"
                          >
                            {attr.trait_type}: {attr.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && showTransactionHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h5 className="text-white font-medium mb-2">First Transaction</h5>
                  <p className="text-gray-300 text-sm">
                    {new Date(profile.firstTransaction).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h5 className="text-white font-medium mb-2">Last Activity</h5>
                  <p className="text-gray-300 text-sm">
                    {new Date(profile.lastTransaction).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h5 className="text-white font-medium mb-2">Total Value Transacted</h5>
                <p className="text-2xl font-bold text-white">
                  {profile.totalValue.toLocaleString()} ETH
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};