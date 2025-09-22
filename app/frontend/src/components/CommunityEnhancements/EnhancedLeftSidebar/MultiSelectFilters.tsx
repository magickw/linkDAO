import React, { useState, useCallback, useMemo } from 'react';
import { X, Plus, Filter, Save, Trash2, Settings } from 'lucide-react';
import { FilterOption, MultiSelectFiltersProps, FilterConfiguration } from '../../../types/communityEnhancements';

/**
 * MultiSelectFilters Component
 * 
 * Provides advanced filtering with multiple simultaneous selections,
 * filter combinations, and preset saving/loading functionality.
 * 
 * Requirements: 1.3, 6.1, 6.2, 6.6
 */
export const MultiSelectFilters: React.FC<MultiSelectFiltersProps> = ({
  availableFilters,
  selectedFilters,
  onFiltersChange,
  allowCombinations = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<FilterConfiguration[]>([]);
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);

  // Load saved presets from localStorage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('community-filter-presets');
    if (saved) {
      try {
        setSavedPresets(JSON.parse(saved));
      } catch (error) {
        console.warn('Failed to load filter presets:', error);
      }
    }
  }, []);

  // Save presets to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('community-filter-presets', JSON.stringify(savedPresets));
  }, [savedPresets]);

  // Get available filter combinations
  const getCompatibleFilters = useCallback((filterId: string): string[] => {
    const filter = availableFilters.find(f => f.id === filterId);
    return filter?.combinableWith || [];
  }, [availableFilters]);

  // Check if a filter can be combined with currently selected filters
  const canCombineFilter = useCallback((filterId: string): boolean => {
    if (!allowCombinations || selectedFilters.length === 0) return true;
    
    const compatibleFilters = getCompatibleFilters(filterId);
    return selectedFilters.every(selectedId => 
      compatibleFilters.includes(selectedId) || 
      getCompatibleFilters(selectedId).includes(filterId)
    );
  }, [selectedFilters, allowCombinations, getCompatibleFilters]);

  // Handle filter toggle
  const handleFilterToggle = useCallback((filterId: string) => {
    if (selectedFilters.includes(filterId)) {
      // Remove filter
      onFiltersChange(selectedFilters.filter(id => id !== filterId));
    } else {
      // Add filter if compatible
      if (canCombineFilter(filterId)) {
        onFiltersChange([...selectedFilters, filterId]);
      } else {
        // Replace incompatible filters
        onFiltersChange([filterId]);
      }
    }
  }, [selectedFilters, onFiltersChange, canCombineFilter]);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    onFiltersChange([]);
  }, [onFiltersChange]);

  // Save current filter combination as preset
  const handleSavePreset = useCallback(() => {
    if (!presetName.trim() || selectedFilters.length === 0) return;

    const newPreset: FilterConfiguration = {
      id: Date.now().toString(),
      name: presetName.trim(),
      filters: selectedFilters.map(filterId => ({
        type: 'postType', // Simplified for this implementation
        value: filterId,
        operator: 'equals'
      })),
      sortOrder: 'hot',
      isDefault: false,
      isCustom: true
    };

    setSavedPresets(prev => [...prev, newPreset]);
    setPresetName('');
    setIsCreatingPreset(false);
  }, [presetName, selectedFilters]);

  // Load a saved preset
  const handleLoadPreset = useCallback((preset: FilterConfiguration) => {
    const filterIds = preset.filters.map(f => f.value as string);
    onFiltersChange(filterIds);
    setShowPresets(false);
  }, [onFiltersChange]);

  // Delete a saved preset
  const handleDeletePreset = useCallback((presetId: string) => {
    setSavedPresets(prev => prev.filter(p => p.id !== presetId));
  }, []);

  // Group filters by type for better organization
  const groupedFilters = useMemo(() => {
    const groups: Record<string, FilterOption[]> = {};
    
    availableFilters.forEach(filter => {
      const type = filter.id.includes('type') ? 'Post Types' : 
                   filter.id.includes('time') ? 'Time Range' : 
                   filter.id.includes('sort') ? 'Sorting' : 'Other';
      
      if (!groups[type]) groups[type] = [];
      groups[type].push(filter);
    });
    
    return groups;
  }, [availableFilters]);

  const selectedCount = selectedFilters.length;
  const hasIncompatibleFilters = selectedFilters.length > 1 && !allowCombinations;

  return (
    <div className="multi-select-filters bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filters
            </h3>
            {selectedCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 
                             text-blue-800 dark:text-blue-300 rounded-full">
                {selectedCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Manage presets"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {selectedCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedFilters.map(filterId => {
              const filter = availableFilters.find(f => f.id === filterId);
              if (!filter) return null;
              
              return (
                <div
                  key={filterId}
                  className="flex items-center px-3 py-1 bg-blue-50 dark:bg-blue-900/20 
                           text-blue-800 dark:text-blue-300 rounded-full text-sm"
                  style={{ backgroundColor: filter.color ? `${filter.color}20` : undefined }}
                >
                  {filter.icon && <span className="mr-1">{filter.icon}</span>}
                  <span>{filter.label}</span>
                  <button
                    onClick={() => handleFilterToggle(filterId)}
                    className="ml-2 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 
                       border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 
                       dark:hover:bg-gray-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Preset Management */}
      {showPresets && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Filter Presets</h4>
            
            {selectedCount > 0 && (
              <button
                onClick={() => setIsCreatingPreset(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 
                         dark:hover:text-blue-300 transition-colors"
              >
                Save Current
              </button>
            )}
          </div>

          {/* Create Preset */}
          {isCreatingPreset && (
            <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Preset name..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 
                           rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePreset();
                    if (e.key === 'Escape') setIsCreatingPreset(false);
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSavePreset}
                  disabled={!presetName.trim()}
                  className="p-1 text-green-600 hover:text-green-800 disabled:text-gray-400 transition-colors"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsCreatingPreset(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Saved Presets */}
          <div className="space-y-2">
            {savedPresets.map(preset => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 
                         rounded-md border border-gray-200 dark:border-gray-600"
              >
                <button
                  onClick={() => handleLoadPreset(preset)}
                  className="flex-1 text-left text-sm text-gray-900 dark:text-white hover:text-blue-600 
                           dark:hover:text-blue-400 transition-colors"
                >
                  {preset.name}
                  <span className="ml-2 text-xs text-gray-500">
                    ({preset.filters.length} filters)
                  </span>
                </button>
                
                <button
                  onClick={() => handleDeletePreset(preset.id)}
                  className="p-1 text-red-500 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {savedPresets.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                No saved presets
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filter Options */}
      {isExpanded && (
        <div className="p-4">
          {Object.entries(groupedFilters).map(([groupName, filters]) => (
            <div key={groupName} className="mb-4 last:mb-0">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {groupName}
              </h4>
              
              <div className="grid grid-cols-1 gap-2">
                {filters.map(filter => {
                  const isSelected = selectedFilters.includes(filter.id);
                  const isCompatible = canCombineFilter(filter.id);
                  const isDisabled = !isCompatible && selectedFilters.length > 0;
                  
                  return (
                    <button
                      key={filter.id}
                      onClick={() => handleFilterToggle(filter.id)}
                      disabled={isDisabled}
                      className={`
                        flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200
                        ${isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 text-blue-800 dark:text-blue-300' 
                          : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                        }
                        ${isDisabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'cursor-pointer'
                        }
                      `}
                      style={{ 
                        backgroundColor: isSelected && filter.color ? `${filter.color}20` : undefined,
                        borderColor: isSelected && filter.color ? filter.color : undefined
                      }}
                    >
                      <div className="flex items-center">
                        {filter.icon && (
                          <span className="mr-2 text-lg">{filter.icon}</span>
                        )}
                        <span className="text-sm font-medium">{filter.label}</span>
                      </div>
                      
                      {isSelected && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <X className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Combination Warning */}
          {hasIncompatibleFilters && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 
                          dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Some filters cannot be combined. Only the last selected filter is active.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiSelectFilters;