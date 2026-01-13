/**
 * CSRF Protection Service
 * Provides Cross-Site Request Forgery protection for wallet operations
 */

export interface CSRFToken {
  value: string;
  expiresAt: number;
  createdAt: number;
}

export class CSRFService {
  private static instance: CSRFService;
  private token: CSRFToken | null = null;
  private tokenName: string = 'csrf_token';
  private headerName: string = 'X-CSRF-Token';
  private tokenDuration: number = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.loadToken();
  }

  static getInstance(): CSRFService {
    if (!CSRFService.instance) {
      CSRFService.instance = new CSRFService();
    }
    return CSRFService.instance;
  }

  /**
   * Generate a new CSRF token
   */
  generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get current CSRF token
   */
  getToken(): string {
    // Check if token exists and is not expired
    if (!this.token || Date.now() > this.token.expiresAt) {
      this.refreshToken();
    }

    return this.token!.value;
  }

  /**
   * Refresh the CSRF token
   */
  refreshToken(): void {
    const now = Date.now();
    this.token = {
      value: this.generateToken(),
      createdAt: now,
      expiresAt: now + this.tokenDuration
    };
    this.saveToken();
  }

  /**
   * Validate a CSRF token
   */
  validateToken(token: string): boolean {
    if (!this.token || Date.now() > this.token.expiresAt) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return this.constantTimeCompare(token, this.token.value);
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Get token name for form fields
   */
  getTokenName(): string {
    return this.tokenName;
  }

  /**
   * Get header name for API requests
   */
  getHeaderName(): string {
    return this.headerName;
  }

  /**
   * Get CSRF headers as an object (for use with fetch)
   */
  async getCSRFHeaders(): Promise<Record<string, string>> {
    return {
      [this.headerName]: this.getToken()
    };
  }

  /**
   * Add CSRF token to fetch options
   */
  addToFetchOptions(options: RequestInit = {}): RequestInit {
    const headers = new Headers(options.headers || {});
    headers.set(this.headerName, this.getToken());

    return {
      ...options,
      headers
    };
  }

  /**
   * Add CSRF token to form data
   */
  addToFormData(formData: FormData): void {
    formData.append(this.tokenName, this.getToken());
  }

  /**
   * Add CSRF token to URL params
   */
  addToURLParams(params: URLSearchParams): void {
    params.append(this.tokenName, this.getToken());
  }

  /**
   * Get CSRF token as hidden input HTML
   */
  getHiddenInputHTML(): string {
    return `<input type="hidden" name="${this.tokenName}" value="${this.getToken()}" />`;
  }

  /**
   * Validate token from request
   */
  validateRequest(token: string | null | undefined): { valid: boolean; error?: string } {
    if (!token) {
      return {
        valid: false,
        error: 'CSRF token is missing'
      };
    }

    if (!this.validateToken(token)) {
      return {
        valid: false,
        error: 'Invalid CSRF token'
      };
    }

    return { valid: true };
  }

  /**
   * Validate token from form data
   */
  validateFormData(formData: FormData): { valid: boolean; error?: string } {
    const token = formData.get(this.tokenName);
    return this.validateRequest(token as string);
  }

  /**
   * Validate token from URL params
   */
  validateURLParams(params: URLSearchParams): { valid: boolean; error?: string } {
    const token = params.get(this.tokenName);
    return this.validateRequest(token as string);
  }

  /**
   * Validate token from headers
   */
  validateHeaders(headers: Headers): { valid: boolean; error?: string } {
    const token = headers.get(this.headerName);
    return this.validateRequest(token);
  }

  /**
   * Save token to localStorage
   */
  private saveToken(): void {
    try {
      if (this.token && typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('csrf_token', JSON.stringify(this.token));
      }
    } catch (error) {
      console.error('Failed to save CSRF token:', error);
    }
  }

  /**
   * Load token from localStorage
   */
  private loadToken(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem('csrf_token');
        if (data) {
          const token = JSON.parse(data) as CSRFToken;

          // Check if token is still valid
          if (Date.now() <= token.expiresAt) {
            this.token = token;
          } else {
            // Token expired, generate new one
            this.refreshToken();
          }
        } else {
          // No token found, generate new one
          this.refreshToken();
        }
      } else {
        // SSR or localStorage not available, generate new token
        this.refreshToken();
      }
    } catch (error) {
      console.error('Failed to load CSRF token:', error);
      // Generate new token on error
      this.refreshToken();
    }
  }

  /**
   * Clear token
   */
  clearToken(): void {
    this.token = null;
    localStorage.removeItem('csrf_token');
  }

  /**
   * Get token info
   */
  getTokenInfo(): { value: string; createdAt: number; expiresAt: number; timeUntilExpiry: number } | null {
    if (!this.token) {
      return null;
    }

    return {
      value: this.token.value,
      createdAt: this.token.createdAt,
      expiresAt: this.token.expiresAt,
      timeUntilExpiry: Math.max(0, this.token.expiresAt - Date.now())
    };
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    if (!this.token) {
      return true;
    }

    return Date.now() > this.token.expiresAt;
  }

  /**
   * Get time until token expiry in milliseconds
   */
  getTimeUntilExpiry(): number {
    if (!this.token) {
      return 0;
    }

    return Math.max(0, this.token.expiresAt - Date.now());
  }

  /**
   * Set token duration
   */
  setTokenDuration(duration: number): void {
    this.tokenDuration = duration;
    this.refreshToken();
  }

  /**
   * Get token duration
   */
  getTokenDuration(): number {
    return this.tokenDuration;
  }

  /**
   * Initialize CSRF protection for a form
   */
  initializeForm(form: HTMLFormElement): void {
    // Add CSRF token as hidden input
    const existingInput = form.querySelector(`input[name="${this.tokenName}"]`);
    if (!existingInput) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = this.tokenName;
      input.value = this.getToken();
      form.appendChild(input);
    } else {
      existingInput.setAttribute('value', this.getToken());
    }

    // Add submit event listener to validate token
    form.addEventListener('submit', (event) => {
      const formData = new FormData(form);
      const validation = this.validateFormData(formData);

      if (!validation.valid) {
        event.preventDefault();
        console.error('CSRF validation failed:', validation.error);
        // Optionally show error to user
      }
    });
  }

  /**
   * Initialize CSRF protection for all forms
   */
  initializeAllForms(): void {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      this.initializeForm(form as HTMLFormElement);
    });
  }

  /**
   * Create middleware for fetch requests
   */
  createFetchMiddleware(originalFetch: typeof fetch): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      // Add CSRF token to headers
      const options = this.addToFetchOptions(init || {});

      // Make the request
      const response = await originalFetch(input, options);

      // Check for CSRF token in response headers
      const newToken = response.headers.get('X-New-CSRF-Token');
      if (newToken) {
        // Update token with new value from server
        this.token = {
          value: newToken,
          createdAt: Date.now(),
          expiresAt: Date.now() + this.tokenDuration
        };
        this.saveToken();
      }

      return response;
    };
  }

  /**
   * Patch global fetch to use CSRF middleware
   */
  patchGlobalFetch(): void {
    if (typeof window !== 'undefined' && !window.fetch._patched) {
      const originalFetch = window.fetch;
      window.fetch = this.createFetchMiddleware(originalFetch) as any;
      (window.fetch as any)._patched = true;
    }
  }
}

// Export singleton instance
export const csrfService = CSRFService.getInstance();
