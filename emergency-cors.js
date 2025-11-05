
const cors = require('cors');

// Emergency CORS configuration - VERY PERMISSIVE FOR DEVELOPMENT
const emergencyCorsOptions = {
  origin: function (origin, callback) {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Allow specific origins in production
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'https://linkdao.vercel.app'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Session-ID',
    'X-Wallet-Address',
    'X-Chain-ID',
    'X-CSRF-Token',
    'x-csrf-token',
    'csrf-token'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200
};

const emergencyCorsMiddleware = cors(emergencyCorsOptions);

module.exports = { emergencyCorsMiddleware, emergencyCorsOptions };
