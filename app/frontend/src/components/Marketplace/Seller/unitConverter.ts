/**
 * Unit conversion utilities for specifications
 * Supports automatic conversion between imperial and metric systems
 */

export type WeightUnit = 'g' | 'kg' | 'oz' | 'lbs';
export type LengthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft';

export interface ConvertedWeight {
  value: number;
  unit: WeightUnit;
  originalValue: number;
  originalUnit: WeightUnit;
}

export interface ConvertedLength {
  value: number;
  unit: LengthUnit;
  originalValue: number;
  originalUnit: LengthUnit;
}

/**
 * Weight conversion factors (to kg as base unit)
 */
const WEIGHT_FACTORS: Record<WeightUnit, number> = {
  g: 0.001,
  kg: 1,
  oz: 0.0283495,
  lbs: 0.453592
};

/**
 * Length conversion factors (to cm as base unit)
 */
const LENGTH_FACTORS: Record<LengthUnit, number> = {
  mm: 0.1,
  cm: 1,
  m: 100,
  in: 2.54,
  ft: 30.48
};

/**
 * Convert weight from one unit to another
 */
export const convertWeight = (
  value: number,
  fromUnit: WeightUnit,
  toUnit: WeightUnit
): number => {
  const valueInKg = value * WEIGHT_FACTORS[fromUnit];
  return valueInKg / WEIGHT_FACTORS[toUnit];
};

/**
 * Convert length from one unit to another
 */
export const convertLength = (
  value: number,
  fromUnit: LengthUnit,
  toUnit: LengthUnit
): number => {
  const valueInCm = value * LENGTH_FACTORS[fromUnit];
  return valueInCm / LENGTH_FACTORS[toUnit];
};

/**
 * Get dual display for weight (metric and imperial)
 */
export const getWeightDualDisplay = (
  value: number,
  unit: WeightUnit
): { metric: ConvertedWeight; imperial: ConvertedWeight } => {
  const isMetric = unit === 'g' || unit === 'kg';
  
  if (isMetric) {
    // Convert to metric (kg) and imperial (lbs)
    const valueInKg = convertWeight(value, unit, 'kg');
    const valueInLbs = convertWeight(value, unit, 'lbs');
    
    return {
      metric: {
        value: valueInKg,
        unit: 'kg',
        originalValue: value,
        originalUnit: unit
      },
      imperial: {
        value: valueInLbs,
        unit: 'lbs',
        originalValue: value,
        originalUnit: unit
      }
    };
  } else {
    // Convert to metric (kg) and imperial (lbs)
    const valueInKg = convertWeight(value, unit, 'kg');
    const valueInLbs = convertWeight(value, unit, 'lbs');
    
    return {
      metric: {
        value: valueInKg,
        unit: 'kg',
        originalValue: value,
        originalUnit: unit
      },
      imperial: {
        value: valueInLbs,
        unit: 'lbs',
        originalValue: value,
        originalUnit: unit
      }
    };
  }
};

/**
 * Get dual display for length (metric and imperial)
 */
export const getLengthDualDisplay = (
  value: number,
  unit: LengthUnit
): { metric: ConvertedLength; imperial: ConvertedLength } => {
  const isMetric = unit === 'mm' || unit === 'cm' || unit === 'm';
  
  if (isMetric) {
    // Convert to metric (cm) and imperial (in)
    const valueInCm = convertLength(value, unit, 'cm');
    const valueInInches = convertLength(value, unit, 'in');
    
    return {
      metric: {
        value: valueInCm,
        unit: 'cm',
        originalValue: value,
        originalUnit: unit
      },
      imperial: {
        value: valueInInches,
        unit: 'in',
        originalValue: value,
        originalUnit: unit
      }
    };
  } else {
    // Convert to metric (cm) and imperial (in)
    const valueInCm = convertLength(value, unit, 'cm');
    const valueInInches = convertLength(value, unit, 'in');
    
    return {
      metric: {
        value: valueInCm,
        unit: 'cm',
        originalValue: value,
        originalUnit: unit
      },
      imperial: {
        value: valueInInches,
        unit: 'in',
        originalValue: value,
        originalUnit: unit
      }
    };
  }
};

/**
 * Format weight with appropriate precision
 */
export const formatWeight = (value: number, unit: WeightUnit): string => {
  let precision = 2;
  
  // Adjust precision based on unit and value
  if (unit === 'g') {
    precision = 0;
  } else if (unit === 'kg' && value < 1) {
    precision = 3;
  } else if (unit === 'lbs' && value < 1) {
    precision = 2;
  }
  
  return `${value.toFixed(precision)} ${unit}`;
};

/**
 * Format length with appropriate precision
 */
export const formatLength = (value: number, unit: LengthUnit): string => {
  let precision = 2;
  
  // Adjust precision based on unit and value
  if (unit === 'mm') {
    precision = 0;
  } else if (unit === 'cm' && value < 10) {
    precision = 1;
  } else if (unit === 'in' && value < 10) {
    precision = 2;
  } else if (unit === 'ft') {
    precision = 2;
  }
  
  return `${value.toFixed(precision)} ${unit}`;
};

/**
 * Get dimension dual display (L x W x H)
 */
export const getDimensionsDualDisplay = (
  length: number,
  width: number,
  height: number,
  unit: LengthUnit
): { metric: string; imperial: string } => {
  const lengthDual = getLengthDualDisplay(length, unit);
  const widthDual = getLengthDualDisplay(width, unit);
  const heightDual = getLengthDualDisplay(height, unit);
  
  const metricStr = `${formatLength(lengthDual.metric.value, 'cm')} × ${formatLength(widthDual.metric.value, 'cm')} × ${formatLength(heightDual.metric.value, 'cm')}`;
  const imperialStr = `${formatLength(lengthDual.imperial.value, 'in')} × ${formatLength(widthDual.imperial.value, 'in')} × ${formatLength(heightDual.imperial.value, 'in')}`;
  
  return { metric: metricStr, imperial: imperialStr };
};

/**
 * Get best unit for display based on value
 */
export const getBestWeightUnit = (valueInKg: number): WeightUnit => {
  if (valueInKg < 0.1) return 'g';
  if (valueInKg < 10) return 'kg';
  return 'lbs';
};

/**
 * Get best length unit for display based on value
 */
export const getBestLengthUnit = (valueInCm: number): LengthUnit => {
  if (valueInCm < 1) return 'mm';
  if (valueInCm < 100) return 'cm';
  if (valueInCm < 300) return 'in';
  return 'ft';
};