/**
 * Safe Rendering Utilities
 * Prevents React Error #31 by ensuring only primitives are rendered
 */

import React from 'react';

/**
 * Safely render a value, converting objects to strings
 */
export function safeRender(value: any): string | number | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }

  // Primitives are safe to render
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  
  // Convert boolean to string
  if (typeof value === 'boolean') {
    return value.toString();
  }

  // Arrays should be joined
  if (Array.isArray(value)) {
    return value.map(safeRender).filter(Boolean).join(', ');
  }

  // Objects (including those with Symbols) should be stringified
  if (typeof value === 'object') {
    try {
      // Check if it's a Date
      if (value instanceof Date) {
        return value.toISOString();
      }

      // Check if it has a toString method
      if (typeof value.toString === 'function' && value.toString !== Object.prototype.toString) {
        return value.toString();
      }

      // Last resort: JSON stringify (will skip Symbols)
      return JSON.stringify(value);
    } catch (error) {
      console.warn('Failed to safely render object:', error);
      return '[Object]';
    }
  }

  // Functions and Symbols should not be rendered
  if (typeof value === 'function' || typeof value === 'symbol') {
    return null;
  }

  return String(value);
}

/**
 * Safely extract a property from an object
 */
export function safeGet<T = any>(obj: any, path: string, defaultValue: T | null = null): T | null {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }

  return current !== undefined ? current : defaultValue;
}

/**
 * Safely render an address (truncate if needed)
 */
export function safeAddress(address: any, truncate: boolean = true): string {
  const addr = safeRender(address);
  if (!addr || typeof addr !== 'string') {
    return 'Unknown';
  }

  if (truncate && addr.length > 12) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  return addr;
}

/**
 * Safely render a count/number
 */
export function safeCount(value: any): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  if (Array.isArray(value)) {
    return value.length;
  }

  return 0;
}

/**
 * Safely render a timestamp
 */
export function safeTimestamp(value: any): string {
  if (!value) {
    return 'Unknown';
  }

  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleString();
  } catch {
    return 'Invalid date';
  }
}

/**
 * Check if a value is safe to render directly
 */
export function isSafeToRender(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Wrap a component's render to catch rendering errors
 */
export function withSafeRender<P extends object>(
  Component: React.ComponentType<P>,
  fallback: React.ReactNode = null
): React.ComponentType<P> {
  const SafeComponent: React.FC<P> = (props) => {
    try {
      const WrappedComponent = Component;
      return <WrappedComponent {...props} />;
    } catch (error) {
      console.error('Rendering error caught:', error);
      return <>{fallback}</>;
    }
  };
  
  return SafeComponent;
}
