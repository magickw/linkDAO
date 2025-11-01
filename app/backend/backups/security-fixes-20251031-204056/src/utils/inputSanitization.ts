import validator from 'validator';

/**
 * Input Sanitization Utilities
 * Prevents injection attacks by sanitizing user input
 */

/**
 * Sanitize string for logging to prevent log injection
 */
export function sanitizeForLog(input: any): string {
  if (input === null || input === undefined) return '';
  
  const str = String(input);
  // Remove newlines, carriage returns, and control characters
  return str.replace(/[\n\r\t\x00-\x1F\x7F]/g, '');
}

/**
 * Sanitize SQL LIKE pattern
 */
export function sanitizeLikePattern(pattern: string): string {
  return pattern.replace(/[%_\\]/g, '\\$&');
}

/**
 * Validate and sanitize wallet address
 */
export function sanitizeWalletAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    throw new Error('Invalid wallet address');
  }
  
  const cleaned = address.trim().toLowerCase();
  
  if (!/^0x[a-f0-9]{40}$/i.test(cleaned)) {
    throw new Error('Invalid Ethereum address format');
  }
  
  return cleaned;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Invalid email');
  }
  
  const cleaned = email.trim().toLowerCase();
  
  if (!validator.isEmail(cleaned)) {
    throw new Error('Invalid email format');
  }
  
  return validator.normalizeEmail(cleaned) || cleaned;
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: any, min?: number, max?: number): number {
  const num = Number(input);
  
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`Number must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`Number must be at most ${max}`);
  }
  
  return num;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: any, maxLength: number = 1000): string {
  if (input === null || input === undefined) return '';
  
  const str = String(input).trim();
  
  if (str.length > maxLength) {
    throw new Error(`String exceeds maximum length of ${maxLength}`);
  }
  
  return str;
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(input: any[], maxLength: number = 100): string[] {
  if (!Array.isArray(input)) {
    throw new Error('Input must be an array');
  }
  
  if (input.length > maxLength) {
    throw new Error(`Array exceeds maximum length of ${maxLength}`);
  }
  
  return input.map(item => sanitizeString(item));
}

/**
 * Sanitize object keys to prevent prototype pollution
 */
export function sanitizeObjectKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const sanitized: any = {};
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && !dangerousKeys.includes(key)) {
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}

/**
 * Validate UUID
 */
export function validateUUID(uuid: string): boolean {
  return validator.isUUID(uuid);
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL');
  }
  
  const cleaned = url.trim();
  
  if (!validator.isURL(cleaned, { protocols: ['http', 'https'], require_protocol: true })) {
    throw new Error('Invalid URL format');
  }
  
  return cleaned;
}
