/**
 * Environment Configuration
 * Centralized configuration for all apps
 */

// Helper to get origin from platform-specific constants
const getOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  // For React Native, use a default or platform-specific origin
  return 'http://localhost:10000';
};

export const ENV_CONFIG = {
  // Backend API - fallback to window.location.origin for production
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || getOrigin(),

  // WebSocket - derived from BACKEND_URL, Socket.IO will handle protocol upgrade automatically
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || process.env.EXPO_PUBLIC_WS_URL || getOrigin().replace(/^http/, 'ws'),

  // API Timeout
  API_TIMEOUT: 30000,

  // Retry Configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,

  // Cache Configuration
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],

  // WebSocket Reconnection
  WS_RECONNECT_DELAY: 3000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,

  // Session
  SESSION_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  REFRESH_THRESHOLD: 2 * 60 * 60 * 1000, // 2 hours before expiry

  // Rate Limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;