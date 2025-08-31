// Simple logger implementation using console
export const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.log(`[${timestamp}] INFO: ${message}`, meta);
    } else {
      console.log(`[${timestamp}] INFO: ${message}`);
    }
  },
  
  error: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.error(`[${timestamp}] ERROR: ${message}`, meta);
    } else {
      console.error(`[${timestamp}] ERROR: ${message}`);
    }
  },
  
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.warn(`[${timestamp}] WARN: ${message}`, meta);
    } else {
      console.warn(`[${timestamp}] WARN: ${message}`);
    }
  },
  
  debug: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.debug(`[${timestamp}] DEBUG: ${message}`, meta);
    } else {
      console.debug(`[${timestamp}] DEBUG: ${message}`);
    }
  }
};