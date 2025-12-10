/**
 * CSRF Service - Manages CSRF token retrieval and validation
 */

import { ENV_CONFIG } from '@/config/environment';

class CSRFService {
  private static instance: CSRFService;
  private csrfToken: string | null = null;
  private sessionId: string | null = null;
  private baseUrl: string;

  private constructor() {
    // Use the same base URL as the environment config for consistency
    this.baseUrl = ENV_CONFIG.BACKEND_URL;
    
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      this.csrfToken = localStorage.getItem('csrf_token');
      this.sessionId = localStorage.getItem('session_id');
    }
  }

  static getInstance(): CSRFService {
    if (!CSRFService.instance) {
      CSRFService.instance = new CSRFService();
    }
    return CSRFService.instance;
  }

  /**
   * Initialize CSRF service with session ID
   */
  async initialize(sessionId: string): Promise<void> {
    this.sessionId = sessionId;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('session_id', sessionId);
    }
    
    // Fetch a new CSRF token
    await this.refreshToken();
  }

  /**
   * Get CSRF token, fetching a new one if needed
   */
  async getCSRFToken(): Promise<string | null> {
    // If we don't have a token or session, return null
    if (!this.sessionId) {
      return null;
    }

    // If we have a token, return it
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // Otherwise, fetch a new token
    await this.refreshToken();
    return this.csrfToken;
  }

  /**
   * Refresh CSRF token from backend
   */
  async refreshToken(): Promise<void> {
    if (!this.sessionId) {
      this.csrfToken = null;
      return;
    }

    try {
      // Use the correct API endpoint path
      const response = await fetch(`${this.baseUrl}/api/csrf-token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': this.sessionId, // Use lowercase header name
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data?.csrfToken) {
        this.csrfToken = data.data.csrfToken;
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('csrf_token', this.csrfToken);
        }
      } else {
        throw new Error('Invalid CSRF token response');
      }
    } catch (error) {
      console.error('Error refreshing CSRF token:', error);
      this.csrfToken = null;
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('csrf_token');
      }
    }
  }

  /**
   * Get CSRF headers for requests
   */
  async getCSRFHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.sessionId) {
      headers['x-session-id'] = this.sessionId; // Use lowercase header name
    }

    const token = await this.getCSRFToken();
    if (token) {
      headers['x-csrf-token'] = token; // Use lowercase header name
    }

    return headers;
  }

  /**
   * Clear CSRF token (e.g., on logout)
   */
  clear(): void {
    this.csrfToken = null;
    this.sessionId = null;
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('csrf_token');
      localStorage.removeItem('session_id');
    }
  }
}

export const csrfService = CSRFService.getInstance();