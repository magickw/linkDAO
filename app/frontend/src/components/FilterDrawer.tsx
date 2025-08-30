import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '@/design-system/hooks/useResponsive';
import { designTokens } from '@/design-system/tokens';
import BottomSheet from './BottomSheet';
import GestureHandler from './GestureHandler';

interface FilterOption {
  id: string;
  label: string;
  value: any;
  count?: number;
}

interface FilterSection {
  id: string;
  title: string;
  type: 'checkbox' | 'radio' | 'range' | 'select';
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
  value?: any;
  multiSelect?: boolean;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterSection[];
  onFiltersChange: (filters: Record<string, any>) => void;
  appliedFilters: Record<string, any>;
  className?: string;
  showResultCount?: boolean;
  resultCount?: number;
}

export default function FilterDrawer({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  appliedFilters,
  className = '',
  showResultCount = true,
  resultCount = 0
}: FilterDrawerProps) {
  const { isMobile } = useResponsive();
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(appliedFilters);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const handleFilterChange = useCallback((sectionId: string, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [sectionId]: value
    }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    onFiltersChange(localFilters);
    onClose();
  }, [localFilters, onFiltersChange, onClose]);

  const handleClearFilters = useCallback(() => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  }, [onFiltersChange]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const getActiveFilterCount = useCallback(() => {
    return Object.values(localFilters).filter(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(v => v !== undefined && v !== null && v !== '');
      }
      return value !== undefined && value !== null && value !== '';
    }).length;
  }, [localFilters]);

  const renderCheckboxFilter = (section: FilterSection) => {
    const selectedValues = localFilters[section.id] || [];
    
    return (
      <div className="space-y-3">
        {section.options?.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          
          return (
            <GestureHandler
              key={option.id}
              onTap={() => {
                const newValues = isSelected
                  ? selectedValues.filter((v: any) => v !== option.value)
                  : [...selectedValues, option.value];
                handleFilterChange(section.id, newValues);
              }}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
              </div>
              {option.count !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {option.count}
                </span>
              )}
            </GestureHandler>
          );
        })}
      </div>
    );
  };

  const renderRadioFilter = (section: FilterSection) => {
    const selectedValue = localFilters[section.id];
    
    return (
      <div className="space-y-3">
        {section.options?.map((option) => {
          const isSelected = selectedValue === option.value;
          
          return (
            <GestureHandler
              key={option.id}
              onTap={() => handleFilterChange(section.id, option.value)}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected 
                    ? 'bg-blue-500 border-blue-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {isSelected && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
              </div>
              {option.count !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {option.count}
                </span>
              )}
            </GestureHandler>
          );
        })}
      </div>
    );
  };

  const renderRangeFilter = (section: FilterSection) => {
    const value = localFilters[section.id] || { min: section.min, max: section.max };
    
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Min
            </label>
            <input
              type="number"
              min={section.min}
              max={section.max}
              step={section.step}
              value={value.min || ''}
              onChange={(e) => handleFilterChange(section.id, { ...value, min: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Min"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max
            </label>
            <input
              type="number"
              min={section.min}
              max={section.max}
              step={section.step}
              value={value.max || ''}
              onChange={(e) => handleFilterChange(section.id, { ...value, max: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Max"
            />
          </div>
        </div>
        
        {/* Range slider for touch-friendly interaction */}
        <div className="px-2">
          <input
            type="range"
            min={section.min}
            max={section.max}
            step={section.step}
            value={value.min || section.min}
            onChange={(e) => handleFilterChange(section.id, { ...value, min: Number(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider-thumb"
          />
          <input
            type="range"
            min={section.min}
            max={section.max}
            step={section.step}
            value={value.max || section.max}
            onChange={(e) => handleFilterChange(section.id, { ...value, max: Number(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider-thumb mt-2"
          />
        </div>
      </div>
    );
  };

  const renderFilterSection = (section: FilterSection) => {
    const isExpanded = expandedSections.has(section.id);
    
    return (
      <div key={section.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
        <GestureHandler
          onTap={() => toggleSection(section.id)}
          className="flex items-center justify-between p-4 touch-manipulation"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {section.title}
          </h3>
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </GestureHandler>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                {section.type === 'checkbox' && renderCheckboxFilter(section)}
                {section.type === 'radio' && renderRadioFilter(section)}
                {section.type === 'range' && renderRangeFilter(section)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Filters
          </h2>
          {getActiveFilterCount() > 0 && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              {getActiveFilterCount()}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Filter sections */}
      <div className="flex-1 overflow-y-auto">
        {filters.map(renderFilterSection)}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {showResultCount && (
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">
            {resultCount} results found
          </div>
        )}
        
        <div className="flex space-x-3">
          <button
            onClick={handleClearFilters}
            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Clear All
          </button>
          <button
            onClick={handleApplyFilters}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        height="full"
        className={className}
        showHandle={false}
        closeOnBackdrop={true}
        closeOnSwipeDown={true}
      >
        {content}
      </BottomSheet>
    );
  }

  // Desktop version - render as sidebar or modal
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className={`w-full max-w-md h-full max-h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl ${className}`}
          >
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}