// Variant Selector Component - Visual color and size selection for buyers

import React, { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { ProductVariant, ColorSwatch, SizeOption } from '@/types/productVariant';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import SizeGuideModal from './SizeGuideModal';
import { productVariantService } from '@/services/productVariantService';

interface VariantSelectorProps {
  productId: string;
  basePrice: number;
  onVariantSelect: (variant: ProductVariant | null, color?: string, size?: string) => void;
  onImageChange?: (imageUrl: string) => void;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  productId,
  basePrice,
  onVariantSelect,
  onImageChange
}) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>();
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // Load variants
  useEffect(() => {
    loadVariants();
  }, [productId]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const data = await productVariantService.getProductVariants(productId);
      setVariants(data);
      
      // Auto-select default variant
      const defaultVariant = data.find(v => v.isDefault && v.isAvailable);
      if (defaultVariant) {
        setSelectedColor(defaultVariant.color);
        setSelectedSize(defaultVariant.size);
        setSelectedVariant(defaultVariant);
        onVariantSelect(defaultVariant, defaultVariant.color, defaultVariant.size);
        if (defaultVariant.primaryImageUrl && onImageChange) {
          onImageChange(defaultVariant.primaryImageUrl);
        }
      }
    } catch (error) {
      console.error('Failed to load variants:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique colors with their swatches
  const colorSwatches: ColorSwatch[] = React.useMemo(() => {
    const colorMap = new Map<string, ColorSwatch>();
    
    variants.forEach(variant => {
      if (variant.color && variant.isAvailable) {
        const existing = colorMap.get(variant.color);
        const inventory = variant.inventory - variant.reservedInventory;
        
        if (existing) {
          existing.inventory += inventory;
        } else {
          colorMap.set(variant.color, {
            color: variant.color,
            colorHex: variant.colorHex || '#000000',
            imageUrl: variant.primaryImageUrl || variant.imageUrls[0],
            available: inventory > 0,
            inventory
          });
        }
      }
    });
    
    return Array.from(colorMap.values());
  }, [variants]);

  // Get available sizes (filtered by selected color if applicable)
  const sizeOptions: SizeOption[] = React.useMemo(() => {
    const sizeMap = new Map<string, SizeOption>();
    
    const filteredVariants = selectedColor
      ? variants.filter(v => v.color === selectedColor && v.isAvailable)
      : variants.filter(v => v.isAvailable);
    
    filteredVariants.forEach(variant => {
      if (variant.size) {
        const existing = sizeMap.get(variant.size);
        const inventory = variant.inventory - variant.reservedInventory;
        
        if (existing) {
          existing.inventory += inventory;
        } else {
          sizeMap.set(variant.size, {
            size: variant.size,
            available: inventory > 0,
            inventory,
            dimensions: variant.dimensions
          });
        }
      }
    });
    
    return Array.from(sizeMap.values());
  }, [variants, selectedColor]);

  // Handle color selection
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    
    // Find matching variant
    const variant = variants.find(v => 
      v.color === color && 
      (!selectedSize || v.size === selectedSize) &&
      v.isAvailable
    );
    
    setSelectedVariant(variant || null);
    onVariantSelect(variant || null, color, selectedSize);
    
    // Update image if variant has specific image
    if (variant?.primaryImageUrl && onImageChange) {
      onImageChange(variant.primaryImageUrl);
    }
  };

  // Handle size selection
  const handleSizeSelect = (size: string) => {
    setSelectedSize(size);
    
    // Find matching variant
    const variant = variants.find(v => 
      v.size === size && 
      (!selectedColor || v.color === selectedColor) &&
      v.isAvailable
    );
    
    setSelectedVariant(variant || null);
    onVariantSelect(variant || null, selectedColor, size);
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/10 rounded w-24"></div>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-12 h-12 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variants.length === 0) {
    return null; // No variants configured
  }

  const finalPrice = selectedVariant 
    ? basePrice + selectedVariant.priceAdjustment 
    : basePrice;

  return (
    <div className="space-y-6">
      {/* Color Selection */}
      {colorSwatches.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white">
              Color: {selectedColor && <span className="text-indigo-400">{selectedColor}</span>}
            </label>
            {selectedColor && selectedVariant && (
              <span className="text-xs text-white/60">
                {selectedVariant.inventory - selectedVariant.reservedInventory} in stock
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            {colorSwatches.map(swatch => (
              <button
                key={swatch.color}
                onClick={() => handleColorSelect(swatch.color)}
                disabled={!swatch.available}
                className={`
                  relative group
                  ${selectedColor === swatch.color ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' : ''}
                  ${!swatch.available ? 'opacity-40 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}
                  transition-all duration-200
                `}
                title={`${swatch.color}${!swatch.available ? ' (Out of Stock)' : ''}`}
              >
                {/* Color swatch with image preview if available */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-white/30">
                  {swatch.imageUrl ? (
                    <img
                      src={swatch.imageUrl}
                      alt={swatch.color}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: swatch.colorHex }}
                    />
                  )}
                  
                  {/* Selected indicator */}
                  {selectedColor === swatch.color && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Check size={24} className="text-white" />
                    </div>
                  )}
                  
                  {/* Out of stock overlay */}
                  {!swatch.available && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-xs text-white font-medium">Out</span>
                    </div>
                  )}
                </div>
                
                {/* Color name label */}
                <div className="mt-1 text-xs text-center text-white/70">
                  {swatch.color}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size Selection */}
      {sizeOptions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white">
              Size: {selectedSize && <span className="text-indigo-400">{selectedSize}</span>}
            </label>
          </div>
          
          <div className="flex flex-wrap gap-2">
{sizeOptions.map(option => {
                    // Get international equivalents if available
                    const getInternationalSizes = (size: string) => {
                      // This would be enhanced to fetch from the size system
                      return null; // Placeholder for international sizes
                    };
                    
                    const intlSizes = getInternationalSizes(option.size);
                    
                    return (
                      <button
                        key={option.size}
                        onClick={() => handleSizeSelect(option.size)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          selectedSize === option.size
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        } ${!option.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!option.available}
                        title={intlSizes ? `US: ${intlSizes.US} | UK: ${intlSizes.UK} | EU: ${intlSizes.EU}` : undefined}
                      >
                        <div className="text-center">
                          <div className="font-medium">{option.size}</div>
                          {intlSizes && (
                            <div className="text-xs text-gray-500">
                              {intlSizes.EU}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
          </div>
        </div>
      )}

      {/* Price Display */}
      {selectedVariant && selectedVariant.priceAdjustment !== 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/60">Price for this variant:</span>
          <span className="text-white font-medium">${finalPrice.toFixed(2)}</span>
          {selectedVariant.priceAdjustment > 0 && (
            <span className="text-green-400 text-xs">(+${selectedVariant.priceAdjustment.toFixed(2)})</span>
          )}
          {selectedVariant.priceAdjustment < 0 && (
            <span className="text-red-400 text-xs">(${selectedVariant.priceAdjustment.toFixed(2)})</span>
          )}
        </div>
      )}

      {/* Low Stock Warning */}
      {selectedVariant && (selectedVariant.inventory - selectedVariant.reservedInventory) <= 5 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertCircle size={16} className="text-yellow-400" />
          <span className="text-sm text-yellow-400">
            Only {selectedVariant.inventory - selectedVariant.reservedInventory} left in stock!
          </span>
        </div>
      )}

      {/* Selection Required Message */}
      {(colorSwatches.length > 0 || sizeOptions.length > 0) && !selectedVariant && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <AlertCircle size={16} className="text-blue-400" />
          <span className="text-sm text-blue-400">
            Please select {colorSwatches.length > 0 && 'a color'}{colorSwatches.length > 0 && sizeOptions.length > 0 && ' and '}{sizeOptions.length > 0 && 'a size'}
          </span>
        </div>
      )}

      {/* Size Guide Button */}
      {sizeOptions.length > 0 && (
        <button
          onClick={() => setShowSizeGuide(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <InformationCircleIcon className="w-4 h-4" />
          Size Guide
        </button>
      )}

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={showSizeGuide}
        onClose={() => setShowSizeGuide(false)}
        initialCategory="clothing-tops"
      />
    </div>
  );
};

export default VariantSelector;
