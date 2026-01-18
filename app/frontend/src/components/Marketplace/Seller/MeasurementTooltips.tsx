import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

export interface MeasurementTooltip {
  title: string;
  description: string;
  diagram?: string;
  tips: string[];
}

const MEASUREMENT_TOOLTIPS: Record<string, MeasurementTooltip> = {
  chest: {
    title: 'Chest Measurement',
    description: 'Measure around the fullest part of the chest, keeping the tape measure parallel to the floor.',
    diagram: '📏',
    tips: [
      'Stand naturally with arms relaxed at sides',
      'Measure under the arms, across the shoulder blades',
      'Keep tape measure snug but not tight',
      'For women, measure at the fullest point'
    ]
  },
  waist: {
    title: 'Waist Measurement',
    description: 'Measure around the natural waistline, typically at the narrowest point above the belly button.',
    diagram: '📏',
    tips: [
      'Find your natural waistline (bend sideways to locate)',
      'Measure at the narrowest point',
      'Keep tape measure level and parallel to floor',
      'For pants, measure where you typically wear them'
    ]
  },
  hips: {
    title: 'Hip Measurement',
    description: 'Measure around the fullest part of the hips, keeping the tape measure parallel to the floor.',
    diagram: '📏',
    tips: [
      'Stand with feet together',
      'Measure around the fullest part of buttocks',
      'Keep tape measure level',
      'For skirts/pants, measure where they will sit'
    ]
  },
  inseam: {
    title: 'Inseam Measurement',
    description: 'Measure from the crotch seam to the bottom of the pant leg.',
    diagram: '📏',
    tips: [
      'Best measured on a well-fitting pair of pants',
      'Lay pants flat and measure inner leg seam',
      'Alternatively, measure from crotch to ankle bone',
      'Add 0.5-1 inch for comfort'
    ]
  },
  sleeve: {
    title: 'Sleeve Length',
    description: 'Measure from the center of the back of the neck, across the shoulder, to the wrist bone.',
    diagram: '📏',
    tips: [
      'Start at the base of the neck (center back)',
      'Measure across the shoulder to the elbow',
      'Continue to the wrist bone',
      'Keep arm slightly bent during measurement'
    ]
  },
  collar: {
    title: 'Collar Size',
    description: 'Measure around the neck at the base, adding 0.5-1 inch for comfort.',
    diagram: '📏',
    tips: [
      'Place tape around neck at base',
      'Insert two fingers under tape for comfort',
      'Measure snug but not tight',
      'Measure at the base, not at the Adam\'s apple'
    ]
  },
  shoe_length: {
    title: 'Foot Length',
    description: 'Measure from the heel to the longest toe while standing.',
    diagram: '👟',
    tips: [
      'Stand on a piece of paper',
      'Mark heel and longest toe',
      'Measure distance between marks',
      'Measure both feet, use the larger measurement'
    ]
  },
  shoe_width: {
    title: 'Foot Width',
    description: 'Measure across the widest part of the foot (typically the ball of the foot).',
    diagram: '👟',
    tips: [
      'Stand on a piece of paper',
      'Mark widest points on both sides',
      'Measure distance between marks',
      'Measure both feet, use the larger measurement'
    ]
  },
  length: {
    title: 'Product Length',
    description: 'Measure from the top edge to the bottom edge of the product.',
    diagram: '📐',
    tips: [
      'Measure the longest dimension',
      'For clothing, measure from shoulder seam to hem',
      'For furniture, measure from top to bottom',
      'Include any protruding elements'
    ]
  },
  width: {
    title: 'Product Width',
    description: 'Measure from side to side at the widest point.',
    diagram: '📐',
    tips: [
      'Measure the widest horizontal dimension',
      'For clothing, measure across chest/waist',
      'For furniture, measure across the front',
      'Include armrests or protruding elements'
    ]
  },
  height: {
    title: 'Product Height',
    description: 'Measure from the bottom to the top of the product.',
    diagram: '📐',
    tips: [
      'Measure from floor to highest point',
      'For furniture, measure from floor to top',
      'For electronics, measure from bottom to top',
      'Include any stands or bases'
    ]
  },
  weight: {
    title: 'Product Weight',
    description: 'The actual weight of the product including packaging.',
    diagram: '⚖️',
    tips: [
      'Use a calibrated scale',
      'Include packaging weight',
      'Weigh in the unit you\'ll ship in',
      'Round up to the nearest unit for shipping'
    ]
  }
};

interface MeasurementTooltipComponentProps {
  field: string;
  children: React.ReactNode;
}

export const MeasurementTooltip: React.FC<MeasurementTooltipComponentProps> = ({ field, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipData = MEASUREMENT_TOOLTIPS[field];

  if (!tooltipData) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <div
        className="inline-flex items-center gap-1 cursor-help"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
        <Info className="w-4 h-4 text-indigo-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-80 bg-gray-900 border border-white/20 rounded-lg shadow-xl p-4 left-0 top-full mt-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-white/40 hover:text-white"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">{tooltipData.diagram}</span>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">{tooltipData.title}</h4>
              <p className="text-xs text-white/70">{tooltipData.description}</p>
            </div>
          </div>

          {tooltipData.tips && tooltipData.tips.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-white/90 mb-2">Tips for accurate measurement:</h5>
              <ul className="space-y-1">
                {tooltipData.tips.map((tip, idx) => (
                  <li key={idx} className="text-xs text-white/60 flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced input field with measurement tooltip
 */
export interface MeasurementInputProps {
  label: string;
  field: string;
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  type?: 'text' | 'number';
  unit?: string;
  required?: boolean;
}

export const MeasurementInput: React.FC<MeasurementInputProps> = ({
  label,
  field,
  value,
  onChange,
  placeholder,
  type = 'text',
  unit,
  required = false
}) => {
  return (
    <div className="space-y-2">
      <MeasurementTooltip field={field}>
        <label className="block text-sm font-medium text-white/90">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      </MeasurementTooltip>
      <div className="flex gap-2">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
        />
        {unit && (
          <span className="flex items-center px-3 bg-white/5 border border-white/10 rounded-md text-sm text-white/60">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

export default MeasurementTooltip;