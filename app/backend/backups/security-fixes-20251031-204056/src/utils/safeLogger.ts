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
  
  if (typeof meta === 'object') {
    const sanitized: any = {};
    for (const key in meta) {
      if (meta.hasOwnProperty(key)) {
        sanitized[key] = typeof meta[key] === 'string' 
          ? sanitizeForLog(meta[key])
          : meta[key];
      }
    }
    return sanitized;
  }
  
  return sanitizeForLog(meta);
}
