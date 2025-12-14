import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import sanitizeHtml from 'sanitize-html';
import validator from 'validator';
import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../utils/apiResponse';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code: string;
}

export interface SanitizationResult {
  sanitized: string;
  warnings: string[];
  blocked: string[];
}

export class InputValidator {
  // Common validation patterns
  private static readonly PATTERNS = {
    walletAddress: /^0x[a-fA-F0-9]{40}$/,
    ensName: /^[a-z0-9-]+\.eth$/,
    hashtag: /^#[a-zA-Z0-9_]{1,50}$/,
    mention: /^@[a-zA-Z0-9_.-]{1,30}$/,
    url: /^https?:\/\/([\w\-]+(\.[\w\-]+)+)([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$/,
    ipfsHash: /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  };

  // Content length limits
  private static readonly LIMITS = {
    post: { min: 1, max: 10000 },
    comment: { min: 1, max: 2000 },
    bio: { min: 0, max: 500 },
    title: { min: 1, max: 200 },
    description: { min: 0, max: 1000 },
    communityName: { min: 3, max: 50 },
    username: { min: 3, max: 30 }
  };

  /**
   * Validate and sanitize post content
   */
  static validatePostContent() {
    return [
      body('content')
        .isLength({ min: this.LIMITS.post.min, max: this.LIMITS.post.max })
        .withMessage(`Post content must be between ${this.LIMITS.post.min} and ${this.LIMITS.post.max} characters`)
        .custom(async (value) => {
          const result = await this.sanitizeContent(value, 'post');
          if (result.blocked.length > 0) {
            throw new Error(`Blocked content detected: ${result.blocked.join(', ')}`);
          }
          return true;
        }),
      
      body('tags')
        .optional()
        .isArray({ max: 10 })
        .withMessage('Maximum 10 tags allowed')
        .custom((tags: string[]) => {
          for (const tag of tags) {
            if (!this.PATTERNS.hashtag.test(tag)) {
              throw new Error(`Invalid hashtag format: ${tag}`);
            }
          }
          return true;
        }),

      body('mentions')
        .optional()
        .isArray({ max: 20 })
        .withMessage('Maximum 20 mentions allowed')
        .custom((mentions: string[]) => {
          for (const mention of mentions) {
            if (!this.PATTERNS.mention.test(mention) && !this.PATTERNS.walletAddress.test(mention)) {
              throw new Error(`Invalid mention format: ${mention}`);
            }
          }
          return true;
        }),

      body('mediaUrls')
        .optional()
        .isArray({ max: 10 })
        .withMessage('Maximum 10 media files allowed')
        .custom((urls: string[]) => {
          for (const url of urls) {
            if (!validator.isURL(url, { protocols: ['https'] })) {
              throw new Error(`Invalid media URL: ${url}`);
            }
          }
          return true;
        }),

      this.handleValidationErrors
    ];
  }

  /**
   * Validate wallet address
   */
  static validateWalletAddress(field: string = 'address') {
    return [
      body(field)
        .matches(this.PATTERNS.walletAddress)
        .withMessage('Invalid Ethereum wallet address format'),
      this.handleValidationErrors
    ];
  }

  /**
   * Validate community data
   */
  static validateCommunityData() {
    return [
      body('name')
        .isLength({ min: this.LIMITS.communityName.min, max: this.LIMITS.communityName.max })
        .withMessage(`Community name must be between ${this.LIMITS.communityName.min} and ${this.LIMITS.communityName.max} characters`)
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Community name can only contain letters, numbers, underscores, and hyphens'),

      body('displayName')
        .isLength({ min: 1, max: 100 })
        .withMessage('Display name must be between 1 and 100 characters'),

      body('description')
        .optional()
        .isLength({ max: this.LIMITS.description.max })
        .withMessage(`Description must be less than ${this.LIMITS.description.max} characters`)
        .custom(async (value) => {
          if (value) {
            const result = await this.sanitizeContent(value, 'description');
            if (result.blocked.length > 0) {
              throw new Error(`Blocked content in description: ${result.blocked.join(', ')}`);
            }
          }
          return true;
        }),

      body('category')
        .isIn(['technology', 'finance', 'gaming', 'art', 'music', 'sports', 'education', 'other'])
        .withMessage('Invalid category'),

      body('tags')
        .optional()
        .isArray({ max: 5 })
        .withMessage('Maximum 5 tags allowed'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validate message content
   */
  static validateMessageContent() {
    return [
      body('content')
        .isLength({ min: 1, max: 5000 })
        .withMessage('Message content must be between 1 and 5000 characters')
        .custom(async (value) => {
          const result = await this.sanitizeContent(value, 'message');
          if (result.blocked.length > 0) {
            throw new Error(`Blocked content detected: ${result.blocked.join(', ')}`);
          }
          return true;
        }),

      body('recipientAddress')
        .matches(this.PATTERNS.walletAddress)
        .withMessage('Invalid recipient wallet address'),

      body('contentType')
        .isIn(['text', 'image', 'file', 'post_share'])
        .withMessage('Invalid content type'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validate file upload
   */
  static validateFileUpload() {
    return [
      body('fileType')
        .isIn(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'])
        .withMessage('Invalid file type'),

      body('fileSize')
        .isInt({ min: 1, max: 50 * 1024 * 1024 }) // 50MB max
        .withMessage('File size must be between 1 byte and 50MB'),

      this.handleValidationErrors
    ];
  }

  /**
   * Handle validation errors with standardized response
   */
  private static handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const validationErrors: ValidationError[] = errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? (error as any).value : undefined,
        code: 'VALIDATION_ERROR'
      }));

      ApiResponse.validationError(res, 'Input validation failed', { errors: validationErrors });
      return;
    }

    next();
  };

  /**
   * SQL Injection prevention middleware
   */
  static preventSQLInjection() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
        /('|(\\')|(;)|(\\)|(\/\*)|(--)|(\*\/))/gi,
        /(\b(OR|AND)\b.*=.*)/gi
      ];

      const checkForSQLInjection = (obj: any, path: string = ''): boolean => {
        if (typeof obj === 'string') {
          return sqlPatterns.some(pattern => pattern.test(obj));
        }
        
        if (typeof obj === 'object' && obj !== null) {
          for (const [key, value] of Object.entries(obj)) {
            if (checkForSQLInjection(value, `${path}.${key}`)) {
              return true;
            }
          }
        }
        
        return false;
      };

      if (checkForSQLInjection(req.body) || 
          checkForSQLInjection(req.query) || 
          checkForSQLInjection(req.params)) {
        ApiResponse.badRequest(res, 'Potentially malicious input detected', { code: 'SQL_INJECTION_ATTEMPT' });
        return;
      }

      next();
    };
  }

  /**
   * Rate limiting for validation-heavy endpoints
   */
  static createValidationRateLimit(windowMs: number = 15 * 60 * 1000, max: number = 100) {
    return rateLimit({
      windowMs,
      max,
      handler: (req, res) => {
        ApiResponse.tooManyRequests(res, 'Too many validation requests');
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }
}

export default InputValidator;