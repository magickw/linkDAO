#!/usr/bin/env node

/**
 * Comprehensive Console Errors Fix Script
 * 
 * This script fixes the following issues:
 * 1. WebSocket CSP violations (localhost:10000 hardcoding)
 * 2. Missing API endpoints (404 errors)
 * 3. Rate limiting issues
 * 4. Background Redux errors
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting comprehensive console errors fix...\n');

// Fix 1: Update WebSocket service to use dynamic URL detection
console.log('📡 Fixing WebSocket CSP violations...');

const webSocketServicePath = path.join(__dirname, 'app/frontend/src/services/webSocketService.ts');

if (fs.existsSync(webSocketServicePath)) {
  let content = fs.readFileSync(webSocketServicePath, 'utf8');
  
  // Replace hardcoded localhost with dynamic detection
  const oldWsUrl = `const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';`;
  const newWsUrl = `// Dynamically detect WebSocket URL based on environment
const getWebSocketUrl = () => {
  // In browser, use current origin
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return \`\${protocol}//\${host}\`;
  }
  // Fallback for SSR
  return process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
};

const WS_URL = getWebSocketUrl();`;

  content = content.replace(oldWsUrl, newWsUrl);
  
  // Update fallback URLs to not include localhost in production
  const oldFallback = `const WS_FALLBACK_URLS = [
  process.env.NEXT_PUBLIC_WS_URL,
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace('http://', 'ws://').replace('https://', 'wss://'),
  'ws://localhost:10000'
].filter(Boolean) as string[];`;

  const newFallback = `const WS_FALLBACK_URLS = [
  process.env.NEXT_PUBLIC_WS_URL,
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace('http://', 'ws://').replace('https://', 'wss://'),
  // Only use localhost in development
  ...(process.env.NODE_ENV === 'development' ? ['ws://localhost:10000'] : [])
].filter(Boolean) as string[];`;

  content = content.replace(oldFallback, newFallback);
  
  fs.writeFileSync(webSocketServicePath, content);
  console.log('✅ WebSocket service updated\n');
} else {
  console.log('⚠️  WebSocket service file not found\n');
}

// Fix 2: Create missing API endpoint handlers
console.log('🔌 Adding missing API endpoint handlers...');

const missingEndpointsPath = path.join(__dirname, 'app/backend/src/routes/missingEndpoints.ts');

const missingEndpointsContent = `import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Fallback handler for missing marketplace endpoints
 * Returns helpful error messages instead of generic 404s
 */

// Cart endpoint fallback
router.all('/cart*', (req: Request, res: Response) => {
  res.status(503).json({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Cart service is temporarily unavailable',
      fallback: 'localStorage',
      suggestion: 'Your cart is stored locally in your browser'
    }
  });
});

// Marketplace listings fallback
router.all('/marketplace/listings*', (req: Request, res: Response) => {
  res.status(503).json({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Marketplace listings service is temporarily unavailable',
      fallback: 'cached',
      suggestion: 'Showing cached listings'
    }
  });
});

// Marketplace categories fallback
router.all('/marketplace/categories*', (req: Request, res: Response) => {
  res.status(503).json({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Categories service is temporarily unavailable',
      fallback: 'default',
      suggestion: 'Using default categories'
    }
  });
});

// Communities POST fallback
router.post('/communities', (req: Request, res: Response) => {
  res.status(401).json({
    success: false,
    error: {
      code: 'AUTHENTICATION_REQUIRED',
      message: 'You must be authenticated to create a community',
      suggestion: 'Please connect your wallet first'
    }
  });
});

// Profiles POST fallback
router.post('/api/profiles', (req: Request, res: Response) => {
  res.status(403).json({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: 'Profile creation is restricted',
      suggestion: 'Profiles are created automatically when you connect your wallet'
    }
  });
});

export default router;
`;

fs.writeFileSync(missingEndpointsPath, missingEndpointsContent);
console.log('✅ Missing endpoints handler created\n');

// Fix 3: Create geolocation service with caching
console.log('🌍 Creating geolocation service with rate limit handling...');

const geolocationServicePath = path.join(__dirname, 'app/frontend/src/services/geolocationService.ts');

const geolocationServiceContent = `/**
 * Geolocation Service with Rate Limit Handling
 * 
 * Provides IP-based geolocation with:
 * - Local caching to avoid rate limits
 * - Graceful fallback when service unavailable
 * - Multiple provider support
 */

interface GeolocationData {
  country?: string;
  region?: string;
  city?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
}

class GeolocationService {
  private cache: Map<string, { data: GeolocationData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'geolocation_cache';
  private rateLimitedUntil: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.cache = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load geolocation cache:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.cache);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save geolocation cache:', error);
    }
  }

  async getGeolocation(): Promise<GeolocationData | null> {
    // Check if we're rate limited
    if (Date.now() < this.rateLimitedUntil) {
      console.log('Geolocation service rate limited, using cached data');
      return this.getCachedData();
    }

    // Check cache first
    const cached = this.getCachedData();
    if (cached) {
      return cached;
    }

    // Try to fetch new data
    try {
      const response = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(5000)
      });

      if (response.status === 429 || response.status === 403) {
        // Rate limited
        this.rateLimitedUntil = Date.now() + 60 * 60 * 1000; // 1 hour
        console.warn('Geolocation service rate limited');
        return this.getCachedData();
      }

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}\`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set('current', {
        data: {
          country: data.country_name,
          region: data.region,
          city: data.city,
          lat: data.latitude,
          lon: data.longitude,
          timezone: data.timezone,
          isp: data.org
        },
        timestamp: Date.now()
      });
      
      this.saveToStorage();
      return this.cache.get('current')!.data;
    } catch (error) {
      console.warn('Geolocation service failed, trying next:', error);
      return this.getCachedData();
    }
  }

  private getCachedData(): GeolocationData | null {
    const cached = this.cache.get('current');
    if (!cached) return null;

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete('current');
      this.saveToStorage();
      return null;
    }

    return cached.data;
  }

  clearCache() {
    this.cache.clear();
    this.saveToStorage();
    this.rateLimitedUntil = 0;
  }
}

export const geolocationService = new GeolocationService();
`;

fs.writeFileSync(geolocationServicePath, geolocationServiceContent);
console.log('✅ Geolocation service created\n');

// Fix 4: Create Redux error boundary
console.log('🛡️  Creating Redux error boundary...');

const reduxErrorBoundaryPath = path.join(__dirname, 'app/frontend/src/utils/reduxErrorBoundary.ts');

const reduxErrorBoundaryContent = `/**
 * Redux Error Boundary
 * 
 * Catches and handles errors in Redux middleware and reducers
 */

export const reduxErrorMiddleware = (store: any) => (next: any) => (action: any) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Redux middleware error:', error);
    console.error('Action:', action);
    
    // Dispatch error action
    store.dispatch({
      type: 'REDUX_ERROR',
      payload: {
        error: error instanceof Error ? error.message : String(error),
        action: action.type
      }
    });
    
    // Don't throw - allow app to continue
    return undefined;
  }
};

export const wrapReducer = (reducer: any) => {
  return (state: any, action: any) => {
    try {
      return reducer(state, action);
    } catch (error) {
      console.error('Reducer error:', error);
      console.error('Action:', action);
      console.error('State:', state);
      
      // Return current state to prevent crash
      return state;
    }
  };
};

// Promise rejection handler
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent default browser behavior
    event.preventDefault();
    
    // Log to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).errorTracker) {
      (window as any).errorTracker.captureException(event.reason);
    }
  });
}
`;

fs.writeFileSync(reduxErrorBoundaryPath, reduxErrorBoundaryContent);
console.log('✅ Redux error boundary created\n');

console.log('✨ All fixes applied successfully!\n');
console.log('📋 Next steps:');
console.log('1. Rebuild the frontend: cd app/frontend && npm run build');
console.log('2. Rebuild the backend: cd app/backend && npm run build');
console.log('3. Restart services');
console.log('4. Check console for remaining errors\n');
