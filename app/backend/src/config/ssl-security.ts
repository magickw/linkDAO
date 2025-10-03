import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

interface SSLConfig {
  enabled: boolean;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
  passphrase?: string;
  port: number;
}

interface SecurityConfig {
  ssl: SSLConfig;
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
  };
  apiKeys: {
    enabled: boolean;
    headerName: string;
    validKeys: string[];
  };
  ipWhitelist: {
    enabled: boolean;
    allowedIPs: string[];
  };
}

class SecurityManager {
  private config: SecurityConfig;
  private sslOptions: https.ServerOptions | null = null;

  constructor() {
    this.config = this.loadSecurityConfig();
    this.initializeSSL();
  }

  private loadSecurityConfig(): SecurityConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      ssl: {
        enabled: process.env.SSL_ENABLED === 'true' || isProduction,
        certPath: process.env.SSL_CERT_PATH,
        keyPath: process.env.SSL_KEY_PATH,
        caPath: process.env.SSL_CA_PATH,
        passphrase: process.env.SSL_PASSPHRASE,
        port: parseInt(process.env.SSL_PORT || '443')
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16
      },
      jwt: {
        secret: process.env.JWT_SECRET || this.generateSecureSecret(),
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        algorithm: 'HS256'
      },
      apiKeys: {
        enabled: process.env.API_KEYS_ENABLED === 'true',
        headerName: 'X-API-Key',
        validKeys: process.env.VALID_API_KEYS 
          ? process.env.VALID_API_KEYS.split(',').map(key => key.trim())
          : []
      },
      ipWhitelist: {
        enabled: process.env.IP_WHITELIST_ENABLED === 'true',
        allowedIPs: process.env.ALLOWED_IPS 
          ? process.env.ALLOWED_IPS.split(',').map(ip => ip.trim())
          : []
      }
    };
  }

  private generateSecureSecret(): string {
    const secret = crypto.randomBytes(64).toString('hex');
    console.warn('⚠️ Generated JWT secret. Set JWT_SECRET environment variable for production!');
    return secret;
  }

  private initializeSSL(): void {
    if (!this.config.ssl.enabled) {
      console.log('🔓 SSL disabled');
      return;
    }

    try {
      const certPath = this.config.ssl.certPath;
      const keyPath = this.config.ssl.keyPath;
      const caPath = this.config.ssl.caPath;

      if (!certPath || !keyPath) {
        console.warn('⚠️ SSL enabled but certificate paths not provided');
        return;
      }

      // Check if certificate files exist
      if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        console.warn('⚠️ SSL certificate files not found');
        return;
      }

      this.sslOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
        passphrase: this.config.ssl.passphrase
      };

      // Add CA certificate if provided
      if (caPath && fs.existsSync(caPath)) {
        this.sslOptions.ca = fs.readFileSync(caPath);
      }

      console.log('🔒 SSL certificates loaded successfully');

    } catch (error) {
      console.error('❌ Failed to load SSL certificates:', error);
      this.sslOptions = null;
    }
  }

  getSSLOptions(): https.ServerOptions | null {
    return this.sslOptions;
  }

  isSSLEnabled(): boolean {
    return this.config.ssl.enabled && this.sslOptions !== null;
  }

  getSSLPort(): number {
    return this.config.ssl.port;
  }

  // Encryption utilities
  encrypt(text: string, key?: string): { encrypted: string; iv: string; tag: string } {
    const encryptionKey = key ? crypto.scryptSync(key, 'salt', 32) : crypto.randomBytes(32);
    const iv = crypto.randomBytes(this.config.encryption.ivLength);
    
    const cipher = crypto.createCipher(this.config.encryption.algorithm, encryptionKey);
    cipher.setAAD(Buffer.from('marketplace-api', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decrypt(encryptedData: { encrypted: string; iv: string; tag: string }, key?: string): string {
    const encryptionKey = key ? crypto.scryptSync(key, 'salt', 32) : crypto.randomBytes(32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipher(this.config.encryption.algorithm, encryptionKey);
    decipher.setAAD(Buffer.from('marketplace-api', 'utf8'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // JWT utilities
  getJWTConfig() {
    return {
      secret: this.config.jwt.secret,
      expiresIn: this.config.jwt.expiresIn,
      refreshExpiresIn: this.config.jwt.refreshExpiresIn,
      algorithm: this.config.jwt.algorithm
    };
  }

  // API Key validation
  validateAPIKey(apiKey: string): boolean {
    if (!this.config.apiKeys.enabled) {
      return true; // API keys disabled, allow all
    }

    return this.config.apiKeys.validKeys.includes(apiKey);
  }

  // IP whitelist validation
  validateIP(ip: string): boolean {
    if (!this.config.ipWhitelist.enabled) {
      return true; // IP whitelist disabled, allow all
    }

    // Handle IPv6 mapped IPv4 addresses
    const cleanIP = ip.replace(/^::ffff:/, '');
    
    return this.config.ipWhitelist.allowedIPs.some(allowedIP => {
      if (allowedIP.includes('/')) {
        // CIDR notation support
        return this.isIPInCIDR(cleanIP, allowedIP);
      }
      return cleanIP === allowedIP;
    });
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    try {
      const [network, prefixLength] = cidr.split('/');
      const mask = ~(2 ** (32 - parseInt(prefixLength)) - 1);
      
      const ipInt = this.ipToInt(ip);
      const networkInt = this.ipToInt(network);
      
      return (ipInt & mask) === (networkInt & mask);
    } catch {
      return false;
    }
  }

  private ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }

  // Security headers
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };
  }

  // Generate secure tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash passwords/sensitive data
  hashData(data: string, salt?: string): { hash: string; salt: string } {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha512');
    
    return {
      hash: hash.toString('hex'),
      salt: saltBuffer.toString('hex')
    };
  }

  verifyHash(data: string, hash: string, salt: string): boolean {
    const hashBuffer = Buffer.from(hash, 'hex');
    const saltBuffer = Buffer.from(salt, 'hex');
    const verifyHash = crypto.pbkdf2Sync(data, saltBuffer, 100000, 64, 'sha512');
    
    return crypto.timingSafeEqual(hashBuffer, verifyHash);
  }

  // Certificate validation
  async validateCertificate(): Promise<{ valid: boolean; expiresAt?: Date; error?: string }> {
    if (!this.sslOptions || !this.sslOptions.cert) {
      return { valid: false, error: 'No SSL certificate loaded' };
    }

    try {
      const cert = this.sslOptions.cert.toString();
      const certMatch = cert.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
      
      if (!certMatch) {
        return { valid: false, error: 'Invalid certificate format' };
      }

      // Parse certificate (basic validation)
      const certData = certMatch[0];
      const base64Cert = certData
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s/g, '');

      // This is a simplified validation - in production, use a proper certificate parsing library
      return { valid: true };

    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  getConfiguration(): SecurityConfig {
    return this.config;
  }
}

// Singleton instance
let securityManager: SecurityManager | null = null;

export function getSecurityManager(): SecurityManager {
  if (!securityManager) {
    securityManager = new SecurityManager();
  }
  return securityManager;
}

export { SecurityManager, SecurityConfig, SSLConfig };