import { WebSocketServiceConfig } from '../services/webSocketService';

// Production configuration with optimized settings for resource-constrained environments
export const productionConfig = {
  // WebSocket configuration optimized for production
  webSocket: {
    resourceAware: true,
    maxConnections: process.env.RENDER_SERVICE_TYPE === 'free' ? 50 : 
                   (process.env.RENDER_SERVICE_TYPE === 'standard' ? 200 : 500),
    memoryThreshold: process.env.RENDER_SERVICE_TYPE === 'free' ? 200 : 
                     (process.env.RENDER_SERVICE_TYPE === 'standard' ? 600 : 400),
    enableHeartbeat: !(process.env.RENDER_SERVICE_TYPE === 'free'),
    heartbeatInterval: process.env.RENDER_SERVICE_TYPE === 'free' ? 60000 : 
                       (process.env.RENDER_SERVICE_TYPE === 'standard' ? 45000 : 30000),
    messageQueueLimit: process.env.RENDER_SERVICE_TYPE === 'free' ? 20 : 
                       (process.env.RENDER_SERVICE_TYPE === 'standard' ? 50 : 100),
    connectionTimeout: 60000
  } as WebSocketServiceConfig,
  
  // Rate limiting configuration optimized for production
  rateLimiting: {
    // General API rate limiting
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.RENDER_SERVICE_TYPE === 'free' ? 500 : 
           (process.env.RENDER_SERVICE_TYPE === 'standard' ? 1500 : 2000), // Higher limits for standard tier
      message: 'Too many requests from this IP, please try again later.'
    },
    
    // Feed endpoint rate limiting
    feed: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: process.env.RENDER_SERVICE_TYPE === 'free' ? 10 : 
           (process.env.RENDER_SERVICE_TYPE === 'standard' ? 50 : 30), // More permissive for standard tier
      message: 'Too many feed requests, please try again in a minute.'
    },
    
    // Post creation rate limiting
    createPost: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.RENDER_SERVICE_TYPE === 'free' ? 20 : 
           (process.env.RENDER_SERVICE_TYPE === 'standard' ? 150 : 100), // Higher limits for standard tier
      message: 'Too many posts created, please try again later.'
    }
  },
  
  // Database connection pool optimization
  database: {
    maxConnections: process.env.RENDER_SERVICE_TYPE === 'free' ? 2 : 
                    (process.env.RENDER_SERVICE_TYPE === 'standard' ? 15 : 10),
    minConnections: process.env.RENDER_SERVICE_TYPE === 'free' ? 1 : 
                    (process.env.RENDER_SERVICE_TYPE === 'standard' ? 5 : 2),
    idleTimeoutMillis: process.env.RENDER_SERVICE_TYPE === 'free' ? 20000 : 
                       (process.env.RENDER_SERVICE_TYPE === 'standard' ? 60000 : 30000),
    connectionTimeoutMillis: process.env.RENDER_SERVICE_TYPE === 'free' ? 5000 : 
                             (process.env.RENDER_SERVICE_TYPE === 'standard' ? 5000 : 10000)
  },
  
  // Memory management
  memory: {
    thresholdWarning: process.env.RENDER_SERVICE_TYPE === 'free' ? 300 : 
                      (process.env.RENDER_SERVICE_TYPE === 'standard' ? 1200 : 600), // MB
    thresholdCritical: process.env.RENDER_SERVICE_TYPE === 'free' ? 400 : 
                       (process.env.RENDER_SERVICE_TYPE === 'standard' ? 1400 : 800), // MB
    gcThreshold: process.env.RENDER_SERVICE_TYPE === 'free' ? 250 : 
                 (process.env.RENDER_SERVICE_TYPE === 'standard' ? 1000 : 500) // MB
  },
  
  // External service timeouts
  externalServices: {
    ipfsTimeout: 10000, // 10 seconds
    rpcTimeout: 10000, // 10 seconds
    dnsTimeout: 3000, // 3 seconds
    maxRetries: 2
  }
};