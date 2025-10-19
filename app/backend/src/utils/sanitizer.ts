import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return DOMPurify.sanitize(input.trim());
}

export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

export function validateLength(input: string, maxLength: number, fieldName: string): void {
  if (input && input.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}