/**
 * CORS Protection Service
 * Manages Cross-Origin Resource Sharing security
 */

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export class CORSProtectionService {
  private static instance: CORSProtectionService;
  private config: CORSConfig;

  private constructor() {
    this.config = {
      allowedOrigins: this.getDefaultAllowedOrigins(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-Token',
        'X-Session-ID',
        'X-Device-ID',
        'Accept',
        'Origin'
      ],
      exposedHeaders: ['X-CSRF-Token', 'X-Session-ID', 'X-Rate-Limit-Remaining'],
      credentials: true,
      maxAge: 86400 // 24 hours
    };
  }

  static getInstance(): CORSProtectionService {
    if (!CORSProtectionService.instance) {
      CORSProtectionService.instance = new CORSProtectionService();
    }
    return CORSProtectionService.instance;
  }

  /**
   * Get default allowed origins based on environment
   */
  private getDefaultAllowedOrigins(): string[] {
    const origins: string[] = [];

    // Add current origin
    if (typeof window !== 'undefined') {
      origins.push(window.location.origin);
    }

    // Add development origins
    if (process.env.NODE_ENV === 'development') {
      origins.push('http://localhost:3000');
      origins.push('http://localhost:3001');
      origins.push('http://127.0.0.1:3000');
      origins.push('http://127.0.0.1:3001');
    }

    // Add production origins from environment
    if (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS) {
      const envOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS.split(',');
      origins.push(...envOrigins);
    }

    return origins;
  }

  /**
   * Check if origin is allowed
   */
  isOriginAllowed(origin: string): boolean {
    if (!origin) {
      return false;
    }

    // Check exact match
    if (this.config.allowedOrigins.includes(origin)) {
      return true;
    }

    // Check wildcard
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }

    // Check subdomain patterns
    for (const allowedOrigin of this.config.allowedOrigins) {
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.substring(2);
        if (origin.endsWith(domain)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if method is allowed
   */
  isMethodAllowed(method: string): boolean {
    return this.config.allowedMethods.includes(method.toUpperCase());
  }

  /**
   * Check if header is allowed
   */
  isHeaderAllowed(header: string): boolean {
    return this.config.allowedHeaders.some(
      allowed => allowed.toLowerCase() === header.toLowerCase()
    );
  }

  /**
   * Validate CORS request
   */
  validateRequest(origin: string, method: string, headers?: string[]): {
    allowed: boolean;
    error?: string;
  } {
    // Validate origin
    if (!this.isOriginAllowed(origin)) {
      return {
        allowed: false,
        error: `Origin ${origin} is not allowed`
      };
    }

    // Validate method
    if (!this.isMethodAllowed(method)) {
      return {
        allowed: false,
        error: `Method ${method} is not allowed`
      };
    }

    // Validate headers if provided
    if (headers) {
      for (const header of headers) {
        if (!this.isHeaderAllowed(header)) {
          return {
            allowed: false,
            error: `Header ${header} is not allowed`
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Add CORS headers to fetch options
   */
  addCORSHeaders(options: RequestInit = {}): RequestInit {
    const headers = new Headers(options.headers);

    // Add origin header
    if (typeof window !== 'undefined') {
      headers.set('Origin', window.location.origin);
    }

    return {
      ...options,
      headers,
      credentials: this.config.credentials ? 'include' : 'same-origin',
    };
  }

  /**
   * Create CORS middleware for fetch
   */
  createFetchMiddleware(originalFetch: typeof fetch): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      // Validate request
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const method = init?.method || 'GET';

      const validation = this.validateRequest(
        origin,
        method,
        init?.headers ? Array.from(new Headers(init.headers).keys()) : undefined
      );

      if (!validation.allowed) {
        console.error('CORS validation failed:', validation.error);
        throw new Error(`CORS error: ${validation.error}`);
      }

      // Add CORS headers
      const options = this.addCORSHeaders(init);

      // Make request
      const response = await originalFetch(input, options);

      // Validate response CORS headers
      const accessControlAllowOrigin = response.headers.get('Access-Control-Allow-Origin');
      if (accessControlAllowOrigin && !this.isOriginAllowed(accessControlAllowOrigin) && accessControlAllowOrigin !== '*') {
        console.warn('Response has invalid Access-Control-Allow-Origin header');
      }

      return response;
    };
  }

  /**
   * Patch global fetch with CORS protection
   */
  patchGlobalFetch(): void {
    if (typeof window !== 'undefined' && !window.fetch.__corsPatched) {
      const originalFetch = window.fetch;
      window.fetch = this.createFetchMiddleware(originalFetch);
      window.fetch.__corsPatched = true;
      console.log('Global fetch patched with CORS protection');
    }
  }

  /**
   * Get CORS headers for preflight request
   */
  getPreflightHeaders(origin: string, requestMethod: string, requestHeaders?: string[]): Headers {
    const headers = new Headers();

    if (this.isOriginAllowed(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', this.config.credentials.toString());
      headers.set('Access-Control-Allow-Methods', this.config.allowedMethods.join(', '));
      headers.set('Access-Control-Allow-Headers', this.config.allowedHeaders.join(', '));
      headers.set('Access-Control-Expose-Headers', this.config.exposedHeaders.join(', '));
      headers.set('Access-Control-Max-Age', this.config.maxAge.toString());
    }

    return headers;
  }

  /**
   * Add custom allowed origin
   */
  addAllowedOrigin(origin: string): void {
    if (!this.config.allowedOrigins.includes(origin)) {
      this.config.allowedOrigins.push(origin);
    }
  }

  /**
   * Remove allowed origin
   */
  removeAllowedOrigin(origin: string): void {
    const index = this.config.allowedOrigins.indexOf(origin);
    if (index > -1) {
      this.config.allowedOrigins.splice(index, 1);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CORSConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): CORSConfig {
    return { ...this.config };
  }

  /**
   * Validate cross-origin requests in browser
   */
  static validateCrossOriginRequest(url: string): boolean {
    try {
      if (typeof window === 'undefined') {
        return true;
      }

      const currentOrigin = window.location.origin;
      const urlOrigin = new URL(url).origin;

      // Same origin is always allowed
      if (currentOrigin === urlOrigin) {
        return true;
      }

      // Check if URL is allowed
      const corsService = CORSProtectionService.getInstance();
      return corsService.isOriginAllowed(urlOrigin);
    } catch (error) {
      console.error('Cross-origin validation error:', error);
      return false;
    }
  }

  /**
   * Sanitize URL to prevent SSRF attacks
   */
  static sanitizeURL(url: string): string | null {
    try {
      const parsed = new URL(url);

      // Block internal/private IPs
      const hostname = parsed.hostname;
      const blockedHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
        '169.254.169.254', // AWS metadata
        'metadata.google.internal', // GCP metadata
      ];

      if (blockedHosts.includes(hostname)) {
        console.error('Blocked request to internal host:', hostname);
        return null;
      }

      // Block private IP ranges (simplified check)
      if (hostname.match(/^10\./) ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
          hostname.match(/^192\.168\./)) {
        console.error('Blocked request to private IP:', hostname);
        return null;
      }

      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        console.error('Blocked request with invalid protocol:', parsed.protocol);
        return null;
      }

      return url;
    } catch (error) {
      console.error('URL sanitization error:', error);
      return null;
    }
  }
}

export const corsProtectionService = CORSProtectionService.getInstance();

// Auto-patch fetch on import in browser
if (typeof window !== 'undefined') {
  corsProtectionService.patchGlobalFetch();
}