/**
 * Rate Limiting Configuration
 * Defines rate limits for different endpoint types
 */

export interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Maximum requests per window
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    keyGenerator?: (req: any) => string;
    handler?: (req: any, res: any) => void;
}

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimitConfigs = {
    // Authentication endpoints - very strict
    auth: {
        login: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: 5,            // 5 attempts per 15 minutes
            skipSuccessfulRequests: false,
            message: 'Too many login attempts. Please try again in 15 minutes.'
        },
        signup: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 3,            // 3 signups per hour per IP
            skipSuccessfulRequests: true,
            message: 'Too many signup attempts. Please try again later.'
        },
        passwordReset: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 3,            // 3 reset requests per hour
            skipSuccessfulRequests: true,
            message: 'Too many password reset requests. Please try again later.'
        },
        emailVerification: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 5,            // 5 verification emails per hour
            skipSuccessfulRequests: true,
            message: 'Too many verification requests. Please try again later.'
        }
    },

    // File upload endpoints - moderate
    upload: {
        image: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 50,           // 50 uploads per hour
            skipSuccessfulRequests: false,
            message: 'Upload limit exceeded. Please try again later.'
        },
        document: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 20,           // 20 documents per hour
            skipSuccessfulRequests: false,
            message: 'Document upload limit exceeded. Please try again later.'
        }
    },

    // Payment endpoints - strict
    payment: {
        process: {
            windowMs: 60 * 1000,      // 1 minute
            maxRequests: 5,            // 5 payment attempts per minute
            skipSuccessfulRequests: false,
            message: 'Too many payment attempts. Please wait a moment.'
        },
        refund: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 10,           // 10 refund requests per hour
            skipSuccessfulRequests: true,
            message: 'Too many refund requests. Please try again later.'
        }
    },

    // API endpoints - moderate
    api: {
        general: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: 100,          // 100 requests per 15 minutes
            skipSuccessfulRequests: false,
            message: 'Too many requests. Please slow down.'
        },
        search: {
            windowMs: 60 * 1000,      // 1 minute
            maxRequests: 30,           // 30 searches per minute
            skipSuccessfulRequests: false,
            message: 'Too many search requests. Please wait a moment.'
        },
        create: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 100,          // 100 creates per hour
            skipSuccessfulRequests: false,
            message: 'Creation limit exceeded. Please try again later.'
        }
    },

    // Admin endpoints - very strict
    admin: {
        actions: {
            windowMs: 60 * 1000,      // 1 minute
            maxRequests: 20,           // 20 admin actions per minute
            skipSuccessfulRequests: false,
            message: 'Too many admin actions. Please slow down.'
        },
        bulkOperations: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 10,           // 10 bulk operations per hour
            skipSuccessfulRequests: false,
            message: 'Bulk operation limit exceeded. Please try again later.'
        }
    },

    // Blockchain endpoints - moderate (to account for gas costs)
    blockchain: {
        transaction: {
            windowMs: 60 * 1000,      // 1 minute
            maxRequests: 10,           // 10 transactions per minute
            skipSuccessfulRequests: false,
            message: 'Too many blockchain transactions. Please wait.'
        },
        query: {
            windowMs: 60 * 1000,      // 1 minute
            maxRequests: 60,           // 60 queries per minute
            skipSuccessfulRequests: false,
            message: 'Too many blockchain queries. Please slow down.'
        }
    },

    // Social features - moderate
    social: {
        post: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 50,           // 50 posts per hour
            skipSuccessfulRequests: false,
            message: 'Posting limit exceeded. Please try again later.'
        },
        comment: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 100,          // 100 comments per hour
            skipSuccessfulRequests: false,
            message: 'Comment limit exceeded. Please try again later.'
        },
        like: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 500,          // 500 likes per hour
            skipSuccessfulRequests: false,
            message: 'Like limit exceeded. Please try again later.'
        },
        follow: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 100,          // 100 follows per hour
            skipSuccessfulRequests: false,
            message: 'Follow limit exceeded. Please try again later.'
        }
    },

    // Messaging - moderate
    messaging: {
        send: {
            windowMs: 60 * 1000,      // 1 minute
            maxRequests: 30,           // 30 messages per minute
            skipSuccessfulRequests: false,
            message: 'Too many messages. Please slow down.'
        },
        createConversation: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 20,           // 20 new conversations per hour
            skipSuccessfulRequests: false,
            message: 'Conversation creation limit exceeded.'
        }
    }
};

/**
 * Get rate limit config by endpoint type
 */
export function getRateLimitConfig(category: string, action: string): RateLimitConfig | null {
    const categoryConfig = rateLimitConfigs[category as keyof typeof rateLimitConfigs];
    if (!categoryConfig) return null;

    return categoryConfig[action as keyof typeof categoryConfig] || null;
}

/**
 * Progressive delay calculator for failed authentication attempts
 */
export function calculateAuthDelay(attemptCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    return Math.min(Math.pow(2, attemptCount - 1) * 1000, 30000);
}

/**
 * IP-based rate limit key generator
 */
export function ipBasedKeyGenerator(req: any): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
}

/**
 * User-based rate limit key generator
 */
export function userBasedKeyGenerator(req: any): string {
    const userId = req.user?.id || req.user?.walletAddress || 'anonymous';
    return `user:${userId}`;
}

/**
 * Combined IP and user rate limit key generator
 */
export function combinedKeyGenerator(req: any): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = req.user?.id || req.user?.walletAddress || 'anonymous';
    return `combined:${ip}:${userId}`;
}
