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

  // Database connection pool optimization
  database: {
    maxConnections: process.env.RENDER_SERVICE_TYPE === 'free' ? 2 :
                    (process.env.RENDER_SERVICE_TYPE === 'pro' ? 25 : // Pro tier: 25 connections
                    (process.env.RENDER_SERVICE_TYPE === 'standard' ? 15 : 10)),
    minConnections: process.env.RENDER_SERVICE_TYPE === 'free' ? 1 :
                    (process.env.RENDER_SERVICE_TYPE === 'pro' ? 5 : // Pro tier: maintain 5 minimum
                    (process.env.RENDER_SERVICE_TYPE === 'standard' ? 5 : 2)),
    idleTimeoutMillis: process.env.RENDER_SERVICE_TYPE === 'free' ? 20000 :
                       (process.env.RENDER_SERVICE_TYPE === 'pro' ? 60000 : // Pro tier: keep connections longer
                       (process.env.RENDER_SERVICE_TYPE === 'standard' ? 60000 : 30000)),
    connectionTimeoutMillis: process.env.RENDER_SERVICE_TYPE === 'free' ? 5000 :
                             (process.env.RENDER_SERVICE_TYPE === 'pro' ? 10000 : // Pro tier: more patient
                             (process.env.RENDER_SERVICE_TYPE === 'standard' ? 5000 : 10000))
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