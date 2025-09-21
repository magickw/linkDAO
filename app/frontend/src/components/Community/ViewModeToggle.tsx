import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, List, Loader2 } from 'lucide-react';
import { useViewMode, ViewMode } from '@/hooks/useViewMode';

interface ViewModeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  disabled?: boolean;
  onViewModeChange?: (viewMode: ViewMode) => void;
}

export default function ViewModeToggle({
  className = '',
  size = 'md',
  showLabels = false,
  disabled = false,
  onViewModeChange
}: ViewModeToggleProps) {
  const { viewMode, isLoading, error, toggleViewMode } = useViewMode();

  // Handle toggle with optional callback
  const handleToggle = async () => {
    if (disabled || isLoading) return;
    
    const newViewMode = viewMode === 'card' ? 'compact' : 'card';
    
    // Call the toggle function
    await toggleViewMode();
    
    // Call optional callback
    if (onViewModeChange) {
      onViewModeChange(newViewMode);
    }
  };

  // Get size-based styling
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'h-8',
          button: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          label: 'text-xs'
        };
      case 'lg':
        return {
          container: 'h-12',
          button: 'px-4 py-2 text-base',
          icon: 'w-5 h-5',
          label: 'text-base'
        };
      default: // md
        return {
          container: 'h-10',
          button: 'px-3 py-2 text-sm',
          icon: 'w-4 h-4',
          label: 'text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`flex items-center ${className}`}>
      {/* Toggle Button */}
      <div className={`relative inline-flex ${sizeClasses.container} bg-gray-100 dark:bg-gray-700 rounded-lg p-1`}>
        {/* Background Slider */}
        <motion.div
          className="absolute top-1 bottom-1 bg-white dark:bg-gray-600 rounded-md shadow-sm"
          initial={false}
          animate={{
            left: viewMode === 'card' ? '4px' : '50%',
            right: viewMode === 'card' ? '50%' : '4px'
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Card View Button */}
        <button
          onClick={handleToggle}
          disabled={disabled || isLoading}
          className={`
            relative z-10 flex items-center justify-center flex-1 ${sizeClasses.button}
            font-medium transition-colors duration-200 rounded-md
            ${viewMode === 'card' 
              ? 'text-gray-900 dark:text-white' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
          aria-label="Switch to card view"
          title="Card View - Full post cards with thumbnails"
        >
          {isLoading && viewMode === 'compact' ? (
            <Loader2 className={`${sizeClasses.icon} animate-spin`} />
          ) : (
            <LayoutGrid className={sizeClasses.icon} />
          )}
          {showLabels && (
            <span className={`ml-1 ${sizeClasses.label}`}>Card</span>
          )}
        </button>

        {/* Compact View Button */}
        <button
          onClick={handleToggle}
          disabled={disabled || isLoading}
          className={`
            relative z-10 flex items-center justify-center flex-1 ${sizeClasses.button}
            font-medium transition-colors duration-200 rounded-md
            ${viewMode === 'compact' 
              ? 'text-gray-900 dark:text-white' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
          aria-label="Switch to compact view"
          title="Compact View - Condensed list with minimal spacing"
        >
          {isLoading && viewMode === 'card' ? (
            <Loader2 className={`${sizeClasses.icon} animate-spin`} />
          ) : (
            <List className={sizeClasses.icon} />
          )}
          {showLabels && (
            <span className={`ml-1 ${sizeClasses.label}`}>List</span>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="ml-2 text-red-500 dark:text-red-400 text-xs"
          title={error}
        >
          ⚠️
        </motion.div>
      )}

      {/* Labels (when showLabels is true) */}
      {showLabels && (
        <div className="ml-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="font-medium">
            {viewMode === 'card' ? 'Card View' : 'Compact View'}
          </div>
          <div className="text-xs opacity-75">
            {viewMode === 'card' 
              ? 'Full cards with media' 
              : 'Condensed list view'
            }
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple icon-only toggle button
 */
export function ViewModeToggleIcon({ 
  className = '', 
  onViewModeChange 
}: { 
  className?: string; 
  onViewModeChange?: (viewMode: ViewMode) => void; 
}) {
  const { viewMode, isLoading, toggleViewMode } = useViewMode();

  const handleToggle = async () => {
    if (isLoading) return;
    
    const newViewMode = viewMode === 'card' ? 'compact' : 'card';
    await toggleViewMode();
    
    if (onViewModeChange) {
      onViewModeChange(newViewMode);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      aria-label={`Switch to ${viewMode === 'card' ? 'compact' : 'card'} view`}
      title={`Switch to ${viewMode === 'card' ? 'compact' : 'card'} view`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
      ) : viewMode === 'card' ? (
        <List className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      ) : (
        <LayoutGrid className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      )}
    </motion.button>
  );
}

/**
 * Dropdown-style view mode selector
 */
export function ViewModeDropdown({ 
  className = '', 
  onViewModeChange 
}: { 
  className?: string; 
  onViewModeChange?: (viewMode: ViewMode) => void; 
}) {
  const { viewMode, setViewMode, isLoading } = useViewMode();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = async (mode: ViewMode) => {
    if (isLoading || mode === viewMode) return;
    
    await setViewMode(mode);
    setIsOpen(false);
    
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  const viewModeOptions = [
    {
      value: 'card' as ViewMode,
      label: 'Card View',
      description: 'Full post cards with thumbnails',
      icon: LayoutGrid
    },
    {
      value: 'compact' as ViewMode,
      label: 'Compact View',
      description: 'Condensed list view',
      icon: List
    }
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : viewMode === 'card' ? (
          <LayoutGrid className="w-4 h-4" />
        ) : (
          <List className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {viewMode === 'card' ? 'Card' : 'Compact'}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          ▼
        </motion.div>
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
        >
          {viewModeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = viewMode === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`
                  w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 
                  first:rounded-t-lg last:rounded-b-lg transition-colors duration-200
                  ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
                `}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <div>
                    <div className="text-sm font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="ml-auto text-blue-600 dark:text-blue-400">✓</div>
                  )}
                </div>
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}