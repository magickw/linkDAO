/**
 * MicroAnimations Component
 * Provides smooth micro-animations and visual feedback for Web3 interactions
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Web3ReactionType, WEB3_REACTIONS } from './Web3InteractionButtons';

interface FloatingReactionProps {
  reaction: Web3ReactionType;
  onComplete: () => void;
}

const FloatingReaction: React.FC<FloatingReactionProps> = ({ reaction, onComplete }) => {
  const config = WEB3_REACTIONS[reaction];

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      initial={{ 
        opacity: 0, 
        scale: 0.5, 
        y: 0,
        x: 0
      }}
      animate={{ 
        opacity: [0, 1, 1, 0], 
        scale: [0.5, 1.2, 1, 0.8], 
        y: -60,
        x: Math.random() * 40 - 20
      }}
      transition={{ 
        duration: 2,
        ease: "easeOut"
      }}
      onAnimationComplete={onComplete}
    >
      <div className={`text-2xl filter drop-shadow-lg`}>
        {config.emoji}
      </div>
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r ${config.color} rounded-full blur-md opacity-30`}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.6, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity
        }}
      />
    </motion.div>
  );
};

interface PulseEffectProps {
  isActive: boolean;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const PulseEffect: React.FC<PulseEffectProps> = ({ isActive, color, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gradient-to-r ${color} opacity-20`}
          initial={{ scale: 0.8, opacity: 0.4 }}
          animate={{ 
            scale: [0.8, 1.2, 1.5], 
            opacity: [0.4, 0.2, 0] 
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      )}
    </AnimatePresence>
  );
};

interface RippleEffectProps {
  isTriggered: boolean;
  onComplete: () => void;
  color?: string;
}

const RippleEffect: React.FC<RippleEffectProps> = ({ 
  isTriggered, 
  onComplete, 
  color = 'from-blue-400 to-purple-500' 
}) => {
  return (
    <AnimatePresence>
      {isTriggered && (
        <motion.div
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${color} opacity-30`}
          initial={{ scale: 0, opacity: 0.6 }}
          animate={{ scale: 2, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          onAnimationComplete={onComplete}
        />
      )}
    </AnimatePresence>
  );
};

interface ParticleExplosionProps {
  isTriggered: boolean;
  color: string;
  particleCount?: number;
}

const ParticleExplosion: React.FC<ParticleExplosionProps> = ({ 
  isTriggered, 
  color, 
  particleCount = 8 
}) => {
  return (
    <AnimatePresence>
      {isTriggered && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(particleCount)].map((_, i) => {
            const angle = (i / particleCount) * 2 * Math.PI;
            const distance = 50 + Math.random() * 30;
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance;

            return (
              <motion.div
                key={i}
                className={`absolute w-2 h-2 bg-gradient-to-r ${color} rounded-full`}
                style={{
                  left: '50%',
                  top: '50%',
                  marginLeft: '-4px',
                  marginTop: '-4px'
                }}
                initial={{ 
                  scale: 0, 
                  x: 0, 
                  y: 0,
                  opacity: 1
                }}
                animate={{ 
                  scale: [0, 1, 0], 
                  x: x, 
                  y: y,
                  opacity: [1, 1, 0]
                }}
                transition={{ 
                  duration: 1.2,
                  delay: i * 0.05,
                  ease: "easeOut"
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
};

interface ShimmerEffectProps {
  isActive: boolean;
  children: React.ReactNode;
}

const ShimmerEffect: React.FC<ShimmerEffectProps> = ({ isActive, children }) => {
  return (
    <div className="relative overflow-hidden">
      {children}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            exit={{ x: '100%' }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 2,
              ease: "easeInOut"
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface GlowEffectProps {
  isActive: boolean;
  color: string;
  intensity?: 'low' | 'medium' | 'high';
  children: React.ReactNode;
}

const GlowEffect: React.FC<GlowEffectProps> = ({ 
  isActive, 
  color, 
  intensity = 'medium', 
  children 
}) => {
  const intensityClasses = {
    low: 'shadow-sm',
    medium: 'shadow-md',
    high: 'shadow-lg'
  };

  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-r ${color} ${intensityClasses[intensity]} blur-sm opacity-50`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: [0, 0.5, 0.3], 
              scale: [0.8, 1.1, 1] 
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

interface CounterAnimationProps {
  value: number;
  previousValue?: number;
  duration?: number;
  className?: string;
}

const CounterAnimation: React.FC<CounterAnimationProps> = ({ 
  value, 
  previousValue = 0, 
  duration = 0.5,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(previousValue);

  useEffect(() => {
    if (value !== previousValue) {
      const startTime = Date.now();
      const startValue = displayValue;
      const endValue = value;
      const difference = endValue - startValue;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = Math.round(startValue + (difference * easeOutCubic));
        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value, previousValue, duration, displayValue]);

  return (
    <motion.span
      className={className}
      key={value}
      initial={{ scale: 1 }}
      animate={{ scale: value > previousValue ? [1, 1.2, 1] : [1, 0.8, 1] }}
      transition={{ duration: 0.3 }}
    >
      {displayValue.toLocaleString()}
    </motion.span>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'border-blue-500' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${color} border-t-transparent rounded-full`}
      animate={{ rotate: 360 }}
      transition={{ 
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
};

// Export all animation components
export {
  FloatingReaction,
  PulseEffect,
  RippleEffect,
  ParticleExplosion,
  ShimmerEffect,
  GlowEffect,
  CounterAnimation,
  LoadingSpinner
};

// Composite animation hook for managing multiple effects
export const useMicroAnimations = () => {
  const [activeAnimations, setActiveAnimations] = useState<Set<string>>(new Set());

  const triggerAnimation = (animationId: string, duration: number = 1000) => {
    setActiveAnimations(prev => new Set(prev).add(animationId));
    
    setTimeout(() => {
      setActiveAnimations(prev => {
        const newSet = new Set(prev);
        newSet.delete(animationId);
        return newSet;
      });
    }, duration);
  };

  const isAnimationActive = (animationId: string) => {
    return activeAnimations.has(animationId);
  };

  return {
    triggerAnimation,
    isAnimationActive,
    activeAnimations
  };
};