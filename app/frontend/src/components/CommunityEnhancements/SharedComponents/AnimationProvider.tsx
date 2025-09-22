/**
 * Animation Provider
 * Context provider for consistent animations across community enhancements
 */

import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { AnimationConfig } from '../../../types/communityEnhancements';

interface AnimationContextType {
  triggerAnimation: (element: HTMLElement, type: AnimationType, config?: Partial<AnimationConfig>) => void;
  isAnimationEnabled: boolean;
  setAnimationEnabled: (enabled: boolean) => void;
  getPerformanceMetrics: () => AnimationPerformanceMetrics;
}

interface AnimationPerformanceMetrics {
  totalAnimations: number;
  averageFrameRate: number;
  droppedFrames: number;
  performanceScore: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

type AnimationType = 'bounce' | 'pulse' | 'shake' | 'celebrate' | 'fadeIn' | 'slideIn' | 'glow' | 'success';

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

interface AnimationProviderProps {
  children: React.ReactNode;
  defaultEnabled?: boolean;
}

const defaultAnimationConfigs: Record<AnimationType, AnimationConfig> = {
  bounce: { duration: 300, easing: 'ease-in-out' },
  pulse: { duration: 500, easing: 'ease-in-out' },
  shake: { duration: 300, easing: 'ease-in-out' },
  celebrate: { duration: 600, easing: 'ease-out', scale: 1.1 },
  fadeIn: { duration: 250, easing: 'ease-in' },
  slideIn: { duration: 350, easing: 'ease-out' },
  glow: { duration: 400, easing: 'ease-in-out', color: '#3b82f6' },
  success: { duration: 400, easing: 'ease-in-out', color: '#22c55e' },
};

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ 
  children, 
  defaultEnabled = true 
}) => {
  const [isAnimationEnabled, setIsAnimationEnabled] = React.useState(defaultEnabled);
  const animationRefs = useRef<Map<HTMLElement, Animation[]>>(new Map());
  
  // Performance monitoring
  const performanceMetrics = useRef({
    totalAnimations: 0,
    frameRates: [] as number[],
    droppedFrames: 0,
    startTimes: new Map<Animation, number>(),
  });

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsAnimationEnabled(!e.matches && defaultEnabled);
    };
    
    // Set initial state
    setIsAnimationEnabled(!mediaQuery.matches && defaultEnabled);
    
    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [defaultEnabled]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      animationRefs.current.forEach((animations) => {
        animations.forEach(animation => animation.cancel());
      });
      animationRefs.current.clear();
    };
  }, []);

  const triggerAnimation = useCallback((
    element: HTMLElement, 
    type: AnimationType, 
    config: Partial<AnimationConfig> = {}
  ) => {
    if (!isAnimationEnabled || !element) return;

    const animationConfig = { ...defaultAnimationConfigs[type], ...config };
    
    // Cancel any existing animations on this element
    const existingAnimations = animationRefs.current.get(element) || [];
    existingAnimations.forEach(animation => animation.cancel());

    let keyframes: Keyframe[] = [];
    
    // Define keyframes based on animation type
    switch (type) {
      case 'bounce':
        keyframes = [
          { transform: 'scale(1)', offset: 0 },
          { transform: `scale(${animationConfig.scale || 1.05})`, offset: 0.5 },
          { transform: 'scale(1)', offset: 1 },
        ];
        break;
        
      case 'pulse':
        keyframes = [
          { opacity: '1', offset: 0 },
          { opacity: '0.7', offset: 0.5 },
          { opacity: '1', offset: 1 },
        ];
        break;
        
      case 'shake':
        keyframes = [
          { transform: 'translateX(0)', offset: 0 },
          { transform: 'translateX(-2px)', offset: 0.25 },
          { transform: 'translateX(2px)', offset: 0.75 },
          { transform: 'translateX(0)', offset: 1 },
        ];
        break;
        
      case 'celebrate':
        keyframes = [
          { transform: 'scale(1) rotate(0deg)', offset: 0 },
          { transform: `scale(${animationConfig.scale || 1.1}) rotate(-5deg)`, offset: 0.25 },
          { transform: `scale(${(animationConfig.scale || 1.1) + 0.05}) rotate(5deg)`, offset: 0.5 },
          { transform: `scale(${(animationConfig.scale || 1.1) - 0.05}) rotate(-2deg)`, offset: 0.75 },
          { transform: 'scale(1) rotate(0deg)', offset: 1 },
        ];
        break;
        
      case 'fadeIn':
        keyframes = [
          { opacity: '0', offset: 0 },
          { opacity: '1', offset: 1 },
        ];
        break;
        
      case 'slideIn':
        keyframes = [
          { transform: 'translateY(10px)', opacity: '0', offset: 0 },
          { transform: 'translateY(0)', opacity: '1', offset: 1 },
        ];
        break;
        
      case 'glow':
        keyframes = [
          { boxShadow: '0 0 0 rgba(59, 130, 246, 0)', offset: 0 },
          { boxShadow: `0 0 20px ${animationConfig.color || '#3b82f6'}33`, offset: 0.5 },
          { boxShadow: '0 0 0 rgba(59, 130, 246, 0)', offset: 1 },
        ];
        break;

      case 'success':
        keyframes = [
          { transform: 'scale(1)', backgroundColor: element.style.backgroundColor || 'transparent', offset: 0 },
          { transform: 'scale(1.05)', backgroundColor: '#22c55e33', offset: 0.5 },
          { transform: 'scale(1)', backgroundColor: element.style.backgroundColor || 'transparent', offset: 1 },
        ];
        break;
    }

    // Create and start the animation
    const animation = element.animate(keyframes, {
      duration: animationConfig.duration,
      easing: animationConfig.easing,
      fill: 'forwards',
    });

    // Performance monitoring
    performanceMetrics.current.totalAnimations++;
    performanceMetrics.current.startTimes.set(animation, performance.now());
    
    // Monitor frame rate
    let frameCount = 0;
    let lastFrameTime = performance.now();
    
    const monitorFrameRate = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      
      if (deltaTime > 0) {
        const currentFPS = 1000 / deltaTime;
        frameCount++;
        
        // Track dropped frames (below 50 FPS is considered dropped)
        if (currentFPS < 50) {
          performanceMetrics.current.droppedFrames++;
        }
        
        // Sample frame rate every 10 frames
        if (frameCount % 10 === 0) {
          performanceMetrics.current.frameRates.push(currentFPS);
          
          // Keep only last 100 samples
          if (performanceMetrics.current.frameRates.length > 100) {
            performanceMetrics.current.frameRates.shift();
          }
        }
      }
      
      lastFrameTime = currentTime;
      
      // Continue monitoring if animation is still running
      if (animation.playState === 'running') {
        requestAnimationFrame(monitorFrameRate);
      }
    };
    
    // Start monitoring
    requestAnimationFrame(monitorFrameRate);

    // Store animation reference
    const elementAnimations = animationRefs.current.get(element) || [];
    elementAnimations.push(animation);
    animationRefs.current.set(element, elementAnimations);

    // Clean up when animation finishes
    animation.addEventListener('finish', () => {
      // Clean up performance tracking
      performanceMetrics.current.startTimes.delete(animation);
      
      const animations = animationRefs.current.get(element) || [];
      const index = animations.indexOf(animation);
      if (index > -1) {
        animations.splice(index, 1);
        if (animations.length === 0) {
          animationRefs.current.delete(element);
        } else {
          animationRefs.current.set(element, animations);
        }
      }
    });

    return animation;
  }, [isAnimationEnabled]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback((): AnimationPerformanceMetrics => {
    const metrics = performanceMetrics.current;
    const avgFrameRate = metrics.frameRates.length > 0 
      ? metrics.frameRates.reduce((sum, rate) => sum + rate, 0) / metrics.frameRates.length 
      : 60;
    
    const dropRate = metrics.totalAnimations > 0 
      ? (metrics.droppedFrames / metrics.totalAnimations) * 100 
      : 0;
    
    let performanceScore: AnimationPerformanceMetrics['performanceScore'] = 'excellent';
    const recommendations: string[] = [];
    
    if (avgFrameRate < 30) {
      performanceScore = 'poor';
      recommendations.push('Consider reducing animation complexity');
      recommendations.push('Enable hardware acceleration');
    } else if (avgFrameRate < 45) {
      performanceScore = 'fair';
      recommendations.push('Optimize animation duration');
    } else if (avgFrameRate < 55) {
      performanceScore = 'good';
    }
    
    if (dropRate > 20) {
      recommendations.push('Reduce concurrent animations');
    }
    
    if (metrics.totalAnimations > 100) {
      recommendations.push('Consider animation pooling for better performance');
    }
    
    return {
      totalAnimations: metrics.totalAnimations,
      averageFrameRate: Math.round(avgFrameRate),
      droppedFrames: metrics.droppedFrames,
      performanceScore,
      recommendations,
    };
  }, []);

  const contextValue: AnimationContextType = {
    triggerAnimation,
    isAnimationEnabled,
    setAnimationEnabled: setIsAnimationEnabled,
    getPerformanceMetrics,
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

// Hook to use animation context
export const useAnimation = (): AnimationContextType => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
};

// Higher-order component for easy animation integration
export const withAnimation = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const AnimatedComponent = React.forwardRef<any, P & { animationType?: AnimationType; animationConfig?: Partial<AnimationConfig> }>(
    ({ animationType, animationConfig, ...props }, ref) => {
      const { triggerAnimation } = useAnimation();
      const elementRef = useRef<HTMLElement | null>(null);

      const handleRef = (element: HTMLElement | null) => {
        elementRef.current = element;
        if (ref) {
          if (typeof ref === 'function') {
            ref(element);
          } else {
            ref.current = element;
          }
        }
      };

      const handleInteraction = (event: React.MouseEvent | React.TouchEvent) => {
        if (animationType && elementRef.current) {
          triggerAnimation(elementRef.current, animationType, animationConfig);
        }
      };

      return (
        <Component
          {...(props as P)}
          ref={handleRef}
          onClick={handleInteraction}
          onTouchStart={handleInteraction}
        />
      );
    }
  );

  return AnimatedComponent as any;
};

export default AnimationProvider;