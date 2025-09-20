import { RichPostInput, ContentType, ValidationError, ValidationWarning } from '../types/enhancedPost';

export interface ContentValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedContent?: string;
  blockedContent?: string[];
}

export interface ValidationConfig {
  maxContentLength: number;
  maxTitleLength: number;
  allowedHtmlTags: string[];
  blockedWords: string[];
  requireModeration: string[];
  linkValidation: boolean;
  imageValidation: boolean;
  enableProfanityFilter: boolean;
  enableSpamDetection: boolean;
}

const DEFAULT_CONFIG: ValidationConfig = {
  maxContentLength: 10000,
  maxTitleLength: 200,
  allowedHtmlTags: ['b', 'i', 'u', 'strong', 'em', 'code', 'pre', 'blockquote', 'a', 'img', 'br', 'p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
  blockedWords: ['spam', 'scam', 'phishing'], // This would be more comprehensive in production
  requireModeration: ['investment', 'guaranteed', 'profit', 'money back'],
  linkValidation: true,
  imageValidation: true,
  enableProfanityFilter: true,
  enableSpamDetection: true
};

// Common XSS patterns to detect and remove
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<form\b[^>]*>/gi,
  /<input\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /expression\s*\(/gi
];

// Suspicious URL patterns
const SUSPICIOUS_URL_PATTERNS = [
  /bit\.ly|tinyurl|t\.co|goo\.gl|short\.link/i, // URL shorteners
  /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i, // IP addresses
  /localhost|127\.0\.0\.1/i, // Local addresses
  /\.tk$|\.ml$|\.ga$|\.cf$/i, // Suspicious TLDs
];

// Common spam patterns
const SPAM_PATTERNS = [
  /click here|act now|limited time|urgent|hurry/gi,
  /100% free|no cost|risk free|guaranteed/gi,
  /make money|earn \$|get rich|financial freedom/gi,
  /crypto giveaway|free tokens|airdrop/gi,
  /investment opportunity|double your money/gi
];

class ContentValidationService {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate and sanitize rich post content
   */
  validatePost(post: RichPostInput): ContentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const blockedContent: string[] = [];

    // Validate basic content
    const contentValidation = this.validateContent(post.content);
    errors.push(...contentValidation.errors);
    warnings.push(...contentValidation.warnings);
    blockedContent.push(...(contentValidation.blockedContent || []));

    // Validate title if present
    if (post.title) {
      const titleValidation = this.validateTitle(post.title);
      errors.push(...titleValidation.errors);
      warnings.push(...titleValidation.warnings);
    }

    // Content type specific validation
    switch (post.contentType) {
      case ContentType.POLL:
        if (post.poll) {
          const pollValidation = this.validatePoll(post.poll);
          errors.push(...pollValidation.errors);
          warnings.push(...pollValidation.warnings);
        }
        break;
      
      case ContentType.PROPOSAL:
        if (post.proposal) {
          const proposalValidation = this.validateProposal(post.proposal);
          errors.push(...proposalValidation.errors);
          warnings.push(...proposalValidation.warnings);
        }
        break;
      
      case ContentType.MEDIA:
        if (post.media && post.media.length > 0) {
          const mediaValidation = this.validateMedia(post.media);
          errors.push(...mediaValidation.errors);
          warnings.push(...mediaValidation.warnings);
        }
        break;
      
      case ContentType.LINK:
        if (post.links && post.links.length > 0) {
          const linkValidation = this.validateLinks(post.links);
          errors.push(...linkValidation.errors);
          warnings.push(...linkValidation.warnings);
        }
        break;
    }

    // Validate hashtags
    if (post.hashtags && post.hashtags.length > 0) {
      const hashtagValidation = this.validateHashtags(post.hashtags);
      errors.push(...hashtagValidation.errors);
      warnings.push(...hashtagValidation.warnings);
    }

    // Sanitize content
    const sanitizedContent = this.sanitizeContent(post.content);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedContent,
      blockedContent: blockedContent.length > 0 ? blockedContent : undefined
    };
  }

  /**
   * Validate content text
   */
  private validateContent(content: string): ContentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const blockedContent: string[] = [];

    // Check length
    if (!content.trim()) {
      errors.push({
        field: 'content',
        message: 'Content is required',
        code: 'CONTENT_REQUIRED'
      });
    } else if (content.length > this.config.maxContentLength) {
      errors.push({
        field: 'content',
        message: `Content must be less than ${this.config.maxContentLength} characters`,
        code: 'CONTENT_TOO_LONG'
      });
    }

    // Check for XSS patterns
    const xssDetected = XSS_PATTERNS.some(pattern => pattern.test(content));
    if (xssDetected) {
      errors.push({
        field: 'content',
        message: 'Content contains potentially malicious code',
        code: 'XSS_DETECTED'
      });
    }

    // Check for blocked words
    const blockedWordsFound = this.config.blockedWords.filter(word => 
      content.toLowerCase().includes(word.toLowerCase())
    );
    if (blockedWordsFound.length > 0) {
      errors.push({
        field: 'content',
        message: 'Content contains blocked words',
        code: 'BLOCKED_WORDS'
      });
      blockedContent.push(...blockedWordsFound);
    }

    // Check for words requiring moderation
    const moderationWords = this.config.requireModeration.filter(word => 
      content.toLowerCase().includes(word.toLowerCase())
    );
    if (moderationWords.length > 0) {
      warnings.push({
        field: 'content',
        message: 'Content may require moderation review',
        code: 'MODERATION_REQUIRED'
      });
    }

    // Spam detection
    if (this.config.enableSpamDetection) {
      const spamScore = this.calculateSpamScore(content);
      if (spamScore > 0.7) {
        errors.push({
          field: 'content',
          message: 'Content appears to be spam',
          code: 'SPAM_DETECTED'
        });
      } else if (spamScore > 0.4) {
        warnings.push({
          field: 'content',
          message: 'Content may be flagged as spam',
          code: 'POTENTIAL_SPAM'
        });
      }
    }

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 20) {
      warnings.push({
        field: 'content',
        message: 'Excessive capitalization may reduce visibility',
        code: 'EXCESSIVE_CAPS'
      });
    }

    // Check for excessive repetition
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxRepeats = Math.max(...Object.values(wordCounts));
    if (maxRepeats > 5) {
      warnings.push({
        field: 'content',
        message: 'Repetitive content may reduce engagement',
        code: 'REPETITIVE_CONTENT'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      blockedContent
    };
  }

  /**
   * Validate title
   */
  private validateTitle(title: string): ContentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (title.length > this.config.maxTitleLength) {
      errors.push({
        field: 'title',
        message: `Title must be less than ${this.config.maxTitleLength} characters`,
        code: 'TITLE_TOO_LONG'
      });
    }

    // Check for XSS in title
    const xssDetected = XSS_PATTERNS.some(pattern => pattern.test(title));
    if (xssDetected) {
      errors.push({
        field: 'title',
        message: 'Title contains potentially malicious code',
        code: 'XSS_DETECTED'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate poll data
   */
  private validatePoll(poll: any): ContentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!poll.question || !poll.question.trim()) {
      errors.push({
        field: 'poll.question',
        message: 'Poll question is required',
        code: 'POLL_QUESTION_REQUIRED'
      });
    }

    if (!poll.options || poll.options.length < 2) {
      errors.push({
        field: 'poll.options',
        message: 'Poll must have at least 2 options',
        code: 'POLL_OPTIONS_INSUFFICIENT'
      });
    }

    if (poll.options && poll.options.length > 10) {
      warnings.push({
        field: 'poll.options',
        message: 'Polls with many options may have lower engagement',
        code: 'POLL_TOO_MANY_OPTIONS'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate proposal data
   */
  private validateProposal(proposal: any): ContentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!proposal.title || proposal.title.length < 10) {
      errors.push({
        field: 'proposal.title',
        message: 'Proposal title must be at least 10 characters',
        code: 'PROPOSAL_TITLE_TOO_SHORT'
      });
    }

    if (!proposal.description || proposal.description.length < 100) {
      errors.push({
        field: 'proposal.description',
        message: 'Proposal description must be at least 100 characters',
        code: 'PROPOSAL_DESCRIPTION_TOO_SHORT'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate media files
   */
  private validateMedia(media: any[]): ContentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (media.length > 10) {
      errors.push({
        field: 'media',
        message: 'Maximum 10 media files allowed',
        code: 'TOO_MANY_MEDIA_FILES'
      });
    }

    // Check for completed uploads
    const incompleteUploads = media.filter(m => m.uploadStatus !== 'completed');
    if (incompleteUploads.length > 0) {
      errors.push({
        field: 'media',
        message: 'All media files must be uploaded successfully',
        code: 'INCOMPLETE_UPLOADS'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate links
   */
  private validateLinks(links: any[]): ContentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const link of links) {
      if (!this.isValidUrl(link.url)) {
        errors.push({
          field: 'links',
          message: 'Invalid URL format',
          code: 'INVALID_URL'
        });
      }

      // Check for suspicious URLs
      const isSuspicious = SUSPICIOUS_URL_PATTERNS.some(pattern => 
        pattern.test(link.url)
      );
      if (isSuspicious) {
        warnings.push({
          field: 'links',
          message: 'Link may require additional verification',
          code: 'SUSPICIOUS_URL'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate hashtags
   */
  private validateHashtags(hashtags: string[]): ContentValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (hashtags.length > 20) {
      warnings.push({
        field: 'hashtags',
        message: 'Too many hashtags may reduce visibility',
        code: 'TOO_MANY_HASHTAGS'
      });
    }

    // Check for invalid hashtag format
    const invalidHashtags = hashtags.filter(tag => 
      !/^[a-zA-Z0-9_]+$/.test(tag) || tag.length > 50
    );
    if (invalidHashtags.length > 0) {
      errors.push({
        field: 'hashtags',
        message: 'Invalid hashtag format',
        code: 'INVALID_HASHTAG_FORMAT'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Sanitize content by removing dangerous HTML and scripts
   */
  private sanitizeContent(content: string): string {
    let sanitized = content;

    // Remove XSS patterns
    XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove dangerous attributes
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:text\/html/gi, '');

    // Only allow specific HTML tags
    const allowedTagsRegex = new RegExp(
      `<(?!\/?(?:${this.config.allowedHtmlTags.join('|')})\s*\/?>)[^>]+>`,
      'gi'
    );
    sanitized = sanitized.replace(allowedTagsRegex, '');

    return sanitized.trim();
  }

  /**
   * Calculate spam score based on content patterns
   */
  private calculateSpamScore(content: string): number {
    let score = 0;

    // Check for spam patterns
    SPAM_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        score += matches.length * 0.2;
      }
    });

    // Check for excessive links
    const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 3) {
      score += (linkCount - 3) * 0.1;
    }

    // Check for excessive emojis
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    if (emojiCount > 10) {
      score += (emojiCount - 10) * 0.05;
    }

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.3) {
      score += (capsRatio - 0.3) * 0.5;
    }

    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update validation configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const contentValidationService = new ContentValidationService();