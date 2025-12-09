import { WebSocketServiceConfig } from '../services/webSocketService';

// Production configuration with optimized settings for resource-constrained environments
// Pro tier: 4GB RAM, 2 CPUs
export const productionConfig = {
  // WebSocket configuration optimized for production
  webSocket: {
    resourceAware: true,
    maxConnections: process.env.RENDER_SERVICE_TYPE === 'free' ? 50 :
                   (process.env.RENDER_SERVICE_TYPE === 'pro' ? 1000 : // Pro tier: 4GB RAM
                   (process.env.RENDER_SERVICE_TYPE === 'standard' ? 200 : 500)),
    memoryThreshold: process.env.RENDER_SERVICE_TYPE === 'free' ? 200 :
                     (process.env.RENDER_SERVICE_TYPE === 'pro' ? 3200 : // Pro tier: 80% of 4GB
                     (process.env.RENDER_SERVICE_TYPE === 'standard' ? 600 : 400)),
    enableHeartbeat: !(process.env.RENDER_SERVICE_TYPE === 'free'),
    heartbeatInterval: process.env.RENDER_SERVICE_TYPE === 'free' ? 60000 :
                       (process.env.RENDER_SERVICE_TYPE === 'pro' ? 30000 : // Pro tier: more frequent
                       (process.env.RENDER_SERVICE_TYPE === 'standard' ? 45000 : 30000)),
    messageQueueLimit: process.env.RENDER_SERVICE_TYPE === 'free' ? 20 :
                       (process.env.RENDER_SERVICE_TYPE === 'pro' ? 200 : // Pro tier: larger queue
                       (process.env.RENDER_SERVICE_TYPE === 'standard' ? 50 : 100)),
    connectionTimeout: 60000
  } as WebSocketServiceConfig,

  // Rate limiting configuration optimized for production
  rateLimiting: {
    // General API rate limiting
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.RENDER_SERVICE_TYPE === 'free' ? 500 :
           (process.env.RENDER_SERVICE_TYPE === 'pro' ? 5000 : // Pro tier: 10x higher limits
           (process.env.RENDER_SERVICE_TYPE === 'standard' ? 1500 : 2000)),
      message: 'Too many requests from this IP, please try again later.'
    },

    // Feed endpoint rate limiting
    feed: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: process.env.RENDER_SERVICE_TYPE === 'free' ? 10 :
           (process.env.RENDER_SERVICE_TYPE === 'pro' ? 100 : // Pro tier: 10x higher
           (process.env.RENDER_SERVICE_TYPE === 'standard' ? 50 : 30)),
      message: 'Too many feed requests, please try again in a minute.'
    },

    // Post creation rate limiting
    createPost: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.RENDER_SERVICE_TYPE === 'free' ? 20 :
           (process.env.RENDER_SERVICE_TYPE === 'pro' ? 300 : // Pro tier: 3x higher
           (process.env.RENDER_SERVICE_TYPE === 'standard' ? 150 : 100)),
      message: 'Too many posts created, please try again later.'
    }
  },

  // Database connection pool optimization (optimized for better resource management)
  database: {
    maxConnections: process.env.RENDER_SERVICE_TYPE === 'free' ? 2 :
                    (process.env.RENDER_SERVICE_TYPE === 'pro' ? 20 : // Pro tier: reduced from 25 to 20 connections
                    (process.env.RENDER_SERVICE_TYPE === 'standard' ? 12 : // Standard tier: reduced from 15 to 12
                    8)), // Default: reduced from 10 to 8
    minConnections: process.env.RENDER_SERVICE_TYPE === 'free' ? 1 :
                    (process.env.RENDER_SERVICE_TYPE === 'pro' ? 3 : // Pro tier: reduced from 5 to 3 minimum
                    (process.env.RENDER_SERVICE_TYPE === 'standard' ? 3 : 2)),
    idleTimeoutMillis: process.env.RENDER_SERVICE_TYPE === 'free' ? 20000 :
                       (process.env.RENDER_SERVICE_TYPE === 'pro' ? 45000 : // Pro tier: reduced from 60000 to 45000
                       (process.env.RENDER_SERVICE_TYPE === 'standard' ? 45000 : 30000)),
    connectionTimeoutMillis: process.env.RENDER_SERVICE_TYPE === 'free' ? 5000 :
                             (process.env.RENDER_SERVICE_TYPE === 'pro' ? 5000 : // Pro tier: reduced from 10000 to 5000
                             (process.env.RENDER_SERVICE_TYPE === 'standard' ? 3000 : 5000))
  },

  // Memory management
  memory: {
    thresholdWarning: process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512 ? 100 : // More conservative for <512MB
      (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024 ? 200 : // For <1GB
        (process.env.RENDER_SERVICE_TYPE === 'free' ? 300 :
          (process.env.RENDER_SERVICE_TYPE === 'pro' ? 3200 : // Pro tier: 3.2GB warning (80% of 4GB)
          (process.env.RENDER_SERVICE_TYPE === 'standard' ? 1600 : 600)))), // MB
    thresholdCritical: process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512 ? 150 : // More conservative for <512MB
      (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024 ? 300 : // For <1GB
        (process.env.RENDER_SERVICE_TYPE === 'free' ? 400 :
          (process.env.RENDER_SERVICE_TYPE === 'pro' ? 3600 : // Pro tier: 3.6GB critical (90% of 4GB)
          (process.env.RENDER_SERVICE_TYPE === 'standard' ? 1800 : 800)))), // MB
    gcThreshold: process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 512 ? 80 : // More conservative for <512MB
      (process.env.MEMORY_LIMIT && parseInt(process.env.MEMORY_LIMIT) < 1024 ? 150 : // For <1GB
        (process.env.RENDER_SERVICE_TYPE === 'free' ? 250 :
          (process.env.RENDER_SERVICE_TYPE === 'pro' ? 2400 : // Pro tier: 2.4GB GC threshold (60% of 4GB)
          (process.env.RENDER_SERVICE_TYPE === 'standard' ? 1200 : 500)))) // MB
  },
  
  // External service timeouts
  externalServices: {
    ipfsTimeout: 10000, // 10 seconds
    rpcTimeout: 10000, // 10 seconds
    dnsTimeout: 3000, // 3 seconds
    maxRetries: 2
  }
};