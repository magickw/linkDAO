import React, { useState, useEffect } from 'react';
import { Plus, X, Grid } from 'lucide-react';
import { SizeSystemType } from '@/config/marketplace/specifications';
import { Button } from '@/design-system/components/Button';
import SizeChartBuilder, { SizeChartData } from './SizeChartBuilder';

export interface SizeConfig {
  system: SizeSystemType;
  selectedSizes: string[];
  matrix?: {
    rows: string[];
    cols: string[];
    selected: string[]; // "row:col"
  };
  chart?: SizeChartData;
  customVariants?: string[];
}

interface SizeConfigurationSystemProps {
  system: SizeSystemType;
  value: SizeConfig;
  onChange: (value: SizeConfig) => void;
  category: string;
}

const APPAREL_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SHOE_SIZES_US = Array.from({ length: 15 }, (_, i) => (i + 6).toString());

export const SizeConfigurationSystem: React.FC<SizeConfigurationSystemProps> = ({
  system,
  value,
  onChange,
  category
}) => {
  // Initialize default system if not set
  useEffect(() => {
    if (value.system !== system) {
      onChange({ ...value, system });
    }
  }, [system, value.system, onChange, value]);

  const handleStandardToggle = (size: string) => {
    const current = value.selectedSizes || [];
    const newSizes = current.includes(size)
      ? current.filter(s => s !== size)
      : [...current, size];
    onChange({ ...value, selectedSizes: newSizes });
  };

  const handleVariantAdd = (variant: string) => {
    if (variant && !value.customVariants?.includes(variant)) {
      onChange({
        ...value,
        customVariants: [...(value.customVariants || []), variant]
      });
    }
  };

  const handleVariantRemove = (variant: string) => {
    onChange({
      ...value,
      customVariants: (value.customVariants || []).filter(v => v !== variant)
    });
  };

  const renderApparelStandard = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white/90 mb-3">Select Available Sizes</label>
        <div className="flex flex-wrap gap-2">
          {APPAREL_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => handleStandardToggle(size)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                value.selectedSizes?.includes(size)
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 pt-6">
        <label className="block text-sm font-medium text-white/90 mb-3">Size Chart</label>
        <SizeChartBuilder
          value={value.chart || { template: 'us_clothing', columns: [], rows: [], unit: 'in' }}
          onChange={(chart) => onChange({ ...value, chart })}
        />
      </div>
    </div>
  );

  const renderMatrix = () => {
    // Example: Jeans (Waist x Length)
    const waistSizes = ['28', '30', '32', '34', '36', '38', '40'];
    const lengths = ['30', '32', '34', '36'];

    const toggleMatrixCell = (row: string, col: string) => {
      const key = `${row}x${col}`;
      const current = value.matrix?.selected || [];
      const newSelected = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];
      
      onChange({
        ...value,
        matrix: {
          rows: waistSizes,
          cols: lengths,
          selected: newSelected
        }
      });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-white/90">Size Availability Matrix</label>
          <span className="text-xs text-white/50">Waist x Length</span>
        </div>
        
        <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-lg p-4">
          <table className="w-full text-sm text-center">
            <thead>
              <tr>
                <th className="p-2 text-left text-white/40 font-normal">Waist \ Length</th>
                {lengths.map(len => (
                  <th key={len} className="p-2 text-white/80">{len}"</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waistSizes.map(waist => (
                <tr key={waist}>
                  <td className="p-2 text-left text-white/80 font-medium">{waist}"</td>
                  {lengths.map(len => {
                    const key = `${waist}x${len}`;
                    const isSelected = value.matrix?.selected?.includes(key);
                    return (
                      <td key={len} className="p-1">
                        <button
                          type="button"
                          onClick={() => toggleMatrixCell(waist, len)}
                          className={`w-full h-8 rounded transition-colors ${
                            isSelected 
                              ? 'bg-indigo-600 text-white' 
                              : 'bg-white/5 hover:bg-white/10 text-transparent hover:text-white/20'
                          }`}
                        >
                          {isSelected ? '✓' : '•'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-white/60">Click cells to toggle availability for specific size combinations.</p>
      </div>
    );
  };

  const renderSimpleVariants = () => {
    const [input, setInput] = useState('');

    // Quick-add options for electronics (storage variants)
    const storageOptions = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];
    const colorOptions = ['Black', 'White', 'Silver', 'Blue', 'Red', 'Green', 'Pink', 'Gold'];

    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-white/90">Product Variants</label>
        
        {/* Quick-add options for electronics */}
        {system === 'technical' && (
          <div className="space-y-3">
            <div>
              <span className="text-xs text-white/60 mb-2 block">Quick-add Storage Options:</span>
              <div className="flex flex-wrap gap-2">
                {storageOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleVariantAdd(option)}
                    disabled={value.customVariants?.includes(option)}
                    className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-white/60 mb-2 block">Quick-add Color Options:</span>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleVariantAdd(option)}
                    disabled={value.customVariants?.includes(option)}
                    className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Custom variant input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Red, Blue, 128GB, 512GB SSD"
            className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleVariantAdd(input);
                setInput('');
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleVariantAdd(input);
              setInput('');
            }}
            disabled={!input}
          >
            Add
          </Button>
        </div>

        {/* Display added variants */}
        <div className="flex flex-wrap gap-2">
          {(value.customVariants || []).map(variant => (
            <span key={variant} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90">
              {variant}
              <button
                type="button"
                onClick={() => handleVariantRemove(variant)}
                className="hover:text-red-400"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderRangeBased = () => {
    const [minWeight, setMinWeight] = useState('');
    const [maxWeight, setMaxWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');

    const handleAddRange = () => {
      if (minWeight && maxWeight) {
        const range = `${minWeight}-${maxWeight} ${weightUnit}`;
        handleVariantAdd(range);
        setMinWeight('');
        setMaxWeight('');
      }
    };

    // Pre-defined weight ranges for pets
    const weightRanges = [
      { label: 'Toy (0-10 lbs)', value: '0-10 lbs' },
      { label: 'Small (10-25 lbs)', value: '10-25 lbs' },
      { label: 'Medium (25-50 lbs)', value: '25-50 lbs' },
      { label: 'Large (50-75 lbs)', value: '50-75 lbs' },
      { label: 'Giant (75+ lbs)', value: '75+ lbs' }
    ];

    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-white/90">Size Ranges</label>
        
        {/* Pre-defined weight ranges */}
        <div>
          <span className="text-xs text-white/60 mb-2 block">Quick-add Weight Ranges:</span>
          <div className="flex flex-wrap gap-2">
            {weightRanges.map(range => (
              <button
                key={range.value}
                type="button"
                onClick={() => handleVariantAdd(range.value)}
                disabled={value.customVariants?.includes(range.value)}
                className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom range input */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <span className="text-xs text-white/60 mb-3 block">Custom Weight Range:</span>
          <div className="flex gap-2">
            <input
              type="number"
              value={minWeight}
              onChange={(e) => setMinWeight(e.target.value)}
              placeholder="Min weight"
              className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
            />
            <span className="flex items-center text-white/60">to</span>
            <input
              type="number"
              value={maxWeight}
              onChange={(e) => setMinWeight(e.target.value)}
              placeholder="Max weight"
              className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value as 'lbs' | 'kg')}
              className="w-20 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 [&>option]:bg-gray-800"
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddRange}
              disabled={!minWeight || !maxWeight}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Display added ranges */}
        <div className="flex flex-wrap gap-2">
          {(value.customVariants || []).map(variant => (
            <span key={variant} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90">
              {variant}
              <button
                type="button"
                onClick={() => handleVariantRemove(variant)}
                className="hover:text-red-400"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderVolumeCapacity = () => {
    const [volume, setVolume] = useState('');
    const [volumeUnit, setVolumeUnit] = useState<'L' | 'gal' | 'ml' | 'oz'>('L');

    const handleAddVolume = () => {
      if (volume) {
        const variant = `${volume} ${volumeUnit}`;
        handleVariantAdd(variant);
        setVolume('');
      }
    };

    // Pre-defined volume options
    const volumeOptions = [
      { label: '250 ml', value: '250 ml' },
      { label: '500 ml', value: '500 ml' },
      { label: '1 L', value: '1 L' },
      { label: '2 L', value: '2 L' },
      { label: '5 L', value: '5 L' },
      { label: '10 L', value: '10 L' },
      { label: '20 L', value: '20 L' },
      { label: '1 gal', value: '1 gal' },
      { label: '5 gal', value: '5 gal' }
    ];

    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-white/90">Volume / Capacity</label>
        
        {/* Pre-defined volume options */}
        <div>
          <span className="text-xs text-white/60 mb-2 block">Quick-add Volume Options:</span>
          <div className="flex flex-wrap gap-2">
            {volumeOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleVariantAdd(option.value)}
                disabled={value.customVariants?.includes(option.value)}
                className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom volume input */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <span className="text-xs text-white/60 mb-3 block">Custom Volume:</span>
          <div className="flex gap-2">
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              placeholder="Volume"
              className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={volumeUnit}
              onChange={(e) => setVolumeUnit(e.target.value as 'L' | 'gal' | 'ml' | 'oz')}
              className="w-24 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 [&>option]:bg-gray-800"
            >
              <option value="ml">ml</option>
              <option value="L">L</option>
              <option value="oz">oz</option>
              <option value="gal">gal</option>
            </select>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddVolume}
              disabled={!volume}
            >
              Add
            </Button>
          </div>
        </div>

        {/* Display added volumes */}
        <div className="flex flex-wrap gap-2">
          {(value.customVariants || []).map(variant => (
            <span key={variant} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90">
              {variant}
              <button
                type="button"
                onClick={() => handleVariantRemove(variant)}
                className="hover:text-red-400"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      </div>
    );
  };

  switch (system) {
    case 'apparel_standard':
      return renderApparelStandard();
    case 'matrix':
      return renderMatrix();
    case 'simple_variants':
    case 'technical':
      return renderSimpleVariants();
    case 'range_based':
      return renderRangeBased();
    case 'volume_capacity':
      return renderVolumeCapacity();
    case 'dimensions':
      return <div className="text-white/60 text-sm italic">Size is defined by dimensions in Specifications.</div>;
    default:
      return <div className="text-white/60 text-sm italic">No sizing configuration needed for this category.</div>;
  }
};

export default SizeConfigurationSystem;