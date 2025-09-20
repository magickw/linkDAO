import React, { useEffect, useState } from 'react';
import { Achievement, BadgeRarity } from '../../types/reputation';

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose?: () => void;
  onViewDetails?: (achievement: Achievement) => void;
  autoClose?: boolean;
  duration?: number;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose,
  onViewDetails,
  autoClose = true,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const getRarityStyles = (rarity: BadgeRarity) => {
    const styles = {
      common: {
        bg: 'from-gray-400 to-gray-600',
        border: 'border-gray-400',
        glow: 'shadow-gray-400/50',
        particles: 'bg-gray-300'
      },
      rare: {
        bg: 'from-blue-400 to-blue-600',
        border: 'border-blue-400',
        glow: 'shadow-blue-400/50',
        particles: 'bg-blue-300'
      },
      epic: {
        bg: 'from-purple-400 to-purple-600',
        border: 'border-purple-400',
        glow: 'shadow-purple-400/50',
        particles: 'bg-purple-300'
      },
      legendary: {
        bg: 'from-yellow-400 to-yellow-600',
        border: 'border-yellow-400',
        glow: 'shadow-yellow-400/50',
        particles: 'bg-yellow-300'
      }
    };
    return styles[rarity];
  };

  const rarityStyles = getRarityStyles(achievement.rarity);

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm w-full
      transform transition-all duration-300 ease-out
      ${isVisible && !isClosing ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}
    `}>
      {/* Background with particles effect */}
      <div className="relative overflow-hidden">
        {/* Animated particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`
                absolute w-1 h-1 ${rarityStyles.particles} rounded-full
                animate-bounce opacity-70
              `}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* Main notification card */}
        <div className={`
          relative bg-white rounded-xl shadow-2xl border-2 ${rarityStyles.border}
          ${rarityStyles.glow} shadow-xl
          overflow-hidden
        `}>
          {/* Gradient header */}
          <div className={`
            h-2 bg-gradient-to-r ${rarityStyles.bg}
            animate-pulse
          `} />

          {/* Content */}
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`
                  w-8 h-8 rounded-full bg-gradient-to-r ${rarityStyles.bg}
                  flex items-center justify-center text-white text-lg
                  animate-pulse
                `}>
                  🏆
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">
                    Achievement Unlocked!
                  </h3>
                  <p className={`
                    text-xs px-2 py-1 rounded-full text-white inline-block
                    bg-gradient-to-r ${rarityStyles.bg}
                  `}>
                    {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Achievement Details */}
            <div className="flex items-center space-x-3 mb-3">
              <div className={`
                w-12 h-12 rounded-full bg-gradient-to-r ${rarityStyles.bg}
                flex items-center justify-center text-2xl
                animate-bounce
              `}>
                {achievement.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-base">
                  {achievement.name}
                </h4>
                <p className="text-sm text-gray-600">
                  {achievement.description}
                </p>
              </div>
            </div>

            {/* Points Earned */}
            <div className="flex items-center justify-between mb-3 p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Points Earned:</span>
              <span className={`
                font-bold text-lg bg-gradient-to-r ${rarityStyles.bg}
                bg-clip-text text-transparent
              `}>
                +{achievement.points}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => onViewDetails?.(achievement)}
                className={`
                  flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white
                  bg-gradient-to-r ${rarityStyles.bg}
                  hover:opacity-90 transition-opacity duration-200
                  transform hover:scale-105 active:scale-95
                `}
              >
                View Details
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Celebration animation overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Sparkle effects */}
            {[...Array(8)].map((_, i) => (
              <div
                key={`sparkle-${i}`}
                className="absolute w-2 h-2 text-yellow-400 animate-ping"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animationDelay: `${Math.random() * 1}s`,
                  animationDuration: '1.5s'
                }}
              >
                ✨
              </div>
            ))}
          </div>
        </div>

        {/* Confetti effect */}
        <div className="absolute -top-4 -left-4 -right-4 -bottom-4 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={`confetti-${i}`}
              className={`
                absolute w-2 h-2 ${rarityStyles.particles} rounded-full
                animate-bounce opacity-60
              `}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementNotification;