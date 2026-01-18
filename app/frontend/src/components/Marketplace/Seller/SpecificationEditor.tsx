import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/design-system/components/Button';

export interface SpecificationData {
  weight?: {
    value: number;
    unit: 'g' | 'kg' | 'oz' | 'lbs';
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'mm' | 'cm' | 'm' | 'in' | 'ft';
  };
  attributes: { key: string; value: string }[];
}

interface SpecificationEditorProps {
  value: SpecificationData;
  onChange: (data: SpecificationData) => void;
  category: string;
}

const CATEGORY_ATTRIBUTES: Record<string, string[]> = {
  fashion: ['Material', 'Color', 'Pattern', 'Fit', 'Care Instructions'],
  electronics: ['Brand', 'Model', 'Color', 'Connectivity', 'Power Source', 'Warranty'],
  home: ['Material', 'Color', 'Style', 'Room', 'Assembly Required'],
  jewelry: ['Material', 'Gemstone', 'Metal Purity', 'Clarity', 'Cut'],
  default: ['Material', 'Color', 'Brand']
};

export const SpecificationEditor: React.FC<SpecificationEditorProps> = ({
  value,
  onChange,
  category
}) => {
  const [suggestedAttributes, setSuggestedAttributes] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  useEffect(() => {
    // Determine suggested attributes based on category
    const baseCategory = Object.keys(CATEGORY_ATTRIBUTES).find(key => 
      category.toLowerCase().includes(key)
    ) || 'default';
    
    setSuggestedAttributes(CATEGORY_ATTRIBUTES[baseCategory]);
    
    // Initialize field values from current specs
    const initialValues: Record<string, any> = {};
    if (value.weight) initialValues.weight = value.weight.value;
    if (value.dimensions) {
      initialValues.length = value.dimensions.length;
      initialValues.width = value.dimensions.width;
      initialValues.height = value.dimensions.height;
    }
    if (value.attributes) {
      value.attributes.forEach(attr => {
        initialValues[attr.key] = attr.value;
      });
    }
    setFieldValues(initialValues);
  }, [category, value]);

  /**
   * Check if a field should be visible based on conditional logic
   */
  const isFieldVisible = (conditional: { field: string; value: any } | undefined): boolean => {
    if (!conditional) return true;
    return fieldValues[conditional.field] === conditional.value;
  };

  const handleWeightChange = (field: 'value' | 'unit', val: any) => {
    onChange({
      ...value,
      weight: {
        value: value.weight?.value || 0,
        unit: value.weight?.unit || 'kg',
        [field]: val
      }
    });
    
    // Update field values for conditional logic
    if (field === 'value') {
      setFieldValues(prev => ({ ...prev, weight: val }));
    }
  };

  const handleDimensionChange = (field: 'length' | 'width' | 'height' | 'unit', val: any) => {
    onChange({
      ...value,
      dimensions: {
        length: value.dimensions?.length || 0,
        width: value.dimensions?.width || 0,
        height: value.dimensions?.height || 0,
        unit: value.dimensions?.unit || 'cm',
        [field]: val
      }
    });
    
    // Update field values for conditional logic
    if (field !== 'unit') {
      setFieldValues(prev => ({ ...prev, [field]: val }));
    }
  };

  const handleAttributeChange = (index: number, field: 'key' | 'value', val: string) => {
    const newAttributes = [...(value.attributes || [])];
    newAttributes[index] = { ...newAttributes[index], [field]: val };
    onChange({ ...value, attributes: newAttributes });
    
    // Update field values for conditional logic
    if (field === 'value' && newAttributes[index].key) {
      setFieldValues(prev => ({ ...prev, [newAttributes[index].key]: val }));
    }
  };

  const addAttribute = () => {
    onChange({
      ...value,
      attributes: [...(value.attributes || []), { key: '', value: '' }]
    });
  };

  const removeAttribute = (index: number) => {
    const newAttributes = [...(value.attributes || [])];
    newAttributes.splice(index, 1);
    onChange({ ...value, attributes: newAttributes });
  };

  const addSuggestedAttribute = (attr: string) => {
    if (value.attributes?.some(a => a.key === attr)) return;
    onChange({
      ...value,
      attributes: [...(value.attributes || []), { key: attr, value: '' }]
    });
  };

  return (
    <div className="space-y-6">
      {/* Weight & Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <label className="block text-sm font-medium text-white/90 mb-3">Weight</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={value.weight?.value || ''}
              onChange={(e) => handleWeightChange('value', parseFloat(e.target.value) || 0)}
              className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
            />
            <select
              value={value.weight?.unit || 'kg'}
              onChange={(e) => handleWeightChange('unit', e.target.value)}
              className="w-24 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 [&>option]:bg-gray-800"
            >
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="oz">oz</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-lg border border-white/10">
          <label className="block text-sm font-medium text-white/90 mb-3">Dimensions</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={value.dimensions?.length || ''}
              onChange={(e) => handleDimensionChange('length', parseFloat(e.target.value) || 0)}
              className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="L"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={value.dimensions?.width || ''}
              onChange={(e) => handleDimensionChange('width', parseFloat(e.target.value) || 0)}
              className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="W"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={value.dimensions?.height || ''}
              onChange={(e) => handleDimensionChange('height', parseFloat(e.target.value) || 0)}
              className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="H"
            />
          </div>
          <select
            value={value.dimensions?.unit || 'cm'}
            onChange={(e) => handleDimensionChange('unit', e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 [&>option]:bg-gray-800"
          >
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
            <option value="in">in</option>
            <option value="ft">ft</option>
          </select>
        </div>
      </div>

      {/* Attributes */}
      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
        <label className="block text-sm font-medium text-white/90 mb-3">Product Attributes</label>
        
        {/* Suggested Attributes */}
        {suggestedAttributes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-white/60 py-1">Suggestions:</span>
            {suggestedAttributes.map(attr => (
              <button
                key={attr}
                type="button"
                onClick={() => addSuggestedAttribute(attr)}
                disabled={value.attributes?.some(a => a.key === attr)}
                className="px-2 py-1 text-xs rounded-full bg-white/10 text-indigo-300 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                + {attr}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {(value.attributes || []).map((attr, index) => (
            <div key={index} className="flex gap-3">
              <input
                type="text"
                value={attr.key}
                onChange={(e) => handleAttributeChange(index, 'key', e.target.value)}
                placeholder="Attribute (e.g., Material)"
                className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={attr.value}
                onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                placeholder="Value (e.g., 100% Cotton)"
                className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => removeAttribute(index)}
                className="p-2 text-white/40 hover:text-red-400 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addAttribute}
          className="mt-4 border-white/20 text-white/80 hover:bg-white/10"
        >
          <Plus size={16} className="mr-2" />
          Add Attribute
        </Button>
      </div>
    </div>
  );
};

export default SpecificationEditor;
