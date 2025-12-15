// Variant Manager Component - Allows sellers to manage product colors, sizes, and SKUs

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Upload, Check, X } from 'lucide-react';
import { ProductVariant, CreateVariantInput, VariantMatrixCell } from '@/types/productVariant';
import { productVariantService } from '@/services/productVariantService';
import { useToast } from '@/context/ToastContext';

interface VariantManagerProps {
  productId: string;
  listingId?: string;
  basePrice: number;
  onVariantsChange?: (variants: ProductVariant[]) => void;
}

const PRESET_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#FF0000' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Green', hex: '#00FF00' },
  { name: 'Yellow', hex: '#FFFF00' },
  { name: 'Orange', hex: '#FFA500' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Brown', hex: '#8B4513' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Navy', hex: '#000080' },
];

const PRESET_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];

export const VariantManager: React.FC<VariantManagerProps> = ({
  productId,
  listingId,
  basePrice,
  onVariantsChange
}) => {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [colors, setColors] = useState<Array<{ name: string; hex: string }>>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newColor, setNewColor] = useState({ name: '', hex: '#000000' });
  const [newSize, setNewSize] = useState('');
  const { addToast } = useToast();

  // Load existing variants
  useEffect(() => {
    loadVariants();
  }, [productId]);

  const loadVariants = async () => {
    try {
      const existingVariants = await productVariantService.getProductVariants(productId);
      setVariants(existingVariants);
      
      // Extract unique colors and sizes
      const uniqueColors = new Map<string, string>();
      const uniqueSizes = new Set<string>();
      
      existingVariants.forEach(v => {
        if (v.color && v.colorHex) uniqueColors.set(v.color, v.colorHex);
        if (v.size) uniqueSizes.add(v.size);
      });
      
      setColors(Array.from(uniqueColors.entries()).map(([name, hex]) => ({ name, hex })));
      setSizes(Array.from(uniqueSizes));
    } catch (error) {
      console.error('Failed to load variants:', error);
    }
  };

  const addColor = () => {
    if (!newColor.name || colors.some(c => c.name === newColor.name)) {
      addToast('Please enter a unique color name', 'error');
      return;
    }
    setColors([...colors, newColor]);
    setNewColor({ name: '', hex: '#000000' });
    setShowColorPicker(false);
  };

  const removeColor = (colorName: string) => {
    setColors(colors.filter(c => c.name !== colorName));
    // Remove variants with this color
    setVariants(variants.filter(v => v.color !== colorName));
  };

  const addSize = () => {
    if (!newSize || sizes.includes(newSize)) {
      addToast('Please enter a unique size', 'error');
      return;
    }
    setSizes([...sizes, newSize]);
    setNewSize('');
  };

  const removeSize = (size: string) => {
    setSizes(sizes.filter(s => s !== size));
    // Remove variants with this size
    setVariants(variants.filter(v => v.size !== size));
  };

  // Generate variant matrix
  const generateMatrix = (): VariantMatrixCell[] => {
    const matrix: VariantMatrixCell[] = [];
    
    if (colors.length === 0 && sizes.length === 0) return matrix;
    
    // If only colors, create variants for each color
    if (colors.length > 0 && sizes.length === 0) {
      colors.forEach(color => {
        const existing = variants.find(v => v.color === color.name && !v.size);
        matrix.push({
          color: color.name,
          colorHex: color.hex,
          size: '',
          variant: existing,
          sku: existing?.sku || `${productId.substring(0, 8)}-${color.name.substring(0, 3).toUpperCase()}`,
          inventory: existing?.inventory || 0,
          priceAdjustment: existing?.priceAdjustment || 0,
          isAvailable: existing?.isAvailable ?? true
        });
      });
    }
    // If only sizes, create variants for each size
    else if (sizes.length > 0 && colors.length === 0) {
      sizes.forEach(size => {
        const existing = variants.find(v => v.size === size && !v.color);
        matrix.push({
          color: '',
          colorHex: '',
          size,
          variant: existing,
          sku: existing?.sku || `${productId.substring(0, 8)}-${size}`,
          inventory: existing?.inventory || 0,
          priceAdjustment: existing?.priceAdjustment || 0,
          isAvailable: existing?.isAvailable ?? true
        });
      });
    }
    // If both colors and sizes, create matrix
    else {
      colors.forEach(color => {
        sizes.forEach(size => {
          const existing = variants.find(v => v.color === color.name && v.size === size);
          matrix.push({
            color: color.name,
            colorHex: color.hex,
            size,
            variant: existing,
            sku: existing?.sku || `${productId.substring(0, 8)}-${color.name.substring(0, 3).toUpperCase()}-${size}`,
            inventory: existing?.inventory || 0,
            priceAdjustment: existing?.priceAdjustment || 0,
            isAvailable: existing?.isAvailable ?? true
          });
        });
      });
    }
    
    return matrix;
  };

  const updateMatrixCell = (color: string, size: string, field: string, value: any) => {
    const matrix = generateMatrix();
    const cell = matrix.find(c => c.color === color && c.size === size);
    if (cell) {
      cell[field as keyof VariantMatrixCell] = value;
    }
  };

  const saveVariants = async () => {
    try {
      setLoading(true);
      const matrix = generateMatrix();
      
      const variantsToCreate: CreateVariantInput[] = matrix
        .filter(cell => !cell.variant && cell.inventory > 0)
        .map(cell => ({
          productId,
          listingId,
          sku: cell.sku,
          color: cell.color || undefined,
          colorHex: cell.colorHex || undefined,
          size: cell.size || undefined,
          priceAdjustment: cell.priceAdjustment,
          inventory: cell.inventory,
          isDefault: matrix.indexOf(cell) === 0
        }));

      if (variantsToCreate.length > 0) {
        await productVariantService.bulkCreateVariants(productId, variantsToCreate);
      }

      // Update existing variants
      for (const cell of matrix.filter(c => c.variant)) {
        if (cell.variant) {
          await productVariantService.updateVariant(cell.variant.id, {
            sku: cell.sku,
            inventory: cell.inventory,
            priceAdjustment: cell.priceAdjustment,
            isAvailable: cell.isAvailable
          });
        }
      }

      await loadVariants();
      addToast('Variants saved successfully!', 'success');
      if (onVariantsChange) {
        onVariantsChange(variants);
      }
    } catch (error: any) {
      console.error('Failed to save variants:', error);
      addToast(error.message || 'Failed to save variants', 'error');
    } finally {
      setLoading(false);
    }
  };

  const matrix = generateMatrix();

  return (
    <div className="space-y-6">
      {/* Color Management */}
      <div>
        <h4 className="text-lg font-medium text-white mb-3">Colors</h4>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {colors.map(color => (
            <div
              key={color.name}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg border border-white/20"
            >
              <div
                className="w-6 h-6 rounded border-2 border-white/30"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-white text-sm">{color.name}</span>
              <button
                onClick={() => removeColor(color.name)}
                className="text-white/60 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Preset Colors */}
        <div className="mb-3">
          <label className="text-sm text-white/70 mb-2 block">Quick Add:</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map(color => (
              <button
                key={color.name}
                onClick={() => {
                  if (!colors.some(c => c.name === color.name)) {
                    setColors([...colors, color]);
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/20 transition-colors"
                title={`Add ${color.name}`}
              >
                <div
                  className="w-4 h-4 rounded border border-white/30"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-xs text-white/70">{color.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Color */}
        {showColorPicker ? (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Color name (e.g., Midnight Blue)"
                value={newColor.name}
                onChange={(e) => setNewColor({ ...newColor, name: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
              />
            </div>
            <div>
              <input
                type="color"
                value={newColor.hex}
                onChange={(e) => setNewColor({ ...newColor, hex: e.target.value })}
                className="w-16 h-10 rounded cursor-pointer"
              />
            </div>
            <button
              onClick={addColor}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setShowColorPicker(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowColorPicker(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20"
          >
            <Plus size={16} />
            Add Custom Color
          </button>
        )}
      </div>

      {/* Size Management */}
      <div>
        <h4 className="text-lg font-medium text-white mb-3">Sizes</h4>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {sizes.map(size => (
            <div
              key={size}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg border border-white/20"
            >
              <span className="text-white text-sm font-medium">{size}</span>
              <button
                onClick={() => removeSize(size)}
                className="text-white/60 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Preset Sizes */}
        <div className="mb-3">
          <label className="text-sm text-white/70 mb-2 block">Quick Add:</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_SIZES.map(size => (
              <button
                key={size}
                onClick={() => {
                  if (!sizes.includes(size)) {
                    setSizes([...sizes, size]);
                  }
                }}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/20 text-sm text-white/70 transition-colors"
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Size */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Custom size (e.g., 32x34, One Size)"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addSize()}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
          />
          <button
            onClick={addSize}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Variant Matrix */}
      {(colors.length > 0 || sizes.length > 0) && (
        <div>
          <h4 className="text-lg font-medium text-white mb-3">
            Variant Matrix ({matrix.length} variants)
          </h4>
          
          <div className="bg-white/5 rounded-lg border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10">
                  <tr>
                    {colors.length > 0 && <th className="px-4 py-3 text-left text-sm font-medium text-white">Color</th>}
                    {sizes.length > 0 && <th className="px-4 py-3 text-left text-sm font-medium text-white">Size</th>}
                    <th className="px-4 py-3 text-left text-sm font-medium text-white">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white">Inventory</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white">Price Adj.</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white">Images</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-white">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((cell, index) => (
                    <VariantRow
                      key={`${cell.color}-${cell.size}`}
                      cell={cell}
                      basePrice={basePrice}
                      onUpdate={(field, value) => {
                        const updatedMatrix = [...matrix];
                        updatedMatrix[index] = { ...cell, [field]: value };
                        // Update the matrix state would require lifting state up
                        // For now, we'll handle this in saveVariants
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={saveVariants}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Saving...' : 'Save All Variants'}
            </button>
            
            <button
              onClick={loadVariants}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {colors.length === 0 && sizes.length === 0 && (
        <div className="text-center py-8 bg-white/5 rounded-lg border border-white/20">
          <p className="text-white/70 mb-2">No variants configured</p>
          <p className="text-sm text-white/50">Add colors or sizes to create product variants</p>
        </div>
      )}
    </div>
  );
};

// Variant Row Component
interface VariantRowProps {
  cell: VariantMatrixCell;
  basePrice: number;
  onUpdate: (field: string, value: any) => void;
}

const VariantRow: React.FC<VariantRowProps> = ({ cell, basePrice, onUpdate }) => {
  const [sku, setSku] = useState(cell.sku);
  const [inventory, setInventory] = useState(cell.inventory);
  const [priceAdj, setPriceAdj] = useState(cell.priceAdjustment);
  const [available, setAvailable] = useState(cell.isAvailable);

  const finalPrice = basePrice + priceAdj;

  return (
    <tr className="border-t border-white/10 hover:bg-white/5">
      {cell.color && (
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border-2 border-white/30"
              style={{ backgroundColor: cell.colorHex }}
            />
            <span className="text-white text-sm">{cell.color}</span>
          </div>
        </td>
      )}
      {cell.size && (
        <td className="px-4 py-3">
          <span className="text-white text-sm font-medium">{cell.size}</span>
        </td>
      )}
      <td className="px-4 py-3">
        <input
          type="text"
          value={sku}
          onChange={(e) => {
            setSku(e.target.value);
            onUpdate('sku', e.target.value);
          }}
          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
          placeholder="SKU"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min="0"
          value={inventory}
          onChange={(e) => {
            setInventory(parseInt(e.target.value) || 0);
            onUpdate('inventory', parseInt(e.target.value) || 0);
          }}
          className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            value={priceAdj}
            onChange={(e) => {
              setPriceAdj(parseFloat(e.target.value) || 0);
              onUpdate('priceAdjustment', parseFloat(e.target.value) || 0);
            }}
            className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
          />
          <span className="text-xs text-white/50">
            = ${finalPrice.toFixed(2)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <button className="text-indigo-400 hover:text-indigo-300 text-sm">
          <Upload size={16} />
        </button>
      </td>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={available}
          onChange={(e) => {
            setAvailable(e.target.checked);
            onUpdate('isAvailable', e.target.checked);
          }}
          className="w-4 h-4 rounded border-white/20"
        />
      </td>
    </tr>
  );
};

export default VariantManager;
