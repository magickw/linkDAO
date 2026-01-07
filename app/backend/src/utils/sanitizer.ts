import sanitizeHtml from 'sanitize-html';
import { Request, Response, NextFunction } from 'express';

// Sanitization configuration interface
export interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: string[] | Record<string, string[]>;
  allowedStyles?: Record<string, Record<string, RegExp[]>>;
  stripUnknown?: boolean;
  maxLength?: number;
  preserveWhitespace?: boolean;
}

// Sanitization result interface
export interface SanitizationResult {
  sanitized: string;
  warnings: string[];
  blocked: string[];
  modified: boolean;
}

// Default sanitization configurations for different content types
export const SANITIZATION_CONFIGS: Record<string, SanitizationConfig> = {
  // Basic text input (no HTML allowed)
  TEXT: {
    allowedTags: [],
    allowedAttributes: [],
    stripUnknown: true,
    maxLength: 1000,
    preserveWhitespace: false
  },

  // Rich text content (HTML allowed for posts)
  RICH_TEXT: {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
      'a', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li',
      'img', 'iframe', 'div', 'span'
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target', 'rel', 'class'],
      'img': ['src', 'alt', 'title', 'width', 'height', 'class'],
      'iframe': ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'class'],
      'div': ['class', 'style'],
      'span': ['class', 'style'],
      'p': ['class', 'style'],
      'h1': ['class', 'style'],
      'h2': ['class', 'style'],
      'h3': ['class', 'style'],
      'h4': ['class', 'style'],
      'h5': ['class', 'style'],
      'h6': ['class', 'style'],
      'strong': ['class', 'style'],
      'em': ['class', 'style'],
      'u': ['class', 'style'],
      's': ['class', 'style'],
      'blockquote': ['class', 'style'],
      'ul': ['class', 'style'],
      'ol': ['class', 'style'],
      'li': ['class', 'style'],
      '*': ['class', 'id', 'dir', 'lang']
    },
    allowedStyles: {
      '*': {
        // Typography
        'color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/, /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*[\d.]+\s*\)$/, /^hsl\([^)]+\)$/, /^hsla\([^)]+\)$/, /^[a-z]+$/i],
        'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/, /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*[\d.]+\s*\)$/, /^hsl\([^)]+\)$/, /^hsla\([^)]+\)$/, /^[a-z]+$/i],
        'font-size': [/^\d+(?:px|em|rem|%)$/],
        'font-weight': [/^\d+$/, /^(bold|bolder|lighter|normal)$/],
        'font-style': [/^(italic|normal|oblique)$/],
        'text-align': [/^(left|right|center|justify)$/],
        'text-decoration': [/^(none|underline|line-through|overline)$/],
        'line-height': [/^\d+(?:\.\d+)?(?:px|em|rem|%)?$/],

        // Spacing & Layout
        'margin': [/^-?\d+(?:px|em|rem|%|auto)$/, /^-?\d+(?:px|em|rem|%|auto)\s+-?\d+(?:px|em|rem|%|auto)$/, /^-?\d+(?:px|em|rem|%|auto)\s+-?\d+(?:px|em|rem|%|auto)\s+-?\d+(?:px|em|rem|%|auto)$/, /^-?\d+(?:px|em|rem|%|auto)\s+-?\d+(?:px|em|rem|%|auto)\s+-?\d+(?:px|em|rem|%|auto)\s+-?\d+(?:px|em|rem|%|auto)$/],
        'margin-top': [/^-?\d+(?:px|em|rem|%|auto)$/],
        'margin-right': [/^-?\d+(?:px|em|rem|%|auto)$/],
        'margin-bottom': [/^-?\d+(?:px|em|rem|%|auto)$/],
        'margin-left': [/^-?\d+(?:px|em|rem|%|auto)$/],
        'padding': [/^\d+(?:px|em|rem|%)(?:\s+\d+(?:px|em|rem|%)){0,3}$/],
        'padding-top': [/^\d+(?:px|em|rem|%)$/],
        'padding-right': [/^\d+(?:px|em|rem|%)$/],
        'padding-bottom': [/^\d+(?:px|em|rem|%)$/],
        'padding-left': [/^\d+(?:px|em|rem|%)$/],

        // Borders
        'border': [/^\d+(?:px|em|rem)\s+(?:solid|dashed|dotted|double)\s+(?:#[0-9a-f]+|rgb\([^)]+\))$/i],
        'border-radius': [/^\d+(?:px|em|rem|%)$/],
      }
    },
    stripUnknown: true,
    maxLength: 50000, // Increased for longer posts
    preserveWhitespace: true
  },

  // Marketplace description (moderate HTML allowed)
  DESCRIPTION: {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    allowedAttributes: [],
    stripUnknown: true,
    maxLength: 2000,
    preserveWhitespace: true
  },

  // Comments (minimal HTML allowed)
  COMMENT: {
    allowedTags: ['strong', 'em', 'code'],
    allowedAttributes: [],
    stripUnknown: true,
    maxLength: 2000,
    preserveWhitespace: false
  },

  // Search queries (no HTML, strict sanitization)
  SEARCH: {
    allowedTags: [],
    allowedAttributes: [],
    stripUnknown: true,
    maxLength: 200,
    preserveWhitespace: false
  }
};

/**
 * Enhanced input sanitization utility
 */
export class InputSanitizer {
  /**
   * Sanitize a string input with comprehensive security checks
   */
  static sanitizeString(
    input: string,
    config: SanitizationConfig = SANITIZATION_CONFIGS.TEXT
  ): SanitizationResult {
    if (!input || typeof input !== 'string') {
      return {
        sanitized: '',
        warnings: [],
        blocked: [],
        modified: false
      };
    }

    const original = input;
    const warnings: string[] = [];
    const blocked: string[] = [];
    let sanitized = input;

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /javascript:/gi, name: 'JavaScript protocol' },
      { pattern: /vbscript:/gi, name: 'VBScript protocol' },
      { pattern: /data:text\/html/gi, name: 'Data URL with HTML' },
      { pattern: /on\w+\s*=/gi, name: 'Event handlers' },
      { pattern: /<script/gi, name: 'Script tags' },
      { pattern: /<iframe/gi, name: 'Iframe tags' },
      { pattern: /<object/gi, name: 'Object tags' },
      { pattern: /<embed/gi, name: 'Embed tags' },
      { pattern: /<form/gi, name: 'Form tags' },
      { pattern: /expression\s*\(/gi, name: 'CSS expressions' }
    ];

    for (const { pattern, name } of dangerousPatterns) {
      const matches = sanitized.match(pattern);
      if (matches) {
        blocked.push(...matches.map(match => `${name}: ${match}`));
      }
    }

    // Trim whitespace unless preserving
    if (!config.preserveWhitespace) {
      sanitized = sanitized.trim();
    }

    // Check length limits
    if (config.maxLength && sanitized.length > config.maxLength) {
      sanitized = sanitized.substring(0, config.maxLength);
      warnings.push(`Content truncated to ${config.maxLength} characters`);
    }

    // Apply sanitize-html sanitization
    const sanitizeConfig: sanitizeHtml.IOptions = {
      allowedTags: config.allowedTags || [],
      allowedAttributes: (config.allowedAttributes && !Array.isArray(config.allowedAttributes)) ?
        config.allowedAttributes :
        (Array.isArray(config.allowedAttributes) ?
          config.allowedAttributes.reduce((acc, attr) => {
            acc['*'] = acc['*'] || [];
            if (!acc['*'].includes(attr)) acc['*'].push(attr);
            return acc;
          }, {} as Record<string, string[]>) : {}),
      allowedStyles: config.allowedStyles,
      allowProtocolRelative: false,
      disallowedTagsMode: 'discard',
    };

    sanitized = sanitizeHtml(sanitized, sanitizeConfig);

    // Check for excessive repetition
    const repetitionPattern = /(.{3,})\1{3,}/g;
    if (repetitionPattern.test(sanitized)) {
      warnings.push('Content contains excessive repetition');
    }

    // Check for excessive capitalization
    if (sanitized.length > 20) {
      const capsRatio = (sanitized.match(/[A-Z]/g) || []).length / sanitized.length;
      if (capsRatio > 0.7) {
        warnings.push('Content contains excessive capitalization');
      }
    }

    // Check for potential spam patterns
    const spamPatterns = [
      /(.)\1{10,}/g, // Repeated characters
      /https?:\/\/[^\s]{50,}/g, // Very long URLs
      /\b(buy|sell|cheap|free|click|now|urgent|limited)\b.*\b(buy|sell|cheap|free|click|now|urgent|limited)\b/gi // Spam keywords
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(sanitized)) {
        warnings.push('Content may contain spam patterns');
        break;
      }
    }

    const modified = sanitized !== original;

    return {
      sanitized,
      warnings,
      blocked,
      modified
    };
  }

  /**
   * Sanitize an object recursively
   */
  static sanitizeObject(
    obj: any,
    config: SanitizationConfig = SANITIZATION_CONFIGS.TEXT
  ): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj, config).sanitized;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, config));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize the key as well
        const sanitizedKey = this.sanitizeString(key, SANITIZATION_CONFIGS.TEXT).sanitized;
        sanitized[sanitizedKey] = this.sanitizeObject(value, config);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Validate and sanitize wallet address
   */
  static sanitizeWalletAddress(address: string): string {
    if (!address || typeof address !== 'string') return '';

    // Remove any non-hex characters except 0x prefix
    const cleaned = address.toLowerCase().replace(/[^0-9a-fx]/g, '');

    // Ensure it starts with 0x and is 42 characters long
    if (cleaned.startsWith('0x') && cleaned.length === 42) {
      return cleaned;
    }

    throw new Error('Invalid wallet address format');
  }

  /**
   * Sanitize ENS name
   */
  static sanitizeENSName(ensName: string): string {
    if (!ensName || typeof ensName !== 'string') return '';

    const cleaned = ensName.toLowerCase().trim();

    // Basic ENS validation
    if (!/^[a-z0-9-]+\.eth$/.test(cleaned)) {
      throw new Error('Invalid ENS name format');
    }

    return cleaned;
  }

  /**
   * Sanitize URL with protocol validation
   */
  static sanitizeURL(url: string, allowedProtocols: string[] = ['https', 'http']): string {
    if (!url || typeof url !== 'string') return '';

    try {
      const urlObj = new URL(url.trim());

      if (!allowedProtocols.includes(urlObj.protocol.slice(0, -1))) {
        throw new Error(`Protocol ${urlObj.protocol} not allowed`);
      }

      return urlObj.toString();
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return '';

    const cleaned = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleaned)) {
      throw new Error('Invalid email format');
    }

    return cleaned;
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(
    input: any,
    options: { min?: number; max?: number; decimals?: number } = {}
  ): number {
    const num = Number(input);

    if (isNaN(num)) {
      throw new Error('Invalid number format');
    }

    if (options.min !== undefined && num < options.min) {
      throw new Error(`Number must be at least ${options.min}`);
    }

    if (options.max !== undefined && num > options.max) {
      throw new Error(`Number must be at most ${options.max}`);
    }

    if (options.decimals !== undefined) {
      return Number(num.toFixed(options.decimals));
    }

    return num;
  }
}

// Legacy functions for backward compatibility
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return InputSanitizer.sanitizeString(input, SANITIZATION_CONFIGS.TEXT).sanitized;
}

export function sanitizeObject(obj: any): any {
  return InputSanitizer.sanitizeObject(obj, SANITIZATION_CONFIGS.TEXT);
}

export function validateLength(input: string, maxLength: number, fieldName: string): void {
  if (input && input.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }
}

/**
 * Express middleware for automatic request sanitization
 */
export const sanitizationMiddleware = (
  config: {
    body?: SanitizationConfig;
    query?: SanitizationConfig;
    params?: SanitizationConfig;
  } = {}
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Sanitize request body
      if (req.body && config.body) {
        req.body = InputSanitizer.sanitizeObject(req.body, config.body);
      }

      // Sanitize query parameters
      if (req.query && config.query) {
        req.query = InputSanitizer.sanitizeObject(req.query, config.query);
      }

      // Sanitize route parameters
      if (req.params && config.params) {
        req.params = InputSanitizer.sanitizeObject(req.params, config.params);
      }

      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'SANITIZATION_ERROR',
          message: 'Input sanitization failed',
          details: error instanceof Error ? error.message : 'Unknown sanitization error'
        }
      });
    }
  };
};

/**
 * Pre-configured sanitization middleware for different use cases
 */
export const textSanitization = sanitizationMiddleware({
  body: SANITIZATION_CONFIGS.TEXT,
  query: SANITIZATION_CONFIGS.TEXT,
  params: SANITIZATION_CONFIGS.TEXT
});

export const richTextSanitization = sanitizationMiddleware({
  body: SANITIZATION_CONFIGS.RICH_TEXT,
  query: SANITIZATION_CONFIGS.TEXT,
  params: SANITIZATION_CONFIGS.TEXT
});

export const searchSanitization = sanitizationMiddleware({
  body: SANITIZATION_CONFIGS.SEARCH,
  query: SANITIZATION_CONFIGS.SEARCH,
  params: SANITIZATION_CONFIGS.TEXT
});

export const marketplaceSanitization = sanitizationMiddleware({
  body: SANITIZATION_CONFIGS.DESCRIPTION,
  query: SANITIZATION_CONFIGS.TEXT,
  params: SANITIZATION_CONFIGS.TEXT
});

// InputSanitizer class is already exported above
