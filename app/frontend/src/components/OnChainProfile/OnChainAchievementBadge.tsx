import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OnChainAchievement } from '../../types/onChainVerification';

interface OnChainAchievementBadgeProps {
  achievement: OnChainAchievement;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  showVerificationProof?: boolean;
  className?: string;
  onClick?: (achievement: OnChainAchievement) => void;
}

const SIZE_CONFIGS = {
  small: {
    container: 'w-12 h-12',
    icon: 'text-lg',
    modal: 'max-w-md'
  },
  medium: {
    container: 'w-16 h-16',
    icon: 'text-2xl',
    modal: 'max-w-lg'
  },
  large: {
    container: 'w-20 h-20',
    icon: 'text-3xl',
    modal: 'max-w-xl'
  }
};

const RARITY_CONFIGS = {
  common: {
    gradient: 'from-gray-500 to-slate-500',
    glow: 'shadow-gray-500/25',
    border: 'border-gray-400/30'
  },
  rare: {
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'shadow-blue-500/25',
    border: 'border-blue-400/30'
  },
  epic: {
    gradient: 'from-purple-500 to-pink-500',
    glow: 'shadow-purple-500/25',
    border: 'border-purple-400/30'
  },
  legendary: {
    gradient: 'from-yellow-400 to-orange-500',
    glow: 'shadow-yellow-500/25',
    border: 'border-yellow-400/30'
  }
};

export const OnChainAchievementBadge: React.FC<OnChainAchievementBadgeProps> = ({
  achievement,
  size = 'medium',
  showDetails = true,
  showVerificationProof = true,
  className = '',
  onClick
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const sizeConfig = SIZE_CONFIGS[size];
  const rarityConfig = RARITY_CONFIGS[achievement.rarity];

  const handleClick = () => {
    if (onClick) {
      onClick(achievement);
    } else if (showDetails) {
      setShowModal(true);
    }
  };

  const getVerificationStatus = () => {
    if (achievement.verified) {
      return {
        icon: '✅',
        text: 'Verified',
        color: 'text-green-400'
      };
    } else {
      return {
        icon: '⏳',
        text: 'Pending',
        color: 'text-yellow-400'
      };
    }
  };

  const formatCriteria = (criteria: any) => {
    const parts = [];
    
    if (criteria.minimumTransactions) {
      parts.push(`${criteria.minimumTransactions}+ transactions`);
    }
    
    if (criteria.minimumValue) {
      parts.push(`${criteria.minimumValue} ETH+ volume`);
    }
    
    if (criteria.specificContracts?.length) {
      parts.push(`Interact with ${criteria.specificContracts.length} specific contracts`);
    }
    
    if (criteria.timeframe?.duration) {
      parts.push(`Within ${criteria.timeframe.duration} days`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Custom criteria';
  };

  return (
    <>
      <motion.div
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative ${sizeConfig.container} rounded-full cursor-pointer
          bg-gradient-to-br ${rarityConfig.gradient}
          border-2 ${rarityConfig.border}
          flex items-center justify-center
          transition-all duration-300
          ${achievement.verified ? rarityConfig.glow : 'opacity-60'}
          ${className}
        `}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        animate={achievement.rarity === 'legendary' ? {
          boxShadow: [
            '0 0 20px rgba(251, 191, 36, 0.3)',
            '0 0 30px rgba(251, 191, 36, 0.5)',
            '0 0 20px rgba(251, 191, 36, 0.3)'
          ]
        } : {}}
        transition={achievement.rarity === 'legendary' ? {
          boxShadow: { repeat: Infinity, duration: 2 }
        } : {}}
      >
        <span className={`${sizeConfig.icon}`}>
          {achievement.icon}
        </span>

        {/* Verification Status Indicator */}
        <div className="absolute -top-1 -right-1">
          <div className={`
            w-4 h-4 rounded-full flex items-center justify-center text-xs
            ${achievement.verified ? 'bg-green-500' : 'bg-yellow-500'}
          `}>
            {getVerificationStatus().icon}
          </div>
        </div>

        {/* Rarity Indicator */}
        {achievement.rarity !== 'common' && (
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
            <div className={`
              px-1 py-0.5 rounded text-xs font-bold text-white
              bg-gradient-to-r ${rarityConfig.gradient}
              border ${rarityConfig.border}
            `}>
              {achievement.rarity.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Hover Tooltip */}
        <AnimatePresence>
          {isHovered && size !== 'small' && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50"
            >
              <div className={`
                px-3 py-2 rounded-lg text-sm text-white
                bg-gray-900/95 backdrop-blur-sm border border-white/10
                shadow-lg max-w-xs text-center
                bg-gradient-to-r ${rarityConfig.gradient}
              `}>
                <div className="font-medium">{achievement.title}</div>
                <div className="text-xs text-white/80 mt-1 capitalize">
                  {achievement.rarity} • {getVerificationStatus().text}
                </div>
                
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                  <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Detailed Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`
                bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl p-6
                ${sizeConfig.modal} w-full
              `}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`
                    w-16 h-16 rounded-full bg-gradient-to-br ${rarityConfig.gradient}
                    border-2 ${rarityConfig.border} flex items-center justify-center
                    ${achievement.verified ? rarityConfig.glow : 'opacity-60'}
                  `}>
                    <span className="text-2xl">{achievement.icon}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {achievement.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-sm capitalize ${getVerificationStatus().color}`}>
                        {getVerificationStatus().icon} {getVerificationStatus().text}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-400 capitalize">
                        {achievement.rarity}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-gray-300">{achievement.description}</p>
              </div>

              {/* Verification Criteria */}
              <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                <h4 className="text-white font-medium mb-2">Requirements</h4>
                <p className="text-gray-300 text-sm">
                  {formatCriteria(achievement.verificationCriteria)}
                </p>
                
                {achievement.verificationCriteria.additionalRequirements && (
                  <div className="mt-3">
                    <h5 className="text-white text-sm font-medium mb-1">Additional Requirements:</h5>
                    <ul className="text-gray-300 text-sm space-y-1">
                      {achievement.verificationCriteria.additionalRequirements.map((req, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-400 mt-0.5">•</span>
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Verification Details */}
              {achievement.verified && achievement.verifiedAt && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-green-400">✅</span>
                    <h4 className="text-green-400 font-medium">Achievement Unlocked!</h4>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Earned on {new Date(achievement.verifiedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Proof Requirements */}
              {showVerificationProof && achievement.proofRequired.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3">Verification Proof</h4>
                  <div className="space-y-2">
                    {achievement.proofRequired.map((proofType, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <span className="text-gray-300 capitalize">
                          {proofType.replace('_', ' ')}
                        </span>
                        <span className="text-green-400">Required</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NFT Badge */}
              {achievement.nftContract && achievement.nftTokenId && (
                <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-purple-400 font-medium">NFT Badge Available</h4>
                      <p className="text-gray-300 text-sm">
                        This achievement comes with an NFT badge
                      </p>
                    </div>
                    <a
                      href={`https://etherscan.io/address/${achievement.nftContract}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-md text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white"
                    >
                      View NFT
                    </a>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
                
                {achievement.verified && (
                  <button
                    onClick={() => {
                      // Share achievement functionality
                      navigator.share?.({
                        title: `I earned the "${achievement.title}" achievement!`,
                        text: achievement.description,
                        url: window.location.href
                      });
                    }}
                    className={`
                      flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200
                      bg-gradient-to-r ${rarityConfig.gradient} hover:shadow-lg text-white
                    `}
                  >
                    Share Achievement
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};