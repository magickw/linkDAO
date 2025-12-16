import { RedisService } from './redisService';
import { safeLogger } from '../utils/safeLogger';
import { DatabaseService } from './databaseService';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export class AuthService {
  private redisService: RedisService;
  private databaseService: DatabaseService;

  constructor() {
    this.redisService = RedisService.getInstance();
    this.databaseService = new DatabaseService();
  }

  /**
   * Generate a unique nonce for wallet authentication
   */
  async generateNonce(address: string): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('hex');
    const key = `nonce:${address.toLowerCase()}`;
    
    // Store nonce with 10 minute expiration
    await this.redisService.set(key, nonce, 600);
    
    return nonce;
  }

  /**
   * Verify nonce for wallet authentication
   */
  async verifyNonce(address: string, nonce: string): Promise<boolean> {
    const key = `nonce:${address.toLowerCase()}`;
    const storedNonce = await this.redisService.get(key);
    
    if (!storedNonce || storedNonce !== nonce) {
      return false;
    }
    
    // Delete nonce after verification to prevent replay attacks
    await this.redisService.del(key);
    return true;
  }

  /**
   * Initialize user session data
   */
  async initializeUserSession(address: string): Promise<void> {
    const sessionKey = `session:${address.toLowerCase()}`;
    const sessionData = {
      createdAt: new Date().toISOString(),
      loginCount: 1,
      lastLogin: new Date().toISOString(),
      deviceInfo: {
        userAgent: 'web',
        ip: 'unknown'
      }
    };
    
    await this.redisService.set(sessionKey, JSON.stringify(sessionData), 86400 * 7); // 7 days
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(address: string): Promise<void> {
    const sessionKey = `session:${address.toLowerCase()}`;
    const existingSession = await this.redisService.get(sessionKey);
    
    if (existingSession) {
      const sessionData = JSON.parse(existingSession);
      sessionData.lastLogin = new Date().toISOString();
      sessionData.loginCount = (sessionData.loginCount || 0) + 1;
      
      await this.redisService.set(sessionKey, JSON.stringify(sessionData), 86400 * 7);
    } else {
      await this.initializeUserSession(address);
    }
  }

  /**
   * Get session information
   */
  async getSessionInfo(address: string): Promise<any> {
    const sessionKey = `session:${address.toLowerCase()}`;
    const sessionData = await this.redisService.get(sessionKey);
    
    if (!sessionData) {
      return {
        lastLogin: null,
        loginCount: 0,
        deviceInfo: null
      };
    }
    
    return JSON.parse(sessionData);
  }

  /**
   * Invalidate user session
   */
  async invalidateSession(address: string): Promise<void> {
    const sessionKey = `session:${address.toLowerCase()}`;
    await this.redisService.del(sessionKey);
  }

  /**
   * Get user permissions based on KYC status and other factors
   */
  async getUserPermissions(address: string): Promise<string[]> {
    const db = this.databaseService.getDatabase();
    
    try {
      const user = await db.select().from(users).where(eq(users.walletAddress, address)).limit(1);
      
      if (!user.length) {
        return ['basic_trading', 'profile_management'];
      }
      
      const userData = user[0];
      const permissions = ['basic_trading', 'profile_management'];
      
      // Add permissions based on KYC status
      const kycStatus = (userData as any).kycStatus || 'none';
      
      switch (kycStatus) {
        case 'basic':
          permissions.push('enhanced_trading', 'nft_trading');
          break;
        case 'intermediate':
          permissions.push('enhanced_trading', 'nft_trading', 'high_value_trading', 'escrow_management');
          break;
        case 'advanced':
          permissions.push('enhanced_trading', 'nft_trading', 'high_value_trading', 'escrow_management', 'governance_voting', 'dispute_resolution');
          break;
      }
      
      // Add additional permissions based on user status
      if ((userData as any).isVerifiedSeller) {
        permissions.push('seller_tools', 'bulk_operations');
      }
      
      if ((userData as any).isModerator) {
        permissions.push('moderation_tools', 'user_management');
      }
      
      return permissions;
    } catch (error) {
      safeLogger.error('Error getting user permissions:', error);
      return ['basic_trading', 'profile_management'];
    }
  }

  /**
   * Rate limiting for authentication attempts
   */
  async checkRateLimit(address: string, action: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${action}:${address.toLowerCase()}`;
    const limit = this.getRateLimitForAction(action);
    const window = 3600; // 1 hour window
    
    const current = await this.redisService.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= limit.max) {
      const ttl = await this.redisService.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + (ttl * 1000)
      };
    }
    
    // Increment counter
    if (count === 0) {
      await this.redisService.setex(key, window, '1');
    } else {
      await this.redisService.incr(key);
    }
    
    return {
      allowed: true,
      remaining: limit.max - count - 1,
      resetTime: Date.now() + window * 1000
    };
  }

  /**
   * Get rate limit configuration for different actions
   */
  private getRateLimitForAction(action: string): { max: number; window: number } {
    const limits = {
      'auth': { max: 10, window: 3600 }, // 10 auth attempts per hour
      'nonce': { max: 20, window: 3600 }, // 20 nonce requests per hour
      'kyc': { max: 3, window: 86400 }, // 3 KYC attempts per day
      'password_reset': { max: 5, window: 3600 } // 5 password reset attempts per hour
    };
    
    return (limits as any)[action] || { max: 100, window: 3600 };
  }

  /**
   * Store device fingerprint for security
   */
  async storeDeviceFingerprint(address: string, fingerprint: string, userAgent: string, ip: string): Promise<void> {
    const deviceKey = `device:${address.toLowerCase()}:${fingerprint}`;
    const deviceData = {
      fingerprint,
      userAgent,
      ip,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      trusted: false
    };
    
    const existing = await this.redisService.get(deviceKey);
    if (existing) {
      const existingData = JSON.parse(existing);
      deviceData.firstSeen = existingData.firstSeen;
      deviceData.trusted = existingData.trusted;
    }
    
    await this.redisService.setex(deviceKey, 86400 * 30, JSON.stringify(deviceData)); // 30 days
  }

  /**
   * Check if device is trusted
   */
  async isDeviceTrusted(address: string, fingerprint: string): Promise<boolean> {
    const deviceKey = `device:${address.toLowerCase()}:${fingerprint}`;
    const deviceData = await this.redisService.get(deviceKey);
    
    if (!deviceData) {
      return false;
    }
    
    const data = JSON.parse(deviceData);
    return data.trusted || false;
  }

  /**
   * Mark device as trusted
   */
  async trustDevice(address: string, fingerprint: string): Promise<void> {
    const deviceKey = `device:${address.toLowerCase()}:${fingerprint}`;
    const deviceData = await this.redisService.get(deviceKey);
    
    if (deviceData) {
      const data = JSON.parse(deviceData);
      data.trusted = true;
      data.trustedAt = new Date().toISOString();
      
      await this.redisService.setex(deviceKey, 86400 * 30, JSON.stringify(data));
    }
  }

  /**
   * Get user's trusted devices
   */
  async getTrustedDevices(address: string): Promise<any[]> {
    const pattern = `device:${address.toLowerCase()}:*`;
    const keys = await this.redisService.keys(pattern);
    const devices = [];
    
    for (const key of keys) {
      const deviceData = await this.redisService.get(key);
      if (deviceData) {
        const data = JSON.parse(deviceData);
        if (data.trusted) {
          devices.push({
            fingerprint: data.fingerprint,
            userAgent: data.userAgent,
            firstSeen: data.firstSeen,
            lastSeen: data.lastSeen,
            trustedAt: data.trustedAt
          });
        }
      }
    }
    
    return devices;
  }

  /**
   * Revoke trust for a device
   */
  async revokeTrustedDevice(address: string, fingerprint: string): Promise<void> {
    const deviceKey = `device:${address.toLowerCase()}:${fingerprint}`;
    await this.redisService.del(deviceKey);
  }
}
