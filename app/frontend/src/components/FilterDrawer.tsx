'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  XMarkIcon, 
  AdjustmentsHorizontalIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

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
  value?: any;
  expanded?: boolean;
}

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterSection[];
  onFiltersChange: (filters: FilterSection[]) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  className?: string;
}

const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  className = ''
}) => {
  const [localFilters, setLocalFilters] = useState<FilterSection[]>(filters);
  const [dragY, setDragY] = useState(0);
  const constraintsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const shouldClose = info.velocity.y > 500 || info.offset.y > 200;
    
    if (shouldClose) {
      onClose();
    }
    
    setDragY(0);
  };

  const toggleSection = (sectionId: string) => {
    const updatedFilters = localFilters.map(filter =>
      filter.id === sectionId
        ? { ...filter, expanded: !filter.expanded }
        : filter
    );
    setLocalFilters(updatedFilters);
  };

  const updateFilterValue = (sectionId: string, value: any) => {
    const updatedFilters = localFilters.map(filter =>
      filter.id === sectionId
        ? { ...filter, value }
        : filter
    );
    setLocalFilters(updatedFilters);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApplyFilters();
    onClose();
  };

  const handleClear = () => {
    const clearedFilters = localFilters.map(filter => ({
      ...filter,
      value: filter.type === 'checkbox' ? [] : 
             filter.type === 'range' ? [filter.min || 0, filter.max || 100] : 
             null
    }));
    setLocalFilters(clearedFilters);
    onClearFilters();
  };

  const renderFilterContent = (filter: FilterSection) => {
    switch (filter.type) {
      case 'checkbox':
        return (
          <div className="space-y-3">
            {filter.options?.map((option) => (
              <label
                key={option.id}
                htmlFor={`${filter.id}-${option.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <input
                    id={`${filter.id}-${option.id}`}
                    type="checkbox"
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={filter.value?.includes(option.value) || false}
                    onChange={(e) => {
                      const currentValues = filter.value || [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v: any) => v !== option.value);
                      updateFilterValue(filter.id, newValues);
                    }}
                  />
                  <span className="text-gray-900 font-medium">{option.label}</span>
                </div>
                {option.count && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {option.count}
                  </span>
                )}
              </label>
            ))}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            {filter.options?.map((option) => (
              <label
                key={option.id}
                htmlFor={`${filter.id}-${option.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <input
                    id={`${filter.id}-${option.id}`}
                    type="radio"
                    name={filter.id}
                    className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    checked={filter.value === option.value}
                    onChange={() => updateFilterValue(filter.id, option.value)}
                  />
                  <span className="text-gray-900 font-medium">{option.label}</span>
                </div>
                {option.count && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {option.count}
                  </span>
                )}
              </label>
            ))}
          </div>
        );

      case 'range':
        const [min, max] = filter.value || [filter.min || 0, filter.max || 100];
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Min: ${min}</span>
              <span className="text-sm text-gray-600">Max: ${max}</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={filter.min || 0}
                max={filter.max || 100}
                value={min}
                onChange={(e) => updateFilterValue(filter.id, [parseInt(e.target.value), max])}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <input
                type="range"
                min={filter.min || 0}
                max={filter.max || 100}
                value={max}
                onChange={(e) => updateFilterValue(filter.id, [min, parseInt(e.target.value)])}
                className="absolute top-0 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            ref={constraintsRef}
            className={`
              fixed bottom-0 left-0 right-0 z-50 md:hidden
              bg-white rounded-t-3xl shadow-2xl
              max-h-[85vh] overflow-hidden
              ${className}
            `}
            initial={{ y: '100%' }}
            animate={{ y: dragY }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring' as any, stiffness: 500, damping: 40 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            onDrag={(event, info) => setDragY(info.offset.y)}
          >
            {/* Handle */}
            <div className="flex justify-center pt-4 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <AdjustmentsHorizontalIcon className="w-6 h-6 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">Filters</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close filters"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {localFilters.map((filter) => (
                <div key={filter.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                  <button
                    onClick={() => toggleSection(filter.id)}
                    className="flex items-center justify-between w-full py-3 text-left"
                  >
                    <h3 className="text-lg font-medium text-gray-900">{filter.title}</h3>
                    <motion.div
                      animate={{ rotate: filter.expanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {filter.expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3">
                          {renderFilterContent(filter)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  onClick={handleClear}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FilterDrawer;