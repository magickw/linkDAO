/**
 * Deployment Configuration for Social Dashboard
 * 
 * This configuration handles different deployment environments
 * and optimizes the build for production deployment.
 */

const deployConfig = {
  // Environment configurations
  environments: {
    development: {
      apiUrl: 'http://localhost:8000',
      wsUrl: 'ws://localhost:8000',
      chainId: 31337, // Local hardhat network
      enableAnalytics: false,
      enableServiceWorker: false,
      logLevel: 'debug'
    },
    
    staging: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api-staging.linkdao.io',
      wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'wss://ws-staging.linkdao.io',
      chainId: 11155111, // Sepolia testnet
      enableAnalytics: true,
      enableServiceWorker: true,
      logLevel: 'info'
    },
    
    production: {
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://api.linkdao.io',
      wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'wss://ws.linkdao.io',
      chainId: 1, // Ethereum mainnet
      enableAnalytics: true,
      enableServiceWorker: true,
      logLevel: 'error'
    }
  },
  
  // Build optimizations
  buildOptimizations: {
    // Bundle size limits (in KB)
    bundleSizeWarnings: {
      maxAssetSize: 512,
      maxEntrypointSize: 512,
      maxChunkSize: 244
    },
    
    // Performance budgets
    performanceBudgets: {
      firstContentfulPaint: 2000, // 2s
      largestContentfulPaint: 4000, // 4s
      firstInputDelay: 100, // 100ms
      cumulativeLayoutShift: 0.1
    },
    
    // Compression settings
    compression: {
      gzip: true,
      brotli: true,
      level: 9
    }
  },
  
  // Security configurations
  security: {
    contentSecurityPolicy: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://vercel.live", "https://js.stripe.com", "https://storage.googleapis.com"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", "data:", "https:", "blob:"],
      'font-src': ["'self'", "https:"],
      'connect-src': ["'self'", "https:", "wss:", "ws:", "http://localhost:*", "ws://localhost:*"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"]
    },
    
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  },
  
  // CDN and caching
  cdn: {
    staticAssets: {
      maxAge: 31536000, // 1 year
      immutable: true
    },
    
    apiResponses: {
      maxAge: 300, // 5 minutes
      staleWhileRevalidate: 86400 // 24 hours
    },
    
    images: {
      maxAge: 86400, // 24 hours
      formats: ['webp', 'avif']
    }
  },
  
  // Monitoring and analytics
  monitoring: {
    vercelAnalytics: true,
    webVitals: true,
    errorTracking: true,
    performanceMonitoring: true
  }
};

// Get current environment configuration
function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  const deployEnv = process.env.DEPLOY_ENV || env;
  
  return deployConfig.environments[deployEnv] || deployConfig.environments.development;
}

// Generate environment variables for build
function generateEnvVars() {
  const config = getEnvironmentConfig();
  
  return {
    NEXT_PUBLIC_API_URL: config.apiUrl,
    NEXT_PUBLIC_WS_URL: config.wsUrl,
    NEXT_PUBLIC_CHAIN_ID: config.chainId.toString(),
    NEXT_PUBLIC_ENABLE_ANALYTICS: config.enableAnalytics.toString(),
    NEXT_PUBLIC_ENABLE_SERVICE_WORKER: config.enableServiceWorker.toString(),
    NEXT_PUBLIC_LOG_LEVEL: config.logLevel
  };
}

module.exports = {
  deployConfig,
  getEnvironmentConfig,
  generateEnvVars
};