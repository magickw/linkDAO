
/**
 * Deployment-ready CORS configuration
 * Optimized for production deployment with comprehensive origin support
 */

export const deploymentCorsConfig = {
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-Correlation-ID',
    'X-Session-ID',
    'X-Wallet-Address',
    'X-Chain-ID',
    'X-API-Key',
    'X-Client-Version',
    'X-CSRF-Token',
    'x-csrf-token',
    'csrf-token',
    'Cache-Control'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    'RateLimit-Policy',
    'X-Total-Count'
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200
};

export const productionOrigins = [
  'https://www.linkdao.io',
  'https://linkdao.io',
  'https://app.linkdao.io', 
  'https://marketplace.linkdao.io',
  'https://linkdao.vercel.app',
  'https://linkdao-backend.onrender.com',
  'https://api.linkdao.io',
  /https:\/\/linkdao-.*\.vercel\.app$/,
  /https:\/\/.*\.vercel\.app$/
];
