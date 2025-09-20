/**
 * CelebrationAnimation Component
 * Milestone celebration system with animations
 */

import React, { useEffect, useState } from 'react';
import {
  CelebrationAnimationProps,
  REACTION_TYPES
} from '../../types/tokenReaction';
import tokenReactionService from '../../services/tokenReactionService';

const CelebrationAnimation: React.FC<CelebrationAnimationProps> = ({
  event,
  onComplete
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'celebrate' | 'exit'>('enter');

  const config = REACTION_TYPES[event.reactionType];
  const theme = tokenReactionService.getReactionTheme(event.reactionType);

  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationPhase('celebrate'), 300);
    const timer2 = setTimeout(() => setAnimationPhase('exit'), 2500);
    const timer3 = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  const getAnimationClasses = () => {
    switch (animationPhase) {
      case 'enter':
        return 'scale-0 opacity-0';
      case 'celebrate':
        return 'scale-100 opacity-100 animate-bounce';
      case 'exit':
        return 'scale-110 opacity-0';
      default:
        return '';
    }
  };

  const getParticleAnimation = (index: number) => {
    const delay = index * 100;
    const angle = (index * 45) % 360;
    const distance = 100 + (index * 20);
    
    return {
      animationDelay: `${delay}ms`,
      '--particle-angle': `${angle}deg`,
      '--particle-distance': `${distance}px`,
    } as React.CSSProperties;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      {/* Background Overlay */}
      <div className={`absolute inset-0 bg-black transition-opacity duration-500 ${
        animationPhase === 'celebrate' ? 'opacity-20' : 'opacity-0'
      }`} />

      {/* Main Celebration Container */}
      <div className={`
        relative transform transition-all duration-500 ease-out
        ${getAnimationClasses()}
      `}>
        {/* Central Reaction Display */}
        <div className={`
          relative flex flex-col items-center justify-center
          w-32 h-32 rounded-full bg-gradient-to-r ${theme.gradient}
          shadow-2xl ${theme.glow}
        `}>
          {/* Main Emoji */}
          <div className="text-6xl animate-pulse">
            {config.emoji}
          </div>
          
          {/* Amount Display */}
          <div className="text-white font-bold text-lg mt-2">
            +{event.amount}
          </div>

          {/* Particle Effects */}
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className={`
                absolute w-3 h-3 rounded-full bg-gradient-to-r ${theme.gradient}
                animate-ping opacity-75
              `}
              style={getParticleAnimation(index)}
            />
          ))}

          {/* Ripple Effects */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${theme.gradient} opacity-30 animate-ping`} />
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${theme.gradient} opacity-20 animate-ping`} style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Message Display */}
        <div className={`
          mt-6 px-6 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg
          transform transition-all duration-500 delay-300
          ${animationPhase === 'celebrate' ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}>
          <div className="text-center">
            <div className="font-bold text-lg text-gray-900 dark:text-white mb-1">
              {event.type === 'milestone' ? '🎉 Milestone Reached!' : 
               event.type === 'big_stake' ? '💪 Big Stake!' : 
               '🎊 First Reaction!'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {event.message}
            </div>
            
            {/* Milestone Details */}
            {event.milestone && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                Reward: +{event.milestone.reward} LDAO
              </div>
            )}
          </div>
        </div>

        {/* Floating Emojis */}
        {animationPhase === 'celebrate' && (
          <>
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={`floating-${index}`}
                className="absolute text-2xl animate-bounce opacity-80"
                style={{
                  left: `${Math.random() * 200 - 100}px`,
                  top: `${Math.random() * 200 - 100}px`,
                  animationDelay: `${Math.random() * 1000}ms`,
                  animationDuration: `${1000 + Math.random() * 1000}ms`,
                }}
              >
                {['🎉', '✨', '🎊', '💫', '⭐'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </>
        )}

        {/* Confetti Effect */}
        {animationPhase === 'celebrate' && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 20 }).map((_, index) => (
              <div
                key={`confetti-${index}`}
                className={`
                  absolute w-2 h-2 bg-gradient-to-r ${theme.gradient}
                  animate-ping opacity-60
                `}
                style={{
                  left: `${Math.random() * 400 - 200}px`,
                  top: `${Math.random() * 400 - 200}px`,
                  animationDelay: `${Math.random() * 2000}ms`,
                  animationDuration: `${1500 + Math.random() * 1000}ms`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sound Effect Indicator */}
      {animationPhase === 'celebrate' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              🔊 Celebration!
            </span>
          </div>
        </div>
      )}

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes particle-float {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(
              calc(cos(var(--particle-angle)) * var(--particle-distance)),
              calc(sin(var(--particle-angle)) * var(--particle-distance))
            ) rotate(360deg);
            opacity: 0;
          }
        }
        
        .animate-particle {
          animation: particle-float 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default CelebrationAnimation;