import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// Interface for validation schema
interface ValidationSchema {
  params?: Record<string, ValidationRule>;
  query?: Record<string, ValidationRule>;
  body?: Record<string, ValidationRule>;
}

interface ValidationRule {
  type: string;
  required?: boolean;
  optional?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
}

// Custom validation function that matches the route expectations
export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate params
    if (schema.params) {
      for (const [key, rule] of Object.entries(schema.params)) {
        const value = req.params[key];
        const error = validateField(key, value, rule, 'params');
        if (error) errors.push(error);
      }
    }

    // Validate query
    if (schema.query) {
      for (const [key, rule] of Object.entries(schema.query)) {
        const value = req.query[key];
        const error = validateField(key, value, rule, 'query');
        if (error) errors.push(error);
      }
    }

    // Validate body
    if (schema.body) {
      for (const [key, rule] of Object.entries(schema.body)) {
        const value = req.body[key];
        const error = validateField(key, value, rule, 'body');
        if (error) errors.push(error);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    next();
  };
};

function validateField(key: string, value: any, rule: ValidationRule, location: string): string | null {
  // Check if field is required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return `${location}.${key} is required`;
  }

  // Skip validation if field is optional and not provided
  if (rule.optional && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Type validation
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `${location}.${key} must be a string`;
      }
      if (rule.minLength && value.length < rule.minLength) {
        return `${location}.${key} must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${location}.${key} must be at most ${rule.maxLength} characters`;
      }
      if (rule.enum && !rule.enum.includes(value)) {
        return `${location}.${key} must be one of: ${rule.enum.join(', ')}`;
      }
      break;

    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return `${location}.${key} must be a number`;
      }
      if (rule.min !== undefined && numValue < rule.min) {
        return `${location}.${key} must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && numValue > rule.max) {
        return `${location}.${key} must be at most ${rule.max}`;
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return `${location}.${key} must be an array`;
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `${location}.${key} must be an object`;
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `${location}.${key} must be a boolean`;
      }
      break;
  }

  return null;
}

// Express-validator based validation (for backward compatibility)
export const validateRequestExpressValidator = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
    return;
  }
  next();
};
