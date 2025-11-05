/**
 * Environment Configuration Utility
 * Helps manage different environment configurations and provides fallbacks
 */

interface EnvironmentConfig {
  apiUrl: string;
  backendUrl: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isStaging: boolean;
}

class EnvironmentManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.initializeConfig();
    this.validateConfig();
  }

  private initializeConfig(): EnvironmentConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const vercelEnv = process.env.VERCEL_ENV;
    
    // Determine environment
    const isProduction = nodeEnv === 'production' && vercelEnv === 'production';
    const isStaging = vercelEnv === 'preview' || vercelEnv === 'staging';
    const isDevelopment = nodeEnv === 'development' || (!isProduction && !isStaging);

    // Get API URLs with fallbacks
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    
    // Environment-specific fallbacks
    if (!apiUrl) {
      if (isProduction) {
        // In production, we should have a proper API URL
        console.warn('⚠️ No API URL configured for production environment');
        apiUrl = 'http://localhost:10000'; // Use local backend for development
      } else if (isStaging) {
        apiUrl = 'http://localhost:10000'; // Use local backend for development
      } else {
        // Development fallback - using port 10000 as intended
        apiUrl = 'http://localhost:10000';
      }
    }

    return {
      apiUrl,
      backendUrl: apiUrl, // Same as apiUrl for now
      isProduction,
      isDevelopment,
      isStaging
    };
  }

  private validateConfig(): void {
    const { apiUrl, isProduction } = this.config;

    // Validate production configuration
    if (isProduction) {
      if (apiUrl.includes('localhost')) {
        console.error('🚨 Production environment is using localhost API URL!');
        console.error('This will cause HTTP 503 errors in deployment.');
        console.error('Please set NEXT_PUBLIC_API_URL environment variable.');
      }

      if (!apiUrl.startsWith('https://')) {
        console.warn('⚠️ Production API URL should use HTTPS for security');
      }
    }

    // Log current configuration
    console.log('🔧 Environment Configuration:', {
      environment: this.getEnvironmentName(),
      apiUrl: this.config.apiUrl,
      isProduction: this.config.isProduction,
      isDevelopment: this.config.isDevelopment,
      isStaging: this.config.isStaging
    });
  }

  /**
   * Get the current environment name
   */
  getEnvironmentName(): string {
    if (this.config.isProduction) return 'production';
    if (this.config.isStaging) return 'staging';
    return 'development';
  }

  /**
   * Get the API base URL
   */
  getApiUrl(): string {
    return this.config.apiUrl;
  }

  /**
   * Get the backend URL
   */
  getBackendUrl(): string {
    return this.config.backendUrl;
  }

  /**
   * Check if we're in production
   */
  isProduction(): boolean {
    return this.config.isProduction;
  }

  /**
   * Check if we're in development
   */
  isDevelopment(): boolean {
    return this.config.isDevelopment;
  }

  /**
   * Check if we're in staging
   */
  isStaging(): boolean {
    return this.config.isStaging;
  }

  /**
   * Get full configuration
   */
  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Build API endpoint URL
   */
  buildApiUrl(endpoint: string): string {
    const baseUrl = this.getApiUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  }

  /**
   * Check if API URL is likely to cause 503 errors
   */
  isApiUrlProblematic(): boolean {
    const { apiUrl, isProduction, isStaging } = this.config;
    
    // Check for localhost in non-development environments
    if ((isProduction || isStaging) && apiUrl.includes('localhost')) {
      return true;
    }

    // Check for common development URLs in production
    if (isProduction && (
      apiUrl.includes('localhost') ||
      apiUrl.includes('127.0.0.1') ||
      apiUrl.includes(':3000') ||
      apiUrl.includes(':10000')
    )) {
      return true;
    }

    return false;
  }

  /**
   * Get suggestions for fixing problematic API URLs
   */
  getApiUrlSuggestions(): string[] {
    const suggestions: string[] = [];
    
    if (this.isApiUrlProblematic()) {
      suggestions.push('Deploy your backend service to a cloud provider (Render, Railway, Heroku)');
      suggestions.push('Update NEXT_PUBLIC_API_URL environment variable to point to deployed backend');
      suggestions.push('Ensure CORS is configured correctly on your backend');
      
      if (this.config.isProduction) {
        suggestions.push('Use HTTPS URLs for production environment');
        suggestions.push('Set up proper SSL certificates');
      }
    }

    return suggestions;
  }

  /**
   * Display environment status
   */
  displayStatus(): void {
    const config = this.getConfig();
    const isProblematic = this.isApiUrlProblematic();
    
    console.group('🌍 Environment Status');
    console.log('Environment:', this.getEnvironmentName());
    console.log('API URL:', config.apiUrl);
    console.log('Backend URL:', config.backendUrl);
    
    if (isProblematic) {
      console.error('🚨 Problematic Configuration Detected!');
      console.error('This may cause HTTP 503 Service Unavailable errors.');
      
      const suggestions = this.getApiUrlSuggestions();
      if (suggestions.length > 0) {
        console.group('💡 Suggestions:');
        suggestions.forEach(suggestion => console.log(`• ${suggestion}`));
        console.groupEnd();
      }
    } else {
      console.log('✅ Configuration looks good!');
    }
    
    console.groupEnd();
  }
}

// Create singleton instance
export const environmentManager = new EnvironmentManager();

// Convenience exports
export const getApiUrl = () => environmentManager.getApiUrl();
export const getBackendUrl = () => environmentManager.getBackendUrl();
export const buildApiUrl = (endpoint: string) => environmentManager.buildApiUrl(endpoint);
export const isProduction = () => environmentManager.isProduction();
export const isDevelopment = () => environmentManager.isDevelopment();
export const isStaging = () => environmentManager.isStaging();

// Display status on import (only in development)
if (typeof window !== 'undefined' && environmentManager.isDevelopment()) {
  environmentManager.displayStatus();
}

export default environmentManager;