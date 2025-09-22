import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterOption } from '../../../types/communityEnhancements';
import { useSimpleSwipe } from './utils/touchHandlers';

interface MobileMultiSelectFiltersProps {
  availableFilters: FilterOption[];
  selectedFilters: string[];
  onFiltersChange: (filters: string[]) => void;
  allowCombinations?: boolean;
}

/**
 * MobileMultiSelectFilters Component
 * 
 * Touch-friendly filter interface with swipe gestures for filter management,
 * preset combinations, and visual feedback for active filters.
 */
export const MobileMultiSelectFilters: React.FC<MobileMultiSelectFiltersProps> = ({
  availableFilters,
  selectedFilters,
  onFiltersChange,
  allowCombinations = true
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [customPresets, setCustomPresets] = useState<FilterPreset[]>([
    { id: 'hot-new', name: 'Hot & New', filters: ['hot', 'new'] },
    { id: 'trending', name: 'Trending', filters: ['hot', 'rising'] },
    { id: 'governance', name: 'Governance', filters: ['proposal', 'governance'] }
  ]);

  // Handle filter toggle with haptic feedback
  const handleFilterToggle = useCallback((filterId: string) => {
    // Haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }

    const isSelected = selectedFilters.includes(filterId);
    const filter = availableFilters.find(f => f.id === filterId);

    if (isSelected) {
      // Remove filter
      onFiltersChange(selectedFilters.filter(id => id !== filterId));
    } else {
      // Add filter
      if (allowCombinations || selectedFilters.length === 0) {
        // Check if this filter can be combined with existing ones
        const canCombine = !filter?.combinableWith || 
          selectedFilters.some(selectedId => 
            filter.combinableWith?.includes(selectedId)
          ) || selectedFilters.length === 0;

        if (canCombine) {
          onFiltersChange([...selectedFilters, filterId]);
        } else {
          // Replace existing filters if combination not allowed
          onFiltersChange([filterId]);
        }
      } else {
        // Replace existing filter
        onFiltersChange([filterId]);
      }
    }
  }, [selectedFilters, onFiltersChange, availableFilters, allowCombinations]);

  // Apply preset filters
  const applyPreset = useCallback((preset: FilterPreset) => {
    onFiltersChange(preset.filters);
    setShowPresets(false);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [onFiltersChange]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    onFiltersChange([]);
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, [onFiltersChange]);

  // Save current selection as preset
  const saveAsPreset = useCallback(() => {
    if (selectedFilters.length === 0) return;

    const presetName = prompt('Enter preset name:');
    if (presetName) {
      const newPreset: FilterPreset = {
        id: `custom-${Date.now()}`,
        name: presetName,
        filters: [...selectedFilters]
      };
      setCustomPresets(prev => [...prev, newPreset]);
    }
  }, [selectedFilters]);

  // Swipe handlers for filter management
  const swipeHandlers = useSimpleSwipe({
    onSwipedRight: () => {
      if (selectedFilters.length > 0) {
        clearAllFilters();
      }
    },
    onSwipedLeft: () => {
      setShowPresets(!showPresets);
    }
  });

  return (
    <div className="px-4 space-y-4" {...swipeHandlers}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className="font-medium text-gray-900 dark:text-white">Filters</h4>
          {selectedFilters.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {selectedFilters.length}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {selectedFilters.length > 0 && (
            <>
              <button
                onClick={saveAsPreset}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Save as preset"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
              <button
                onClick={clearAllFilters}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Clear all filters"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
          
          <button
            onClick={() => setShowPresets(!showPresets)}
            className={`p-2 rounded-lg transition-colors ${
              showPresets 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'
            }`}
            aria-label="Toggle presets"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l2 2-2 2m-2-2h-6m8 11l2 2-2 2m-2-2h-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preset Filters */}
      <AnimatePresence>
        {showPresets && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Presets</h5>
              <div className="flex flex-wrap gap-2">
                {customPresets.map((preset) => (
                  <motion.button
                    key={preset.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => applyPreset(preset)}
                    className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {preset.name}
                    <span className="ml-2 text-xs text-gray-500">
                      ({preset.filters.length})
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Grid */}
      <div className="grid grid-cols-2 gap-3">
        {availableFilters.map((filter) => {
          const isSelected = selectedFilters.includes(filter.id);
          const canSelect = allowCombinations || selectedFilters.length === 0 || isSelected;
          
          return (
            <FilterChip
              key={filter.id}
              filter={filter}
              isSelected={isSelected}
              canSelect={canSelect}
              onToggle={() => handleFilterToggle(filter.id)}
            />
          );
        })}
      </div>

      {/* Active Filters Summary */}
      {selectedFilters.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active:</span>
            <div className="flex flex-wrap gap-1">
              {selectedFilters.map((filterId) => {
                const filter = availableFilters.find(f => f.id === filterId);
                return (
                  <span
                    key={filterId}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {filter?.label || filterId}
                  </span>
                );
              })}
            </div>
          </div>
          
          {/* Swipe hint */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Swipe right to clear all, left to toggle presets
          </p>
        </div>
      )}
    </div>
  );
};

interface FilterChipProps {
  filter: FilterOption;
  isSelected: boolean;
  canSelect: boolean;
  onToggle: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({
  filter,
  isSelected,
  canSelect,
  onToggle
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      disabled={!canSelect && !isSelected}
      className={`flex items-center justify-center space-x-2 p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        isSelected
          ? `bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg`
          : canSelect
          ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
          : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
      }`}
      style={{
        backgroundColor: isSelected && filter.color ? filter.color : undefined
      }}
    >
      {filter.icon && (
        <span className="text-lg">{filter.icon}</span>
      )}
      <span className="truncate">{filter.label}</span>
      
      {isSelected && (
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      )}
    </motion.button>
  );
};

interface FilterPreset {
  id: string;
  name: string;
  filters: string[];
}

export default MobileMultiSelectFilters;