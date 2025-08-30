import React, { useState, useRef, useEffect } from 'react';

// Animated Button Component
interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  animation?: 'bounce' | 'scale' | 'glow' | 'ripple';
}

export function AnimatedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  animation = 'scale'
}: AnimatedButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const baseClasses = 'relative overflow-hidden font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:ring-primary-500',
    ghost: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
    gradient: 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:from-primary-700 hover:to-secondary-700 focus:ring-primary-500 shadow-lg hover:shadow-xl'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  const animationClasses = {
    bounce: isPressed ? 'animate-bounce' : '',
    scale: isPressed ? 'transform scale-95' : 'hover:scale-105',
    glow: 'hover:animate-glow',
    ripple: ''
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);

    // Ripple effect for ripple animation
    if (animation === 'ripple' && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { id: Date.now(), x, y };
      
      setRipples(prev => [...prev, newRipple]);
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    }

    onClick?.();
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${animationClasses[animation]} ${className}`}
    >
      {/* Ripple effects */}
      {animation === 'ripple' && ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ping"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Button content */}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
}

// Animated Card Component
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  animation?: 'lift' | 'glow' | 'tilt' | 'fade';
  delay?: number;
}

export function AnimatedCard({
  children,
  className = '',
  hover = true,
  animation = 'lift',
  delay = 0
}: AnimatedCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const baseClasses = 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl shadow-lg border border-white/30 dark:border-gray-700/50 transition-all duration-300';
  
  const animationClasses = {
    lift: hover ? 'hover:shadow-2xl hover:-translate-y-1' : '',
    glow: hover ? 'hover:shadow-2xl hover:shadow-primary-500/25' : '',
    tilt: hover ? 'hover:rotate-1 hover:scale-105' : '',
    fade: ''
  };

  const visibilityClasses = isVisible ? 'animate-fadeInUp opacity-100' : 'opacity-0';

  return (
    <div
      ref={cardRef}
      className={`${baseClasses} ${animationClasses[animation]} ${visibilityClasses} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Animated Icon Component
interface AnimatedIconProps {
  children: React.ReactNode;
  animation?: 'spin' | 'bounce' | 'pulse' | 'wiggle' | 'heartbeat' | 'float';
  trigger?: 'hover' | 'always' | 'click';
  className?: string;
}

export function AnimatedIcon({
  children,
  animation = 'pulse',
  trigger = 'hover',
  className = ''
}: AnimatedIconProps) {
  const [isActive, setIsActive] = useState(trigger === 'always');

  const animationClasses = {
    spin: 'animate-spin',
    bounce: 'animate-bounce',
    pulse: 'animate-pulse',
    wiggle: 'animate-wiggle',
    heartbeat: 'animate-heartbeat',
    float: 'animate-float'
  };

  const triggerClasses = {
    hover: `hover:${animationClasses[animation]}`,
    always: animationClasses[animation],
    click: isActive ? animationClasses[animation] : ''
  };

  const handleClick = () => {
    if (trigger === 'click') {
      setIsActive(true);
      setTimeout(() => setIsActive(false), 1000);
    }
  };

  return (
    <div
      className={`inline-block ${triggerClasses[trigger]} ${className}`}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

// Animated Counter Component
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  className = '',
  prefix = '',
  suffix = ''
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          animateCounter();
        }
      },
      { threshold: 0.1 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  const animateCounter = () => {
    const startTime = Date.now();
    const startValue = displayValue;
    const difference = value - startValue;

    const updateCounter = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(startValue + difference * easeOutQuart);
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    requestAnimationFrame(updateCounter);
  };

  return (
    <span ref={counterRef} className={`font-bold ${className}`}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

// Animated Progress Bar
interface AnimatedProgressBarProps {
  progress: number;
  className?: string;
  color?: 'primary' | 'secondary' | 'green' | 'red' | 'yellow';
  showLabel?: boolean;
  animated?: boolean;
}

export function AnimatedProgressBar({
  progress,
  className = '',
  color = 'primary',
  showLabel = false,
  animated = true
}: AnimatedProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const colorClasses = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600',
    secondary: 'bg-gradient-to-r from-secondary-500 to-secondary-600',
    green: 'bg-gradient-to-r from-green-500 to-green-600',
    red: 'bg-gradient-to-r from-red-500 to-red-600',
    yellow: 'bg-gradient-to-r from-yellow-500 to-yellow-600'
  };

  return (
    <div className={`relative ${className}`}>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-1000 ease-out ${animated ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(Math.max(displayProgress, 0), 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 top-0 -mt-6 text-sm font-medium text-gray-600 dark:text-gray-400">
          {Math.round(displayProgress)}%
        </span>
      )}
    </div>
  );
}

// Animated Badge Component
interface AnimatedBadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export function AnimatedBadge({
  children,
  variant = 'primary',
  size = 'md',
  pulse = false,
  className = ''
}: AnimatedBadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-all duration-200';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 dark:from-primary-900/30 dark:to-primary-800/30 dark:text-primary-200',
    secondary: 'bg-gradient-to-r from-secondary-100 to-secondary-200 text-secondary-800 dark:from-secondary-900/30 dark:to-secondary-800/30 dark:text-secondary-200',
    success: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-200',
    warning: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-800/30 dark:text-yellow-200',
    error: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-200'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base'
  };

  const pulseClass = pulse ? 'animate-pulse' : '';

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${pulseClass} ${className}`}>
      {children}
    </span>
  );
}

// Staggered Animation Container
interface StaggeredAnimationProps {
  children: React.ReactNode[];
  delay?: number;
  animation?: 'fadeInUp' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn';
  className?: string;
}

export function StaggeredAnimation({
  children,
  delay = 100,
  animation = 'fadeInUp',
  className = ''
}: StaggeredAnimationProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`animate-${animation}`}
          style={{ animationDelay: `${index * delay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}