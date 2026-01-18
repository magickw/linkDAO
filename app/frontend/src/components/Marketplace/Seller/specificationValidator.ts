import { SpecificationData } from './SpecificationEditor';
import { SizeConfig } from './SizeConfigurationSystem';
import { CATEGORY_TEMPLATES, getCategoryTemplate } from '@/config/marketplace/specifications';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validation rules for different product categories
 */
const CATEGORY_VALIDATION_RULES = {
  // Electronics validation
  electronics: {
    weight: { min: 0.1, max: 50 }, // kg
    dimensions: { min: 1, max: 200 }, // cm
    screen_size: { min: 1, max: 100 }, // inches
    ram: { min: 1, max: 256 }, // GB
  },
  // Fashion validation
  fashion: {
    weight: { min: 0.05, max: 5 }, // kg
    dimensions: { min: 10, max: 100 }, // cm
  },
  // Furniture validation
  home: {
    weight: { min: 1, max: 500 }, // kg
    dimensions: { min: 10, max: 300 }, // cm
  },
  // Jewelry validation
  jewelry: {
    weight: { min: 0.001, max: 2 }, // kg
    dimensions: { min: 1, max: 50 }, // cm
  },
  // Default validation
  default: {
    weight: { min: 0.01, max: 100 }, // kg
    dimensions: { min: 1, max: 200 }, // cm
  }
};

/**
 * Unit conversion helpers
 */
const UNIT_CONVERSION = {
  weight: {
    g: { toKg: (val: number) => val / 1000, factor: 0.001 },
    kg: { toKg: (val: number) => val, factor: 1 },
    oz: { toKg: (val: number) => val * 0.0283495, factor: 0.0283495 },
    lbs: { toKg: (val: number) => val * 0.453592, factor: 0.453592 },
  },
  dimensions: {
    mm: { toCm: (val: number) => val / 10, factor: 0.1 },
    cm: { toCm: (val: number) => val, factor: 1 },
    m: { toCm: (val: number) => val * 100, factor: 100 },
    in: { toCm: (val: number) => val * 2.54, factor: 2.54 },
    ft: { toCm: (val: number) => val * 30.48, factor: 30.48 },
  }
};

/**
 * Convert weight to kg for validation
 */
const convertWeightToKg = (value: number, unit: string): number => {
  const converter = UNIT_CONVERSION.weight[unit as keyof typeof UNIT_CONVERSION.weight];
  return converter ? converter.toKg(value) : value;
};

/**
 * Convert dimension to cm for validation
 */
const convertDimensionToCm = (value: number, unit: string): number => {
  const converter = UNIT_CONVERSION.dimensions[unit as keyof typeof UNIT_CONVERSION.dimensions];
  return converter ? converter.toCm(value) : value;
};

/**
 * Validate weight against category rules
 */
const validateWeight = (
  weight: { value: number; unit: string } | undefined,
  category: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!weight || !weight.value) {
    return [{ field: 'weight', message: 'Weight is required', severity: 'error' }];
  }

  const weightKg = convertWeightToKg(weight.value, weight.unit);
  const rules = CATEGORY_VALIDATION_RULES[category as keyof typeof CATEGORY_VALIDATION_RULES] || CATEGORY_VALIDATION_RULES.default;
  const weightRules = rules.weight;

  if (weightKg < weightRules.min) {
    errors.push({
      field: 'weight',
      message: `Weight is too light. Minimum: ${weightRules.min}kg (current: ${weightKg.toFixed(2)}kg)`,
      severity: 'error'
    });
  }

  if (weightKg > weightRules.max) {
    errors.push({
      field: 'weight',
      message: `Weight is suspiciously heavy. Maximum: ${weightRules.max}kg (current: ${weightKg.toFixed(2)}kg). Please verify.`,
      severity: 'warning'
    });
  }

  // Check for unrealistic values
  if (category === 'fashion' && weightKg > 2) {
    errors.push({
      field: 'weight',
      message: `This seems too heavy for fashion apparel. Verify the weight and unit.`,
      severity: 'warning'
    });
  }

  if (category === 'jewelry' && weightKg > 0.5) {
    errors.push({
      field: 'weight',
      message: `This seems too heavy for jewelry. Verify the weight and unit.`,
      severity: 'warning'
    });
  }

  return errors;
};

/**
 * Validate dimensions against category rules
 */
const validateDimensions = (
  dimensions: { length: number; width: number; height: number; unit: string } | undefined,
  category: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
    return [{ field: 'dimensions', message: 'All dimensions are required', severity: 'error' }];
  }

  const lengthCm = convertDimensionToCm(dimensions.length, dimensions.unit);
  const widthCm = convertDimensionToCm(dimensions.width, dimensions.unit);
  const heightCm = convertDimensionToCm(dimensions.height, dimensions.unit);

  const rules = CATEGORY_VALIDATION_RULES[category as keyof typeof CATEGORY_VALIDATION_RULES] || CATEGORY_VALIDATION_RULES.default;
  const dimRules = rules.dimensions;

  // Check each dimension
  [lengthCm, widthCm, heightCm].forEach((dim, idx) => {
    const fieldNames = ['length', 'width', 'height'];
    if (dim < dimRules.min) {
      errors.push({
        field: fieldNames[idx],
        message: `${fieldNames[idx]} is too small. Minimum: ${dimRules.min}cm`,
        severity: 'error'
      });
    }
    if (dim > dimRules.max) {
      errors.push({
        field: fieldNames[idx],
        message: `${fieldNames[idx]} is very large. Maximum: ${dimRules.max}cm. Please verify.`,
        severity: 'warning'
      });
    }
  });

  // Check for unrealistic proportions
  const maxDimension = Math.max(lengthCm, widthCm, heightCm);
  const minDimension = Math.min(lengthCm, widthCm, heightCm);
  const ratio = maxDimension / minDimension;

  if (ratio > 50) {
    errors.push({
      field: 'dimensions',
      message: 'Dimensions have extreme proportions. Please verify measurements.',
      severity: 'warning'
    });
  }

  return errors;
};

/**
 * Validate required attributes from category template
 */
const validateRequiredAttributes = (
  attributes: { key: string; value: string }[],
  category: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const template = getCategoryTemplate(category);
  const requiredSpecs = template.specs.filter(spec => spec.validation?.required);

  requiredSpecs.forEach(spec => {
    const attr = attributes.find(a => a.key === spec.label || a.key === spec.key);
    if (!attr || !attr.value.trim()) {
      errors.push({
        field: spec.key,
        message: `${spec.label} is required`,
        severity: 'error'
      });
    }
  });

  return errors;
};

/**
 * Validate size configuration completeness
 */
const validateSizeConfiguration = (
  sizeConfig: SizeConfig,
  category: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (sizeConfig.system === 'apparel_standard' || sizeConfig.system === 'matrix') {
    // Check if sizes are selected
    if (!sizeConfig.selectedSizes || sizeConfig.selectedSizes.length === 0) {
      errors.push({
        field: 'sizes',
        message: 'At least one size must be selected',
        severity: 'error'
      });
    }

    // Check if size chart is provided when sizes are selected
    if (sizeConfig.selectedSizes && sizeConfig.selectedSizes.length > 0) {
      if (!sizeConfig.chart || !sizeConfig.chart.rows || sizeConfig.chart.rows.length === 0) {
        warnings.push({
          field: 'sizeChart',
          message: 'Size chart is recommended when offering multiple sizes',
          severity: 'warning'
        });
      } else {
        // Check if all selected sizes have measurements
        const sizeChartSizes = sizeConfig.chart.rows.map(row => row.Size || row['US Size'] || Object.values(row)[0]);
        const missingMeasurements = sizeConfig.selectedSizes.filter(size => !sizeChartSizes.includes(size));
        
        if (missingMeasurements.length > 0) {
          warnings.push({
            field: 'sizeChart',
            message: `Size chart missing measurements for: ${missingMeasurements.join(', ')}`,
            severity: 'warning'
          });
        }
      }
    }
  }

  if (sizeConfig.system === 'matrix') {
    // Check if matrix has selections
    if (!sizeConfig.matrix || !sizeConfig.matrix.selected || sizeConfig.matrix.selected.length === 0) {
      errors.push({
        field: 'matrix',
        message: 'At least one size combination must be selected',
        severity: 'error'
      });
    }
  }

  if (sizeConfig.system === 'simple_variants') {
    if (!sizeConfig.customVariants || sizeConfig.customVariants.length === 0) {
      warnings.push({
        field: 'variants',
        message: 'Consider adding product variants (e.g., colors, sizes)',
        severity: 'warning'
      });
    }
  }

  return [...errors, ...warnings];
};

/**
 * Main validation function
 */
export const validateSpecifications = (
  specs: SpecificationData,
  sizeConfig: SizeConfig,
  category: string
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate weight
  const weightErrors = validateWeight(specs.weight, category);
  weightErrors.forEach(err => {
    if (err.severity === 'error') errors.push(err);
    else warnings.push(err);
  });

  // Validate dimensions
  const dimensionErrors = validateDimensions(specs.dimensions, category);
  dimensionErrors.forEach(err => {
    if (err.severity === 'error') errors.push(err);
    else warnings.push(err);
  });

  // Validate required attributes
  const attributeErrors = validateRequiredAttributes(specs.attributes || [], category);
  errors.push(...attributeErrors);

  // Validate size configuration
  const sizeErrors = validateSizeConfiguration(sizeConfig, category);
  sizeErrors.forEach(err => {
    if (err.severity === 'error') errors.push(err);
    else warnings.push(err);
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Calculate shipping estimate based on weight and dimensions
 */
export const calculateShippingEstimate = (
  specs: SpecificationData
): { min: number; max: number; method: string } | null => {
  if (!specs.weight || !specs.dimensions) return null;

  const weightKg = convertWeightToKg(specs.weight.value, specs.weight.unit);
  const volumeCm3 = convertDimensionToCm(specs.dimensions.length, specs.dimensions.unit) *
                   convertDimensionToCm(specs.dimensions.width, specs.dimensions.unit) *
                   convertDimensionToCm(specs.dimensions.height, specs.dimensions.unit);

  // Dimensional weight (volumetric weight)
  const dimensionalWeightKg = volumeCm3 / 5000; // Standard divisor

  // Billable weight is the greater of actual weight and dimensional weight
  const billableWeightKg = Math.max(weightKg, dimensionalWeightKg);

  // Estimate shipping costs (simplified calculation)
  let minCost = 0;
  let maxCost = 0;
  let method = 'standard';

  if (billableWeightKg < 1) {
    minCost = 5;
    maxCost = 10;
    method = 'standard';
  } else if (billableWeightKg < 5) {
    minCost = 10;
    maxCost = 20;
    method = 'standard';
  } else if (billableWeightKg < 10) {
    minCost = 15;
    maxCost = 30;
    method = 'express';
  } else if (billableWeightKg < 30) {
    minCost = 30;
    maxCost = 50;
    method = 'freight';
  } else {
    minCost = 50;
    maxCost = 150;
    method = 'freight';
  }

  return { min: minCost, max: maxCost, method };
};