/**
 * Utility functions for converting between metric and imperial units
 */

// Conversion constants
const CM_TO_INCH = 0.393701;
const INCH_TO_CM = 2.54;
const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

/**
 * Converts centimeters to inches
 * @param cm Value in centimeters
 * @returns Value in inches
 */
export const cmToInch = (cm: number): number => {
  return cm * CM_TO_INCH;
};

/**
 * Converts inches to centimeters
 * @param inch Value in inches
 * @returns Value in centimeters
 */
export const inchToCm = (inch: number): number => {
  return inch * INCH_TO_CM;
};

/**
 * Converts kilograms to pounds
 * @param kg Value in kilograms
 * @returns Value in pounds
 */
export const kgToLbs = (kg: number): number => {
  return kg * KG_TO_LBS;
};

/**
 * Converts pounds to kilograms
 * @param lbs Value in pounds
 * @returns Value in kilograms
 */
export const lbsToKg = (lbs: number): number => {
  return lbs * LBS_TO_KG;
};

/**
 * Dimension conversion utilities
 */
export class DimensionConverter {
  /**
   * Converts dimensions from centimeters to inches
   * @param dimensions Object with length, width, height in centimeters
   * @returns Object with length, width, height in inches
   */
  static convertDimensionsToImperial(dimensions: { length: number; width: number; height: number }): { 
    length: number; 
    width: number; 
    height: number 
  } {
    return {
      length: cmToInch(dimensions.length),
      width: cmToInch(dimensions.width),
      height: cmToInch(dimensions.height)
    };
  }

  /**
   * Converts dimensions from inches to centimeters
   * @param dimensions Object with length, width, height in inches
   * @returns Object with length, width, height in centimeters
   */
  static convertDimensionsToMetric(dimensions: { length: number; width: number; height: number }): { 
    length: number; 
    width: number; 
    height: number 
  } {
    return {
      length: inchToCm(dimensions.length),
      width: inchToCm(dimensions.width),
      height: inchToCm(dimensions.height)
    };
  }

  /**
   * Converts weight from kilograms to pounds
   * @param kg Weight in kilograms
   * @returns Weight in pounds
   */
  static convertWeightToImperial(kg: number): number {
    return kgToLbs(kg);
  }

  /**
   * Converts weight from pounds to kilograms
   * @param lbs Weight in pounds
   * @returns Weight in kilograms
   */
  static convertWeightToMetric(lbs: number): number {
    return lbsToKg(lbs);
  }

  /**
   * Formats a number to a specified number of decimal places
   * @param value Number to format
   * @param decimals Number of decimal places
   * @returns Formatted number string
   */
  static formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals);
  }
}