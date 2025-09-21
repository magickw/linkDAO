import React from 'react';
import { motion } from 'framer-motion';
import { Menu, X, Filter, Info } from 'lucide-react';

interface MobileSidebarToggleProps {
  side: 'left' | 'right';
  isOpen: boolean;
  onToggle: () => void;
  variant?: 'menu' | 'filter' | 'info' | 'custom';
  icon?: React.ReactNode;
  label?: string;
  className?: string;
  position?: 'fixed' | 'relative';
  disabled?: boolean;
}

export default function MobileSidebarToggle({
  side,
  isOpen,
  onToggle,
  variant = 'menu',
  icon,
  label,
  className = '',
  position = 'relative',
  disabled = false
}: MobileSidebarToggleProps) {
  // Get appropriate icon based on variant
  const getIcon = () => {
    if (icon) return icon;
    
    if (isOpen) return <X className="w-5 h-5" />;
    
    switch (variant) {
      case 'filter':
        return <Filter className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'menu':
      default:
        return <Menu className="w-5 h-5" />;
    }
  };

  // Get appropriate label
  const getLabel = () => {
    if (label) return label;
    
    if (isOpen) return 'Close sidebar';
    
    switch (variant) {
      case 'filter':
        return `Open ${side} filters`;
      case 'info':
        return `Open ${side} information`;
      case 'menu':
      default:
        return `Open ${side} menu`;
    }
  };

  // Position classes
  const positionClasses = position === 'fixed' 
    ? `fixed top-4 ${side === 'left' ? 'left-4' : 'right-4'} z-30`
    : '';

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      disabled={disabled}
      className={`
        ${positionClasses}
        flex items-center justify-center
        w-10 h-10 
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700
        rounded-lg shadow-md
        text-gray-600 dark:text-gray-300
        hover:text-gray-900 dark:hover:text-white
        hover:bg-gray-50 dark:hover:bg-gray-700
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      aria-label={getLabel()}
      aria-expanded={isOpen}
      aria-controls={`${side}-sidebar`}
    >
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {getIcon()}
      </motion.div>
    </motion.button>
  );
}

// Specialized toggle buttons
export function LeftSidebarToggle(props: Omit<MobileSidebarToggleProps, 'side'>) {
  return <MobileSidebarToggle {...props} side="left" />;
}

export function RightSidebarToggle(props: Omit<MobileSidebarToggleProps, 'side'>) {
  return <MobileSidebarToggle {...props} side="right" />;
}

// Floating action button style toggle
export function FloatingSidebarToggle({
  side,
  isOpen,
  onToggle,
  variant = 'menu',
  className = '',
  ...props
}: Omit<MobileSidebarToggleProps, 'position'>) {
  return (
    <MobileSidebarToggle
      side={side}
      isOpen={isOpen}
      onToggle={onToggle}
      variant={variant}
      position="fixed"
      className={`
        w-12 h-12 
        bg-blue-600 hover:bg-blue-700 
        text-white 
        border-0 
        shadow-lg hover:shadow-xl
        ${className}
      `}
      {...props}
    />
  );
}