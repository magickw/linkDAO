import crypto from 'crypto';
import validator from 'validator';

// SQL Injection Prevention
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

// Secure Random ID Generation
export function generateSecureId(prefix: string = ''): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

// Email Validation
export function validateEmail(email: string): boolean {
  return validator.isEmail(email);
}

// File Type Validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export function validateImageFile(file: { name: string; type: string; size: number }): { valid: boolean; error?: string } {
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File too large (max 10MB)' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type' };
  }

  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return { valid: false, error: 'Invalid file extension' };
  }

  return { valid: true };
}

// Data Encryption
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedData: string, key: Buffer): string {
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Redirect Validation
const ALLOWED_REDIRECTS = [
  'https://linkdao.io',
  'https://app.linkdao.io',
  'http://localhost:3000'
];

export function validateRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_REDIRECTS.some(allowed => 
      parsed.origin === new URL(allowed).origin
    );
  } catch {
    return false;
  }
}

// Rate Limit Tracking
const loginAttempts = new Map<string, { count: number; lockoutEnd: number }>();

export function checkLoginAttempts(userId: string): { allowed: boolean; message?: string } {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 15 * 60 * 1000;

  const attempts = loginAttempts.get(userId);
  
  if (attempts) {
    if (Date.now() < attempts.lockoutEnd) {
      return { 
        allowed: false, 
        message: `Account locked. Try again in ${Math.ceil((attempts.lockoutEnd - Date.now()) / 60000)} minutes` 
      };
    }
    
    if (attempts.count >= MAX_ATTEMPTS) {
      attempts.lockoutEnd = Date.now() + LOCKOUT_DURATION;
      return { allowed: false, message: 'Too many failed attempts. Account locked for 15 minutes' };
    }
  }

  return { allowed: true };
}

export function recordFailedLogin(userId: string): void {
  const attempts = loginAttempts.get(userId) || { count: 0, lockoutEnd: 0 };
  attempts.count++;
  loginAttempts.set(userId, attempts);
}

export function resetLoginAttempts(userId: string): void {
  loginAttempts.delete(userId);
}

// JWT Secret Validation
export function validateJWTSecret(secret: string | undefined): void {
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
  }
  if (secret === 'default-secret' || secret === 'secret') {
    throw new Error('JWT_SECRET cannot be a default value');
  }
}

// Sanitize Error Messages
export function sanitizeError(error: unknown): string {
  if (process.env.NODE_ENV === 'production') {
    return 'An error occurred';
  }
  return error instanceof Error ? error.message : 'Unknown error';
}
