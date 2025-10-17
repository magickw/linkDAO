import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FilterState {
  chartId: string;
  filters: Record<string, any>;
  timestamp: number;
}

interface CrossFilterContextType {
  filters: FilterState[];
  addFilter: (chartId: string, filters: Record<string, any>) => void;
  removeFilter: (chartId: string) => void;
  clearAllFilters: () => void;
  getFiltersForChart: (chartId: string) => Record<string, any>[];
  isFiltered: (chartId: string) => boolean;
}

const CrossFilterContext = createContext<CrossFilterContextType | undefined>(undefined);

interface CrossFilterManagerProps {
  children: ReactNode;
  onFiltersChange?: (filters: FilterState[]) => void;
}

export const CrossFilterManager: React.FC<CrossFilterManagerProps> = ({
  children,
  onFiltersChange,
}) => {
  const [filters, setFilters] = useState<FilterState[]>([]);

  const addFilter = useCallback((chartId: string, newFilters: Record<string, any>) => {
    setFilters(prevFilters => {
      const existingIndex = prevFilters.findIndex(f => f.chartId === chartId);
      const newFilterState: FilterState = {
        chartId,
        filters: newFilters,
        timestamp: Date.now(),
      };

      let updatedFilters: FilterState[];
      if (existingIndex >= 0) {
        updatedFilters = [...prevFilters];
        updatedFilters[existingIndex] = newFilterState;
      } else {
        updatedFilters = [...prevFilters, newFilterState];
      }

      if (onFiltersChange) {
        onFiltersChange(updatedFilters);
      }

      return updatedFilters;
    });
  }, [onFiltersChange]);

  const removeFilter = useCallback((chartId: string) => {
    setFilters(prevFilters => {
      const updatedFilters = prevFilters.filter(f => f.chartId !== chartId);
      
      if (onFiltersChange) {
        onFiltersChange(updatedFilters);
      }

      return updatedFilters;
    });
  }, [onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    setFilters([]);
    
    if (onFiltersChange) {
      onFiltersChange([]);
    }
  }, [onFiltersChange]);

  const getFiltersForChart = useCallback((chartId: string) => {
    return filters
      .filter(f => f.chartId !== chartId) // Exclude own filters
      .map(f => f.filters);
  }, [filters]);

  const isFiltered = useCallback((chartId: string) => {
    return filters.some(f => f.chartId === chartId);
  }, [filters]);

  const contextValue: CrossFilterContextType = {
    filters,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFiltersForChart,
    isFiltered,
  };

  return (
    <CrossFilterContext.Provider value={contextValue}>
      {children}
    </CrossFilterContext.Provider>
  );
};

export const useCrossFilter = () => {
  const context = useContext(CrossFilterContext);
  if (context === undefined) {
    throw new Error('useCrossFilter must be used within a CrossFilterManager');
  }
  return context;
};

// Hook for individual charts to use cross-filtering
export const useChartCrossFilter = (chartId: string) => {
  const { addFilter, removeFilter, getFiltersForChart, isFiltered } = useCrossFilter();

  const applyFilter = useCallback((filters: Record<string, any>) => {
    addFilter(chartId, filters);
  }, [chartId, addFilter]);

  const clearFilter = useCallback(() => {
    removeFilter(chartId);
  }, [chartId, removeFilter]);

  const externalFilters = getFiltersForChart(chartId);
  const hasExternalFilters = externalFilters.length > 0;
  const isCurrentlyFiltered = isFiltered(chartId);

  return {
    applyFilter,
    clearFilter,
    externalFilters,
    hasExternalFilters,
    isCurrentlyFiltered,
  };
};