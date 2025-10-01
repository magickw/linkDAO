/**
 * ViewDensityToggle - Switch between comfortable and compact product display modes
 * Persists preference to localStorage for user convenience
 */

import React, { useEffect, useState } from 'react';
import { Grid, List } from 'lucide-react';
import { DensityMode } from './EnhancedProductCard';

interface ViewDensityToggleProps {
  density: DensityMode;
  onDensityChange: (density: DensityMode) => void;
  className?: string;
}

export const ViewDensityToggle: React.FC<ViewDensityToggleProps> = ({
  density,
  onDensityChange,
  className = '',
}) => {
  const handleDensityChange = (newDensity: DensityMode) => {
    onDensityChange(newDensity);
    localStorage.setItem('marketplace-density', newDensity);
  };

  return (
    <div className={`flex items-center gap-1 bg-white/10 rounded-lg p-1 ${className}`}>
      <button
        onClick={() => handleDensityChange('comfortable')}
        className={`p-2 rounded transition-all ${
          density === 'comfortable'
            ? 'bg-white/20 text-white'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title="Comfortable view (3-4 columns)"
      >
        <Grid size={18} />
      </button>
      <button
        onClick={() => handleDensityChange('compact')}
        className={`p-2 rounded transition-all ${
          density === 'compact'
            ? 'bg-white/20 text-white'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title="Compact view (5-6 columns)"
      >
        <List size={18} />
      </button>
    </div>
  );
};

/**
 * Custom hook to manage density preference with localStorage persistence
 */
export const useDensityPreference = () => {
  const [density, setDensity] = useState<DensityMode>('comfortable');

  useEffect(() => {
    const saved = localStorage.getItem('marketplace-density') as DensityMode;
    if (saved === 'comfortable' || saved === 'compact') {
      setDensity(saved);
    }
  }, []);

  return { density, setDensity };
};
