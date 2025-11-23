import { logger } from './logger';
import { sanitizeForLog } from './inputSanitization';

/**
 * Safe Logger Wrapper
 * Prevents log injection by sanitizing all inputs
 */

export const safeLogger = {
  info: (message: string, meta?: any) => {
    logger.info(sanitizeForLog(message), sanitizeMeta(meta));
  },
  
  error: (message: string, meta?: any) => {
    logger.error(sanitizeForLog(message), sanitizeMeta(meta));
  },
  
  warn: (message: string, meta?: any) => {
    logger.warn(sanitizeForLog(message), sanitizeMeta(meta));
  },
  
  debug: (message: string, meta?: any) => {
    logger.debug(sanitizeForLog(message), sanitizeMeta(meta));
  }
};

function sanitizeMeta(meta: any): any {
  if (!meta) return meta;

  // Handle Error objects specially
  if (meta instanceof Error) {
    return {
      message: sanitizeForLog(meta.message),
      name: meta.name,
      stack: meta.stack ? sanitizeForLog(meta.stack) : undefined,
      ...Object.getOwnPropertyNames(meta).reduce((acc, key) => {
        if (key !== 'message' && key !== 'stack' && key !== 'name') {
          acc[key] = (meta as any)[key];
        }
        return acc;
      }, {} as any)
    };
  }

  if (typeof meta === 'object') {
    const sanitized: any = {};
    for (const key in meta) {
      if (meta.hasOwnProperty(key)) {
        if (meta[key] instanceof Error) {
          sanitized[key] = sanitizeMeta(meta[key]); // Recursively handle nested errors
        } else {
          sanitized[key] = typeof meta[key] === 'string'
            ? sanitizeForLog(meta[key])
            : meta[key];
        }
      }
    }
    return sanitized;
  }

  return typeof meta === 'string' ? sanitizeForLog(meta) : meta;
}
