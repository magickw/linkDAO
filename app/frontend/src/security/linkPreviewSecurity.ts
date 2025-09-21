/**
 * Safe Link Preview Generation with Sandbox Execution
 * Secure link preview system for the enhanced social dashboard
 */

export interface LinkPreviewConfig {
  timeout: number;
  maxRedirects: number;
  allowedDomains?: string[];
  blockedDomains: string[];
  userAgent: string;
  maxContentLength: number;
  enableSandbox: boolean;
}

export interface LinkPreviewResult {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type: 'article' | 'video' | 'image' | 'website' | 'unknown';
  metadata: Record<string, any>;
  security: {
    safe: boolean;
    warnings: string[];
    blocked: string[];
    sandboxed: boolean;
  };
}

export interface SandboxedPreview {
  html: string;
  metadata: Record<string, any>;
  resources: string[];
  scripts: string[];
  warnings: string[];
}

export class LinkPreviewSecurity {
  private static readonly DEFAULT_CONFIG: LinkPreviewConfig = {
    timeout: 10000,
    maxRedirects: 3,
    blockedDomains: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '10.',
      '172.',
      '192.168.',
      'bit.ly',
      'tinyurl.com',
      'goo.gl',
      't.co'
    ],
    userAgent: 'LinkDAO-Preview/1.0 (+https://linkdao.io)',
    maxContentLength: 1024 * 1024, // 1MB
    enableSandbox: true
  };

  private static readonly MALICIOUS_PATTERNS = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /<object[^>]*>[\s\S]*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi
  ];

  private static readonly TRUSTED_DOMAINS = [
    'youtube.com',
    'youtu.be',
    'vimeo.com',
    'twitter.com',
    'github.com',
    'medium.com',
    'substack.com',
    'wikipedia.org'
  ];

  /**
   * Generate secure link preview
   */
  static async generatePreview(
    url: string,
    config: Partial<LinkPreviewConfig> = {}
  ): Promise<LinkPreviewResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const security = {
      safe: false,
      warnings: [] as string[],
      blocked: [] as string[],
      sandboxed: false
    };

    try {
      // Validate URL
      const urlValidation = this.validateUrl(url, finalConfig);
      if (!urlValidation.valid) {
        security.blocked.push(...urlValidation.errors);
        return {
          url,
          type: 'unknown',
          metadata: {},
          security
        };
      }

      // Check domain reputation
      const domainCheck = this.checkDomainReputation(url, finalConfig);
      security.warnings.push(...domainCheck.warnings);
      if (domainCheck.blocked) {
        security.blocked.push(...domainCheck.errors);
        return {
          url,
          type: 'unknown',
          metadata: {},
          security
        };
      }

      // Fetch content securely
      const content = await this.fetchContentSecurely(url, finalConfig);
      if (!content) {
        security.warnings.push('Could not fetch content');
        return {
          url,
          type: 'unknown',
          metadata: {},
          security
        };
      }

      // Process in sandbox if enabled
      let processedContent = content;
      if (finalConfig.enableSandbox) {
        const sandboxResult = await this.processinSandbox(content, url);
        processedContent = sandboxResult.html;
        security.sandboxed = true;
        security.warnings.push(...sandboxResult.warnings);
      }

      // Extract metadata
      const metadata = this.extractMetadata(processedContent, url);
      
      // Security scan
      const securityScan = this.scanContent(processedContent);
      security.warnings.push(...securityScan.warnings);
      security.blocked.push(...securityScan.blocked);
      security.safe = securityScan.safe;

      // Determine content type
      const type = this.determineContentType(metadata, url);

      return {
        url,
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        siteName: metadata.siteName,
        type,
        metadata: metadata.raw,
        security
      };

    } catch (error) {
      security.warnings.push(`Preview generation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        url,
        type: 'unknown',
        metadata: {},
        security
      };
    }
  }

  /**
   * Validate URL for security
   */
  private static validateUrl(url: string, config: LinkPreviewConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      const parsedUrl = new URL(url);

      // Protocol validation
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        errors.push('Only HTTP and HTTPS protocols are allowed');
      }

      // Domain validation
      const hostname = parsedUrl.hostname.toLowerCase();
      
      // Check blocked domains
      for (const blocked of config.blockedDomains) {
        if (hostname.includes(blocked.toLowerCase())) {
          errors.push(`Domain ${hostname} is blocked`);
          break;
        }
      }

      // Check for private/local addresses
      if (this.isPrivateAddress(hostname)) {
        errors.push('Private and local addresses are not allowed');
      }

      // Check allowed domains if specified
      if (config.allowedDomains && config.allowedDomains.length > 0) {
        const allowed = config.allowedDomains.some(domain => 
          hostname.includes(domain.toLowerCase())
        );
        if (!allowed) {
          errors.push(`Domain ${hostname} is not in allowed list`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };

    } catch (error) {
      errors.push('Invalid URL format');
      return { valid: false, errors };
    }
  }

  /**
   * Check domain reputation
   */
  private static checkDomainReputation(url: string, config: LinkPreviewConfig): {
    blocked: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const hostname = new URL(url).hostname.toLowerCase();

      // Check if it's a trusted domain
      const isTrusted = this.TRUSTED_DOMAINS.some(domain => 
        hostname.includes(domain)
      );

      if (isTrusted) {
        return { blocked: false, errors, warnings };
      }

      // Check for suspicious patterns
      if (hostname.includes('bit.ly') || hostname.includes('tinyurl')) {
        warnings.push('Shortened URL detected - exercise caution');
      }

      if (hostname.split('.').length > 4) {
        warnings.push('Suspicious subdomain structure detected');
      }

      // Check for homograph attacks
      if (/[а-я]|[α-ω]|[א-ת]/.test(hostname)) {
        warnings.push('Non-Latin characters in domain - possible homograph attack');
      }

      return { blocked: false, errors, warnings };

    } catch (error) {
      errors.push('Could not check domain reputation');
      return { blocked: true, errors, warnings };
    }
  }

  /**
   * Fetch content securely with timeout and size limits
   */
  private static async fetchContentSecurely(
    url: string,
    config: LinkPreviewConfig
  ): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': config.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        signal: controller.signal,
        redirect: 'follow',
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        throw new Error('Content is not HTML');
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > config.maxContentLength) {
        throw new Error('Content too large');
      }

      const text = await response.text();
      
      // Enforce size limit even if header was missing
      if (text.length > config.maxContentLength) {
        return text.substring(0, config.maxContentLength);
      }

      return text;

    } catch (error) {
      console.error('Fetch error:', error);
      return null;
    }
  }

  /**
   * Process content in sandbox environment
   */
  private static async processinSandbox(
    html: string,
    url: string
  ): Promise<SandboxedPreview> {
    const warnings: string[] = [];
    const resources: string[] = [];
    const scripts: string[] = [];

    try {
      // Create a sandboxed iframe for processing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.sandbox = 'allow-same-origin'; // Minimal permissions
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument;
      if (!doc) {
        throw new Error('Could not access iframe document');
      }

      // Clean HTML before processing
      let cleanHtml = html;
      
      // Remove scripts
      cleanHtml = cleanHtml.replace(this.MALICIOUS_PATTERNS[0], (match) => {
        scripts.push(match);
        warnings.push('Script tag removed');
        return '';
      });

      // Remove iframes
      cleanHtml = cleanHtml.replace(this.MALICIOUS_PATTERNS[1], (match) => {
        warnings.push('Iframe removed');
        return '';
      });

      // Remove objects and embeds
      cleanHtml = cleanHtml.replace(this.MALICIOUS_PATTERNS[2], (match) => {
        warnings.push('Object tag removed');
        return '';
      });

      cleanHtml = cleanHtml.replace(this.MALICIOUS_PATTERNS[3], (match) => {
        warnings.push('Embed tag removed');
        return '';
      });

      // Remove event handlers
      cleanHtml = cleanHtml.replace(this.MALICIOUS_PATTERNS[7], (match) => {
        warnings.push('Event handler removed');
        return '';
      });

      // Write to sandbox
      doc.write(cleanHtml);
      doc.close();

      // Extract resources
      const images = doc.querySelectorAll('img[src]');
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src) resources.push(src);
      });

      const links = doc.querySelectorAll('link[href]');
      links.forEach(link => {
        const href = link.getAttribute('href');
        if (href) resources.push(href);
      });

      // Get processed HTML
      const processedHtml = doc.documentElement.outerHTML;

      // Cleanup
      document.body.removeChild(iframe);

      return {
        html: processedHtml,
        metadata: {},
        resources,
        scripts,
        warnings
      };

    } catch (error) {
      warnings.push(`Sandbox processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        html: html,
        metadata: {},
        resources,
        scripts,
        warnings
      };
    }
  }

  /**
   * Extract metadata from HTML content
   */
  private static extractMetadata(html: string, url: string): {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    raw: Record<string, any>;
  } {
    const metadata: Record<string, any> = {};

    try {
      // Create a temporary DOM for parsing
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Extract title
      const titleElement = doc.querySelector('title');
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      const twitterTitle = doc.querySelector('meta[name="twitter:title"]');
      
      const title = ogTitle?.getAttribute('content') || 
                   twitterTitle?.getAttribute('content') || 
                   titleElement?.textContent || 
                   undefined;

      // Extract description
      const metaDescription = doc.querySelector('meta[name="description"]');
      const ogDescription = doc.querySelector('meta[property="og:description"]');
      const twitterDescription = doc.querySelector('meta[name="twitter:description"]');
      
      const description = ogDescription?.getAttribute('content') || 
                         twitterDescription?.getAttribute('content') || 
                         metaDescription?.getAttribute('content') || 
                         undefined;

      // Extract image
      const ogImage = doc.querySelector('meta[property="og:image"]');
      const twitterImage = doc.querySelector('meta[name="twitter:image"]');
      const favicon = doc.querySelector('link[rel="icon"]') || doc.querySelector('link[rel="shortcut icon"]');
      
      let image = ogImage?.getAttribute('content') || 
                  twitterImage?.getAttribute('content') || 
                  favicon?.getAttribute('href') || 
                  undefined;

      // Make image URL absolute
      if (image && !image.startsWith('http')) {
        try {
          image = new URL(image, url).href;
        } catch {
          image = undefined;
        }
      }

      // Extract site name
      const ogSiteName = doc.querySelector('meta[property="og:site_name"]');
      const siteName = ogSiteName?.getAttribute('content') || 
                      new URL(url).hostname || 
                      undefined;

      // Collect all metadata
      const metaTags = doc.querySelectorAll('meta');
      metaTags.forEach(meta => {
        const property = meta.getAttribute('property') || meta.getAttribute('name');
        const content = meta.getAttribute('content');
        if (property && content) {
          metadata[property] = content;
        }
      });

      return {
        title: title?.substring(0, 200),
        description: description?.substring(0, 500),
        image,
        siteName,
        raw: metadata
      };

    } catch (error) {
      console.error('Metadata extraction error:', error);
      return { raw: {} };
    }
  }

  /**
   * Scan content for security issues
   */
  private static scanContent(html: string): {
    safe: boolean;
    warnings: string[];
    blocked: string[];
  } {
    const warnings: string[] = [];
    const blocked: string[] = [];

    // Check for malicious patterns
    this.MALICIOUS_PATTERNS.forEach((pattern, index) => {
      const matches = html.match(pattern);
      if (matches) {
        const patternNames = [
          'script tags',
          'iframe tags',
          'object tags',
          'embed tags',
          'javascript protocols',
          'vbscript protocols',
          'data URLs',
          'event handlers'
        ];
        blocked.push(`Found ${patternNames[index]}: ${matches.length} instances`);
      }
    });

    // Check for suspicious content
    if (html.includes('eval(') || html.includes('Function(')) {
      warnings.push('Dynamic code execution detected');
    }

    if (html.includes('document.write') || html.includes('innerHTML')) {
      warnings.push('DOM manipulation detected');
    }

    if (html.includes('XMLHttpRequest') || html.includes('fetch(')) {
      warnings.push('Network requests detected');
    }

    const safe = blocked.length === 0;

    return { safe, warnings, blocked };
  }

  /**
   * Determine content type from metadata and URL
   */
  private static determineContentType(
    metadata: any,
    url: string
  ): 'article' | 'video' | 'image' | 'website' | 'unknown' {
    // Check Open Graph type
    if (metadata.raw['og:type']) {
      const ogType = metadata.raw['og:type'].toLowerCase();
      if (ogType.includes('article')) return 'article';
      if (ogType.includes('video')) return 'video';
      if (ogType.includes('image')) return 'image';
    }

    // Check Twitter card type
    if (metadata.raw['twitter:card']) {
      const twitterCard = metadata.raw['twitter:card'].toLowerCase();
      if (twitterCard.includes('summary_large_image')) return 'article';
      if (twitterCard.includes('player')) return 'video';
    }

    // Check URL patterns
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return 'image';
    if (/\.(mp4|webm|avi|mov)$/i.test(url)) return 'video';
    if (url.includes('youtube.com') || url.includes('vimeo.com')) return 'video';
    if (url.includes('medium.com') || url.includes('substack.com')) return 'article';

    return metadata.title ? 'website' : 'unknown';
  }

  /**
   * Check if hostname is a private address
   */
  private static isPrivateAddress(hostname: string): boolean {
    // IPv4 private ranges
    const privateRanges = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\.0\.0\.0$/,
      /^localhost$/i
    ];

    return privateRanges.some(range => range.test(hostname));
  }
}

export default LinkPreviewSecurity;