import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { SizeDefinition, SizeCategory, SIZE_CATEGORIES, getSizeCategory, getAllSizesForCategory } from '@/types/sizeSystem';

interface SizeSelectorProps {
  selectedSizes: string[];
  onSizesChange: (sizes: string[]) => void;
  className?: string;
  disabled?: boolean;
}

interface SelectedSize {
  id: string;
  name: string;
  category: string;
  measurements?: any;
  customDimensions?: string;
}

const SizeSelector: React.FC<SizeSelectorProps> = ({
  selectedSizes,
  onSizesChange,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('clothing-tops');
  const [customSizeName, setCustomSizeName] = useState('');
  const [customDimensions, setCustomDimensions] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedSizesData, setSelectedSizesData] = useState<SelectedSize[]>([]);

  // Map selected size IDs to full size data
  useEffect(() => {
    const sizesData: SelectedSize[] = [];
    for (const sizeId of selectedSizes) {
      // Check if it's a custom size (starts with 'custom:')
      if (sizeId.startsWith('custom:')) {
        const parts = sizeId.split(':');
        sizesData.push({
          id: sizeId,
          name: parts[1] || 'Custom',
          category: 'custom',
          customDimensions: parts[2] || ''
        });
      } else {
        // Find predefined size
        for (const category of SIZE_CATEGORIES) {
          const size = category.sizes.find(s => s.id === sizeId);
          if (size) {
            sizesData.push({
              id: size.id,
              name: size.name,
              category: category.id,
              measurements: size.measurements
            });
            break;
          }
        }
      }
    }
    setSelectedSizesData(sizesData);
  }, [selectedSizes]);

  const handleSizeSelect = (sizeId: string) => {
    if (selectedSizes.includes(sizeId)) {
      // Remove size
      onSizesChange(selectedSizes.filter(id => id !== sizeId));
    } else {
      // Add size
      onSizesChange([...selectedSizes, sizeId]);
    }
  };

  const handleAddCustomSize = () => {
    if (customSizeName.trim()) {
      const customSizeId = `custom:${customSizeName.trim()}:${customDimensions.trim()}`;
      if (!selectedSizes.includes(customSizeId)) {
        onSizesChange([...selectedSizes, customSizeId]);
      }
      setCustomSizeName('');
      setCustomDimensions('');
      setShowCustomInput(false);
    }
  };

  const removeSize = (sizeId: string) => {
    onSizesChange(selectedSizes.filter(id => id !== sizeId));
  };

  const currentCategory = getSizeCategory(selectedCategory);
  const availableSizes = currentCategory ? currentCategory.sizes : [];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Selected Sizes Display */}
      {selectedSizesData.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSizesData.map((size) => (
            <div
              key={size.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
            >
              <span>{size.name}</span>
              {size.customDimensions && (
                <span className="text-xs text-indigo-600">
                  ({size.customDimensions})
                </span>
              )}
              {!disabled && (
                <button
                  onClick={() => removeSize(size.id)}
                  className="ml-1 text-indigo-600 hover:text-indigo-800"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Size Selector Dropdown */}
      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-4 py-2 text-left bg-white/10 border border-white/20 text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between"
          >
            <span className="text-white">
              {selectedSizes.length === 0
                ? 'Select sizes...'
                : `${selectedSizes.length} size${selectedSizes.length > 1 ? 's' : ''} selected`}
            </span>
            <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl">
              {/* Category Tabs */}
              <div className="border-b border-gray-200">
                <div className="flex overflow-x-auto">
                  {SIZE_CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${selectedCategory === category.id
                          ? 'text-indigo-600 border-indigo-600'
                          : 'text-gray-500 border-transparent hover:text-gray-700'
                        }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Options */}
              <div className="max-h-60 overflow-y-auto p-3">
                <div className="space-y-2">
                  {availableSizes.map((size) => (
                    <label
                      key={size.id}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSizes.includes(size.id)}
                        onChange={() => handleSizeSelect(size.id)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {size.name}
                        </span>
                        {size.equivalent && (
                          <div className="text-xs text-gray-500">
                            UK: {size.equivalent.UK} | EU: {size.equivalent.EU} | US: {size.equivalent.US}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {/* Custom Size Option */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {!showCustomInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(true)}
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Add Custom Size
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Size name (e.g., XL-Tall)"
                        value={customSizeName}
                        onChange={(e) => setCustomSizeName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Dimensions (e.g., 40x30x10cm)"
                        value={customDimensions}
                        onChange={(e) => setCustomDimensions(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddCustomSize}
                          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomInput(false);
                            setCustomSizeName('');
                            setCustomDimensions('');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Size Guide Info */}
      {selectedCategory && (
        <div className="text-xs text-gray-500">
          {currentCategory?.description}
        </div>
      )}
    </div>
  );
};

export default SizeSelector;