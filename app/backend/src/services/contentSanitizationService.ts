/**
 * Content Sanitization Service
 * Comprehensive content sanitization with XSS prevention and file validation
 */

import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';
import validator from 'validator';
import crypto from 'crypto';
import path from 'path';
import { securityConfig } from '../config/securityConfig';

export interface SanitizationOptions {
  allowMarkdown?: boolean;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
  contentType?: 'post' | 'comment' | 'message' | 'bio' | 'description';
}

export interface SanitizationResult {
  sanitized: string;
  original: string;
  warnings: string[];
  blocked: string[];
  metadata: {
    length: number;
    hasLinks: boolean;
    hasMentions: boolean;
    hasHashtags: boolean;
    riskScore: number;
  };
}

export interface FileValidationResult {
  valid: boolean;
  sanitizedName: string;
  errors: string[];
  warnings: string[];
  metadata: {
    size: number;
    type: string;
    hash: string;
    isImage: boolean;
    isVideo: boolean;
  };
}

export class ContentSanitizationService {
  private static readonly ALLOWED_TAGS = {
    basic: ['p', 'br', 'strong', 'em', 'u'],
    extended: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote'],
    rich: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img']
  };

  private static readonly ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'blockquote': ['cite'],
    'code': ['class'],
    'pre': ['class']
  };

  private static readonly DANGEROUS_PATTERNS = [
    { pattern: /javascript:/gi, risk: 10, description: 'JavaScript protocol' },
    { pattern: /vbscript:/gi, risk: 10, description: 'VBScript protocol' },
    { pattern: /data:text\/html/gi, risk: 9, description: 'HTML data URL' },
    { pattern: /on\w+\s*=/gi, risk: 8, description: 'Event handler' },
    { pattern: /<script/gi, risk: 10, description: 'Script tag' },
    { pattern: /<iframe/gi, risk: 7, description: 'Iframe tag' },
    { pattern: /<object/gi, risk: 7, description: 'Object tag' },
    { pattern: /<embed/gi, risk: 7, description: 'Embed tag' },
    { pattern: /<form/gi, risk: 5, description: 'Form tag' },
    { pattern: /<input/gi, risk: 5, description: 'Input tag' },
    { pattern: /eval\s*\(/gi, risk: 9, description: 'Eval function' },
    { pattern: /document\.(write|cookie)/gi, risk: 8, description: 'Document manipulation' }
  ];

  private static readonly CONTENT_LIMITS = {
    post: { min: 1, max: 10000 },
    comment: { min: 1, max: 2000 },
    message: { min: 1, max: 5000 },
    bio: { min: 0, max: 500 },
    description: { min: 0, max: 1000 }
  };

  private static readonly ALLOWED_FILE_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/webm', 'video/ogg'],
    document: ['application/pdf', 'text/plain']
  };

  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Sanitize text content with comprehensive XSS prevention
   */
  static async sanitizeContent(
    content: string,
    options: SanitizationOptions = {}
  ): Promise<SanitizationResult> {
    const warnings: string[] = [];
    const blocked: string[] = [];
    const original = content;
    let riskScore = 0;

    try {
      // Validate content length
      const contentType = options.contentType || 'post';
      const limits = this.CONTENT_LIMITS[contentType];
      
      if (content.length < limits.min) {
        throw new Error(`Content too short. Minimum ${limits.min} characters required.`);
      }
      
      if (content.length > limits.max) {
        content = content.substring(0, limits.max);
        warnings.push(`Content truncated to ${limits.max} characters`);
      }

      // Check for dangerous patterns
      for (const { pattern, risk, description } of this.DANGEROUS_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          blocked.push(...matches.map(match => `${description}: ${match}`));
          riskScore += risk * matches.length;
        }
      }

      // Process markdown if enabled
      let processedContent = content;
      if (options.allowMarkdown) {
        try {
          processedContent = await marked(content, {
            breaks: true,
            gfm: true,
            sanitize: false // We'll sanitize with DOMPurify
          });
        } catch (error) {
          warnings.push('Markdown processing failed, using plain text');
          processedContent = content;
        }
      }

      // Determine allowed tags based on content type
      let allowedTags = options.allowedTags;
      if (!allowedTags) {
        switch (contentType) {
          case 'post':
            allowedTags = this.ALLOWED_TAGS.rich;
            break;
          case 'comment':
            allowedTags = this.ALLOWED_TAGS.extended;
            break;
          default:
            allowedTags = this.ALLOWED_TAGS.basic;
        }
      }

      // Sanitize with DOMPurify
      const sanitized = DOMPurify.sanitize(processedContent, {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: options.allowedAttributes || this.ALLOWED_ATTRIBUTES,
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        SANITIZE_DOM: true,
        KEEP_CONTENT: true
      });

      // Additional content analysis
      const hasLinks = /https?:\/\/[^\s]+/g.test(content);
      const hasMentions = /@[a-zA-Z0-9_.-]+/g.test(content);
      const hasHashtags = /#[a-zA-Z0-9_]+/g.test(content);

      // Check for spam patterns
      const spamChecks = this.checkSpamPatterns(content);
      warnings.push(...spamChecks.warnings);
      riskScore += spamChecks.riskScore;

      // Validate URLs if present
      if (hasLinks) {
        const urlValidation = await this.validateUrls(content);
        warnings.push(...urlValidation.warnings);
        blocked.push(...urlValidation.blocked);
        riskScore += urlValidation.riskScore;
      }

      return {
        sanitized,
        original,
        warnings,
        blocked,
        metadata: {
          length: sanitized.length,
          hasLinks,
          hasMentions,
          hasHashtags,
          riskScore
        }
      };

    } catch (error) {
      return {
        sanitized: '',
        original,
        warnings: [`Sanitization error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        blocked: ['Content rejected due to sanitization failure'],
        metadata: {
          length: 0,
          hasLinks: false,
          hasMentions: false,
          hasHashtags: false,
          riskScore: 100
        }
      };
    }
  }

  /**
   * Validate and sanitize file uploads
   */
  static async validateFile(
    file: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate file size
      if (file.length > this.MAX_FILE_SIZE) {
        errors.push(`File too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      if (file.length === 0) {
        errors.push('File is empty');
      }

      // Validate file type
      const isAllowedType = Object.values(this.ALLOWED_FILE_TYPES)
        .flat()
        .includes(mimeType);

      if (!isAllowedType) {
        errors.push(`File type ${mimeType} is not allowed`);
      }

      // Sanitize filename
      const sanitizedName = this.sanitizeFilename(originalName);
      if (sanitizedName !== originalName) {
        warnings.push('Filename was sanitized for security');
      }

      // Generate file hash
      const hash = crypto.createHash('sha256').update(file).digest('hex');

      // Check for malicious file signatures
      const maliciousCheck = this.checkMaliciousFileSignatures(file);
      if (maliciousCheck.isMalicious) {
        errors.push('File contains potentially malicious content');
      }

      // Validate image files specifically
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');

      if (isImage) {
        const imageValidation = await this.validateImageFile(file, mimeType);
        errors.push(...imageValidation.errors);
        warnings.push(...imageValidation.warnings);
      }

      return {
        valid: errors.length === 0,
        sanitizedName,
        errors,
        warnings,
        metadata: {
          size: file.length,
          type: mimeType,
          hash,
          isImage,
          isVideo
        }
      };

    } catch (error) {
      return {
        valid: false,
        sanitizedName: 'unknown',
        errors: [`File validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        metadata: {
          size: 0,
          type: 'unknown',
          hash: '',
          isImage: false,
          isVideo: false
        }
      };
    }
  }

  /**
   * Check for spam patterns in content
   */
  private static checkSpamPatterns(content: string): { warnings: string[]; riskScore: number } {
    const warnings: string[] = [];
    let riskScore = 0;

    // Check for excessive repetition
    const repetitionPattern = /(.{3,})\1{3,}/g;
    if (repetitionPattern.test(content)) {
      warnings.push('Content contains excessive repetition');
      riskScore += 3;
    }

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 20) {
      warnings.push('Content contains excessive capitalization');
      riskScore += 2;
    }

    // Check for excessive punctuation
    const punctuationRatio = (content.match(/[!?.,;:]/g) || []).length / content.length;
    if (punctuationRatio > 0.3) {
      warnings.push('Content contains excessive punctuation');
      riskScore += 2;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /click\s+here/gi,
      /free\s+money/gi,
      /guaranteed\s+profit/gi,
      /limited\s+time/gi,
      /act\s+now/gi
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        warnings.push('Content contains potentially suspicious marketing language');
        riskScore += 1;
        break;
      }
    }

    return { warnings, riskScore };
  }

  /**
   * Validate URLs in content
   */
  private static async validateUrls(content: string): Promise<{
    warnings: string[];
    blocked: string[];
    riskScore: number;
  }> {
    const warnings: string[] = [];
    const blocked: string[] = [];
    let riskScore = 0;

    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex) || [];

    for (const url of urls) {
      try {
        // Basic URL validation
        if (!validator.isURL(url, { protocols: ['http', 'https'] })) {
          blocked.push(`Invalid URL: ${url}`);
          riskScore += 2;
          continue;
        }

        // Check for suspicious domains
        const domain = new URL(url).hostname;
        
        // Check for URL shorteners (require manual review)
        const shorteners = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'short.link'];
        if (shorteners.some(shortener => domain.includes(shortener))) {
          warnings.push(`URL shortener detected: ${domain}`);
          riskScore += 1;
        }

        // Check for suspicious TLDs
        const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf'];
        if (suspiciousTlds.some(tld => domain.endsWith(tld))) {
          warnings.push(`Suspicious domain TLD: ${domain}`);
          riskScore += 2;
        }

        // Check for IP addresses instead of domains
        if (/^\d+\.\d+\.\d+\.\d+/.test(domain)) {
          warnings.push(`Direct IP address used: ${domain}`);
          riskScore += 3;
        }

      } catch (error) {
        blocked.push(`Malformed URL: ${url}`);
        riskScore += 2;
      }
    }

    return { warnings, blocked, riskScore };
  }

  /**
   * Sanitize filename for security
   */
  private static sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = path.basename(filename);
    
    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');
    
    // Limit length
    if (sanitized.length > 255) {
      const ext = path.extname(sanitized);
      const name = path.basename(sanitized, ext);
      sanitized = name.substring(0, 255 - ext.length) + ext;
    }
    
    // Ensure it's not empty
    if (!sanitized || sanitized === '.') {
      sanitized = 'file';
    }
    
    return sanitized;
  }

  /**
   * Check for malicious file signatures
   */
  private static checkMaliciousFileSignatures(file: Buffer): { isMalicious: boolean; reason?: string } {
    // Check for executable file signatures
    const executableSignatures = [
      { signature: [0x4D, 0x5A], description: 'Windows executable' }, // MZ
      { signature: [0x7F, 0x45, 0x4C, 0x46], description: 'Linux executable' }, // ELF
      { signature: [0xCA, 0xFE, 0xBA, 0xBE], description: 'Java class file' },
      { signature: [0x50, 0x4B, 0x03, 0x04], description: 'ZIP archive (potential executable)' }
    ];

    for (const { signature, description } of executableSignatures) {
      if (file.length >= signature.length) {
        const fileStart = Array.from(file.slice(0, signature.length));
        if (signature.every((byte, index) => byte === fileStart[index])) {
          return { isMalicious: true, reason: description };
        }
      }
    }

    return { isMalicious: false };
  }

  /**
   * Validate image files specifically
   */
  private static async validateImageFile(file: Buffer, mimeType: string): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check image file signatures
      const imageSignatures = {
        'image/jpeg': [[0xFF, 0xD8, 0xFF]],
        'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
        'image/webp': [[0x52, 0x49, 0x46, 0x46]]
      };

      const expectedSignatures = imageSignatures[mimeType as keyof typeof imageSignatures];
      if (expectedSignatures) {
        const fileStart = Array.from(file.slice(0, 8));
        const hasValidSignature = expectedSignatures.some(signature =>
          signature.every((byte, index) => byte === fileStart[index])
        );

        if (!hasValidSignature) {
          errors.push('File signature does not match declared MIME type');
        }
      }

      // Check for embedded scripts in SVG
      if (mimeType === 'image/svg+xml') {
        const svgContent = file.toString('utf8');
        if (/<script/i.test(svgContent) || /javascript:/i.test(svgContent)) {
          errors.push('SVG contains potentially malicious scripts');
        }
      }

      // Basic size validation for images
      if (file.length < 100) {
        errors.push('Image file appears to be too small to be valid');
      }

    } catch (error) {
      warnings.push(`Image validation warning: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { errors, warnings };
  }
}

export default ContentSanitizationService;