/**
 * Comprehensive Input Sanitization for Rich Content and XSS Prevention
 * Handles all user input sanitization across the enhanced social dashboard
 */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

export interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowMarkdown?: boolean;
  maxLength?: number;
  stripScripts?: boolean;
}

export interface SanitizedContent {
  sanitized: string;
  original: string;
  warnings: string[];
  blocked: string[];
}

export class InputSanitizer {
  private static readonly DEFAULT_ALLOWED_TAGS = [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img'
  ];

  private static readonly DEFAULT_ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'blockquote': ['cite'],
    'code': ['class'],
    'pre': ['class']
  };

  private static readonly DANGEROUS_PATTERNS = [
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi,
    /<script/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<form/gi,
    /<input/gi,
    /<textarea/gi,
    /<select/gi,
    /<button/gi
  ];

  /**
   * Sanitize rich text content with comprehensive XSS prevention
   */
  static sanitizeRichContent(
    content: string,
    config: SanitizationConfig = {}
  ): SanitizedContent {
    const warnings: string[] = [];
    const blocked: string[] = [];
    const original = content;

    try {
      // Check for dangerous patterns
      this.DANGEROUS_PATTERNS.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          blocked.push(...matches);
          warnings.push(`Blocked potentially dangerous content: ${matches.join(', ')}`);
        }
      });

      // Process markdown if enabled
      let processedContent = content;
      if (config.allowMarkdown) {
        try {
          processedContent = marked(content, {
            breaks: true,
            gfm: true
          });
        } catch (error) {
          warnings.push('Markdown processing failed, using plain text');
          processedContent = content;
        }
      }

      // Apply length limits
      if (config.maxLength && processedContent.length > config.maxLength) {
        processedContent = processedContent.substring(0, config.maxLength);
        warnings.push(`Content truncated to ${config.maxLength} characters`);
      }

      // Sanitize with DOMPurify using basic configuration
      const sanitized = DOMPurify.sanitize(processedContent, {
        ALLOWED_TAGS: config.allowedTags || this.DEFAULT_ALLOWED_TAGS,
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false
      });

      // Additional custom sanitization
      const finalSanitized = this.customSanitization(sanitized);

      return {
        sanitized: finalSanitized,
        original,
        warnings,
        blocked
      };

    } catch (error) {
      warnings.push(`Sanitization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        sanitized: '',
        original,
        warnings,
        blocked
      };
    }
  }

  /**
   * Sanitize hashtags and mentions
   */
  static sanitizeHashtagsAndMentions(input: string): SanitizedContent {
    const warnings: string[] = [];
    const blocked: string[] = [];
    const original = input;

    try {
      // Remove any HTML tags
      let sanitized = input.replace(/<[^>]*>/g, '');
      
      // Validate hashtag format
      sanitized = sanitized.replace(/#([^\s#@]+)/g, (match, tag) => {
        if (tag.length > 50) {
          warnings.push(`Hashtag too long: ${match}`);
          return `#${tag.substring(0, 50)}`;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(tag)) {
          blocked.push(match);
          warnings.push(`Invalid hashtag format: ${match}`);
          return '';
        }
        return match;
      });

      // Validate mention format
      sanitized = sanitized.replace(/@([^\s#@]+)/g, (match, username) => {
        if (username.length > 30) {
          warnings.push(`Username too long: ${match}`);
          return `@${username.substring(0, 30)}`;
        }
        if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
          blocked.push(match);
          warnings.push(`Invalid username format: ${match}`);
          return '';
        }
        return match;
      });

      return {
        sanitized,
        original,
        warnings,
        blocked
      };

    } catch (error) {
      return {
        sanitized: '',
        original,
        warnings: [`Sanitization error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        blocked
      };
    }
  }

  /**
   * Sanitize URLs for link previews
   */
  static sanitizeUrl(url: string): SanitizedContent {
    const warnings: string[] = [];
    const blocked: string[] = [];
    const original = url;

    try {
      // Basic URL validation
      const urlPattern = /^https?:\/\/([\w\-]+(\.[\w\-]+)+)([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$/;
      
      if (!urlPattern.test(url)) {
        blocked.push(url);
        warnings.push('Invalid URL format');
        return { sanitized: '', original, warnings, blocked };
      }

      // Check for dangerous protocols
      if (!/^https?:\/\//.test(url)) {
        blocked.push(url);
        warnings.push('Only HTTP and HTTPS protocols allowed');
        return { sanitized: '', original, warnings, blocked };
      }

      // Block known malicious domains (basic list)
      const maliciousDomains = [
        'bit.ly', 'tinyurl.com', 'goo.gl', 't.co' // Add more as needed
      ];

      const domain = new URL(url).hostname;
      if (maliciousDomains.some(malicious => domain.includes(malicious))) {
        warnings.push('Shortened URLs require manual review');
      }

      return {
        sanitized: url,
        original,
        warnings,
        blocked
      };

    } catch (error) {
      return {
        sanitized: '',
        original,
        warnings: [`URL validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        blocked
      };
    }
  }

  /**
   * Custom sanitization for specific patterns
   */
  private static customSanitization(content: string): string {
    // Remove any remaining script tags
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove event handlers
    content = content.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: protocols
    content = content.replace(/javascript:/gi, '');
    
    // Remove data: URLs except for images
    content = content.replace(/data:(?!image\/)/gi, '');
    
    return content;
  }

  /**
   * Validate content length and structure
   */
  static validateContentStructure(content: string, type: 'post' | 'comment' | 'bio'): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const limits = {
      post: { min: 1, max: 10000 },
      comment: { min: 1, max: 2000 },
      bio: { min: 0, max: 500 }
    };

    const limit = limits[type];

    if (content.length < limit.min) {
      errors.push(`Content too short. Minimum ${limit.min} characters required.`);
    }

    if (content.length > limit.max) {
      errors.push(`Content too long. Maximum ${limit.max} characters allowed.`);
    }

    // Check for excessive repetition
    const repetitionPattern = /(.{3,})\1{3,}/g;
    if (repetitionPattern.test(content)) {
      warnings.push('Content contains excessive repetition');
    }

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 20) {
      warnings.push('Content contains excessive capitalization');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default InputSanitizer;