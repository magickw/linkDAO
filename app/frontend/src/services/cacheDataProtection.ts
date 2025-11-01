/**
 * Cache Data Protection and Privacy Controls
 * Implements PII detection, content filtering, and privacy header compliance
 */

interface PIIPattern {
  name: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  redactionStrategy: 'mask' | 'remove' | 'hash' | 'encrypt';
}

interface PrivacyHeaders {
  cacheControl: string;
  pragma?: string;
  expires?: string;
  vary?: string;
}

interface ContentFilterResult {
  isAllowed: boolean;
  hasPrivacyIssues: boolean;
  detectedPII: PIIDetection[];
  redactedContent?: string;
  warnings: string[];
}

interface PIIDetection {
  type: string;
  pattern: string;
  position: { start: number; end: number };
  severity: string;
  redacted: boolean;
}

interface CachePrivacyPolicy {
  respectNoStore: boolean;
  respectPrivate: boolean;
  respectNoCache: boolean;
  maxSensitiveAge: number;
  piiDetectionEnabled: boolean;
  autoRedaction: boolean;
}

export class CacheDataProtection {
  private readonly PRIVACY_POLICY_STORE = 'cache-privacy-policy-v1';
  private readonly SENSITIVE_CACHE_PREFIX = 'sensitive-';

  private readonly DEFAULT_POLICY: CachePrivacyPolicy = {
    respectNoStore: true,
    respectPrivate: true,
    respectNoCache: true,
    maxSensitiveAge: 5 * 60 * 1000, // 5 minutes for sensitive data
    piiDetectionEnabled: true,
    autoRedaction: true
  };

  private policy: CachePrivacyPolicy = { ...this.DEFAULT_POLICY };

  private readonly PII_PATTERNS: PIIPattern[] = [
    {
      name: 'email',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      severity: 'high',
      redactionStrategy: 'mask'
    },
    {
      name: 'phone',
      pattern: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
      severity: 'high',
      redactionStrategy: 'mask'
    },
    {
      name: 'ssn',
      pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
      severity: 'critical',
      redactionStrategy: 'remove'
    },
    {
      name: 'credit_card',
      pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      severity: 'critical',
      redactionStrategy: 'remove'
    },
    {
      name: 'wallet_address',
      pattern: /\b0x[a-fA-F0-9]{40}\b/g,
      severity: 'medium',
      redactionStrategy: 'hash'
    },
    {
      name: 'private_key',
      pattern: /\b[a-fA-F0-9]{64}\b/g,
      severity: 'critical',
      redactionStrategy: 'remove'
    },
    {
      name: 'ip_address',
      pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      severity: 'medium',
      redactionStrategy: 'mask'
    },
    {
      name: 'api_key',
      pattern: /\b[A-Za-z0-9]{32,}\b/g,
      severity: 'critical',
      redactionStrategy: 'remove'
    }
  ];

  /**
   * Initialize data protection system
   */
  async initialize(): Promise<void> {
    try {
      await this.loadPrivacyPolicy();
      console.log('Cache data protection initialized');
    } catch (error) {
      console.error('Failed to initialize cache data protection:', error);
    }
  }

  /**
   * Validate if response should be cached based on privacy headers
   */
  validateCacheHeaders(response: Response): { shouldCache: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let shouldCache = true;

    try {
      const cacheControl = response.headers.get('cache-control')?.toLowerCase() || '';
      const pragma = response.headers.get('pragma')?.toLowerCase() || '';

      // Check no-store directive
      if (this.policy.respectNoStore && (cacheControl.includes('no-store') || pragma.includes('no-cache'))) {
        shouldCache = false;
        reasons.push('Response contains no-store or no-cache directive');
      }

      // Check private directive
      if (this.policy.respectPrivate && cacheControl.includes('private')) {
        shouldCache = false;
        reasons.push('Response marked as private');
      }

      // Check no-cache directive
      if (this.policy.respectNoCache && cacheControl.includes('no-cache')) {
        shouldCache = false;
        reasons.push('Response contains no-cache directive');
      }

      // Check expires header
      const expires = response.headers.get('expires');
      if (expires) {
        const expiresDate = new Date(expires);
        if (expiresDate < new Date()) {
          shouldCache = false;
          reasons.push('Response already expired');
        }
      }

      return { shouldCache, reasons };
    } catch (error) {
      console.error('Failed to validate cache headers:', error);
      return { shouldCache: false, reasons: ['Header validation failed'] };
    }
  }

  /**
   * Detect and filter PII from content
   */
  async filterContent(content: string, contentType: string = 'text/plain'): Promise<ContentFilterResult> {
    const result: ContentFilterResult = {
      isAllowed: true,
      hasPrivacyIssues: false,
      detectedPII: [],
      warnings: []
    };

    try {
      if (!this.policy.piiDetectionEnabled) {
        return result;
      }

      // Detect PII patterns
      for (const piiPattern of this.PII_PATTERNS) {
        const matches = Array.from(content.matchAll(piiPattern.pattern));
        
        for (const match of matches) {
          const detection: PIIDetection = {
            type: piiPattern.name,
            pattern: match[0],
            position: { start: match.index || 0, end: (match.index || 0) + match[0].length },
            severity: piiPattern.severity,
            redacted: false
          };

          result.detectedPII.push(detection);
          result.hasPrivacyIssues = true;

          // Block critical PII from caching
          if (piiPattern.severity === 'critical') {
            result.isAllowed = false;
            result.warnings.push(`Critical PII detected: ${piiPattern.name}`);
          }
        }
      }

      // Apply redaction if enabled and content is allowed
      if (result.isAllowed && result.hasPrivacyIssues && this.policy.autoRedaction) {
        result.redactedContent = await this.redactContent(content, result.detectedPII);
      }

      return result;
    } catch (error) {
      console.error('Failed to filter content:', error);
      result.isAllowed = false;
      result.warnings.push('Content filtering failed');
      return result;
    }
  }

  /**
   * Check if URL contains sensitive data patterns
   */
  isSensitiveUrl(url: string): boolean {
    const sensitivePatterns = [
      '/api/user/private',
      '/api/wallet/private',
      '/api/messages/private',
      '/api/admin/sensitive',
      '/api/auth/tokens',
      '/api/kyc/',
      '/api/payment/details'
    ];

    return sensitivePatterns.some(pattern => url.includes(pattern));
  }

  /**
   * Generate privacy-compliant cache key
   */
  generatePrivacyCacheKey(url: string, userScope?: string): string {
    const isSensitive = this.isSensitiveUrl(url);
    const baseKey = this.hashSensitiveUrl(url);
    
    if (isSensitive) {
      const sensitiveKey = `${this.SENSITIVE_CACHE_PREFIX}${baseKey}`;
      return userScope ? `${userScope}:${sensitiveKey}` : sensitiveKey;
    }
    
    return userScope ? `${userScope}:${baseKey}` : baseKey;
  }

  /**
   * Clean up privacy-sensitive cache entries
   */
  async cleanupSensitiveCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      const now = Date.now();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const url = request.url;
          
          // Check if it's a sensitive cache entry
          if (url.includes(this.SENSITIVE_CACHE_PREFIX) || this.isSensitiveUrl(url)) {
            const response = await cache.match(request);
            if (response) {
              const cachedTime = this.extractCacheTime(response);
              
              // Remove if older than max sensitive age
              if (cachedTime && (now - cachedTime) > this.policy.maxSensitiveAge) {
                await cache.delete(request);
              }
            }
          }
        }
      }
      
      console.log('Sensitive cache cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup sensitive caches:', error);
    }
  }

  /**
   * Validate response content before caching
   */
  async validateResponseContent(response: Response): Promise<{ isValid: boolean; filteredResponse?: Response; warnings: string[] }> {
    const warnings: string[] = [];
    
    try {
      // Check headers first
      const headerValidation = this.validateCacheHeaders(response);
      if (!headerValidation.shouldCache) {
        return { isValid: false, warnings: headerValidation.reasons };
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!this.isCacheableContentType(contentType)) {
        return { isValid: false, warnings: ['Content type not cacheable'] };
      }

      // For text content, check for PII
      if (contentType.includes('text/') || contentType.includes('application/json')) {
        const text = await response.clone().text();
        const filterResult = await this.filterContent(text, contentType);
        
        if (!filterResult.isAllowed) {
          return { isValid: false, warnings: filterResult.warnings };
        }

        // Return redacted content if PII was detected
        if (filterResult.hasPrivacyIssues && filterResult.redactedContent) {
          const filteredResponse = new Response(filterResult.redactedContent, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
          
          warnings.push(...filterResult.warnings);
          return { isValid: true, filteredResponse, warnings };
        }
      }

      return { isValid: true, warnings };
    } catch (error) {
      console.error('Failed to validate response content:', error);
      return { isValid: false, warnings: ['Content validation failed'] };
    }
  }

  /**
   * Update privacy policy
   */
  async updatePrivacyPolicy(newPolicy: Partial<CachePrivacyPolicy>): Promise<void> {
    try {
      this.policy = { ...this.policy, ...newPolicy };
      await this.savePrivacyPolicy();
      console.log('Privacy policy updated');
    } catch (error) {
      console.error('Failed to update privacy policy:', error);
    }
  }

  /**
   * Get current privacy policy
   */
  getPrivacyPolicy(): CachePrivacyPolicy {
    return { ...this.policy };
  }

  // Private methods

  private async redactContent(content: string, detections: PIIDetection[]): Promise<string> {
    let redactedContent = content;
    
    // Sort detections by position (descending) to avoid index shifting
    const sortedDetections = detections.sort((a, b) => b.position.start - a.position.start);
    
    for (const detection of sortedDetections) {
      const pattern = this.PII_PATTERNS.find(p => p.name === detection.type);
      if (!pattern) continue;
      
      const { start, end } = detection.position;
      const originalText = redactedContent.substring(start, end);
      let replacement = '';
      
      switch (pattern.redactionStrategy) {
        case 'mask':
          replacement = this.maskText(originalText);
          break;
        case 'remove':
          replacement = '[REDACTED]';
          break;
        case 'hash':
          replacement = `[HASH:${this.hashText(originalText)}]`;
          break;
        case 'encrypt':
          replacement = `[ENCRYPTED:${await this.encryptText(originalText)}]`;
          break;
      }
      
      redactedContent = redactedContent.substring(0, start) + replacement + redactedContent.substring(end);
      detection.redacted = true;
    }
    
    return redactedContent;
  }

  private maskText(text: string): string {
    if (text.length <= 4) {
      return '*'.repeat(text.length);
    }
    
    const visibleChars = 2;
    const start = text.substring(0, visibleChars);
    const end = text.substring(text.length - visibleChars);
    const middle = '*'.repeat(text.length - (visibleChars * 2));
    
    return start + middle + end;
  }

  private hashText(text: string): string {
    // Simple hash for demonstration - in production use crypto.subtle
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async encryptText(text: string): Promise<string> {
    // Placeholder for encryption - implement with crypto.subtle in production
    return btoa(text).substring(0, 16) + '...';
  }

  private hashSensitiveUrl(url: string): string {
    // Remove sensitive parameters and hash the URL
    try {
      const urlObj = new URL(url, window.location.origin);
      
      // Remove sensitive query parameters
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth'];
      sensitiveParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      const cleanUrl = urlObj.pathname + urlObj.search;
      return this.hashText(cleanUrl);
    } catch {
      return this.hashText(url);
    }
  }

  private extractCacheTime(response: Response): number | null {
    try {
      const cacheTime = response.headers.get('x-cache-time');
      return cacheTime ? parseInt(cacheTime, 10) : null;
    } catch {
      return null;
    }
  }

  private isCacheableContentType(contentType: string): boolean {
    const cacheableTypes = [
      'application/json',
      'text/html',
      'text/plain',
      'text/css',
      'text/javascript',
      'application/javascript',
      'image/',
      'font/'
    ];
    
    return cacheableTypes.some(type => contentType.includes(type));
  }

  private async loadPrivacyPolicy(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.PRIVACY_POLICY_STORE);
      if (stored) {
        const parsedPolicy = JSON.parse(stored);
        this.policy = { ...this.DEFAULT_POLICY, ...parsedPolicy };
      }
    } catch (error) {
      console.warn('Failed to load privacy policy, using defaults:', error);
      this.policy = { ...this.DEFAULT_POLICY };
    }
  }

  private async savePrivacyPolicy(): Promise<void> {
    try {
      localStorage.setItem(this.PRIVACY_POLICY_STORE, JSON.stringify(this.policy));
    } catch (error) {
      console.error('Failed to save privacy policy:', error);
    }
  }
}

// Export singleton instance
export const cacheDataProtection = new CacheDataProtection();