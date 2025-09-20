import React from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '@/design-system';

interface GlassmorphismCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'modal' | 'navbar';
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export default function GlassmorphismCard({
  children,
  className = '',
  variant = 'primary',
  hover = true,
  onClick,
  padding = 'md',
  shadow = 'md'
}: GlassmorphismCardProps) {
  const glassStyles = designTokens.glassmorphism[variant];
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  const hoverAnimation = hover ? {
    whileHover: {
      y: -4,
      scale: 1.02,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    whileTap: onClick ? {
      scale: 0.98,
      transition: { duration: 0.1 }
    } : undefined
  } : {};

  return (
    <motion.div
      className={`
        relative overflow-hidden transition-all duration-300
        ${paddingClasses[padding]}
        ${shadowClasses[shadow]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        background: glassStyles.background,
        backdropFilter: glassStyles.backdropFilter,
        WebkitBackdropFilter: glassStyles.backdropFilter,
        border: glassStyles.border,
        borderRadius: glassStyles.borderRadius,
        boxShadow: glassStyles.boxShadow
      }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      {...hoverAnimation}
    >
      {/* Subtle gradient overlay for depth */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.05) 100%)'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// Enhanced Post Card with Glassmorphism
interface EnhancedPostCardGlassProps {
  children: React.ReactNode;
  className?: string;
  trending?: boolean;
  pinned?: boolean;
  onClick?: () => void;
}

export function EnhancedPostCardGlass({
  children,
  className = '',
  trending = false,
  pinned = false,
  onClick
}: EnhancedPostCardGlassProps) {
  const getBorderGlow = () => {
    if (pinned) {
      return 'ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-400/20';
    } else if (trending) {
      return 'ring-1 ring-primary-400/50 shadow-lg shadow-primary-400/20';
    }
    return '';
  };

  return (
    <motion.div
      className={`
        relative overflow-hidden rounded-2xl transition-all duration-300
        bg-white/10 dark:bg-gray-800/10 backdrop-blur-xl
        border border-white/20 dark:border-gray-700/20
        shadow-lg hover:shadow-xl
        ${getBorderGlow()}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{
        y: -4,
        scale: 1.01,
        transition: { duration: 0.2, ease: 'easeOut' }
      }}
      whileTap={onClick ? {
        scale: 0.98,
        transition: { duration: 0.1 }
      } : undefined}
    >
      {/* Animated background gradient */}
      <motion.div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        animate={{
          background: [
            'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.05) 100%)',
            'linear-gradient(135deg, rgba(118,75,162,0.1) 0%, rgba(102,126,234,0.05) 100%)',
            'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.05) 100%)'
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// Sidebar Link with Glassmorphism
interface GlassSidebarLinkProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  icon?: React.ReactNode;
  badge?: number;
  className?: string;
}

export function GlassSidebarLink({
  children,
  href,
  onClick,
  active = false,
  icon,
  badge,
  className = ''
}: GlassSidebarLinkProps) {
  const Component = href ? 'a' : 'button';
  
  return (
    <motion.div
      className={`
        relative group w-full
        ${className}
      `}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Component
        href={href}
        onClick={onClick}
        className={`
          w-full flex items-center space-x-3 px-4 py-3 rounded-xl
          text-left transition-all duration-200
          ${active 
            ? 'bg-white/20 dark:bg-gray-700/30 text-primary-600 dark:text-primary-400 shadow-md' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-white/10 dark:hover:bg-gray-700/20'
          }
        `}
      >
        {/* Icon */}
        {icon && (
          <div className={`
            flex-shrink-0 w-5 h-5 transition-colors duration-200
            ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}
          `}>
            {icon}
          </div>
        )}
        
        {/* Label */}
        <span className="flex-1 font-medium">
          {children}
        </span>
        
        {/* Badge */}
        {badge && badge > 0 && (
          <motion.div
            className="flex-shrink-0 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {badge > 99 ? '99+' : badge}
          </motion.div>
        )}
      </Component>
      
      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/10 to-secondary-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        initial={false}
      />
    </motion.div>
  );
}